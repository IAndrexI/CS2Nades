<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMapStore, type CalloutItem } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import { useConfirmDialog } from '../composables/useConfirmDialog'
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
import type { GrenadeType, Lineup, Point2D, RadarFloorId } from '../types'
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
  Target
} from 'lucide-vue-next'

type CalloutEntry = CalloutItem & {
  floor?: RadarFloorId
  aliases?: string[]
  commonNades?: string[]
}

const router = useRouter()
const mapStore = useMapStore()
const lineupStore = useLineupStore()
const { confirmAction } = useConfirmDialog()

const searchQuery = ref('')
const siteFilter = ref<'all' | 'A' | 'B' | 'Mid' | 'Spawn'>('all')
const isAddingCallout = ref(false)
const newCalloutCoords = ref<Point2D | null>(null)
const newCalloutName = ref('')
const newCalloutSite = ref<'A' | 'B' | 'Mid' | 'Spawn' | 'Other'>('Mid')
const snapWarningMessage = ref('')

const selectedCalloutId = ref<string | null>(null)

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
  }, 2000)
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

const allCalloutsForMap = computed<CalloutEntry[]>(() => {
  return (mapStore.currentMapCallouts || []) as CalloutEntry[]
})

const filteredCallouts = computed<CalloutEntry[]>(() => {
  return allCalloutsForMap.value.filter((c) => {
    if (hasFloors.value && c.floor && c.floor !== activeFloor.value) {
      return false
    }
    if (siteFilter.value !== 'all') {
      if ((c.site || '').toLowerCase() !== siteFilter.value.toLowerCase()) {
        return false
      }
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const inName = c.name.toLowerCase().includes(q)
      const inSite = (c.site || '').toLowerCase().includes(q)
      const inAliases = (c.aliases || []).some((a) => a.toLowerCase().includes(q))
      if (!inName && !inSite && !inAliases) return false
    }
    return true
  })
})

const customCalloutCount = computed(() => {
  return (mapStore.customCallouts[mapStore.currentMapId] || []).length
})

const selectedCallout = computed<CalloutEntry | null>(() => {
  if (!selectedCalloutId.value) return null
  return filteredCallouts.value.find((c) => c.id === selectedCalloutId.value) ?? null
})

watch(
  () => [mapStore.currentMapId, activeFloor.value],
  () => {
    resetView()
    isAddingCallout.value = false
    newCalloutCoords.value = null
    snapWarningMessage.value = ''
    if (
      selectedCalloutId.value &&
      !filteredCallouts.value.some((c) => c.id === selectedCalloutId.value)
    ) {
      selectedCalloutId.value = null
    }
  }
)

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

  const nameTokens = [
    callout.name,
    ...(callout.aliases || [])
  ]
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
  if (isAddingCallout.value) return
  isPanning.value = true
  panStart.value = { x: e.clientX - pan.value.x, y: e.clientY - pan.value.y }
}

