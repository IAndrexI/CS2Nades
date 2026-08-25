<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import VectorMapBlueprint from './VectorMapBlueprint.vue'
import NadeIcon from '../common/NadeIcon.vue'
import type { Lineup, GrenadeType } from '../../types'
import { clientToPct, pctToSvg, trajectoryPath } from '../../utils/radarCoords'
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
  Layers,
  Users,
  PlusCircle,
  Tag,
  CheckCircle2
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

// Right-click context menu state
const contextMenuVisible = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuCoords = ref<{ x: number; y: number } | null>(null)

// Add callout dialog state
const isCalloutModalOpen = ref(false)
const newCalloutName = ref('')
const newCalloutSite = ref<'A' | 'B' | 'Mid' | 'Spawn' | 'Other'>('A')

// Helper for Grenade Colors (CSNADES.GG EXACT PALETTE)
function getNadeColor(type: GrenadeType): string {
  switch (type) {
    case 'smoke': return '#94a3b8' // Clean Slate
    case 'flash': return '#eab308' // CS2 Gold
    case 'molotov': return '#ef4444' // Fire Red
    case 'he': return '#22c55e' // Tactical Green
    case 'decoy': return '#a855f7' // Purple
    default: return '#cbd5e1'
  }
}

// Current viewBox string
const currentViewBox = computed(() => mapStore.currentMap.viewBox || '0 0 1000 1000')

// Map pin transform calculation using SVG viewBox
function getPinTransform(coords: { x: number; y: number }) {
  const pt = pctToSvg(coords, currentViewBox.value)
  return `translate(${pt.x}, ${pt.y})`
}

// Map trajectory curve calculation using SVG viewBox
function getLineupTrajectoryPath(lineup: Lineup) {
  return trajectoryPath(
    lineup.originCoords,
    lineup.landingCoords,
    currentViewBox.value,
    lineup.curveOffset || 0
  )
}

function getLivePlacementTrajectoryPath() {
  if (!mapStore.tempPlacement.origin || !liveCursorCoords.value) return ''
  return trajectoryPath(
    mapStore.tempPlacement.origin,
    liveCursorCoords.value,
    currentViewBox.value,
    0
  )
}

