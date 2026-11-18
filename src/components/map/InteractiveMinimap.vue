<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useCS2ServerStore } from '../../stores/cs2ServerStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { DEFAULT_LINEUP_IMAGE } from '../../config/site'
import { findNearestCallout } from '../../data/mapsData'
import {
  clientToSvgRadarPct,
  computeTrajectoryArc,
  cs2YawToRadarVector,
  radarToWorldCoords
} from '../../core/radar/coordinateEngine'
import {
  getLineupSetupConsoleCommand,
  getMapSwitchConsoleCommand,
  isPointInMapBounds,
  snapPointToMapBounds
} from '../../core/radar/mapBounds'
import VectorMapBlueprint from './VectorMapBlueprint.vue'
import MapSettingsModal from './MapSettingsModal.vue'
import NadeIcon from '../common/NadeIcon.vue'
import type {
  GrenadeType,
  Lineup,
  LineupDisplayMode,
  Point2D,
  RadarFloorId,
  RadarTargetCluster
} from '../../types'
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  Crosshair,
  Footprints,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  MapPin,
  Maximize2,
  Mic,
  MousePointerClick,
  Navigation,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  Terminal,
  X,
  Zap,
  ZoomIn,
  ZoomOut
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const cs2Store = useCS2ServerStore()
const voiceStore = useVoiceStore()

const showSettingsModal = ref(false)
const svgRef = ref<SVGSVGElement | null>(null)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const didDrag = ref(false)

const hoveredClusterId = ref<string | null>(null)
const boundsSnapNotice = ref<string | null>(null)
let boundsSnapTimer: ReturnType<typeof setTimeout> | null = null

const copiedMapCmd = ref(false)
let copiedMapCmdTimer: ReturnType<typeof setTimeout> | null = null

const copiedSetupCmd = ref(false)
let copiedSetupCmdTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (boundsSnapTimer) clearTimeout(boundsSnapTimer)
  if (copiedMapCmdTimer) clearTimeout(copiedMapCmdTimer)
  if (copiedSetupCmdTimer) clearTimeout(copiedSetupCmdTimer)
})

const currentMap = computed(() => mapStore.getMapById(lineupStore.activeMapId))
const inversePinScale = computed(() => Number((1 / Math.pow(zoom.value, 0.82)).toFixed(3)))

// Live Cursor Coordinate Readout & Strict Bounds Check
const cursorRadarPct = ref<Point2D | null>(null)
const cursorWorld = computed(() => {
  if (!cursorRadarPct.value) return null
  return radarToWorldCoords(lineupStore.activeMapId, cursorRadarPct.value)
})
const cursorCallout = computed(() => {
  if (!cursorRadarPct.value) return null
  return findNearestCallout(
    lineupStore.activeMapId,
    cursorRadarPct.value,
    lineupStore.activeFloorId
  )
})
const isCursorInBounds = computed(() =>
  cursorRadarPct.value
    ? isPointInMapBounds(lineupStore.activeMapId, cursorRadarPct.value, lineupStore.activeFloorId)
    : true
)

const displayModes: { id: LineupDisplayMode; label: string; shortLabel: string; icon: any }[] = [
  { id: 'all_images', label: 'Show All Images', shortLabel: 'All Images', icon: ImageIcon },
  { id: 'spot_movement', label: 'Spot & Movement', shortLabel: 'Spot & Move', icon: Footprints },
  { id: 'cards', label: 'Cards', shortLabel: 'Cards', icon: LayoutGrid }
]

// Sync active radar floor automatically whenever selectedLineup specifies upper/lower
watch(
  () => lineupStore.activeMapId,
  (newMapId) => {
    if (lineupStore.selectedLineup && lineupStore.selectedLineup.mapId !== newMapId) {
      lineupStore.selectLineup(null)
      lineupStore.activeTargetClusterId = null
    } else if (!lineupStore.selectedLineup) {
      lineupStore.activeTargetClusterId = null
    }
  }
)

watch(
  () => lineupStore.selectedLineup,
  (val) => {
    if (!val) return
    if (val.mapId && val.mapId !== lineupStore.activeMapId) {
      mapStore.setMap(val.mapId)
    }
    if (val.radarFloor && (val.radarFloor === 'upper' || val.radarFloor === 'lower')) {
      if (lineupStore.activeFloorId !== val.radarFloor) {
        lineupStore.activeFloorId = val.radarFloor
      }
    }
    if (mapStore.clusterTargets) {
      const matchingCluster = targetClusters.value.find((c) =>
        c.lineups.some((l) => l.id === val.id)
      )
      if (matchingCluster && lineupStore.activeTargetClusterId !== matchingCluster.id) {
        lineupStore.activeTargetClusterId = matchingCluster.id
      }
    }
  },
  { immediate: true }
)

// Floor lineup counts for Nuke / Vertigo badges
const floorCounts = computed(() => {
  const counts: Record<RadarFloorId, number> = { upper: 0, lower: 0 }
  for (const l of lineupStore.filteredLineups) {
    const f: RadarFloorId = l.radarFloor === 'lower' ? 'lower' : 'upper'
    counts[f]++
  }
  return counts
})

function clampPct(val: number): number {
  if (!Number.isFinite(val)) return 50
  return Math.max(0, Math.min(100, Number(val.toFixed(2))))
}

function getSafeBoundCoords(mapId: string, pt: Point2D, floor?: RadarFloorId): Point2D {
  const clamped: Point2D = { x: clampPct(pt.x), y: clampPct(pt.y) }
  if (isPointInMapBounds(mapId, clamped, floor)) return clamped
  const snapped = snapPointToMapBounds(mapId, clamped, floor)
  return { x: clampPct(snapped.x), y: clampPct(snapped.y) }
}

interface SafeRadarEntry {
  lineup: Lineup
  origin: Point2D
  landing: Point2D
}

// Defensively clamped, bounded & floor-synced lineups for rendering
const safeEntries = computed<SafeRadarEntry[]>(() => {
  const hasFloors = Boolean(currentMap.value.radarFloors && currentMap.value.radarFloors.length > 0)
  const activeFloor = hasFloors ? lineupStore.activeFloorId : undefined
  const entries: SafeRadarEntry[] = []

  for (const item of lineupStore.filteredLineups) {
    if (
      !item.originCoords ||
      !item.landingCoords ||
      !Number.isFinite(Number(item.originCoords.x)) ||
      !Number.isFinite(Number(item.originCoords.y)) ||
      !Number.isFinite(Number(item.landingCoords.x)) ||
      !Number.isFinite(Number(item.landingCoords.y))
    ) {
      continue
    }

    if (hasFloors && item.radarFloor && item.radarFloor !== activeFloor) {
      continue
    }

    const itemFloor = hasFloors ? item.radarFloor ?? activeFloor : undefined
    entries.push({
      lineup: item,
      origin: getSafeBoundCoords(item.mapId || lineupStore.activeMapId, item.originCoords, itemFloor),
      landing: getSafeBoundCoords(item.mapId || lineupStore.activeMapId, item.landingCoords, itemFloor)
    })
  }

  return entries
})

const safeEntryById = computed(() => {
  const map = new Map<string, SafeRadarEntry>()
  for (const entry of safeEntries.value) {
    map.set(entry.lineup.id, entry)
  }
  return map
})

