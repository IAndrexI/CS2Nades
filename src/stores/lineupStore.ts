import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { io, type Socket } from 'socket.io-client'
import { DEFAULT_EXECUTES, DEFAULT_LINEUPS } from '../data/defaultLineups'
import { MAPS_DATA, findNearestCallout } from '../data/mapsData'
import { normalizeMapId } from '../core/radar/coordinateEngine'
import {
  snapPointToMapBounds,
  isPointInMapBounds,
  getMapSwitchConsoleCommand,
  getLineupSetupConsoleCommand
} from '../core/radar/mapBounds'
import { useMapStore } from './mapStore'
import type {
  ExecuteUtilityStep,
  GrenadeType,
  Lineup,
  LineupDisplayMode,
  ModalDisplayMode,
  NadeExecute,
  PlayerRole,
  Point2D,
  RadarFloorId
} from '../types'

const STORAGE_KEY = 'cs2_stratbook_custom_lineups'
const FAVORITES_KEY = 'cs2_stratbook_favorites'
const EXECUTES_STORAGE_KEY = 'cs2_stratbook_executes'
const BASIC_LINEUPS_KEY = 'cs2_stratbook_show_basic_lineups'
const LINEUP_DISPLAY_MODE_KEY = 'cs2_stratbook_lineup_display_mode'
const MODAL_DISPLAY_MODE_KEY = 'cs2_stratbook_modal_display_mode'

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
  const isLineupModalOpen = ref<boolean>(false)
  const showBasicLineups = ref<boolean>(true)
  const isEditMode = ref<boolean>(false)
  const editingLineup = ref<Lineup | null>(null)

  // Persisted Display Modes & Catalog Selection State
  const lineupDisplayMode = ref<LineupDisplayMode>('cards')
  const modalDisplayMode = ref<ModalDisplayMode>('all_images')
  const activeCatalogTab = ref<'general' | 'personal' | 'all'>('all')
  const quickSelectIds = ref<string[]>([])

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
      selectLineup(val)
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

      const storedLineupMode = localStorage.getItem(LINEUP_DISPLAY_MODE_KEY)
      if (
        storedLineupMode === 'cards' ||
        storedLineupMode === 'all_images' ||
        storedLineupMode === 'spot_movement'
      ) {
        lineupDisplayMode.value = storedLineupMode
      }

      const storedModalMode = localStorage.getItem(MODAL_DISPLAY_MODE_KEY)
      if (
        storedModalMode === 'all_images' ||
        storedModalMode === 'spot_movement' ||
        storedModalMode === 'tabs'
      ) {
        modalDisplayMode.value = storedModalMode
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
      localStorage.setItem(LINEUP_DISPLAY_MODE_KEY, lineupDisplayMode.value)
      localStorage.setItem(MODAL_DISPLAY_MODE_KEY, modalDisplayMode.value)
    } catch (e) {
      console.error('Failed to save custom lineups to storage', e)
    }
  }

  loadFromStorage()

  watch(
    [
      customLineups,
      favoriteIds,
      customExecutes,
      showBasicLineups,
      lineupDisplayMode,
      modalDisplayMode
    ],
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  const favoriteSet = computed(() => new Set(favoriteIds.value))

  // General Lineups Catalog (curated multi-site & pro utility, separate from Personal Book)
  const generalLineups = computed<Lineup[]>(() =>
    DEFAULT_LINEUPS.map((item) => ({
      ...item,
      isFavorite: favoriteSet.value.has(item.id)
    }))
  )

  // Personal Book Lineups (isolated custom & quick-saved lineups)
  const personalBookLineups = computed<Lineup[]>(() =>
    customLineups.value.map((item) => ({
      ...item,
      isFavorite: favoriteSet.value.has(item.id)
    }))
  )

  // All combined lineups (Personal Book + General Catalog, deduplicated by id/externalId)
  const allLineups = computed<Lineup[]>(() => {
    const customIds = new Set(customLineups.value.map((c) => c.id))
    const customExternalIds = new Set(
      customLineups.value.map((c) => c.externalId).filter((eid): eid is string => Boolean(eid))
    )
    const base = showBasicLineups.value
      ? [
          ...customLineups.value,
          ...DEFAULT_LINEUPS.filter((d) => !customIds.has(d.id) && !customExternalIds.has(d.id))
        ]
      : [...customLineups.value]

    return base.map((item) => ({
      ...item,
      isFavorite: favoriteSet.value.has(item.id)
    }))
  })

  function getLineupById(id: string): Lineup | undefined {
    return (
      allLineups.value.find((l) => l.id === id) ||
      generalLineups.value.find((l) => l.id === id) ||
      personalBookLineups.value.find((l) => l.id === id)
    )
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
    const ids = activeExecute.value.lineupIds
    return currentMapLineups.value.filter(
      (l) => ids.includes(l.id) || (l.externalId ? ids.includes(l.externalId) : false)
    )
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

  function normalizeTargetMapId(rawMapId?: string): string {
    const candidate = rawMapId || mapStore.currentMapId
    const normalized = normalizeMapId(candidate)
    return MAPS_DATA.some((m) => m.id === normalized) ? normalized : candidate
  }

  function snapCoordinatesInBounds(
    mapId: string,
    point: Point2D,
    floor?: RadarFloorId
  ): Point2D {
    if (isPointInMapBounds(mapId, point, floor)) {
      return {
        x: Number(point.x.toFixed(2)),
        y: Number(point.y.toFixed(2))
      }
    }
    const snapped = snapPointToMapBounds(mapId, point, floor)
    return { x: snapped.x, y: snapped.y }
  }

  function isSameLineupTitleAndMap(a: Lineup, b: { mapId: string; title: string }): boolean {
    return (
      a.mapId === b.mapId &&
      a.title.trim().toLowerCase() === b.title.trim().toLowerCase()
    )
  }

  function findLineupReference(lineupId: string): Lineup | undefined {
    return (
      DEFAULT_LINEUPS.find((d) => d.id === lineupId) ||
      allLineups.value.find((l) => l.id === lineupId)
    )
  }

  function isInPersonalBook(lineupId: string): boolean {
    if (customLineups.value.some((c) => c.id === lineupId || c.externalId === lineupId)) {
      return true
    }
    const refItem = findLineupReference(lineupId)
    if (!refItem) return false
    return customLineups.value.some((c) => isSameLineupTitleAndMap(c, refItem))
  }

  function quickAddToPersonalBook(lineup: Lineup): Lineup {
    const existing = customLineups.value.find(
      (c) =>
        c.id === lineup.id ||
        c.externalId === lineup.id ||
        isSameLineupTitleAndMap(c, lineup)
    )
    if (existing) {
      return existing
    }

    const targetMapId = normalizeTargetMapId(lineup.mapId)
    const floor = lineup.radarFloor
    const safeOrigin = snapCoordinatesInBounds(targetMapId, lineup.originCoords, floor)
    const safeLanding = snapCoordinatesInBounds(targetMapId, lineup.landingCoords, floor)
    const now = new Date().toISOString()

    const personalCopy: Lineup = {
      ...lineup,
      mapId: targetMapId,
      id: `personal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      originCoords: safeOrigin,
      landingCoords: safeLanding,
      isCustom: true,
      isPersonalBook: true,
      externalId: lineup.externalId || lineup.id,
      createdAt: lineup.createdAt || now,
      updatedAt: now
    }

    customLineups.value.unshift(personalCopy)
    saveToStorage()
    pushToServer(personalCopy).catch(() => {})
    return personalCopy
  }

  function removeFromPersonalBook(lineupId: string): void {
    const refItem = findLineupReference(lineupId)
    const matches = customLineups.value.filter(
      (c) =>
        c.id === lineupId ||
        c.externalId === lineupId ||
        (refItem ? isSameLineupTitleAndMap(c, refItem) : false)
    )
    if (matches.length === 0) return

    const removeIds = new Set(matches.map((m) => m.id))
    customLineups.value = customLineups.value.filter((c) => !removeIds.has(c.id))
    saveToStorage()

    for (const removed of matches) {
      if (activeLineup.value?.id === removed.id) {
        const fallbackGeneral = removed.externalId
          ? DEFAULT_LINEUPS.find((d) => d.id === removed.externalId)
          : undefined
        activeLineup.value = fallbackGeneral
          ? { ...fallbackGeneral, isFavorite: favoriteSet.value.has(fallbackGeneral.id) }
          : null
        if (!activeLineup.value) {
          isLineupModalOpen.value = false
        }
      }
      if (hoveredLineup.value?.id === removed.id) {
        hoveredLineup.value = null
        hoveredLineupId.value = null
      }
      axios.delete(`/api/lineups/${removed.id}`).catch(() => {})
    }
  }

  function togglePersonalBook(lineup: Lineup): boolean {
    const existing = customLineups.value.find(
      (c) =>
        c.id === lineup.id ||
        c.externalId === lineup.id ||
        isSameLineupTitleAndMap(c, lineup)
    )
    if (existing) {
      removeFromPersonalBook(existing.id)
      return false
    }
    quickAddToPersonalBook(lineup)
    return true
  }

  function toggleQuickSelect(lineupId: string) {
    const idx = quickSelectIds.value.indexOf(lineupId)
    if (idx >= 0) {
      quickSelectIds.value.splice(idx, 1)
    } else {
      quickSelectIds.value.push(lineupId)
    }
  }

  function clearQuickSelect() {
    quickSelectIds.value = []
  }

  function addQuickSelectedToPersonalBook(): number {
    let addedCount = 0
    for (const id of quickSelectIds.value) {
      const source =
        DEFAULT_LINEUPS.find((d) => d.id === id) ||
        allLineups.value.find((l) => l.id === id)
      if (source && !isInPersonalBook(source.id)) {
        quickAddToPersonalBook(source)
        addedCount++
      }
    }
    quickSelectIds.value = []
    return addedCount
  }

  // Actions
  function selectLineup(lineup: Lineup | null, openModal = false) {
    if (lineup) {
      const switchedMap = Boolean(lineup.mapId && lineup.mapId !== mapStore.currentMapId)
      if (switchedMap) {
        mapStore.setMap(lineup.mapId)
      }
      if (lineup.radarFloor === 'upper' || lineup.radarFloor === 'lower') {
        activeFloorId.value = lineup.radarFloor
      } else if (switchedMap) {
        const targetMap = mapStore.getMapById(lineup.mapId)
        if (!targetMap.radarFloors || targetMap.radarFloors.length === 0) {
          mapStore.setSurfaceLevel('all')
        }
      }
    }
    activeLineup.value = lineup
    isLineupModalOpen.value = lineup ? openModal : false
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
    selectLineup(lineup, true)
  }

  function closeLineup() {
    isLineupModalOpen.value = false
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
    const targetMapId = mapStore.currentMapId
    const floor = activeFloorId.value
    const snapped = snapPointToMapBounds(targetMapId, coords, floor)
    const safeCoords: Point2D = { x: snapped.x, y: snapped.y }
    const nearest = findNearestCallout(targetMapId, safeCoords, floor)
    if (placementStep.value === 'origin') {
      draftOriginCoords.value = safeCoords
      mapStore.tempPlacement.origin = { ...safeCoords }
      if (nearest) draftStartLocation.value = nearest.name
      placementStep.value = 'landing'
      mapStore.placementStep = 'landing'
    } else if (placementStep.value === 'landing') {
      draftLandingCoords.value = safeCoords
      mapStore.tempPlacement.landing = { ...safeCoords }
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
    const targetMapId = normalizeTargetMapId(lineupData.mapId)
    const floor = lineupData.radarFloor
    const safeOrigin = snapCoordinatesInBounds(targetMapId, lineupData.originCoords, floor)
    const safeLanding = snapCoordinatesInBounds(targetMapId, lineupData.landingCoords, floor)
    const newLineup: Lineup = {
      ...lineupData,
      mapId: targetMapId,
      originCoords: safeOrigin,
      landingCoords: safeLanding,
      id: `custom-lineup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      isCustom: true,
      isPersonalBook: true
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
        const targetMapId = normalizeTargetMapId(merged.mapId)
        const floor = merged.radarFloor
        merged.mapId = targetMapId
        merged.originCoords = snapCoordinatesInBounds(targetMapId, merged.originCoords, floor)
        merged.landingCoords = snapCoordinatesInBounds(targetMapId, merged.landingCoords, floor)
        customLineups.value[idx] = merged
        if (activeLineup.value?.id === merged.id) activeLineup.value = merged
        syncUpdateToServer(merged).catch(() => {})
      }
      return
    }
    const targetMapId = normalizeTargetMapId(updatedOrId.mapId)
    const floor = updatedOrId.radarFloor
    const safeOrigin = snapCoordinatesInBounds(targetMapId, updatedOrId.originCoords, floor)
    const safeLanding = snapCoordinatesInBounds(targetMapId, updatedOrId.landingCoords, floor)
    const idx = customLineups.value.findIndex((l) => l.id === updatedOrId.id)
    if (idx >= 0) {
      const merged: Lineup = {
        ...updatedOrId,
        mapId: targetMapId,
        originCoords: safeOrigin,
        landingCoords: safeLanding,
        updatedAt: new Date().toISOString()
      }
      customLineups.value[idx] = merged
      if (activeLineup.value?.id === merged.id) activeLineup.value = merged
      syncUpdateToServer(merged).catch(() => {})
    } else {
      const cloned: Lineup = {
        ...updatedOrId,
        mapId: targetMapId,
        originCoords: safeOrigin,
        landingCoords: safeLanding,
        isCustom: true,
        isPersonalBook: true,
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
    if (activeLineup.value?.id === id) {
      activeLineup.value = null
      isLineupModalOpen.value = false
    }
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
    isLineupModalOpen.value = false
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
    if (activeLineup.value?.id === id) {
      activeLineup.value = null
      isLineupModalOpen.value = false
    }
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

  function resolveMapFromText(
    text: string
  ): { mapId: string; mapName: string; floor?: RadarFloorId } | null {
    const lower = text.toLowerCase()
    let floor: RadarFloorId | undefined
    if (/\blower\b/.test(lower)) floor = 'lower'
    else if (/\bupper\b/.test(lower)) floor = 'upper'

    const aliasMap: Record<string, string> = {
      'dust 2': 'dust2',
      'dust two': 'dust2',
      dust_2: 'dust2',
      d2: 'dust2',
      cobble: 'cobblestone',
      cbble: 'cobblestone',
      de_cbble: 'cobblestone',
      de_cobblestone: 'cobblestone',
      ovp: 'overpass'
    }

    for (const [alias, targetId] of Object.entries(aliasMap)) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower)) {
        const m = MAPS_DATA.find((item) => item.id === targetId)
        if (m) return { mapId: m.id, mapName: m.name, floor }
      }
    }

    for (const m of MAPS_DATA) {
      if (
        new RegExp(`\\b${m.id}\\b`, 'i').test(lower) ||
        lower.includes(m.name.toLowerCase()) ||
        lower.includes(m.code.toLowerCase())
      ) {
        return { mapId: m.id, mapName: m.name, floor }
      }
    }

    return null
  }

  function findBestLineupMatch(query: string, pool: Lineup[]): Lineup | null {
    const clean = query.trim().toLowerCase()
    if (!clean || pool.length === 0) return null

    const mapHint = resolveMapFromText(clean)

    let nadeHint: GrenadeType | null = null
    if (/\bsmoke\b/.test(clean)) nadeHint = 'smoke'
    else if (/\b(flash|popflash)\b/.test(clean)) nadeHint = 'flash'
    else if (/\b(molotov|molly|incendiary)\b/.test(clean)) nadeHint = 'molotov'
    else if (/\b(he|frag)\b/.test(clean)) nadeHint = 'he'
    else if (/\bdecoy\b/.test(clean)) nadeHint = 'decoy'

    let sideHint: 't' | 'ct' | null = null
    if (/\bct\b/.test(clean)) sideHint = 'ct'
    else if (/\bt\b/.test(clean)) sideHint = 't'

    const stopWords = new Set([
      'setup',
      'load',
      'lineup',
      'grenade',
      'nade',
      'from',
      'to',
      'into',
      'onto',
      'on',
      'in',
      'at',
      'the',
      'for',
      'a',
      'an',
      'with',
      'map',
      'upper',
      'lower',
      'smoke',
      'flash',
      'popflash',
      'molotov',
      'molly',
      'incendiary',
      'he',
      'decoy',
      't',
      'ct',
      ...(mapHint
        ? [mapHint.mapId, 'dust', 'two', '2', 'd2', 'cbble', 'cobble', 'cobblestone']
        : [])
    ])

    const tokens = clean
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !stopWords.has(t))

    let best: Lineup | null = null
    let bestScore = 0

    for (const item of pool) {
      if (mapHint && item.mapId !== mapHint.mapId) continue
      if (nadeHint && item.grenadeType !== nadeHint) continue

      let score = 0
      const titleLower = item.title.toLowerCase()
      const startLower = item.startLocation.toLowerCase()
      const endLower = item.endLocation.toLowerCase()
      const tagsLower = (item.tags || []).join(' ').toLowerCase()
      const proLower = (item.proPlayer || '').toLowerCase()
      const siteLower = (item.site || '').toLowerCase()

      if (sideHint && (item.side === sideHint || item.side === 'all')) score += 2
      if (nadeHint && item.grenadeType === nadeHint) score += 2
      if (mapHint && item.mapId === mapHint.mapId) score += 2
      if (!mapHint && item.mapId === mapStore.currentMapId) score += 1

      if (tokens.length === 0) {
        if (mapHint || nadeHint) score += 1
      } else {
        const joinedTokens = tokens.join(' ')
        if (titleLower.includes(joinedTokens)) score += 10
        if (endLower.includes(joinedTokens)) score += 8

        for (const tok of tokens) {
          if (endLower.includes(tok)) score += 6
          if (titleLower.includes(tok)) score += 5
          if (startLower.includes(tok)) score += 4
          if (tagsLower.includes(tok) || proLower.includes(tok) || siteLower === tok) {
            score += 3
          }
        }
      }

      if (score > bestScore) {
        bestScore = score
        best = item
      }
    }

    if (!best && nadeHint) {
      for (const item of pool) {
        if (mapHint && item.mapId !== mapHint.mapId) continue
        let score = 0
        const haystack = `${item.title} ${item.startLocation} ${item.endLocation} ${(item.tags || []).join(' ')}`.toLowerCase()
        for (const tok of tokens) {
          if (haystack.includes(tok)) score += 3
        }
        if (score > bestScore) {
          bestScore = score
          best = item
        }
      }
    }

    return bestScore > 0 ? best : null
  }

  function executeCommandString(
    rawCommand: string
  ): { handled: boolean; message: string; consoleCommand?: string } {
    const trimmed = rawCommand.trim()
    if (!trimmed) {
      return { handled: false, message: 'Empty command.' }
    }
    const lower = trimmed.toLowerCase()

    // Display Mode Commands: /mode all|images|spot|movement|cards|tabs
    const modeMatch = lower.match(/^\/?mode\s+(.+)$/)
    if (modeMatch) {
      const arg = (modeMatch[1] || '').trim()
      if (arg === 'all' || arg === 'images' || arg === 'all_images') {
        lineupDisplayMode.value = 'all_images'
        modalDisplayMode.value = 'all_images'
        saveToStorage()
        return { handled: true, message: 'Display mode switched to Show All Images.' }
      }
      if (arg === 'spot' || arg === 'movement' || arg === 'spot_movement') {
        lineupDisplayMode.value = 'spot_movement'
        modalDisplayMode.value = 'spot_movement'
        saveToStorage()
        return { handled: true, message: 'Display mode switched to Spot & Movement.' }
      }
      if (arg === 'cards' || arg === 'card') {
        lineupDisplayMode.value = 'cards'
        saveToStorage()
        return { handled: true, message: 'Display mode switched to Cards.' }
      }
      if (arg === 'tabs') {
        modalDisplayMode.value = 'tabs'
        saveToStorage()
        return { handled: true, message: 'Modal display mode switched to Step Tabs / Video.' }
      }
      return { handled: false, message: `Unknown display mode "${arg}". Use all, spot, or cards.` }
    }

    // Map Switch Commands: /map <name> [upper|lower] or switch to <name> [upper|lower]
    const mapMatch = trimmed.match(/^(?:\/map|switch\s+to)\s+(.+)$/i)
    if (mapMatch) {
      const query = (mapMatch[1] || '').trim()
      const resolved = resolveMapFromText(query)
      if (!resolved) {
        return { handled: false, message: `Could not find map matching "${query}".` }
      }
      mapStore.setMap(resolved.mapId)
      if (resolved.floor) {
        activeFloorId.value = resolved.floor
      } else {
        mapStore.setSurfaceLevel('all')
      }
      const consoleCommand = getMapSwitchConsoleCommand(resolved.mapId)
      const floorText = resolved.floor ? ` (${resolved.floor} floor)` : ''
      return {
        handled: true,
        message: `Switched radar to ${resolved.mapName}${floorText}.`,
        consoleCommand
      }
    }

    // Personal Book Add Command: /book add <query>
    const bookAddMatch = trimmed.match(/^\/?book\s+add\s+(.+)$/i)
    if (bookAddMatch) {
      const query = (bookAddMatch[1] || '').trim()
      const match = findBestLineupMatch(query, generalLineups.value)
      if (!match) {
        return { handled: false, message: `No general lineup matched "${query}".` }
      }
      const saved = quickAddToPersonalBook(match)
      return {
        handled: true,
        message: `Added "${saved.title}" (${saved.mapId}) to your Personal Book.`
      }
    }

    // Setup / Load Lineup Command: /setup <query> | setup <query> | load <query>
    const setupMatch = trimmed.match(/^(?:\/?setup|\/?load)\s+(.+)$/i)
    if (setupMatch) {
      const query = (setupMatch[1] || '').trim()
      const searchPool = allLineups.value.length > 0 ? allLineups.value : generalLineups.value
      const match =
        findBestLineupMatch(query, searchPool) ||
        findBestLineupMatch(query, generalLineups.value)

      if (!match) {
        return { handled: false, message: `No lineup matched "${query}".` }
      }

      if (!mapStore.selectedNadeTypes.includes(match.grenadeType)) {
        mapStore.selectedNadeTypes.push(match.grenadeType)
      }
      if (
        activeExecute.value &&
        !activeExecute.value.lineupIds.includes(match.id) &&
        !(match.externalId && activeExecute.value.lineupIds.includes(match.externalId))
      ) {
        activeExecuteId.value = null
      }

      selectLineup(match)

      const consoleCommand = getLineupSetupConsoleCommand(match)
      if (consoleCommand && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(consoleCommand).catch(() => {})
      }

      return {
        handled: true,
        message: `Loaded "${match.title}" on ${match.mapId.toUpperCase()} & copied setup CMD.`,
        consoleCommand
      }
    }

    return { handled: false, message: `Unrecognized command "${trimmed}".` }
  }

  initRealtimeSync()

  return {
    allLineups,
    generalLineups,
    personalBookLineups,
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
    lineupDisplayMode,
    modalDisplayMode,
    activeCatalogTab,
    quickSelectIds,
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
    isLineupModalOpen,
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
    isInPersonalBook,
    quickAddToPersonalBook,
    removeFromPersonalBook,
    togglePersonalBook,
    toggleQuickSelect,
    clearQuickSelect,
    addQuickSelectedToPersonalBook,
    executeCommandString,
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
