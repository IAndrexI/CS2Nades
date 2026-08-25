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
  const history = ref<TacticsElement[][]>([])
  const historyIndex = ref<number>(-1)

  // Storage
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STRATS_STORAGE_KEY)
      if (stored) {
        customStrats.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load custom strats from storage', e)
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STRATS_STORAGE_KEY, JSON.stringify(customStrats.value))
    } catch (e) {
      console.error('Failed to save custom strats to storage', e)
    }
  }

  loadFromStorage()

  watch(customStrats, () => {
    saveToStorage()
  }, { deep: true })

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
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
  }

  function removeBoardElement(id: string) {
    boardElements.value = boardElements.value.filter(el => el.id !== id)
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
  }

  function clearBoard() {
    if (boardElements.value.length > 0) {
      boardElements.value = []
      history.value.push([])
      historyIndex.value = history.value.length - 1
    }
  }

  function undo() {
    if (historyIndex.value > 0) {
      historyIndex.value--
      boardElements.value = [...history.value[historyIndex.value]]
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      boardElements.value = []
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      boardElements.value = [...history.value[historyIndex.value]]
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
    historyIndex,
    openStrat,
    closeStrat,
    addStrat,
    updateStrat,
    deleteStrat,
    addBoardElement,
    removeBoardElement,
    clearBoard,
    undo,
    redo
  }
})