// CSNades.gg / Scope.gg Target-First Clustering
const targetClusters = computed<RadarTargetCluster[]>(() => {
  const clusterRadiusPct = 4.2
  const groups: {
    id: string
    grenadeType: GrenadeType
    endLocation: string
    entries: SafeRadarEntry[]
    sumX: number
    sumY: number
  }[] = []

  for (const entry of safeEntries.value) {
    const item = entry.lineup
    const normEnd = (item.endLocation || '').trim().toLowerCase()

    let matchGroup = mapStore.clusterTargets
      ? groups.find((g) => {
          if (g.grenadeType !== item.grenadeType) return false
          const cx = g.sumX / g.entries.length
          const cy = g.sumY / g.entries.length
          const dist = Math.hypot(cx - entry.landing.x, cy - entry.landing.y)
          if (dist <= clusterRadiusPct) return true
          if (normEnd && g.endLocation.trim().toLowerCase() === normEnd && dist <= 7.0) {
            return true
          }
          return false
        })
      : undefined

    if (matchGroup) {
      matchGroup.entries.push(entry)
      matchGroup.sumX += entry.landing.x
      matchGroup.sumY += entry.landing.y
    } else {
      groups.push({
        id: `cluster-${item.id}`,
        grenadeType: item.grenadeType,
        endLocation: item.endLocation || 'Target Zone',
        entries: [entry],
        sumX: entry.landing.x,
        sumY: entry.landing.y
      })
    }
  }

  const hasFloors = Boolean(currentMap.value.radarFloors && currentMap.value.radarFloors.length > 0)
  const activeFloor = hasFloors ? lineupStore.activeFloorId : undefined

  return groups.map((g) => {
    const avgPoint: Point2D = {
      x: g.sumX / g.entries.length,
      y: g.sumY / g.entries.length
    }
    const safeCoords =
      g.entries.length === 1
        ? g.entries[0]!.landing
        : getSafeBoundCoords(lineupStore.activeMapId, avgPoint, activeFloor)

    return {
      id: g.id,
      coords: safeCoords,
      endLocation: g.endLocation,
      grenadeType: g.grenadeType,
      lineups: g.entries.map((e) => e.lineup),
      primaryLineup: g.entries[0]!.lineup
    }
  })
})

const activeCluster = computed<RadarTargetCluster | null>(() => {
  if (!lineupStore.activeTargetClusterId) return null
  return targetClusters.value.find((c) => c.id === lineupStore.activeTargetClusterId) || null
})

// Origin pins + trajectories actively expanded on the radar
const expandedOriginEntries = computed<SafeRadarEntry[]>(() => {
  if (activeCluster.value) {
    return activeCluster.value.lineups
      .map((l) => safeEntryById.value.get(l.id))
      .filter((e): e is SafeRadarEntry => Boolean(e))
  }
  if (hoveredClusterId.value) {
    const hoveredCluster = targetClusters.value.find((c) => c.id === hoveredClusterId.value)
    if (hoveredCluster) {
      return hoveredCluster.lineups
        .map((l) => safeEntryById.value.get(l.id))
        .filter((e): e is SafeRadarEntry => Boolean(e))
    }
  }
  if (lineupStore.selectedLineup) {
    const sel = safeEntryById.value.get(lineupStore.selectedLineup.id)
    if (sel) return [sel]
  }
  if (lineupStore.hoveredLineupId) {
    const hov = safeEntryById.value.get(lineupStore.hoveredLineupId)
    if (hov) return [hov]
  }
  if (lineupStore.activeExecute) {
    return safeEntries.value
  }
  return []
})

// Live CS2 Player Position on Current Map (defensively bounded)
const activePlayerMarker = computed(() => {
  if (!cs2Store.showPlayerOnRadar) return null
  const tel = cs2Store.liveTelemetry
  if (tel.positionAvailable && tel.radarCoords && tel.mapId === lineupStore.activeMapId) {
    const yaw = tel.worldPos?.yaw ?? 0
    const lookVec = cs2YawToRadarVector(yaw, 7.5)
    return {
      coords: getSafeBoundCoords(lineupStore.activeMapId, tel.radarCoords, tel.radarFloor),
      estimatedLanding: tel.estimatedLandingCoords
        ? getSafeBoundCoords(lineupStore.activeMapId, tel.estimatedLandingCoords, tel.radarFloor)
        : null,
      worldPos: tel.worldPos,
      lookVec,
      yaw,
      playerName: tel.playerName,
      source: tel.source,
      floor: tel.radarFloor
    }
  }
  if (cs2Store.lastPosition?.radarCoords) {
    const pos = cs2Store.lastPosition
    const lookVec = cs2YawToRadarVector(pos.yaw, 7.5)
    return {
      coords: getSafeBoundCoords(lineupStore.activeMapId, pos.radarCoords, lineupStore.activeFloorId),
      estimatedLanding: pos.estimatedLandingCoords
        ? getSafeBoundCoords(
            lineupStore.activeMapId,
            pos.estimatedLandingCoords,
            lineupStore.activeFloorId
          )
        : null,
      worldPos: { x: pos.x, y: pos.y, z: pos.z, pitch: pos.pitch, yaw: pos.yaw },
      lookVec,
      yaw: pos.yaw,
      playerName: 'Captured Pos',
      source: 'CLIPBOARD' as const,
      floor: lineupStore.activeFloorId
    }
  }
  return null
})

// Execute step lookup map: lineupId -> ExecuteUtilityStep
const executeStepByLineupId = computed(() => {
  const map = new Map<
    string,
    { order: number; role: string; delaySeconds: number; roundClock?: string; notes?: string }
  >()
  const exec = lineupStore.activeExecute
  if (!exec) return map
  if (exec.steps && exec.steps.length > 0) {
    for (const s of exec.steps) {
      map.set(s.lineupId, {
        order: s.order,
        role: s.playerRole,
        delaySeconds: s.delaySeconds,
        roundClock: s.roundClock,
        notes: s.notes
      })
    }
  } else {
    exec.lineupIds.forEach((lid, idx) => {
      map.set(lid, {
        order: idx + 1,
        role: 'Support',
        delaySeconds: idx * 0.5
      })
    })
  }
  return map
})

const grenadeColors: Record<
  GrenadeType,
  { stroke: string; fill: string; glow: string; badge: string }
> = {
  smoke: {
    stroke: '#38bdf8',
    fill: '#0c4a6e',
    glow: 'rgba(56, 189, 248, 0.55)',
    badge: 'S'
  },
  flash: {
    stroke: '#facc15',
    fill: '#713f12',
    glow: 'rgba(250, 204, 21, 0.55)',
    badge: 'F'
  },
  molotov: {
    stroke: '#fb923c',
    fill: '#7c2d12',
    glow: 'rgba(251, 146, 60, 0.55)',
    badge: 'M'
  },
  he: {
    stroke: '#f87171',
    fill: '#7f1d1d',
    glow: 'rgba(248, 113, 113, 0.55)',
    badge: 'HE'
  },
  decoy: {
    stroke: '#a855f7',
    fill: '#3b0764',
    glow: 'rgba(168, 85, 247, 0.55)',
    badge: 'D'
  }
}

function showBoundsSnapBanner(msg = '⚠️ Adjusted click to nearest playable spot inside map bounds') {
  boundsSnapNotice.value = msg
  if (boundsSnapTimer) clearTimeout(boundsSnapTimer)
  boundsSnapTimer = setTimeout(() => {
    boundsSnapNotice.value = null
  }, 4500)
}

function handleZoomIn() {
  zoom.value = Math.min(zoom.value + 0.3, 4.0)
}

function handleZoomOut() {
  zoom.value = Math.max(zoom.value - 0.3, 1)
  if (zoom.value === 1) pan.value = { x: 0, y: 0 }
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
  if (lineupStore.isAddingLineup) return
  isPanning.value = true
  panStart.value = { x: e.clientX - pan.value.x, y: e.clientY - pan.value.y }
}

function handleMouseMove(e: MouseEvent) {
  if (svgRef.value) {
    cursorRadarPct.value = clientToSvgRadarPct(svgRef.value, e.clientX, e.clientY, true)
  }
  if (!isPanning.value) return
  const dx = e.clientX - panStart.value.x - pan.value.x
  const dy = e.clientY - panStart.value.y - pan.value.y
  if (Math.hypot(dx, dy) > 4) didDrag.value = true
  pan.value = {
    x: Math.max(-500 * (zoom.value - 1), Math.min(500 * (zoom.value - 1), e.clientX - panStart.value.x)),
    y: Math.max(-500 * (zoom.value - 1), Math.min(500 * (zoom.value - 1), e.clientY - panStart.value.y))
  }
}

function handleMouseUp() {
  isPanning.value = false
}