function handleMouseMove(e: MouseEvent) {
  if (svgElement.value) {
    cursorPct.value = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
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
  isPanning.value = false
}

function handleMouseLeave() {
  isPanning.value = false
  cursorPct.value = null
}

function handleMapClick(e: MouseEvent) {
  if (didDrag.value || !svgElement.value) return
  if (!isAddingCallout.value) return

  const rawPt = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
  if (!rawPt) return

  const snapped = snapPointToMapBounds(
    mapStore.currentMapId,
    rawPt,
    effectiveFloorParam.value
  )
  newCalloutCoords.value = { x: snapped.x, y: snapped.y }
  if (snapped.wasOutOfBounds) {
    snapWarningMessage.value = `Adjusted out-of-bounds click (${rawPt.x}%, ${rawPt.y}%) to nearest playable spot (${snapped.x}%, ${snapped.y}%).`
  } else {
    snapWarningMessage.value = ''
  }
}

function selectCallout(callout: CalloutEntry, e?: MouseEvent) {
  if (e) e.stopPropagation()
  if (isAddingCallout.value) return
  selectedCalloutId.value = selectedCalloutId.value === callout.id ? null : callout.id
}

function handleSaveCallout() {
  if (!newCalloutName.value.trim() || !newCalloutCoords.value) return

  const snapped = snapPointToMapBounds(
    mapStore.currentMapId,
    newCalloutCoords.value,
    effectiveFloorParam.value
  )

  const payload = {
    name: newCalloutName.value.trim(),
    site: newCalloutSite.value,
    coords: { x: snapped.x, y: snapped.y },
    ...(hasFloors.value ? { floor: activeFloor.value } : {})
  } as Omit<CalloutItem, 'id' | 'isCustom'>

  const created = mapStore.addCustomCallout(mapStore.currentMapId, payload)
  selectedCalloutId.value = created.id

  newCalloutName.value = ''
  newCalloutCoords.value = null
  snapWarningMessage.value = ''
  isAddingCallout.value = false
}

function handleCancelAdd() {
  isAddingCallout.value = false
  newCalloutCoords.value = null
  newCalloutName.value = ''
  snapWarningMessage.value = ''
}

async function handleDeleteCallout(id: string, e?: MouseEvent) {
  if (e) e.stopPropagation()
  const ok = await confirmAction({
    title: 'Delete Callout?',
    message: 'Are you sure you want to delete this custom callout mark?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    mapStore.deleteCustomCallout(mapStore.currentMapId, id)
    if (selectedCalloutId.value === id) {
      selectedCalloutId.value = null
    }
  }
}

async function handleClearAll() {
  const ok = await confirmAction({
    title: 'Clear Custom Callouts?',
    message: `Are you sure you want to clear all custom callouts for ${mapStore.currentMap.name}?`,
    confirmLabel: 'Clear Custom',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    mapStore.clearCustomCallouts(mapStore.currentMapId)
    selectedCalloutId.value = null
  }
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
      return 'bg-sky-500/15 text-sky-400 border-sky-500/40'
    case 'flash':
      return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40'
    case 'molotov':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/40'
    case 'he':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/40'
    default:
      return 'bg-purple-500/15 text-purple-400 border-purple-500/40'
  }
}

function getPinColors(callout: CalloutEntry) {
  const selected = selectedCalloutId.value === callout.id
  if (selected) {
    return { dot: '#f59e0b', stroke: '#f59e0b', text: '#fef3c7', bg: '#1e1b0e' }
  }
  if (callout.isCustom) {
    return { dot: '#10b981', stroke: '#10b981', text: '#ecfdf5', bg: '#071c15' }
  }
  return { dot: '#38bdf8', stroke: '#38bdf8', text: '#f0f9ff', bg: '#0a0f18' }
}

function getBadgeWidth(name: string): number {
  return Math.max(48, name.length * 6.4 + 14)
}
</script>

<template>
  <div class="callouts-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-xl">
          <Layers class="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">
              Callouts &amp; Bounds Atlas
            </h1>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-sky-400 text-xs font-mono font-bold">
              {{ mapStore.currentMap.name }} ({{ filteredCallouts.length }} Callouts)
            </span>
            <span
              v-if="hasFloors"
              class="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold uppercase"
            >
              {{ activeFloor }} Floor
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Click any callout pin or card to inspect matching lineups, teleport setpos commands, and practice config
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- MAP SELECTOR -->
        <select
          :value="mapStore.currentMapId"
          @change="mapStore.setMap(($event.target as HTMLSelectElement).value)"
          class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 font-bold text-xs focus:outline-none focus:border-sky-500 cursor-pointer uppercase font-mono"
        >
          <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
            {{ map.name }}
          </option>
        </select>

        <!-- FLOOR TOGGLE (NUKE & VERTIGO) -->
        <div
          v-if="hasFloors && mapStore.currentMap.radarFloors"
          class="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800"
        >
          <button
            v-for="floor in mapStore.currentMap.radarFloors"
            :key="floor.id"
            @click="activeFloor = floor.id"
            :class="[
              'px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer',
              activeFloor === floor.id
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            {{ floor.id === 'upper' ? 'Upper' : 'Lower' }}
          </button>
        </div>

        <!-- COPY MAP PRACTICE CMD -->
        <button
          @click="copyMapPracticeCommand(mapStore.currentMapId, 'header-map-practice')"
          class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          title="Copy CS2 console command to load this map with practice grenade settings"
        >
          <Check v-if="copiedKey === 'header-map-practice'" class="w-3.5 h-3.5" />
          <Terminal v-else class="w-3.5 h-3.5" />
          <span>{{ copiedKey === 'header-map-practice' ? 'Copied Map CMD!' : 'Copy Map Practice CMD' }}</span>
        </button>

        <!-- CLEAR CUSTOM BUTTON -->
        <button
          v-if="customCalloutCount > 0"
          @click="handleClearAll"
          class="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          title="Clear all custom callouts for this map"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear Custom ({{ customCalloutCount }})</span>
        </button>

        <!-- ADD CALLOUT BUTTON -->
        <button
          @click="isAddingCallout ? handleCancelAdd() : (isAddingCallout = true)"
          :class="[
            'flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer',
            isAddingCallout
              ? 'bg-rose-500 text-white'
              : 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 text-slate-950 font-black'
          ]"
        >
          <Plus v-if="!isAddingCallout" class="w-4 h-4 stroke-[3]" />
          <X v-else class="w-4 h-4" />
          <span>{{ isAddingCallout ? 'Cancel' : 'Add Callout' }}</span>
        </button>
      </div>
    </div>

    <!-- MAIN CALLOUTS LAYOUT: MAP (LEFT) | CALLOUTS DIRECTORY (RIGHT) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- LEFT 2 COLS: STRICT 1:1 RADAR MAP WITH CALLOUTS PINNED -->
      <div class="lg:col-span-2 flex flex-col gap-3">
        <div
          class="relative w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center p-3 sm:p-4 select-none"
        >
          <!-- TOP RADAR TOOLBAR: ZOOM / RESET & LIVE COORDINATE + BOUNDS PILL -->
          <div class="w-full flex flex-wrap items-center justify-between gap-2 mb-3 z-20">
            <!-- Live Cursor % + World (X, Y) + In-Bounds Pill -->
            <div class="flex flex-wrap items-center gap-2 bg-slate-900/95 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-mono">
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
                    'px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 border',
                    cursorInBounds
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                  ]"
                >
                  <ShieldCheck v-if="cursorInBounds" class="w-3 h-3" />
                  <AlertTriangle v-else class="w-3 h-3" />
                  <span>{{ cursorInBounds ? 'IN BOUNDS' : 'OUT OF BOUNDS' }}</span>
                </span>
              </template>
              <span v-else class="text-slate-500">
                Hover radar for % / World (X, Y) &amp; bounds check
              </span>
            </div>

            <!-- Zoom Controls -->
            <div class="flex items-center gap-1 bg-slate-900/95 border border-slate-800 rounded-xl p-1">
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

          <!-- ADD CALLOUT HUD INSTRUCTION -->
          <div
            v-if="isAddingCallout && !newCalloutCoords"
            class="mb-2 flex items-center gap-2 px-4 py-2 bg-sky-500 text-slate-950 rounded-xl shadow-lg font-bold text-xs"
          >
            <Crosshair class="w-4 h-4 shrink-0" />
            <span>Click inside playable radar bounds to place your custom callout pin</span>
          </div>

          <!-- SNAP WARNING TOAST -->
          <div
            v-if="snapWarningMessage"
            class="mb-2 flex items-center gap-2 px-3.5 py-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold"
          >
            <AlertTriangle class="w-4 h-4 shrink-0 text-amber-400" />
            <span>{{ snapWarningMessage }}</span>
          </div>

          <!-- STRICT 1:1 ASPECT-SQUARE WRAPPER -->
          <div
            class="relative w-full max-w-[680px] aspect-square overflow-hidden rounded-xl border border-slate-800/80 bg-[#070a0f]"
            :class="[
              isAddingCallout
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

              <!-- CALLOUTS OVERLAY LAYER -->
              <g class="callouts-pins-layer">
                <g
                  v-for="callout in filteredCallouts"
                  :key="callout.id"
                  :transform="`translate(${callout.coords.x * 10}, ${callout.coords.y * 10}) scale(${inversePinScale})`"
                  class="cursor-pointer"
                  @click="selectCallout(callout, $event)"
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
                    :r="selectedCalloutId === callout.id ? 5.5 : 4"
                    :fill="getPinColors(callout).dot"
                    stroke="#0f172a"
                    stroke-width="1.5"
                  />

                  <!-- Callout Badge -->
                  <rect
                    :x="-getBadgeWidth(callout.name) / 2"
                    y="-22"
                    :width="getBadgeWidth(callout.name)"
                    height="15"
                    rx="4"
                    :fill="getPinColors(callout).bg"
                    fill-opacity="0.92"
                    :stroke="getPinColors(callout).stroke"
                    :stroke-width="selectedCalloutId === callout.id ? 1.5 : 1"
                    :stroke-opacity="selectedCalloutId === callout.id ? 0.95 : 0.6"
                  />

                  <text
                    x="0"
                    y="-11.5"
                    font-size="9"
                    font-weight="900"
                    text-anchor="middle"
                    :fill="getPinColors(callout).text"
                    class="tracking-wider uppercase font-mono select-none"
                  >
                    {{ callout.name }}
                  </text>
                </g>
              </g>

              <!-- TEMPORARY NEW CALLOUT PIN (IF CLICKED) -->
              <g
                v-if="newCalloutCoords"
                :transform="`translate(${newCalloutCoords.x * 10}, ${newCalloutCoords.y * 10}) scale(${inversePinScale})`"
              >
                <circle
                  cx="0"
                  cy="0"
                  r="16"
                  fill="#38bdf8"
                  fill-opacity="0.3"
                  stroke="#38bdf8"
                  stroke-width="2"
                  class="animate-pulse"
                />
                <circle cx="0" cy="0" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
              </g>
            </svg>
          </div>
        </div>

        <!-- NEW CALLOUT FORM DRAWER -->
        <div
          v-if="newCalloutCoords"
          class="p-4 bg-slate-900 border border-sky-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl"
        >
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <div class="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <MapPin class="w-4 h-4" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold text-white">
                Snapped Position: {{ newCalloutCoords.x }}%, {{ newCalloutCoords.y }}%
                <span v-if="hasFloors" class="text-amber-400 uppercase ml-1">({{ activeFloor }})</span>
              </span>
              <span class="text-[10px] text-emerald-400 font-mono">
                Verified inside playable map bounds
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              v-model="newCalloutName"
              type="text"
              placeholder="Callout Name (e.g. Quad, Tetris, Ninja)"
              class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 flex-grow sm:w-56"
              @keyup.enter="handleSaveCallout"
            />
            <select
              v-model="newCalloutSite"
              class="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="A">A Site</option>
              <option value="B">B Site</option>
              <option value="Mid">Mid</option>
              <option value="Spawn">Spawn</option>
              <option value="Other">Other</option>
            </select>
            <button
              @click="handleSaveCallout"
              class="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Save
            </button>
            <button
              @click="handleCancelAdd"
              class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT 1 COL: CALLOUT DIRECTORY LIST -->
      <div class="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-3.5 shadow-xl lg:h-[740px]">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black uppercase tracking-wider text-white">
            Callout Directory
          </span>
          <span class="text-[10px] text-slate-400 font-mono">
            {{ filteredCallouts.length }} spots
          </span>
        </div>

        <!-- SEARCH -->
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search spot name or alias..."
            class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 placeholder-slate-500"
          />
        </div>

        <!-- SITE FILTER PILLS -->
        <div class="flex flex-wrap items-center gap-1">
          <button
            v-for="tab in (['all', 'A', 'B', 'Mid', 'Spawn'] as const)"
            :key="tab"
            @click="siteFilter = tab"
            :class="[
              'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-colors cursor-pointer',
              siteFilter === tab
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            ]"
          >
            {{ tab === 'all' ? 'All Zones' : tab }}
          </button>
        </div>

        <!-- CALLOUTS LIST -->
        <div class="flex-grow overflow-y-auto flex flex-col gap-1.5 pr-1 text-xs min-h-[280px]">
          <div
            v-if="filteredCallouts.length === 0"
            class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500"
          >
            <Layers class="w-8 h-8 stroke-[1.5] mb-2 text-slate-600" />
            <p class="font-bold text-xs text-slate-400">No Matching Callouts</p>
            <p class="text-[11px] text-slate-500 mt-1 max-w-[210px]">
              Clear filters or click "Add Callout" to drop your team's custom spot.
            </p>
          </div>

          <div
            v-for="callout in filteredCallouts"
            :key="callout.id"
            @click="selectCallout(callout)"
            :class="[
              'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
              selectedCalloutId === callout.id
                ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                : 'bg-slate-950/80 hover:bg-slate-800/70 border-slate-800/80'
            ]"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span
                :class="[
                  'w-2 h-2 rounded-full shrink-0',
                  selectedCalloutId === callout.id
                    ? 'bg-amber-400'
                    : callout.isCustom
                      ? 'bg-emerald-400'
                      : 'bg-sky-400'
                ]"
              ></span>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-slate-200 truncate">{{ callout.name }}</span>
                <span class="text-[10px] font-mono text-slate-500">
                  {{ callout.coords.x }}%, {{ callout.coords.y }}%
                  <span v-if="callout.floor" class="uppercase text-amber-400/80 ml-1">
                    • {{ callout.floor }}
                  </span>
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <span
                v-if="getLineupCountForCallout(callout) > 0"
                class="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[9px] font-bold"
              >
                {{ getLineupCountForCallout(callout) }} nade{{ getLineupCountForCallout(callout) === 1 ? '' : 's' }}
              </span>

              <span
                v-if="callout.site"
                class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] font-bold"
              >
                {{ callout.site }}
              </span>

              <button
                v-if="callout.isCustom"
                @click="handleDeleteCallout(callout.id, $event)"
                class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                title="Delete custom callout"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SELECTED CALLOUT INSPECTOR & MATCHING LINEUPS -->
    <div
      v-if="selectedCallout"
      class="p-5 bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col gap-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <Target class="w-4 h-4 text-amber-400" />
            <h2 class="text-base font-black uppercase text-white tracking-wide">
              {{ selectedCallout.name }}
            </h2>
            <span
              v-if="selectedCallout.site"
              class="px-2 py-0.5 rounded bg-slate-800 text-sky-400 text-[10px] font-mono font-bold uppercase"
            >
              Zone: {{ selectedCallout.site }}
            </span>
            <span
              v-if="selectedCallout.floor"
              class="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold uppercase"
            >
              {{ selectedCallout.floor }}
            </span>
            <span class="text-[11px] font-mono text-slate-400">
              Radar {{ selectedCallout.coords.x }}%, {{ selectedCallout.coords.y }}%
            </span>
          </div>

          <div
            v-if="selectedCallout.commonNades && selectedCallout.commonNades.length > 0"
            class="flex flex-wrap items-center gap-1.5 mt-1"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Key Utility:
            </span>
            <span
              v-for="nade in selectedCallout.commonNades"
              :key="nade"
              class="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-semibold"
            >
              {{ nade }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="copyToClipboard(getCalloutSpotSetpos(selectedCallout), `spot-${selectedCallout.id}`)"
            class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            <Check v-if="copiedKey === `spot-${selectedCallout.id}`" class="w-3.5 h-3.5" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>
              {{ copiedKey === `spot-${selectedCallout.id}` ? 'Copied Spot setpos!' : 'Copy Spot setpos' }}
            </span>
          </button>

          <button
            @click="copyMapPracticeCommand(mapStore.currentMapId, 'selected-map-practice')"
            class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            <Check v-if="copiedKey === 'selected-map-practice'" class="w-3.5 h-3.5" />
            <Terminal v-else class="w-3.5 h-3.5" />
            <span>
              {{ copiedKey === 'selected-map-practice' ? 'Copied Map CMD!' : 'Copy Map Practice CMD' }}
            </span>
          </button>

          <button
            @click="selectedCalloutId = null"
            class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Close inspector"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- MATCHING LINEUPS GRID -->
      <div v-if="matchingLineups.length === 0" class="py-4 text-center text-xs text-slate-400">
        No saved or catalog lineups currently start or land at <strong class="text-white">{{ selectedCallout.name }}</strong>.
        Use <strong class="text-sky-400">Copy Spot setpos</strong> above to jump straight here in CS2 practice!
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="entry in matchingLineups"
          :key="entry.lineup.id"
          class="p-3.5 bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between gap-3 transition-colors"
        >
          <div class="flex flex-col gap-1.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-md text-[10px] font-black uppercase border',
                    getGrenadeBadgeClass(entry.lineup.grenadeType)
                  ]"
                >
                  {{ entry.lineup.grenadeType }}
                </span>
                <span class="text-[10px] font-mono font-bold uppercase text-slate-400">
                  {{ entry.lineup.side }} Side
                </span>
              </div>

              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                  entry.role === 'origin'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : entry.role === 'landing'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
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

            <h3 class="text-sm font-bold text-white leading-snug">
              {{ entry.lineup.title }}
            </h3>

            <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span>📍 {{ entry.lineup.startLocation }} → 🎯 {{ entry.lineup.endLocation }}</span>
              <span class="text-slate-600">•</span>
              <span class="text-sky-400 font-semibold capitalize">
                {{ entry.lineup.movementType || 'stationary' }} • {{ entry.lineup.throwType.replace(/_/g, ' ') }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <button
              @click="viewLineupOnRadar(entry.lineup)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              <Navigation class="w-3 h-3" />
              <span>View on Radar</span>
            </button>

            <button
              @click="copyLineupSetupCommand(entry.lineup, `lineup-setup-${entry.lineup.id}`)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              <Check v-if="copiedKey === `lineup-setup-${entry.lineup.id}`" class="w-3 h-3" />
              <Copy v-else class="w-3 h-3" />
              <span>
                {{ copiedKey === `lineup-setup-${entry.lineup.id}` ? 'Copied setpos!' : 'Copy Spot setpos' }}
              </span>
            </button>

            <button
              @click="copyMapPracticeCommand(entry.lineup.mapId, `lineup-map-${entry.lineup.id}`)"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              <Check v-if="copiedKey === `lineup-map-${entry.lineup.id}`" class="w-3 h-3" />
              <Terminal v-else class="w-3 h-3" />
              <span>
                {{ copiedKey === `lineup-map-${entry.lineup.id}` ? 'Copied Map CMD!' : 'Copy Map Practice CMD' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
