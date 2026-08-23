<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import VectorMapBlueprint from './VectorMapBlueprint.vue'
import NadeIcon from '../common/NadeIcon.vue'
import type { Lineup, GrenadeType } from '../../types'
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  MapPin, 
  Crosshair, 
  Settings2, 
  Trash2,
  ExternalLink,
  X,
  Copy,
  Check,
  Sparkles,
  Play,
  Layers
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()

const mapContainer = ref<HTMLDivElement | null>(null)
const svgElement = ref<SVGSVGElement | null>(null)

// Pan & Zoom state
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const hoveredLineup = ref<Lineup | null>(null)
const selectedLineupId = ref<string | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const isPinned = ref(false)
const copiedCommand = ref(false)
let hoverLeaveTimeout: any = null

// Live cursor placement preview
const liveCursorCoords = ref<{ x: number; y: number } | null>(null)

// Helper for Grenade Colors
function getNadeColor(type: GrenadeType): string {
  switch (type) {
    case 'smoke': return '#94a3b8'
    case 'flash': return '#eab308'
    case 'molotov': return '#ef4444'
    case 'he': return '#22c55e'
    case 'decoy': return '#a855f7'
    default: return '#cbd5e1'
  }
}

// Lineups that should display active trajectories
const visibleTrajectories = computed<Lineup[]>(() => {
  if (selectedLineupId.value) {
    return lineupStore.filteredLineups.filter(l => l.id === selectedLineupId.value)
  }
  if (hoveredLineup.value) {
    return [hoveredLineup.value]
  }
  if (mapStore.showTrajectories) {
    return lineupStore.filteredLineups
  }
  return []
})

// Selected Lineup for docked drawer
const activeLineup = computed<Lineup | null>(() => {
  if (!selectedLineupId.value) return null
  return lineupStore.filteredLineups.find(l => l.id === selectedLineupId.value) || null
})

// Calculate SVG Bezier curve path between Origin and Landing
function getTrajectoryPath(origin: { x: number; y: number }, landing: { x: number; y: number }, curveOffset = 0): string {
  const ox = origin.x * 10
  const oy = origin.y * 10
  const lx = landing.x * 10
  const ly = landing.y * 10

  const mx = (ox + lx) / 2
  const my = (oy + ly) / 2

  const dx = lx - ox
  const dy = ly - oy
  const dist = Math.sqrt(dx * dx + dy * dy)
  
  const archHeight = Math.min(Math.max(dist * 0.25, 20), 80) + (curveOffset * 2)
  
  const perpX = -dy / (dist || 1)
  const perpY = dx / (dist || 1)

  const cx = mx + perpX * archHeight
  const cy = my + perpY * archHeight

  return `M ${ox} ${oy} Q ${cx} ${cy} ${lx} ${ly}`
}

// Zoom handlers
function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
  const newZoom = Math.min(Math.max(mapStore.zoomLevel * zoomFactor, 0.8), 4.0)
  mapStore.zoomLevel = newZoom
}

function zoomIn() {
  mapStore.zoomLevel = Math.min(mapStore.zoomLevel * 1.25, 4.0)
}

function zoomOut() {
  mapStore.zoomLevel = Math.max(mapStore.zoomLevel * 0.8, 0.8)
}

function resetZoom() {
  mapStore.resetZoom()
}

// Pan drag handlers
function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  
  if (mapStore.isPlacementMode) {
    handleMapClick(e)
    return
  }

  isDragging.value = true
  dragStart.value = {
    x: e.clientX - mapStore.panOffset.x,
    y: e.clientY - mapStore.panOffset.y
  }
}

function handleMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    mapStore.panOffset = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    }
  }

  // Update live cursor coordinates for placement mode
  if (mapStore.isPlacementMode) {
    const coords = getSvgPoint(e)
    if (coords) {
      liveCursorCoords.value = coords
    }
  }
}

function handleMouseUp() {
  isDragging.value = false
}

// ─────────────────────────────────────────────────────────────
// BULLETPROOF COORDINATE SYSTEM: Direct SVG Rendered Bounding Box
// ─────────────────────────────────────────────────────────────
function getSvgPoint(e: MouseEvent): { x: number; y: number } | null {
  if (!svgElement.value) return null
  const rect = svgElement.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  
  const rawX = ((e.clientX - rect.left) / rect.width) * 100
  const rawY = ((e.clientY - rect.top) / rect.height) * 100
  
  const pctX = Math.round(Math.min(Math.max(rawX, 0), 100) * 10) / 10
  const pctY = Math.round(Math.min(Math.max(rawY, 0), 100) * 10) / 10
  return { x: pctX, y: pctY }
}

