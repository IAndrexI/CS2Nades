<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useCS2ServerStore } from '../../stores/cs2ServerStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { findNearestCallout } from '../../data/mapsData'
import {
  clientToSvgRadarPct,
  computeTrajectoryArc,
  cs2YawToRadarVector,
  radarToWorldCoords
} from '../../core/radar/coordinateEngine'
import VectorMapBlueprint from './VectorMapBlueprint.vue'
import MapSettingsModal from './MapSettingsModal.vue'
import type { GrenadeType, Lineup, Point2D } from '../../types'
import {
  Crosshair,
  Layers,
  Maximize2,
  Mic,
  Navigation,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Tag,
  X,
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

// Live Cursor Coordinate Readout
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

const currentMap = computed(() => mapStore.getMapById(lineupStore.activeMapId))
const inversePinScale = computed(() => Number((1 / Math.pow(zoom.value, 0.82)).toFixed(3)))

// Live CS2 Player Position on Current Map
const activePlayerMarker = computed(() => {
  if (!cs2Store.showPlayerOnRadar) return null
  const tel = cs2Store.liveTelemetry
  if (tel.positionAvailable && tel.radarCoords && tel.mapId === lineupStore.activeMapId) {
    const yaw = tel.worldPos?.yaw ?? 0
    const lookVec = cs2YawToRadarVector(yaw, 7.5)
    return {
      coords: tel.radarCoords,
      estimatedLanding: tel.estimatedLandingCoords,
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
      coords: pos.radarCoords,
      estimatedLanding: pos.estimatedLandingCoords || null,
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

function handleSvgClick(e: MouseEvent) {
  if (didDrag.value || !svgRef.value) return
  const coords = clientToSvgRadarPct(svgRef.value, e.clientX, e.clientY, true)
  if (!coords) return

  if (lineupStore.isAddingLineup && lineupStore.placementStep !== 'details') {
    lineupStore.setDraftPoint(coords)
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
    lineupStore.setDraftPoint(coords)
  } else if (lineupStore.placementStep !== 'details') {
    lineupStore.setDraftPoint(coords)
  }
}

function selectLineupFromPin(lineup: Lineup, e: MouseEvent) {
  e.stopPropagation()
  if (lineupStore.isAddingLineup) return
  lineupStore.selectLineup(lineup)
}

function createLineupFromLivePlayer() {
  const marker = activePlayerMarker.value
  if (!marker) return
  lineupStore.startPlacingLineup()
  lineupStore.setDraftPoint({ ...marker.coords })
  if (marker.estimatedLanding) {
    lineupStore.setDraftPoint({ ...marker.estimatedLanding })
  }
}

function isLineupHighlighted(item: Lineup): boolean {
  if (lineupStore.hoveredLineupId === item.id || lineupStore.selectedLineup?.id === item.id) {
    return true
  }
  if (lineupStore.activeExecuteStepOrder !== null) {
    const step = executeStepByLineupId.value.get(item.id)
    return step?.order === lineupStore.activeExecuteStepOrder
  }
  return false
}

function isLineupDimmed(item: Lineup): boolean {
  if (lineupStore.activeExecuteStepOrder !== null) {
    const step = executeStepByLineupId.value.get(item.id)
    return step?.order !== lineupStore.activeExecuteStepOrder
  }
  if (lineupStore.hoveredLineupId && lineupStore.hoveredLineupId !== item.id) {
    return true
  }
  return false
}
</script>

<template>
  <div
    class="relative w-full h-full flex flex-col items-center justify-center bg-[#070a0f] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl select-none"
  >
    <!-- Top Left HUD: Active Map Info, Execute Scrubber & Placement Banner -->
    <div class="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[75%] pointer-events-none">
      <div
        class="flex flex-wrap items-center gap-2 bg-slate-900/92 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/90 shadow-lg pointer-events-auto"
      >
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span class="font-bold text-white tracking-wide uppercase text-xs">
          {{ currentMap.name }}
        </span>
        <span class="text-[11px] font-mono text-slate-400 hidden sm:inline">
          ({{ currentMap.code }})
        </span>
        <span class="h-3 w-px bg-slate-700 mx-0.5"></span>
        <span class="text-xs text-amber-400 font-semibold">
          {{ lineupStore.filteredLineups.length }} Lineups
        </span>
        <button
          @click="mapStore.showCallouts = !mapStore.showCallouts"
          :class="[
            'ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1',
            mapStore.showCallouts
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
          ]"
          title="Toggle CS2 Callout Names on Radar"
        >
          <Tag class="w-2.5 h-2.5" />
          Callouts
        </button>
      </div>

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

        <!-- Step-by-Step Execute Sequence Scrubber -->
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
          Step 1: Click on the radar where you STAND to throw
        </span>
        <span v-else>
          Step 2: Click on the radar where the grenade LANDS
        </span>
      </div>
    </div>

    <!-- Top Right Controls: Floor Selector (Nuke/Vertigo), Voice Mic, Zoom & Settings -->
    <div class="absolute top-3 right-3 z-20 flex items-center gap-1.5">
      <!-- Surface Level Selector (Upper / Lower) for Nuke & Vertigo -->
      <div
        v-if="currentMap.radarFloors && currentMap.radarFloors.length > 0"
        class="flex items-center bg-slate-900/92 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg"
      >
        <Layers class="w-3.5 h-3.5 text-amber-400 mx-1.5" />
        <button
          v-for="floor in currentMap.radarFloors"
          :key="floor.id"
          @click="lineupStore.activeFloorId = floor.id"
          :class="[
            'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
            lineupStore.activeFloorId === floor.id
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          ]"
        >
          {{ floor.id === 'upper' ? 'Upper' : 'Lower' }}
        </button>
      </div>

      <!-- Quick Voice Search Mic Button -->
      <button
        @click="voiceStore.isPanelOpen = !voiceStore.isPanelOpen"
        :class="[
          'flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-lg backdrop-blur-md',
          voiceStore.isListening
            ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
            : 'bg-slate-900/92 text-slate-300 hover:text-white border-slate-800'
        ]"
        title="Voice Command & Hands-Free Navigation"
      >
        <Mic class="w-3.5 h-3.5" />
        <span class="hidden md:inline">
          {{ voiceStore.isListening ? 'Listening...' : 'Voice' }}
        </span>
      </button>

      <!-- Radar Settings -->
      <button
        @click="showSettingsModal = true"
        class="p-2 rounded-xl bg-slate-900/92 backdrop-blur-md hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 shadow-lg transition-colors cursor-pointer"
        title="Radar Display & Skin Settings"
      >
        <SlidersHorizontal class="w-4 h-4" />
      </button>

      <!-- Zoom Controls -->
      <div
        class="hidden sm:flex items-center gap-0.5 bg-slate-900/92 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg"
      >
        <button
          @click="handleZoomOut"
          class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut class="w-3.5 h-3.5" />
        </button>
        <span class="text-[11px] font-mono text-slate-300 px-1.5 min-w-[40px] text-center">
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
          title="Reset Radar View"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Interactive SVG Precision Radar Canvas -->
    <div
      class="w-full flex items-center justify-center overflow-hidden"
      :class="{
        'cursor-crosshair': lineupStore.isAddingLineup && lineupStore.placementStep !== 'details',
        'cursor-grab': !lineupStore.isAddingLineup && !isPanning,
        'cursor-grabbing': isPanning
      }"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <div class="relative w-full max-w-[820px] aspect-square overflow-hidden flex items-center justify-center">
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

        <!-- 2. Flight Trajectories (Quadratic Bezier Arcs) -->
        <g
          v-if="mapStore.showTrajectories || lineupStore.hoveredLineupId || lineupStore.selectedLineup || lineupStore.activeExecute"
          class="trajectories-layer"
        >
          <g
            v-for="item in lineupStore.filteredLineups"
            :key="'traj-' + item.id"
            :class="[
              'transition-opacity duration-200',
              isLineupDimmed(item) ? 'opacity-15' : 'opacity-100'
            ]"
          >
            <template
              v-if="
                mapStore.showTrajectories ||
                isLineupHighlighted(item) ||
                lineupStore.activeExecute
              "
            >
              <!-- Outer Trajectory Glow when Hovered / Selected -->
              <path
                v-if="isLineupHighlighted(item)"
                :d="computeTrajectoryArc(item.originCoords, item.landingCoords).pathData"
                fill="none"
                :stroke="grenadeColors[item.grenadeType].stroke"
                :stroke-width="6 * inversePinScale"
                stroke-opacity="0.28"
                stroke-linecap="round"
              />

              <!-- Dashed Ballistic Flight Path -->
              <path
                :d="computeTrajectoryArc(item.originCoords, item.landingCoords).pathData"
                fill="none"
                :stroke="grenadeColors[item.grenadeType].stroke"
                :stroke-width="(isLineupHighlighted(item) ? 3.2 : 2.1) * inversePinScale"
                :stroke-dasharray="isLineupHighlighted(item) ? 'none' : '8 6'"
                stroke-linecap="round"
                class="cursor-pointer"
                @click="selectLineupFromPin(item, $event)"
                @mouseenter="lineupStore.hoveredLineupId = item.id"
                @mouseleave="lineupStore.hoveredLineupId = null"
              />

              <!-- Origin Throw Position Pin (Diamond / Dot at Standing Spot) -->
              <g
                :transform="`translate(${item.originCoords.x * 10}, ${item.originCoords.y * 10}) scale(${inversePinScale})`"
                class="cursor-pointer"
                @click="selectLineupFromPin(item, $event)"
                @mouseenter="lineupStore.hoveredLineupId = item.id"
                @mouseleave="lineupStore.hoveredLineupId = null"
              >
                <circle
                  r="10"
                  fill="#090d16"
                  fill-opacity="0.9"
                  :stroke="grenadeColors[item.grenadeType].stroke"
                  :stroke-width="isLineupHighlighted(item) ? 3 : 2"
                />
                <circle
                  r="4"
                  :fill="grenadeColors[item.grenadeType].stroke"
                />
              </g>
            </template>
          </g>
        </g>

        <!-- 3. Landing Target Pins (with Execute Sequence Badges & Role Tags) -->
        <g class="landing-pins-layer">
          <g
            v-for="item in lineupStore.filteredLineups"
            :key="'pin-' + item.id"
            :transform="`translate(${item.landingCoords.x * 10}, ${item.landingCoords.y * 10}) scale(${inversePinScale})`"
            :class="[
              'cursor-pointer transition-opacity duration-200',
              isLineupDimmed(item) ? 'opacity-25' : 'opacity-100'
            ]"
            @click="selectLineupFromPin(item, $event)"
            @mouseenter="lineupStore.hoveredLineupId = item.id"
            @mouseleave="lineupStore.hoveredLineupId = null"
          >
            <!-- Soft Smoke/Molly Area-of-Effect Bloom Ring on Hover/Select -->
            <circle
              v-if="isLineupHighlighted(item)"
              :r="item.grenadeType === 'smoke' ? 38 : item.grenadeType === 'molotov' ? 30 : 24"
              :fill="grenadeColors[item.grenadeType].stroke"
              fill-opacity="0.16"
              :stroke="grenadeColors[item.grenadeType].stroke"
              stroke-width="1.5"
              stroke-dasharray="4 3"
            />

            <!-- Main Target Pin Circle -->
            <circle
              :r="isLineupHighlighted(item) ? 16 : 13.5"
              :fill="grenadeColors[item.grenadeType].fill"
              :stroke="grenadeColors[item.grenadeType].stroke"
              :stroke-width="isLineupHighlighted(item) ? 3 : 2.2"
            />

            <!-- Grenade Type Icon Glyph Inside Pin -->
            <g v-if="item.grenadeType === 'smoke'" fill="none" stroke="#e0f2fe" stroke-width="1.8">
              <path d="M-5 2a3.5 3.5 0 0 1 0-6 4.5 4.5 0 0 1 8.5-1 3.5 3.5 0 0 1 1.5 7Z" />
            </g>
            <g v-else-if="item.grenadeType === 'flash'" fill="none" stroke="#fef08a" stroke-width="1.8">
              <polygon points="1,-7 -5,1 0,1 -1,7 5,-1 0,-1" />
            </g>
            <g v-else-if="item.grenadeType === 'molotov'" fill="none" stroke="#ffedd5" stroke-width="1.8">
              <path d="M0 -7c2.5 3 5 5 5 8.5a5 5 0 0 1-10 0C-5 -2 -2.5 0 0 -7Z" />
            </g>
            <g v-else fill="none" stroke="#fee2e2" stroke-width="1.8">
              <circle cx="0" cy="1" r="5.5" />
              <line x1="0" y1="-4.5" x2="0" y2="-7.5" />
            </g>

            <!-- Team Execute Sequence Number & Role Badge (#1 Support, #2 IGL, etc.) -->
            <g
              v-if="executeStepByLineupId.has(item.id)"
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
                #{{ executeStepByLineupId.get(item.id)?.order }}
                {{ executeStepByLineupId.get(item.id)?.role?.slice(0, 3).toUpperCase() }}
              </text>
            </g>

            <!-- Hover / Always-On Label Tooltip -->
            <g
              v-if="mapStore.showLabels || isLineupHighlighted(item)"
              transform="translate(0, -24)"
            >
              <rect
                x="-75"
                y="-14"
                width="150"
                height="20"
                rx="5"
                fill="#090d16"
                fill-opacity="0.92"
                :stroke="grenadeColors[item.grenadeType].stroke"
                stroke-width="1.2"
              />
              <text
                x="0"
                y="-1"
                text-anchor="middle"
                fill="#f8fafc"
                font-size="10"
                font-weight="700"
                font-family="Inter, system-ui, sans-serif"
              >
                {{ item.endLocation }} ({{ item.throwType }})
              </text>
            </g>
          </g>
        </g>

        <!-- 4. Live CS2 Player Telemetry Marker & View-Angle Cone -->
        <g
          v-if="activePlayerMarker"
          class="live-cs2-player-layer"
        >
          <!-- Estimated Grenade Landing Preview Line from Live CS2 Angle -->
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

          <!-- Player Position Blip & View Cone -->
          <g
            :transform="`translate(${activePlayerMarker.coords.x * 10}, ${activePlayerMarker.coords.y * 10}) scale(${inversePinScale})`"
          >
            <circle r="18" fill="#10b981" fill-opacity="0.22" />
            <!-- Directional Look Vector -->
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

        <!-- 5. Draft Placement Pins (when creating/editing a lineup) -->
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

    <!-- Bottom Radar Telemetry Bar: Exact In-Game CS2 World Coordinates & Legend -->
    <div
      class="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
    >
      <!-- Left: Grenade Legend + Live CS2 Coordinate Readout -->
      <div
        class="flex flex-wrap items-center gap-3 bg-slate-900/92 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/90 text-[11px] text-slate-300 shadow-lg pointer-events-auto"
      >
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          <span>Smoke</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
          <span>Flash</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
          <span>Molly</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-red-400"></span>
          <span>HE</span>
        </div>

        <!-- Real-Time In-Game CS2 Coordinate Readout -->
        <template v-if="cursorRadarPct && cursorWorld">
          <span class="h-3 w-px bg-slate-700 hidden md:inline"></span>
          <div class="hidden md:flex items-center gap-2 font-mono text-[10px] text-slate-400">
            <span class="text-amber-400 font-semibold">
              CS2: X {{ cursorWorld.x }} Y {{ cursorWorld.y }}
            </span>
            <span>|</span>
            <span>Radar: {{ cursorRadarPct.x.toFixed(1) }}%, {{ cursorRadarPct.y.toFixed(1) }}%</span>
            <span v-if="cursorCallout" class="text-sky-300 font-sans font-semibold">
              • {{ cursorCallout.name }}
            </span>
          </div>
        </template>
      </div>

      <!-- Right: Live CS2 Capture Action or New Lineup Button -->
      <div class="flex items-center gap-2 pointer-events-auto">
        <button
          v-if="activePlayerMarker && !lineupStore.isAddingLineup"
          @click="createLineupFromLivePlayer"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-lg transition-all cursor-pointer"
        >
          <Navigation class="w-3.5 h-3.5" />
          <span>Use CS2 Pos ({{ activePlayerMarker.worldPos?.x }}, {{ activePlayerMarker.worldPos?.y }})</span>
        </button>

        <button
          v-if="!lineupStore.isAddingLineup"
          @click="lineupStore.startPlacingLineup()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Lineup</span>
        </button>
        <button
          v-else
          @click="lineupStore.cancelPlacingLineup()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs shadow-lg transition-all cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
          <span>Cancel Placement</span>
        </button>
      </div>
    </div>

    <MapSettingsModal v-if="showSettingsModal" @close="showSettingsModal = false" />
  </div>
</template>
