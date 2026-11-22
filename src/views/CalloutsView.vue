<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMapStore, type CalloutItem, type CalloutMapMode } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import { CALLOUT_REFERENCE_SOURCES, deriveCalloutBox } from '../data/mapsData'
import VectorMapBlueprint from '../components/map/VectorMapBlueprint.vue'
import {
  clientToSvgRadarPct,
  radarToWorldCoords
} from '../core/radar/coordinateEngine'
import {
  isPointInMapBounds,
  snapPointToMapBounds,
  getMapSwitchConsoleCommand,
  getLineupSetupConsoleCommand
} from '../core/radar/mapBounds'
import {
  computeMapCalloutZones,
  clipBoxToMapPolygon,
  type ComputedCalloutZone
} from '../core/radar/calloutPolygons'
import type { CalloutBox, GrenadeType, Lineup, Point2D, RadarFloorId } from '../types'
import {
  Layers,
  Plus,
  Search,
  Trash2,
  MapPin,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Crosshair,
  RotateCcw,
  Terminal,
  Copy,
  Navigation,
  AlertTriangle,
  ShieldCheck,
  Target,
  MousePointer,
  Square,
  Share2,
  Upload,
  Download,
  ExternalLink,
  Eye,
  Edit3,
  BookOpen,
  UserCheck,
  Hexagon
} from 'lucide-vue-next'

type CalloutEntry = CalloutItem & {
  floor?: RadarFloorId
  aliases?: string[]
  commonNades?: string[]
}

type CanvasToolMode = 'select' | 'draw_box' | 'draw_polygon' | 'place_pin'
type LayerVisibilityMode = 'both' | 'boxes' | 'pins'

const PERSONAL_COLOR_PALETTE = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Sky Blue', value: '#38bdf8' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Cyan', value: '#22d3ee' }
] as const

const router = useRouter()
const mapStore = useMapStore()
const lineupStore = useLineupStore()
const { confirmAction } = useConfirmDialog()

const searchQuery = ref('')
const siteFilter = ref<'all' | 'A' | 'B' | 'Mid' | 'Spawn'>('all')
const sourceFilter = ref<string>('all')

// In-Map Floating Canvas Tool State
const activeTool = ref<CanvasToolMode>('select')
const layerVisibility = ref<LayerVisibilityMode>('both')

// New / Editing Personal Callout or Box State
const draftCoords = ref<Point2D | null>(null)
const draftBox = ref<CalloutBox | null>(null)
const draftPolygon = ref<Point2D[] | null>(null)
const draftShape = ref<'box' | 'polygon' | 'pin'>('box')
const draftName = ref('')
const draftSite = ref<'A' | 'B' | 'Mid' | 'Spawn' | 'Other'>('Mid')
const draftColor = ref<string>('#10b981')
const draftAliases = ref('')
const editingCalloutId = ref<string | null>(null)
const snapWarningMessage = ref('')

// Box Dragging & Polygon Drawing State on Radar Canvas
const isDrawingBox = ref(false)
const boxDragStart = ref<Point2D | null>(null)
const boxDragCurrent = ref<Point2D | null>(null)
const polygonVertices = ref<Point2D[]>([])

// Share & Import Modal State
const isShareModalOpen = ref(false)
const shareTab = ref<'share' | 'import'>('share')
const importPayloadText = ref('')
const importFeedback = ref<{ success: boolean; message: string } | null>(null)

const selectedCalloutId = ref<string | null>(null)
const hoveredCalloutId = ref<string | null>(null)

// Zoom & Pan State
const svgElement = ref<SVGSVGElement | null>(null)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const didDrag = ref(false)

// Live Cursor State
const cursorPct = ref<Point2D | null>(null)

// Clipboard Copy Feedback State
const copiedKey = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

function triggerCopiedFeedback(key: string) {
  copiedKey.value = key
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copiedKey.value = null
  }, 2200)
}

async function copyToClipboard(text: string, feedbackKey: string) {
  try {
    await navigator.clipboard.writeText(text)
    triggerCopiedFeedback(feedbackKey)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    triggerCopiedFeedback(feedbackKey)
  }
}

const activeDutyMaps = computed(() =>
  mapStore.availableMaps.filter((m) => m.activePool)
)
const reserveAndClassicMaps = computed(() =>
  mapStore.availableMaps.filter((m) => !m.activePool)
)

const cs2FlowMapUrl = computed(() => {
  const slugMap: Record<string, string> = {
    dust2: 'dust_2',
    mirage: 'mirage',
    inferno: 'inferno',
    nuke: 'nuke',
    ancient: 'ancient',
    anubis: 'anubis',
    cache: 'cache',
    train: 'train',
    vertigo: 'vertigo',
    overpass: 'overpass',
    cobblestone: 'cobblestone'
  }
  const slug = slugMap[mapStore.currentMapId] || 'dust_2'
  return `https://cs2flow.com/maps/${slug}`
})

const hasFloors = computed(() =>
  Boolean(mapStore.currentMap.radarFloors && mapStore.currentMap.radarFloors.length > 0)
)

const activeFloor = computed<RadarFloorId>({
  get: () => (hasFloors.value ? lineupStore.activeFloorId : 'upper'),
  set: (val: RadarFloorId) => {
    lineupStore.activeFloorId = val
  }
})

const effectiveFloorParam = computed<RadarFloorId | undefined>(() =>
  hasFloors.value ? activeFloor.value : undefined
)

const inversePinScale = computed(() => Number((1 / Math.pow(zoom.value, 0.78)).toFixed(3)))

function getDefaultZForCurrentMap(floor?: RadarFloorId): number {
  const id = mapStore.currentMapId
  if (id === 'nuke') return floor === 'lower' ? -640 : -380
  if (id === 'vertigo') return floor === 'lower' ? 11520 : 11750
  if (id === 'mirage') return -160
  if (id === 'inferno') return 128
  if (id === 'ancient') return 100
  if (id === 'anubis') return 50
  if (id === 'overpass') return 250
  return 0
}

const cursorWorld = computed(() => {
  if (!cursorPct.value) return null
  return radarToWorldCoords(
    mapStore.currentMapId,
    cursorPct.value,
    getDefaultZForCurrentMap(effectiveFloorParam.value)
  )
})

const cursorInBounds = computed(() => {
  if (!cursorPct.value) return true
  return isPointInMapBounds(mapStore.currentMapId, cursorPct.value, effectiveFloorParam.value)
})

const modeCalloutsForMap = computed<CalloutEntry[]>(() => {
  const mode = mapStore.calloutMapMode
  if (mode === 'general') {
    return mapStore.generalMapCallouts as CalloutEntry[]
  }
  if (mode === 'personal') {
    return mapStore.personalMapCallouts as CalloutEntry[]
  }
  return mapStore.currentMapCallouts as CalloutEntry[]
})

const filteredCallouts = computed<CalloutEntry[]>(() => {
  return modeCalloutsForMap.value.filter((c) => {
    if (hasFloors.value && c.floor && c.floor !== activeFloor.value) {
      return false
    }
    if (siteFilter.value !== 'all') {
      if ((c.site || '').toLowerCase() !== siteFilter.value.toLowerCase()) {
        return false
      }
    }
    if (sourceFilter.value !== 'all') {
      if (sourceFilter.value === 'Personal') {
        if (!c.isCustom && !c.isPersonal) return false
      } else {
        const srcs = c.sources || []
        if (!srcs.some((s) => s.toLowerCase() === sourceFilter.value.toLowerCase())) {
          return false
        }
      }
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const inName = c.name.toLowerCase().includes(q)
      const inSite = (c.site || '').toLowerCase().includes(q)
      const inAliases = (c.aliases || []).some((a) => a.toLowerCase().includes(q))
      const inSources = (c.sources || []).some((s) => s.toLowerCase().includes(q))
      if (!inName && !inSite && !inAliases && !inSources) return false
    }
    return true
  })
})

const customCalloutCount = computed(() => {
  return (mapStore.customCallouts[mapStore.currentMapId] || []).length
})

const generalCalloutCount = computed(() => {
  return mapStore.generalMapCallouts.filter((c) =>
    hasFloors.value && c.floor ? c.floor === activeFloor.value : true
  ).length
})

const selectedCallout = computed<CalloutEntry | null>(() => {
  if (!selectedCalloutId.value) return null
  return (
    filteredCallouts.value.find((c) => c.id === selectedCalloutId.value) ??
    (mapStore.currentMapCallouts as CalloutEntry[]).find((c) => c.id === selectedCalloutId.value) ??
    null
  )
})

const hoveredCallout = computed<CalloutEntry | null>(() => {
  if (!hoveredCalloutId.value) return null
  return filteredCallouts.value.find((c) => c.id === hoveredCalloutId.value) ?? null
})

const computedZonesMap = computed<Map<string, ComputedCalloutZone>>(() => {
  return computeMapCalloutZones(
    mapStore.currentMapId,
    filteredCallouts.value,
    effectiveFloorParam.value
  )
})

