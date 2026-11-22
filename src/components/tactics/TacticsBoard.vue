<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useStratStore } from '../../stores/stratStore'
import { useGameRoomStore } from '../../stores/gameRoomStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import VectorMapBlueprint from '../map/VectorMapBlueprint.vue'
import { isPointInMapBounds, snapPointToMapBounds } from '../../core/radar/mapBounds'
import type { TacticsElement, TacticsElementType, DirectMessage, Strategy } from '../../types'
import axios from 'axios'
import { generateConversationSecret, encryptMessage, decryptMessage } from '../../utils/crypto'
import {
  Move,
  ArrowUpRight,
  Minus,
  User,
  Trash2,
  RotateCcw,
  RotateCw,
  Type,
  Flame,
  Zap,
  Cloud,
  Crosshair,
  PenTool,
  Eraser,
  Eye,
  Share2,
  Check,
  Radio,
  Sparkles,
  Settings2,
  Plus,
  X,
  Bomb,
  Crown,
  Users,
  Ghost,
  RefreshCw,
  Save,
  AlertTriangle,
  MessageSquare,
  Send,
  Lock,
  ChevronDown,
  UserX,
  Download,
  Upload,
  CloudUpload,
  BookOpen,
  History,
  Tag,
  LogIn,
  Shield,
  CheckCircle2,
  Layers,
  MapPin,
  Search,
  BookmarkCheck
} from 'lucide-vue-next'
import { useConfirmDialog } from '../../composables/useConfirmDialog'

const mapStore = useMapStore()
const stratStore = useStratStore()
const gameRoomStore = useGameRoomStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const { confirmAction } = useConfirmDialog()

const CT_LEGEND_STORAGE_KEY = 'cs2_tactics_ct_legend_v1'
const TIMELINE_STORAGE_KEY = 'cs2_tactics_timeline_history_v1'
const ACTIVE_STRAT_STORAGE_KEY = 'cs2_stratbook_selected_tactics_strat_id'

// ============================================================================
// 1. CT & T PLAYER PIN LEGEND WITH CUSTOM NAMES (PERSISTED PER MAP)
// ============================================================================
export interface MapPinLegendConfig {
  ct: Record<string, string>
  t: Record<string, string>
}

const DEFAULT_CT_ROLES: Record<string, string> = {
  '1': 'B Anchor',
  '2': 'B Rotator',
  '3': 'Mid AWPer',
  '4': 'Connector',
  '5': 'A Anchor'
}

const DEFAULT_T_ROLES: Record<string, string> = {
  '1': 'IGL',
  '2': 'Entry',
  '3': 'Support',
  '4': 'AWPer',
  '5': 'Lurker'
}

const legendByMap = ref<Record<string, MapPinLegendConfig>>({})
const activeLegendTeamTab = ref<'ct' | 't'>('ct')
const isLegendPanelOpen = ref(true)

function ensureMapLegend(mapId: string): MapPinLegendConfig {
  if (!legendByMap.value[mapId]) {
    legendByMap.value[mapId] = {
      ct: { ...DEFAULT_CT_ROLES },
      t: { ...DEFAULT_T_ROLES }
    }
  }
  return legendByMap.value[mapId]
}

const currentCtLegend = computed<Record<string, string>>(() => {
  return ensureMapLegend(mapStore.currentMapId).ct
})

const currentTLegend = computed<Record<string, string>>(() => {
  return ensureMapLegend(mapStore.currentMapId).t
})

function loadLegendFromStorage() {
  try {
    const raw = localStorage.getItem(CT_LEGEND_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        legendByMap.value = parsed
      }
    }
  } catch (e) {
    console.error('Failed to load CT legend from storage', e)
  }
  ensureMapLegend(mapStore.currentMapId)
}

function saveLegendToStorage() {
  try {
    localStorage.setItem(CT_LEGEND_STORAGE_KEY, JSON.stringify(legendByMap.value))
  } catch (e) {
    console.error('Failed to save CT legend to storage', e)
  }
}

function updateLegendName(team: 'ct' | 't', num: string, name: string) {
  const cfg = ensureMapLegend(mapStore.currentMapId)
  cfg[team][num] = name
  saveLegendToStorage()
}

function resetCurrentMapLegend(team: 'ct' | 't') {
  const cfg = ensureMapLegend(mapStore.currentMapId)
  cfg[team] = team === 'ct' ? { ...DEFAULT_CT_ROLES } : { ...DEFAULT_T_ROLES }
  saveLegendToStorage()
  showStatusNotice(`${team.toUpperCase()} 1-5 Legend reset to default roles`)
}

function getPinCustomLabel(el: TacticsElement): string {
  const num = String(el.playerNum || '1')
  if (el.type === 'player_ct') {
    return (currentCtLegend.value[num] || el.playerRole || '').trim()
  }
  if (el.type === 'player_t') {
    return (currentTLegend.value[num] || el.playerRole || '').trim()
  }
  return (el.playerRole || '').trim()
}

function getSmartDefaultPinCoords(team: 'ct' | 't', slotNum: number): { x: number; y: number } {
  const m = mapStore.currentMap
  const siteA = m?.sites?.a || { x: 65, y: 35 }
  const siteB = m?.sites?.b || { x: 30, y: 35 }
  const midX = (siteA.x + siteB.x) / 2
  const midY = (siteA.y + siteB.y) / 2

  // First check if a matching strategy exists for this map & side
  const matchingStrat = stratStore.currentMapStrats.find(s => s.side === team)
  const assignment = matchingStrat?.phases?.[0]?.playerAssignments?.find(a => a.slot === slotNum)
  if (assignment?.position) {
    const snapped = snapPointToMapBounds(mapStore.currentMapId, assignment.position)
    return { x: snapped.x, y: snapped.y }
  }

  let candidate = { x: 50, y: 50 }
  if (team === 'ct') {
    const ctPresets: Record<number, { x: number; y: number }> = {
      1: { x: siteB.x, y: siteB.y },
      2: { x: (siteB.x + midX) / 2, y: (siteB.y + midY) / 2 },
      3: { x: midX, y: midY },
      4: { x: (siteA.x + midX) / 2, y: (siteA.y + midY) / 2 },
      5: { x: siteA.x, y: siteA.y }
    }
    candidate = ctPresets[slotNum] || { x: midX, y: midY }
  } else {
    const spawnCallout = m?.callouts?.find(c => c.site === 'Spawn' && /t\s*spawn/i.test(c.name))
    const base = spawnCallout?.coords || { x: midX, y: Math.min(88, Math.max(siteA.y, siteB.y) + 25) }
    const offsets: Record<number, { dx: number; dy: number }> = {
      1: { dx: 0, dy: 0 },
      2: { dx: -6, dy: -4 },
      3: { dx: 6, dy: -4 },
      4: { dx: -10, dy: 2 },
      5: { dx: 10, dy: 2 }
    }
    const off = offsets[slotNum] || { dx: 0, dy: 0 }
    candidate = { x: base.x + off.dx, y: base.y + off.dy }
  }

  const snapped = snapPointToMapBounds(mapStore.currentMapId, candidate)
  return { x: snapped.x, y: snapped.y }
}

function placeOrFocusSinglePin(team: 'ct' | 't', numStr: string) {
  if (!canUserDraw()) {
    showLockedNotice()
    return
  }
  const pinType = team === 'ct' ? 'player_ct' : 'player_t'
  const existing = stratStore.boardElements.find(e => e.type === pinType && String(e.playerNum) === numStr)
  if (existing) {
    selectedElementId.value = existing.id
    stratStore.activeTool = 'select'
    showStatusNotice(`Selected ${team.toUpperCase()} #${numStr} (${getPinCustomLabel(existing) || 'Pin'})`)
    return
  }

  const slotNum = Number(numStr) || 1
  const coords = getSmartDefaultPinCoords(team, slotNum)
  const label = team === 'ct' ? currentCtLegend.value[numStr] : currentTLegend.value[numStr]

  addElement(
    {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: pinType,
      color: team === 'ct' ? '#0ea5e9' : '#f97316',
      points: [coords],
      playerNum: numStr,
      playerRole: label || undefined,
      radius: 15,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    },
    `Placed ${team.toUpperCase()} #${numStr}${label ? ` (${label})` : ''}`
  )
}

function handlePlaceAllTeamPins(team: 'ct' | 't') {
  if (!canUserDraw()) {
    showLockedNotice()
    return
  }
  const pinType = team === 'ct' ? 'player_ct' : 'player_t'
  const s = getActiveSocket()

  // Remove existing pins of that team first so we cleanly place 1..5
  const existingIds = stratStore.boardElements.filter(e => e.type === pinType).map(e => e.id)
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  existingIds.forEach(id => {
    stratStore.removeBoardElement(id, { userId: currentUserId })
    if (s && s.connected) {
      s.emit('room:element_remove', { elementId: id, mapId: mapStore.currentMapId })
    }
  })

  for (let slot = 1; slot <= 5; slot++) {
    const numStr = String(slot)
    const coords = getSmartDefaultPinCoords(team, slot)
    const label = team === 'ct' ? currentCtLegend.value[numStr] : currentTLegend.value[numStr]
    const el: TacticsElement = {
      id: `el-${Date.now()}-${slot}-${Math.random().toString(36).slice(2, 6)}`,
      type: pinType,
      color: team === 'ct' ? '#0ea5e9' : '#f97316',
      points: [coords],
      playerNum: numStr,
      playerRole: label || undefined,
      radius: 15,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    }
    stratStore.addBoardElement(el, { userId: currentUserId, username: authStore.currentUser?.username })
    if (s && s.connected) {
      s.emit('room:element_add', { element: el, mapId: mapStore.currentMapId })
    }
  }

  recordTimelineSnapshot(`Placed ${team.toUpperCase()} 1-5 Setup`)
  showStatusNotice(`Placed ${team.toUpperCase()} 1-5 pins in playable map bounds`)
}

// ============================================================================
// 2. STRICT PLACEMENT RULES: CT/T IN-BOUNDS + SITE-ONLY C4 BOMB (A OR B ONLY)
// ============================================================================
const BOMBSITE_PLANT_RADIUS = 11.0 // 11% radar units around Site A or Site B

function enforcePlayerPinInBounds(
  rawCoords: { x: number; y: number },
  teamLabel: 'CT' | 'T',
  notifyOnSnap = true
): { x: number; y: number; wasSnapped: boolean } {
  if (isPointInMapBounds(mapStore.currentMapId, rawCoords)) {
    return { x: rawCoords.x, y: rawCoords.y, wasSnapped: false }
  }
  const snapped = snapPointToMapBounds(mapStore.currentMapId, rawCoords)
  if (notifyOnSnap) {
    showStatusNotice(`${teamLabel} Pin snapped to playable map bounds`)
  }
  return { x: snapped.x, y: snapped.y, wasSnapped: true }
}

function getValidBombsiteAnchors(): Array<{ site: 'A' | 'B'; coords: { x: number; y: number } }> {
  const m = mapStore.currentMap
  const anchors: Array<{ site: 'A' | 'B'; coords: { x: number; y: number } }> = []
  if (m?.sites?.a) {
    anchors.push({ site: 'A', coords: m.sites.a })
  }
  if (m?.sites?.b) {
    anchors.push({ site: 'B', coords: m.sites.b })
  }
  if (m?.callouts) {
    for (const c of m.callouts) {
      if ((c.site === 'A' || c.site === 'B') && /\b(site|default|plant)\b/i.test(c.name)) {
        anchors.push({ site: c.site, coords: c.coords })
      }
    }
  }
  return anchors
}

function validateAndSnapC4BombCoords(
  rawCoords: { x: number; y: number },
  notifyOnSnap = true
): { x: number; y: number; wasSnapped: boolean; site: 'A' | 'B' } {
  const anchors = getValidBombsiteAnchors()
  const siteACenter = mapStore.currentMap?.sites?.a || { x: 65, y: 35 }
  const siteBCenter = mapStore.currentMap?.sites?.b || { x: 30, y: 35 }

  const inPlayableBounds = isPointInMapBounds(mapStore.currentMapId, rawCoords)
  if (inPlayableBounds) {
    for (const anchor of anchors) {
      const dist = Math.hypot(rawCoords.x - anchor.coords.x, rawCoords.y - anchor.coords.y)
      if (dist <= BOMBSITE_PLANT_RADIUS) {
        return {
          x: rawCoords.x,
          y: rawCoords.y,
          wasSnapped: false,
          site: anchor.site
        }
      }
    }
  }

  // Outside Bombsite A/B or out of playable bounds: snap to nearest bombsite center (A or B)
  const distA = Math.hypot(rawCoords.x - siteACenter.x, rawCoords.y - siteACenter.y)
  const distB = Math.hypot(rawCoords.x - siteBCenter.x, rawCoords.y - siteBCenter.y)
  const nearestSite: 'A' | 'B' = distA <= distB ? 'A' : 'B'
  const targetCenter = nearestSite === 'A' ? siteACenter : siteBCenter
  const snappedCenter = snapPointToMapBounds(mapStore.currentMapId, targetCenter)

  if (notifyOnSnap) {
    showStatusNotice('C4 Bomb can only be planted on Bombsite A or B — snapped to nearest site')
  }

  return {
    x: snappedCenter.x,
    y: snappedCenter.y,
    wasSnapped: true,
    site: nearestSite
  }
}

// ============================================================================
// 3. PULL-UP STRATBOOK DRAWER & ACTIVE MARKED STRATEGY HUD
// ============================================================================
const isStratbookDrawerOpen = ref(false)
const stratDrawerSideFilter = ref<'all' | 't' | 'ct'>('all')
const stratDrawerSearch = ref('')
const localMarkedStratId = ref<string | null>(null)
const activeStratPhaseIndex = ref(0)
const completedPhaseIds = ref<string[]>([])
const isActiveStratBannerExpanded = ref(true)

function loadMarkedStratFromStorage() {
  try {
    const saved = localStorage.getItem(ACTIVE_STRAT_STORAGE_KEY)
    if (saved) localMarkedStratId.value = saved
  } catch (e) {}
}

const activeMarkedStrat = computed<Strategy | null>(() => {
  const storeSelected = (stratStore as any).selectedStratForTactics as Strategy | null | undefined
  if (storeSelected && storeSelected.mapId === mapStore.currentMapId) {
    return storeSelected
  }
  if (localMarkedStratId.value) {
    const found = stratStore.allStrats.find(s => s.id === localMarkedStratId.value)
    if (found && found.mapId === mapStore.currentMapId) return found
  }
  if (storeSelected) return storeSelected
  if (localMarkedStratId.value) {
    return stratStore.allStrats.find(s => s.id === localMarkedStratId.value) || null
  }
  return null
})

const filteredDrawerStrats = computed<Strategy[]>(() => {
  const q = stratDrawerSearch.value.trim().toLowerCase()
  return stratStore.currentMapStrats.filter(s => {
    if (stratDrawerSideFilter.value !== 'all' && s.side !== stratDrawerSideFilter.value) {
      return false
    }
    if (q) {
      const hay = `${s.title} ${s.summary} ${(s.tags || []).join(' ')} ${s.targetSite || ''}`.toLowerCase()
      return hay.includes(q)
    }
    return true
  })
})

function handleMarkStratActive(strat: Strategy | null) {
  localMarkedStratId.value = strat ? strat.id : null
  activeStratPhaseIndex.value = 0
  completedPhaseIds.value = []
  try {
    if (strat) {
      localStorage.setItem(ACTIVE_STRAT_STORAGE_KEY, strat.id)
    } else {
      localStorage.removeItem(ACTIVE_STRAT_STORAGE_KEY)
    }
  } catch (e) {}

  if (typeof (stratStore as any).markStratForTactics === 'function') {
    ;(stratStore as any).markStratForTactics(strat)
  } else if ('selectedStratForTacticsId' in (stratStore as any)) {
    ;(stratStore as any).selectedStratForTacticsId = strat ? strat.id : null
  }

  if (strat) {
    showStatusNotice(`Marked "${strat.title}" as Active Strategy`)
  } else {
    showStatusNotice('Cleared active strategy')
  }
}

function togglePhaseCompleted(phaseId: string) {
  if (completedPhaseIds.value.includes(phaseId)) {
    completedPhaseIds.value = completedPhaseIds.value.filter(id => id !== phaseId)
  } else {
    completedPhaseIds.value.push(phaseId)
  }
}

