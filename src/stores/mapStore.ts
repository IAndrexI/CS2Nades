import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { MAPS_DATA } from '../data/mapsData'
import type { GrenadeType, TeamSide, MapInfo } from '../types'

const CUSTOM_MAPS_KEY = 'cs2_stratbook_custom_maps'
const CUSTOM_RADARS_KEY = 'cs2_stratbook_custom_radars'
const RADAR_SETTINGS_KEY = 'cs2_stratbook_radar_settings'
const CUSTOM_CALLOUTS_KEY = 'cs2_stratbook_custom_callouts'

export type RadarSkin = 'simpleradar' | 'official' | 'blueprint'

export interface CalloutItem {
  id: string
  name: string
  site?: string
  coords: { x: number; y: number }
  isCustom?: boolean
}

export const useMapStore = defineStore('map', () => {
  const currentMapId = ref<string>('mirage')
  const selectedNadeTypes = ref<GrenadeType[]>(['smoke', 'flash', 'molotov', 'he'])
  const selectedSide = ref<TeamSide>('all')
  const selectedTeam = ref<string>('all')
  const surfaceLevel = ref<'all' | 'upper' | 'lower'>('all')
  const selectedThrowType = ref<string>('all')
  const selectedSite = ref<string>('all')
  const searchQuery = ref<string>('')

  const customMaps = ref<MapInfo[]>([])
  const customRadarImages = ref<Record<string, string>>({})
  const customCallouts = ref<Record<string, CalloutItem[]>>({})

  const radarOpacity = ref<number>(0.95)
  const radarMode = ref<'official' | 'blueprint' | 'hybrid'>('official')
  const radarSkin = ref<RadarSkin>('simpleradar')
  const isMapSettingsOpen = ref<boolean>(false)

  const zoomLevel = ref<number>(1)
  const panOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })
  const showCallouts = ref<boolean>(false)
  const showSiteMarkers = ref<boolean>(false)
  const showTrajectories = ref<boolean>(true)
  const showLabels = ref<boolean>(false)
  const clusterTargets = ref<boolean>(true)
  const showActivePoolOnly = ref<boolean>(false)

  const isTacticsMode = ref<boolean>(false)
  const isPlacementMode = ref<boolean>(false)
  const placementStep = ref<'origin' | 'landing'>('origin')
  const tempPlacement = ref<{ origin?: { x: number; y: number }; landing?: { x: number; y: number } }>({})

  const selectedLandingSpotKey = ref<string | null>(null)
  const selectedOriginSpotKey = ref<string | null>(null)

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
        if (s.radarSkin !== undefined) radarSkin.value = s.radarSkin
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
      localStorage.setItem(
        RADAR_SETTINGS_KEY,
        JSON.stringify({
          radarOpacity: radarOpacity.value,
          radarMode: radarMode.value,
          radarSkin: radarSkin.value
        })
      )
    } catch (e) {
      console.error('Failed to save custom map storage', e)
    }
  }

  loadStorage()

  watch(
    [customMaps, customRadarImages, customCallouts, radarOpacity, radarMode, radarSkin],
    () => {
      saveStorage()
    },
    { deep: true }
  )

  const availableMaps = computed<MapInfo[]>(() => {
    return [...MAPS_DATA, ...customMaps.value]
  })

  const maps = availableMaps

  const displayedMaps = computed<MapInfo[]>(() => {
    if (!showActivePoolOnly.value) return availableMaps.value
    return availableMaps.value.filter((m) => m.activePool)
  })

  const currentMap = computed<MapInfo>(() => {
    const base = availableMaps.value.find((m) => m.id === currentMapId.value) ?? MAPS_DATA[0]!
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

  function getMapById(id: string): MapInfo {
    const base = availableMaps.value.find((m) => m.id === id) ?? MAPS_DATA[0]!
    const customImg = customRadarImages.value[base.id]
    if (customImg) {
      return { ...base, radarImage: customImg, customRadarImage: customImg }
    }
    return base
  }

  const currentMapCallouts = computed<CalloutItem[]>(() => {
    const baseCallouts = currentMap.value.callouts || []
    const custom = customCallouts.value[currentMapId.value] || []
    return [...baseCallouts, ...custom]
  })

  function setMap(mapId: string) {
    if (availableMaps.value.some((m) => m.id === mapId)) {
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
    const exists = customMaps.value.findIndex((m) => m.id === newMap.id)
    if (exists >= 0) {
      customMaps.value[exists] = newMap
    } else {
      customMaps.value.push({ ...newMap, isCustom: true })
    }
    currentMapId.value = newMap.id
  }

  function deleteCustomMap(mapId: string) {
    customMaps.value = customMaps.value.filter((m) => m.id !== mapId)
    delete customRadarImages.value[mapId]
    if (currentMapId.value === mapId) {
      currentMapId.value = 'mirage'
    }
  }

  function addCustomCallout(mapId: string, callout: Omit<CalloutItem, 'id' | 'isCustom'>) {
    if (!customCallouts.value[mapId]) {
      customCallouts.value[mapId] = []
    }
    const newCallout: CalloutItem = {
      ...callout,
      id: `custom-callout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      isCustom: true
    }
    customCallouts.value[mapId].push(newCallout)
    saveStorage()
    return newCallout
  }

  function deleteCustomCallout(mapId: string, calloutId: string) {
    if (customCallouts.value[mapId]) {
      customCallouts.value[mapId] = customCallouts.value[mapId].filter((c) => c.id !== calloutId)
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
    selectedTeam.value = side
    selectedLandingSpotKey.value = null
  }

  function setTeam(team: string) {
    selectedTeam.value = team
    if (team === 't' || team === 'ct' || team === 'all') {
      selectedSide.value = team as TeamSide
    }
    selectedLandingSpotKey.value = null
  }

  function setSurfaceLevel(level: 'all' | 'upper' | 'lower') {
    surfaceLevel.value = level
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
    maps,
    displayedMaps,
    showActivePoolOnly,
    customMaps,
    customRadarImages,
    customCallouts,
    currentMapCallouts,
    radarOpacity,
    radarMode,
    radarSkin,
    isMapSettingsOpen,
    selectedNadeTypes,
    selectedSide,
    selectedTeam,
    surfaceLevel,
    selectedThrowType,
    selectedSite,
    searchQuery,
    zoomLevel,
    panOffset,
    showCallouts,
    showSiteMarkers,
    showTrajectories,
    showLabels,
    clusterTargets,
    isTacticsMode,
    isPlacementMode,
    placementStep,
    tempPlacement,
    selectedLandingSpotKey,
    selectedOriginSpotKey,
    getMapById,
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
    setTeam,
    setSurfaceLevel,
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