const showBoxesLayer = computed(
  () => layerVisibility.value === 'both' || layerVisibility.value === 'boxes'
)
const showPinsLayer = computed(
  () => layerVisibility.value === 'both' || layerVisibility.value === 'pins'
)

function cycleLayerVisibility() {
  if (layerVisibility.value === 'both') layerVisibility.value = 'boxes'
  else if (layerVisibility.value === 'boxes') layerVisibility.value = 'pins'
  else layerVisibility.value = 'both'
}

const layerVisibilityLabel = computed(() => {
  if (layerVisibility.value === 'both') return 'Boxes + Pins'
  if (layerVisibility.value === 'boxes') return 'Boxes Only'
  return 'Pins Only'
})

function getEffectiveBox(callout: CalloutEntry): CalloutBox | null {
  if (callout.shape === 'pin' && !callout.box) return null
  return callout.box ?? deriveCalloutBox(callout.coords, callout.site, callout.name)
}

const liveDragPreviewBox = computed<CalloutBox | null>(() => {
  if (!isDrawingBox.value || !boxDragStart.value || !boxDragCurrent.value) return null
  const x1 = Math.min(boxDragStart.value.x, boxDragCurrent.value.x)
  const y1 = Math.min(boxDragStart.value.y, boxDragCurrent.value.y)
  const x2 = Math.max(boxDragStart.value.x, boxDragCurrent.value.x)
  const y2 = Math.max(boxDragStart.value.y, boxDragCurrent.value.y)
  return {
    x: Number(x1.toFixed(1)),
    y: Number(y1.toFixed(1)),
    width: Number(Math.max(2.5, x2 - x1).toFixed(1)),
    height: Number(Math.max(2.5, y2 - y1).toFixed(1))
  }
})

watch(
  () => [mapStore.currentMapId, activeFloor.value],
  () => {
    resetView()
    handleCancelDraft()
    if (
      selectedCalloutId.value &&
      !filteredCallouts.value.some((c) => c.id === selectedCalloutId.value)
    ) {
      selectedCalloutId.value = null
    }
  }
)

function setCalloutViewMode(mode: CalloutMapMode) {
  mapStore.setCalloutMapMode(mode)
  if (mode === 'personal' && sourceFilter.value !== 'all' && sourceFilter.value !== 'Personal') {
    sourceFilter.value = 'all'
  }
}

function setTool(tool: CanvasToolMode) {
  if (activeTool.value === tool && tool !== 'select') {
    activeTool.value = 'select'
    handleCancelDraft()
    return
  }
  activeTool.value = tool
  editingCalloutId.value = null
  draftCoords.value = null
  draftBox.value = null
  snapWarningMessage.value = ''
  if (tool === 'draw_box') {
    draftShape.value = 'box'
  } else if (tool === 'place_pin') {
    draftShape.value = 'pin'
  }
}

function doesLineupMatchCallout(
  lineup: Lineup,
  callout: CalloutEntry
): { matched: boolean; role: 'origin' | 'landing' | 'both' | null } {
  if (lineup.mapId !== mapStore.currentMapId) return { matched: false, role: null }
  if (hasFloors.value && callout.floor && lineup.radarFloor && lineup.radarFloor !== callout.floor) {
    return { matched: false, role: null }
  }

  const originDist = Math.hypot(
    lineup.originCoords.x - callout.coords.x,
    lineup.originCoords.y - callout.coords.y
  )
  const landingDist = Math.hypot(
    lineup.landingCoords.x - callout.coords.x,
    lineup.landingCoords.y - callout.coords.y
  )

  const nameTokens = [callout.name, ...(callout.aliases || [])]
    .flatMap((s) => s.toLowerCase().split(/[\/(),]+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)

  const startLower = (lineup.startLocation || '').toLowerCase()
  const endLower = (lineup.endLocation || '').toLowerCase()
  const titleLower = (lineup.title || '').toLowerCase()

  const matchesOriginName = nameTokens.some((tok) => startLower.includes(tok))
  const matchesLandingName = nameTokens.some(
    (tok) => endLower.includes(tok) || titleLower.includes(tok)
  )

  const isOrigin = originDist <= 10 || matchesOriginName
  const isLanding = landingDist <= 10 || matchesLandingName

  if (isOrigin && isLanding) return { matched: true, role: 'both' }
  if (isOrigin) return { matched: true, role: 'origin' }
  if (isLanding) return { matched: true, role: 'landing' }
  return { matched: false, role: null }
}

function getLineupCountForCallout(callout: CalloutEntry): number {
  let count = 0
  for (const lineup of lineupStore.allLineups) {
    if (doesLineupMatchCallout(lineup, callout).matched) count++
  }
  return count
}

const matchingLineups = computed(() => {
  const callout = selectedCallout.value
  if (!callout) return []
  const out: { lineup: Lineup; role: 'origin' | 'landing' | 'both' }[] = []
  for (const lineup of lineupStore.allLineups) {
    const res = doesLineupMatchCallout(lineup, callout)
    if (res.matched && res.role) {
      out.push({ lineup, role: res.role })
    }
  }
  return out
})

function handleZoomIn() {
  zoom.value = Math.min(Number((zoom.value + 0.35).toFixed(2)), 4.0)
}

function handleZoomOut() {
  zoom.value = Math.max(Number((zoom.value - 0.35).toFixed(2)), 1.0)
  if (zoom.value <= 1) {
    zoom.value = 1
    pan.value = { x: 0, y: 0 }
  }
}

function resetView() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) handleZoomIn()
  else handleZoomOut()
}

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  didDrag.value = false

  if (activeTool.value === 'draw_box' && svgElement.value) {
    const rawPt = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
    if (!rawPt) return
    const snapped = snapPointToMapBounds(
      mapStore.currentMapId,
      rawPt,
      effectiveFloorParam.value
    )
    isDrawingBox.value = true
    boxDragStart.value = { x: snapped.x, y: snapped.y }
    boxDragCurrent.value = { x: snapped.x, y: snapped.y }
    return
  }

  if (activeTool.value === 'place_pin') return

  isPanning.value = true
  panStart.value = { x: e.clientX - pan.value.x, y: e.clientY - pan.value.y }
}

function handleMouseMove(e: MouseEvent) {
  if (svgElement.value) {
    cursorPct.value = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
  }

  if (isDrawingBox.value && cursorPct.value) {
    const clampedX = Math.max(3, Math.min(97, cursorPct.value.x))
    const clampedY = Math.max(3, Math.min(97, cursorPct.value.y))
    boxDragCurrent.value = { x: clampedX, y: clampedY }
    if (
      boxDragStart.value &&
      Math.hypot(clampedX - boxDragStart.value.x, clampedY - boxDragStart.value.y) > 1.5
    ) {
      didDrag.value = true
    }
    return
  }

  if (!isPanning.value) return
  const nextX = e.clientX - panStart.value.x
  const nextY = e.clientY - panStart.value.y
  if (Math.hypot(nextX - pan.value.x, nextY - pan.value.y) > 4) {
    didDrag.value = true
  }
  const limit = 340 * Math.max(0.2, zoom.value - 1)
  pan.value = {
    x: Math.max(-limit, Math.min(limit, nextX)),
    y: Math.max(-limit, Math.min(limit, nextY))
  }
}

function handleMouseUp() {
  if (isDrawingBox.value && boxDragStart.value && boxDragCurrent.value) {
    const rawMinX = Math.min(boxDragStart.value.x, boxDragCurrent.value.x)
    const rawMinY = Math.min(boxDragStart.value.y, boxDragCurrent.value.y)
    const rawMaxX = Math.max(boxDragStart.value.x, boxDragCurrent.value.x)
    const rawMaxY = Math.max(boxDragStart.value.y, boxDragCurrent.value.y)

    const spanW = rawMaxX - rawMinX
    const spanH = rawMaxY - rawMinY

    let finalBox: CalloutBox
    let centerPt: Point2D

    if (spanW < 2.2 && spanH < 2.2) {
      centerPt = { x: boxDragStart.value.x, y: boxDragStart.value.y }
      finalBox = deriveCalloutBox(centerPt, draftSite.value, draftName.value)
    } else {
      const width = Number(Math.max(4, Math.min(36, spanW)).toFixed(1))
      const height = Number(Math.max(3.5, Math.min(36, spanH)).toFixed(1))
      const rawCenter = {
        x: rawMinX + width / 2,
        y: rawMinY + height / 2
      }
      const snappedCenter = snapPointToMapBounds(
        mapStore.currentMapId,
        rawCenter,
        effectiveFloorParam.value
      )
      centerPt = { x: snappedCenter.x, y: snappedCenter.y }
      finalBox = {
        x: Number(Math.max(2, Math.min(98 - width, centerPt.x - width / 2)).toFixed(1)),
        y: Number(Math.max(2, Math.min(98 - height, centerPt.y - height / 2)).toFixed(1)),
        width,
        height
      }
      if (snappedCenter.wasOutOfBounds) {
        snapWarningMessage.value = `Snapped box center into playable bounds (${centerPt.x}%, ${centerPt.y}%).`
      } else {
        snapWarningMessage.value = ''
      }
    }

    draftShape.value = 'box'
    draftCoords.value = centerPt
    draftBox.value = finalBox
    draftPolygon.value = clipBoxToMapPolygon(
      mapStore.currentMapId,
      finalBox,
      effectiveFloorParam.value
    )
    isDrawingBox.value = false
    boxDragStart.value = null
    boxDragCurrent.value = null
    return
  }

  isPanning.value = false
}