function handleLoadStratToBoard(strat: Strategy, phaseIdx = 0) {
  if (!canUserDraw()) {
    showLockedNotice()
    return
  }

  handleMarkStratActive(strat)
  activeStratPhaseIndex.value = phaseIdx

  if (strat.mapId && strat.mapId !== mapStore.currentMapId) {
    mapStore.setMap(strat.mapId)
  }

  const phase = strat.phases[phaseIdx] || strat.phases[0]
  const pinType: TacticsElementType = strat.side === 'ct' ? 'player_ct' : 'player_t'
  const pinColor = strat.side === 'ct' ? '#0ea5e9' : '#f97316'
  const newElements: TacticsElement[] = []

  // Update CT or T legend names from the strategy's player assignments
  const cfg = ensureMapLegend(mapStore.currentMapId)
  if (phase && Array.isArray(phase.playerAssignments)) {
    for (const assign of phase.playerAssignments) {
      const slotStr = String(assign.slot)
      const customName = assign.playerName ? `${assign.role} · ${assign.playerName}` : assign.role
      if (strat.side === 'ct') {
        cfg.ct[slotStr] = customName
      } else {
        cfg.t[slotStr] = customName
      }

      const snapped = snapPointToMapBounds(mapStore.currentMapId, assign.position)
      newElements.push({
        id: `el-strat-${strat.id}-${assign.slot}-${Date.now()}`,
        type: pinType,
        color: pinColor,
        points: [{ x: snapped.x, y: snapped.y }],
        playerNum: slotStr,
        playerRole: customName,
        radius: 15,
        authorId: authStore.currentUser?.id,
        authorUsername: authStore.currentUser?.username
      })
    }
  }
  saveLegendToStorage()
  activeLegendTeamTab.value = strat.side

  if (Array.isArray(strat.tacticsDrawings) && strat.tacticsDrawings.length > 0) {
    for (const drawing of strat.tacticsDrawings) {
      newElements.push({
        ...JSON.parse(JSON.stringify(drawing)),
        id: `el-draw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      })
    }
  }

  stratStore.setBoardElements(newElements)

  const socket = getActiveSocket()
  if (socket && socket.connected) {
    socket.emit('room:elements_sync', {
      elements: stratStore.boardElements,
      mapId: mapStore.currentMapId
    })
  }

  recordTimelineSnapshot(`Loaded Strat: ${strat.title}${phase ? ` (${phase.name})` : ''}`)
  showStatusNotice(`Loaded "${strat.title}" onto Live Tactics Board`)
}

// ============================================================================
// 4. ADJUSTMENTS TIMELINE & SAVEABLE HISTORY
// ============================================================================
export interface TacticsTimelineSnapshot {
  id: string
  stepNumber: number
  label: string
  timestamp: string
  mapId: string
  elementCount: number
  elements: TacticsElement[]
  activeStratId: string | null
  ctLegend: Record<string, string>
  tLegend: Record<string, string>
  author: string
}

const isTimelinePanelOpen = ref(false)
const timelineByMap = ref<Record<string, TacticsTimelineSnapshot[]>>({})
const activeTimelineSnapshotId = ref<string | null>(null)
const customCheckpointLabel = ref('')

const currentMapTimeline = computed<TacticsTimelineSnapshot[]>(() => {
  return timelineByMap.value[mapStore.currentMapId] || []
})

function loadTimelineFromStorage() {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        timelineByMap.value = parsed
      }
    }
  } catch (e) {
    console.error('Failed to load tactics timeline history', e)
  }
  if (!timelineByMap.value[mapStore.currentMapId] || timelineByMap.value[mapStore.currentMapId].length === 0) {
    recordTimelineSnapshot('Initial Setup', false)
  }
}

function saveTimelineToStorage() {
  try {
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(timelineByMap.value))
  } catch (e) {
    console.error('Failed to save tactics timeline history', e)
  }
}

function recordTimelineSnapshot(label: string, persist = true) {
  const mapId = mapStore.currentMapId
  const list = timelineByMap.value[mapId] ? [...timelineByMap.value[mapId]] : []
  const cfg = ensureMapLegend(mapId)
  const snapshot: TacticsTimelineSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stepNumber: list.length + 1,
    label,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    mapId,
    elementCount: stratStore.boardElements.length,
    elements: JSON.parse(JSON.stringify(stratStore.boardElements)),
    activeStratId: activeMarkedStrat.value?.id || localMarkedStratId.value || null,
    ctLegend: { ...cfg.ct },
    tLegend: { ...cfg.t },
    author: authStore.currentUser?.username || 'Player'
  }
  // Keep up to 40 snapshots per map so localStorage stays lightweight
  const trimmed = [...list, snapshot].slice(-40).map((item, idx) => ({
    ...item,
    stepNumber: idx + 1
  }))
  timelineByMap.value[mapId] = trimmed
  activeTimelineSnapshotId.value = snapshot.id
  if (persist) {
    saveTimelineToStorage()
  }
}

function handleSaveManualCheckpoint() {
  const label = customCheckpointLabel.value.trim() || `Checkpoint (${stratStore.boardElements.length} markings)`
  recordTimelineSnapshot(label)
  customCheckpointLabel.value = ''
  showStatusNotice(`Saved timeline checkpoint: "${label}"`)
}

function restoreTimelineSnapshot(snap: TacticsTimelineSnapshot) {
  if (!canUserDraw()) {
    showLockedNotice()
    return
  }
  activeTimelineSnapshotId.value = snap.id
  stratStore.setBoardElements(JSON.parse(JSON.stringify(snap.elements)))

  const cfg = ensureMapLegend(mapStore.currentMapId)
  if (snap.ctLegend) cfg.ct = { ...snap.ctLegend }
  if (snap.tLegend) cfg.t = { ...snap.tLegend }
  saveLegendToStorage()

  if (snap.activeStratId) {
    const found = stratStore.allStrats.find(s => s.id === snap.activeStratId)
    if (found) handleMarkStratActive(found)
  }

  const socket = getActiveSocket()
  if (socket && socket.connected) {
    socket.emit('room:elements_sync', {
      elements: stratStore.boardElements,
      mapId: mapStore.currentMapId
    })
  }
  showStatusNotice(`Restored #${snap.stepNumber}: ${snap.label}`)
}

function clearMapTimelineHistory() {
  timelineByMap.value[mapStore.currentMapId] = []
  recordTimelineSnapshot('Initial Setup')
  showStatusNotice('Cleared adjustment timeline history for this map')
}

// ============================================================================
// 5. FAST 60FPS SVG DRAWING ENGINE (CACHED MATRIX + DISTANCE GATE + RAF)
// ============================================================================
const svgRef = ref<SVGSVGElement | null>(null)
const isDrawing = ref(false)
const currentStroke = ref<{ x: number; y: number }[]>([])
const selectedElementId = ref<string | null>(null)

let activeSvgMatrix: DOMMatrix | null = null
let activeSvgViewBox = { x: 0, y: 0, width: 1000, height: 1000 }
let activeFallbackRect: DOMRect | null = null
let rafMoveId: number | null = null
let pendingMouseEvent: MouseEvent | null = null
let draggedElementMoved = false
let draggedElementLastSnapNotice = 0

function cacheSvgTransformOnMouseDown() {
  if (!svgRef.value) {
    activeSvgMatrix = null
    activeFallbackRect = null
    return
  }
  const svg = svgRef.value
  const ctm = svg.getScreenCTM()
  activeSvgMatrix = ctm ? ctm.inverse() : null
  const vb = svg.viewBox?.baseVal
  activeSvgViewBox = vb && vb.width ? { x: vb.x, y: vb.y, width: vb.width, height: vb.height } : { x: 0, y: 0, width: 1000, height: 1000 }
  activeFallbackRect = svg.getBoundingClientRect()
}

function clearCachedSvgTransform() {
  activeSvgMatrix = null
  activeFallbackRect = null
  if (rafMoveId !== null) {
    cancelAnimationFrame(rafMoveId)
    rafMoveId = null
  }
  pendingMouseEvent = null
}

function getMapCoords(e: MouseEvent): { x: number; y: number } {
  if (!svgRef.value) return { x: 50, y: 50 }
  const svg = svgRef.value

  const inverseMatrix = activeSvgMatrix || svg.getScreenCTM()?.inverse() || null
  if (inverseMatrix) {
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const mapped = pt.matrixTransform(inverseMatrix)
    const vb = activeSvgViewBox
    const x = ((mapped.x - vb.x) / vb.width) * 100
    const y = ((mapped.y - vb.y) / vb.height) * 100
    return {
      x: Math.round(Math.min(Math.max(x, 0.5), 99.5) * 100) / 100,
      y: Math.round(Math.min(Math.max(y, 0.5), 99.5) * 100) / 100
    }
  }

  const rect = activeFallbackRect || svg.getBoundingClientRect()
  const x = Math.round((((e.clientX - rect.left) / (rect.width || 1)) * 100) * 100) / 100
  const y = Math.round((((e.clientY - rect.top) / (rect.height || 1)) * 100) * 100) / 100
  return { x: Math.max(0.5, Math.min(99.5, x)), y: Math.max(0.5, Math.min(99.5, y)) }
}

// ============================================================================
// 6. ROOM & COLLABORATION CONTROLS
// ============================================================================
const isTacticsMapDropdownOpen = ref(false)
const isColorPopoverOpen = ref(false)

function handleTacticsMapGlobalClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (isTacticsMapDropdownOpen.value && !target.closest('.tactics-map-dropdown-container')) {
    isTacticsMapDropdownOpen.value = false
  }
  if (isColorPopoverOpen.value && !target.closest('.tactics-color-popover-container')) {
    isColorPopoverOpen.value = false
  }
}

const isMapSwitchWarnModalOpen = ref(false)
const pendingTargetMapId = ref<string | null>(null)

function getActiveSocket() {
  return (gameRoomStore as any).getSocket
    ? (gameRoomStore as any).getSocket()
    : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
}

function showStatusNotice(msg: string, duration = 3200) {
  actionStatusToast.value = msg
  setTimeout(() => {
    if (actionStatusToast.value === msg) {
      actionStatusToast.value = ''
    }
  }, duration)
}

function showLockedNotice() {
  showStatusNotice(
    authStore.isLimitedGuest
      ? 'Host has not enabled drawing for guests. Sign in or ask host.'
      : 'Host has locked drawing for room members.'
  )
}

function handleMapSelect(newMapId: string) {
  if (!newMapId || newMapId === mapStore.currentMapId) {
    isTacticsMapDropdownOpen.value = false
    return
  }
  isTacticsMapDropdownOpen.value = false

  if (gameRoomStore.currentRoomCode && !gameRoomStore.isHost && gameRoomStore.onlyHostCanChangeMap) {
    showStatusNotice('Map switching is locked to Room Host only')
    return
  }

  if (stratStore.boardElements.length > 0) {
    pendingTargetMapId.value = newMapId
    isMapSwitchWarnModalOpen.value = true
    return
  }

  executeMapSwitch(newMapId)
}

function executeMapSwitch(targetMapId: string) {
  stratStore.saveCurrentMapElements(mapStore.currentMapId)
  mapStore.setMap(targetMapId)
  stratStore.loadMapElements(targetMapId)
  ensureMapLegend(targetMapId)
  if (!timelineByMap.value[targetMapId] || timelineByMap.value[targetMapId].length === 0) {
    recordTimelineSnapshot('Initial Setup', true)
  }
  isTacticsMapDropdownOpen.value = false
  isMapSwitchWarnModalOpen.value = false
  pendingTargetMapId.value = null

  const socket = getActiveSocket()
  if (socket && socket.connected) {
    socket.emit('room:switch_map', {
      mapId: targetMapId,
      elements: stratStore.boardElements
    })
  }
}

function canUserDraw(): boolean {
  if (gameRoomStore.isHost) return true
  if (authStore.isLimitedGuest) {
    return gameRoomStore.allowGuestsToDraw
  }
  return gameRoomStore.allowSignedUsersToDraw
}

// RIGHT TACTICAL SIDEBAR (ROOM CHAT / PRIVATE CHAT / PLAYER LIST)
const isRightSidebarVisible = ref(false)
const rightSidebarTab = ref<'public_chat' | 'private_chat' | 'players'>('public_chat')
const roomChatInput = ref('')
const selectedPrivateRecipientId = ref<string | null>(null)
const selectedPrivateRecipientUser = ref<any | null>(null)
const privateChatInput = ref('')
const privateMessages = ref<DirectMessage[]>([])
const isPrivateChatLoading = ref(false)

function sendRoomMessage() {
  if (!roomChatInput.value.trim()) return
  gameRoomStore.sendChatMessage(roomChatInput.value.trim())
  roomChatInput.value = ''
}

async function selectPrivateRecipient(member: any) {
  selectedPrivateRecipientId.value = member.id || member.username
  selectedPrivateRecipientUser.value = member
  rightSidebarTab.value = 'private_chat'
  await loadPrivateThread(member.id || member.username)
}

async function loadPrivateThread(targetId: string) {
  if (!authStore.token) return
  isPrivateChatLoading.value = true
  try {
    const res = await axios.get(`/api/dm/messages/${targetId}`)
    if (authStore.currentUser) {
      const secret = generateConversationSecret(authStore.currentUser.id, targetId)
      const decrypted = await Promise.all(
        res.data.map(async (m: DirectMessage) => {
          const plain = await decryptMessage(m.text, secret)
          return { ...m, text: plain }
        })
      )
      privateMessages.value = decrypted
    } else {
      privateMessages.value = res.data
    }
  } catch (e) {
    console.error('Failed to load private DM thread', e)
  } finally {
    isPrivateChatLoading.value = false
  }
}

async function silentRefreshPrivateThread(targetId: string) {
  if (!authStore.token || !authStore.currentUser || !targetId) return
  try {
    const res = await axios.get(`/api/dm/messages/${targetId}`)
    const secret = generateConversationSecret(authStore.currentUser.id, targetId)
    const decrypted = await Promise.all(
      res.data.map(async (m: DirectMessage) => {
        const plain = await decryptMessage(m.text, secret)
        return { ...m, text: plain }
      })
    )
    if (
      decrypted.length !== privateMessages.value.length ||
      (decrypted.length > 0 &&
        decrypted[decrypted.length - 1].id !== privateMessages.value[privateMessages.value.length - 1]?.id)
    ) {
      privateMessages.value = decrypted
    }
  } catch (e) {}
}

async function sendPrivateMessage() {
  if (!privateChatInput.value.trim() || !selectedPrivateRecipientId.value || !authStore.currentUser) return
  const textToSend = privateChatInput.value.trim()
  privateChatInput.value = ''

  try {
    const secret = generateConversationSecret(authStore.currentUser.id, selectedPrivateRecipientId.value)
    const cipher = await encryptMessage(textToSend, secret)
    const res = await axios.post(`/api/dm/messages/${selectedPrivateRecipientId.value}`, { text: cipher })
    if (!privateMessages.value.some(m => m.id === res.data.id)) {
      privateMessages.value.push({ ...res.data, text: textToSend })
    }
  } catch (e) {
    console.error('Failed to send encrypted private DM', e)
  }
}

const actionStatusToast = ref('')
const tempSaveToast = actionStatusToast

// LOCAL EXPORT & IMPORT (JSON FILES WITH TIMELINE HISTORY & CT LEGEND)
const importFileInputRef = ref<HTMLInputElement | null>(null)

function handleExportTacticsLocal(includeFullHistory = true) {
  const cfg = ensureMapLegend(mapStore.currentMapId)
  const data = {
    version: '2.0',
    app: 'Protutech CS2 Tactics',
    mapId: mapStore.currentMapId,
    mapName: mapStore.currentMap?.name || mapStore.currentMapId,
    exportedAt: new Date().toISOString(),
    activeStratId: activeMarkedStrat.value?.id || localMarkedStratId.value || null,
    ctLegend: cfg.ct,
    tLegend: cfg.t,
    elements: stratStore.boardElements,
    timelineHistory: includeFullHistory ? currentMapTimeline.value : [],
    author: authStore.currentUser?.username || 'Player'
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cs2_tactics_${mapStore.currentMapId}_${includeFullHistory ? 'history_' : ''}${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  showStatusNotice(includeFullHistory ? 'Exported Board + Full Timeline History (JSON)' : 'Tactics JSON Exported Locally')
}

function handleSaveToFileAndSwitch() {
  handleExportTacticsLocal(true)
  if (pendingTargetMapId.value) {
    executeMapSwitch(pendingTargetMapId.value)
  }
}

async function handleSaveToServerAndSwitch() {
  if (!pendingTargetMapId.value) return
  if (!authStore.token) {
    authStore.isAuthModalOpen = true
    return
  }
  isSavingToServer.value = true
  try {
    const cfg = ensureMapLegend(mapStore.currentMapId)
    await axios.post(
      '/api/tactics/save-server',
      {
        title: `${mapStore.currentMap?.name || mapStore.currentMapId} Strategy ${new Date().toLocaleDateString()}`,
        mapId: mapStore.currentMapId,
        elements: stratStore.boardElements,
        ctLegend: cfg.ct,
        tLegend: cfg.t,
        timelineHistory: currentMapTimeline.value
      },
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    )
    showStatusNotice('Saved to Cloud with History')
    executeMapSwitch(pendingTargetMapId.value)
  } catch (e: any) {
    alert(e.response?.data?.error || 'Failed to save to server')
  } finally {
    isSavingToServer.value = false
  }
}

function triggerImportFileDialog() {
  if (importFileInputRef.value) {
    importFileInputRef.value.click()
  }
}

function handleImportTacticsLocal(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target?.result as string)
      const elements = parsed.elements || (Array.isArray(parsed) ? parsed : null)
      if (elements && Array.isArray(elements)) {
        if (parsed.mapId && parsed.mapId !== mapStore.currentMapId) {
          mapStore.setMap(parsed.mapId)
        }
        stratStore.boardElements = elements
        stratStore.mapElements[mapStore.currentMapId] = elements

        const cfg = ensureMapLegend(mapStore.currentMapId)
        if (parsed.ctLegend && typeof parsed.ctLegend === 'object') {
          cfg.ct = { ...cfg.ct, ...parsed.ctLegend }
        }
        if (parsed.tLegend && typeof parsed.tLegend === 'object') {
          cfg.t = { ...cfg.t, ...parsed.tLegend }
        }
        saveLegendToStorage()

        if (Array.isArray(parsed.timelineHistory) && parsed.timelineHistory.length > 0) {
          timelineByMap.value[mapStore.currentMapId] = parsed.timelineHistory
          saveTimelineToStorage()
        } else {
          recordTimelineSnapshot(`Imported JSON (${elements.length} items)`)
        }

        const socket = getActiveSocket()
        if (socket && socket.connected) {
          socket.emit('room:switch_map', {
            mapId: mapStore.currentMapId,
            elements: elements
          })
        }
        showStatusNotice(`Imported ${elements.length} markings & timeline history`)
      } else {
        alert('Invalid tactics file format')
      }
    } catch (err) {
      alert('Failed to parse tactics JSON file')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

// SERVER & CLOUD TACTICS STORAGE
const isServerSaveModalOpen = ref(false)
const serverTacticTitle = ref('')
const isSavingToServer = ref(false)
const serverSavedTactics = ref<any[]>([])
const isLoadingServerTactics = ref(false)

async function openServerStorageModal() {
  isServerSaveModalOpen.value = true
  await fetchServerTactics()
}

async function handleSaveTacticsToServer() {
  // Always persist to local timeline & localStorage as well so offline/guest users can also save with history
  const checkpointTitle =
    serverTacticTitle.value.trim() ||
    `${mapStore.currentMap?.name || mapStore.currentMapId} Strategy ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  recordTimelineSnapshot(`Cloud Checkpoint: ${checkpointTitle}`)

  if (!authStore.token) {
    showStatusNotice('Saved History Checkpoint locally (Sign in for Cloud sync)')
    authStore.isAuthModalOpen = true
    return
  }
  if (stratStore.boardElements.length === 0) {
    alert('The board is empty. Draw or place tactical pins first before saving.')
    return
  }
  isSavingToServer.value = true
  try {
    const cfg = ensureMapLegend(mapStore.currentMapId)
    await axios.post(
      '/api/tactics/save-server',
      {
        title: checkpointTitle,
        mapId: mapStore.currentMapId,
        elements: stratStore.boardElements,
        ctLegend: cfg.ct,
        tLegend: cfg.t,
        timelineHistory: currentMapTimeline.value
      },
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    )
    showStatusNotice('Saved Board & History Timeline to Cloud')
    serverTacticTitle.value = ''
    await fetchServerTactics()
  } catch (e: any) {
    alert(e.response?.data?.error || 'Failed to save tactics to server')
  } finally {
    isSavingToServer.value = false
  }
}

async function fetchServerTactics() {
  isLoadingServerTactics.value = true
  try {
    const res = await axios.get(`/api/tactics/server/${mapStore.currentMapId}`)
    serverSavedTactics.value = res.data
  } catch (e) {
  } finally {
    isLoadingServerTactics.value = false
  }
}

function handleLoadServerTactic(tactic: any) {
  if (tactic.elements && Array.isArray(tactic.elements)) {
    stratStore.boardElements = tactic.elements
    stratStore.mapElements[mapStore.currentMapId] = tactic.elements
    if (tactic.ctLegend) {
      const cfg = ensureMapLegend(mapStore.currentMapId)
      cfg.ct = { ...cfg.ct, ...tactic.ctLegend }
      saveLegendToStorage()
    }
    if (Array.isArray(tactic.timelineHistory) && tactic.timelineHistory.length > 0) {
      timelineByMap.value[mapStore.currentMapId] = tactic.timelineHistory
      saveTimelineToStorage()
    } else {
      recordTimelineSnapshot(`Loaded Cloud: ${tactic.title}`)
    }
    const socket = getActiveSocket()
    if (socket && socket.connected) {
      socket.emit('room:switch_map', {
        mapId: mapStore.currentMapId,
        elements: tactic.elements
      })
    }
    showStatusNotice(`Loaded "${tactic.title}" from cloud`)
    isServerSaveModalOpen.value = false
  }
}

async function handleDeleteServerTactic(id: string) {
  if (!authStore.token) return
  try {
    await axios.delete(`/api/tactics/server/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    await fetchServerTactics()
  } catch (e) {}
}

// Room Link Sharing & Domain Discovery
const roomCodeInput = ref('')
const isCopied = ref(false)
const serverPublicUrl = ref('')

// Arrow Direction Control: Tail controls direction vs Head
const arrowControlMode = ref<'tail_controls' | 'head_controls'>('tail_controls')

// Custom Toolbar & Icon Manager
const isCustomizeToolbarOpen = ref(false)

export interface CustomPinDefinition {
  id: string
  label: string
  color: string
  symbol: string
}
const customPins = ref<CustomPinDefinition[]>([])
const newPinLabel = ref('')
const newPinSymbol = ref('TAG')
const newPinColor = ref('#de9b35')

// Custom Text placement
const isTextInputModalOpen = ref(false)
const pendingTextCoords = ref<{ x: number; y: number }>({ x: 50, y: 50 })
const customTextInput = ref('')
const customFontSize = ref(13)

// Element Drag / Move State
const isDraggingElement = ref(false)
const draggedElementId = ref<string | null>(null)
const dragOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })

// Stroke Width
const activeStrokeWidth = ref(4)

// Modals
const isJoinRoomModalOpen = ref(false)
const isMembersModalOpen = ref(false)
const newRoomInput = ref('')
const copySuccessToast = ref('')
const isClearConfirmModalOpen = ref(false)

async function handleTransferHost(newHostUsername: string) {
  if (!newHostUsername) return
  const confirmed = await confirmAction({
    title: 'Transfer Room Host?',
    message: `Are you sure you want to transfer Host permissions to ${newHostUsername}? They will gain full control over room permissions and drawing locks.`,
    confirmLabel: 'Transfer Host',
    cancelLabel: 'Cancel',
    isDestructive: false
  })
  if (confirmed) {
    gameRoomStore.transferHost(newHostUsername)
    isMembersModalOpen.value = false
  }
}

const allToolsCatalogue = [
  { id: 'select', label: 'Select', icon: Move, category: 'General' },
  { id: 'pen', label: 'Pen', icon: PenTool, category: 'Drawing' },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, category: 'Drawing' },
  { id: 'line', label: 'Line', icon: Minus, category: 'Drawing' },
  { id: 'text', label: 'Text', icon: Type, category: 'General' },
  { id: 'smoke', label: 'Smoke', icon: Cloud, category: 'Utility' },
  { id: 'flash', label: 'Flash', icon: Zap, category: 'Utility' },
  { id: 'molotov', label: 'Molotov', icon: Flame, category: 'Utility' },
  { id: 'he_blast', label: 'HE', icon: Crosshair, category: 'Utility' },
  { id: 'c4_bomb', label: 'C4 Bomb', icon: Bomb, category: 'Objectives' },
  { id: 'player_t', label: 'T Pin', icon: User, category: 'Players' },
  { id: 'player_ct', label: 'CT Pin', icon: Shield, category: 'Players' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, category: 'General' }
]

const enabledToolIds = ref<string[]>([
  'select',
  'pen',
  'arrow',
  'line',
  'text',
  'smoke',
  'flash',
  'molotov',
  'he_blast',
  'c4_bomb',
  'player_t',
  'player_ct',
  'eraser'
])

const visibleTools = computed(() => {
  return allToolsCatalogue.filter(t => enabledToolIds.value.includes(t.id))
})

const colorPalette = [
  { hex: '#de9b35', name: 'CS2 Gold' },
  { hex: '#f97316', name: 'T Orange' },
  { hex: '#0ea5e9', name: 'CT Blue' },
  { hex: '#ef4444', name: 'Danger Red' },
  { hex: '#94a3b8', name: 'Smoke Grey' },
  { hex: '#eab308', name: 'Flash Yellow' },
  { hex: '#22c55e', name: 'Toxic Green' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#ffffff', name: 'Pure White' }
]

function copyToClipboard(text: string): boolean {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
      return true
    }
  } catch (e) {}
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    return false
  }
}

