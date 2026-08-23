import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { DEFAULT_LINEUPS } from '../data/defaultLineups'
import { useMapStore } from './mapStore'
import type { Lineup, GrenadeType } from '../types'

const STORAGE_KEY = 'cs2_stratbook_custom_lineups'
const FAVORITES_KEY = 'cs2_stratbook_favorites'

export const useLineupStore = defineStore('lineup', () => {
  const mapStore = useMapStore()

  // State
  const customLineups = ref<Lineup[]>([])
  const favoriteIds = ref<string[]>([])
  const activeLineup = ref<Lineup | null>(null)
  const hoveredLineup = ref<Lineup | null>(null)
  const isAddModalOpen = ref<boolean>(false)
  const isEditMode = ref<boolean>(false)
  const editingLineup = ref<Lineup | null>(null)

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
    } catch (e) {
      console.error('Failed to load custom lineups from storage', e)
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customLineups.value))
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds.value))
    } catch (e) {
      console.error('Failed to save custom lineups to storage', e)
    }
  }

  loadFromStorage()

  // Watch for changes to save
  watch([customLineups, favoriteIds], () => {
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

  // Filtered lineups for display
  const filteredLineups = computed<Lineup[]>(() => {
    return currentMapLineups.value.filter(lineup => {
      // Nade type filter
      if (!mapStore.selectedNadeTypes.includes(lineup.grenadeType)) {
        return false
      }

      // Side filter
      if (mapStore.selectedSide !== 'all' && lineup.side !== 'all' && lineup.side !== mapStore.selectedSide) {
        return false
      }

      // Site filter
      if (mapStore.selectedSite !== 'all') {
        if (lineup.site !== mapStore.selectedSite) {
          return false
        }
      }

      // Throw type filter
      if (mapStore.selectedThrowType !== 'all') {
        if (lineup.throwType !== mapStore.selectedThrowType) {
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
        // Match side filter
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

  function addLineup(newLineupData: Omit<Lineup, 'id' | 'createdAt' | 'isCustom'>): Lineup {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newLineup: Lineup = {
      ...newLineupData,
      id,
      isCustom: true,
      createdAt: new Date().toISOString().split('T')[0]
    }
    customLineups.value.push(newLineup)
    return newLineup
  }

  function updateLineup(id: string, updatedData: Partial<Lineup>) {
    const idx = customLineups.value.findIndex(l => l.id === id)
    if (idx >= 0) {
      customLineups.value[idx] = {
        ...customLineups.value[idx],
        ...updatedData,
        updatedAt: new Date().toISOString().split('T')[0]
      }
      if (activeLineup.value?.id === id) {
        activeLineup.value = customLineups.value[idx]
      }
    }
  }

  function deleteLineup(id: string) {
    const idx = customLineups.value.findIndex(l => l.id === id)
    if (idx >= 0) {
      customLineups.value.splice(idx, 1)
      if (activeLineup.value?.id === id) {
        activeLineup.value = null
      }
    }
  }

  function exportJSON(): string {
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      customLineups: customLineups.value,
      favorites: favoriteIds.value
    }
    return JSON.stringify(exportData, null, 2)
  }

  function importJSON(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const data = JSON.parse(jsonString)
      if (Array.isArray(data.customLineups)) {
        // Merge or replace
        const newItems: Lineup[] = data.customLineups.map((item: any) => ({
          ...item,
          id: item.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isCustom: true
        }))
        
        // Filter duplicates
        const existingIds = new Set(customLineups.value.map(l => l.id))
        const filteredNew = newItems.filter(item => !existingIds.has(item.id))
        
        customLineups.value.push(...filteredNew)
        if (Array.isArray(data.favorites)) {
          favoriteIds.value = Array.from(new Set([...favoriteIds.value, ...data.favorites]))
        }
        return { success: true, count: filteredNew.length }
      }
      return { success: false, count: 0, error: 'Invalid JSON format: missing customLineups array' }
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'JSON parsing error' }
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
    isAddModalOpen,
    isEditMode,
    editingLineup,
    openLineup,
    closeLineup,
    setHoveredLineup,
    toggleFavorite,
    isFavorite,
    addLineup,
    updateLineup,
    deleteLineup,
    exportJSON,
    importJSON
  }
})