function handleMouseLeave() {
  if (isDrawingBox.value) {
    handleMouseUp()
  }
  isPanning.value = false
  cursorPct.value = null
}

function finishPolygonDrawing() {
  if (polygonVertices.value.length < 3) return
  const pts = [...polygonVertices.value]
  let sumX = 0
  let sumY = 0
  for (const p of pts) {
    sumX += p.x
    sumY += p.y
  }
  const rawCenter = { x: sumX / pts.length, y: sumY / pts.length }
  const snapped = snapPointToMapBounds(
    mapStore.currentMapId,
    rawCenter,
    effectiveFloorParam.value
  )
  draftShape.value = 'polygon'
  draftCoords.value = { x: snapped.x, y: snapped.y }
  draftBox.value = null
  draftPolygon.value = pts
  polygonVertices.value = []
  snapWarningMessage.value = ''
}

function handleMapClick(e: MouseEvent) {
  if (didDrag.value || !svgElement.value) return

  if (activeTool.value === 'draw_polygon') {
    const rawPt = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
    if (!rawPt) return
    const snapped = snapPointToMapBounds(
      mapStore.currentMapId,
      rawPt,
      effectiveFloorParam.value
    )
    const pt = { x: snapped.x, y: snapped.y }
    if (polygonVertices.value.length >= 3) {
      const first = polygonVertices.value[0]!
      if (Math.hypot(pt.x - first.x, pt.y - first.y) <= 2.4) {
        finishPolygonDrawing()
        return
      }
    }
    polygonVertices.value.push(pt)
    return
  }

  if (activeTool.value !== 'place_pin') return

  const rawPt = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
  if (!rawPt) return

  const snapped = snapPointToMapBounds(
    mapStore.currentMapId,
    rawPt,
    effectiveFloorParam.value
  )
  draftShape.value = 'pin'
  draftCoords.value = { x: snapped.x, y: snapped.y }
  draftBox.value = null
  draftPolygon.value = null
  if (snapped.wasOutOfBounds) {
    snapWarningMessage.value = `Adjusted out-of-bounds click (${rawPt.x}%, ${rawPt.y}%) to nearest playable spot (${snapped.x}%, ${snapped.y}%).`
  } else {
    snapWarningMessage.value = ''
  }
}

function selectCallout(callout: CalloutEntry, e?: MouseEvent) {
  if (e) e.stopPropagation()
  if (activeTool.value !== 'select') return
  selectedCalloutId.value = selectedCalloutId.value === callout.id ? null : callout.id
}

function startEditPersonalCallout(callout: CalloutEntry, e?: MouseEvent) {
  if (e) e.stopPropagation()
  if (!callout.isCustom && !callout.isPersonal) return
  editingCalloutId.value = callout.id
  draftName.value = callout.name
  draftSite.value = (callout.site as 'A' | 'B' | 'Mid' | 'Spawn' | 'Other') || 'Mid'
  draftColor.value = callout.color || '#10b981'
  draftAliases.value = (callout.aliases || []).join(', ')
  draftShape.value = callout.shape === 'pin' ? 'pin' : 'box'
  draftCoords.value = { x: callout.coords.x, y: callout.coords.y }
  draftBox.value =
    callout.box ??
    (callout.shape !== 'pin'
      ? deriveCalloutBox(callout.coords, callout.site, callout.name)
      : null)
}

function updateDraftBoxDimension(field: 'width' | 'height', value: number) {
  if (!draftCoords.value) return
  const base =
    draftBox.value ?? deriveCalloutBox(draftCoords.value, draftSite.value, draftName.value)
  const w = field === 'width' ? value : base.width
  const h = field === 'height' ? value : base.height
  draftBox.value = {
    x: Number(Math.max(2, Math.min(98 - w, draftCoords.value.x - w / 2)).toFixed(1)),
    y: Number(Math.max(2, Math.min(98 - h, draftCoords.value.y - h / 2)).toFixed(1)),
    width: Number(w.toFixed(1)),
    height: Number(h.toFixed(1))
  }
}

function handleSaveDraftCallout() {
  if (!draftName.value.trim() || !draftCoords.value) return

  const snapped = snapPointToMapBounds(
    mapStore.currentMapId,
    draftCoords.value,
    effectiveFloorParam.value
  )

  const aliasesList = draftAliases.value
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  const boxToSave: CalloutBox | undefined =
    draftShape.value === 'box'
      ? draftBox.value
        ? {
            x: Number(
              Math.max(2, Math.min(98 - draftBox.value.width, snapped.x - draftBox.value.width / 2)).toFixed(1)
            ),
            y: Number(
              Math.max(2, Math.min(98 - draftBox.value.height, snapped.y - draftBox.value.height / 2)).toFixed(1)
            ),
            width: draftBox.value.width,
            height: draftBox.value.height
          }
        : deriveCalloutBox({ x: snapped.x, y: snapped.y }, draftSite.value, draftName.value)
      : undefined

  if (editingCalloutId.value) {
    const updated = mapStore.updateCustomCallout(mapStore.currentMapId, editingCalloutId.value, {
      name: draftName.value.trim(),
      site: draftSite.value,
      coords: { x: snapped.x, y: snapped.y },
      shape: draftShape.value,
      box: boxToSave,
      ...(draftPolygon.value ? { polygon: draftPolygon.value } : {}),
      color: draftColor.value,
      aliases: aliasesList,
      ...(hasFloors.value ? { floor: activeFloor.value } : {})
    })
    if (updated) {
      selectedCalloutId.value = updated.id
    }
  } else {
    const created = mapStore.addCustomCallout(mapStore.currentMapId, {
      name: draftName.value.trim(),
      site: draftSite.value,
      coords: { x: snapped.x, y: snapped.y },
      shape: draftShape.value,
      ...(boxToSave ? { box: boxToSave } : {}),
      ...(draftPolygon.value ? { polygon: draftPolygon.value } : {}),
      color: draftColor.value,
      aliases: aliasesList,
      sources: ['Personal'],
      isPersonal: true,
      ...(hasFloors.value ? { floor: activeFloor.value } : {})
    })
    selectedCalloutId.value = created.id
    if (mapStore.calloutMapMode === 'general') {
      mapStore.setCalloutMapMode('combined')
    }
  }

  handleCancelDraft()
  activeTool.value = 'select'
}

function handleCancelDraft() {
  draftCoords.value = null
  draftBox.value = null
  draftPolygon.value = null
  draftName.value = ''
  draftAliases.value = ''
  editingCalloutId.value = null
  snapWarningMessage.value = ''
  isDrawingBox.value = false
  boxDragStart.value = null
  boxDragCurrent.value = null
  polygonVertices.value = []
}