onMounted(async () => {
  loadLegendFromStorage()
  loadMarkedStratFromStorage()
  loadTimelineFromStorage()

  try {
    const saved = localStorage.getItem('protutech_tactics_toolbar_v2')
    if (saved) enabledToolIds.value = JSON.parse(saved)
    const savedPins = localStorage.getItem('protutech_tactics_custom_pins')
    if (savedPins) customPins.value = JSON.parse(savedPins)
  } catch (err) {}

  try {
    const infoRes = await axios.get('/api/server/info')
    if (infoRes.data?.publicUrl) serverPublicUrl.value = infoRes.data.publicUrl
  } catch (err) {}

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const roomParam = urlParams.get('room')
    if (roomParam) {
      roomCodeInput.value = roomParam.toUpperCase()
      joinTacticalRoom(roomParam.toUpperCase())
    } else if (!gameRoomStore.currentRoomCode) {
      roomCodeInput.value = `PIC-${Math.floor(1000 + Math.random() * 9000)}`
      joinTacticalRoom(roomCodeInput.value)
    } else {
      roomCodeInput.value = gameRoomStore.currentRoomCode
    }
  }

  // Socket element & map synchronization
  const socket = gameRoomStore.getSocket()
  if (socket) {
    socket.on('room:state', (state: any) => {
      if (state.elementsByMap && Object.keys(state.elementsByMap).length > 0) {
        stratStore.mapElements = { ...stratStore.mapElements, ...state.elementsByMap }
      }
      if (state.mapId && state.mapId !== mapStore.currentMapId) {
        mapStore.setMap(state.mapId)
      }
      if (state.elements && Array.isArray(state.elements) && state.elements.length > 0) {
        stratStore.setBoardElements(state.elements)
      } else if (state.mapId && stratStore.mapElements[state.mapId]) {
        stratStore.setBoardElements(stratStore.mapElements[state.mapId])
      }
    })

    socket.on('room:map_changed', (data: any) => {
      const newMapId = typeof data === 'string' ? data : data?.mapId
      if (newMapId && mapStore.currentMapId !== newMapId) {
        stratStore.saveCurrentMapElements(mapStore.currentMapId)
        mapStore.setMap(newMapId)
      }
      if (data && data.elements) {
        stratStore.setBoardElements(data.elements)
      } else if (newMapId) {
        stratStore.loadMapElements(newMapId)
      }
    })

    socket.on('room:element_added', (data: any) => {
      const el = data?.element || data
      const mapId = data?.mapId
      if (!mapId || mapId === mapStore.currentMapId) {
        if (!stratStore.boardElements.some(e => e.id === el.id)) {
          stratStore.boardElements.push(el)
        }
      }
      if (mapId) {
        const existing = stratStore.mapElements[mapId] || []
        if (!existing.some(e => e.id === el.id)) {
          stratStore.mapElements[mapId] = [...existing, el]
        }
      }
    })

    socket.on('room:element_removed', (data: any) => {
      const elId = typeof data === 'string' ? data : data?.elementId
      const mapId = data?.mapId
      if (!mapId || mapId === mapStore.currentMapId) {
        stratStore.boardElements = stratStore.boardElements.filter(e => e.id !== elId)
      }
      if (mapId && stratStore.mapElements[mapId]) {
        stratStore.mapElements[mapId] = stratStore.mapElements[mapId].filter(e => e.id !== elId)
      }
    })

    socket.on('room:elements_synced', (data: any) => {
      const els = Array.isArray(data) ? data : data?.elements || []
      const mapId = data?.mapId
      if (!mapId || mapId === mapStore.currentMapId) {
        stratStore.setBoardElements(els)
      } else if (mapId) {
        stratStore.mapElements[mapId] = [...els]
      }
    })

    socket.on('room:drawings_cleared', (data: any) => {
      const mapId = data?.mapId
      if (!mapId || mapId === mapStore.currentMapId) {
        stratStore.boardElements = []
      }
      if (mapId) {
        stratStore.mapElements[mapId] = []
      }
    })

    socket.on('dm:new', async (newMsg: DirectMessage) => {
      if (!authStore.currentUser || !newMsg) return
      const myId = authStore.currentUser.id
      const isSender = newMsg.senderId === myId
      const isRecipient = newMsg.recipientId === myId
      if (!isSender && !isRecipient) return

      const otherPartyId = isSender ? newMsg.recipientId : newMsg.senderId
      if (selectedPrivateRecipientId.value === otherPartyId) {
        let plainText = newMsg.text
        if (newMsg.text.startsWith('ENC:')) {
          const secret = generateConversationSecret(myId, otherPartyId)
          plainText = await decryptMessage(newMsg.text, secret)
        }
        if (!privateMessages.value.some(m => m.id === newMsg.id)) {
          privateMessages.value.push({ ...newMsg, text: plainText })
        }
      }
    })
  }

  autoSyncTimer = setInterval(() => {
    const s = gameRoomStore.getSocket()
    if (s && s.connected) {
      s.emit('room:request_sync', { mapId: mapStore.currentMapId })
    }
    if (selectedPrivateRecipientId.value && rightSidebarTab.value === 'private_chat') {
      silentRefreshPrivateThread(selectedPrivateRecipientId.value)
    }
  }, 2500)

  const prefTool = localStorage.getItem('cs2_tactics_pref_tool')
  if (prefTool && prefTool !== 'plant_a' && prefTool !== 'plant_b') {
    stratStore.activeTool = prefTool as any
  }
  const prefArrowMode = localStorage.getItem('cs2_tactics_pref_arrow_mode')
  if (prefArrowMode === 'head_controls' || prefArrowMode === 'tail_controls') {
    arrowControlMode.value = prefArrowMode
  }
  const prefStroke = localStorage.getItem('cs2_tactics_pref_stroke_width')
  if (prefStroke) {
    activeStrokeWidth.value = Number(prefStroke) || 4
  }
  const prefColor = localStorage.getItem('cs2_tactics_pref_color')
  if (prefColor) {
    stratStore.activeColor = prefColor
  }

  window.addEventListener('focus', handleWindowFocusSync)
  window.addEventListener('click', handleTacticsMapGlobalClick)
})

watch(
  () => mapStore.currentMapId,
  newMapId => {
    ensureMapLegend(newMapId)
    if (!timelineByMap.value[newMapId] || timelineByMap.value[newMapId].length === 0) {
      recordTimelineSnapshot('Initial Setup', true)
    }
  }
)

watch(
  () => stratStore.activeTool,
  tool => {
    if (tool) localStorage.setItem('cs2_tactics_pref_tool', tool)
    if (tool === 'player_ct') activeLegendTeamTab.value = 'ct'
    if (tool === 'player_t') activeLegendTeamTab.value = 't'
  }
)
watch(arrowControlMode, mode => {
  if (mode) localStorage.setItem('cs2_tactics_pref_arrow_mode', mode)
})
watch(activeStrokeWidth, w => {
  if (w) localStorage.setItem('cs2_tactics_pref_stroke_width', String(w))
})
watch(
  () => stratStore.activeColor,
  col => {
    if (col) localStorage.setItem('cs2_tactics_pref_color', col)
  }
)

let autoSyncTimer: any = null

function handleForceReSync() {
  const s = getActiveSocket()
  if (s && s.connected) {
    s.emit('room:request_sync', { mapId: mapStore.currentMapId })
  }
  showStatusNotice('Syncing from server...', 2000)
}

function handleWindowFocusSync() {
  const s = getActiveSocket()
  if (s && s.connected) {
    s.emit('room:request_sync', { mapId: mapStore.currentMapId })
  }
}

onUnmounted(() => {
  clearCachedSvgTransform()
  if (autoSyncTimer) clearInterval(autoSyncTimer)
  window.removeEventListener('focus', handleWindowFocusSync)
  window.removeEventListener('click', handleTacticsMapGlobalClick)
})

function toggleToolEnabled(toolId: string) {
  if (enabledToolIds.value.includes(toolId)) {
    if (enabledToolIds.value.length > 2) {
      enabledToolIds.value = enabledToolIds.value.filter(id => id !== toolId)
    }
  } else {
    enabledToolIds.value.push(toolId)
  }
  localStorage.setItem('protutech_tactics_toolbar_v2', JSON.stringify(enabledToolIds.value))
}

function handleAddCustomPin() {
  if (!newPinLabel.value.trim()) return
  customPins.value.push({
    id: `cpin-${Date.now()}`,
    label: newPinLabel.value.trim(),
    symbol: newPinSymbol.value.trim() || 'TAG',
    color: newPinColor.value
  })
  localStorage.setItem('protutech_tactics_custom_pins', JSON.stringify(customPins.value))
  newPinLabel.value = ''
}

function handleDeleteCustomPin(pinId: string) {
  customPins.value = customPins.value.filter(p => p.id !== pinId)
  localStorage.setItem('protutech_tactics_custom_pins', JSON.stringify(customPins.value))
}