function handleMouseLeaveCanvas() {
  isPanning.value = false
  cursorRadarPct.value = null
}

function applyDraftPlacement(rawCoords: Point2D) {
  const hasFloors = Boolean(currentMap.value.radarFloors && currentMap.value.radarFloors.length > 0)
  const floor = hasFloors ? lineupStore.activeFloorId : undefined
  if (!isPointInMapBounds(lineupStore.activeMapId, rawCoords, floor)) {
    const snapped = snapPointToMapBounds(lineupStore.activeMapId, rawCoords, floor)
    showBoundsSnapBanner()
    lineupStore.setDraftPoint({ x: snapped.x, y: snapped.y })
  } else {
    lineupStore.setDraftPoint(rawCoords)
  }
}

function handleSvgClick(e: MouseEvent) {
  if (didDrag.value || !svgRef.value) return
  const coords = clientToSvgRadarPct(svgRef.value, e.clientX, e.clientY, true)
  if (!coords) return

  if (lineupStore.isAddingLineup && lineupStore.placementStep !== 'details') {
    applyDraftPlacement(coords)
  } else {
    lineupStore.activeTargetClusterId = null
  }
}

function handleRightClick(e: MouseEvent) {
  e.preventDefault()
  if (!svgRef.value) return
  const coords = clientToSvgRadarPct(svgRef.value, e.clientX, e.clientY, true)
  if (!coords) return

  if (!lineupStore.isAddingLineup) {
    lineupStore.startPlacingLineup()
    applyDraftPlacement(coords)
  } else if (lineupStore.placementStep !== 'details') {
    applyDraftPlacement(coords)
  }
}

function handleTargetClusterClick(cluster: RadarTargetCluster, e: MouseEvent) {
  e.stopPropagation()
  if (lineupStore.isAddingLineup) return

  lineupStore.activeTargetClusterId = cluster.id

  if (!mapStore.clusterTargets) {
    lineupStore.selectLineup(cluster.primaryLineup)
    return
  }

  if (e.detail >= 2 && cluster.lineups.length === 1) {
    lineupStore.openLineup(cluster.primaryLineup)
    return
  }

  if (
    lineupStore.selectedLineup &&
    !cluster.lineups.some((l) => l.id === lineupStore.selectedLineup?.id)
  ) {
    lineupStore.selectLineup(null)
  }
}

function selectLineupFromOriginPin(lineup: Lineup, e: MouseEvent) {
  e.stopPropagation()
  if (lineupStore.isAddingLineup) return
  if (e.detail >= 2) {
    lineupStore.openLineup(lineup)
  } else {
    lineupStore.selectLineup(lineup)
  }
}

function openFullLineupViewer(lineup: Lineup, e?: MouseEvent) {
  if (e) e.stopPropagation()
  if (lineupStore.isAddingLineup) return
  lineupStore.openLineup(lineup)
}

function createLineupFromLivePlayer() {
  const marker = activePlayerMarker.value
  if (!marker) return
  lineupStore.startPlacingLineup()
  applyDraftPlacement({ ...marker.coords })
  if (marker.estimatedLanding) {
    applyDraftPlacement({ ...marker.estimatedLanding })
  }
}

function formatThrowLabel(throwType: string): string {
  switch (throwType) {
    case 'jumpthrow':
      return 'Jumpthrow'
    case 'w_jumpthrow':
      return 'W-Jumpthrow'
    case 'run_jumpthrow':
      return 'Run + Jumpthrow'
    case 'crouch_jumpthrow':
      return 'Crouch + Jumpthrow'
    case 'runthrow':
      return 'Runthrow'
    case 'walkthrow':
      return 'Walkthrow'
    case 'left_right_click':
      return 'L+R Click'
    case 'rightclick':
      return 'Right-Click'
    case 'middleclick':
      return 'Middle-Click'
    case 'crouch':
    case 'crouchthrow':
      return 'Crouch'
    default:
      return 'Standing'
  }
}

function formatMovementLabel(lineup: Lineup): string {
  const move = lineup.movementType || 'stationary'
  const moveMap: Record<string, string> = {
    stationary: 'Stationary',
    walking: 'Walk',
    walk: 'Walk',
    running: 'Run',
    run: 'Run',
    crouched: 'Crouch',
    crouch: 'Crouch',
    crouch_walk: 'Crouch Walk'
  }
  const base = moveMap[move] || move.replace(/_/g, ' ')
  return lineup.movementDetails ? `${base} — ${lineup.movementDetails}` : base
}

function formatOriginTag(lineup: Lineup): string {
  const rawSpot = (lineup.startLocation || 'Origin').trim()
  const shortSpot = rawSpot.length > 18 ? `${rawSpot.slice(0, 16)}…` : rawSpot
  const move = lineup.movementType && lineup.movementType !== 'stationary'
    ? `${lineup.movementType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} `
    : ''
  const throwText = formatThrowLabel(lineup.throwType)
  const actionPart =
    move && !throwText.toLowerCase().includes(move.trim().toLowerCase())
      ? `${move.trim()} + ${throwText}`
      : throwText
  return `${shortSpot} • ${actionPart}`
}

function getOriginTagDimensions(label: string, origin: Point2D) {
  const width = Math.max(118, Math.min(238, Math.round(label.length * 5.6 + 18)))
  const ox = origin.x * 10
  const oy = origin.y * 10
  let dx = 0
  if (ox - width / 2 < 12) dx = 12 - (ox - width / 2)
  else if (ox + width / 2 > 988) dx = 988 - (ox + width / 2)
  const dy = oy < 52 ? 26 : -26
  return { width, dx, dy }
}

function formatClickLabel(clickType?: string): string {
  if (clickType === 'right') return 'Right-Click (M2)'
  if (clickType === 'both') return 'Left + Right Click (M1+M2)'
  return 'Left-Click (M1)'
}

function isClusterHighlighted(cluster: RadarTargetCluster): boolean {
  if (activeCluster.value?.id === cluster.id || hoveredClusterId.value === cluster.id) {
    return true
  }
  if (
    lineupStore.selectedLineup &&
    cluster.lineups.some((l) => l.id === lineupStore.selectedLineup?.id)
  ) {
    return true
  }
  if (
    lineupStore.hoveredLineupId &&
    cluster.lineups.some((l) => l.id === lineupStore.hoveredLineupId)
  ) {
    return true
  }
  if (lineupStore.activeExecuteStepOrder !== null) {
    return cluster.lineups.some(
      (l) => executeStepByLineupId.value.get(l.id)?.order === lineupStore.activeExecuteStepOrder
    )
  }
  return false
}

function isClusterDimmed(cluster: RadarTargetCluster): boolean {
  if (activeCluster.value && activeCluster.value.id !== cluster.id) {
    return true
  }
  if (lineupStore.activeExecuteStepOrder !== null) {
    return !cluster.lineups.some(
      (l) => executeStepByLineupId.value.get(l.id)?.order === lineupStore.activeExecuteStepOrder
    )
  }
  return false
}

function isEntryHighlighted(item: Lineup): boolean {
  if (lineupStore.hoveredLineupId === item.id || lineupStore.selectedLineup?.id === item.id) {
    return true
  }
  if (lineupStore.activeExecuteStepOrder !== null) {
    const step = executeStepByLineupId.value.get(item.id)
    return step?.order === lineupStore.activeExecuteStepOrder
  }
  return false
}

function isEntryDimmed(item: Lineup): boolean {
  if (lineupStore.activeExecuteStepOrder !== null) {
    const step = executeStepByLineupId.value.get(item.id)
    return step?.order !== lineupStore.activeExecuteStepOrder
  }
  if (lineupStore.selectedLineup && lineupStore.selectedLineup.id !== item.id && activeCluster.value) {
    return lineupStore.hoveredLineupId !== item.id
  }
  return false
}

async function copyMapPracticeCmd() {
  const cmd = getMapSwitchConsoleCommand(lineupStore.activeMapId, true)
  try {
    await navigator.clipboard.writeText(cmd)
    copiedMapCmd.value = true
    if (copiedMapCmdTimer) clearTimeout(copiedMapCmdTimer)
    copiedMapCmdTimer = setTimeout(() => {
      copiedMapCmd.value = false
    }, 2000)
  } catch {
    // ignore clipboard permission errors
  }
}

