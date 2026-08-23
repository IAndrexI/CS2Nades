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
  Sparkles,
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
const tooltipPosition = ref({ x: 0, y: 0 })

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

// Calculate SVG Bezier curve path between Origin and Landing
function getTrajectoryPath(origin: { x: number; y: number }, landing: { x: number; y: number }, curveOffset = 0): string {
  const ox = origin.x * 10
  const oy = origin.y * 10
  const lx = landing.x * 10
  const ly = landing.y * 10

  // Midpoint
  const mx = (ox + lx) / 2
  const my = (oy + ly) / 2

  // Perpendicular vector for arching
  const dx = lx - ox
  const dy = ly - oy
  const dist = Math.sqrt(dx * dx + dy * dy)
  
  // Arch height proportional to distance + curveOffset
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
  if (e.button !== 0) return // Left click only
  
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

  if (hoveredLineup.value && mapContainer.value) {
    const rect = mapContainer.value.getBoundingClientRect()
    tooltipPosition.value = {
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15
    }
  }
}

function handleMouseUp() {
  isDragging.value = false
}

// Handle Map Clicks for Placement Mode with 100% Mathematical Precision
function getSvgPoint(e: MouseEvent): { x: number; y: number } | null {
  if (!svgElement.value) return null
  const pt = svgElement.value.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = svgElement.value.getScreenCTM()
  if (!ctm) return null
  const transformed = pt.matrixTransform(ctm.inverse())
  
  // transformed.x and transformed.y are in 0..1000 SVG coordinate space
  const pctX = Math.round(Math.min(Math.max(transformed.x / 10, 0), 100) * 10) / 10
  const pctY = Math.round(Math.min(Math.max(transformed.y / 10, 0), 100) * 10) / 10
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
    lineupStore.isAddModalOpen = true
  }
}

// Lineup marker interaction
function handleLineupHover(lineup: Lineup | null, e?: MouseEvent) {
  hoveredLineup.value = lineup
  lineupStore.setHoveredLineup(lineup)
  if (lineup && e && mapContainer.value) {
    const rect = mapContainer.value.getBoundingClientRect()
    tooltipPosition.value = {
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15
    }
  }
}

