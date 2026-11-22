import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { MAPS_DATA, deriveCalloutBox } from '../data/mapsData'
import type {
  CalloutBox,
  Coordinates,
  GrenadeType,
  MapInfo,
  RadarFloorId,
  TeamSide
} from '../types'

const CUSTOM_MAPS_KEY = 'cs2_stratbook_custom_maps'
const CUSTOM_RADARS_KEY = 'cs2_stratbook_custom_radars'
const RADAR_SETTINGS_KEY = 'cs2_stratbook_radar_settings'
const CUSTOM_CALLOUTS_KEY = 'cs2_stratbook_custom_callouts'

export type RadarSkin = 'simpleradar' | 'official' | 'blueprint'
export type CalloutMapMode = 'general' | 'personal' | 'combined'

export interface CalloutItem {
  id: string
  name: string
  site?: 'A' | 'B' | 'Mid' | 'Spawn' | 'Other' | string
  coords: { x: number; y: number }
  box?: CalloutBox
  polygon?: Coordinates[]
  shape?: 'pin' | 'box' | 'polygon'
  color?: string
  sources?: string[]
  isPersonal?: boolean
  isCustom?: boolean
  floor?: RadarFloorId
  description?: string
  commonNades?: string[]
  aliases?: string[]
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

  const calloutMapMode = ref<CalloutMapMode>('general')
  const showCalloutBoxes = ref<boolean>(true)
  const showCalloutPins = ref<boolean>(true)
  const selectedCalloutSource = ref<string>('all')

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
      if (storedCallouts) {
        const parsed = JSON.parse(storedCallouts) as Record<string, CalloutItem[]>
        const normalized: Record<string, CalloutItem[]> = {}
        for (const [mId, list] of Object.entries(parsed)) {
          if (Array.isArray(list)) {
            normalized[mId] = list.map((item) => ({
              ...item,
              isCustom: true,
              isPersonal: true,
              shape: item.shape ?? (item.box ? 'box' : 'pin'),
              sources: item.sources && item.sources.length > 0 ? item.sources : ['Personal']
            }))
          }
        }
        customCallouts.value = normalized
      }