function joinTacticalRoom(codeToJoin?: string) {
  const code = (codeToJoin || roomCodeInput.value || `PIC-${Math.floor(1000 + Math.random() * 9000)}`)
    .trim()
    .toUpperCase()
  roomCodeInput.value = code
  const user = authStore.currentUser || {
    id: `guest-${Date.now()}`,
    username: `Player_${Math.floor(1000 + Math.random() * 9000)}`,
    inGameRole: 'Entry Fragger',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`
  }
  gameRoomStore.joinRoom(code, user as any)
  isJoinRoomModalOpen.value = false
}

function handleCopyRoomCode() {
  const room = gameRoomStore.currentRoomCode || roomCodeInput.value || 'PIC-1001'
  copyToClipboard(room)
  copySuccessToast.value = 'Room ID Copied'
  setTimeout(() => {
    copySuccessToast.value = ''
  }, 2500)
}

function handleCopyRoomLink() {
  const room = gameRoomStore.currentRoomCode || roomCodeInput.value || 'PIC-1001'
  const baseDomain = serverPublicUrl.value || window.location.origin
  const url = `${baseDomain}/tactics?room=${room}`
  copyToClipboard(url)
  isCopied.value = true
  copySuccessToast.value = 'Room Link Copied'
  setTimeout(() => {
    isCopied.value = false
    copySuccessToast.value = ''
  }, 2500)
}

function placeCustomPin(pin: CustomPinDefinition) {
  if (!canUserDraw()) {
    showLockedNotice()
    return
  }
  const snapped = snapPointToMapBounds(mapStore.currentMapId, { x: 50, y: 50 })
  addElement(
    {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'text',
      color: pin.color,
      points: [{ x: snapped.x, y: snapped.y }],
      text: `[${pin.symbol}] ${pin.label}`,
      radius: 13
    },
    `Placed Custom Pin: ${pin.label}`
  )
}

function handleElementMouseDown(e: MouseEvent, el: TacticsElement) {
  if (!canUserDraw()) {
    showLockedNotice()
    return
  }
  if (stratStore.activeTool === 'select') {
    e.stopPropagation()
    cacheSvgTransformOnMouseDown()
    const coords = getMapCoords(e)
    isDraggingElement.value = true
    draggedElementMoved = false
    draggedElementId.value = el.id
    selectedElementId.value = el.id
    dragOffset.value = {
      x: coords.x - el.points[0].x,
      y: coords.y - el.points[0].y
    }
  }
}

const isErasing = ref(false)
let erasedAnyDuringDrag = false

function distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }): number {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y)
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y)
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)))
}

function eraseAtCoords(coords: { x: number; y: number }) {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  const s = getActiveSocket()
  const toRemoveIds: string[] = []
  const eraseRadius = 7.0

  stratStore.boardElements.forEach(el => {
    if (!gameRoomStore.isHost && gameRoomStore.currentRoomCode) {
      const isMyElement =
        (el.authorId && authStore.currentUser?.id && el.authorId === authStore.currentUser.id) ||
        (el.authorUsername &&
          authStore.currentUser?.username &&
          el.authorUsername.toLowerCase() === authStore.currentUser.username.toLowerCase())
      if (!isMyElement) {
        return
      }
    }

    if (el.type === 'pen') {
      const remaining = el.points.filter(pt => Math.hypot(pt.x - coords.x, pt.y - coords.y) > eraseRadius)
      if (remaining.length < el.points.length) {
        if (remaining.length < 2) {
          toRemoveIds.push(el.id)
        } else {
          el.points = remaining
          erasedAnyDuringDrag = true
        }
      }
    } else if (el.type === 'line' || el.type === 'arrow') {
      if (el.points.length >= 2) {
        const d = distToSegment(coords, el.points[0], el.points[1])
        if (d <= eraseRadius) {
          toRemoveIds.push(el.id)
        }
      }
    } else if (el.points.length > 0) {
      if (Math.hypot(el.points[0].x - coords.x, el.points[0].y - coords.y) <= eraseRadius + 1.0) {
        toRemoveIds.push(el.id)
      }
    }
  })

  if (toRemoveIds.length > 0) {
    erasedAnyDuringDrag = true
  }

  toRemoveIds.forEach(id => {
    stratStore.removeBoardElement(id, { userId: currentUserId })
    if (s && s.connected) {
      s.emit('room:element_remove', { elementId: id, mapId: mapStore.currentMapId })
    }
  })
}

function handleMouseDown(e: MouseEvent) {
  if (!canUserDraw()) {
    showLockedNotice()
    return
  }
  const tool = stratStore.activeTool
  if (tool === 'select') {
    selectedElementId.value = null
    return
  }

  cacheSvgTransformOnMouseDown()
  const coords = getMapCoords(e)

  if (tool === 'eraser') {
    isErasing.value = true
    erasedAnyDuringDrag = false
    eraseAtCoords(coords)
    return
  }

  if (tool === 'text') {
    pendingTextCoords.value = coords
    customTextInput.value = ''
    isTextInputModalOpen.value = true
    return
  }

  if (tool === 'smoke') {
    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'smoke_cloud',
        color: '#94a3b8',
        points: [coords],
        radius: 32,
        authorId: authStore.currentUser?.id,
        authorUsername: authStore.currentUser?.username
      },
      'Added Smoke Bloom'
    )
    return
  }

  if (tool === 'flash') {
    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'flash_burst',
        color: '#eab308',
        points: [coords],
        radius: 16,
        authorId: authStore.currentUser?.id,
        authorUsername: authStore.currentUser?.username
      },
      'Added Flash Burst'
    )
    return
  }

  if (tool === 'molotov') {
    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'molotov_fire',
        color: '#f97316',
        points: [coords],
        radius: 25,
        authorId: authStore.currentUser?.id,
        authorUsername: authStore.currentUser?.username
      },
      'Added Molotov Fire'
    )
    return
  }

  if (tool === 'he_blast') {
    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'he_blast',
        color: '#22c55e',
        points: [coords],
        radius: 20,
        authorId: authStore.currentUser?.id,
        authorUsername: authStore.currentUser?.username
      },
      'Added HE Grenade'
    )
    return
  }

  if (tool === 'c4_bomb') {
    const myUserId = authStore.currentUser?.id || 'guest'
    const myUsername = authStore.currentUser?.username || 'Player'

    // Enforce Bombsite A or B ONLY for C4 Bomb placement
    const validatedBomb = validateAndSnapC4BombCoords(coords, true)

    // Limit 1 bomb per player: Remove player's existing bomb if already placed
    const existingBomb = stratStore.boardElements.find(
      el => el.type === 'c4_bomb' && (el.authorId === myUserId || el.authorUsername === myUsername)
    )

    if (existingBomb) {
      stratStore.removeBoardElement(existingBomb.id, { userId: myUserId, username: myUsername })
      const s = getActiveSocket()
      if (s && s.connected) s.emit('room:element_remove', { elementId: existingBomb.id, mapId: mapStore.currentMapId })
    }

    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'c4_bomb',
        color: '#ef4444',
        points: [{ x: validatedBomb.x, y: validatedBomb.y }],
        radius: 16,
        authorId: myUserId,
        authorUsername: myUsername,
        authorAvatar: authStore.currentUser?.avatar
      },
      `Planted C4 Bomb (Site ${validatedBomb.site})`
    )
    return
  }

  if (tool === 'player_t' || tool === 'player_ct') {
    const isT = tool === 'player_t'
    const existingSameSide = stratStore.boardElements.filter(el => el.type === tool)
    if (existingSameSide.length >= 5) {
      showStatusNotice(`Maximum 5 ${isT ? 'T' : 'CT'} player pins placed — drag pins with Select tool`)
      return
    }

    // Strict in-bounds placement check via isPointInMapBounds + snapPointToMapBounds
    const checkedCoords = enforcePlayerPinInBounds(coords, isT ? 'T' : 'CT', true)

    const usedNums = new Set(existingSameSide.map(el => String(el.playerNum || '1')))
    const nextNum = ['1', '2', '3', '4', '5'].find(n => !usedNums.has(n)) || String(existingSameSide.length + 1)
    const legendName = isT ? currentTLegend.value[nextNum] : currentCtLegend.value[nextNum]

    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: tool as any,
        color: isT ? '#f97316' : '#0ea5e9',
        points: [{ x: checkedCoords.x, y: checkedCoords.y }],
        playerNum: nextNum,
        playerRole: legendName || undefined,
        radius: 15,
        authorId: authStore.currentUser?.id,
        authorUsername: authStore.currentUser?.username
      },
      `Placed ${isT ? 'T' : 'CT'} #${nextNum}${legendName ? ` (${legendName})` : ''}`
    )
    return
  }

  // DRAWING TOOLS (PEN, ARROW, LINE)
  isDrawing.value = true
  currentStroke.value = [coords]
}

function processBatchedMouseMove(e: MouseEvent) {
  rafMoveId = null
  if (isDraggingElement.value && draggedElementId.value) {
    const el = stratStore.boardElements.find(item => item.id === draggedElementId.value)
    if (el) {
      const coords = getMapCoords(e)
      let targetX = Math.round(Math.max(0.5, Math.min(99.5, coords.x - dragOffset.value.x)) * 100) / 100
      let targetY = Math.round(Math.max(0.5, Math.min(99.5, coords.y - dragOffset.value.y)) * 100) / 100

      // Enforce strict in-bounds rule when moving CT or T player pins
      if (el.type === 'player_ct' || el.type === 'player_t') {
        const now = Date.now()
        const shouldNotify = now - draggedElementLastSnapNotice > 1400
        const checked = enforcePlayerPinInBounds(
          { x: targetX, y: targetY },
          el.type === 'player_ct' ? 'CT' : 'T',
          shouldNotify
        )
        if (checked.wasSnapped && shouldNotify) {
          draggedElementLastSnapNotice = now
        }
        targetX = checked.x
        targetY = checked.y
      } else if (el.type === 'c4_bomb' || el.type === 'plant_a' || el.type === 'plant_b') {
        // Enforce Bombsite A or B ONLY when dragging C4 bomb
        const now = Date.now()
        const shouldNotify = now - draggedElementLastSnapNotice > 1400
        const validated = validateAndSnapC4BombCoords({ x: targetX, y: targetY }, shouldNotify)
        if (validated.wasSnapped && shouldNotify) {
          draggedElementLastSnapNotice = now
        }
        targetX = validated.x
        targetY = validated.y
      }

      if (el.points.length === 1) {
        if (Math.hypot(el.points[0].x - targetX, el.points[0].y - targetY) >= 0.05) {
          el.points[0] = { x: targetX, y: targetY }
          draggedElementMoved = true
        }
      } else if (el.points.length >= 2) {
        const dx = targetX - el.points[0].x
        const dy = targetY - el.points[0].y
        if (Math.hypot(dx, dy) >= 0.05) {
          el.points = el.points.map(pt => ({
            x: Math.round(Math.max(0.5, Math.min(99.5, pt.x + dx)) * 100) / 100,
            y: Math.round(Math.max(0.5, Math.min(99.5, pt.y + dy)) * 100) / 100
          }))
          draggedElementMoved = true
        }
      }
    }
    return
  }

  if (isErasing.value && stratStore.activeTool === 'eraser') {
    const coords = getMapCoords(e)
    eraseAtCoords(coords)
    return
  }

  if (!isDrawing.value) return
  const coords = getMapCoords(e)
  const tool = stratStore.activeTool

  if (tool === 'pen') {
    const pts = currentStroke.value
    const lastPt = pts[pts.length - 1]
    // Lightweight distance threshold >= 0.25% radar units for 60fps smoothness
    if (!lastPt || Math.hypot(coords.x - lastPt.x, coords.y - lastPt.y) >= 0.25) {
      pts.push(coords)
    }
  } else if (tool === 'arrow' || tool === 'line') {
    if (currentStroke.value.length === 1) {
      currentStroke.value.push(coords)
    } else {
      currentStroke.value[1] = coords
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value && !isDraggingElement.value && !isErasing.value) return
  pendingMouseEvent = e
  if (rafMoveId === null) {
    rafMoveId = requestAnimationFrame(() => {
      if (pendingMouseEvent) {
        const ev = pendingMouseEvent
        pendingMouseEvent = null
        processBatchedMouseMove(ev)
      } else {
        rafMoveId = null
      }
    })
  }
}

function handleMouseUp() {
  if (pendingMouseEvent) {
    const ev = pendingMouseEvent
    pendingMouseEvent = null
    processBatchedMouseMove(ev)
  }
  clearCachedSvgTransform()

  if (isErasing.value) {
    isErasing.value = false
    if (erasedAnyDuringDrag) {
      recordTimelineSnapshot('Erased tactical markings')
      erasedAnyDuringDrag = false
    }
  }

  if (isDraggingElement.value) {
    const movedEl = stratStore.boardElements.find(item => item.id === draggedElementId.value)
    isDraggingElement.value = false
    draggedElementId.value = null
    stratStore.saveCurrentMapElements(mapStore.currentMapId)
    const socket = getActiveSocket()
    if (socket && socket.connected) {
      socket.emit('room:elements_sync', { elements: stratStore.boardElements, mapId: mapStore.currentMapId })
    }
    if (draggedElementMoved && movedEl) {
      let moveLabel = `Moved ${movedEl.type}`
      if (movedEl.type === 'player_ct') {
        const role = getPinCustomLabel(movedEl)
        moveLabel = `Adjusted CT #${movedEl.playerNum || '1'}${role ? ` (${role})` : ''}`
      } else if (movedEl.type === 'player_t') {
        const role = getPinCustomLabel(movedEl)
        moveLabel = `Adjusted T #${movedEl.playerNum || '1'}${role ? ` (${role})` : ''}`
      } else if (movedEl.type === 'c4_bomb') {
        moveLabel = 'Moved C4 Bomb Plant'
      }
      recordTimelineSnapshot(moveLabel)
    }
    draggedElementMoved = false
    return
  }

  if (!isDrawing.value) return
  isDrawing.value = false

  const tool = stratStore.activeTool
  if (currentStroke.value.length >= 2) {
    let finalPoints = [...currentStroke.value]
    if (tool === 'arrow' && arrowControlMode.value === 'tail_controls') {
      finalPoints = [currentStroke.value[1], currentStroke.value[0]]
    }

    const labelMap: Record<string, string> = {
      pen: 'Freehand Pen Stroke',
      arrow: 'Directional Execute Arrow',
      line: 'Sightline / Alignment Line'
    }

    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: (tool === 'pen' ? 'pen' : tool === 'arrow' ? 'arrow' : 'line') as TacticsElementType,
        color: stratStore.activeColor,
        strokeWidth: activeStrokeWidth.value,
        points: finalPoints,
        authorId: authStore.currentUser?.id,
        authorUsername: authStore.currentUser?.username
      },
      `Drew ${labelMap[tool] || tool}`
    )
  }
  currentStroke.value = []
}

function addElement(element: TacticsElement, timelineLabel?: string) {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  stratStore.addBoardElement(element, { userId: currentUserId, username: authStore.currentUser?.username })
  const socket = getActiveSocket()
  if (socket && socket.connected) {
    socket.emit('room:element_add', { element, mapId: mapStore.currentMapId })
  }
  recordTimelineSnapshot(timelineLabel || `Added ${element.type}`)
}

function handleUndo() {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  const res = stratStore.undo(currentUserId)
  const socket = getActiveSocket()
  if (res && socket && socket.connected) {
    if (res.action === 'remove') {
      socket.emit('room:element_remove', { elementId: res.element.id, mapId: mapStore.currentMapId })
    } else if (res.action === 'add') {
      socket.emit('room:element_add', { element: res.element, mapId: mapStore.currentMapId })
    }
  }
  recordTimelineSnapshot('Undo adjustment')
}

function handleRedo() {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  const res = stratStore.redo(currentUserId)
  const socket = getActiveSocket()
  if (res && socket && socket.connected) {
    if (res.action === 'add') {
      socket.emit('room:element_add', { element: res.element, mapId: mapStore.currentMapId })
    } else if (res.action === 'remove') {
      socket.emit('room:element_remove', { elementId: res.element.id, mapId: mapStore.currentMapId })
    }
  }
  recordTimelineSnapshot('Redo adjustment')
}

function handleElementClick(e: MouseEvent, el: TacticsElement) {
  e.stopPropagation()
  if (!gameRoomStore.isHost && gameRoomStore.currentRoomCode) {
    const isMyElement =
      (el.authorId && authStore.currentUser?.id && el.authorId === authStore.currentUser.id) ||
      (el.authorUsername &&
        authStore.currentUser?.username &&
        el.authorUsername.toLowerCase() === authStore.currentUser.username.toLowerCase())
    if (!isMyElement && stratStore.activeTool === 'eraser') {
      showStatusNotice('You cannot erase drawings made by the Host', 2500)
      return
    }
  }

  if (stratStore.activeTool === 'eraser') {
    const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
    stratStore.removeBoardElement(el.id, { userId: currentUserId })
    const socket = getActiveSocket()
    if (socket && socket.connected) socket.emit('room:element_remove', { elementId: el.id, mapId: mapStore.currentMapId })
    recordTimelineSnapshot(`Removed ${el.type}`)
  } else if (stratStore.activeTool === 'select') {
    selectedElementId.value = selectedElementId.value === el.id ? null : el.id
  }
}

