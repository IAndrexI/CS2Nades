import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MAPS_DATA } from '../data/mapsData'
import type { GrenadeType, TeamSide, ThrowType, MapInfo } from '../types'

export const useMapStore = defineStore('map', () => {
  // State
  const currentMapId = ref<string>('mirage')
  const selectedNadeTypes = ref<GrenadeType[]>(['smoke', 'flash', 'molotov', 'he'])
  const selectedSide = ref<TeamSide>('all')
  const selectedThrowType = ref<string>('all')
  const selectedSite = ref<string>('all')
  const searchQuery = ref<string>('')
  
  // Viewport & Overlays
  const zoomLevel = ref<number>(1)
  const panOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })
  const showCallouts = ref<boolean>(true)
  const showTrajectories = ref<boolean>(true)
  const isTacticsMode = ref<boolean>(false)
  const isPlacementMode = ref<boolean>(false)
  const placementStep = ref<'origin' | 'landing'>('origin')
  const tempPlacement = ref<{ origin?: { x: number; y: number }; landing?: { x: number; y: number } }>({})

  // Computed
  const currentMap = computed<MapInfo>(() => {
    return MAPS_DATA.find(m => m.id === currentMapId.value) || MAPS_DATA[0]
  })

  const availableMaps = computed<MapInfo[]>(() => MAPS_DATA)

  // Actions
  function setMap(mapId: string) {
    if (MAPS_DATA.some(m => m.id === mapId)) {
      currentMapId.value = mapId
      resetZoom()
    }
  }

  function toggleNadeType(type: GrenadeType) {
    const idx = selectedNadeTypes.value.indexOf(type)
    if (idx >= 0) {
      // Don't remove if it's the only one selected, or allow removing if user wants
      selectedNadeTypes.value.splice(idx, 1)
    } else {
      selectedNadeTypes.value.push(type)
    }
  }

  function selectOnlyNadeType(type: GrenadeType) {
    if (selectedNadeTypes.value.length === 1 && selectedNadeTypes.value[0] === type) {
      // Toggle all on
      selectedNadeTypes.value = ['smoke', 'flash', 'molotov', 'he', 'decoy']
    } else {
      selectedNadeTypes.value = [type]
    }
  }

  function setSide(side: TeamSide) {
    selectedSide.value = side
  }

  function setSite(site: string) {
    selectedSite.value = site
  }

  function setThrowType(throwType: string) {
    selectedThrowType.value = throwType
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function resetFilters() {
    selectedNadeTypes.value = ['smoke', 'flash', 'molotov', 'he']
    selectedSide.value = 'all'
    selectedThrowType.value = 'all'
    selectedSite.value = 'all'
    searchQuery.value = ''
  }

  function resetZoom() {
    zoomLevel.value = 1
    panOffset.value = { x: 0, y: 0 }
  }

  function startPlacement() {
    isPlacementMode.value = true
    placementStep.value = 'origin'
    tempPlacement.value = {}
  }

  function cancelPlacement() {
    isPlacementMode.value = false
    placementStep.value = 'origin'
    tempPlacement.value = {}
  }

  return {
    currentMapId,
    currentMap,
    availableMaps,
    selectedNadeTypes,
    selectedSide,
    selectedThrowType,
    selectedSite,
    searchQuery,
    zoomLevel,
    panOffset,
    showCallouts,
    showTrajectories,
    isTacticsMode,
    isPlacementMode,
    placementStep,
    tempPlacement,
    setMap,
    toggleNadeType,
    selectOnlyNadeType,
    setSide,
    setSite,
    setThrowType,
    setSearchQuery,
    resetFilters,
    resetZoom,
    startPlacement,
    cancelPlacement
  }
})