      const storedSettings = localStorage.getItem(RADAR_SETTINGS_KEY)
      if (storedSettings) {
        const s = JSON.parse(storedSettings)
        if (s.radarOpacity !== undefined) radarOpacity.value = s.radarOpacity
        if (s.radarMode !== undefined) radarMode.value = s.radarMode
        if (s.radarSkin !== undefined) radarSkin.value = s.radarSkin
        if (s.calloutMapMode !== undefined) calloutMapMode.value = s.calloutMapMode
        if (s.showCalloutBoxes !== undefined) showCalloutBoxes.value = s.showCalloutBoxes
        if (s.showCalloutPins !== undefined) showCalloutPins.value = s.showCalloutPins
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
          radarSkin: radarSkin.value,
          calloutMapMode: calloutMapMode.value,
          showCalloutBoxes: showCalloutBoxes.value,
          showCalloutPins: showCalloutPins.value
        })
      )
    } catch (e) {
      console.error('Failed to save custom map storage', e)
    }
  }

  loadStorage()

  watch(
    [
      customMaps,
      customRadarImages,
      customCallouts,
      radarOpacity,
      radarMode,
      radarSkin,
      calloutMapMode,
      showCalloutBoxes,
      showCalloutPins
    ],
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

  const generalMapCallouts = computed<CalloutItem[]>(() => {
    return (currentMap.value.callouts || []).map((c) => ({
      ...c,
      box: c.box ?? deriveCalloutBox(c.coords, c.site, c.name),
      shape: c.shape ?? 'box',
      isCustom: false,
      isPersonal: false
    }))
  })

  const personalMapCallouts = computed<CalloutItem[]>(() => {
    return (customCallouts.value[currentMapId.value] || []).map((c) => ({
      ...c,
      isCustom: true,
      isPersonal: true,
      shape: c.shape ?? (c.box ? 'box' : 'pin'),
      sources: c.sources && c.sources.length > 0 ? c.sources : ['Personal']
    }))
  })

  const currentMapCallouts = computed<CalloutItem[]>(() => {
    return [...generalMapCallouts.value, ...personalMapCallouts.value]
  })

  function setMap(mapId: string) {
    if (availableMaps.value.some((m) => m.id === mapId)) {
      currentMapId.value = mapId
      selectedLandingSpotKey.value = null
      selectedOriginSpotKey.value = null
      resetZoom()
    }
  }

  function setCalloutMapMode(mode: CalloutMapMode) {
    calloutMapMode.value = mode
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
    const shape = callout.shape ?? (callout.box ? 'box' : 'pin')
    const box =
      shape === 'box'
        ? callout.box ?? deriveCalloutBox(callout.coords, callout.site, callout.name)
        : callout.box

    const newCallout: CalloutItem = {
      ...callout,
      id: `custom-callout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      shape,
      ...(box ? { box } : {}),
      color: callout.color ?? '#10b981',
      sources: callout.sources && callout.sources.length > 0 ? callout.sources : ['Personal'],
      isCustom: true,
      isPersonal: true
    }
    customCallouts.value[mapId].push(newCallout)
    saveStorage()
    return newCallout
  }

  function updateCustomCallout(
    mapId: string,
    calloutId: string,
    updates: Partial<Omit<CalloutItem, 'id'>>
  ): CalloutItem | null {
    const list = customCallouts.value[mapId]
    if (!list) return null
    const idx = list.findIndex((c) => c.id === calloutId)
    if (idx < 0) return null
    const updated: CalloutItem = {
      ...list[idx]!,
      ...updates,
      id: calloutId,
      isCustom: true,
      isPersonal: true
    }
    list[idx] = updated
    saveStorage()
    return updated
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

  function exportPersonalCalloutsJSON(mapId: string = currentMapId.value): string {
    const targetMap = getMapById(mapId)
    const calloutsForMap = customCallouts.value[mapId] || []
    const payload = {
      version: 1,
      type: 'cs2-personal-callouts-map',
      mapId,
      mapName: targetMap.name,
      exportedAt: new Date().toISOString(),
      count: calloutsForMap.length,
      callouts: calloutsForMap
    }
    return JSON.stringify(payload, null, 2)
  }

  function exportPersonalCalloutsShareCode(mapId: string = currentMapId.value): string {
    const json = exportPersonalCalloutsJSON(mapId)
    try {
      const encoded = btoa(encodeURIComponent(json))
      return `CS2CALLOUTS1:${encoded}`
    } catch {
      return json
    }
  }

  function importPersonalCalloutsJSON(
    rawPayload: string,
    fallbackMapId: string = currentMapId.value
  ): { success: boolean; count: number; mapId: string; message: string } {
    const trimmed = (rawPayload || '').trim()
    if (!trimmed) {
      return {
        success: false,
        count: 0,
        mapId: fallbackMapId,
        message: 'Paste a shared Personal Callouts JSON or share code first.'
      }
    }

    try {
      let jsonStr = trimmed
      if (trimmed.startsWith('CS2CALLOUTS1:')) {
        const b64 = trimmed.slice('CS2CALLOUTS1:'.length).trim()
        jsonStr = decodeURIComponent(atob(b64))
      } else if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        try {
          jsonStr = decodeURIComponent(atob(trimmed))
        } catch {
          jsonStr = atob(trimmed)
        }
      }

      const parsed = JSON.parse(jsonStr)
      let targetMapId = fallbackMapId
      let incomingList: CalloutItem[] = []

      if (Array.isArray(parsed)) {
        incomingList = parsed
      } else if (parsed && typeof parsed === 'object') {
        if (typeof parsed.mapId === 'string' && availableMaps.value.some((m) => m.id === parsed.mapId)) {
          targetMapId = parsed.mapId
        }
        if (Array.isArray(parsed.callouts)) {
          incomingList = parsed.callouts
        } else if (parsed.customCallouts && typeof parsed.customCallouts === 'object') {
          const mapList = parsed.customCallouts[targetMapId]
          if (Array.isArray(mapList)) incomingList = mapList
        }
      }

      const validItems: CalloutItem[] = incomingList
        .filter(
          (item) =>
            item &&
            typeof item.name === 'string' &&
            item.name.trim().length > 0 &&
            item.coords &&
            Number.isFinite(Number(item.coords.x)) &&
            Number.isFinite(Number(item.coords.y))
        )
        .map((item, idx) => {
          const cx = Math.max(4, Math.min(96, Number(Number(item.coords.x).toFixed(2))))
          const cy = Math.max(4, Math.min(96, Number(Number(item.coords.y).toFixed(2))))
          const hasBox =
            item.box &&
            Number.isFinite(Number(item.box.x)) &&
            Number.isFinite(Number(item.box.y)) &&
            Number.isFinite(Number(item.box.width)) &&
            Number.isFinite(Number(item.box.height))
          const box: CalloutBox | undefined = hasBox
            ? {
                x: Math.max(2, Math.min(94, Number(Number(item.box!.x).toFixed(1)))),
                y: Math.max(2, Math.min(94, Number(Number(item.box!.y).toFixed(1)))),
                width: Math.max(3, Math.min(45, Number(Number(item.box!.width).toFixed(1)))),
                height: Math.max(3, Math.min(45, Number(Number(item.box!.height).toFixed(1))))
              }
            : item.shape === 'box'
              ? deriveCalloutBox({ x: cx, y: cy }, item.site, item.name)
              : undefined

          return {
            id:
              typeof item.id === 'string' && item.id.trim()
                ? item.id
                : `shared-callout-${Date.now()}-${idx}`,
            name: item.name.trim(),
            site: item.site || 'Mid',
            coords: { x: cx, y: cy },
            ...(box ? { box } : {}),
            shape: item.shape ?? (box ? 'box' : 'pin'),
            color: item.color || '#10b981',
            sources:
              Array.isArray(item.sources) && item.sources.length > 0
                ? item.sources
                : ['Personal', 'Shared Team Map'],
            aliases: Array.isArray(item.aliases) ? item.aliases : [],
            commonNades: Array.isArray(item.commonNades) ? item.commonNades : [],
            ...(item.floor ? { floor: item.floor } : {}),
            ...(item.description ? { description: item.description } : {}),
            isCustom: true,
            isPersonal: true
          }
        })

      if (validItems.length === 0) {
        return {
          success: false,
          count: 0,
          mapId: targetMapId,
          message: 'No valid callouts or zone boxes found in the payload.'
        }
      }

      if (!customCallouts.value[targetMapId]) {
        customCallouts.value[targetMapId] = []
      }

      const existing = [...customCallouts.value[targetMapId]]
      for (const item of validItems) {
        const dupIdx = existing.findIndex(
          (e) =>
            e.id === item.id ||
            (e.name.toLowerCase() === item.name.toLowerCase() &&
              Math.hypot(e.coords.x - item.coords.x, e.coords.y - item.coords.y) < 2)
        )
        if (dupIdx >= 0) {
          existing[dupIdx] = item
        } else {
          existing.push(item)
        }
      }
      customCallouts.value[targetMapId] = existing
      if (currentMapId.value !== targetMapId) {
        currentMapId.value = targetMapId
      }
      if (calloutMapMode.value === 'general') {
        calloutMapMode.value = 'personal'
      }
      saveStorage()

      return {
        success: true,
        count: validItems.length,
        mapId: targetMapId,
        message: `Imported ${validItems.length} personal callout${validItems.length === 1 ? '' : 's'} onto ${getMapById(targetMapId).name}.`
      }
    } catch {
      return {
        success: false,
        count: 0,
        mapId: fallbackMapId,
        message: 'Invalid Personal Callouts JSON or share code format.'
      }
    }
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
    generalMapCallouts,
    personalMapCallouts,
    currentMapCallouts,
    calloutMapMode,
    showCalloutBoxes,
    showCalloutPins,
    selectedCalloutSource,
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
    setCalloutMapMode,
    setCustomRadarImage,
    resetCustomRadarImage,
    addCustomMap,
    deleteCustomMap,
    addCustomCallout,
    updateCustomCallout,
    deleteCustomCallout,
    clearCustomCallouts,
    exportPersonalCalloutsJSON,
    exportPersonalCalloutsShareCode,
    importPersonalCalloutsJSON,
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