function handleMapClick(e: MouseEvent) {
  const coords = getSvgPoint(e)
  if (!coords) return

  if (mapStore.placementStep === 'origin') {
    mapStore.tempPlacement.origin = { x: coords.x, y: coords.y }
    mapStore.placementStep = 'landing'
  } else if (mapStore.placementStep === 'landing') {
    mapStore.tempPlacement.landing = { x: coords.x, y: coords.y }
    mapStore.isPlacementMode = false
    liveCursorCoords.value = null
    lineupStore.isAddModalOpen = true
  }
}

// ─────────────────────────────────────────────────────────────
// CSNADES.GG INTERACTION HANDLERS
// ─────────────────────────────────────────────────────────────
function handleLandingPinClick(lineup: Lineup, e: MouseEvent) {
  e.stopPropagation()
  if (selectedLineupId.value === lineup.id) {
    selectedLineupId.value = null
  } else {
    selectedLineupId.value = lineup.id
  }
}

function handleLineupEnter(lineup: Lineup, e?: MouseEvent) {
  if (hoverLeaveTimeout) {
    clearTimeout(hoverLeaveTimeout)
    hoverLeaveTimeout = null
  }

  if (hoveredLineup.value?.id === lineup.id) return

  hoveredLineup.value = lineup
  lineupStore.setHoveredLineup(lineup)

  if (e && mapContainer.value) {
    const rect = mapContainer.value.getBoundingClientRect()
    const cardWidth = 280
    const cardHeight = 220

    let posX = e.clientX - rect.left + 20
    let posY = e.clientY - rect.top - 40

    if (posX + cardWidth > rect.width - 15) {
      posX = e.clientX - rect.left - cardWidth - 20
    }
    if (posY + cardHeight > rect.height - 15) {
      posY = rect.height - cardHeight - 15
    }
    if (posX < 15) posX = 15
    if (posY < 15) posY = 15

    tooltipPosition.value = { x: Math.round(posX), y: Math.round(posY) }
  }
}

function handleTooltipEnter() {
  if (hoverLeaveTimeout) {
    clearTimeout(hoverLeaveTimeout)
    hoverLeaveTimeout = null
  }
}

function handleLineupLeave() {
  if (isPinned.value) return
  if (hoverLeaveTimeout) clearTimeout(hoverLeaveTimeout)
  hoverLeaveTimeout = setTimeout(() => {
    hoveredLineup.value = null
    lineupStore.setHoveredLineup(null)
  }, 350)
}

function closeTooltip() {
  isPinned.value = false
  hoveredLineup.value = null
  lineupStore.setHoveredLineup(null)
}

function handleDeleteFromTooltip(lineup: Lineup, e: MouseEvent) {
  e.stopPropagation()
  if (confirm(`Delete lineup "${lineup.title}"?`)) {
    lineupStore.deleteLineup(lineup.id)
    if (selectedLineupId.value === lineup.id) selectedLineupId.value = null
    closeTooltip()
  }
}

function handleCopyCommand(command: string, e: MouseEvent) {
  e.stopPropagation()
  navigator.clipboard.writeText(command)
  copiedCommand.value = true
  setTimeout(() => { copiedCommand.value = false }, 2000)
}

function handleBackgroundMapClick() {
  closeTooltip()
  selectedLineupId.value = null
}

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
  if (hoverLeaveTimeout) clearTimeout(hoverLeaveTimeout)
})
</script>

