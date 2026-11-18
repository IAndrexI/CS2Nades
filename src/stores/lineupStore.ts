import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { io, type Socket } from 'socket.io-client'
import { DEFAULT_EXECUTES, DEFAULT_LINEUPS } from '../data/defaultLineups'
import { findNearestCallout } from '../data/mapsData'
import { useMapStore } from './mapStore'
import type {
  ExecuteUtilityStep,
  GrenadeType,
  Lineup,
  NadeExecute,
  PlayerRole,
  Point2D,
  RadarFloorId
} from '../types'

const STORAGE_KEY = 'cs2_stratbook_custom_lineups'
const FAVORITES_KEY = 'cs2_stratbook_favorites'
const EXECUTES_STORAGE_KEY = 'cs2_stratbook_executes'
const BASIC_LINEUPS_KEY = 'cs2_stratbook_show_basic_lineups'

export const useLineupStore = defineStore('lineup', () => {
  const mapStore = useMapStore()

  // Core State
  const customLineups = ref<Lineup[]>([])
  const customExecutes = ref<NadeExecute[]>([])
  const activeExecuteId = ref<string | null>(null)
  const activeExecuteStepOrder = ref<number | null>(null)
  const isCreateExecuteModalOpen = ref<boolean>(false)

  const favoriteIds = ref<string[]>([])
  const activeLineup = ref<Lineup | null>(null)
  const hoveredLineup = ref<Lineup | null>(null)
  const hoveredLineupId = ref<string | null>(null)
  const activeTargetClusterId = ref<string | null>(null)

  const isAddModalOpen = ref<boolean>(false)
  const isPresetsModalOpen = ref<boolean>(false)
  const showBasicLineups = ref<boolean>(true)
  const isEditMode = ref<boolean>(false)
  const editingLineup = ref<Lineup | null>(null)

  // Multi-Format Instruction Viewer State (synced with Voice Navigation)
  const activeInstructionFormat = ref<'steps' | 'images' | 'video'>('steps')
  const activeInstructionStepIndex = ref<number>(0)

  // Interactive Radar Placement Draft State
  const isAddingLineup = ref<boolean>(false)
  const editingLineupId = ref<string | null>(null)
  const draftOriginCoords = ref<Point2D | null>(null)
  const draftLandingCoords = ref<Point2D | null>(null)
  const draftStartLocation = ref<string>('')
  const draftEndLocation = ref<string>('')
  const placementStep = ref<'origin' | 'landing' | 'details'>('origin')

  // Sync state
  const isSyncing = ref<boolean>(false)
  const syncStatus = ref<'synced' | 'syncing' | 'offline'>('synced')
  const lastRealtimeEvent = ref<{
    type: 'added' | 'updated' | 'deleted'
    lineup?: Lineup
    timestamp: number
  } | null>(null)
  const isConflictModalOpen = ref<boolean>(false)
  const pendingConflicts = ref<{ local: Lineup; server: Lineup }[]>([])
  const lastSyncTime = ref<string | null>(null)

  let socketInitialized = false
  let realtimeSocket: Socket | null = null

  function formatSyncTime(): string {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getSocketServerUrl(): string {
    if (typeof window !== 'undefined') {
      const port = window.location.port
      if (port === '5173' || port === '3000') {
        return `${window.location.protocol}//${window.location.hostname}:5000`
      }
      return window.location.origin
    }
    return 'http://localhost:5000'
  }

  // Bridged computed refs for seamless access from both old & new components
  const activeMapId = computed<string>({
    get: () => mapStore.currentMapId,
    set: (val: string) => mapStore.setMap(val)
  })

  const activeFloorId = computed<RadarFloorId>({
    get: () => (mapStore.surfaceLevel === 'lower' ? 'lower' : 'upper'),
    set: (val: RadarFloorId) => mapStore.setSurfaceLevel(val)
  })

  const showPresetLineups = computed<boolean>({
    get: () => showBasicLineups.value,
    set: (val: boolean) => {
      showBasicLineups.value = val
    }
  })

  const selectedLineup = computed<Lineup | null>({
    get: () => activeLineup.value,
    set: (val: Lineup | null) => {
      activeLineup.value = val
    }
  })

  const searchQuery = computed<string>({
    get: () => mapStore.searchQuery,
    set: (val: string) => mapStore.setSearchQuery(val)
  })

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) customLineups.value = JSON.parse(stored)

      const favs = localStorage.getItem(FAVORITES_KEY)
      if (favs) favoriteIds.value = JSON.parse(favs)

      const execs = localStorage.getItem(EXECUTES_STORAGE_KEY)
      if (execs) customExecutes.value = JSON.parse(execs)

      const storedBasic = localStorage.getItem(BASIC_LINEUPS_KEY)
      if (storedBasic !== null) {
        showBasicLineups.value = storedBasic === 'true'
      }
    } catch (e) {
      console.error('Failed to load custom lineups from storage', e)
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customLineups.value))
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds.value))
      localStorage.setItem(EXECUTES_STORAGE_KEY, JSON.stringify(customExecutes.value))
      localStorage.setItem(BASIC_LINEUPS_KEY, String(showBasicLineups.value))
    } catch (e) {
      console.error('Failed to save custom lineups to storage', e)
    }
  }

  loadFromStorage()

  watch(
    [customLineups, favoriteIds, customExecutes, showBasicLineups],
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  const favoriteSet = computed(() => new Set(favoriteIds.value))

  // All combined lineups (Default + Custom)
  const allLineups = computed<Lineup[]>(() => {
    const customIds = new Set(customLineups.value.map((c) => c.id))
    const base = showBasicLineups.value
      ? [...customLineups.value, ...DEFAULT_LINEUPS.filter((d) => !customIds.has(d.id))]
      : [...customLineups.value]

    return base.map((item) => ({
      ...item,
      isFavorite: favoriteSet.value.has(item.id)
    }))
  })

  function getLineupById(id: string): Lineup | undefined {
    return allLineups.value.find((l) => l.id === id)
  }

  function toggleBasicLineups() {
    showBasicLineups.value = !showBasicLineups.value
  }

  // Lineups for currently selected map
  const currentMapLineups = computed<Lineup[]>(() => {
    return allLineups.value.filter((l) => l.mapId === mapStore.currentMapId)
  })

  // Combined Executes (Default + Custom)
  const executes = computed<NadeExecute[]>(() => {
    const customIds = new Set(customExecutes.value.map((e) => e.id))
    return [...customExecutes.value, ...DEFAULT_EXECUTES.filter((d) => !customIds.has(d.id))]
  })

  const currentMapExecutes = computed<NadeExecute[]>(() => {
    return executes.value.filter((e) => e.mapId === mapStore.currentMapId)
  })

  const mapExecutes = currentMapExecutes

  const activeExecute = computed<NadeExecute | null>(() => {
    if (!activeExecuteId.value) return null
    return executes.value.find((e) => e.id === activeExecuteId.value) || null
  })

  const activeExecuteLineups = computed<Lineup[]>(() => {
    if (!activeExecute.value) return []
    return currentMapLineups.value.filter((l) => activeExecute.value!.lineupIds.includes(l.id))
  })

  // Filtered lineups for display
  const filteredLineups = computed<Lineup[]>(() => {
    if (activeExecute.value && activeExecute.value.mapId === mapStore.currentMapId) {
      return activeExecuteLineups.value
    }

    return currentMapLineups.value.filter((lineup) => {
      if (!mapStore.selectedNadeTypes.includes(lineup.grenadeType)) {
        return false
      }

      if (
        mapStore.selectedSide !== 'all' &&
        lineup.side !== 'all' &&
        lineup.side !== mapStore.selectedSide
      ) {
        return false
      }

      if (mapStore.selectedSite !== 'all' && lineup.site && lineup.site !== mapStore.selectedSite) {
        return false
      }

      if (
        mapStore.selectedThrowType !== 'all' &&
        lineup.throwType !== mapStore.selectedThrowType
      ) {
        return false
      }

      if (mapStore.surfaceLevel !== 'all') {
        const floor =
          lineup.radarFloor ||
          (lineup as any).level ||
          (lineup.tags || []).find(
            (t) => t.toLowerCase() === 'upper' || t.toLowerCase() === 'lower'
          )
        if (floor && floor.toLowerCase() !== mapStore.surfaceLevel) {
          return false
        }
      }

      if (mapStore.searchQuery.trim() !== '') {
        const query = mapStore.searchQuery.toLowerCase()
        const matchTitle = lineup.title.toLowerCase().includes(query)
        const matchStart = lineup.startLocation.toLowerCase().includes(query)
        const matchEnd = lineup.endLocation.toLowerCase().includes(query)
        const matchTags = lineup.tags.some((t) => t.toLowerCase().includes(query))
        if (!matchTitle && !matchStart && !matchEnd && !matchTags) {
          return false
        }
      }

      return true
    })
  })

  const nadeCounts = computed<Record<GrenadeType, number>>(() => {
    const counts: Record<GrenadeType, number> = {
      smoke: 0,
      flash: 0,
      molotov: 0,
      he: 0,
      decoy: 0
    }

    currentMapLineups.value.forEach((l) => {
      if (counts[l.grenadeType] !== undefined) {
        if (
          mapStore.selectedSide === 'all' ||
          l.side === 'all' ||
          l.side === mapStore.selectedSide
        ) {
          counts[l.grenadeType]++
        }
      }
    })

    return counts
  })

  const grenadeCounts = nadeCounts

  const lineupCountsByMap = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const l of allLineups.value) {
      counts[l.mapId] = (counts[l.mapId] || 0) + 1
    }
    return counts
  })

  // Actions
  function selectLineup(lineup: Lineup | null) {
    activeLineup.value = lineup
    activeInstructionStepIndex.value = 0
    if (lineup) {
      if (lineup.instructionSteps && lineup.instructionSteps.length > 0) {
        activeInstructionFormat.value = 'steps'
      } else if (lineup.videoUrl) {
        activeInstructionFormat.value = 'video'
      } else {
        activeInstructionFormat.value = 'steps'
      }
    }
  }

  function openLineup(lineup: Lineup) {
    selectLineup(lineup)
  }

  function closeLineup() {
    selectLineup(null)
  }

  function nextInstructionStep() {
    const l = activeLineup.value
    if (!l) return
    const total = l.instructionSteps?.length || l.instructions.length || 3
    activeInstructionStepIndex.value = (activeInstructionStepIndex.value + 1) % total
  }

  function prevInstructionStep() {
    const l = activeLineup.value
    if (!l) return
    const total = l.instructionSteps?.length || l.instructions.length || 3
    activeInstructionStepIndex.value = (activeInstructionStepIndex.value - 1 + total) % total
  }

  function setHoveredLineup(lineup: Lineup | null) {
    hoveredLineup.value = lineup
    hoveredLineupId.value = lineup ? lineup.id : null
  }

  function setSingleGrenadeType(type: GrenadeType | 'all') {
    if (type === 'all') {
      mapStore.selectedNadeTypes = ['smoke', 'flash', 'molotov', 'he']
    } else {
      mapStore.selectedNadeTypes = [type]
    }
  }

  function resetFilters() {
    mapStore.resetFilters()
    activeExecuteId.value = null
    activeExecuteStepOrder.value = null
    activeTargetClusterId.value = null
  }

  function startPlacingLineup(existingLineup?: Lineup) {
    activeLineup.value = null
    if (existingLineup) {
      isEditMode.value = true
      editingLineup.value = existingLineup
      editingLineupId.value = existingLineup.id
      isAddModalOpen.value = true
    } else {
      isAddingLineup.value = true
      editingLineupId.value = null
      draftOriginCoords.value = null
      draftLandingCoords.value = null
      draftStartLocation.value = ''
      draftEndLocation.value = ''
      placementStep.value = 'origin'
      mapStore.startPlacement()
    }
  }

  function cancelPlacingLineup() {
    isAddingLineup.value = false
    editingLineupId.value = null
    draftOriginCoords.value = null
    draftLandingCoords.value = null
    draftStartLocation.value = ''
    draftEndLocation.value = ''
    placementStep.value = 'origin'
    mapStore.cancelPlacement()
  }

  function setDraftPoint(coords: Point2D) {
    const nearest = findNearestCallout(mapStore.currentMapId, coords, activeFloorId.value)
    if (placementStep.value === 'origin') {
      draftOriginCoords.value = coords
      mapStore.tempPlacement.origin = { ...coords }
      if (nearest) draftStartLocation.value = nearest.name
      placementStep.value = 'landing'
      mapStore.placementStep = 'landing'
    } else if (placementStep.value === 'landing') {
      draftLandingCoords.value = coords
      mapStore.tempPlacement.landing = { ...coords }
      if (nearest) draftEndLocation.value = nearest.name
      placementStep.value = 'details'
      isAddingLineup.value = false
      mapStore.isPlacementMode = false
      isAddModalOpen.value = true
    }
  }

  function toggleFavorite(id: string) {
    const idx = favoriteIds.value.indexOf(id)
    if (idx >= 0) {
      favoriteIds.value.splice(idx, 1)
    } else {
      favoriteIds.value.push(id)
    }
  }

  function isFavorite(id: string): boolean {
    return favoriteIds.value.includes(id)
  }

  function toggleLibrary(id: string) {
    toggleShareToLibrary(id)
  }

  function addLineup(lineupData: Omit<Lineup, 'id' | 'createdAt'>): Lineup {
    const newLineup: Lineup = {
      ...lineupData,
      id: `custom-lineup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      isCustom: true
    }
    customLineups.value.unshift(newLineup)
    pushToServer(newLineup).catch(() => {})
    return newLineup
  }

  function updateLineup(updatedOrId: Lineup | string, updates?: Partial<Lineup>) {
    if (typeof updatedOrId === 'string') {
      const idx = customLineups.value.findIndex((l) => l.id === updatedOrId)
      if (idx >= 0) {
        const merged = {
          ...customLineups.value[idx],
          ...updates,
          updatedAt: new Date().toISOString()
        } as Lineup
        customLineups.value[idx] = merged
        syncUpdateToServer(merged).catch(() => {})
      }
      return
    }
    const idx = customLineups.value.findIndex((l) => l.id === updatedOrId.id)
    if (idx >= 0) {
      const merged = { ...updatedOrId, updatedAt: new Date().toISOString() }
      customLineups.value[idx] = merged
      syncUpdateToServer(merged).catch(() => {})
    } else {
      const cloned: Lineup = {
        ...updatedOrId,
        isCustom: true,
        updatedAt: new Date().toISOString()
      }
      customLineups.value.unshift(cloned)
      pushToServer(cloned).catch(() => {})
    }
  }

  function deleteLineup(id: string) {
    customLineups.value = customLineups.value.filter((l) => l.id !== id)
    favoriteIds.value = favoriteIds.value.filter((fId) => fId !== id)
    customExecutes.value.forEach((e) => {
      e.lineupIds = e.lineupIds.filter((lId) => lId !== id)
    })
    if (activeLineup.value?.id === id) activeLineup.value = null
    if (hoveredLineup.value?.id === id) hoveredLineup.value = null
    syncStatus.value = 'syncing'
    axios
      .delete(`/api/lineups/${id}`)
      .then(() => {
        syncStatus.value = 'synced'
        lastSyncTime.value = formatSyncTime()
      })
      .catch((err: any) => {
        if (err?.response?.status === 404) {
          syncStatus.value = 'synced'
          lastSyncTime.value = formatSyncTime()
        } else {
          syncStatus.value = 'offline'
        }
      })
  }

  function clearAllLineups() {
    customLineups.value = []
    favoriteIds.value = []
    customExecutes.value = []
    activeLineup.value = null
    hoveredLineup.value = null
    saveToStorage()
    syncStatus.value = 'syncing'
    axios
      .post('/api/lineups/clear')
      .then(() => {
        syncStatus.value = 'synced'
        lastSyncTime.value = formatSyncTime()
      })
      .catch(() => {
        syncStatus.value = 'offline'
      })
  }

  // Team Execute Actions
  function createExecute(execData: Omit<NadeExecute, 'id' | 'createdAt'>): NadeExecute {
    const defaultRoles: PlayerRole[] = ['Support', 'IGL', 'Entry', 'AWPer', 'Lurker']
    const steps: ExecuteUtilityStep[] =
      execData.steps && execData.steps.length > 0
        ? execData.steps
        : execData.lineupIds.map((lid, idx) => ({
            order: idx + 1,
            lineupId: lid,
            playerRole: defaultRoles[idx % defaultRoles.length] ?? 'Support',
            playerName: `Player ${idx + 1}`,
            delaySeconds: Number((idx * 0.5).toFixed(1)),
            roundClock: '1:30'
          }))

    const newExec: NadeExecute = {
      ...execData,
      steps,
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString()
    }
    customExecutes.value.unshift(newExec)
    saveToStorage()
    return newExec
  }

  function updateExecute(id: string, updates: Partial<NadeExecute>) {
    const idx = customExecutes.value.findIndex((e) => e.id === id)
    if (idx >= 0) {
      customExecutes.value[idx] = { ...customExecutes.value[idx], ...updates } as NadeExecute
      saveToStorage()
    } else {
      const def = DEFAULT_EXECUTES.find((e) => e.id === id)
      if (def) {
        customExecutes.value.unshift({ ...def, ...updates, id })
        saveToStorage()
      }
    }
  }

  function deleteExecute(id: string) {
    customExecutes.value = customExecutes.value.filter((e) => e.id !== id)
    if (activeExecuteId.value === id) {
      activeExecuteId.value = null
      activeExecuteStepOrder.value = null
    }
    saveToStorage()
  }

  function toggleLineupInExecute(executeId: string, lineupId: string) {
    const exec = customExecutes.value.find((e) => e.id === executeId)
    if (exec) {
      const idx = exec.lineupIds.indexOf(lineupId)
      if (idx >= 0) {
        exec.lineupIds.splice(idx, 1)
      } else {
        exec.lineupIds.push(lineupId)
      }
      saveToStorage()
    }
  }

  function setActiveExecute(execId: string | null) {
    activeExecuteId.value = execId
    activeExecuteStepOrder.value = null
    if (execId) {
      const exec = executes.value.find((e) => e.id === execId)
      if (exec && exec.mapId !== mapStore.currentMapId) {
        mapStore.setMap(exec.mapId)
      }
    }
  }

  function toggleActiveExecute(execId: string | null) {
    if (activeExecuteId.value === execId) {
      setActiveExecute(null)
    } else {
      setActiveExecute(execId)
    }
  }

  function toggleShareToLibrary(id: string) {
    const idx = customLineups.value.findIndex((l) => l.id === id)
    if (idx >= 0) {
      const current = customLineups.value[idx]!
      const newStatus = !(current.inLibrary || current.isTeamShared)
      customLineups.value[idx] = {
        ...current,
        inLibrary: newStatus,
        isTeamShared: newStatus,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      pushToServer(customLineups.value[idx]!).catch(() => {})
    }
  }

  function addToLibrary(id: string) {
    const idx = customLineups.value.findIndex((l) => l.id === id)
    if (idx >= 0) {
      customLineups.value[idx] = {
        ...customLineups.value[idx]!,
        inLibrary: true,
        isTeamShared: true,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      pushToServer(customLineups.value[idx]!).catch(() => {})
    }
  }

  function exportJSON(): string {
    return JSON.stringify(customLineups.value, null, 2)
  }

  function importJSON(jsonStr: string): { success: boolean; count?: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr)
      if (Array.isArray(parsed)) {
        customLineups.value = parsed
        saveToStorage()
        return { success: true, count: parsed.length }
      }
      return { success: false, error: 'Invalid JSON array structure.' }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Invalid JSON syntax.' }
    }
  }

  function areLineupsContentEqual(a: Lineup, b: Lineup): boolean {
    const normalize = (l: Lineup) => ({
      title: l.title || '',
      mapId: l.mapId || '',
      grenadeType: l.grenadeType,
      side: l.side,
      throwType: l.throwType,
      originCoords: {
        x: Number(l.originCoords?.x ?? 0),
        y: Number(l.originCoords?.y ?? 0)
      },
      landingCoords: {
        x: Number(l.landingCoords?.x ?? 0),
        y: Number(l.landingCoords?.y ?? 0)
      },
      startLocation: l.startLocation || '',
      endLocation: l.endLocation || '',
      site: l.site || 'General',
      description: l.description || '',
      instructions: Array.isArray(l.instructions) ? l.instructions : [],
      consoleCommand: l.consoleCommand || '',
      imageUrl: l.imageUrl || '',
      standingScreenshot: l.standingScreenshot || '',
      aimScreenshot: l.aimScreenshot || '',
      landingScreenshot: l.landingScreenshot || '',
      videoUrl: l.videoUrl || '',
      proPlayer: l.proPlayer || '',
      proTeam: l.proTeam || '',
      tournament: l.tournament || '',
      sourceWebsite: l.sourceWebsite || '',
      inLibrary: Boolean(l.inLibrary),
      isTeamShared: Boolean(l.isTeamShared)
    })
    return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
  }

  function getLineupTimestamp(l: Lineup): number {
    const raw = l.updatedAt || l.createdAt
    if (!raw) return 0
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  function upsertRealtimeLineup(incoming: Lineup, eventType: 'added' | 'updated') {
    if (!incoming || !incoming.id) return
    const idx = customLineups.value.findIndex((l) => l.id === incoming.id)
    if (idx >= 0) {
      const merged: Lineup = { ...customLineups.value[idx], ...incoming }
      customLineups.value[idx] = merged
      if (activeLineup.value?.id === merged.id) activeLineup.value = merged
      if (hoveredLineup.value?.id === merged.id) hoveredLineup.value = merged
      lastRealtimeEvent.value = {
        type: eventType === 'added' ? 'added' : 'updated',
        lineup: merged,
        timestamp: Date.now()
      }
    } else {
      customLineups.value.unshift(incoming)
      lastRealtimeEvent.value = {
        type: 'added',
        lineup: incoming,
        timestamp: Date.now()
      }
    }
    syncStatus.value = 'synced'
    lastSyncTime.value = formatSyncTime()
  }

  function removeRealtimeLineup(id: string) {
    if (!id) return
    const existing = customLineups.value.find((l) => l.id === id)
    customLineups.value = customLineups.value.filter((l) => l.id !== id)
    favoriteIds.value = favoriteIds.value.filter((fId) => fId !== id)
    customExecutes.value.forEach((e) => {
      e.lineupIds = e.lineupIds.filter((lId) => lId !== id)
    })
    if (activeLineup.value?.id === id) activeLineup.value = null
    if (hoveredLineup.value?.id === id) hoveredLineup.value = null
    lastRealtimeEvent.value = {
      type: 'deleted',
      lineup: existing,
      timestamp: Date.now()
    }
    syncStatus.value = 'synced'
    lastSyncTime.value = formatSyncTime()
  }

  function applyMediaAttachment(
    lineupId: string,
    patch: Partial<Pick<Lineup, 'standingScreenshot' | 'aimScreenshot' | 'landingScreenshot' | 'imageUrl' | 'videoUrl'>>
  ) {
    const idx = customLineups.value.findIndex((l) => l.id === lineupId)
    if (idx >= 0) {
      const current = customLineups.value[idx]!
      const updated: Lineup = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      }
      if (!updated.imageUrl) {
        updated.imageUrl =
          updated.aimScreenshot ||
          updated.standingScreenshot ||
          updated.landingScreenshot ||
          current.imageUrl
      }
      customLineups.value[idx] = updated
      if (activeLineup.value?.id === lineupId) activeLineup.value = updated
      if (hoveredLineup.value?.id === lineupId) hoveredLineup.value = updated
      lastRealtimeEvent.value = {
        type: 'updated',
        lineup: updated,
        timestamp: Date.now()
      }
      syncStatus.value = 'synced'
      lastSyncTime.value = formatSyncTime()
    }
  }

  async function syncWithServer() {
    if (isSyncing.value) return
    isSyncing.value = true
    syncStatus.value = 'syncing'
    try {
      const res = await axios.get('/api/lineups')
      const rawData = res.data
      const serverLineups: Lineup[] = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.lineups)
          ? rawData.lineups
          : []

      const conflicts: { local: Lineup; server: Lineup }[] = []
      const localMap = new Map<string, Lineup>()
      customLineups.value.forEach((l) => localMap.set(l.id, l))

      for (const serverL of serverLineups) {
        const localL = localMap.get(serverL.id)
        if (!localL) {
          customLineups.value.push(serverL)
          continue
        }

        if (areLineupsContentEqual(localL, serverL)) {
          const idx = customLineups.value.findIndex((l) => l.id === serverL.id)
          if (idx >= 0) {
            customLineups.value[idx] = { ...localL, ...serverL }
          }
          continue
        }

        const localTs = getLineupTimestamp(localL)
        const serverTs = getLineupTimestamp(serverL)

        if (serverTs > localTs) {
          const idx = customLineups.value.findIndex((l) => l.id === serverL.id)
          if (idx >= 0) {
            customLineups.value[idx] = { ...localL, ...serverL }
          }
        } else if (localTs > serverTs) {
          await pushToServer(localL)
        } else {
          conflicts.push({ local: localL, server: serverL })
        }
      }

      for (const localL of customLineups.value) {
        if (!serverLineups.some((s) => s.id === localL.id)) {
          await pushToServer(localL)
        }
      }

      pendingConflicts.value = conflicts
      isConflictModalOpen.value = conflicts.length > 0

      syncStatus.value = 'synced'
      lastSyncTime.value = formatSyncTime()
    } catch (e) {
      syncStatus.value = 'offline'
      console.warn('Server sync not reachable, working in offline mode:', e)
    } finally {
      isSyncing.value = false
    }
  }

  function resolveConflict(conflictIndex: number, choice: 'local' | 'server' | 'both') {
    const item = pendingConflicts.value[conflictIndex]
    if (!item) return

    const { local, server } = item
    const idx = customLineups.value.findIndex((l) => l.id === local.id)

    if (choice === 'server') {
      if (idx >= 0) {
        customLineups.value[idx] = server
      } else {
        customLineups.value.push(server)
      }
    } else if (choice === 'local') {
      pushToServer({ ...local, updatedAt: new Date().toISOString() }).catch(() => {})
    } else if (choice === 'both') {
      const duplicatedServer: Lineup = {
        ...server,
        id: `server-copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: `${server.title} (Server Copy)`,
        isCustom: true
      }
      customLineups.value.push(duplicatedServer)
    }

    pendingConflicts.value.splice(conflictIndex, 1)
    if (pendingConflicts.value.length === 0) {
      isConflictModalOpen.value = false
    }
  }

  async function pushToServer(lineup: Lineup) {
    syncStatus.value = 'syncing'
    try {
      const res = await axios.post('/api/lineups', lineup)
      if (res.data && res.data.id) {
        const idx = customLineups.value.findIndex((l) => l.id === lineup.id)
        if (idx >= 0) {
          customLineups.value[idx] = { ...customLineups.value[idx], ...res.data }
        }
      }
      syncStatus.value = 'synced'
      lastSyncTime.value = formatSyncTime()
      return true
    } catch {
      syncStatus.value = 'offline'
      return false
    }
  }

  async function syncUpdateToServer(lineup: Lineup) {
    syncStatus.value = 'syncing'
    try {
      const res = await axios.put(`/api/lineups/${lineup.id}`, lineup)
      if (res.data && res.data.id) {
        const idx = customLineups.value.findIndex((l) => l.id === lineup.id)
        if (idx >= 0) {
          customLineups.value[idx] = { ...customLineups.value[idx], ...res.data }
        }
      }
      syncStatus.value = 'synced'
      lastSyncTime.value = formatSyncTime()
      return true
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return pushToServer(lineup)
      }
      syncStatus.value = 'offline'
      return false
    }
  }

  function initRealtimeSync() {
    if (socketInitialized || typeof window === 'undefined') return
    socketInitialized = true

    const serverUrl = getSocketServerUrl()
    realtimeSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    realtimeSocket.on('connect', () => {
      syncStatus.value = 'synced'
      syncWithServer()
    })

    realtimeSocket.on('disconnect', () => {
      syncStatus.value = 'offline'
    })

    realtimeSocket.on('connect_error', () => {
      syncStatus.value = 'offline'
    })

    realtimeSocket.on('lineup:created', (lineup: Lineup) => {
      upsertRealtimeLineup(lineup, 'added')
    })

    realtimeSocket.on('lineup:updated', (lineup: Lineup) => {
      upsertRealtimeLineup(lineup, 'updated')
    })

    realtimeSocket.on('lineup:deleted', (payload: { id?: string } | string) => {
      const id = typeof payload === 'string' ? payload : payload?.id
      if (id) removeRealtimeLineup(id)
    })

    realtimeSocket.on('lineups:cleared', () => {
      customLineups.value = []
      favoriteIds.value = []
      customExecutes.value = []
      activeLineup.value = null
      hoveredLineup.value = null
      lastRealtimeEvent.value = { type: 'deleted', timestamp: Date.now() }
      syncStatus.value = 'synced'
      lastSyncTime.value = formatSyncTime()
    })

    realtimeSocket.on('cs2:lineup-captured', (lineup: Lineup) => {
      upsertRealtimeLineup(lineup, 'added')
    })

    realtimeSocket.on(
      'cs2:screenshot-attached',
      (payload: { lineupId?: string; type?: 'aim' | 'standing' | 'landing'; imageUrl?: string }) => {
        if (!payload?.lineupId || !payload?.imageUrl) return
        const patch: Partial<Lineup> = {}
        if (payload.type === 'standing') patch.standingScreenshot = payload.imageUrl
        else if (payload.type === 'landing') patch.landingScreenshot = payload.imageUrl
        else patch.aimScreenshot = payload.imageUrl
        patch.imageUrl = payload.imageUrl
        applyMediaAttachment(payload.lineupId, patch)
      }
    )

    realtimeSocket.on(
      'cs2:video-attached',
      (payload: { lineupId?: string; videoUrl?: string }) => {
        if (!payload?.lineupId || !payload?.videoUrl) return
        applyMediaAttachment(payload.lineupId, { videoUrl: payload.videoUrl })
      }
    )

    window.addEventListener('focus', () => {
      syncWithServer()
    })

    syncWithServer()
  }

  initRealtimeSync()

  return {
    allLineups,
    customLineups,
    currentMapLineups,
    filteredLineups,
    nadeCounts,
    grenadeCounts,
    lineupCountsByMap,
    activeLineup,
    selectedLineup,
    hoveredLineup,
    hoveredLineupId,
    activeTargetClusterId,
    activeInstructionFormat,
    activeInstructionStepIndex,
    favoriteIds,
    executes,
    customExecutes,
    currentMapExecutes,
    mapExecutes,
    activeExecuteId,
    activeExecuteStepOrder,
    activeExecute,
    activeExecuteLineups,
    activeMapId,
    activeFloorId,
    searchQuery,
    isCreateExecuteModalOpen,
    isAddModalOpen,
    isPresetsModalOpen,
    showBasicLineups,
    showPresetLineups,
    toggleBasicLineups,
    isEditMode,
    editingLineup,
    editingLineupId,
    isAddingLineup,
    draftOriginCoords,
    draftLandingCoords,
    draftStartLocation,
    draftEndLocation,
    placementStep,
    isSyncing,
    syncStatus,
    lastRealtimeEvent,
    isConflictModalOpen,
    pendingConflicts,
    lastSyncTime,
    initRealtimeSync,
    getLineupById,
    selectLineup,
    openLineup,
    closeLineup,
    nextInstructionStep,
    prevInstructionStep,
    setHoveredLineup,
    setSingleGrenadeType,
    resetFilters,
    startPlacingLineup,
    cancelPlacingLineup,
    setDraftPoint,
    toggleFavorite,
    isFavorite,
    toggleLibrary,
    addLineup,
    updateLineup,
    deleteLineup,
    clearAllLineups,
    createExecute,
    updateExecute,
    deleteExecute,
    toggleLineupInExecute,
    setActiveExecute,
    toggleActiveExecute,
    toggleShareToLibrary,
    addToLibrary,
    exportJSON,
    importJSON,
    syncWithServer,
    resolveConflict,
    pushToServer
  }
})
