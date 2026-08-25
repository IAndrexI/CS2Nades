import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { DEFAULT_LINEUPS } from '../data/defaultLineups'
import { useMapStore } from './mapStore'
import type { Lineup, GrenadeType, NadeExecute } from '../types'

const STORAGE_KEY = 'cs2_stratbook_custom_lineups'
const FAVORITES_KEY = 'cs2_stratbook_favorites'
const EXECUTES_STORAGE_KEY = 'cs2_stratbook_executes'

export const useLineupStore = defineStore('lineup', () => {
  const mapStore = useMapStore()

  // State
  const customLineups = ref<Lineup[]>([])
  const customExecutes = ref<NadeExecute[]>([])
  const activeExecuteId = ref<string | null>(null)
  const isCreateExecuteModalOpen = ref<boolean>(false)

  const favoriteIds = ref<string[]>([])
  const activeLineup = ref<Lineup | null>(null)
  const hoveredLineup = ref<Lineup | null>(null)
  const isAddModalOpen = ref<boolean>(false)
  const isEditMode = ref<boolean>(false)
  const editingLineup = ref<Lineup | null>(null)

  // Sync state
  const isSyncing = ref<boolean>(false)
  const isConflictModalOpen = ref<boolean>(false)
  const pendingConflicts = ref<{ local: Lineup; server: Lineup }[]>([])
  const lastSyncTime = ref<string | null>(null)

  // Initialize from LocalStorage
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        customLineups.value = JSON.parse(stored)
      }
      const favs = localStorage.getItem(FAVORITES_KEY)
      if (favs) {
        favoriteIds.value = JSON.parse(favs)
      }
      const execs = localStorage.getItem(EXECUTES_STORAGE_KEY)
      if (execs) {
        customExecutes.value = JSON.parse(execs)
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
    } catch (e) {
      console.error('Failed to save custom lineups to storage', e)
    }
  }

  loadFromStorage()

  // Watch for changes to save
  watch([customLineups, favoriteIds, customExecutes], () => {
    saveToStorage()
  }, { deep: true })

  // All combined lineups
  const allLineups = computed<Lineup[]>(() => {
    return [...DEFAULT_LINEUPS, ...customLineups.value]
  })

  // Lineups for the currently selected map
  const currentMapLineups = computed<Lineup[]>(() => {
    return allLineups.value.filter(l => l.mapId === mapStore.currentMapId)
  })

  // Executes for current map
  const currentMapExecutes = computed<NadeExecute[]>(() => {
    return customExecutes.value.filter(e => e.mapId === mapStore.currentMapId)
  })

  // Active Execute
  const activeExecute = computed<NadeExecute | null>(() => {
    if (!activeExecuteId.value) return null
    return customExecutes.value.find(e => e.id === activeExecuteId.value) || null
  })

  // Lineups in active execute
  const activeExecuteLineups = computed<Lineup[]>(() => {
    if (!activeExecute.value) return []
    return currentMapLineups.value.filter(l => activeExecute.value!.lineupIds.includes(l.id))
  })

  // Filtered lineups for display
  const filteredLineups = computed<Lineup[]>(() => {
    // If an execute group is active, isolate to that execute's lineups
    if (activeExecute.value) {
      return activeExecuteLineups.value
    }

    return currentMapLineups.value.filter(lineup => {
      // Nade type filter
      if (!mapStore.selectedNadeTypes.includes(lineup.grenadeType)) {
        return false
      }

      // Side filter
      if (mapStore.selectedSide !== 'all' && lineup.side !== 'all' && lineup.side !== mapStore.selectedSide) {
        return false
      }

      // Surface Level Filter (if map is multi-level and not 'all')
      if (mapStore.surfaceLevel !== 'all') {
        const levelTag = (lineup as any).level || (lineup.tags || []).find(t => t.toLowerCase() === 'upper' || t.toLowerCase() === 'lower')
        if (levelTag && levelTag.toLowerCase() !== mapStore.surfaceLevel) {
          return false
        }
      }

      // Search query filter
      if (mapStore.searchQuery.trim() !== '') {
        const query = mapStore.searchQuery.toLowerCase()
        const matchTitle = lineup.title.toLowerCase().includes(query)
        const matchStart = lineup.startLocation.toLowerCase().includes(query)
        const matchEnd = lineup.endLocation.toLowerCase().includes(query)
        const matchTags = lineup.tags.some(t => t.toLowerCase().includes(query))
        if (!matchTitle && !matchStart && !matchEnd && !matchTags) {
          return false
        }
      }

      return true
    })
  })

  // Count by grenade type for current map
  const nadeCounts = computed<Record<GrenadeType, number>>(() => {
    const counts: Record<GrenadeType, number> = {
      smoke: 0,
      flash: 0,
      molotov: 0,
      he: 0,
      decoy: 0
    }

    currentMapLineups.value.forEach(l => {
      if (counts[l.grenadeType] !== undefined) {
        if (mapStore.selectedSide === 'all' || l.side === 'all' || l.side === mapStore.selectedSide) {
          counts[l.grenadeType]++
        }
      }
    })

    return counts
  })

  // Actions
  function openLineup(lineup: Lineup) {
    activeLineup.value = lineup
  }

  function closeLineup() {
    activeLineup.value = null
  }

  function setHoveredLineup(lineup: Lineup | null) {
    hoveredLineup.value = lineup
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

  function addLineup(lineupData: Omit<Lineup, 'id' | 'createdAt'>): Lineup {
    const newLineup: Lineup = {
      ...lineupData,
      id: `custom-lineup-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      isCustom: true
    }
    customLineups.value.unshift(newLineup)
    pushToServer(newLineup).catch(() => {})
    return newLineup
  }

  function updateLineup(updatedLineup: Lineup) {
    const idx = customLineups.value.findIndex(l => l.id === updatedLineup.id)
    if (idx >= 0) {
      customLineups.value[idx] = { ...updatedLineup, updatedAt: new Date().toISOString() }
      pushToServer(customLineups.value[idx]).catch(() => {})
    }
  }

  function deleteLineup(id: string) {
    customLineups.value = customLineups.value.filter(l => l.id !== id)
    favoriteIds.value = favoriteIds.value.filter(fId => fId !== id)
    // Remove from executes
    customExecutes.value.forEach(e => {
      e.lineupIds = e.lineupIds.filter(lId => lId !== id)
    })
    if (activeLineup.value?.id === id) activeLineup.value = null
    if (hoveredLineup.value?.id === id) hoveredLineup.value = null
    axios.delete(`/api/lineups/${id}`).catch(() => {})
  }

  function clearAllLineups() {
    customLineups.value = []
    favoriteIds.value = []
    customExecutes.value = []
    activeLineup.value = null
    hoveredLineup.value = null
    saveToStorage()
    axios.post('/api/lineups/clear').catch(() => {})
  }

  // ─────────────────────────────────────────────────────────────
  // EXECUTE / NADE GROUPING ACTIONS
  // ─────────────────────────────────────────────────────────────
  function createExecute(execData: Omit<NadeExecute, 'id' | 'createdAt'>): NadeExecute {
    const newExec: NadeExecute = {
      ...execData,
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString()
    }
    customExecutes.value.unshift(newExec)
    saveToStorage()
    return newExec
  }

  function deleteExecute(id: string) {
    customExecutes.value = customExecutes.value.filter(e => e.id !== id)
    if (activeExecuteId.value === id) activeExecuteId.value = null
    saveToStorage()
  }

  function toggleLineupInExecute(executeId: string, lineupId: string) {
    const exec = customExecutes.value.find(e => e.id === executeId)
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

  function toggleShareToLibrary(id: string) {
    const idx = customLineups.value.findIndex(l => l.id === id)
    if (idx >= 0) {
      const current = customLineups.value[idx]
      const newStatus = !(current.inLibrary || current.isTeamShared)
      customLineups.value[idx] = {
        ...current,
        inLibrary: newStatus,
        isTeamShared: newStatus,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      pushToServer(customLineups.value[idx]).catch(() => {})
    }
  }

  function addToLibrary(id: string) {
    const idx = customLineups.value.findIndex(l => l.id === id)
    if (idx >= 0) {
      customLineups.value[idx] = {
        ...customLineups.value[idx],
        inLibrary: true,
        isTeamShared: true,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      pushToServer(customLineups.value[idx]).catch(() => {})
    }
  }

  function setActiveExecute(execId: string | null) {
    activeExecuteId.value = execId
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
      console.error('Import failed', e)
      return { success: false, error: e?.message || 'Invalid JSON syntax.' }
    }
  }

  async function syncWithServer() {
    isSyncing.value = true
    try {
      const res = await axios.get('/api/lineups')
      const serverLineups: Lineup[] = res.data || []
      
      const conflicts: { local: Lineup; server: Lineup }[] = []
      const localMap = new Map<string, Lineup>()
      customLineups.value.forEach(l => localMap.set(l.id, l))

      serverLineups.forEach(serverL => {
        const localL = localMap.get(serverL.id)
        if (localL) {
          if (JSON.stringify(localL) !== JSON.stringify(serverL)) {
            conflicts.push({ local: localL, server: serverL })
          }
        } else {
          customLineups.value.push(serverL)
        }
      })

      for (const localL of customLineups.value) {
        if (!serverLineups.some(s => s.id === localL.id)) {
          await pushToServer(localL)
        }
      }

      if (conflicts.length > 0) {
        pendingConflicts.value = conflicts
        isConflictModalOpen.value = true
      }

      lastSyncTime.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      console.warn('Server sync not reachable, working in offline mode:', e)
    } finally {
      isSyncing.value = false
    }
  }

  function resolveConflict(conflictIndex: number, choice: 'local' | 'server' | 'both') {
    const item = pendingConflicts.value[conflictIndex]
    if (!item) return

    const { local, server } = item
    const idx = customLineups.value.findIndex(l => l.id === local.id)

    if (choice === 'server') {
      if (idx >= 0) {
        customLineups.value[idx] = server
      } else {
        customLineups.value.push(server)
      }
    } else if (choice === 'both') {
      const duplicatedServer: Lineup = {
        ...server,
        id: `server-copy-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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
    try {
      await axios.post('/api/lineups', lineup)
      return true
    } catch (e) {
      console.warn('Could not push lineup to server:', e)
      return false
    }
  }

  return {
    allLineups,
    customLineups,
    currentMapLineups,
    filteredLineups,
    nadeCounts,
    activeLineup,
    hoveredLineup,
    favoriteIds,
    customExecutes,
    currentMapExecutes,
    activeExecuteId,
    activeExecute,
    activeExecuteLineups,
    isCreateExecuteModalOpen,
    isAddModalOpen,
    isEditMode,
    editingLineup,
    isSyncing,
    isConflictModalOpen,
    pendingConflicts,
    lastSyncTime,
    openLineup,
    closeLineup,
    setHoveredLineup,
    toggleFavorite,
    isFavorite,
    addLineup,
    updateLineup,
    deleteLineup,
    clearAllLineups,
    createExecute,
    deleteExecute,
    toggleLineupInExecute,
    setActiveExecute,
    toggleShareToLibrary,
    addToLibrary,
    exportJSON,
    importJSON,
    syncWithServer,
    resolveConflict,
    pushToServer
  }
})
