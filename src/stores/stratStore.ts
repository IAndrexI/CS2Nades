import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { DEFAULT_STRATS } from '../data/defaultStrats'
import { useMapStore } from './mapStore'
import type { Strategy, TacticsElement, StratPhase } from '../types'

const STRATS_STORAGE_KEY = 'cs2_stratbook_custom_strats'

export const useStratStore = defineStore('strat', () => {
  const mapStore = useMapStore()

  // State
  const customStrats = ref<Strategy[]>([])
  const activeStrat = ref<Strategy | null>(null)
  const isEditingStrat = ref<boolean>(false)
  const isCreateStratModalOpen = ref<boolean>(false)
  
  // Tactics Board Drawing State
  const activeTool = ref<
    | 'select'
    | 'pen'
    | 'arrow'
    | 'line'
    | 'vision_cone'
    | 'text'
    | 'smoke'
    | 'flash'
    | 'molotov'
    | 'he_blast'
    | 'c4_bomb'
    | 'plant_a'
    | 'plant_b'
    | 'player_t'
    | 'player_ct'
    | 'player'
    | 'eraser'
  >('arrow')
  const activeColor = ref<string>('#de9b35') // CS2 Gold accent default
  const activeRole = ref<'IGL' | 'Entry' | 'Support' | 'Lurker' | 'AWP'>('Entry')
  const boardElements = ref<TacticsElement[]>([])
  const mapElements = ref<Record<string, TacticsElement[]>>({})
  const tempSavedBoards = ref<Record<string, { elements: TacticsElement[]; savedAt: string }>>({})
  const history = ref<TacticsElement[][]>([])
  const historyIndex = ref<number>(-1)

  const TEMP_BOARDS_STORAGE_KEY = 'cs2_stratbook_temp_saved_boards'

  // Storage
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STRATS_STORAGE_KEY)
      if (stored) {
        customStrats.value = JSON.parse(stored)
      }
      const storedTemp = localStorage.getItem(TEMP_BOARDS_STORAGE_KEY)
      if (storedTemp) {
        tempSavedBoards.value = JSON.parse(storedTemp)
      }
    } catch (e) {
      console.error('Failed to load storage', e)
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STRATS_STORAGE_KEY, JSON.stringify(customStrats.value))
      localStorage.setItem(TEMP_BOARDS_STORAGE_KEY, JSON.stringify(tempSavedBoards.value))
    } catch (e) {
      console.error('Failed to save to storage', e)
    }
  }

  loadFromStorage()

  watch(customStrats, () => {
    saveToStorage()
  }, { deep: true })

  watch(tempSavedBoards, () => {
    saveToStorage()
  }, { deep: true })

  // Synchronize when active map changes in mapStore - FRESH BOARD BY DEFAULT
  watch(() => mapStore.currentMapId, () => {
    boardElements.value = []
    history.value = [[]]
    historyIndex.value = 0
  })

  function tempSaveBoard(mapId: string) {
    if (!mapId) return
    tempSavedBoards.value[mapId] = {
      elements: JSON.parse(JSON.stringify(boardElements.value)),
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    saveToStorage()
  }

  function restoreTempBoard(mapId: string) {
    const saved = tempSavedBoards.value[mapId]
    if (saved && saved.elements) {
      boardElements.value = JSON.parse(JSON.stringify(saved.elements))
      history.value = [[...boardElements.value]]
      historyIndex.value = 0
    }
  }

  function loadMapElements(mapId: string) {
    boardElements.value = mapElements.value[mapId] ? [...mapElements.value[mapId]] : []
    history.value = [[...boardElements.value]]
    historyIndex.value = 0
  }

  function saveCurrentMapElements(mapId: string) {
    mapElements.value[mapId] = [...boardElements.value]
    saveToStorage()
  }

  function getElementsForMap(mapId: string): TacticsElement[] {
    return mapElements.value[mapId] || []
  }

  // All combined strats
  const allStrats = computed<Strategy[]>(() => {
    return [...DEFAULT_STRATS, ...customStrats.value]
  })

  // Current map strats
  const currentMapStrats = computed<Strategy[]>(() => {
    return allStrats.value.filter(s => s.mapId === mapStore.currentMapId)
  })

  // Actions
  function openStrat(strat: Strategy) {
    activeStrat.value = strat
  }

  function closeStrat() {
    activeStrat.value = null
  }

  function addStrat(newStratData: Omit<Strategy, 'id' | 'createdAt' | 'isCustom'>): Strategy {
    const id = `strat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newStrat: Strategy = {
      ...newStratData,
      id,
      isCustom: true,
      createdAt: new Date().toISOString().split('T')[0]
    }
    customStrats.value.push(newStrat)
    return newStrat
  }

  function updateStrat(id: string, updatedData: Partial<Strategy>) {
    const idx = customStrats.value.findIndex(s => s.id === id)
    if (idx >= 0) {
      customStrats.value[idx] = {
        ...customStrats.value[idx],
        ...updatedData,
        updatedAt: new Date().toISOString().split('T')[0]
      }
      if (activeStrat.value?.id === id) {
        activeStrat.value = customStrats.value[idx]
      }
    }
  }

  function deleteStrat(id: string) {
    const idx = customStrats.value.findIndex(s => s.id === id)
    if (idx >= 0) {
      customStrats.value.splice(idx, 1)
      if (activeStrat.value?.id === id) {
        activeStrat.value = null
      }
    }
  }

  // Tactics Board Drawing actions
  function addBoardElement(element: TacticsElement) {
    // Cut any redo history
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    boardElements.value.push(element)
    mapElements.value[mapStore.currentMapId] = [...boardElements.value]
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
    saveToStorage()
  }

  function removeBoardElement(id: string) {
    boardElements.value = boardElements.value.filter(el => el.id !== id)
    mapElements.value[mapStore.currentMapId] = [...boardElements.value]
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
    saveToStorage()
  }

  function clearBoard() {
    boardElements.value = []
    mapElements.value[mapStore.currentMapId] = []
    history.value.push([])
    historyIndex.value = history.value.length - 1
    saveToStorage()
  }

  function undo() {
    if (historyIndex.value > 0) {
      historyIndex.value--
      boardElements.value = [...history.value[historyIndex.value]]
      mapElements.value[mapStore.currentMapId] = [...boardElements.value]
      saveToStorage()
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      boardElements.value = []
      mapElements.value[mapStore.currentMapId] = []
      saveToStorage()
    }
  }

  function setBoardElements(elements: TacticsElement[]) {
    boardElements.value = [...elements]
    mapElements.value[mapStore.currentMapId] = [...elements]
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
    saveToStorage()
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      boardElements.value = [...history.value[historyIndex.value]]
      mapElements.value[mapStore.currentMapId] = [...boardElements.value]
      saveToStorage()
    }
  }

  return {
    allStrats,
    customStrats,
    currentMapStrats,
    activeStrat,
    isEditingStrat,
    isCreateStratModalOpen,
    activeTool,
    activeColor,
    activeRole,
    boardElements,
    mapElements,
    tempSavedBoards,
    historyIndex,
    openStrat,
    closeStrat,
    addStrat,
    updateStrat,
    deleteStrat,
    loadMapElements,
    saveCurrentMapElements,
    tempSaveBoard,
    restoreTempBoard,
    getElementsForMap,
    addBoardElement,
    removeBoardElement,
    setBoardElements,
    clearBoard,
    undo,
    redo
  }
})