async function handleDeleteCallout(id: string, e?: MouseEvent) {
  if (e) e.stopPropagation()
  const ok = await confirmAction({
    title: 'Delete Personal Callout?',
    message: 'Are you sure you want to delete this personal callout or custom zone box?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    mapStore.deleteCustomCallout(mapStore.currentMapId, id)
    if (selectedCalloutId.value === id) {
      selectedCalloutId.value = null
    }
    if (editingCalloutId.value === id) {
      handleCancelDraft()
    }
  }
}

async function handleClearAllPersonal() {
  const ok = await confirmAction({
    title: 'Clear Personal Callouts Map?',
    message: `Are you sure you want to remove all ${customCalloutCount.value} personal callouts and boxes for ${mapStore.currentMap.name}?`,
    confirmLabel: 'Clear Personal Map',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    mapStore.clearCustomCallouts(mapStore.currentMapId)
    selectedCalloutId.value = null
    handleCancelDraft()
  }
}

function openShareModal(tab: 'share' | 'import' = 'share') {
  shareTab.value = tab
  importFeedback.value = null
  isShareModalOpen.value = true
}

function handleCopyShareCode() {
  const code = mapStore.exportPersonalCalloutsShareCode(mapStore.currentMapId)
  copyToClipboard(code, 'share-code')
}

function handleCopyShareJSON() {
  const json = mapStore.exportPersonalCalloutsJSON(mapStore.currentMapId)
  copyToClipboard(json, 'share-json')
}

function handleDownloadPersonalJSON() {
  const json = mapStore.exportPersonalCalloutsJSON(mapStore.currentMapId)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cs2-callouts-${mapStore.currentMapId}-personal.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  triggerCopiedFeedback('download-json')
}

function handleImportSharedMap() {
  const result = mapStore.importPersonalCalloutsJSON(
    importPayloadText.value,
    mapStore.currentMapId
  )
  importFeedback.value = {
    success: result.success,
    message: result.message
  }
  if (result.success) {
    importPayloadText.value = ''
  }
}

function handleImportFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      importPayloadText.value = reader.result
      handleImportSharedMap()
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function cloneConsensusToPersonal(callout: CalloutEntry) {
  const box = getEffectiveBox(callout)
  const created = mapStore.addCustomCallout(mapStore.currentMapId, {
    name: callout.name,
    site: callout.site || 'Mid',
    coords: { x: callout.coords.x, y: callout.coords.y },
    shape: 'box',
    ...(box ? { box: { ...box } } : {}),
    color: callout.color || '#10b981',
    aliases: [...(callout.aliases || [])],
    sources: ['Personal', ...(callout.sources || []).slice(0, 2)],
    isPersonal: true,
    ...(callout.floor ? { floor: callout.floor } : {})
  })
  mapStore.setCalloutMapMode('personal')
  selectedCalloutId.value = created.id
  triggerCopiedFeedback(`cloned-${callout.id}`)
}

function getCalloutSpotSetpos(callout: CalloutEntry): string {
  const world = radarToWorldCoords(
    mapStore.currentMapId,
    callout.coords,
    getDefaultZForCurrentMap(callout.floor ?? effectiveFloorParam.value)
  )
  return `setpos_exact ${world.x.toFixed(2)} ${world.y.toFixed(2)} ${world.z.toFixed(2)}; setang 0.00 0.00 0`
}

function copyMapPracticeCommand(mapId = mapStore.currentMapId, feedbackKey = 'map-practice') {
  const cmd = getMapSwitchConsoleCommand(mapId, true)
  copyToClipboard(cmd, feedbackKey)
}

function copyLineupSetupCommand(lineup: Lineup, feedbackKey: string) {
  const cmd = getLineupSetupConsoleCommand(lineup)
  copyToClipboard(cmd, feedbackKey)
}

function viewLineupOnRadar(lineup: Lineup) {
  if (mapStore.currentMapId !== lineup.mapId) {
    mapStore.setMap(lineup.mapId)
  }
  if (lineup.radarFloor === 'upper' || lineup.radarFloor === 'lower') {
    lineupStore.activeFloorId = lineup.radarFloor
  }
  lineupStore.selectLineup(lineup)
  router.push('/')
}

function getGrenadeBadgeClass(type: GrenadeType): string {
  switch (type) {
    case 'smoke':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30'
    case 'flash':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    case 'molotov':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30'
    case 'he':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    default:
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  }
}

function getCalloutAccentColor(callout: CalloutEntry): string {
  if (callout.color) return callout.color
  if (callout.isCustom || callout.isPersonal) return '#10b981'
  switch (callout.site) {
    case 'A':
      return '#38bdf8'
    case 'B':
      return '#f59e0b'
    case 'Mid':
      return '#a855f7'
    case 'Spawn':
      return '#10b981'
    default:
      return '#38bdf8'
  }
}

function getPinColors(callout: CalloutEntry) {
  const selected = selectedCalloutId.value === callout.id
  const accent = getCalloutAccentColor(callout)
  if (selected) {
    return { dot: '#f59e0b', stroke: '#f59e0b', text: '#fef3c7', bg: '#18140b' }
  }
  if (callout.isCustom || callout.isPersonal) {
    return { dot: accent, stroke: accent, text: '#ecfdf5', bg: '#071914' }
  }
  return { dot: accent, stroke: accent, text: '#f0f9ff', bg: '#0b101b' }
}

function getBadgeWidth(name: string): number {
  return Math.max(46, name.length * 6.2 + 14)
}
</script>

<template>
  <div class="callouts-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-fade-in">
    <!-- APPLE-STYLE TOP HEADER & SEGMENTED VIEW SWITCHER -->
    <div class="flex flex-col gap-4 p-5 bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="p-2.5 bg-sky-500/10 border border-sky-500/25 text-sky-400 rounded-xl">
            <Layers class="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-lg sm:text-xl font-semibold text-white tracking-tight">
                Interactive Callouts &amp; Zone Atlas
              </h1>
              <span
                :class="[
                  'px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
                  mapStore.currentMap.activePool
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800/90 text-slate-300 border-white/10'
                ]"
              >
                {{ mapStore.currentMap.name }} • {{ mapStore.currentMap.poolCategory || (mapStore.currentMap.activePool ? 'Active Duty' : 'Reserve Pool') }}
              </span>
              <span
                v-if="hasFloors"
                class="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium uppercase"
              >
                {{ activeFloor }} Layer
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              Compare CS2Journal &amp; CS2Flow shaded callout zones, build your Personal Callouts Map with custom boxes, and share with your roster
            </p>
          </div>
        </div>

        <!-- RIGHT ACTIONS: SHARE / IMPORT / PRACTICE CMD -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- FLOOR TOGGLE (NUKE & VERTIGO) -->
          <div
            v-if="hasFloors && mapStore.currentMap.radarFloors"
            class="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/[0.08]"
          >
            <button
              v-for="floor in mapStore.currentMap.radarFloors"
              :key="floor.id"
              @click="activeFloor = floor.id"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
                activeFloor === floor.id
                  ? 'bg-white text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              ]"
            >
              {{ floor.id === 'upper' ? 'Upper Floor' : 'Lower Floor' }}
            </button>
          </div>

          <button
            @click="copyMapPracticeCommand(mapStore.currentMapId, 'header-map-practice')"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/70 hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded-xl font-medium text-xs transition-colors cursor-pointer"
            title="Copy CS2 console command to load this map with practice grenade settings"
          >
            <Check v-if="copiedKey === 'header-map-practice'" class="w-3.5 h-3.5 text-emerald-400" />
            <Terminal v-else class="w-3.5 h-3.5 text-sky-400" />
            <span>{{ copiedKey === 'header-map-practice' ? 'Copied Practice CMD' : 'Practice CMD' }}</span>
          </button>

          <button
            @click="openShareModal('share')"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/70 hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded-xl font-medium text-xs transition-colors cursor-pointer"
          >
            <Share2 class="w-3.5 h-3.5 text-emerald-400" />
            <span>Share Map</span>
          </button>

          <button
            @click="openShareModal('import')"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/70 hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded-xl font-medium text-xs transition-colors cursor-pointer"
          >
            <Upload class="w-3.5 h-3.5 text-sky-400" />
            <span>Import Shared Map</span>
          </button>
        </div>
      </div>

      <!-- MAP PILL SELECTOR BAR (7 ACTIVE DUTY WITH CACHE + 4 RESERVE/CLASSIC WITH TRAIN) -->
      <div class="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/[0.06]">
        <span class="text-[11px] font-medium text-slate-400 mr-1">Active Duty (7):</span>
        <button
          v-for="map in activeDutyMaps"
          :key="map.id"
          @click="mapStore.setMap(map.id)"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
            mapStore.currentMapId === map.id
              ? 'bg-white text-slate-950 font-semibold shadow-sm'
              : 'bg-slate-950/60 text-slate-300 hover:text-white border border-white/[0.06]'
          ]"
        >
          {{ map.name }}
        </button>

        <span class="text-slate-700 mx-1">|</span>
        <span class="text-[11px] font-medium text-slate-400 mr-1">Reserve &amp; Classic (4):</span>
        <button
          v-for="map in reserveAndClassicMaps"
          :key="map.id"
          @click="mapStore.setMap(map.id)"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
            mapStore.currentMapId === map.id
              ? 'bg-white text-slate-950 font-semibold shadow-sm'
              : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/[0.06]'
          ]"
        >
          {{ map.name }}
        </button>
      </div>

      <!-- SEGMENTED VIEW SWITCHER + SOURCE REFERENCE FILTER & EXTERNAL REFERENCE LINKS -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
        <!-- Segmented Control: General vs Personal vs Combined -->
        <div class="inline-flex items-center p-1 bg-slate-950/90 border border-white/[0.08] rounded-xl">
          <button
            @click="setCalloutViewMode('general')"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
              mapStore.calloutMapMode === 'general'
                ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <BookOpen class="w-3.5 h-3.5" />
            <span>General Callouts ({{ generalCalloutCount }})</span>
          </button>

          <button
            @click="setCalloutViewMode('personal')"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
              mapStore.calloutMapMode === 'personal'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <UserCheck class="w-3.5 h-3.5" />
            <span>Personal Callouts Map ({{ customCalloutCount }})</span>
          </button>

          <button
            @click="setCalloutViewMode('combined')"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
              mapStore.calloutMapMode === 'combined'
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>Combined Overlay</span>
          </button>
        </div>

        <!-- Source Filter Pills & Reference Links -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            @click="sourceFilter = 'all'"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer',
              sourceFilter === 'all'
                ? 'bg-white/15 text-white border-white/25'
                : 'bg-slate-950/60 text-slate-400 border-white/[0.06] hover:text-white'
            ]"
          >
            All Sources
          </button>

          <button
            v-for="src in CALLOUT_REFERENCE_SOURCES"
            :key="src.id"
            @click="sourceFilter = sourceFilter === src.id ? 'all' : src.id"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer',
              sourceFilter === src.id
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-950/60 text-slate-400 border-white/[0.06] hover:text-white'
            ]"
            :title="src.description"
          >
            {{ src.label }}
          </button>

          <a
            href="https://cs2journal.com/callouts/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-950/80 text-sky-400 hover:text-sky-300 border border-sky-500/25 transition-colors"
            title="Open CS2Journal Callouts Reference Atlas"
          >
            <span>CS2Journal Atlas</span>
            <ExternalLink class="w-3 h-3" />
          </a>

          <a
            :href="cs2FlowMapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-950/80 text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 transition-colors"
            title="Open CS2Flow Interactive Map & Callouts"
          >
            <span>CS2Flow {{ mapStore.currentMap.name }}</span>
            <ExternalLink class="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>

    <!-- MAIN CALLOUTS LAYOUT: MAP CANVAS (LEFT) | CALLOUTS DIRECTORY (RIGHT) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- LEFT 2 COLS: STRICT 1:1 RADAR MAP WITH FLOATING IN-MAP APPLE TOOLBAR & CALLOUT BOXES -->
      <div class="lg:col-span-2 flex flex-col gap-3">
        <div
          class="relative w-full bg-slate-950/95 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl flex flex-col items-center justify-center p-3 sm:p-4 select-none"
        >
          <!-- TOP RADAR STATUS BAR: LIVE COORDINATE + BOUNDS PILL & ZOOM -->
          <div class="w-full flex flex-wrap items-center justify-between gap-2 mb-3 z-20">
            <div class="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-white/[0.08] rounded-xl px-3 py-1.5 text-[11px] font-mono">
              <template v-if="cursorPct && cursorWorld">
                <span class="text-slate-300">
                  <strong class="text-sky-400">{{ cursorPct.x.toFixed(1) }}%</strong>,
                  <strong class="text-sky-400">{{ cursorPct.y.toFixed(1) }}%</strong>
                </span>
                <span class="text-slate-600">|</span>
                <span class="text-slate-400">
                  World ({{ cursorWorld.x }}, {{ cursorWorld.y }})
                </span>
                <span
                  :class="[
                    'px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 border',
                    cursorInBounds
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  ]"
                >
                  <ShieldCheck v-if="cursorInBounds" class="w-3 h-3" />
                  <AlertTriangle v-else class="w-3 h-3" />
                  <span>{{ cursorInBounds ? 'IN BOUNDS' : 'OUT OF BOUNDS' }}</span>
                </span>
              </template>
              <span v-else class="text-slate-400">
                Hover radar for coordinates &amp; bounds check • Click any shaded box or label to inspect
              </span>
            </div>

            <!-- Zoom Controls -->
            <div class="flex items-center gap-1 bg-slate-900/90 border border-white/[0.08] rounded-xl p-1">
              <button
                @click="handleZoomOut"
                class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut class="w-3.5 h-3.5" />
              </button>
              <span class="text-[11px] font-mono text-slate-300 px-2 min-w-[44px] text-center">
                {{ Math.round(zoom * 100) }}%
              </span>
              <button
                @click="handleZoomIn"
                class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn class="w-3.5 h-3.5" />
              </button>
              <button
                @click="resetView"
                class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                title="Reset Zoom & Pan"
              >
                <RotateCcw class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- SNAP WARNING TOAST -->
          <div
            v-if="snapWarningMessage"
            class="w-full mb-2 flex items-center justify-between gap-2 px-3.5 py-2 bg-amber-500/15 border border-amber-500/30 text-amber-200 rounded-xl text-xs font-medium"
          >
            <div class="flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 shrink-0 text-amber-400" />
              <span>{{ snapWarningMessage }}</span>
            </div>
            <button @click="snapWarningMessage = ''" class="text-amber-300 hover:text-white cursor-pointer">
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- STRICT 1:1 ASPECT-SQUARE RADAR CANVAS -->
          <div
            class="relative w-full max-w-[680px] aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070a0f]"
            :class="[
              activeTool !== 'select'
                ? 'cursor-crosshair'
                : isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
            ]"
            @wheel="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseLeave"
            @click="handleMapClick"
          >
            <!-- FLOATING APPLE-STYLE IN-MAP DRAWING & LAYER TOOLBAR (TOP-LEFT INSIDE CANVAS) -->
            <div
              class="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1 p-1.5 bg-slate-900/85 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-2xl"
              @mousedown.stop
              @click.stop
            >
              <button
                @click="setTool('select')"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                  activeTool === 'select'
                    ? 'bg-white text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                ]"
                title="Explore, pan, zoom, and click callout boxes to inspect"
              >
                <MousePointer class="w-3.5 h-3.5" />
                <span>Explore</span>
              </button>

              <button
                @click="setTool('draw_box')"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                  activeTool === 'draw_box'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                ]"
                title="Click and drag on the radar to draw a map-fitted personal callout zone"
              >
                <Square class="w-3.5 h-3.5" />
                <span>Map-Fitted Box</span>
              </button>

              <button
                @click="setTool('draw_polygon')"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                  activeTool === 'draw_polygon'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                ]"
                title="Click vertices to trace a custom polygon callout zone"
              >
                <Hexagon class="w-3.5 h-3.5" />
                <span>Draw Polygon</span>
              </button>

              <button
                @click="setTool('place_pin')"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                  activeTool === 'place_pin'
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                ]"
                title="Click anywhere inside playable map bounds to place a point callout pin"
              >
                <MapPin class="w-3.5 h-3.5" />
                <span>Place Pin</span>
              </button>

              <div class="w-px h-4 bg-white/10 mx-0.5"></div>

              <button
                @click="cycleLayerVisibility"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                title="Toggle shaded CS2Journal/CS2Flow zone boxes, pins, or both"
              >
                <Eye class="w-3.5 h-3.5 text-sky-400" />
                <span>{{ layerVisibilityLabel }}</span>
              </button>
            </div>

            <!-- FLOATING TOOL INSTRUCTION PILL (BOTTOM-CENTER INSIDE CANVAS WHEN DRAWING) -->
            <div
              v-if="activeTool !== 'select' && !draftCoords"
              class="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 backdrop-blur-xl border border-emerald-500/40 text-white rounded-xl shadow-2xl text-xs font-medium"
            >
              <Crosshair class="w-3.5 h-3.5 text-emerald-400 shrink-0 pointer-events-none" />
              <span v-if="activeTool === 'draw_box'" class="pointer-events-none">
                Click &amp; drag across any map region to draw a map-fitted callout zone
              </span>
              <template v-else-if="activeTool === 'draw_polygon'">
                <span class="pointer-events-none">
                  Click points to trace polygon ({{ polygonVertices.length }} pts) — click start point to close
                </span>
                <button
                  v-if="polygonVertices.length >= 3"
                  @click.stop="finishPolygonDrawing"
                  class="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-[11px] cursor-pointer"
                >
                  Finish
                </button>
              </template>
              <span v-else class="pointer-events-none">
                Click inside playable radar bounds to drop a personal callout pin
              </span>
            </div>

            <!-- FLOATING HOVER TOOLTIP (CS2JOURNAL STYLE) -->
            <div
              v-if="hoveredCallout && activeTool === 'select'"
              class="absolute bottom-3 right-3 z-30 max-w-[260px] px-3.5 py-2.5 bg-slate-950/90 backdrop-blur-xl border border-white/[0.14] rounded-xl shadow-2xl pointer-events-none"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-white uppercase tracking-wide">
                  {{ hoveredCallout.name }}
                </span>
                <span
                  v-if="hoveredCallout.site"
                  class="px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 text-[10px] font-mono"
                >
                  {{ hoveredCallout.site }}
                </span>
              </div>
              <p
                v-if="hoveredCallout.aliases && hoveredCallout.aliases.length > 0"
                class="text-[11px] text-slate-400 mt-0.5 truncate"
              >
                AKA: {{ hoveredCallout.aliases.join(', ') }}
              </p>
              <p class="text-[10px] text-sky-400 font-mono mt-1">
                {{ getLineupCountForCallout(hoveredCallout) }} linked lineup(s) • Click to inspect
              </p>
            </div>

            <svg
              ref="svgElement"
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              class="w-full h-full aspect-square block transition-transform duration-75 ease-out"
              :style="{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
              }"
            >
              <!-- BASE MAP (Calibrated 1024x1024 Radar Texture) -->
              <VectorMapBlueprint
                :map-info="mapStore.currentMap"
                :show-callouts="false"
              />

              <!-- LAYER 1: MAP-SHAPE-CONFORMING CALLOUT POLYGON ZONES (CS2Journal / TotalCS Style) -->
              <g v-if="showBoxesLayer" class="callout-boxes-layer">
                <template v-for="callout in filteredCallouts" :key="`zone-${callout.id}`">
                  <g
                    v-if="computedZonesMap.get(callout.id)"
                    class="callout-zone-group cursor-pointer"
                    :data-zone-slug="callout.id"
                    :data-label-mode="computedZonesMap.get(callout.id)!.labelMode"
                    @click="selectCallout(callout, $event)"
                    @mouseenter="hoveredCalloutId = callout.id"
                    @mouseleave="hoveredCalloutId = null"
                  >
                    <polygon
                      class="callout-zone transition-all duration-150"
                      :points="computedZonesMap.get(callout.id)!.svgPoints"
                      :fill="getCalloutAccentColor(callout)"
                      :fill-opacity="
                        selectedCalloutId === callout.id
                          ? 0.38
                          : hoveredCalloutId === callout.id
                            ? 0.30
                            : callout.isCustom || callout.isPersonal
                              ? 0.22
                              : 0.14
                      "
                      :stroke="
                        selectedCalloutId === callout.id
                          ? '#f59e0b'
                          : hoveredCalloutId === callout.id
                            ? '#ffffff'
                            : getCalloutAccentColor(callout)
                      "
                      :stroke-width="
                        selectedCalloutId === callout.id
                          ? 2.2
                          : hoveredCalloutId === callout.id
                            ? 1.8
                            : 1.1
                      "
                      :stroke-opacity="
                        selectedCalloutId === callout.id || hoveredCalloutId === callout.id
                          ? 0.95
                          : 0.6
                      "
                    />

                    <!-- Leader line for compact outside labels (CS2Journal style) -->
                    <line
                      v-if="
                        !showPinsLayer &&
                        computedZonesMap.get(callout.id)!.labelMode === 'outside' &&
                        computedZonesMap.get(callout.id)!.leaderFrom &&
                        computedZonesMap.get(callout.id)!.leaderTo
                      "
                      class="callout-zone-arrow-line"
                      :x1="computedZonesMap.get(callout.id)!.leaderFrom!.x"
                      :y1="computedZonesMap.get(callout.id)!.leaderFrom!.y"
                      :x2="computedZonesMap.get(callout.id)!.leaderTo!.x"
                      :y2="computedZonesMap.get(callout.id)!.leaderTo!.y"
                      stroke="#ffffff"
                      stroke-width="1.2"
                      stroke-opacity="0.85"
                    />

                    <!-- Clean centered typography inside the map-conforming polygon -->
                    <text
                      v-if="!showPinsLayer"
                      class="callout-zone-label select-none pointer-events-none uppercase"
                      :x="computedZonesMap.get(callout.id)!.labelX"
                      :y="computedZonesMap.get(callout.id)!.labelY"
                      :font-size="computedZonesMap.get(callout.id)!.fontSize"
                      font-weight="800"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      fill="#ffffff"
                      stroke="#020617"
                      stroke-width="2.8"
                      stroke-linejoin="round"
                      paint-order="stroke fill"
                    >
                      {{ callout.name }}
                    </text>
                  </g>
                </template>

                <!-- IN-PROGRESS CUSTOM POLYGON PREVIEW -->
                <g v-if="polygonVertices.length > 0" class="pointer-events-none">
                  <polyline
                    :points="polygonVertices.map((p) => `${p.x * 10},${p.y * 10}`).join(' ')"
                    fill="none"
                    :stroke="draftColor"
                    stroke-width="2"
                    stroke-dasharray="4 3"
                  />
                  <circle
                    v-for="(pt, idx) in polygonVertices"
                    :key="`poly-pt-${idx}`"
                    :cx="pt.x * 10"
                    :cy="pt.y * 10"
                    :r="idx === 0 ? 5.5 : 3.5"
                    :fill="idx === 0 ? '#ffffff' : draftColor"
                    stroke="#020617"
                    stroke-width="1.5"
                  />
                </g>

                <!-- DRAFT CLIPPED POLYGON PREVIEW -->
                <polygon
                  v-if="draftPolygon && draftPolygon.length >= 3"
                  :points="draftPolygon.map((p) => `${p.x * 10},${p.y * 10}`).join(' ')"
                  :fill="draftColor"
                  fill-opacity="0.28"
                  :stroke="draftColor"
                  stroke-width="2"
                  class="pointer-events-none"
                />
              </g>

              <!-- LAYER 2: CALLOUT PINS & CRISP TYPOGRAPHY BADGES -->
              <g v-if="showPinsLayer" class="callouts-pins-layer">
                <g
                  v-for="callout in filteredCallouts"
                  :key="callout.id"
                  :transform="`translate(${callout.coords.x * 10}, ${callout.coords.y * 10}) scale(${inversePinScale})`"
                  class="cursor-pointer"
                  @click="selectCallout(callout, $event)"
                  @mouseenter="hoveredCalloutId = callout.id"
                  @mouseleave="hoveredCalloutId = null"
                >
                  <!-- Active Selection Halo -->
                  <circle
                    v-if="selectedCalloutId === callout.id"
                    cx="0"
                    cy="0"
                    r="13"
                    fill="#f59e0b"
                    fill-opacity="0.22"
                    stroke="#f59e0b"
                    stroke-width="1.5"
                  />

                  <!-- Marker Dot -->
                  <circle
                    cx="0"
                    cy="0"
                    :r="selectedCalloutId === callout.id ? 5 : 3.5"
                    :fill="getPinColors(callout).dot"
                    stroke="#0f172a"
                    stroke-width="1.5"
                  />

                  <!-- Callout Label Pill -->
                  <rect
                    :x="-getBadgeWidth(callout.name) / 2"
                    y="-21"
                    :width="getBadgeWidth(callout.name)"
                    height="15"
                    rx="4.5"
                    :fill="getPinColors(callout).bg"
                    fill-opacity="0.92"
                    :stroke="getPinColors(callout).stroke"
                    :stroke-width="selectedCalloutId === callout.id ? 1.5 : 1"
                    :stroke-opacity="selectedCalloutId === callout.id ? 0.95 : 0.65"
                  />

                  <text
                    x="0"
                    y="-10.5"
                    font-size="8.8"
                    font-weight="700"
                    text-anchor="middle"
                    :fill="getPinColors(callout).text"
                    class="tracking-wider uppercase font-sans select-none"
                  >
                    {{ callout.name }}
                  </text>
                </g>
              </g>

              <!-- LAYER 3: LIVE DRAG PREVIEW BOX WHILE DRAWING -->
              <g v-if="liveDragPreviewBox">
                <rect
                  :x="liveDragPreviewBox.x * 10"
                  :y="liveDragPreviewBox.y * 10"
                  :width="liveDragPreviewBox.width * 10"
                  :height="liveDragPreviewBox.height * 10"
                  rx="6"
                  :fill="draftColor"
                  fill-opacity="0.28"
                  :stroke="draftColor"
                  stroke-width="2.2"
                  stroke-dasharray="6 3"
                />
                <text
                  :x="(liveDragPreviewBox.x + liveDragPreviewBox.width / 2) * 10"
                  :y="(liveDragPreviewBox.y + liveDragPreviewBox.height / 2) * 10 + 4"
                  font-size="11"
                  font-weight="800"
                  text-anchor="middle"
                  fill="#ffffff"
                  stroke="#020617"
                  stroke-width="3"
                  paint-order="stroke"
                >
                  {{ liveDragPreviewBox.width }}% × {{ liveDragPreviewBox.height }}%
                </text>
              </g>

              <!-- LAYER 4: DRAFT BOX / PIN PREVIEW BEFORE SAVING -->
              <g v-if="draftCoords">
                <rect
                  v-if="draftShape === 'box' && draftBox"
                  :x="draftBox.x * 10"
                  :y="draftBox.y * 10"
                  :width="draftBox.width * 10"
                  :height="draftBox.height * 10"
                  rx="6"
                  :fill="draftColor"
                  fill-opacity="0.3"
                  :stroke="draftColor"
                  stroke-width="2.4"
                />
                <g
                  :transform="`translate(${draftCoords.x * 10}, ${draftCoords.y * 10}) scale(${inversePinScale})`"
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="15"
                    :fill="draftColor"
                    fill-opacity="0.28"
                    :stroke="draftColor"
                    stroke-width="2"
                  />
                  <circle cx="0" cy="0" r="5.5" :fill="draftColor" stroke="#ffffff" stroke-width="2" />
                </g>
              </g>
            </svg>
          </div>
        </div>

        <!-- PERSONAL CALLOUT / BOX CREATOR & EDITOR DRAWER -->
        <div
          v-if="draftCoords"
          class="p-5 bg-slate-900/90 backdrop-blur-xl border border-emerald-500/40 rounded-2xl flex flex-col gap-4 shadow-2xl"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Square v-if="draftShape === 'box'" class="w-4 h-4" />
                <MapPin v-else class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-white">
                  {{ editingCalloutId ? 'Edit Personal Callout Zone' : draftShape === 'box' ? 'New Personal Callout Box' : 'New Personal Callout Pin' }}
                </h3>
                <p class="text-[11px] text-slate-400 font-mono">
                  Center: {{ draftCoords.x }}%, {{ draftCoords.y }}%
                  <template v-if="draftShape === 'box' && draftBox">
                    • Box: {{ draftBox.width }}% × {{ draftBox.height }}%
                  </template>
                  <span v-if="hasFloors" class="text-amber-300 uppercase ml-1">({{ activeFloor }})</span>
                </p>
              </div>
            </div>

            <!-- Shape Switcher (Box vs Pin) -->
            <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/[0.08]">
              <button
                @click="
                  draftShape = 'box';
                  if (!draftBox && draftCoords) draftBox = deriveCalloutBox(draftCoords, draftSite, draftName)
                "
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  draftShape === 'box' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                ]"
              >
                Zone Box
              </button>
              <button
                @click="draftShape = 'pin'"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  draftShape === 'pin' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                ]"
              >
                Point Pin
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-slate-400">Callout Name</label>
              <input
                v-model="draftName"
                type="text"
                placeholder="e.g. Xbox, Default Box, Ninja"
                class="bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                @keyup.enter="handleSaveDraftCallout"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-slate-400">Map Sector / Site</label>
              <select
                v-model="draftSite"
                class="bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="A">A Site</option>
                <option value="B">B Site</option>
                <option value="Mid">Mid</option>
                <option value="Spawn">Spawn</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-slate-400">Team Aliases (comma-separated)</label>
              <input
                v-model="draftAliases"
                type="text"
                placeholder="e.g. palm, double stack, headshot"
                class="bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                @keyup.enter="handleSaveDraftCallout"
              />
            </div>
          </div>

          <!-- Box Size Sliders & Color Swatches -->
          <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-medium text-slate-400">Zone Color:</span>
              <button
                v-for="swatch in PERSONAL_COLOR_PALETTE"
                :key="swatch.value"
                @click="draftColor = swatch.value"
                class="w-6 h-6 rounded-full border-2 transition-transform cursor-pointer"
                :style="{
                  backgroundColor: swatch.value,
                  borderColor: draftColor === swatch.value ? '#ffffff' : 'transparent',
                  transform: draftColor === swatch.value ? 'scale(1.12)' : 'scale(1)'
                }"
                :title="swatch.label"
              ></button>
            </div>

            <div v-if="draftShape === 'box' && draftBox" class="flex flex-wrap items-center gap-4">
              <label class="flex items-center gap-2 text-[11px] text-slate-300">
                <span>Width: {{ draftBox.width }}%</span>
                <input
                  type="range"
                  min="4"
                  max="28"
                  step="0.5"
                  :value="draftBox.width"
                  @input="updateDraftBoxDimension('width', Number(($event.target as HTMLInputElement).value))"
                  class="w-24 accent-emerald-400"
                />
              </label>
              <label class="flex items-center gap-2 text-[11px] text-slate-300">
                <span>Height: {{ draftBox.height }}%</span>
                <input
                  type="range"
                  min="3.5"
                  max="24"
                  step="0.5"
                  :value="draftBox.height"
                  @input="updateDraftBoxDimension('height', Number(($event.target as HTMLInputElement).value))"
                  class="w-24 accent-emerald-400"
                />
              </label>
            </div>

            <div class="flex items-center gap-2 ml-auto">
              <button
                @click="handleCancelDraft"
                class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                @click="handleSaveDraftCallout"
                :disabled="!draftName.trim()"
                class="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Check class="w-3.5 h-3.5" />
                <span>{{ editingCalloutId ? 'Save Changes' : 'Save to Personal Map' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT 1 COL: CALLOUT DIRECTORY & PERSONAL MAP MANAGER -->
      <div class="p-5 bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] rounded-2xl flex flex-col gap-3.5 shadow-2xl lg:h-[760px]">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-white">
              {{
                mapStore.calloutMapMode === 'general'
                  ? 'Consensus Callouts'
                  : mapStore.calloutMapMode === 'personal'
                    ? 'Personal Callouts Map'
                    : 'Combined Directory'
              }}
            </span>
            <p class="text-[11px] text-slate-400">
              {{ filteredCallouts.length }} visible zones on {{ mapStore.currentMap.name }}
            </p>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              @click="setTool('draw_box')"
              class="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-medium transition-colors cursor-pointer"
              title="Draw a custom callout box on the radar"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Add Box</span>
            </button>

            <button
              v-if="customCalloutCount > 0"
              @click="handleClearAllPersonal"
              class="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-xl transition-colors cursor-pointer"
              title="Clear all personal callouts for this map"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- SEARCH -->
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search callout name, alias, or source..."
            class="w-full bg-slate-950/90 border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 placeholder-slate-500"
          />
        </div>

        <!-- SITE FILTER PILLS -->
        <div class="flex flex-wrap items-center gap-1">
          <button
            v-for="tab in (['all', 'A', 'B', 'Mid', 'Spawn'] as const)"
            :key="tab"
            @click="siteFilter = tab"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer',
              siteFilter === tab
                ? 'bg-white text-slate-950 font-semibold border-white'
                : 'bg-slate-950/70 text-slate-400 border-white/[0.06] hover:text-white'
            ]"
          >
            {{ tab === 'all' ? 'All Sectors' : tab }}
          </button>
        </div>

        <!-- CALLOUTS LIST -->
        <div class="flex-grow overflow-y-auto flex flex-col gap-1.5 pr-1 text-xs min-h-[280px]">
          <div
            v-if="filteredCallouts.length === 0"
            class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400"
          >
            <Square class="w-8 h-8 stroke-[1.5] mb-2 text-slate-600" />
            <p class="font-semibold text-xs text-slate-300">
              {{
                mapStore.calloutMapMode === 'personal'
                  ? 'Your Personal Callouts Map is Empty'
                  : 'No Matching Callouts'
              }}
            </p>
            <p class="text-[11px] text-slate-500 mt-1 max-w-[230px]">
              {{
                mapStore.calloutMapMode === 'personal'
                  ? 'Use "Draw Callout Box" on the radar to create custom team zones, or import a teammate’s shared map.'
                  : 'Clear filters or switch to Draw Callout Box to add your own callout.'
              }}
            </p>
            <div v-if="mapStore.calloutMapMode === 'personal'" class="flex items-center gap-2 mt-3">
              <button
                @click="setTool('draw_box')"
                class="px-3 py-1.5 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Draw First Box
              </button>
              <button
                @click="openShareModal('import')"
                class="px-3 py-1.5 bg-slate-800 text-slate-200 font-medium rounded-xl text-xs cursor-pointer"
              >
                Import Map
              </button>
            </div>
          </div>

          <div
            v-for="callout in filteredCallouts"
            :key="callout.id"
            @click="selectCallout(callout)"
            :class="[
              'flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer',
              selectedCalloutId === callout.id
                ? 'bg-white/[0.08] border-amber-400/60 shadow-sm'
                : 'bg-slate-950/70 hover:bg-slate-900/90 border-white/[0.06]'
            ]"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-2.5 h-2.5 rounded-sm shrink-0"
                  :style="{ backgroundColor: getCalloutAccentColor(callout) }"
                ></span>
                <span class="font-semibold text-slate-100 truncate">{{ callout.name }}</span>
                <span
                  v-if="callout.isCustom || callout.isPersonal"
                  class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold"
                >
                  Personal
                </span>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <span
                  v-if="getLineupCountForCallout(callout) > 0"
                  class="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/25 text-sky-300 font-mono text-[9px] font-semibold"
                >
                  {{ getLineupCountForCallout(callout) }} nade{{ getLineupCountForCallout(callout) === 1 ? '' : 's' }}
                </span>

                <span
                  v-if="callout.site"
                  class="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono text-[9px] font-medium"
                >
                  {{ callout.site }}
                </span>

                <button
                  v-if="callout.isCustom || callout.isPersonal"
                  @click="startEditPersonalCallout(callout, $event)"
                  class="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Edit personal callout box"
                >
                  <Edit3 class="w-3 h-3" />
                </button>

                <button
                  v-if="callout.isCustom || callout.isPersonal"
                  @click="handleDeleteCallout(callout.id, $event)"
                  class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                  title="Delete personal callout"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Aliases & Consensus Sources Row -->
            <div class="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
              <span v-if="callout.aliases && callout.aliases.length > 0" class="truncate max-w-[180px]">
                aka {{ callout.aliases.slice(0, 3).join(', ') }}
              </span>
              <span v-else class="font-mono text-slate-500">
                {{ callout.coords.x }}%, {{ callout.coords.y }}%
              </span>

              <div v-if="callout.sources && callout.sources.length > 0" class="flex items-center gap-1">
                <span
                  v-for="src in callout.sources.slice(0, 2)"
                  :key="src"
                  class="px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-400 text-[9px]"
                >
                  {{ src }}
                </span>
                <span
                  v-if="callout.sources.length > 2"
                  class="text-[9px] text-slate-500"
                >
                  +{{ callout.sources.length - 2 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SELECTED CALLOUT INSPECTOR & MATCHING LINEUPS -->
    <div
      v-if="selectedCallout"
      class="p-5 bg-slate-900/85 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col gap-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <Target class="w-4 h-4 text-amber-400" />
            <h2 class="text-base font-semibold text-white">
              {{ selectedCallout.name }}
            </h2>
            <span
              v-if="selectedCallout.site"
              class="px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 text-[10px] font-mono font-semibold uppercase"
            >
              Sector: {{ selectedCallout.site }}
            </span>
            <span
              v-if="selectedCallout.floor"
              class="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-semibold uppercase"
            >
              {{ selectedCallout.floor }}
            </span>
            <span class="text-[11px] font-mono text-slate-400">
              Center {{ selectedCallout.coords.x }}%, {{ selectedCallout.coords.y }}%
            </span>
          </div>

          <div
            v-if="selectedCallout.aliases && selectedCallout.aliases.length > 0"
            class="flex flex-wrap items-center gap-1.5 mt-0.5"
          >
            <span class="text-[11px] text-slate-400">Regional / Pro Aliases:</span>
            <span
              v-for="alias in selectedCallout.aliases"
              :key="alias"
              class="px-2 py-0.5 rounded-md bg-slate-950/90 border border-white/[0.06] text-slate-300 text-[10px]"
            >
              {{ alias }}
            </span>
          </div>

          <div
            v-if="selectedCallout.sources && selectedCallout.sources.length > 0"
            class="flex flex-wrap items-center gap-1.5 mt-0.5"
          >
            <span class="text-[11px] text-slate-400">Indexed Sources:</span>
            <span
              v-for="src in selectedCallout.sources"
              :key="src"
              class="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/25 text-sky-300 text-[10px] font-medium"
            >
              {{ src }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="!selectedCallout.isCustom && !selectedCallout.isPersonal"
            @click="cloneConsensusToPersonal(selectedCallout)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl font-medium text-xs transition-colors cursor-pointer"
            title="Copy this zone into your Personal Callouts Map to customize its name or box"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Copy to Personal Map</span>
          </button>

          <button
            v-else
            @click="startEditPersonalCallout(selectedCallout)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl font-medium text-xs transition-colors cursor-pointer"
          >
            <Edit3 class="w-3.5 h-3.5" />
            <span>Edit Zone</span>
          </button>

          <button
            @click="copyToClipboard(getCalloutSpotSetpos(selectedCallout), `spot-${selectedCallout.id}`)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-white/[0.08] rounded-xl font-medium text-xs transition-colors cursor-pointer"
          >
            <Check v-if="copiedKey === `spot-${selectedCallout.id}`" class="w-3.5 h-3.5" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>
              {{ copiedKey === `spot-${selectedCallout.id}` ? 'Copied Spot setpos' : 'Copy Spot setpos' }}
            </span>
          </button>

          <button
            @click="selectedCalloutId = null"
            class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Close inspector"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- MATCHING LINEUPS GRID -->
      <div v-if="matchingLineups.length === 0" class="py-4 text-center text-xs text-slate-400">
        No saved or catalog lineups currently start or land at <strong class="text-white">{{ selectedCallout.name }}</strong>.
        Use <strong class="text-sky-400">Copy Spot setpos</strong> above to teleport directly here in CS2 practice.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="entry in matchingLineups"
          :key="entry.lineup.id"
          class="p-3.5 bg-slate-950/80 border border-white/[0.07] hover:border-white/[0.15] rounded-xl flex flex-col justify-between gap-3 transition-colors"
        >
          <div class="flex flex-col gap-1.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border',
                    getGrenadeBadgeClass(entry.lineup.grenadeType)
                  ]"
                >
                  {{ entry.lineup.grenadeType }}
                </span>
                <span class="text-[10px] font-mono font-semibold uppercase text-slate-400">
                  {{ entry.lineup.side }} Side
                </span>
              </div>

              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border',
                  entry.role === 'origin'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : entry.role === 'landing'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                ]"
              >
                {{
                  entry.role === 'origin'
                    ? 'Throw From Here'
                    : entry.role === 'landing'
                      ? 'Lands Here'
                      : 'Origin & Target'
                }}
              </span>
            </div>

            <h3 class="text-sm font-semibold text-white leading-snug">
              {{ entry.lineup.title }}
            </h3>

            <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span>{{ entry.lineup.startLocation }} to {{ entry.lineup.endLocation }}</span>
              <span class="text-slate-600">•</span>
              <span class="text-sky-400 font-medium capitalize">
                {{ entry.lineup.movementType || 'stationary' }} • {{ entry.lineup.throwType.replace(/_/g, ' ') }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
            <button
              @click="viewLineupOnRadar(entry.lineup)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-950 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              <Navigation class="w-3 h-3" />
              <span>View on Radar</span>
            </button>

            <button
              @click="copyLineupSetupCommand(entry.lineup, `lineup-setup-${entry.lineup.id}`)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-white/[0.08] font-medium rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              <Check v-if="copiedKey === `lineup-setup-${entry.lineup.id}`" class="w-3 h-3" />
              <Copy v-else class="w-3 h-3" />
              <span>
                {{ copiedKey === `lineup-setup-${entry.lineup.id}` ? 'Copied setpos' : 'Copy Spot setpos' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 1-CLICK SHARE & IMPORT PERSONAL CALLOUTS MAP MODAL -->
    <div
      v-if="isShareModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      @click.self="isShareModalOpen = false"
    >
      <div class="w-full max-w-xl bg-slate-900 border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div class="flex items-center gap-2.5">
            <Share2 class="w-4 h-4 text-emerald-400" />
            <h3 class="text-sm font-semibold text-white">
              Share &amp; Sync Personal Callouts Map ({{ mapStore.currentMap.name }})
            </h3>
          </div>
          <button
            @click="isShareModalOpen = false"
            class="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Tabs -->
        <div class="flex items-center gap-1 px-5 pt-3">
          <button
            @click="shareTab = 'share'"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer',
              shareTab === 'share'
                ? 'bg-white text-slate-950 font-semibold'
                : 'bg-slate-950/60 text-slate-400 hover:text-white'
            ]"
          >
            Share Personal Map ({{ customCalloutCount }})
          </button>
          <button
            @click="shareTab = 'import'"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer',
              shareTab === 'import'
                ? 'bg-white text-slate-950 font-semibold'
                : 'bg-slate-950/60 text-slate-400 hover:text-white'
            ]"
          >
            Import Teammate’s Map
          </button>
        </div>

        <!-- SHARE TAB -->
        <div v-if="shareTab === 'share'" class="p-5 flex flex-col gap-4">
          <p class="text-xs text-slate-300 leading-relaxed">
            Share your custom {{ mapStore.currentMap.name }} callout boxes and pins with teammates in 1 click using a compact share code or JSON file.
          </p>

          <div class="flex flex-wrap items-center gap-2">
            <button
              @click="handleCopyShareCode"
              class="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Check v-if="copiedKey === 'share-code'" class="w-3.5 h-3.5" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copiedKey === 'share-code' ? 'Copied 1-Click Share Code!' : 'Copy 1-Click Share Code' }}</span>
            </button>

            <button
              @click="handleCopyShareJSON"
              class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Check v-if="copiedKey === 'share-json'" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>{{ copiedKey === 'share-json' ? 'Copied JSON!' : 'Copy Raw JSON' }}</span>
            </button>

            <button
              @click="handleDownloadPersonalJSON"
              class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Download class="w-3.5 h-3.5 text-sky-400" />
              <span>Download .JSON</span>
            </button>
          </div>

          <textarea
            readonly
            :value="mapStore.exportPersonalCalloutsJSON(mapStore.currentMapId)"
            rows="7"
            class="w-full bg-slate-950 border border-white/[0.08] rounded-xl p-3 text-[11px] font-mono text-slate-300 focus:outline-none"
          ></textarea>
        </div>

        <!-- IMPORT TAB -->
        <div v-else class="p-5 flex flex-col gap-4">
          <p class="text-xs text-slate-300 leading-relaxed">
            Paste a teammate’s <code class="text-emerald-400">CS2CALLOUTS1:...</code> share code or JSON payload below, or upload a <code class="text-sky-400">.json</code> file.
          </p>

          <textarea
            v-model="importPayloadText"
            rows="6"
            placeholder="Paste CS2CALLOUTS1:... share code or Personal Callouts JSON here..."
            class="w-full bg-slate-950 border border-white/[0.1] rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
          ></textarea>

          <div
            v-if="importFeedback"
            :class="[
              'p-3 rounded-xl text-xs font-medium border',
              importFeedback.success
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            ]"
          >
            {{ importFeedback.message }}
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <label class="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] rounded-xl text-xs font-medium cursor-pointer">
              <Upload class="w-3.5 h-3.5 text-sky-400" />
              <span>Upload .JSON File</span>
              <input type="file" accept=".json,application/json" class="hidden" @change="handleImportFileUpload" />
            </label>

            <button
              @click="handleImportSharedMap"
              class="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Check class="w-3.5 h-3.5" />
              <span>Import into Personal Map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