function handleConfirmText() {
  if (customTextInput.value.trim()) {
    const textVal = customTextInput.value.trim()
    addElement(
      {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'text',
        color: stratStore.activeColor,
        points: [pendingTextCoords.value],
        text: textVal,
        radius: customFontSize.value
      },
      `Added Note: "${textVal.slice(0, 18)}"`
    )
  }
  isTextInputModalOpen.value = false
  customTextInput.value = ''
}

function deleteSelectedElement() {
  if (!gameRoomStore.isHost && !gameRoomStore.allowGuestsToDraw) {
    alert('Host has locked tactical board modifications for guests.')
    return
  }
  if (selectedElementId.value) {
    const id = selectedElementId.value
    const targetEl = stratStore.boardElements.find(el => el.id === id)
    if (!gameRoomStore.isHost && gameRoomStore.currentRoomCode && targetEl) {
      const isMyElement =
        (targetEl.authorId && authStore.currentUser?.id && targetEl.authorId === authStore.currentUser.id) ||
        (targetEl.authorUsername &&
          authStore.currentUser?.username &&
          targetEl.authorUsername.toLowerCase() === authStore.currentUser.username.toLowerCase())
      if (!isMyElement) {
        alert('You can only delete your own markings (Host inputs are locked).')
        return
      }
    }

    stratStore.removeBoardElement(id)
    const socket = getActiveSocket()
    if (socket && socket.connected) socket.emit('room:element_remove', { elementId: id, mapId: mapStore.currentMapId })
    selectedElementId.value = null
    recordTimelineSnapshot(`Deleted ${targetEl?.type || 'element'}`)
  }
}

function handleClearBoard() {
  if (!gameRoomStore.isHost && !gameRoomStore.allowGuestsToDraw) {
    alert('Host has locked tactical board modifications for guests.')
    return
  }
  isClearConfirmModalOpen.value = true
}

function executeClearBoard() {
  stratStore.clearBoard()
  gameRoomStore.clearDrawings()
  const socket = getActiveSocket()
  if (socket && socket.connected) {
    socket.emit('room:clear_drawings', { mapId: mapStore.currentMapId })
  }
  recordTimelineSnapshot('Cleared Board')
  isClearConfirmModalOpen.value = false
}

function getSvgPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return ''
  return points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x * 10} ${pt.y * 10}` : `${acc} L ${pt.x * 10} ${pt.y * 10}`
  }, '')
}

function getArrowheadPolygon(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const x1 = p1.x * 10,
    y1 = p1.y * 10
  const x2 = p2.x * 10,
    y2 = p2.y * 10
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 14
  const width = 8
  const tipX = x2,
    tipY = y2
  const leftX = tipX - len * Math.cos(angle) + width * Math.sin(angle)
  const leftY = tipY - len * Math.sin(angle) - width * Math.cos(angle)
  const rightX = tipX - len * Math.cos(angle) - width * Math.sin(angle)
  const rightY = tipY - len * Math.sin(angle) + width * Math.cos(angle)
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`
}
</script>