function handleLineupClick(lineup: Lineup, e: MouseEvent) {
  e.stopPropagation()
  lineupStore.openLineup(lineup)
}

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div 
    ref="mapContainer"
    class="interactive-minimap-container relative w-full h-[620px] lg:h-[720px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
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
        <!-- LAYER 1: BASE VECTOR / REAL RADAR OVERVIEW -->
        <VectorMapBlueprint 
          :map-info="mapStore.currentMap" 
          :show-callouts="mapStore.showCallouts"
        />

        <!-- LAYER 2: TRAJECTORY CURVES (FOR FILTERED LINEUPS) -->
        <g v-if="mapStore.showTrajectories" class="trajectories-layer">
          <g 
            v-for="lineup in lineupStore.filteredLineups" 
            :key="`traj-${lineup.id}`"
            :class="[
              'transition-all duration-200 cursor-pointer',
              hoveredLineup?.id === lineup.id ? 'opacity-100' : 'opacity-65 hover:opacity-100'
            ]"
            @mouseenter="handleLineupHover(lineup, $event)"
            @mouseleave="handleLineupHover(null)"
            @click="handleLineupClick(lineup, $event)"
          >
            <!-- Outer Trajectory Glow Line -->
            <path 
              :d="getTrajectoryPath(lineup.originCoords, lineup.landingCoords, lineup.curveOffset)"
              fill="none" 
              :stroke="getNadeColor(lineup.grenadeType)" 
              :stroke-width="hoveredLineup?.id === lineup.id ? '4.5' : '3'"
              stroke-opacity="0.35"
            />

            <!-- Inner Animated Dashed Line -->
            <path 
              :d="getTrajectoryPath(lineup.originCoords, lineup.landingCoords, lineup.curveOffset)"
              fill="none" 
              :stroke="getNadeColor(lineup.grenadeType)" 
              :stroke-width="hoveredLineup?.id === lineup.id ? '2.5' : '1.8'"
              class="animate-trajectory"
            />
          </g>
        </g>

        <!-- LAYER 3: THROW ORIGIN MARKERS (PLAYER STANDING POSITION) -->
        <g class="origin-markers-layer">
          <g 
            v-for="lineup in lineupStore.filteredLineups" 
            :key="`origin-${lineup.id}`"
            :transform="`translate(${lineup.originCoords.x * 10}, ${lineup.originCoords.y * 10})`"
            class="cursor-pointer transition-transform duration-150 hover:scale-125"
            @mouseenter="handleLineupHover(lineup, $event)"
            @mouseleave="handleLineupHover(null)"
            @click="handleLineupClick(lineup, $event)"
          >
            <!-- Origin Pulse Ring -->
            <circle 
              cx="0" 
              cy="0" 
              r="14" 
              fill="none" 
              :stroke="getNadeColor(lineup.grenadeType)" 
              stroke-width="1.5" 
              stroke-dasharray="3 3"
              class="opacity-70"
            />
            
            <!-- Origin Base Circle -->
            <circle 
              cx="0" 
              cy="0" 
              r="9" 
              :fill="lineup.side === 't' ? '#f97316' : lineup.side === 'ct' ? '#38bdf8' : '#334155'" 
              stroke="#0f172a" 
              stroke-width="2"
            />
            
            <!-- Origin Dot Icon -->
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </g>
        </g>

        <!-- LAYER 4: DETONATION / LANDING MARKERS (IMPACT POINT) -->
        <g class="landing-markers-layer">
          <g 
            v-for="lineup in lineupStore.filteredLineups" 
            :key="`landing-${lineup.id}`"
            :transform="`translate(${lineup.landingCoords.x * 10}, ${lineup.landingCoords.y * 10})`"
            class="cursor-pointer transition-transform duration-150 hover:scale-130"
            @mouseenter="handleLineupHover(lineup, $event)"
            @mouseleave="handleLineupHover(null)"
            @click="handleLineupClick(lineup, $event)"
          >
            <!-- Detonation Burst Radius -->
            <circle 
              cx="0" 
              cy="0" 
              :r="hoveredLineup?.id === lineup.id ? '22' : '16'" 
              :fill="getNadeColor(lineup.grenadeType)" 
              fill-opacity="0.3" 
              :stroke="getNadeColor(lineup.grenadeType)" 
              stroke-width="1.5"
              class="animate-pulse-glow"
            />

            <!-- Inner Solid Badge with Icon -->
            <circle 
              cx="0" 
              cy="0" 
              r="11" 
              fill="#0f172a" 
              :stroke="getNadeColor(lineup.grenadeType)" 
              stroke-width="2"
            />

            <!-- Type Indicator Dot -->
            <circle cx="0" cy="0" r="4.5" :fill="getNadeColor(lineup.grenadeType)" />
          </g>
        </g>

        <!-- LAYER 5: TEMPORARY PLACEMENT PINS -->
        <g v-if="mapStore.isPlacementMode" class="placement-pins-layer">
          <g 
            v-if="mapStore.tempPlacement.origin" 
            :transform="`translate(${mapStore.tempPlacement.origin.x * 10}, ${mapStore.tempPlacement.origin.y * 10})`"
          >
            <circle cx="0" cy="0" r="18" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="2" class="animate-pulse" />
            <circle cx="0" cy="0" r="8" fill="#22c55e" stroke="#ffffff" stroke-width="2" />
            <text x="0" y="-14" font-size="12" font-weight="bold" fill="#22c55e" text-anchor="middle">ORIGIN</text>
          </g>

          <g 
            v-if="mapStore.tempPlacement.landing" 
            :transform="`translate(${mapStore.tempPlacement.landing.x * 10}, ${mapStore.tempPlacement.landing.y * 10})`"
          >
            <circle cx="0" cy="0" r="22" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2" class="animate-pulse" />
            <circle cx="0" cy="0" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
            <text x="0" y="-16" font-size="12" font-weight="bold" fill="#ef4444" text-anchor="middle">TARGET</text>
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
        {{ mapStore.placementStep === 'origin' ? 'Step 1: Click on the radar where you stand (Origin)' : 'Step 2: Click where the grenade lands (Target)' }}
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
        class="text-[10px] text-amber-400 hover:underline font-bold ml-1"
      >
        Change Radar
      </button>
    </div>

    <!-- FLOATING HOVER TOOLTIP / HUD PREVIEW -->
    <div 
      v-if="hoveredLineup"
      class="absolute z-40 pointer-events-none transition-all duration-75"
      :style="{
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`
      }"
    >
      <div class="w-64 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl text-slate-100 flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <NadeIcon :type="hoveredLineup.grenadeType" :size="16" :filled="true" />
            <span class="font-bold text-xs text-white truncate">{{ hoveredLineup.title }}</span>
          </div>
          <span 
            :class="[
              'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
              hoveredLineup.side === 't' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            ]"
          >
            {{ hoveredLineup.side }}
          </span>
        </div>

        <div class="flex flex-col text-[11px] text-slate-400 gap-0.5">
          <div class="flex items-center justify-between">
            <span>From:</span>
            <span class="text-slate-200 font-medium">{{ hoveredLineup.startLocation }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>To:</span>
            <span class="text-slate-200 font-medium">{{ hoveredLineup.endLocation }}</span>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Throw:</span>
            <span class="text-amber-400 font-bold uppercase">{{ hoveredLineup.throwType.replace('_', ' ') }}</span>
          </div>
        </div>

        <div class="text-[10px] text-slate-500 italic text-center pt-1 border-t border-slate-800">
          Click to view full guide & video
        </div>
      </div>
    </div>
  </div>
</template>
