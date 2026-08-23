import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { MAPS_DATA } from '../data/mapsData'
import type { GrenadeType, TeamSide, ThrowType, MapInfo } from '../types'

const CUSTOM_MAPS_KEY = 'cs2_stratbook_custom_maps'
const CUSTOM_RADARS_KEY = 'cs2_stratbook_custom_radars'
const RADAR_SETTINGS_KEY = 'cs2_stratbook_radar_settings'
const CUSTOM_CALLOUTS_KEY = 'cs2_stratbook_custom_callouts'

export interface CalloutItem {
  id: string
  name: string
  site?: string
  coords: { x: number; y: number }
  isCustom?: boolean
}

export const useMapStore = defineStore('map', () => {
  // State
  const currentMapId = ref<string>('mirage')
  const selectedNadeTypes = ref<GrenadeType[]>(['smoke', 'flash', 'molotov', 'he'])
  const selectedSide = ref<TeamSide>('all')
  const selectedThrowType = ref<string>('all')
  const selectedSite = ref<string>('all')
  const searchQuery = ref<string>('')
  
  // Custom maps, uploaded radars, and custom callouts
  const customMaps = ref<MapInfo[]>([])
  const customRadarImages = ref<Record<string, string>>({}) // mapId -> dataURL or custom image URL
  const customCallouts = ref<Record<string, CalloutItem[]>>({}) // mapId -> custom callouts array

  // Radar Display Settings
  const radarOpacity = ref<number>(0.92)
  const radarMode = ref<'official' | 'blueprint' | 'hybrid'>('official') // Default to official CS2 radar!
  const isMapSettingsOpen = ref<boolean>(false)

  // Viewport & Overlays
  const zoomLevel = ref<number>(1)
  const panOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })
  const showCallouts = ref<boolean>(false) // OFF BY DEFAULT on main radar for clean CSNADES view!
  const showSiteMarkers = ref<boolean>(false) // Off by default to avoid duplicate red circles over official radar A/B markers
  const showTrajectories = ref<boolean>(true)
  const isTacticsMode = ref<boolean>(false)
  const isPlacementMode = ref<boolean>(false)
  const placementStep = ref<'origin' | 'landing'>('origin')
  const tempPlacement = ref<{ origin?: { x: number; y: number }; landing?: { x: number; y: number } }>({})

  // csnades.gg Style Selection State
  const selectedLandingSpotKey = ref<string | null>(null) // Selected target spot on radar
  const selectedOriginSpotKey = ref<string | null>(null)

  // Load from Storage
  function loadStorage() {
    try {
      const storedCustom = localStorage.getItem(CUSTOM_MAPS_KEY)
      if (storedCustom) customMaps.value = JSON.parse(storedCustom)

      const storedRadars = localStorage.getItem(CUSTOM_RADARS_KEY)
      if (storedRadars) customRadarImages.value = JSON.parse(storedRadars)

      const storedCallouts = localStorage.getItem(CUSTOM_CALLOUTS_KEY)
      if (storedCallouts) customCallouts.value = JSON.parse(storedCallouts)

      const storedSettings = localStorage.getItem(RADAR_SETTINGS_KEY)
      if (storedSettings) {
        const s = JSON.parse(storedSettings)
        if (s.radarOpacity !== undefined) radarOpacity.value = s.radarOpacity
        if (s.radarMode !== undefined) radarMode.value = s.radarMode
      }
    } catch (e) {
      console.error('Failed to load custom map storage', e)
    }
  }

  function saveStorage() {
    try {
      localStorage.setItem(CUSTOM_MAPS_KEY, JSON.stringify(customMaps.value))
      localStorage.setItem(CUSTOM_RADARS_KEY, JSON.stringify(customRadarImages.value))
      localStorage.setItem(CUSTOM_CALLOUTS_KEY, JSON.stringify(customCallouts.value))
      localStorage.setItem(RADAR_SETTINGS_KEY, JSON.stringify({
        radarOpacity: radarOpacity.value,
        radarMode: radarMode.value
      }))
    } catch (e) {
      console.error('Failed to save custom map storage', e)
    }
  }

  loadStorage()

  watch([customMaps, customRadarImages, customCallouts, radarOpacity, radarMode], () => {
    saveStorage()
  }, { deep: true })

  // All combined maps
  const availableMaps = computed<MapInfo[]>(() => {
    return [...MAPS_DATA, ...customMaps.value]
  })

  // Current active map
  const currentMap = computed<MapInfo>(() => {
    const base = availableMaps.value.find(m => m.id === currentMapId.value) || MAPS_DATA[0]
    const customImg = customRadarImages.value[base.id]
    if (customImg) {
      return {
        ...base,
        radarImage: customImg,
        customRadarImage: customImg
      }
    }
    return base
  })

  // Combined Callouts for current active map (Built-in + Custom)
  const currentMapCallouts = computed<CalloutItem[]>(() => {
    const baseCallouts = currentMap.value.callouts || []
    const custom = customCallouts.value[currentMapId.value] || []
    return [...baseCallouts, ...custom]
  })

  // Actions
  function setMap(mapId: string) {
    if (availableMaps.value.some(m => m.id === mapId)) {
      currentMapId.value = mapId
      selectedLandingSpotKey.value = null
      selectedOriginSpotKey.value = null
      resetZoom()
    }
  }

  function setCustomRadarImage(mapId: string, imageSrc: string) {
    customRadarImages.value[mapId] = imageSrc
  }

  function resetCustomRadarImage(mapId: string) {
    delete customRadarImages.value[mapId]
  }

  function addCustomMap(newMap: MapInfo) {
    const exists = customMaps.value.findIndex(m => m.id === newMap.id)
    if (exists >= 0) {
      customMaps.value[exists] = newMap
    } else {
      customMaps.value.push({ ...newMap, isCustom: true })
    }
    currentMapId.value = newMap.id
  }

  function deleteCustomMap(mapId: string) {
    customMaps.value = customMaps.value.filter(m => m.id !== mapId)
    delete customRadarImages.value[mapId]
    if (currentMapId.value === mapId) {
      currentMapId.value = 'mirage'
    }
  }

  // Callout Management Actions
  function addCustomCallout(mapId: string, callout: Omit<CalloutItem, 'id' | 'isCustom'>) {
    if (!customCallouts.value[mapId]) {
      customCallouts.value[mapId] = []
    }
    const newCallout: CalloutItem = {
      ...callout,
      id: `custom-callout-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      isCustom: true
    }
    customCallouts.value[mapId].push(newCallout)
    saveStorage()
    return newCallout
  }

  function deleteCustomCallout(mapId: string, calloutId: string) {
    if (customCallouts.value[mapId]) {
      customCallouts.value[mapId] = customCallouts.value[mapId].filter(c => c.id !== calloutId)
      saveStorage()
    }
  }

  function clearCustomCallouts(mapId: string) {
    customCallouts.value[mapId] = []
    saveStorage()
  }

  function toggleNadeType(type: GrenadeType) {
    const idx = selectedNadeTypes.value.indexOf(type)
    if (idx >= 0) {
      selectedNadeTypes.value.splice(idx, 1)
    } else {
      selectedNadeTypes.value.push(type)
    }
    selectedLandingSpotKey.value = null
  }

  function selectOnlyNadeType(type: GrenadeType) {
    if (selectedNadeTypes.value.length === 1 && selectedNadeTypes.value[0] === type) {
      selectedNadeTypes.value = ['smoke', 'flash', 'molotov', 'he', 'decoy']
    } else {
      selectedNadeTypes.value = [type]
    }
    selectedLandingSpotKey.value = null
  }

  function setSide(side: TeamSide) {
    selectedSide.value = side
    selectedLandingSpotKey.value = null
  }

  function setSite(site: string) {
    selectedSite.value = site
    selectedLandingSpotKey.value = null
  }

  function setThrowType(throwType: string) {
    selectedThrowType.value = throwType
    selectedLandingSpotKey.value = null
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function selectLandingSpot(spotKey: string | null) {
    if (selectedLandingSpotKey.value === spotKey) {
      selectedLandingSpotKey.value = null
      selectedOriginSpotKey.value = null
    } else {
      selectedLandingSpotKey.value = spotKey
      selectedOriginSpotKey.value = null
    }
  }

  function selectOriginSpot(originKey: string | null) {
    selectedOriginSpotKey.value = originKey
  }

  function resetFilters() {
    selectedNadeTypes.value = ['smoke', 'flash', 'molotov', 'he']
    selectedSide.value = 'all'
    selectedThrowType.value = 'all'
    selectedSite.value = 'all'
    searchQuery.value = ''
    selectedLandingSpotKey.value = null
    selectedOriginSpotKey.value = null
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
    customMaps,
    customRadarImages,
    customCallouts,
    currentMapCallouts,
    radarOpacity,
    radarMode,
    isMapSettingsOpen,
    selectedNadeTypes,
    selectedSide,
    selectedThrowType,
    selectedSite,
    searchQuery,
    zoomLevel,
    panOffset,
    showCallouts,
    showSiteMarkers,
    showTrajectories,
    isTacticsMode,
    isPlacementMode,
    placementStep,
    tempPlacement,
    selectedLandingSpotKey,
    selectedOriginSpotKey,
    setMap,
    setCustomRadarImage,
    resetCustomRadarImage,
    addCustomMap,
    deleteCustomMap,
    addCustomCallout,
    deleteCustomCallout,
    clearCustomCallouts,
    toggleNadeType,
    selectOnlyNadeType,
    setSide,
    setSite,
    setThrowType,
    setSearchQuery,
    selectLandingSpot,
    selectOriginSpot,
    resetFilters,
    resetZoom,
    startPlacement,
    cancelPlacement
  }
})