<template>
  <div class="csnades-interactive-radar-wrapper flex flex-col gap-4 w-full">
    <!-- MAIN RADAR MAP VIEWPORT -->
    <div 
      ref="mapContainer"
      class="interactive-minimap-container relative w-full h-[600px] lg:h-[700px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @click="handleBackgroundMapClick"
      :class="[
        mapStore.isPlacementMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
      ]"
    >
      <!-- RADAR MAP SVG CANVAS -->
      <div 
        class="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center"
        :style="{
          transform: `translate(${mapStore.panOffset.x}px, ${mapStore.panOffset.y}px) scale(${mapStore.zoomLevel})`
        }"
      >
        <svg 
          ref="svgElement"
          viewBox="0 0 1000 1000" 
          class="w-full h-full max-w-[960px] max-h-[960px] drop-shadow-[0_0_24px_rgba(0,0,0,0.8)]"
        >
          <!-- LAYER 1: CLEAN SIMPLERADAR VECTOR / PSD RADAR OVERVIEW -->
          <VectorMapBlueprint 
            :map-info="mapStore.currentMap" 
            :show-callouts="mapStore.showCallouts"
          />

          <!-- LAYER 2: TRAJECTORY CURVES (FOR SELECTED/ACTIVE LINEUPS) -->
          <g class="trajectories-layer">
            <g 
              v-for="lineup in visibleTrajectories" 
              :key="`traj-${lineup.id}`"
              :class="[
                'transition-all duration-200 cursor-pointer',
                hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? 'opacity-100' : 'opacity-70'
              ]"
              @mouseenter="handleLineupEnter(lineup, $event)"
              @mouseleave="handleLineupLeave"
              @click="handleLandingPinClick(lineup, $event)"
            >
              <!-- WIDE TRANSPARENT HIT-AREA -->
              <path 
                :d="getTrajectoryPath(lineup.originCoords, lineup.landingCoords, lineup.curveOffset)"
                fill="none" 
                stroke="transparent" 
                stroke-width="30"
                pointer-events="stroke"
              />

              <!-- Outer Trajectory Glow Line -->
              <path 
                :d="getTrajectoryPath(lineup.originCoords, lineup.landingCoords, lineup.curveOffset)"
                fill="none" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                :stroke-width="hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? '5.5' : '3.5'"
                :stroke-opacity="hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? '0.6' : '0.35'"
                pointer-events="none"
              />

              <!-- Inner Animated Dashed Line -->
              <path 
                :d="getTrajectoryPath(lineup.originCoords, lineup.landingCoords, lineup.curveOffset)"
                fill="none" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                :stroke-width="hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? '3' : '2'"
                class="animate-trajectory"
                pointer-events="none"
              />
            </g>
          </g>

          <!-- LAYER 3: THROW ORIGIN PINS (PLAYER STANDING SPOTS) -->
          <g class="origin-markers-layer">
            <g 
              v-for="lineup in (selectedLineupId ? visibleTrajectories : lineupStore.filteredLineups)" 
              :key="`origin-${lineup.id}`"
              :transform="`translate(${lineup.originCoords.x * 10}, ${lineup.originCoords.y * 10})`"
              class="cursor-pointer transition-transform duration-150 hover:scale-130"
              @mouseenter="handleLineupEnter(lineup, $event)"
              @mouseleave="handleLineupLeave"
              @click="handleLandingPinClick(lineup, $event)"
            >
              <!-- TRANSPARENT HIT-AREA -->
              <circle cx="0" cy="0" r="28" fill="transparent" pointer-events="all" />

              <!-- Origin Outer Pulse -->
              <circle 
                cx="0" 
                cy="0" 
                :r="hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? '18' : '13'" 
                fill="none" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                stroke-width="2" 
                stroke-dasharray="3 3"
                class="opacity-80 animate-pulse"
                pointer-events="none"
              />
              
              <!-- Origin Base Circle -->
              <circle 
                cx="0" 
                cy="0" 
                r="9" 
                :fill="lineup.side === 't' ? '#f97316' : lineup.side === 'ct' ? '#38bdf8' : '#334155'" 
                stroke="#0f172a" 
                stroke-width="2"
                pointer-events="none"
              />
              
              <circle cx="0" cy="0" r="3.5" fill="#ffffff" pointer-events="none" />
            </g>
          </g>

          <!-- LAYER 4: CSNADES.GG TARGET LANDING PINS FOR EVERY FILTERED LINEUP -->
          <g class="landing-markers-layer">
            <g 
              v-for="lineup in lineupStore.filteredLineups" 
              :key="`landing-${lineup.id}`"
              :transform="`translate(${lineup.landingCoords.x * 10}, ${lineup.landingCoords.y * 10})`"
              class="cursor-pointer transition-transform duration-150 hover:scale-130"
              @mouseenter="handleLineupEnter(lineup, $event)"
              @mouseleave="handleLineupLeave"
              @click="handleLandingPinClick(lineup, $event)"
            >
              <!-- TRANSPARENT HIT-AREA -->
              <circle cx="0" cy="0" r="30" fill="transparent" pointer-events="all" />

              <!-- Active Selection / Hover Pulse Ring -->
              <circle 
                cx="0" 
                cy="0" 
                :r="selectedLineupId === lineup.id || hoveredLineup?.id === lineup.id ? '24' : '16'" 
                :fill="getNadeColor(lineup.grenadeType)" 
                :fill-opacity="selectedLineupId === lineup.id || hoveredLineup?.id === lineup.id ? '0.4' : '0.2'" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                :stroke-width="selectedLineupId === lineup.id ? '3' : '1.5'"
                class="animate-pulse-glow"
                pointer-events="none"
              />

              <!-- Pin Solid Badge -->
              <circle 
                cx="0" 
                cy="0" 
                r="11" 
                fill="#0f172a" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                stroke-width="2"
                pointer-events="none"
              />

              <!-- Type Indicator Dot -->
              <circle cx="0" cy="0" r="4.5" :fill="getNadeColor(lineup.grenadeType)" pointer-events="none" />
            </g>
          </g>

          <!-- LAYER 5: LIVE PLACEMENT MODE PINS (Precise & Interactive) -->
          <g v-if="mapStore.isPlacementMode" class="placement-pins-layer">
            <!-- Fixed Origin Pin after Step 1 -->
            <g 
              v-if="mapStore.tempPlacement.origin" 
              :transform="`translate(${mapStore.tempPlacement.origin.x * 10}, ${mapStore.tempPlacement.origin.y * 10})`"
            >
              <circle cx="0" cy="0" r="18" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="2" class="animate-pulse" />
              <circle cx="0" cy="0" r="8" fill="#22c55e" stroke="#ffffff" stroke-width="2" />
              <text x="0" y="-14" font-size="12" font-weight="bold" fill="#22c55e" text-anchor="middle">STAND HERE</text>
            </g>

            <!-- Real-time Trajectory Arc from Origin to live mouse cursor in Step 2 -->
            <g v-if="mapStore.placementStep === 'landing' && mapStore.tempPlacement.origin && liveCursorCoords">
              <path 
                :d="getTrajectoryPath(mapStore.tempPlacement.origin, liveCursorCoords)"
                fill="none" 
                stroke="#de9b35" 
                stroke-width="2.5" 
                stroke-dasharray="6 6"
                class="animate-trajectory"
              />
              <g :transform="`translate(${liveCursorCoords.x * 10}, ${liveCursorCoords.y * 10})`">
                <circle cx="0" cy="0" r="20" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2" class="animate-pulse" />
                <circle cx="0" cy="0" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
                <text x="0" y="-14" font-size="12" font-weight="bold" fill="#ef4444" text-anchor="middle">LANDING SPOT</text>
              </g>
            </g>
          </g>
        </svg>
      </div>

      <!-- PLACEMENT MODE BANNER HUD -->
      <div 
        v-if="mapStore.isPlacementMode"
        class="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-2.5 bg-amber-500/90 backdrop-blur-md text-slate-950 rounded-xl shadow-2xl font-bold text-xs animate-bounce"
      >
        <Crosshair class="w-4 h-4 animate-spin" />
        <span>
          {{ mapStore.placementStep === 'origin' ? 'Step 1: Click where you STAND (Origin)' : 'Step 2: Click where the grenade LANDS (Target)' }}
        </span>
        <button 
          @click="mapStore.cancelPlacement()"
          class="ml-2 px-2 py-0.5 bg-slate-950 text-white rounded text-[11px] hover:bg-slate-900 cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <!-- FLOATING MAP CONTROLS (ZOOM & SETTINGS) -->
      <div class="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl">
        <button 
          @click="zoomIn"
          title="Zoom In"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomIn class="w-4 h-4" />
        </button>
        <button 
          @click="zoomOut"
          title="Zoom Out"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut class="w-4 h-4" />
        </button>
        <button 
          @click="resetZoom"
          title="Reset Radar View"
          class="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
        <button 
          @click="mapStore.isMapSettingsOpen = true"
          title="Custom Radar / Map Settings"
          class="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-t border-slate-800 mt-0.5"
        >
          <Settings2 class="w-4 h-4" />
        </button>
      </div>

      <!-- FLOATING MAP INFO BADGE (BOTTOM LEFT) -->
      <div class="absolute bottom-4 left-4 z-20 flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl text-xs text-slate-400">
        <div class="flex items-center gap-1.5 font-bold text-slate-200">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="uppercase tracking-wider font-mono">{{ mapStore.currentMap.name }}</span>
        </div>
        <span class="text-slate-600">|</span>
        <span class="text-[11px] font-mono">{{ Math.round(mapStore.zoomLevel * 100) }}% Zoom</span>
        <button 
          @click="mapStore.isMapSettingsOpen = true" 
          class="text-[10px] text-amber-400 hover:underline font-bold ml-1 cursor-pointer"
        >
          Change Radar
        </button>
      </div>

      <!-- STATIC ANCHORED INTERACTIVE POPUP -->
      <div 
        v-if="hoveredLineup"
        class="absolute z-40 transition-all duration-100"
        :style="{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`
        }"
        @mouseenter="handleTooltipEnter"
        @mouseleave="handleLineupLeave"
        @click.stop
      >
        <div class="w-72 p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl text-slate-100 flex flex-col gap-2.5 animate-fade-in">
          <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div class="flex items-center gap-2 min-w-0">
              <NadeIcon :type="hoveredLineup.grenadeType" :size="18" :filled="true" />
              <span class="font-bold text-xs text-white truncate">{{ hoveredLineup.title }}</span>
            </div>

            <div class="flex items-center gap-1.5">
              <span 
                :class="[
                  'px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono',
                  hoveredLineup.side === 't' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                ]"
              >
                {{ hoveredLineup.side }}
              </span>
              <button
                @click="closeTooltip"
                class="p-0.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div class="flex flex-col text-[11px] text-slate-300 gap-1">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Stand:</span>
              <span class="text-white font-semibold truncate max-w-[150px]">{{ hoveredLineup.startLocation }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Land:</span>
              <span class="text-white font-semibold truncate max-w-[150px]">{{ hoveredLineup.endLocation }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Throw:</span>
              <span class="text-amber-400 font-bold uppercase font-mono text-[10px]">{{ hoveredLineup.throwType.replace('_', ' ') }}</span>
            </div>
          </div>

          <div v-if="hoveredLineup.consoleCommand" class="pt-1">
            <button
              @click="handleCopyCommand(hoveredLineup.consoleCommand, $event)"
              class="w-full flex items-center justify-between px-2 py-1 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-lg text-[10px] text-slate-300 font-mono transition-colors cursor-pointer"
            >
              <span class="truncate max-w-[180px]">setpos / setang</span>
              <span class="text-amber-400 font-bold flex items-center gap-1">
                <Check v-if="copiedCommand" class="w-3 h-3 text-emerald-400" />
                <Copy v-else class="w-3 h-3" />
                <span>{{ copiedCommand ? 'Copied' : 'Copy' }}</span>
              </span>
            </button>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
            <button
              @click="lineupStore.openLineup(hoveredLineup); closeTooltip()"
              class="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-slate-950 font-black rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <ExternalLink class="w-3 h-3 stroke-[2.5]" />
              <span>Open Guide</span>
            </button>

            <button
              @click="handleDeleteFromTooltip(hoveredLineup, $event)"
              class="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Delete this lineup"
            >
              <Trash2 class="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ───────────────────────────────────────────────────────────── -->
    <!-- CSNADES.GG DOCKED LINEUP CARD (WHEN PIN IS CLICKED) -->
    <!-- ───────────────────────────────────────────────────────────── -->
    <div 
      v-if="activeLineup"
      class="csnades-spot-drawer p-5 bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col gap-4 animate-fade-in"
    >
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <NadeIcon :type="activeLineup.grenadeType" :size="22" :filled="true" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-black uppercase text-white tracking-wide">
                {{ activeLineup.title }}
              </h3>
              <span 
                :class="[
                  'px-2 py-0.5 rounded text-xs font-bold uppercase font-mono',
                  activeLineup.side === 't' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                ]"
              >
                {{ activeLineup.side }} Side
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              From <strong class="text-slate-200">{{ activeLineup.startLocation }}</strong> to <strong class="text-slate-200">{{ activeLineup.endLocation }}</strong>
            </p>
          </div>
        </div>

        <button 
          @click="selectedLineupId = null"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Close"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- SPOT DETAILS & ACTIONS -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3 text-xs">
          <div class="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
            <span class="text-slate-500 mr-1">Throw:</span>
            <strong class="text-amber-400 uppercase font-mono">{{ activeLineup.throwType.replace('_', ' ') }}</strong>
          </div>
          <div class="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
            <span class="text-slate-500 mr-1">Tickrate:</span>
            <strong class="text-emerald-400 uppercase font-mono">{{ activeLineup.tickrate || 'CS2 Subtick' }}</strong>
          </div>
          <div class="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
            <span class="text-slate-500 mr-1">Difficulty:</span>
            <strong class="text-white capitalize">{{ activeLineup.difficulty || 'Easy' }}</strong>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            @click="lineupStore.openLineup(activeLineup)"
            class="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <Play class="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Open Full Video & Crosshair Guide</span>
          </button>

          <button
            @click="handleDeleteFromTooltip(activeLineup, $event)"
            class="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