async function copyLineupSetupCmd(lineup: Lineup) {
  const cmd = getLineupSetupConsoleCommand(lineup)
  try {
    await navigator.clipboard.writeText(cmd)
    copiedSetupCmd.value = true
    if (copiedSetupCmdTimer) clearTimeout(copiedSetupCmdTimer)
    copiedSetupCmdTimer = setTimeout(() => {
      copiedSetupCmd.value = false
    }, 2000)
  } catch {
    // ignore clipboard permission errors
  }
}

// Synthesize the 3 side-by-side step previews for Inline All Images mode
function getInlineThreeStages(item: Lineup) {
  const fallback = item.imageUrl || DEFAULT_LINEUP_IMAGE
  const step1 = item.instructionSteps?.find((s) => s.phase === 'position') || item.instructionSteps?.[0]
  const step2 = item.instructionSteps?.find((s) => s.phase === 'aim') || item.instructionSteps?.[1]
  const step3 =
    item.instructionSteps?.find((s) => s.phase === 'movement' || s.phase === 'throw' || s.phase === 'result') ||
    item.instructionSteps?.[2]

  return [
    {
      key: 'stand',
      stepNum: 1,
      badge: '1. Stand Spot',
      accent: 'text-sky-300 border-sky-500/40 bg-sky-500/15',
      title: item.startLocation,
      caption:
        step1?.description ||
        item.instructions?.[0] ||
        `Stand at ${item.startLocation}.`,
      hint: step1?.keybindHint || formatMovementLabel(item),
      image: item.standingScreenshot || step1?.imageUrl || fallback,
      isAim: false
    },
    {
      key: 'aim',
      stepNum: 2,
      badge: '2. Aim Point',
      accent: 'text-amber-300 border-amber-500/40 bg-amber-500/15',
      title: `Aim for ${item.endLocation}`,
      caption:
        step2?.description ||
        item.instructions?.[1] ||
        `Align your crosshair on the reference point toward ${item.endLocation}.`,
      hint:
        step2?.crosshairNote ||
        (item.cs2Pos
          ? `Pitch ${(item.cs2Pos.pitch ?? 0).toFixed(1)}° / Yaw ${(item.cs2Pos.yaw ?? 0).toFixed(1)}°`
          : 'Crosshair Alignment'),
      image: item.aimScreenshot || step2?.imageUrl || fallback,
      isAim: true
    },
    {
      key: 'throw',
      stepNum: 3,
      badge: '3. Movement & Throw',
      accent: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15',
      title: `${formatThrowLabel(item.throwType)}`,
      caption:
        step3?.description ||
        item.instructions?.[2] ||
        `Execute ${formatThrowLabel(item.throwType)} (${formatClickLabel(item.clickType)}) to land at ${item.endLocation}.`,
      hint: `${formatMovementLabel(item)} • ${formatClickLabel(item.clickType)}`,
      image: item.landingScreenshot || step3?.imageUrl || fallback,
      isAim: false
    }
  ]
}
</script>

