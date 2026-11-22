import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { DEFAULT_STRATS } from '../data/defaultStrats'
import { useMapStore } from './mapStore'
import { snapPointToMapBounds } from '../core/radar/mapBounds'
import type { Strategy, TacticsElement, StratPhase } from '../types'

const STRATS_STORAGE_KEY = 'cs2_stratbook_custom_strats'
const TEMP_BOARDS_STORAGE_KEY = 'cs2_stratbook_temp_saved_boards'
const SELECTED_TACTICS_STRAT_KEY = 'cs2_stratbook_selected_tactics_strat_id'

export const useStratStore = defineStore('strat', () => {
  const mapStore = useMapStore()

  // State
  const customStrats = ref<Strategy[]>([])
  const activeStrat = ref<Strategy | null>(null)
  const isEditingStrat = ref<boolean>(false)
  const isCreateStratModalOpen = ref<boolean>(false)
  const selectedStratForTacticsId = ref<string | null>(null)

  // Tactics Board Drawing State
  const activeTool = ref<
    | 'select'
    | 'pen'
    | 'arrow'
    | 'line'
    | 'text'
    | 'smoke'
    | 'flash'
    | 'molotov'
    | 'he_blast'
    | 'c4_bomb'
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

  // Per-User Undo / Redo Stacks
  interface UserActionRecord {
    action: 'add' | 'remove'
    element: TacticsElement
    userId?: string
    username?: string
  }
  const userActionUndoStack = ref<UserActionRecord[]>([])
  const userActionRedoStack = ref<UserActionRecord[]>([])

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
      const storedSelectedStrat = localStorage.getItem(SELECTED_TACTICS_STRAT_KEY)
      if (storedSelectedStrat) {
        selectedStratForTacticsId.value = storedSelectedStrat
      }
    } catch (e) {
      console.error('Failed to load storage', e)
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STRATS_STORAGE_KEY, JSON.stringify(customStrats.value))
      localStorage.setItem(TEMP_BOARDS_STORAGE_KEY, JSON.stringify(tempSavedBoards.value))
      if (selectedStratForTacticsId.value) {
        localStorage.setItem(SELECTED_TACTICS_STRAT_KEY, selectedStratForTacticsId.value)
      } else {
        localStorage.removeItem(SELECTED_TACTICS_STRAT_KEY)
      }
    } catch (e) {
      console.error('Failed to save to storage', e)
    }
  }

  loadFromStorage()

  watch(
    customStrats,
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  watch(
    tempSavedBoards,
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  watch(selectedStratForTacticsId, () => {
    saveToStorage()
  })

  // Synchronize when active map changes in mapStore - preserve any loaded map elements
  watch(
    () => mapStore.currentMapId,
    (newMapId) => {
      boardElements.value = mapElements.value[newMapId] ? [...mapElements.value[newMapId]] : []
      history.value = [[...boardElements.value]]
      historyIndex.value = 0
    }
  )

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
    return allStrats.value.filter((s) => s.mapId === mapStore.currentMapId)
  })

  // Currently marked strategy for Live Tactics
  const selectedStratForTactics = computed<Strategy | null>(() => {
    if (!selectedStratForTacticsId.value) return null
    return allStrats.value.find((s) => s.id === selectedStratForTacticsId.value) || null
  })

  function markStratForTactics(strat: Strategy | string | null) {
    if (!strat) {
      selectedStratForTacticsId.value = null
    } else if (typeof strat === 'string') {
      selectedStratForTacticsId.value = strat
    } else {
      selectedStratForTacticsId.value = strat.id
    }
    saveToStorage()
  }

  function applyStratToBoard(strat: Strategy, phaseIndex = 0): TacticsElement[] {
    if (!strat) return []
    const targetMapId = strat.mapId || mapStore.currentMapId
    selectedStratForTacticsId.value = strat.id

    const phase: StratPhase | undefined = strat.phases[phaseIndex] || strat.phases[0]
    const generatedElements: TacticsElement[] = []

    // Copy any predefined tactical drawings (arrows, smoke clouds, molotovs)
    if (strat.tacticsDrawings && strat.tacticsDrawings.length > 0) {
      strat.tacticsDrawings.forEach((drawing, idx) => {
        generatedElements.push({
          ...JSON.parse(JSON.stringify(drawing)),
          id: `${strat.id}-draw-${idx + 1}-${Date.now()}`
        })
      })
    }

    // Convert the 5 playerAssignments into player_t or player_ct pins
    if (phase && phase.playerAssignments) {
      const pinType = strat.side === 't' ? 'player_t' : 'player_ct'
      const pinColor = strat.side === 't' ? '#f59e0b' : '#38bdf8'

      phase.playerAssignments.forEach((assignment) => {
        const snapped = snapPointToMapBounds(targetMapId, assignment.position)
        generatedElements.push({
          id: `${strat.id}-p${phaseIndex + 1}-slot-${assignment.slot}-${Date.now()}`,
          type: pinType,
          color: pinColor,
          points: [{ x: snapped.x, y: snapped.y }],
          playerNum: assignment.slot,
          playerRole: assignment.role,
          text: assignment.playerName || `${strat.side.toUpperCase()} ${assignment.slot} (${assignment.role})`
        })
      })
    }

    mapElements.value[targetMapId] = [...generatedElements]
    if (mapStore.currentMapId !== targetMapId) {
      mapStore.setMap(targetMapId)
    }
    boardElements.value = [...generatedElements]
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
    saveToStorage()
    return generatedElements
  }

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
      createdAt: new Date().toISOString().split('T')[0]!
    }
    customStrats.value.push(newStrat)
    return newStrat
  }

  function updateStrat(id: string, updatedData: Partial<Strategy>) {
    const idx = customStrats.value.findIndex((s) => s.id === id)
    if (idx >= 0) {
      const current = customStrats.value[idx]!
      customStrats.value[idx] = {
        ...current,
        ...updatedData,
        updatedAt: new Date().toISOString().split('T')[0]
      }
      if (activeStrat.value?.id === id) {
        activeStrat.value = customStrats.value[idx]!
      }
    }
  }

  function deleteStrat(id: string) {
    const idx = customStrats.value.findIndex((s) => s.id === id)
    if (idx >= 0) {
      customStrats.value.splice(idx, 1)
      if (activeStrat.value?.id === id) {
        activeStrat.value = null
      }
      if (selectedStratForTacticsId.value === id) {
        selectedStratForTacticsId.value = null
      }
    }
  }

  // Tactics Board Drawing actions
  function addBoardElement(
    element: TacticsElement,
    authorInfo?: { userId?: string; username?: string }
  ) {
    if (authorInfo?.userId || element.authorId) {
      const uId = authorInfo?.userId || element.authorId
      const uName = authorInfo?.username || element.authorUsername
      userActionUndoStack.value.push({
        action: 'add',
        element: { ...element },
        userId: uId,
        username: uName
      })
      userActionRedoStack.value = userActionRedoStack.value.filter((r) => r.userId !== uId)
    }

    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    boardElements.value.push(element)
    mapElements.value[mapStore.currentMapId] = [...boardElements.value]
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
    saveToStorage()
  }

  function removeBoardElement(id: string, authorInfo?: { userId?: string; username?: string }) {
    const existing = boardElements.value.find((el) => el.id === id)
    if (existing && (authorInfo?.userId || existing.authorId)) {
      const uId = authorInfo?.userId || existing.authorId
      const uName = authorInfo?.username || existing.authorUsername
      userActionUndoStack.value.push({
        action: 'remove',
        element: { ...existing },
        userId: uId,
        username: uName
      })
      userActionRedoStack.value = userActionRedoStack.value.filter((r) => r.userId !== uId)
    }

    boardElements.value = boardElements.value.filter((el) => el.id !== id)
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
    userActionUndoStack.value = []
    userActionRedoStack.value = []
    saveToStorage()
  }

  // User-Specific Undo
  function undo(userId?: string): { action: 'add' | 'remove'; element: TacticsElement } | null {
    if (userId) {
      for (let i = userActionUndoStack.value.length - 1; i >= 0; i--) {
        const record = userActionUndoStack.value[i]!
        if (record.userId === userId || (record.username && record.username === userId)) {
          userActionUndoStack.value.splice(i, 1)
          if (record.action === 'add') {
            boardElements.value = boardElements.value.filter((el) => el.id !== record.element.id)
            userActionRedoStack.value.push({ ...record })
            mapElements.value[mapStore.currentMapId] = [...boardElements.value]
            saveToStorage()
            return { action: 'remove', element: record.element }
          } else if (record.action === 'remove') {
            boardElements.value.push(record.element)
            userActionRedoStack.value.push({ ...record })
            mapElements.value[mapStore.currentMapId] = [...boardElements.value]
            saveToStorage()
            return { action: 'add', element: record.element }
          }
        }
      }
    }

    if (historyIndex.value > 0) {
      historyIndex.value--
      boardElements.value = [...(history.value[historyIndex.value] || [])]
      mapElements.value[mapStore.currentMapId] = [...boardElements.value]
      saveToStorage()
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      boardElements.value = []
      mapElements.value[mapStore.currentMapId] = []
      saveToStorage()
    }
    return null
  }

  function setBoardElements(elements: TacticsElement[]) {
    boardElements.value = [...elements]
    mapElements.value[mapStore.currentMapId] = [...elements]
    history.value.push([...boardElements.value])
    historyIndex.value = history.value.length - 1
    saveToStorage()
  }

  // User-Specific Redo
  function redo(userId?: string): { action: 'add' | 'remove'; element: TacticsElement } | null {
    if (userId) {
      for (let i = userActionRedoStack.value.length - 1; i >= 0; i--) {
        const record = userActionRedoStack.value[i]!
        if (record.userId === userId || (record.username && record.username === userId)) {
          userActionRedoStack.value.splice(i, 1)
          if (record.action === 'add') {
            boardElements.value.push(record.element)
            userActionUndoStack.value.push({ ...record })
            mapElements.value[mapStore.currentMapId] = [...boardElements.value]
            saveToStorage()
            return { action: 'add', element: record.element }
          } else if (record.action === 'remove') {
            boardElements.value = boardElements.value.filter((el) => el.id !== record.element.id)
            userActionUndoStack.value.push({ ...record })
            mapElements.value[mapStore.currentMapId] = [...boardElements.value]
            saveToStorage()
            return { action: 'remove', element: record.element }
          }
        }
      }
    }

    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      boardElements.value = [...(history.value[historyIndex.value] || [])]
      mapElements.value[mapStore.currentMapId] = [...boardElements.value]
      saveToStorage()
    }
    return null
  }

  return {
    allStrats,
    customStrats,
    currentMapStrats,
    activeStrat,
    isEditingStrat,
    isCreateStratModalOpen,
    selectedStratForTacticsId,
    selectedStratForTactics,
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
    markStratForTactics,
    applyStratToBoard,
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