// Lineups that should display active trajectories
const visibleTrajectories = computed<Lineup[]>(() => {
  if (lineupStore.activeExecute) {
    return lineupStore.activeExecuteLineups
  }
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
  if (contextMenuVisible.value) {
    contextMenuVisible.value = false
  }

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
// BULLETPROOF COORDINATE SYSTEM: SVG Matrix Inversion
// ─────────────────────────────────────────────────────────────
function getSvgPoint(e: MouseEvent): { x: number; y: number } | null {
  if (!svgElement.value) return null
  const pt = clientToPct(svgElement.value, e.clientX, e.clientY)
  if (pt) return pt

  const rect = svgElement.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const rawX = ((e.clientX - rect.left) / rect.width) * 100
  const rawY = ((e.clientY - rect.top) / rect.height) * 100
  return {
    x: Math.round(Math.min(Math.max(rawX, 0), 100) * 10) / 10,
    y: Math.round(Math.min(Math.max(rawY, 0), 100) * 10) / 10
  }
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
// RIGHT-CLICK CONTEXT MENU HANDLERS
// ─────────────────────────────────────────────────────────────
function handleContextMenu(e: MouseEvent) {
  if (mapStore.isPlacementMode) {
    mapStore.cancelPlacement()
    liveCursorCoords.value = null
    return
  }

  const coords = getSvgPoint(e)
  if (!coords || !mapContainer.value) return

  const rect = mapContainer.value.getBoundingClientRect()
  let x = e.clientX - rect.left
  let y = e.clientY - rect.top

  const menuWidth = 200
  const menuHeight = 110
  if (x + menuWidth > rect.width) x = rect.width - menuWidth - 10
  if (y + menuHeight > rect.height) y = rect.height - menuHeight - 10
  if (x < 10) x = 10
  if (y < 10) y = 10

  contextMenuPos.value = { x, y }
  contextMenuCoords.value = coords
  contextMenuVisible.value = true
}

function handleCreateLineupFromContextMenu() {
  if (!contextMenuCoords.value) return
  mapStore.tempPlacement.origin = { ...contextMenuCoords.value }
  mapStore.isPlacementMode = true
  mapStore.placementStep = 'landing'
  contextMenuVisible.value = false
}

function handleOpenCalloutModalFromContextMenu() {
  if (!contextMenuCoords.value) return
  newCalloutName.value = ''
  newCalloutSite.value = 'A'
  isCalloutModalOpen.value = true
  contextMenuVisible.value = false
}

function saveNewCallout() {
  if (!newCalloutName.value.trim() || !contextMenuCoords.value) return
  mapStore.addCustomCallout(mapStore.currentMapId, {
    name: newCalloutName.value.trim(),
    site: newCalloutSite.value,
    coords: { ...contextMenuCoords.value }
  })
  mapStore.showCallouts = true
  isCalloutModalOpen.value = false
}

// ─────────────────────────────────────────────────────────────
// CSNADES.GG INTERACTION HANDLERS (STATIC NON-JUMPING PINS)
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
  contextMenuVisible.value = false
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
      class="interactive-minimap-container relative w-full h-[580px] sm:h-[640px] lg:h-[720px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @click="handleBackgroundMapClick"
      @contextmenu.prevent="handleContextMenu"
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
          :viewBox="currentViewBox" 
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
                'transition-opacity duration-150 cursor-pointer',
                hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? 'opacity-100' : 'opacity-70'
              ]"
              @mouseenter="handleLineupEnter(lineup, $event)"
              @mouseleave="handleLineupLeave"
              @click="handleLandingPinClick(lineup, $event)"
            >
              <!-- WIDE TRANSPARENT HIT-AREA -->
              <path 
                :d="getLineupTrajectoryPath(lineup)"
                fill="none" 
                stroke="transparent" 
                stroke-width="28"
                pointer-events="stroke"
              />

              <!-- Outer Trajectory Glow Line -->
              <path 
                :d="getLineupTrajectoryPath(lineup)"
                fill="none" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                :stroke-width="hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? '5' : '3.5'"
                :stroke-opacity="hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? '0.6' : '0.35'"
                pointer-events="none"
              />

              <!-- Inner Animated Dashed Line -->
              <path 
                :d="getLineupTrajectoryPath(lineup)"
                fill="none" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                :stroke-width="hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? '3' : '2'"
                class="animate-trajectory"
                pointer-events="none"
              />
            </g>
          </g>

          <!-- LAYER 3: THROW ORIGIN PINS (STATIC - NO JUMPING/SCALING ON HOVER) -->
          <g class="origin-markers-layer">
            <g 
              v-for="lineup in (selectedLineupId ? visibleTrajectories : lineupStore.filteredLineups)" 
              :key="`origin-${lineup.id}`"
              :transform="getPinTransform(lineup.originCoords)"
              class="cursor-pointer"
              @mouseenter="handleLineupEnter(lineup, $event)"
              @mouseleave="handleLineupLeave"
              @click="handleLandingPinClick(lineup, $event)"
            >
              <!-- TRANSPARENT HIT-AREA -->
              <circle cx="0" cy="0" r="24" fill="transparent" pointer-events="all" />

              <!-- Origin Static Outer Ring -->
              <circle 
                cx="0" 
                cy="0" 
                r="13" 
                fill="none" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                stroke-width="1.8" 
                stroke-dasharray="3 3"
                :class="[
                  'transition-opacity',
                  hoveredLineup?.id === lineup.id || selectedLineupId === lineup.id ? 'opacity-100' : 'opacity-65'
                ]"
                pointer-events="none"
              />
              
              <!-- Origin Base Circle (Team Color) -->
              <circle 
                cx="0" 
                cy="0" 
                r="8.5" 
                :fill="lineup.side === 't' ? '#f97316' : lineup.side === 'ct' ? '#38bdf8' : '#334155'" 
                stroke="#0b0e14" 
                stroke-width="2"
                pointer-events="none"
              />
              
              <circle cx="0" cy="0" r="3" fill="#ffffff" pointer-events="none" />
            </g>
          </g>

          <!-- LAYER 4: CSNADES.GG TARGET LANDING PINS (STATIC - NO HOVER JUMPS) -->
          <g class="landing-markers-layer">
            <g 
              v-for="lineup in lineupStore.filteredLineups" 
              :key="`landing-${lineup.id}`"
              :transform="getPinTransform(lineup.landingCoords)"
              class="cursor-pointer"
              @mouseenter="handleLineupEnter(lineup, $event)"
              @mouseleave="handleLineupLeave"
              @click="handleLandingPinClick(lineup, $event)"
            >
              <!-- TRANSPARENT HIT-AREA -->
              <circle cx="0" cy="0" r="26" fill="transparent" pointer-events="all" />

              <!-- Static Outer Ring (Subtle Glow when active) -->
              <circle 
                cx="0" 
                cy="0" 
                r="16" 
                :fill="getNadeColor(lineup.grenadeType)" 
                :fill-opacity="selectedLineupId === lineup.id || hoveredLineup?.id === lineup.id ? '0.35' : '0.15'" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                :stroke-width="selectedLineupId === lineup.id || hoveredLineup?.id === lineup.id ? '2.5' : '1.5'"
                pointer-events="none"
              />

              <!-- Pin Solid Dark Circle -->
              <circle 
                cx="0" 
                cy="0" 
                r="11" 
                fill="#0b0e14" 
                :stroke="getNadeColor(lineup.grenadeType)" 
                stroke-width="2"
                pointer-events="none"
              />

              <!-- CSNADES.GG Grenade Icon Glyphs -->
              <!-- SMOKE GLYPH -->
              <g v-if="lineup.grenadeType === 'smoke'" pointer-events="none" transform="translate(-4.5, -4.5) scale(0.38)">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="#94a3b8" />
              </g>

              <!-- FLASH GLYPH -->
              <g v-else-if="lineup.grenadeType === 'flash'" pointer-events="none" transform="translate(-4, -4.5) scale(0.38)">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#eab308" />
              </g>

              <!-- MOLOTOV GLYPH -->
              <g v-else-if="lineup.grenadeType === 'molotov'" pointer-events="none" transform="translate(-4.5, -5) scale(0.4)">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="#ef4444" />
              </g>

              <!-- HE GLYPH -->
              <g v-else-if="lineup.grenadeType === 'he'" pointer-events="none" transform="translate(-4.5, -4.5) scale(0.38)">
                <circle cx="12" cy="14" r="6" fill="#22c55e" />
                <path d="M12 7V3M9 3h6" stroke="#22c55e" stroke-width="2" />
              </g>

              <!-- DECOY GLYPH -->
              <g v-else pointer-events="none" transform="translate(-4.5, -4.5) scale(0.38)">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#a855f7" />
              </g>
            </g>
          </g>

          <!-- LAYER 5: LIVE PLACEMENT MODE PINS (Precise & Interactive) -->
          <g v-if="mapStore.isPlacementMode" class="placement-pins-layer">
            <g 
              v-if="mapStore.tempPlacement.origin" 
              :transform="getPinTransform(mapStore.tempPlacement.origin)"
            >
              <circle cx="0" cy="0" r="18" fill="#22c55e" fill-opacity="0.3" stroke="#22c55e" stroke-width="2" class="animate-pulse" />
              <circle cx="0" cy="0" r="8" fill="#22c55e" stroke="#ffffff" stroke-width="2" />
              <text x="0" y="-14" font-size="12" font-weight="bold" fill="#22c55e" text-anchor="middle">STAND HERE</text>
            </g>

            <g v-if="mapStore.placementStep === 'landing' && mapStore.tempPlacement.origin && liveCursorCoords">
              <path 
                :d="getLivePlacementTrajectoryPath()"
                fill="none" 
                stroke="#de9b35" 
                stroke-width="2.5" 
                stroke-dasharray="6 6"
                class="animate-trajectory"
              />
              <g :transform="getPinTransform(liveCursorCoords)">
                <circle cx="0" cy="0" r="20" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2" class="animate-pulse" />
                <circle cx="0" cy="0" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
                <text x="0" y="-14" font-size="12" font-weight="bold" fill="#ef4444" text-anchor="middle">LANDING SPOT</text>
              </g>
            </g>
          </g>
        </svg>
      </div>

      <!-- RIGHT-CLICK CONTEXT MENU -->
      <div 
        v-if="contextMenuVisible"
        class="absolute z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 min-w-[185px] animate-fade-in"
        :style="{
          left: `${contextMenuPos.x}px`,
          top: `${contextMenuPos.y}px`
        }"
        @click.stop
      >
        <div class="px-2 py-1 border-b border-slate-800 text-[10px] uppercase font-mono font-bold text-slate-400">
          Quick Actions ({{ contextMenuCoords?.x }}%, {{ contextMenuCoords?.y }}%)
        </div>
        <button
          @click="handleCreateLineupFromContextMenu"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
        >
          <PlusCircle class="w-4 h-4 text-amber-400" />
          <span>New Lineup Here</span>
        </button>
        <button
          @click="handleOpenCalloutModalFromContextMenu"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors text-left cursor-pointer"
        >
          <Tag class="w-4 h-4 text-sky-400" />
          <span>Add Callout Spot</span>
        </button>
      </div>

      <!-- ADD CALLOUT DIALOG OVERLAY -->
      <div
        v-if="isCalloutModalOpen"
        class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        @click.self="isCalloutModalOpen = false"
      >
        <div class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4" @click.stop>
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <Tag class="w-5 h-5 text-amber-400" />
              <h3 class="font-bold text-sm text-white">Add Callout Spot</h3>
            </div>
            <button 
              @click="isCalloutModalOpen = false"
              class="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="flex flex-col gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Callout Name</label>
              <input
                v-model="newCalloutName"
                type="text"
                placeholder="e.g. Squeaky, Radio, Banana, Palace"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                autofocus
                @keyup.enter="saveNewCallout"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Site / Area</label>
              <select
                v-model="newCalloutSite"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="A">A Site</option>
                <option value="B">B Site</option>
                <option value="Mid">Mid</option>
                <option value="Spawn">Spawn</option>
                <option value="Other">Other / General</option>
              </select>
            </div>

            <div class="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              Coordinates: X: {{ contextMenuCoords?.x }}%, Y: {{ contextMenuCoords?.y }}%
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              @click="isCalloutModalOpen = false"
              class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="saveNewCallout"
              class="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer"
            >
              <CheckCircle2 class="w-3.5 h-3.5" />
              <span>Save Callout</span>
            </button>
          </div>
        </div>
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
          @click="mapStore.cancelPlacement(); liveCursorCoords = null"
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
            <span>Open Full Video &amp; Crosshair Guide</span>
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