<template>
  <div
    class="interactive-minimap relative w-full flex flex-col bg-[#070a0f] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl select-none"
  >
    <!-- RADAR TOP TOOLBAR: Map Info, 3-Way Display Mode Toggle, Map Practice CMD & Controls -->
    <div
      class="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/90 border-b border-slate-800/90 z-20"
    >
      <!-- Left: Map Info, Floor Switcher & Radar Toggles -->
      <div class="flex flex-wrap items-center gap-1.5">
        <div
          class="flex items-center gap-2 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800"
        >
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="font-bold text-white tracking-wide uppercase text-xs">
            {{ currentMap.name }}
          </span>
          <span class="text-[10px] font-mono text-slate-400 hidden xl:inline">
            ({{ currentMap.code }})
          </span>
          <span class="h-3 w-px bg-slate-700 mx-0.5"></span>
          <span class="text-[11px] text-amber-400 font-bold">
            {{ safeEntries.length }} Pins
          </span>
        </div>

        <!-- Surface Level Selector (Upper / Lower) for Nuke & Vertigo -->
        <div
          v-if="currentMap.radarFloors && currentMap.radarFloors.length > 0"
          class="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-slate-800"
        >
          <Layers class="w-3.5 h-3.5 text-amber-400 mx-1.5" />
          <button
            v-for="floor in currentMap.radarFloors"
            :key="floor.id"
            @click="lineupStore.activeFloorId = floor.id"
            :class="[
              'px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1',
              lineupStore.activeFloorId === floor.id
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <span>{{ floor.id === 'upper' ? 'Upper' : 'Lower' }}</span>
            <span class="text-[9px] font-mono opacity-80">({{ floorCounts[floor.id] }})</span>
          </button>
        </div>

        <!-- Callouts Toggle -->
        <button
          @click="mapStore.showCallouts = !mapStore.showCallouts"
          :class="[
            'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1',
            mapStore.showCallouts
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          ]"
          title="Toggle CS2 Callout Names on Radar"
        >
          <Tag class="w-3 h-3" />
          <span class="hidden sm:inline">Callouts</span>
        </button>

        <!-- Target-First Clustering Toggle -->
        <button
          @click="mapStore.clusterTargets = !mapStore.clusterTargets"
          :class="[
            'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1',
            mapStore.clusterTargets
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          ]"
          title="Toggle CSNades.gg Target-First Clustering (Click Target -> Pick Origin)"
        >
          <Target class="w-3 h-3" />
          <span class="hidden xl:inline">Target-First</span>
        </button>
      </div>

      <!-- Center: 3-Way Display Mode Toggle (Show All Images | Spot & Movement | Cards) -->
      <div
        class="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800"
        title="Switch Inline & Lineup Display Mode"
      >
        <button
          v-for="mode in displayModes"
          :key="mode.id"
          @click="lineupStore.lineupDisplayMode = mode.id"
          :class="[
            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap',
            lineupStore.lineupDisplayMode === mode.id
              ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
              : 'text-slate-400 hover:text-white'
          ]"
        >
          <component :is="mode.icon" class="w-3 h-3" />
          <span class="hidden md:inline">{{ mode.label }}</span>
          <span class="md:hidden">{{ mode.shortLabel }}</span>
        </button>
      </div>

      <!-- Right: Map Practice CMD, Voice, Settings & Zoom -->
      <div class="flex items-center gap-1.5">
        <!-- 1-Click Map Practice CMD -->
        <button
          @click="copyMapPracticeCmd"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shadow',
            copiedMapCmd
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
          ]"
          :title="getMapSwitchConsoleCommand(lineupStore.activeMapId, true)"
        >
          <Check v-if="copiedMapCmd" class="w-3.5 h-3.5 stroke-[3]" />
          <Terminal v-else class="w-3.5 h-3.5" />
          <span>{{ copiedMapCmd ? 'Copied!' : 'Map Practice CMD' }}</span>
        </button>

        <!-- Quick Voice Search Mic Button -->
        <button
          @click="voiceStore.isPanelOpen = !voiceStore.isPanelOpen"
          :class="[
            'flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer',
            voiceStore.isListening
              ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
              : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
          ]"
          title="Voice Command & Hands-Free Navigation"
        >
          <Mic class="w-3.5 h-3.5" />
          <span class="hidden xl:inline">
            {{ voiceStore.isListening ? 'Listening...' : 'Voice' }}
          </span>
        </button>

        <!-- Radar Settings -->
        <button
          @click="showSettingsModal = true"
          class="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors cursor-pointer"
          title="Radar Display & Skin Settings"
        >
          <SlidersHorizontal class="w-4 h-4" />
        </button>

        <!-- Zoom Controls -->
        <div
          class="hidden sm:flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800"
        >
          <button
            @click="handleZoomOut"
            class="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <span class="text-[10px] font-mono text-slate-300 px-1 min-w-[36px] text-center">
            {{ Math.round(zoom * 100) }}%
          </span>
          <button
            @click="handleZoomIn"
            class="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
          <button
            @click="resetView"
            class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="Reset Radar View"
          >
            <RotateCcw class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- STRICT 1:1 ASPECT-SQUARE PRECISION RADAR CANVAS -->
    <div
      class="relative w-full flex items-center justify-center bg-[#06090e] p-2 sm:p-3 overflow-hidden"
      :class="{
        'cursor-crosshair': lineupStore.isAddingLineup && lineupStore.placementStep !== 'details',
        'cursor-grab': !lineupStore.isAddingLineup && !isPanning,
        'cursor-grabbing': isPanning
      }"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeaveCanvas"
    >
      <!-- Transient Non-Blocking Radar Overlay Banners -->
      <div class="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[85%] pointer-events-none">
        <!-- Active Team Execute Interactive Sequence Banner -->
        <div
          v-if="lineupStore.activeExecute"
          class="flex flex-col gap-1.5 bg-amber-500/15 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-amber-500/40 text-amber-200 shadow-xl pointer-events-auto"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div class="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">
                  Active Team Execute • {{ lineupStore.activeExecute.strategyType || 'Coordinated' }}
                </div>
                <div class="text-xs font-bold text-white">
                  {{ lineupStore.activeExecute.title }}
                </div>
              </div>
            </div>
            <button
              @click="lineupStore.toggleActiveExecute(null)"
              class="p-1 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-700/80 cursor-pointer"
              title="Exit Execute Mode"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              @click="lineupStore.activeExecuteStepOrder = null"
              :class="[
                'px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border',
                lineupStore.activeExecuteStepOrder === null
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
              ]"
            >
              All ({{ lineupStore.activeExecute.lineupIds.length }})
            </button>
            <button
              v-for="lid in lineupStore.activeExecute.lineupIds"
              :key="lid"
              @click="
                lineupStore.activeExecuteStepOrder =
                  lineupStore.activeExecuteStepOrder === executeStepByLineupId.get(lid)?.order
                    ? null
                    : (executeStepByLineupId.get(lid)?.order ?? null)
              "
              :class="[
                'px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border flex items-center gap-1',
                lineupStore.activeExecuteStepOrder === executeStepByLineupId.get(lid)?.order
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
              ]"
            >
              <span>#{{ executeStepByLineupId.get(lid)?.order }}</span>
              <span class="opacity-80">{{ executeStepByLineupId.get(lid)?.role }}</span>
              <span class="text-[9px] opacity-70">
                +{{ executeStepByLineupId.get(lid)?.delaySeconds ?? 0 }}s
              </span>
            </button>
          </div>
        </div>

        <!-- Placement Mode Banner -->
        <div
          v-if="lineupStore.isAddingLineup && lineupStore.placementStep !== 'details'"
          class="bg-amber-500 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 pointer-events-auto"
        >
          <Crosshair class="w-4 h-4 shrink-0" />
          <span v-if="lineupStore.placementStep === 'origin'">
            Step 1: Click inside playable map bounds where you STAND to throw
          </span>
          <span v-else>
            Step 2: Click inside playable map bounds where the grenade LANDS
          </span>
        </div>

        <!-- Auto-Snap Warning Banner when clicking out-of-bounds during placement -->
        <div
          v-if="boundsSnapNotice"
          class="bg-rose-950/95 text-rose-200 border border-rose-500/60 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xl flex items-center gap-2 pointer-events-auto"
        >
          <AlertTriangle class="w-4 h-4 text-rose-400 shrink-0" />
          <span>{{ boundsSnapNotice }}</span>
          <button
            @click="boundsSnapNotice = null"
            class="ml-1 text-rose-300 hover:text-white cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Active Target Zone Pill (Target-First Mode) -->
        <div
          v-if="activeCluster && !lineupStore.isAddingLineup"
          class="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/50 text-xs shadow-lg pointer-events-auto"
        >
          <Target class="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span class="text-white font-bold">
            Target: <span class="text-amber-300">{{ activeCluster.endLocation }}</span>
          </span>
          <span class="text-[10px] text-slate-300 font-mono">
            • {{ activeCluster.lineups.length }} throw {{ activeCluster.lineups.length === 1 ? 'origin' : 'origins' }} (click O pin)
          </span>
          <button
            @click="lineupStore.activeTargetClusterId = null"
            class="ml-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      <!-- 1:1 Square Radar Box -->
      <div
        class="relative w-full max-w-[780px] aspect-square overflow-hidden flex items-center justify-center rounded-xl border border-slate-800/70 bg-[#070a0f]"
      >
        <svg
          ref="svgRef"
          :viewBox="currentMap.viewBox || '0 0 1000 1000'"
          preserveAspectRatio="none"
          class="w-full h-full aspect-square block transition-transform duration-75 ease-out"
          :style="{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }"
          @click="handleSvgClick"
          @contextmenu="handleRightClick"
        >
          <defs>
            <filter id="radar-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- 1. Calibrated 1024x1024 Map Radar Texture & Optional Callouts -->
          <VectorMapBlueprint :map="currentMap" />

          <!-- 2. Background Subtle Trajectories (when showTrajectories is on and no target cluster is locked) -->
          <g
            v-if="mapStore.showTrajectories && !activeCluster && !lineupStore.activeExecute"
            class="ambient-trajectories-layer pointer-events-none"
          >
            <path
              v-for="entry in safeEntries"
              :key="'amb-' + entry.lineup.id"
              :d="computeTrajectoryArc(entry.origin, entry.landing).pathData"
              fill="none"
              :stroke="grenadeColors[entry.lineup.grenadeType].stroke"
              :stroke-width="1.5 * inversePinScale"
              stroke-opacity="0.28"
              stroke-dasharray="6 6"
              stroke-linecap="round"
            />
          </g>

          <!-- 3. Expanded Target-First Trajectories & Throw-Origin Pins (O) with Floating Tags -->
          <g class="expanded-origins-layer">
            <g
              v-for="entry in expandedOriginEntries"
              :key="'exp-' + entry.lineup.id"
              :class="[
                'transition-opacity duration-150',
                isEntryDimmed(entry.lineup) ? 'opacity-45' : 'opacity-100'
              ]"
            >
              <!-- Outer Trajectory Glow when Selected / Hovered -->
              <path
                v-if="isEntryHighlighted(entry.lineup)"
                :d="computeTrajectoryArc(entry.origin, entry.landing).pathData"
                fill="none"
                :stroke="grenadeColors[entry.lineup.grenadeType].stroke"
                :stroke-width="6.5 * inversePinScale"
                stroke-opacity="0.3"
                stroke-linecap="round"
              />

              <!-- Ballistic Flight Arc -->
              <path
                :d="computeTrajectoryArc(entry.origin, entry.landing).pathData"
                fill="none"
                :stroke="grenadeColors[entry.lineup.grenadeType].stroke"
                :stroke-width="(isEntryHighlighted(entry.lineup) ? 3.4 : 2.3) * inversePinScale"
                :stroke-dasharray="isEntryHighlighted(entry.lineup) ? 'none' : '7 5'"
                stroke-linecap="round"
                class="cursor-pointer"
                @mousedown.stop
                @click="selectLineupFromOriginPin(entry.lineup, $event)"
                @dblclick="openFullLineupViewer(entry.lineup, $event)"
                @mouseenter="lineupStore.hoveredLineupId = entry.lineup.id"
                @mouseleave="lineupStore.hoveredLineupId = null"
              />

              <!-- Throw-Origin Pin (O) + Floating Tag: Stand Spot + Movement/Throw Type -->
              <g
                :transform="`translate(${entry.origin.x * 10}, ${entry.origin.y * 10}) scale(${inversePinScale})`"
                class="cursor-pointer"
                @mousedown.stop
                @click="selectLineupFromOriginPin(entry.lineup, $event)"
                @dblclick="openFullLineupViewer(entry.lineup, $event)"
                @mouseenter="lineupStore.hoveredLineupId = entry.lineup.id"
                @mouseleave="lineupStore.hoveredLineupId = null"
              >
                <!-- Hit halo -->
                <circle
                  r="17"
                  fill="transparent"
                />
                <!-- Selected ring -->
                <circle
                  v-if="isEntryHighlighted(entry.lineup)"
                  r="15"
                  :fill="grenadeColors[entry.lineup.grenadeType].stroke"
                  fill-opacity="0.22"
                  :stroke="grenadeColors[entry.lineup.grenadeType].stroke"
                  stroke-width="1.6"
                />
                <!-- Crisp Origin Ring (O) -->
                <circle
                  r="10.5"
                  fill="#090d16"
                  fill-opacity="0.96"
                  :stroke="grenadeColors[entry.lineup.grenadeType].stroke"
                  :stroke-width="isEntryHighlighted(entry.lineup) ? 3.2 : 2.5"
                />
                <circle
                  r="4"
                  :fill="grenadeColors[entry.lineup.grenadeType].stroke"
                />

                <!-- Floating Tag: Stand Spot + Movement / Throw Type -->
                <g
                  :transform="`translate(${getOriginTagDimensions(formatOriginTag(entry.lineup), entry.origin).dx}, ${getOriginTagDimensions(formatOriginTag(entry.lineup), entry.origin).dy})`"
                >
                  <rect
                    :x="-getOriginTagDimensions(formatOriginTag(entry.lineup), entry.origin).width / 2"
                    y="-11"
                    :width="getOriginTagDimensions(formatOriginTag(entry.lineup), entry.origin).width"
                    height="20"
                    rx="6"
                    :fill="isEntryHighlighted(entry.lineup) ? '#0f172a' : '#090d16'"
                    fill-opacity="0.95"
                    :stroke="
                      isEntryHighlighted(entry.lineup)
                        ? '#f59e0b'
                        : grenadeColors[entry.lineup.grenadeType].stroke
                    "
                    :stroke-width="isEntryHighlighted(entry.lineup) ? 1.8 : 1.1"
                  />
                  <text
                    x="0"
                    y="2.5"
                    text-anchor="middle"
                    fill="#f8fafc"
                    font-size="9.5"
                    font-weight="800"
                    font-family="Inter, system-ui, sans-serif"
                  >
                    {{ formatOriginTag(entry.lineup) }}
                  </text>
                </g>
              </g>
            </g>
          </g>

          <!-- 4. Landing Target Cluster Pins (X / Grenade Circle) -->
          <g class="landing-pins-layer">
            <g
              v-for="cluster in targetClusters"
              :key="cluster.id"
              :transform="`translate(${cluster.coords.x * 10}, ${cluster.coords.y * 10}) scale(${inversePinScale})`"
              :class="[
                'cursor-pointer transition-opacity duration-200',
                isClusterDimmed(cluster) ? 'opacity-25' : 'opacity-100'
              ]"
              @mousedown.stop
              @click="handleTargetClusterClick(cluster, $event)"
              @mouseenter="hoveredClusterId = cluster.id"
              @mouseleave="hoveredClusterId = null"
            >
              <!-- Soft Smoke/Molly Area-of-Effect Bloom Ring on Hover / Active Cluster -->
              <circle
                v-if="isClusterHighlighted(cluster)"
                :r="cluster.grenadeType === 'smoke' ? 38 : cluster.grenadeType === 'molotov' ? 30 : 24"
                :fill="grenadeColors[cluster.grenadeType].stroke"
                fill-opacity="0.16"
                :stroke="grenadeColors[cluster.grenadeType].stroke"
                stroke-width="1.6"
                stroke-dasharray="4 3"
              />

              <!-- Active Target Ring -->
              <circle
                v-if="activeCluster?.id === cluster.id"
                r="20"
                fill="none"
                stroke="#f59e0b"
                stroke-width="2"
              />

              <!-- Main Target Pin Circle -->
              <circle
                :r="isClusterHighlighted(cluster) ? 16 : 13.5"
                :fill="grenadeColors[cluster.grenadeType].fill"
                :stroke="
                  activeCluster?.id === cluster.id
                    ? '#f59e0b'
                    : grenadeColors[cluster.grenadeType].stroke
                "
                :stroke-width="isClusterHighlighted(cluster) ? 3 : 2.2"
              />

              <!-- Active Target X Reticle or Grenade Type Glyph Inside Pin -->
              <g
                v-if="activeCluster?.id === cluster.id"
                stroke="#fef3c7"
                stroke-width="2.4"
                stroke-linecap="round"
              >
                <line x1="-5.5" y1="-5.5" x2="5.5" y2="5.5" />
                <line x1="5.5" y1="-5.5" x2="-5.5" y2="5.5" />
              </g>
              <g v-else-if="cluster.grenadeType === 'smoke'" fill="none" stroke="#e0f2fe" stroke-width="1.8">
                <path d="M-5 2a3.5 3.5 0 0 1 0-6 4.5 4.5 0 0 1 8.5-1 3.5 3.5 0 0 1 1.5 7Z" />
              </g>
              <g v-else-if="cluster.grenadeType === 'flash'" fill="none" stroke="#fef08a" stroke-width="1.8">
                <polygon points="1,-7 -5,1 0,1 -1,7 5,-1 0,-1" />
              </g>
              <g v-else-if="cluster.grenadeType === 'molotov'" fill="none" stroke="#ffedd5" stroke-width="1.8">
                <path d="M0 -7c2.5 3 5 5 5 8.5a5 5 0 0 1-10 0C-5 -2 -2.5 0 0 -7Z" />
              </g>
              <g v-else-if="cluster.grenadeType === 'decoy'" fill="none" stroke="#f3e8ff" stroke-width="1.8">
                <circle cx="0" cy="0" r="5" />
                <circle cx="0" cy="0" r="1.8" fill="#f3e8ff" />
              </g>
              <g v-else fill="none" stroke="#fee2e2" stroke-width="1.8">
                <circle cx="0" cy="1" r="5.5" />
                <line x1="0" y1="-4.5" x2="0" y2="-7.5" />
              </g>

              <!-- Cluster Lineup Count Badge (when > 1 throw origin shares this target) -->
              <g
                v-if="cluster.lineups.length > 1"
                transform="translate(11, 10)"
              >
                <circle
                  r="8"
                  fill="#090d16"
                  :stroke="grenadeColors[cluster.grenadeType].stroke"
                  stroke-width="1.5"
                />
                <text
                  x="0"
                  y="3"
                  text-anchor="middle"
                  fill="#f8fafc"
                  font-size="9"
                  font-weight="900"
                  font-family="Inter, system-ui, sans-serif"
                >
                  {{ cluster.lineups.length }}
                </text>
              </g>

              <!-- Team Execute Sequence Number & Role Badge -->
              <g
                v-if="executeStepByLineupId.has(cluster.primaryLineup.id)"
                transform="translate(12, -14)"
              >
                <rect
                  x="-10"
                  y="-9"
                  width="58"
                  height="18"
                  rx="9"
                  fill="#f59e0b"
                  stroke="#090d16"
                  stroke-width="1.5"
                />
                <text
                  x="19"
                  y="3.5"
                  text-anchor="middle"
                  fill="#090d16"
                  font-size="9.5"
                  font-weight="900"
                  font-family="Inter, system-ui, sans-serif"
                >
                  #{{ executeStepByLineupId.get(cluster.primaryLineup.id)?.order }}
                  {{ executeStepByLineupId.get(cluster.primaryLineup.id)?.role?.slice(0, 3).toUpperCase() }}
                </text>
              </g>

              <!-- Hover / Always-On Target Label Tooltip -->
              <g
                v-if="mapStore.showLabels || isClusterHighlighted(cluster)"
                transform="translate(0, -25)"
              >
                <rect
                  x="-82"
                  y="-14"
                  width="164"
                  height="20"
                  rx="5"
                  fill="#090d16"
                  fill-opacity="0.94"
                  :stroke="
                    activeCluster?.id === cluster.id
                      ? '#f59e0b'
                      : grenadeColors[cluster.grenadeType].stroke
                  "
                  stroke-width="1.2"
                />
                <text
                  x="0"
                  y="-1"
                  text-anchor="middle"
                  fill="#f8fafc"
                  font-size="9.5"
                  font-weight="700"
                  font-family="Inter, system-ui, sans-serif"
                >
                  {{ cluster.endLocation }}
                  {{ cluster.lineups.length > 1 ? `(${cluster.lineups.length})` : `(${formatThrowLabel(cluster.primaryLineup.throwType)})` }}
                </text>
              </g>
            </g>
          </g>

          <!-- 5. Live CS2 Player Telemetry Marker & View-Angle Cone -->
          <g
            v-if="activePlayerMarker"
            class="live-cs2-player-layer"
          >
            <g v-if="activePlayerMarker.estimatedLanding">
              <line
                :x1="activePlayerMarker.coords.x * 10"
                :y1="activePlayerMarker.coords.y * 10"
                :x2="activePlayerMarker.estimatedLanding.x * 10"
                :y2="activePlayerMarker.estimatedLanding.y * 10"
                stroke="#10b981"
                :stroke-width="2 * inversePinScale"
                stroke-dasharray="5 5"
              />
              <circle
                :cx="activePlayerMarker.estimatedLanding.x * 10"
                :cy="activePlayerMarker.estimatedLanding.y * 10"
                :r="8 * inversePinScale"
                fill="none"
                stroke="#10b981"
                :stroke-width="2 * inversePinScale"
              />
            </g>

            <g
              :transform="`translate(${activePlayerMarker.coords.x * 10}, ${activePlayerMarker.coords.y * 10}) scale(${inversePinScale})`"
            >
              <circle r="18" fill="#10b981" fill-opacity="0.22" />
              <line
                x1="0"
                y1="0"
                :x2="activePlayerMarker.lookVec.x * 3.2"
                :y2="activePlayerMarker.lookVec.y * 3.2"
                stroke="#34d399"
                stroke-width="3"
                stroke-linecap="round"
              />
              <circle r="9" fill="#10b981" stroke="#052e16" stroke-width="2.5" />
              <circle r="3" fill="#ecfdf5" />
              <g transform="translate(0, 22)">
                <rect
                  x="-52"
                  y="-9"
                  width="104"
                  height="17"
                  rx="4"
                  fill="#064e3b"
                  stroke="#10b981"
                  stroke-width="1"
                />
                <text
                  x="0"
                  y="2.5"
                  text-anchor="middle"
                  fill="#ecfdf5"
                  font-size="9"
                  font-weight="800"
                >
                  CS2 POS ({{ activePlayerMarker.source }})
                </text>
              </g>
            </g>
          </g>

          <!-- 6. Draft Placement Pins (when creating/editing a lineup) -->
          <g v-if="lineupStore.isAddingLineup">
            <line
              v-if="lineupStore.draftOriginCoords && lineupStore.draftLandingCoords"
              :x1="lineupStore.draftOriginCoords.x * 10"
              :y1="lineupStore.draftOriginCoords.y * 10"
              :x2="lineupStore.draftLandingCoords.x * 10"
              :y2="lineupStore.draftLandingCoords.y * 10"
              stroke="#f59e0b"
              stroke-width="3"
              stroke-dasharray="7 5"
            />
            <g
              v-if="lineupStore.draftOriginCoords"
              :transform="`translate(${lineupStore.draftOriginCoords.x * 10}, ${lineupStore.draftOriginCoords.y * 10}) scale(${inversePinScale})`"
            >
              <circle r="12" fill="#f59e0b" stroke="#090d16" stroke-width="2.5" />
              <text x="0" y="3.5" text-anchor="middle" fill="#090d16" font-size="9" font-weight="900">
                1
              </text>
            </g>
            <g
              v-if="lineupStore.draftLandingCoords"
              :transform="`translate(${lineupStore.draftLandingCoords.x * 10}, ${lineupStore.draftLandingCoords.y * 10}) scale(${inversePinScale})`"
            >
              <circle r="14" fill="#10b981" stroke="#090d16" stroke-width="2.5" />
              <text x="0" y="3.5" text-anchor="middle" fill="#090d16" font-size="9" font-weight="900">
                2
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>

    <!-- BOTTOM RADAR TELEMETRY BAR: Legend, Live CS2 Coords, Bounds Indicator & Placement Controls -->
    <div
      class="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/90 border-t border-slate-800/90 text-[11px] text-slate-300"
    >
      <!-- Left: Grenade Legend + Live CS2 Coordinate Readout + IN BOUNDS / OUT OF BOUNDS -->
      <div class="flex flex-wrap items-center gap-2.5">
        <div class="flex items-center gap-2.5 text-[11px]">
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Smoke</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            <span>Flash</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
            <span>Molly</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-full bg-red-400"></span>
            <span>HE</span>
          </div>
        </div>

        <span class="h-3.5 w-px bg-slate-800 hidden sm:inline"></span>

        <!-- Live Cursor CS2 World (X, Y), Radar %, Callout & Bounds Pill -->
        <template v-if="cursorRadarPct && cursorWorld">
          <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-400">
            <span class="text-amber-400 font-bold">
              CS2: X {{ cursorWorld.x }} Y {{ cursorWorld.y }}
            </span>
            <span>|</span>
            <span>Radar: {{ cursorRadarPct.x.toFixed(1) }}%, {{ cursorRadarPct.y.toFixed(1) }}%</span>
            <span v-if="cursorCallout" class="text-sky-300 font-sans font-bold">
              • {{ cursorCallout.name }}
            </span>
            <span
              :class="[
                'px-2 py-0.5 rounded-md font-sans font-extrabold uppercase tracking-wide border flex items-center gap-1',
                isCursorInBounds
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
              ]"
            >
              <ShieldCheck v-if="isCursorInBounds" class="w-3 h-3" />
              <AlertTriangle v-else class="w-3 h-3" />
              <span>{{ isCursorInBounds ? '✓ IN BOUNDS' : '⚠️ OUT OF BOUNDS' }}</span>
            </span>
          </div>
        </template>
        <span v-else class="text-[10px] font-mono text-slate-500 hidden sm:inline">
          Click a target pin (X) → pick throw origin (O) • Hover radar for CS2 X/Y & bounds
        </span>
      </div>

      <!-- Right: Live CS2 Capture Action or New Lineup Button -->
      <div class="flex items-center gap-2">
        <button
          v-if="activePlayerMarker && !lineupStore.isAddingLineup"
          @click="createLineupFromLivePlayer"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
        >
          <Navigation class="w-3.5 h-3.5" />
          <span>Use CS2 Pos ({{ activePlayerMarker.worldPos?.x }}, {{ activePlayerMarker.worldPos?.y }})</span>
        </button>

        <button
          v-if="!lineupStore.isAddingLineup"
          @click="lineupStore.startPlacingLineup()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Lineup</span>
        </button>
        <button
          v-else
          @click="lineupStore.cancelPlacingLineup()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
          <span>Cancel Placement</span>
        </button>
      </div>
    </div>

    <!-- TARGET CLUSTER ORIGIN CHIPS (Quick Pick Origin Spot when Target Pin is Selected) -->
    <div
      v-if="activeCluster && activeCluster.lineups.length > 0"
      class="w-full px-3 py-2 bg-slate-900/90 border-t border-slate-800/80 flex flex-wrap items-center gap-2"
    >
      <span class="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
        <Target class="w-3 h-3" />
        <span>Throw Origins → {{ activeCluster.endLocation }}:</span>
      </span>
      <button
        v-for="item in activeCluster.lineups"
        :key="'chip-' + item.id"
        @click="lineupStore.selectLineup(item)"
        @dblclick="openFullLineupViewer(item)"
        :class="[
          'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5',
          lineupStore.selectedLineup?.id === item.id
            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
            : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-500/50'
        ]"
      >
        <span class="font-mono text-[10px] opacity-80">O</span>
        <span>{{ formatOriginTag(item) }}</span>
      </button>
    </div>

    <!-- INLINE RADAR LINEUP INSPECTOR PANEL (Opens on Origin Pin Select without Forcing Fullscreen Modal) -->
    <div
      v-if="lineupStore.selectedLineup"
      class="w-full bg-slate-900/95 border-t-2 border-amber-500/50 p-3.5 sm:p-4 flex flex-col gap-3 animate-fade-in"
    >
      <!-- Inspector Header & Action Buttons -->
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-start gap-2.5 min-w-0">
          <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            <NadeIcon :type="lineupStore.selectedLineup.grenadeType" :size="20" :filled="true" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                :class="[
                  'px-2 py-0.5 rounded text-[10px] font-black uppercase',
                  lineupStore.selectedLineup.side === 't'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : lineupStore.selectedLineup.side === 'ct'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                ]"
              >
                {{ lineupStore.selectedLineup.side.toUpperCase() }} Side
              </span>
              <span
                v-if="lineupStore.selectedLineup.radarFloor"
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30"
              >
                {{ lineupStore.selectedLineup.radarFloor }} Floor
              </span>
              <span
                v-if="lineupStore.selectedLineup.sourceWebsite"
                class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
              >
                {{ lineupStore.selectedLineup.sourceWebsite }}
              </span>
              <span
                v-if="lineupStore.selectedLineup.proPlayer"
                class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              >
                ★ {{ lineupStore.selectedLineup.proPlayer }}
              </span>
            </div>
            <h3 class="text-sm sm:text-base font-black text-white mt-1 truncate">
              {{ lineupStore.selectedLineup.title }}
            </h3>
          </div>
        </div>

        <!-- Quick Actions: Copy Setup CMD, + My Book / In Book, Full Modal, Close -->
        <div class="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            @click="copyLineupSetupCmd(lineupStore.selectedLineup)"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
              copiedSetupCmd
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-950 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
            ]"
            :title="getLineupSetupConsoleCommand(lineupStore.selectedLineup)"
          >
            <Check v-if="copiedSetupCmd" class="w-3.5 h-3.5 stroke-[3]" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ copiedSetupCmd ? 'Copied!' : 'Copy Setup CMD' }}</span>
          </button>

          <button
            @click="lineupStore.togglePersonalBook(lineupStore.selectedLineup)"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
              lineupStore.isInPersonalBook(lineupStore.selectedLineup.id)
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-amber-500/40'
            ]"
          >
            <BookmarkCheck
              v-if="lineupStore.isInPersonalBook(lineupStore.selectedLineup.id)"
              class="w-3.5 h-3.5"
            />
            <Bookmark v-else class="w-3.5 h-3.5" />
            <span>
              {{ lineupStore.isInPersonalBook(lineupStore.selectedLineup.id) ? '✓ In Book' : '+ My Book' }}
            </span>
          </button>

          <button
            @click="openFullLineupViewer(lineupStore.selectedLineup)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow"
            title="Open Full Viewer"
          >
            <Maximize2 class="w-3.5 h-3.5" />
            <span>Full Modal</span>
          </button>

          <button
            @click="lineupStore.selectLineup(null)"
            class="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Core Tactical Details Strip (Always visible in Inspector) -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
        <div class="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-0.5">
          <span class="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <MapPin class="w-3 h-3 text-sky-400" /> Stand Spot
          </span>
          <span class="font-bold text-white truncate">{{ lineupStore.selectedLineup.startLocation }}</span>
        </div>

        <div class="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-0.5">
          <span class="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Target class="w-3 h-3 text-emerald-400" /> Target Callout
          </span>
          <span class="font-bold text-white truncate">{{ lineupStore.selectedLineup.endLocation }}</span>
        </div>

        <div class="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-0.5">
          <span class="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Footprints class="w-3 h-3 text-amber-400" /> Movement
          </span>
          <span class="font-bold text-amber-300 truncate">
            {{ formatMovementLabel(lineupStore.selectedLineup) }}
          </span>
        </div>

        <div class="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-0.5">
          <span class="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Zap class="w-3 h-3 text-purple-400" /> Throw Technique
          </span>
          <span class="font-bold text-white uppercase font-mono truncate">
            {{ formatThrowLabel(lineupStore.selectedLineup.throwType) }}
          </span>
        </div>

        <div class="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-0.5 col-span-2 sm:col-span-1">
          <span class="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <MousePointerClick class="w-3 h-3 text-cyan-400" /> Click Type
          </span>
          <span class="font-bold text-white truncate">
            {{ formatClickLabel(lineupStore.selectedLineup.clickType) }}
          </span>
        </div>
      </div>

      <!-- MODE 1: 'all_images' -> 3 Side-by-Side Inline Visual Previews (Zero Clicking Needed) -->
      <div
        v-if="lineupStore.lineupDisplayMode === 'all_images'"
        class="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <div
          v-for="stage in getInlineThreeStages(lineupStore.selectedLineup)"
          :key="stage.key"
          class="flex flex-col rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-md"
        >
          <div class="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-800/80">
            <span
              :class="[
                'px-2 py-0.5 rounded-md text-[10px] font-black uppercase border',
                stage.accent
              ]"
            >
              {{ stage.badge }}
            </span>
            <span class="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
              {{ stage.title }}
            </span>
          </div>

          <div
            class="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-pointer group"
            @click="openFullLineupViewer(lineupStore.selectedLineup)"
          >
            <img
              :src="stage.image"
              :alt="stage.title"
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <!-- Precision Crosshair Reticle Overlay on Step 2 (Aim Point) -->
            <div
              v-if="stage.isAim"
              class="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div class="relative flex items-center justify-center">
                <div class="w-7 h-7 rounded-full border-2 border-emerald-400 bg-emerald-500/10"></div>
                <div class="w-9 h-0.5 bg-emerald-400 absolute"></div>
                <div class="h-9 w-0.5 bg-emerald-400 absolute"></div>
              </div>
            </div>
            <div
              class="absolute bottom-2 left-2 right-2 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/80 text-[10px] font-mono text-emerald-300 truncate"
            >
              {{ stage.hint }}
            </div>
          </div>

          <div class="p-2.5 text-[11px] text-slate-300 leading-snug">
            {{ stage.caption }}
          </div>
        </div>
      </div>

      <!-- MODE 2: 'spot_movement' -> Clean Compact Spot + Movement HUD Strip -->
      <div
        v-else-if="lineupStore.lineupDisplayMode === 'spot_movement'"
        class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div class="flex flex-wrap items-center gap-2 text-slate-200">
          <span class="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
            📍 Stand: {{ lineupStore.selectedLineup.startLocation }}
          </span>
          <span class="text-slate-500">→</span>
          <span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
            🎯 Target: {{ lineupStore.selectedLineup.endLocation }}
          </span>
          <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
            🏃 {{ formatMovementLabel(lineupStore.selectedLineup) }}
          </span>
          <span class="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-bold uppercase">
            ⚡ {{ formatThrowLabel(lineupStore.selectedLineup.throwType) }}
          </span>
        </div>
        <div class="text-[11px] text-slate-400 font-mono truncate max-w-full">
          {{ getLineupSetupConsoleCommand(lineupStore.selectedLineup) }}
        </div>
      </div>

      <!-- MODE 3: 'cards' -> Concise Steps Summary + Quick Open Hint -->
      <div
        v-else
        class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
      >
        <div class="flex flex-col gap-1 min-w-0">
          <p v-if="lineupStore.selectedLineup.description" class="text-slate-300 line-clamp-2">
            {{ lineupStore.selectedLineup.description }}
          </p>
          <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span
              v-for="(stepText, idx) in (lineupStore.selectedLineup.instructions || []).slice(0, 3)"
              :key="idx"
              class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
            >
              <strong class="text-amber-400">{{ idx + 1 }}.</strong> {{ stepText }}
            </span>
          </div>
        </div>
        <button
          @click="lineupStore.lineupDisplayMode = 'all_images'"
          class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[11px] font-bold shrink-0 cursor-pointer"
        >
          Show 3 Step Images Inline
        </button>
      </div>
    </div>

    <MapSettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />
  </div>
</template>