<template>
  <div class="tactics-board-container flex flex-col gap-3.5">
    <!-- LIMITED GUEST VIEW-ONLY MODE BANNER -->
    <div
      v-if="authStore.isLimitedGuest"
      class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-fade-in"
    >
      <div class="flex items-center gap-2.5 text-slate-200">
        <Eye class="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
        <div>
          <strong class="text-amber-400">Guest View-Only Mode:</strong>
          <span class="text-slate-300 ml-1">
            You are watching live squad tactics and radar broadcasts in real time. Sign In or Register to draw, place pins, and save strats.
          </span>
        </div>
      </div>
      <button
        @click="authStore.isAuthModalOpen = true"
        class="px-3.5 py-1.5 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:opacity-90"
        :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
      >
        <Sparkles class="w-3.5 h-3.5" />
        <span>Sign In for Full Access</span>
      </button>
    </div>

    <!-- COMPACT APPLE-STYLE ROOM & STORAGE HEADER BAR -->
    <div class="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl relative z-20">
      <!-- ROOM BADGE & PERMISSIONS -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="handleCopyRoomCode"
          class="flex items-center gap-2 px-3 py-1.5 bg-slate-950/90 hover:bg-slate-900 border border-white/10 rounded-xl transition-all cursor-pointer group"
          title="Click to copy Room Code"
        >
          <Radio class="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span class="text-[11px] text-slate-400 font-semibold">Room</span>
          <span class="text-xs font-mono font-bold text-amber-400 group-hover:text-amber-300">
            {{ gameRoomStore.currentRoomCode || roomCodeInput }}
          </span>
        </button>

        <button
          @click="handleCopyRoomLink"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-slate-200 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          title="Share direct room invite link"
        >
          <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
          <Share2 v-else class="w-3.5 h-3.5 text-amber-400" />
          <span>{{ isCopied ? 'Copied' : 'Invite' }}</span>
        </button>

        <button
          @click="isJoinRoomModalOpen = true"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          title="Switch or join another tactical room"
        >
          <LogIn class="w-3.5 h-3.5 text-cyan-400" />
          <span>Switch Room</span>
        </button>

        <button
          @click="isMembersModalOpen = true"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          title="View squad members and manage host permissions"
        >
          <Crown v-if="gameRoomStore.isHost" class="w-3.5 h-3.5 text-amber-400" />
          <Users v-else class="w-3.5 h-3.5 text-slate-400" />
          <span>Squad ({{ gameRoomStore.members.length }})</span>
        </button>

        <!-- GHOST MODE TOGGLE (ADMIN ONLY) -->
        <button
          v-if="authStore.isAdmin"
          @click="gameRoomStore.toggleGhostMode"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
            gameRoomStore.isGhostMode
              ? 'bg-purple-950/90 text-purple-300 border-purple-500/50'
              : 'bg-slate-950/90 hover:bg-slate-900 text-slate-400 border-white/10'
          ]"
        >
          <Ghost :class="['w-3.5 h-3.5', gameRoomStore.isGhostMode ? 'text-purple-400 animate-pulse' : 'text-slate-500']" />
          <span>{{ gameRoomStore.isGhostMode ? 'Ghost On' : 'Ghost' }}</span>
        </button>

        <!-- ADMIN PREVIEW TOGGLES -->
        <button
          v-if="authStore.isActualAdmin"
          @click="authStore.toggleUserPreviewMode()"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
            authStore.isUserPreviewMode
              ? 'bg-purple-500 text-slate-950 border-purple-400 font-bold'
              : 'bg-slate-950/90 hover:bg-slate-900 text-slate-400 border-white/10'
          ]"
        >
          <Eye class="w-3.5 h-3.5" />
          <span>User View</span>
        </button>

        <button
          v-if="authStore.isActualAdmin"
          @click="authStore.toggleGuestPreviewMode()"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
            authStore.isGuestPreviewMode
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-950/90 hover:bg-slate-900 text-slate-400 border-white/10'
          ]"
        >
          <UserX class="w-3.5 h-3.5" />
          <span>Guest View</span>
        </button>

        <!-- HOST PERMISSIONS PILLS -->
        <div
          v-if="gameRoomStore.isHost"
          class="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-950/90 rounded-xl border border-amber-500/25"
        >
          <Crown class="w-3 h-3 text-amber-400 mr-0.5" />
          <button
            @click="gameRoomStore.updateRoomPermissions(!gameRoomStore.allowSignedUsersToDraw, gameRoomStore.allowGuestsToDraw, gameRoomStore.onlyHostCanChangeMap)"
            :class="[
              'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border',
              gameRoomStore.allowSignedUsersToDraw
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            ]"
          >
            <span>Users: {{ gameRoomStore.allowSignedUsersToDraw ? 'Draw' : 'Locked' }}</span>
          </button>
          <button
            @click="gameRoomStore.updateRoomPermissions(gameRoomStore.allowSignedUsersToDraw, !gameRoomStore.allowGuestsToDraw, gameRoomStore.onlyHostCanChangeMap)"
            :class="[
              'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border',
              gameRoomStore.allowGuestsToDraw
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            ]"
          >
            <span>Guests: {{ gameRoomStore.allowGuestsToDraw ? 'Draw' : 'Locked' }}</span>
          </button>
          <button
            @click="gameRoomStore.updateRoomPermissions(gameRoomStore.allowSignedUsersToDraw, gameRoomStore.allowGuestsToDraw, !gameRoomStore.onlyHostCanChangeMap)"
            :class="[
              'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border',
              gameRoomStore.onlyHostCanChangeMap
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
            ]"
          >
            <span>Map: {{ gameRoomStore.onlyHostCanChangeMap ? 'Host' : 'All' }}</span>
          </button>
        </div>

        <span v-if="copySuccessToast" class="text-xs font-semibold text-emerald-400 animate-fade-in">
          {{ copySuccessToast }}
        </span>
      </div>

      <!-- EXPORT / IMPORT / CLOUD / SYNC -->
      <div class="flex flex-wrap items-center gap-1.5">
        <input
          ref="importFileInputRef"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImportTacticsLocal"
        />

        <button
          @click="handleForceReSync"
          class="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-amber-400 border border-white/10 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          title="Force reload all markings from room server"
        >
          <RefreshCw class="w-3.5 h-3.5 text-emerald-400" />
          <span class="hidden sm:inline">Sync</span>
        </button>

        <button
          @click="handleExportTacticsLocal(true)"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          title="Export current board and adjustment history as JSON"
        >
          <Download class="w-3.5 h-3.5 text-cyan-400" />
          <span class="hidden sm:inline">Export JSON</span>
        </button>

        <button
          @click="triggerImportFileDialog"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          title="Import tactics and timeline history from JSON"
        >
          <Upload class="w-3.5 h-3.5 text-emerald-400" />
          <span class="hidden sm:inline">Import</span>
        </button>

        <button
          @click="openServerStorageModal"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          title="Save or load strategies with timeline history to/from Cloud"
        >
          <CloudUpload class="w-3.5 h-3.5 text-amber-400" />
          <span>Cloud</span>
        </button>
      </div>
    </div>

    <!-- MAIN WORKSPACE: RADAR CANVAS WITH IN-MAP FLOATING HUD + SIDE PANELS -->
    <div class="flex flex-col xl:flex-row gap-4 items-start w-full">
      <!-- RADAR MAP CONTAINER WITH FLOATING APPLE-INSPIRED HUD -->
      <div class="relative flex-grow w-full aspect-square max-w-4xl mx-auto bg-slate-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center select-none">
        <!-- ================================================================ -->
        <!-- TOP-LEFT IN-MAP PILL: ACTIVE MAP SWITCHER + ACTIVE STRAT BADGE   -->
        <!-- ================================================================ -->
        <div class="absolute top-3.5 left-3.5 z-30 flex flex-wrap items-center gap-2 max-w-[55%]">
          <!-- MAP SWITCHER DROPDOWN -->
          <div class="relative tactics-map-dropdown-container">
            <button
              @click.stop="isTacticsMapDropdownOpen = !isTacticsMapDropdownOpen"
              class="flex items-center gap-2 px-3 py-1.5 backdrop-blur-xl bg-slate-950/85 hover:bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl text-xs font-bold text-white transition-all cursor-pointer"
            >
              <img
                v-if="mapStore.currentMap?.icon"
                :src="mapStore.currentMap.icon"
                :alt="mapStore.currentMap.name"
                class="w-4 h-4 object-contain"
              />
              <span v-else class="w-2 h-2 rounded-full bg-amber-400" />
              <span class="uppercase tracking-wider font-mono">{{ mapStore.currentMap?.name }}</span>
              <ChevronDown
                class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
                :class="{ 'rotate-180': isTacticsMapDropdownOpen }"
              />
            </button>

            <div
              v-if="isTacticsMapDropdownOpen"
              class="absolute top-full left-0 mt-2 w-64 backdrop-blur-2xl bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col py-1 animate-fade-in"
            >
              <div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                <span>Switch Map</span>
                <span class="text-[10px] text-amber-400 font-mono">{{ mapStore.availableMaps.length }} Maps</span>
              </div>
              <div class="max-h-72 overflow-y-auto">
                <button
                  v-for="map in mapStore.availableMaps"
                  :key="map.id"
                  @click.stop="handleMapSelect(map.id)"
                  :class="[
                    'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer',
                    mapStore.currentMapId === map.id
                      ? 'bg-amber-500/20 text-amber-400 font-bold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  ]"
                >
                  <div class="flex items-center gap-2">
                    <img
                      v-if="map.icon"
                      :src="map.icon"
                      :alt="map.name"
                      class="w-4 h-4 object-contain flex-shrink-0"
                    />
                    <span>{{ map.name }}</span>
                  </div>
                  <span
                    v-if="map.activePool"
                    class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold"
                  >
                    ACTIVE
                  </span>
                  <span
                    v-else
                    class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                  >
                    RESERVE
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- ACTIVE MARKED STRATEGY IN-MAP PILL -->
          <div
            v-if="activeMarkedStrat"
            class="flex items-center gap-2 px-3 py-1.5 backdrop-blur-xl bg-slate-950/85 border border-amber-500/40 rounded-2xl shadow-2xl text-xs"
          >
            <BookmarkCheck class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <button
              @click.stop="isActiveStratBannerExpanded = !isActiveStratBannerExpanded"
              class="flex items-center gap-1.5 text-left cursor-pointer"
              title="Toggle Active Strategy Phase Checklist"
            >
              <span
                class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                :class="activeMarkedStrat.side === 'ct' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'"
              >
                {{ activeMarkedStrat.side.toUpperCase() }}
              </span>
              <span class="font-bold text-white truncate max-w-[160px] sm:max-w-[220px]">
                {{ activeMarkedStrat.title }}
              </span>
            </button>
            <button
              @click.stop="handleLoadStratToBoard(activeMarkedStrat, activeStratPhaseIndex)"
              class="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold transition-colors cursor-pointer"
              title="Apply 5 Player Pins to Board"
            >
              Load Pins
            </button>
            <button
              @click.stop="handleMarkStratActive(null)"
              class="text-slate-400 hover:text-white cursor-pointer"
              title="Unmark Active Strategy"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- ================================================================ -->
        <!-- TOP-RIGHT IN-MAP PILL: LEGEND, STRATBOOK, TIMELINE, SQUAD CHAT   -->
        <!-- ================================================================ -->
        <div class="absolute top-3.5 right-3.5 z-30 flex flex-wrap items-center justify-end gap-1.5 p-1.5 backdrop-blur-xl bg-slate-950/85 border border-white/10 rounded-2xl shadow-2xl">
          <button
            @click.stop="isLegendPanelOpen = !isLegendPanelOpen"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              isLegendPanelOpen
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            ]"
            title="Toggle CT & T Player Pin Legend (1-5 Custom Names)"
          >
            <Tag class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Player Legend</span>
          </button>

          <button
            @click.stop="isStratbookDrawerOpen = !isStratbookDrawerOpen"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              isStratbookDrawerOpen
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            ]"
            title="Open Map Stratbook Drawer & Mark Active Strategy"
          >
            <BookOpen class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Stratbook</span>
            <span class="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
              {{ stratStore.currentMapStrats.length }}
            </span>
          </button>

          <button
            @click.stop="isTimelinePanelOpen = !isTimelinePanelOpen"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              isTimelinePanelOpen
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            ]"
            title="Toggle Adjustments Timeline & Saveable History"
          >
            <History class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Timeline</span>
            <span class="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
              {{ currentMapTimeline.length }}
            </span>
          </button>

          <button
            @click.stop="isRightSidebarVisible = !isRightSidebarVisible"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              isRightSidebarVisible
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            ]"
            title="Toggle Room & Squad Chat"
          >
            <MessageSquare class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Chat</span>
          </button>

          <button
            @click.stop="isCustomizeToolbarOpen = true"
            class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Customize Tools & Custom Pins"
          >
            <Settings2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- ================================================================ -->
        <!-- ACTIVE STRATEGY BANNER & PHASE CHECKLIST HUD (TOP OVERLAY)       -->
        <!-- ================================================================ -->
        <div
          v-if="activeMarkedStrat && isActiveStratBannerExpanded"
          class="absolute top-16 left-3.5 z-20 w-80 sm:w-96 backdrop-blur-xl bg-slate-950/88 border border-white/10 rounded-2xl p-3 shadow-2xl text-xs flex flex-col gap-2 animate-fade-in"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400">Active Strategy in Use</span>
                <span v-if="activeMarkedStrat.targetSite" class="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-slate-200">
                  Site {{ activeMarkedStrat.targetSite }}
                </span>
              </div>
              <h4 class="font-bold text-white text-xs mt-0.5">{{ activeMarkedStrat.title }}</h4>
            </div>
            <button
              @click.stop="isActiveStratBannerExpanded = false"
              class="text-slate-400 hover:text-white p-1 cursor-pointer"
              title="Minimize banner"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <p class="text-[11px] text-slate-300 leading-snug line-clamp-2">
            {{ activeMarkedStrat.summary }}
          </p>

          <!-- PHASE CHECKLIST & LOAD PHASE PINS -->
          <div v-if="activeMarkedStrat.phases?.length" class="flex flex-col gap-1.5 pt-1 border-t border-white/10">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phase Checklist</span>
            <div
              v-for="(phase, pIdx) in activeMarkedStrat.phases"
              :key="phase.id"
              class="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-white/5"
            >
              <button
                @click.stop="togglePhaseCompleted(phase.id)"
                class="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
              >
                <CheckCircle2
                  class="w-3.5 h-3.5 flex-shrink-0 transition-colors"
                  :class="completedPhaseIds.includes(phase.id) ? 'text-emerald-400' : 'text-slate-500'"
                />
                <span
                  class="text-[11px] font-medium truncate"
                  :class="completedPhaseIds.includes(phase.id) ? 'line-through text-slate-500' : 'text-slate-200'"
                >
                  {{ pIdx + 1 }}. {{ phase.name }}
                </span>
              </button>
              <button
                @click.stop="handleLoadStratToBoard(activeMarkedStrat, pIdx)"
                class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                :class="
                  activeStratPhaseIndex === pIdx
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                "
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        <!-- ================================================================ -->
        <!-- STATUS TOAST / PLACEMENT RULE NOTICE PILL                        -->
        <!-- ================================================================ -->
        <div
          v-if="actionStatusToast"
          class="absolute top-16 right-3.5 z-30 px-3.5 py-2 backdrop-blur-xl bg-slate-950/90 border border-amber-500/40 rounded-2xl shadow-2xl text-xs font-semibold text-amber-300 flex items-center gap-2 animate-fade-in pointer-events-none"
        >
          <Sparkles class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>{{ actionStatusToast }}</span>
        </div>

        <!-- ================================================================ -->
        <!-- BOTTOM FLOATING IN-MAP TOOL DOCK (APPLE-INSPIRED GLASS HUD)      -->
        <!-- ================================================================ -->
        <div
          class="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 max-w-[96%] backdrop-blur-xl bg-slate-950/85 border border-white/10 rounded-2xl shadow-2xl px-3 py-2 flex flex-wrap items-center justify-center gap-2"
        >
          <!-- DRAWING & TACTICAL STAMP TOOLS -->
          <div class="flex flex-wrap items-center justify-center gap-1">
            <button
              v-for="tool in visibleTools"
              :key="tool.id"
              @click.stop="stratStore.activeTool = tool.id as any"
              :title="tool.label"
              :class="[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
                stratStore.activeTool === tool.id
                  ? 'bg-white/15 text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              ]"
            >
              <component :is="tool.icon" class="w-3.5 h-3.5" />
              <span class="hidden md:inline text-[11px]">{{ tool.label }}</span>
            </button>

            <!-- CUSTOM PINS QUICK STAMP -->
            <button
              v-for="pin in customPins"
              :key="pin.id"
              @click.stop="placeCustomPin(pin)"
              :title="`Place custom pin: ${pin.label}`"
              class="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold bg-slate-900/90 border border-white/10 hover:border-amber-500/50 transition-all cursor-pointer text-slate-300 hover:text-white"
            >
              <span class="font-mono text-[10px] text-amber-400">{{ pin.symbol }}</span>
              <span class="hidden lg:inline">{{ pin.label }}</span>
            </button>
          </div>

          <div class="h-5 w-px bg-white/10 hidden sm:block" />

          <!-- ARROW PIVOT TOGGLE WHEN ARROW TOOL ACTIVE -->
          <div
            v-if="stratStore.activeTool === 'arrow'"
            class="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-white/10 text-[10px]"
          >
            <button
              @click.stop="arrowControlMode = 'tail_controls'"
              :class="[
                'px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer',
                arrowControlMode === 'tail_controls' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              ]"
              title="Drag tail to steer arrow direction"
            >
              Tail
            </button>
            <button
              @click.stop="arrowControlMode = 'head_controls'"
              :class="[
                'px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer',
                arrowControlMode === 'head_controls' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              ]"
              title="Standard drag towards head"
            >
              Head
            </button>
          </div>

          <!-- COMPACT COLOR SWATCHES -->
          <div class="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-white/10">
            <button
              v-for="color in colorPalette"
              :key="color.hex"
              @click.stop="stratStore.activeColor = color.hex"
              :title="color.name"
              :class="[
                'w-4 h-4 rounded-full border transition-all cursor-pointer',
                stratStore.activeColor === color.hex
                  ? 'scale-125 border-white shadow'
                  : 'border-transparent opacity-75 hover:opacity-100'
              ]"
              :style="{ backgroundColor: color.hex }"
            />
          </div>

          <!-- STROKE WEIGHT SELECTOR (2px, 4px, 7px) -->
          <div class="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-white/10">
            <button
              v-for="w in [2, 4, 7]"
              :key="w"
              @click.stop="activeStrokeWidth = w"
              :class="[
                'px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors',
                activeStrokeWidth === w ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              ]"
            >
              {{ w }}px
            </button>
          </div>

          <!-- UNDO / REDO / DELETE / CLEAR -->
          <div class="flex items-center gap-1">
            <button
              @click.stop="handleUndo"
              title="Undo"
              class="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw class="w-3.5 h-3.5" />
            </button>
            <button
              @click.stop="handleRedo"
              title="Redo"
              class="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCw class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="selectedElementId"
              @click.stop="deleteSelectedElement"
              title="Delete Selected Element"
              class="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
            <button
              @click.stop="handleClearBoard"
              title="Clear Tactical Board"
              class="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        <!-- ================================================================ -->
        <!-- INTERACTIVE 1:1 RADAR SVG CANVAS                                 -->
        <!-- ================================================================ -->
        <svg
          ref="svgRef"
          viewBox="0 0 1000 1000"
          class="w-full h-full cursor-crosshair"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        >
          <defs>
            <marker
              id="arrowhead-gold"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#de9b35" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" :fill="stratStore.activeColor" />
            </marker>

            <!-- SMOKE GRADIENT -->
            <radialGradient id="smokeGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.75" />
              <stop offset="70%" stop-color="#64748b" stop-opacity="0.5" />
              <stop offset="100%" stop-color="#475569" stop-opacity="0" />
            </radialGradient>

            <!-- MOLOTOV FIRE GRADIENT -->
            <radialGradient id="fireGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.8" />
              <stop offset="50%" stop-color="#f97316" stop-opacity="0.6" />
              <stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
            </radialGradient>
          </defs>

          <!-- LAYER 1: RADAR BLUEPRINT -->
          <VectorMapBlueprint
            :map-info="mapStore.currentMap"
            :show-callouts="true"
          />

          <!-- LAYER 1.5: BOMBSITE A & B PLANT ZONE RINGS WHEN C4 TOOL ACTIVE -->
          <g
            v-if="stratStore.activeTool === 'c4_bomb' && mapStore.currentMap?.sites"
            class="pointer-events-none"
          >
            <g v-if="mapStore.currentMap.sites.a">
              <circle
                :cx="mapStore.currentMap.sites.a.x * 10"
                :cy="mapStore.currentMap.sites.a.y * 10"
                :r="BOMBSITE_PLANT_RADIUS * 10"
                fill="#ef4444"
                fill-opacity="0.1"
                stroke="#ef4444"
                stroke-width="2"
                stroke-dasharray="6 4"
              />
              <text
                :x="mapStore.currentMap.sites.a.x * 10"
                :y="mapStore.currentMap.sites.a.y * 10 - BOMBSITE_PLANT_RADIUS * 10 - 6"
                fill="#fca5a5"
                font-size="11"
                font-weight="800"
                text-anchor="middle"
              >
                SITE A PLANT ZONE
              </text>
            </g>
            <g v-if="mapStore.currentMap.sites.b">
              <circle
                :cx="mapStore.currentMap.sites.b.x * 10"
                :cy="mapStore.currentMap.sites.b.y * 10"
                :r="BOMBSITE_PLANT_RADIUS * 10"
                fill="#ef4444"
                fill-opacity="0.1"
                stroke="#ef4444"
                stroke-width="2"
                stroke-dasharray="6 4"
              />
              <text
                :x="mapStore.currentMap.sites.b.x * 10"
                :y="mapStore.currentMap.sites.b.y * 10 - BOMBSITE_PLANT_RADIUS * 10 - 6"
                fill="#fca5a5"
                font-size="11"
                font-weight="800"
                text-anchor="middle"
              >
                SITE B PLANT ZONE
              </text>
            </g>
          </g>

          <!-- LAYER 2: PLACED TACTICAL ELEMENTS -->
          <g class="tactics-elements-layer">
            <g
              v-for="el in stratStore.boardElements"
              :key="el.id"
              @mousedown="e => handleElementMouseDown(e, el)"
              @click="e => handleElementClick(e, el)"
              :class="{
                'opacity-85': selectedElementId === el.id,
                'cursor-grab active:cursor-grabbing': stratStore.activeTool === 'select',
                'cursor-pointer': stratStore.activeTool === 'eraser'
              }"
            >
              <!-- 1. FREEHAND PEN STROKE -->
              <path
                v-if="el.type === 'pen'"
                :d="getSvgPath(el.points)"
                fill="none"
                :stroke="el.color"
                :stroke-width="el.strokeWidth || 4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- 2. STRAIGHT LINE -->
              <line
                v-else-if="el.type === 'line' && el.points.length >= 2"
                :x1="el.points[0].x * 10"
                :y1="el.points[0].y * 10"
                :x2="el.points[1].x * 10"
                :y2="el.points[1].y * 10"
                :stroke="el.color"
                :stroke-width="el.strokeWidth || 4"
                stroke-linecap="round"
              />

              <!-- 3. DIRECTIONAL ARROW -->
              <g v-else-if="el.type === 'arrow' && el.points.length >= 2">
                <line
                  :x1="el.points[0].x * 10"
                  :y1="el.points[0].y * 10"
                  :x2="el.points[1].x * 10"
                  :y2="el.points[1].y * 10"
                  :stroke="el.color"
                  :stroke-width="el.strokeWidth || 4"
                  stroke-linecap="round"
                />
                <circle
                  :cx="el.points[0].x * 10"
                  :cy="el.points[0].y * 10"
                  r="3.5"
                  :fill="el.color"
                  stroke="#0f172a"
                  stroke-width="1.5"
                />
                <polygon
                  :points="getArrowheadPolygon(el.points[0], el.points[1])"
                  :fill="el.color"
                />
              </g>

              <!-- 4. SMOKE BLOOM -->
              <g v-else-if="el.type === 'smoke_cloud'">
                <circle
                  :cx="el.points[0].x * 10"
                  :cy="el.points[0].y * 10"
                  r="32"
                  fill="url(#smokeGradient)"
                  stroke="#94a3b8"
                  stroke-width="1.5"
                  stroke-dasharray="4 3"
                />
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="13" fill="#0f172a" stroke="#94a3b8" stroke-width="1.8" />
                <g :transform="`translate(${el.points[0].x * 10 - 7}, ${el.points[0].y * 10 - 7}) scale(0.58)`">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </g>
              </g>

              <!-- 6. FLASH BURST -->
              <g v-else-if="el.type === 'flash_burst'">
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="18" fill="#eab308" fill-opacity="0.25" stroke="#eab308" stroke-width="1.5" stroke-dasharray="3 2" />
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="13" fill="#0f172a" stroke="#eab308" stroke-width="1.8" />
                <g :transform="`translate(${el.points[0].x * 10 - 7}, ${el.points[0].y * 10 - 7}) scale(0.58)`">
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="none" stroke="#eab308" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </g>
              </g>

              <!-- 7. MOLOTOV FIRE -->
              <g v-else-if="el.type === 'molotov_fire'">
                <circle
                  :cx="el.points[0].x * 10"
                  :cy="el.points[0].y * 10"
                  r="25"
                  fill="url(#fireGradient)"
                  stroke="#f97316"
                  stroke-width="1.5"
                  stroke-dasharray="4 3"
                />
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="13" fill="#0f172a" stroke="#f97316" stroke-width="1.8" />
                <g :transform="`translate(${el.points[0].x * 10 - 7}, ${el.points[0].y * 10 - 7}) scale(0.58)`">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </g>
              </g>

              <!-- 8. HE GRENADE BLAST -->
              <g v-else-if="el.type === 'he_blast'">
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="20" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3 2" />
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="13" fill="#0f172a" stroke="#22c55e" stroke-width="1.8" />
                <g :transform="`translate(${el.points[0].x * 10 - 7}, ${el.points[0].y * 10 - 7}) scale(0.58)`">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="#22c55e" stroke-width="2.5" />
                  <line x1="22" x2="18" y1="12" y2="12" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" />
                  <line x1="6" x2="2" y1="12" y2="12" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" />
                  <line x1="12" x2="12" y1="6" y2="2" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" />
                  <line x1="12" x2="12" y1="22" y2="18" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" />
                </g>
              </g>

              <!-- 9. C4 BOMB (SITE A OR B PLANT ONLY) -->
              <g v-else-if="el.type === 'c4_bomb' || el.type === 'plant_a' || el.type === 'plant_b'">
                <rect
                  :x="el.points[0].x * 10 - 15"
                  :y="el.points[0].y * 10 - 12"
                  width="30"
                  height="24"
                  rx="3"
                  fill="#27272a"
                  stroke="#ef4444"
                  stroke-width="1.8"
                  class="shadow-2xl"
                />
                <rect
                  :x="el.points[0].x * 10 - 13"
                  :y="el.points[0].y * 10 - 10"
                  width="26"
                  height="8"
                  rx="2"
                  fill="#78350f"
                  stroke="#92400e"
                  stroke-width="1"
                />
                <rect :x="el.points[0].x * 10 - 11" :y="el.points[0].y * 10 - 11" width="4" height="22" fill="#71717a" opacity="0.85" />
                <rect :x="el.points[0].x * 10 + 7" :y="el.points[0].y * 10 - 11" width="4" height="22" fill="#71717a" opacity="0.85" />
                <rect
                  :x="el.points[0].x * 10 - 5"
                  :y="el.points[0].y * 10 - 1"
                  width="16"
                  height="10"
                  rx="2"
                  fill="#09090b"
                  stroke="#3f3f46"
                  stroke-width="1"
                />
                <text
                  :x="el.points[0].x * 10 + 3"
                  :y="el.points[0].y * 10 + 5.5"
                  fill="#ef4444"
                  font-size="4"
                  font-family="monospace"
                  font-weight="900"
                  text-anchor="middle"
                  class="select-none pointer-events-none tracking-tighter"
                >
                  7355608
                </text>
                <circle
                  :cx="el.points[0].x * 10 - 9"
                  :cy="el.points[0].y * 10 + 4"
                  r="1.8"
                  fill="#ef4444"
                  stroke="#7f1d1d"
                  stroke-width="0.8"
                  class="animate-pulse"
                />
              </g>

              <!-- 10. PLAYER PIN (CT 1-5 & T 1-5 WITH FLOATING CUSTOM LEGEND LABEL) -->
              <g v-else-if="el.type === 'player_t' || el.type === 'player_ct' || el.type === 'player_icon'">
                <!-- Selected ring highlight -->
                <circle
                  v-if="selectedElementId === el.id"
                  :cx="el.points[0].x * 10"
                  :cy="el.points[0].y * 10"
                  r="20"
                  fill="none"
                  stroke="#ffffff"
                  stroke-width="2"
                  stroke-dasharray="4 3"
                />
                <!-- Main numbered circle -->
                <circle
                  :cx="el.points[0].x * 10"
                  :cy="el.points[0].y * 10"
                  r="15"
                  :fill="el.type === 'player_ct' ? '#0ea5e9' : '#f97316'"
                  stroke="#020617"
                  stroke-width="2.5"
                />
                <text
                  :x="el.points[0].x * 10"
                  :y="el.points[0].y * 10 + 4.5"
                  fill="#020617"
                  font-size="12"
                  font-weight="900"
                  font-family="sans-serif"
                  text-anchor="middle"
                  class="pointer-events-none select-none"
                >
                  {{ el.playerNum || '1' }}
                </text>

                <!-- Floating Custom Legend Name Pill Below Pin -->
                <g v-if="getPinCustomLabel(el)" class="pointer-events-none select-none">
                  <rect
                    :x="el.points[0].x * 10 - Math.max(26, getPinCustomLabel(el).length * 3.3 + 8)"
                    :y="el.points[0].y * 10 + 18"
                    :width="Math.max(52, getPinCustomLabel(el).length * 6.6 + 16)"
                    height="17"
                    rx="6"
                    fill="#020617"
                    fill-opacity="0.88"
                    :stroke="el.type === 'player_ct' ? '#0ea5e9' : '#f97316'"
                    stroke-width="1.2"
                  />
                  <text
                    :x="el.points[0].x * 10"
                    :y="el.points[0].y * 10 + 29.5"
                    :fill="el.type === 'player_ct' ? '#7dd3fc' : '#fdba74'"
                    font-size="9.5"
                    font-weight="800"
                    font-family="sans-serif"
                    text-anchor="middle"
                  >
                    {{ getPinCustomLabel(el) }}
                  </text>
                </g>
              </g>

              <!-- 11. TEXT ANNOTATION -->
              <g v-else-if="el.type === 'text'">
                <rect
                  :x="el.points[0].x * 10 - 4"
                  :y="el.points[0].y * 10 - 14"
                  :width="Math.max(40, (el.text?.length || 5) * 8 + 12)"
                  height="22"
                  rx="5"
                  fill="#0f172a"
                  fill-opacity="0.88"
                  stroke="#334155"
                  stroke-width="1"
                />
                <text
                  :x="el.points[0].x * 10 + 2"
                  :y="el.points[0].y * 10 + 1"
                  :fill="el.color"
                  :font-size="el.radius || 12"
                  font-weight="bold"
                  font-family="sans-serif"
                >
                  {{ el.text }}
                </text>
              </g>
            </g>

            <!-- ACTIVE CURRENT DRAWING STROKE (POINTER-EVENTS-NONE FOR ZERO DRAG INTERCEPTION) -->
            <path
              v-if="isDrawing && currentStroke.length > 1 && stratStore.activeTool === 'pen'"
              :d="getSvgPath(currentStroke)"
              fill="none"
              :stroke="stratStore.activeColor"
              :stroke-width="activeStrokeWidth"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="pointer-events-none"
            />

            <!-- ARROW PREVIEW (POINTER-EVENTS-NONE) -->
            <g
              v-else-if="isDrawing && currentStroke.length === 2 && stratStore.activeTool === 'arrow'"
              class="pointer-events-none"
            >
              <line
                :x1="arrowControlMode === 'tail_controls' ? currentStroke[1].x * 10 : currentStroke[0].x * 10"
                :y1="arrowControlMode === 'tail_controls' ? currentStroke[1].y * 10 : currentStroke[0].y * 10"
                :x2="arrowControlMode === 'tail_controls' ? currentStroke[0].x * 10 : currentStroke[1].x * 10"
                :y2="arrowControlMode === 'tail_controls' ? currentStroke[0].y * 10 : currentStroke[1].y * 10"
                :stroke="stratStore.activeColor"
                :stroke-width="activeStrokeWidth"
                stroke-linecap="round"
              />
              <circle
                :cx="arrowControlMode === 'tail_controls' ? currentStroke[1].x * 10 : currentStroke[0].x * 10"
                :cy="arrowControlMode === 'tail_controls' ? currentStroke[1].y * 10 : currentStroke[0].y * 10"
                r="4.5"
                :fill="stratStore.activeColor"
                stroke="#0f172a"
                stroke-width="1.5"
              />
              <polygon
                :points="
                  getArrowheadPolygon(
                    arrowControlMode === 'tail_controls' ? currentStroke[1] : currentStroke[0],
                    arrowControlMode === 'tail_controls' ? currentStroke[0] : currentStroke[1]
                  )
                "
                :fill="stratStore.activeColor"
              />
            </g>

            <!-- LINE PREVIEW (POINTER-EVENTS-NONE) -->
            <line
              v-else-if="isDrawing && currentStroke.length === 2 && stratStore.activeTool === 'line'"
              :x1="currentStroke[0].x * 10"
              :y1="currentStroke[0].y * 10"
              :x2="currentStroke[1].x * 10"
              :y2="currentStroke[1].y * 10"
              :stroke="stratStore.activeColor"
              :stroke-width="activeStrokeWidth"
              stroke-linecap="round"
              class="pointer-events-none"
            />
          </g>
        </svg>
      </div>

      <!-- ================================================================== -->
      <!-- RIGHT SIDE DOCK: PLAYER LEGEND, STRATBOOK DRAWER, TIMELINE & CHAT  -->
      <!-- ================================================================== -->
      <div
        v-if="isLegendPanelOpen || isStratbookDrawerOpen || isTimelinePanelOpen || isRightSidebarVisible"
        class="w-full xl:w-96 flex flex-col gap-3.5 shrink-0"
      >
        <!-- PANEL 1: CT & T PLAYER PIN LEGEND (CUSTOM NAMES 1..5) -->
        <div
          v-if="isLegendPanelOpen"
          class="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 animate-fade-in"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <Tag class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">Player Pin Legend (1–5)</h3>
                <p class="text-[11px] text-slate-400">Custom role/player labels rendered directly on radar pins</p>
              </div>
            </div>
            <button
              @click="isLegendPanelOpen = false"
              class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- TEAM SWITCHER: CT 1-5 vs T 1-5 -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 flex-1">
              <button
                @click="activeLegendTeamTab = 'ct'"
                :class="[
                  'flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
                  activeLegendTeamTab === 'ct'
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <Shield class="w-3.5 h-3.5" />
                <span>CT Pins ({{ stratStore.boardElements.filter(e => e.type === 'player_ct').length }}/5)</span>
              </button>
              <button
                @click="activeLegendTeamTab = 't'"
                :class="[
                  'flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
                  activeLegendTeamTab === 't'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <User class="w-3.5 h-3.5" />
                <span>T Pins ({{ stratStore.boardElements.filter(e => e.type === 'player_t').length }}/5)</span>
              </button>
            </div>
          </div>

          <!-- 1-CLICK PLACE ALL 1-5 & RESET -->
          <div class="flex items-center gap-2">
            <button
              @click="handlePlaceAllTeamPins(activeLegendTeamTab)"
              :class="[
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md',
                activeLegendTeamTab === 'ct'
                  ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              ]"
            >
              <MapPin class="w-3.5 h-3.5" />
              <span>Place {{ activeLegendTeamTab.toUpperCase() }} 1-5 on Map</span>
            </button>
            <button
              @click="resetCurrentMapLegend(activeLegendTeamTab)"
              class="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Reset names to default roles"
            >
              Reset
            </button>
          </div>

          <!-- SLOTS 1..5 EDITABLE LEGEND ROWS -->
          <div class="flex flex-col gap-2">
            <div
              v-for="num in ['1', '2', '3', '4', '5']"
              :key="`${activeLegendTeamTab}-${num}`"
              class="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950/90 border border-white/10"
            >
              <!-- PIN NUMBER BADGE -->
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-slate-950 flex-shrink-0"
                :class="activeLegendTeamTab === 'ct' ? 'bg-sky-400' : 'bg-amber-400'"
              >
                {{ num }}
              </span>

              <!-- CUSTOM NAME INPUT -->
              <input
                :value="activeLegendTeamTab === 'ct' ? currentCtLegend[num] : currentTLegend[num]"
                @input="updateLegendName(activeLegendTeamTab, num, ($event.target as HTMLInputElement).value)"
                type="text"
                :placeholder="`${activeLegendTeamTab.toUpperCase()} ${num} Role or Player...`"
                class="flex-1 bg-transparent text-xs text-white font-medium focus:outline-none px-1.5 py-1 border-b border-transparent focus:border-white/25"
              />

              <!-- 1-CLICK PLACE OR FOCUS THIS PIN -->
              <button
                @click="placeOrFocusSinglePin(activeLegendTeamTab, num)"
                class="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                :title="`Place or highlight ${activeLegendTeamTab.toUpperCase()} #${num} on the radar`"
              >
                {{
                  stratStore.boardElements.some(
                    e => e.type === (activeLegendTeamTab === 'ct' ? 'player_ct' : 'player_t') && String(e.playerNum) === num
                  )
                    ? 'Focus'
                    : 'Place'
                }}
              </button>
            </div>
          </div>

          <p class="text-[10px] text-slate-400 leading-relaxed">
            CT &amp; T pins strictly enforce playable map bounds; C4 bomb strictly enforces Bombsite A or B plant zones.
          </p>
        </div>

        <!-- PANEL 2: MAP STRATBOOK PULL-UP DRAWER -->
        <div
          v-if="isStratbookDrawerOpen"
          class="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 max-h-[520px] animate-fade-in"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <BookOpen class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">
                  {{ mapStore.currentMap?.name }} Stratbook ({{ filteredDrawerStrats.length }})
                </h3>
                <p class="text-[11px] text-slate-400">Mark active strategy or load 5v5 positions onto board</p>
              </div>
            </div>
            <button
              @click="isStratbookDrawerOpen = false"
              class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- SEARCH & SIDE FILTER -->
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="stratDrawerSearch"
                type="text"
                placeholder="Search map strats (CS2Flow, A Split...)"
                class="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div class="flex items-center gap-0.5 bg-slate-950 p-1 rounded-xl border border-white/10 text-[11px]">
              <button
                v-for="sOpt in (['all', 't', 'ct'] as const)"
                :key="sOpt"
                @click="stratDrawerSideFilter = sOpt"
                :class="[
                  'px-2 py-0.5 rounded-lg font-bold uppercase cursor-pointer transition-colors',
                  stratDrawerSideFilter === sOpt ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                ]"
              >
                {{ sOpt }}
              </button>
            </div>
          </div>

          <!-- STRAT CARDS LIST -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            <div
              v-if="filteredDrawerStrats.length === 0"
              class="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-white/5"
            >
              No matching strategies found for {{ mapStore.currentMap?.name }}.
            </div>

            <div
              v-for="strat in filteredDrawerStrats"
              :key="strat.id"
              :class="[
                'p-3 rounded-2xl border transition-all flex flex-col gap-2',
                activeMarkedStrat?.id === strat.id
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-slate-950/85 border-white/10 hover:border-white/20'
              ]"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex flex-col gap-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                      class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                      :class="strat.side === 'ct' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'"
                    >
                      {{ strat.side.toUpperCase() }}
                    </span>
                    <span
                      v-if="strat.targetSite"
                      class="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-slate-300"
                    >
                      Site {{ strat.targetSite }}
                    </span>
                    <span
                      v-if="strat.tags?.some(t => /cs2flow/i.test(t))"
                      class="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold"
                    >
                      CS2Flow
                    </span>
                  </div>
                  <h4 class="text-xs font-bold text-white leading-snug">{{ strat.title }}</h4>
                </div>
              </div>

              <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {{ strat.summary }}
              </p>

              <!-- ACTIONS: MARK ACTIVE & LOAD TO BOARD -->
              <div class="flex items-center gap-2 pt-1">
                <button
                  @click="handleMarkStratActive(activeMarkedStrat?.id === strat.id ? null : strat)"
                  :class="[
                    'flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1',
                    activeMarkedStrat?.id === strat.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10'
                  ]"
                >
                  <BookmarkCheck class="w-3.5 h-3.5" />
                  <span>{{ activeMarkedStrat?.id === strat.id ? 'Active Strat' : 'Mark Active' }}</span>
                </button>

                <button
                  @click="handleLoadStratToBoard(strat, 0)"
                  class="flex-1 py-1.5 px-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Layers class="w-3.5 h-3.5" />
                  <span>Load to Board</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- PANEL 3: ADJUSTMENTS TIMELINE & SAVEABLE HISTORY -->
        <div
          v-if="isTimelinePanelOpen"
          class="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 max-h-[480px] animate-fade-in"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <History class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">
                  Adjustments Timeline ({{ currentMapTimeline.length }})
                </h3>
                <p class="text-[11px] text-slate-400">Click any step to preview/restore board &amp; legend</p>
              </div>
            </div>
            <button
              @click="isTimelinePanelOpen = false"
              class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- SAVE MANUAL CHECKPOINT INPUT -->
          <div class="flex items-center gap-1.5">
            <input
              v-model="customCheckpointLabel"
              @keyup.enter="handleSaveManualCheckpoint"
              type="text"
              placeholder="Checkpoint label (e.g. Late B Rotation)..."
              class="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
            <button
              @click="handleSaveManualCheckpoint"
              class="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              Save Step
            </button>
          </div>

          <!-- TIMELINE NODES SCRUBBER LIST -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
            <button
              v-for="snap in currentMapTimeline.slice().reverse()"
              :key="snap.id"
              @click="restoreTimelineSnapshot(snap)"
              :class="[
                'w-full text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2',
                activeTimelineSnapshotId === snap.id
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                  : 'bg-slate-950/80 border-white/10 text-slate-300 hover:border-white/20'
              ]"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="px-1.5 py-0.5 rounded-lg bg-white/10 text-[10px] font-mono font-bold text-emerald-300">
                  #{{ snap.stepNumber }}
                </span>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-bold truncate">{{ snap.label }}</span>
                  <span class="text-[10px] text-slate-400 font-mono">
                    {{ snap.timestamp }} · {{ snap.elementCount }} items
                  </span>
                </div>
              </div>
              <span class="text-[10px] font-semibold text-emerald-400 flex-shrink-0">Restore</span>
            </button>
          </div>

          <!-- SAVE FULL HISTORY JSON & SAVE TO CLOUD WITH HISTORY -->
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
            <button
              @click="handleExportTacticsLocal(true)"
              class="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-white/10 text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Save History (JSON)</span>
            </button>
            <button
              @click="handleSaveTacticsToServer"
              class="py-2 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CloudUpload class="w-3.5 h-3.5" />
              <span>Cloud + History</span>
            </button>
          </div>
        </div>

        <!-- PANEL 4: ROOM CHAT / PRIVATE DM / SQUAD ROSTER -->
        <div
          v-if="isRightSidebarVisible"
          class="w-full h-[460px] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
        >
          <div class="p-3 bg-slate-950 border-b border-white/10 flex items-center justify-between gap-1 shrink-0">
            <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 flex-1">
              <button
                @click="rightSidebarTab = 'public_chat'"
                :class="[
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  rightSidebarTab === 'public_chat' ? 'font-black shadow' : 'text-slate-400 hover:text-white'
                ]"
                :style="
                  rightSidebarTab === 'public_chat'
                    ? { backgroundColor: themeStore.customAccentColor, color: '#020617' }
                    : {}
                "
              >
                <MessageSquare class="w-3.5 h-3.5" />
                <span>Room</span>
              </button>

              <button
                @click="rightSidebarTab = 'private_chat'"
                :class="[
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  rightSidebarTab === 'private_chat' ? 'font-black shadow' : 'text-slate-400 hover:text-white'
                ]"
                :style="
                  rightSidebarTab === 'private_chat'
                    ? { backgroundColor: themeStore.customAccentColor, color: '#020617' }
                    : {}
                "
              >
                <Lock class="w-3.5 h-3.5" />
                <span>DMs</span>
              </button>

              <button
                @click="rightSidebarTab = 'players'"
                :class="[
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  rightSidebarTab === 'players' ? 'font-black shadow' : 'text-slate-400 hover:text-white'
                ]"
                :style="
                  rightSidebarTab === 'players'
                    ? { backgroundColor: themeStore.customAccentColor, color: '#020617' }
                    : {}
                "
              >
                <Users class="w-3.5 h-3.5" />
                <span>Squad ({{ gameRoomStore.members.length }})</span>
              </button>
            </div>

            <button
              @click="isRightSidebarVisible = false"
              class="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- TAB 1: PUBLIC ROOM CHAT -->
          <div v-if="rightSidebarTab === 'public_chat'" class="flex-1 flex flex-col justify-between overflow-hidden">
            <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-xs">
              <div v-if="gameRoomStore.chatMessages.length === 0" class="m-auto text-center text-slate-500 italic p-4">
                <span>No room messages yet. Coordinate with your squad here.</span>
              </div>
              <div
                v-for="(msg, mIdx) in gameRoomStore.chatMessages"
                :key="`rc-${mIdx}`"
                :class="[
                  'flex flex-col max-w-[88%] rounded-2xl p-2.5 text-xs',
                  msg.username === (authStore.currentUser?.username || 'Teammate')
                    ? 'self-end bg-amber-500 text-slate-950 font-medium'
                    : 'self-start bg-slate-950 border border-white/10 text-slate-200'
                ]"
              >
                <div class="flex items-center gap-1.5 mb-0.5 opacity-80 text-[10px]">
                  <span class="font-bold">{{ msg.username }}</span>
                  <span v-if="msg.inGameRole" class="font-mono text-[9px] text-amber-400">[{{ msg.inGameRole }}]</span>
                  <span class="text-[9px] opacity-75">{{ msg.time }}</span>
                </div>
                <p class="leading-relaxed whitespace-pre-wrap break-words">{{ msg.text }}</p>
              </div>
            </div>

            <form
              @submit.prevent="sendRoomMessage"
              class="p-2.5 border-t border-white/10 bg-slate-950/80 flex items-center gap-1.5"
            >
              <input
                v-model="roomChatInput"
                type="text"
                placeholder="Message everyone in room..."
                class="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                :disabled="!roomChatInput.trim()"
                class="p-2 disabled:opacity-30 font-black rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
              >
                <Send class="w-4 h-4" />
              </button>
            </form>
          </div>

          <!-- TAB 2: DIRECT MESSAGES -->
          <div v-else-if="rightSidebarTab === 'private_chat'" class="flex-1 flex flex-col justify-between overflow-hidden">
            <div
              v-if="!selectedPrivateRecipientId"
              class="flex-1 p-4 flex flex-col items-center justify-center text-center gap-3 text-xs"
            >
              <MessageSquare class="w-8 h-8 text-amber-400/70" />
              <span class="font-bold text-slate-200">Direct Messages</span>
              <span class="text-[11px] text-slate-400">Select a player from the Squad tab to start an encrypted direct message.</span>
              <button
                @click="rightSidebarTab = 'players'"
                class="px-4 py-2 font-black rounded-xl text-xs cursor-pointer shadow hover:opacity-90 transition-opacity"
                :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
              >
                Choose Player
              </button>
            </div>

            <template v-else>
              <div class="px-3 py-2 bg-slate-950/80 border-b border-white/10 flex items-center justify-between text-xs shrink-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-white">
                    DM with {{ selectedPrivateRecipientUser?.username || selectedPrivateRecipientId }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold flex items-center gap-1">
                    <Lock class="w-2.5 h-2.5" />
                    <span>E2EE</span>
                  </span>
                </div>
                <button
                  @click="selectedPrivateRecipientId = null; selectedPrivateRecipientUser = null"
                  class="text-[10px] text-slate-400 hover:text-white cursor-pointer font-bold"
                >
                  Change
                </button>
              </div>

              <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-xs">
                <div v-if="privateMessages.length === 0" class="m-auto text-center text-slate-500 italic p-4">
                  <span>No private messages yet.</span>
                </div>
                <div
                  v-for="pmsg in privateMessages"
                  :key="pmsg.id"
                  :class="[
                    'flex flex-col max-w-[88%] rounded-2xl p-2.5 text-xs',
                    pmsg.senderId === authStore.currentUser?.id
                      ? 'self-end bg-amber-500 text-slate-950 font-medium'
                      : 'self-start bg-slate-950 border border-white/10 text-slate-200'
                  ]"
                >
                  <div class="flex items-center gap-1.5 mb-0.5 opacity-80 text-[10px]">
                    <span class="font-bold">{{ pmsg.senderUsername }}</span>
                    <span class="text-[9px] opacity-75">
                      {{ new Date(pmsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                    </span>
                  </div>
                  <p class="leading-relaxed whitespace-pre-wrap break-words">{{ pmsg.text }}</p>
                </div>
              </div>

              <form
                @submit.prevent="sendPrivateMessage"
                class="p-2.5 border-t border-white/10 bg-slate-950/80 flex items-center gap-1.5"
              >
                <input
                  v-model="privateChatInput"
                  type="text"
                  placeholder="Send encrypted message..."
                  class="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  :disabled="!privateChatInput.trim()"
                  class="p-2 disabled:opacity-30 font-black rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                  :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
                >
                  <Send class="w-4 h-4" />
                </button>
              </form>
            </template>
          </div>

          <!-- TAB 3: SQUAD ROSTER -->
          <div v-else-if="rightSidebarTab === 'players'" class="flex-1 overflow-y-auto p-3 flex flex-col gap-2 text-xs">
            <div
              v-for="member in gameRoomStore.members"
              :key="member.socketId"
              class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-white/10"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <img
                  :src="member.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + member.username"
                  class="w-7 h-7 rounded-xl object-cover border border-slate-700 shrink-0"
                />
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-white text-xs truncate">{{ member.username }}</span>
                    <Crown v-if="member.isHost" class="w-3 h-3 text-amber-400 shrink-0" title="Room Host" />
                  </div>
                  <span class="text-[10px] text-amber-400 font-mono">{{ member.inGameRole || 'Player' }}</span>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <button
                  v-if="member.username !== authStore.currentUser?.username"
                  @click="selectPrivateRecipient(member)"
                  class="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg cursor-pointer border border-white/10"
                  title="Send Private Message"
                >
                  <MessageSquare class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 1: CUSTOMIZE TOOLBAR & ENABLED ICONS -->
    <div
      v-if="isCustomizeToolbarOpen"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:items-center animate-fade-in"
      @click.self="isCustomizeToolbarOpen = false"
    >
      <div class="my-auto w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        <div class="p-5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <Settings2 class="w-5 h-5 text-amber-400" />
            <div>
              <h3 class="text-sm font-black uppercase text-white">Customize In-Map Tool Dock</h3>
              <p class="text-xs text-slate-400">Enable or disable quick-access icons and create custom tactical pins</p>
            </div>
          </div>
          <button
            @click="isCustomizeToolbarOpen = false"
            class="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex flex-col gap-6 text-xs">
          <div class="flex flex-col gap-3">
            <h4 class="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Enabled In-Map Tools</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                v-for="tool in allToolsCatalogue"
                :key="tool.id"
                @click="toggleToolEnabled(tool.id)"
                :class="[
                  'flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left',
                  enabledToolIds.includes(tool.id)
                    ? 'bg-amber-500/15 border-amber-500/50 text-white'
                    : 'bg-slate-950 border-white/10 text-slate-500 opacity-60 hover:opacity-100'
                ]"
              >
                <div class="flex items-center gap-2">
                  <component :is="tool.icon" class="w-4 h-4 text-amber-400" />
                  <span>{{ tool.label }}</span>
                </div>
                <div
                  :class="[
                    'w-4 h-4 rounded-md border flex items-center justify-center text-[10px]',
                    enabledToolIds.includes(tool.id)
                      ? 'bg-amber-500 border-amber-500 text-slate-950 font-black'
                      : 'border-slate-700'
                  ]"
                >
                  <Check v-if="enabledToolIds.includes(tool.id)" class="w-3 h-3 stroke-[3]" />
                </div>
              </button>
            </div>
          </div>

          <!-- CREATE CUSTOM STAMPED PIN -->
          <div class="p-4 bg-slate-950/80 border border-white/10 rounded-2xl flex flex-col gap-3">
            <h4 class="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Create Custom Tactical Pin</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                v-model="newPinLabel"
                type="text"
                placeholder="Pin Label (e.g. Danger, AWP)"
                class="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <input
                v-model="newPinSymbol"
                type="text"
                placeholder="Tag Code (e.g. AWP, INFO)"
                class="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                @click="handleAddCustomPin"
                class="px-3 py-2 font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow hover:opacity-90 transition-opacity"
                :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
              >
                <Plus class="w-4 h-4" />
                <span>Add Pin</span>
              </button>
            </div>

            <div v-if="customPins.length > 0" class="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              <div
                v-for="pin in customPins"
                :key="pin.id"
                class="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-white/10 rounded-xl"
              >
                <span class="font-mono text-amber-400 font-bold">{{ pin.symbol }}</span>
                <span class="font-bold text-white">{{ pin.label }}</span>
                <button
                  @click="handleDeleteCustomPin(pin.id)"
                  class="text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-end">
          <button
            @click="isCustomizeToolbarOpen = false"
            class="px-5 py-2 font-black rounded-xl text-xs cursor-pointer shadow hover:opacity-90 transition-opacity"
            :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: TEXT CALLOUT INPUT MODAL -->
    <div
      v-if="isTextInputModalOpen"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-4 flex justify-center items-start sm:items-center"
      @click.self="isTextInputModalOpen = false"
    >
      <div class="my-auto w-full max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <h3 class="text-sm font-black uppercase text-white">Add Tactical Callout Note</h3>
        <input
          v-model="customTextInput"
          @keyup.enter="handleConfirmText"
          type="text"
          placeholder="e.g. Flash over roof / Hold cross"
          class="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          autofocus
        />
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">Font Size:</span>
          <div class="flex items-center gap-1">
            <button
              v-for="s in [10, 12, 14, 16]"
              :key="s"
              @click="customFontSize = s"
              :class="[
                'px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer',
                customFontSize === s ? 'text-slate-950' : 'bg-slate-950 text-slate-400'
              ]"
              :style="customFontSize === s ? { backgroundColor: themeStore.customAccentColor, color: '#020617' } : {}"
            >
              {{ s }}px
            </button>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            @click="isTextInputModalOpen = false"
            class="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="handleConfirmText"
            class="px-4 py-1.5 font-black rounded-lg text-xs cursor-pointer shadow hover:opacity-90 transition-opacity"
            :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
          >
            Place Note
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: JOIN ROOM MODAL -->
    <div
      v-if="isJoinRoomModalOpen"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:items-center animate-fade-in"
      @click.self="isJoinRoomModalOpen = false"
    >
      <div class="my-auto w-full max-w-sm bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Radio class="w-4 h-4 text-emerald-400" />
            <h3 class="text-sm font-black uppercase text-white">Join Tactical Room</h3>
          </div>
          <button @click="isJoinRoomModalOpen = false" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <p class="text-xs text-slate-300">
          Enter a room code or paste an invite link shared by your team leader or coach.
        </p>

        <input
          v-model="newRoomInput"
          @keyup.enter="joinTacticalRoom(newRoomInput)"
          type="text"
          placeholder="e.g. SQUAD-ALPHA or PRO-9821"
          class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
          autofocus
        />

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            @click="isJoinRoomModalOpen = false"
            class="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="joinTacticalRoom(newRoomInput)"
            :disabled="!newRoomInput.trim()"
            class="px-5 py-2 disabled:opacity-40 font-black rounded-xl text-xs cursor-pointer shadow-lg hover:opacity-90 transition-opacity"
            :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
          >
            Connect Room
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 4: SQUAD MEMBERS & TRANSFER HOST MODAL -->
    <Teleport to="body">
      <div
        v-if="isMembersModalOpen"
        class="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:items-center animate-fade-in"
        @click.self="isMembersModalOpen = false"
      >
        <div class="my-auto w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Users class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase text-white tracking-wider">Tactical Squad Roster</h3>
                <p class="text-[11px] text-slate-400">
                  Room:
                  <span class="font-mono text-amber-400 font-bold">
                    {{ gameRoomStore.currentRoomCode || roomCodeInput }}
                  </span>
                  ({{ gameRoomStore.members.length }} Connected)
                </p>
              </div>
            </div>
            <button
              @click="isMembersModalOpen = false"
              class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="divide-y divide-white/10 max-h-72 overflow-y-auto pr-1">
            <div
              v-for="member in gameRoomStore.members"
              :key="member.username"
              class="flex items-center justify-between py-3 gap-3"
            >
              <div class="flex items-center gap-3">
                <img :src="member.avatar" class="w-9 h-9 rounded-full border border-slate-700 bg-slate-950 object-cover" />
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-white">{{ member.username }}</span>
                    <span
                      v-if="member.isHost"
                      class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-0.5"
                    >
                      <Crown class="w-2.5 h-2.5" /> Host
                    </span>
                    <span v-else class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-bold uppercase">
                      Member
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">{{ member.inGameRole }}</span>
                </div>
              </div>

              <div v-if="gameRoomStore.isHost && !member.isHost">
                <button
                  @click="handleTransferHost(member.username)"
                  class="flex items-center gap-1 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Transfer Room Host permissions"
                >
                  <Crown class="w-3.5 h-3.5 text-amber-400" />
                  <span>Transfer Host</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
            <span class="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Crown v-if="gameRoomStore.isHost" class="w-3.5 h-3.5 text-amber-400" />
              <User v-else class="w-3.5 h-3.5 text-slate-400" />
              <span>{{ gameRoomStore.isHost ? 'You have Host privileges.' : 'Connected as Squad Member.' }}</span>
            </span>
            <button
              @click="isMembersModalOpen = false"
              class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 5: CLEAR BOARD CONFIRMATION DIALOG -->
    <Teleport to="body">
      <div
        v-if="isClearConfirmModalOpen"
        class="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in"
        @click.self="isClearConfirmModalOpen = false"
      >
        <div class="w-full max-w-sm bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center items-center">
          <div class="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl shadow-inner">
            <Trash2 class="w-7 h-7 stroke-[2.5]" />
          </div>

          <div>
            <h3 class="text-base font-black uppercase text-white tracking-wide">Clear Tactical Board?</h3>
            <p class="text-xs text-slate-300 mt-2 leading-relaxed">
              This will erase all drawn lines, arrows, utility marks, and player pins on
              <strong class="text-amber-400 font-mono">{{ mapStore.currentMap?.name || 'this map' }}</strong>.
            </p>
          </div>

          <div class="flex items-center gap-3 w-full pt-2">
            <button
              @click="isClearConfirmModalOpen = false"
              class="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="executeClearBoard"
              class="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer"
            >
              Clear Board
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 6: MAP SWITCH & OPTIONS DIALOG -->
    <Teleport to="body">
      <div
        v-if="isMapSwitchWarnModalOpen"
        class="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in"
        @click.self="isMapSwitchWarnModalOpen = false"
      >
        <div class="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-center items-center">
          <div class="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl shadow-inner">
            <AlertTriangle class="w-8 h-8 stroke-[2.5]" />
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="text-base font-black uppercase text-white tracking-wide">Switch Map Options</h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              You have <strong class="text-amber-400">{{ stratStore.boardElements.length }} active markings/pins</strong> on
              <strong class="text-white uppercase">{{ mapStore.currentMap?.name || mapStore.currentMapId }}</strong>.
            </p>
            <p class="text-xs text-slate-400 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-white/10">
              Choose an action for your current markings before switching to
              <strong class="text-emerald-400 uppercase font-mono">{{ pendingTargetMapId }}</strong>:
            </p>
          </div>

          <div class="flex flex-col gap-2.5 w-full pt-1">
            <button
              @click="pendingTargetMapId && executeMapSwitch(pendingTargetMapId)"
              class="w-full py-3 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 hover:opacity-90"
              :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
            >
              <Trash2 class="w-4 h-4" />
              <span>Switch Map</span>
            </button>

            <button
              @click="handleSaveToFileAndSwitch"
              class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Download class="w-3.5 h-3.5 text-cyan-400" />
              <span>Save Full History (JSON) &amp; Switch</span>
            </button>

            <button
              @click="handleSaveToServerAndSwitch"
              class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CloudUpload class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ isSavingToServer ? 'Saving to Cloud...' : 'Save to Cloud with History & Switch' }}</span>
            </button>

            <button
              @click="isMapSwitchWarnModalOpen = false; pendingTargetMapId = null"
              class="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel (Stay on {{ mapStore.currentMap?.name }})
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL 7: CLOUD / SERVER TACTICS STORAGE & STRATEGY LIBRARY -->
    <Teleport to="body">
      <div
        v-if="isServerSaveModalOpen"
        class="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in"
        @click.self="isServerSaveModalOpen = false"
      >
        <div class="relative w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <CloudUpload class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-black uppercase tracking-wider text-white text-sm">Cloud &amp; Timeline History Storage</h3>
                <p class="text-xs text-slate-400">
                  Save current board snapshot, CT/T legend, and timeline history to cloud or local JSON.
                </p>
              </div>
            </div>
            <button
              @click="isServerSaveModalOpen = false"
              class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-4 bg-slate-950/80 border border-white/10 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase text-amber-400 tracking-wide flex items-center gap-1.5">
                <Save class="w-3.5 h-3.5" />
                Save Current Board ({{ stratStore.boardElements.length }} Elements · {{ currentMapTimeline.length }} History Steps)
              </span>
              <span class="text-[10px] font-mono uppercase bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                Map: {{ mapStore.currentMap?.name }}
              </span>
            </div>

            <div class="flex gap-2">
              <input
                v-model="serverTacticTitle"
                type="text"
                class="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                :placeholder="`e.g. ${mapStore.currentMap?.name} A Site Fast Execute`"
              />
              <button
                @click="handleSaveTacticsToServer"
                :disabled="isSavingToServer"
                class="px-4 py-2 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap hover:opacity-90"
                :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
              >
                <Save class="w-3.5 h-3.5" />
                <span>{{ isSavingToServer ? 'Saving...' : 'Save to Cloud with History' }}</span>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase text-slate-300 tracking-wider">
                Saved Cloud Strategies ({{ serverSavedTactics.length }})
              </span>
              <button
                @click="fetchServerTactics"
                class="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw :class="['w-3 h-3', isLoadingServerTactics ? 'animate-spin' : '']" />
                <span>Refresh</span>
              </button>
            </div>

            <div v-if="isLoadingServerTactics" class="p-6 text-center text-xs text-slate-400">
              Loading cloud tactics...
            </div>

            <div
              v-else-if="serverSavedTactics.length === 0"
              class="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-white/10"
            >
              No saved cloud tactics found for {{ mapStore.currentMap?.name }}. Save your first strategy above.
            </div>

            <div v-else class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              <div
                v-for="tactic in serverSavedTactics"
                :key="tactic.id"
                class="p-3 bg-slate-950 border border-white/10 hover:border-white/20 rounded-xl flex items-center justify-between gap-3 transition-colors"
              >
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-white text-xs truncate">{{ tactic.title }}</span>
                  <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>By {{ tactic.authorName || 'Player' }}</span>
                    <span>·</span>
                    <span>{{ tactic.elements?.length || 0 }} elements</span>
                    <span>·</span>
                    <span>{{ new Date(tactic.createdAt).toLocaleDateString() }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    @click="handleLoadServerTactic(tactic)"
                    class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Download class="w-3 h-3" />
                    <span>Load</span>
                  </button>

                  <button
                    v-if="authStore.isAdmin || authStore.currentUser?.id === tactic.userId"
                    @click="handleDeleteServerTactic(tactic.id)"
                    class="p-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-400 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
