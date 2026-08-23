<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useStratStore } from '../../stores/stratStore'
import VectorMapBlueprint from '../map/VectorMapBlueprint.vue'
import NadeIcon from '../common/NadeIcon.vue'
import type { TacticsElement, TacticsElementType } from '../../types'
import { 
  Move, 
  ArrowUpRight, 
  Minus, 
  User, 
  Trash2, 
  RotateCcw, 
  RotateCw, 
  Sparkles, 
  Type,
  Flame,
  Zap,
  Cloud
} from 'lucide-vue-next'

const mapStore = useMapStore()
const stratStore = useStratStore()

const svgRef = ref<SVGSVGElement | null>(null)
const isDrawing = ref(false)
const currentPoints = ref<{ x: number; y: number }[]>([])

const tools: { id: 'select' | 'arrow' | 'line' | 'player' | 'smoke' | 'flash' | 'molotov'; label: string; icon: any }[] = [
  { id: 'select', label: 'Select', icon: Move },
  { id: 'arrow', label: 'Arrow Path', icon: ArrowUpRight },
  { id: 'line', label: 'Line / Vision', icon: Minus },
  { id: 'player', label: 'Player Pin', icon: User },
  { id: 'smoke', label: 'Smoke Cloud', icon: Cloud },
  { id: 'flash', label: 'Flash Burst', icon: Zap },
  { id: 'molotov', label: 'Molotov Fire', icon: Flame }
]

const roles = ['IGL', 'Entry', 'Support', 'Lurker', 'AWP']

function getMapCoords(e: MouseEvent): { x: number; y: number } {
  if (!svgRef.value) return { x: 0, y: 0 }
  const rect = svgRef.value.getBoundingClientRect()
  const x = Math.round((((e.clientX - rect.left) / rect.width) * 100) * 10) / 10
  const y = Math.round((((e.clientY - rect.top) / rect.height) * 100) * 10) / 10
  return { x, y }
}

function handleMouseDown(e: MouseEvent) {
  if (stratStore.activeTool === 'select') return
  const coords = getMapCoords(e)
  
  if (stratStore.activeTool === 'player') {
    stratStore.addBoardElement({
      id: `el-${Date.now()}`,
      type: 'player_icon',
      color: stratStore.activeColor,
      points: [coords],
      playerRole: stratStore.activeRole
    })
    return
  }

  if (stratStore.activeTool === 'smoke') {
    stratStore.addBoardElement({
      id: `el-${Date.now()}`,
      type: 'smoke_cloud',
      color: '#94a3b8',
      points: [coords],
      radius: 28
    })
    return
  }

  if (stratStore.activeTool === 'flash') {
    stratStore.addBoardElement({
      id: `el-${Date.now()}`,
      type: 'flash_burst',
      color: '#eab308',
      points: [coords],
      radius: 20
    })
    return
  }

  if (stratStore.activeTool === 'molotov') {
    stratStore.addBoardElement({
      id: `el-${Date.now()}`,
      type: 'molotov_fire',
      color: '#ef4444',
      points: [coords],
      radius: 25
    })
    return
  }

  // Lines & Arrows
  isDrawing.value = true
  currentPoints.value = [coords, coords]
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value) return
  const coords = getMapCoords(e)
  if (currentPoints.value.length > 0) {
    currentPoints.value[1] = coords
  }
}

function handleMouseUp() {
  if (!isDrawing.value) return
  isDrawing.value = false
  if (currentPoints.value.length === 2) {
    stratStore.addBoardElement({
      id: `el-${Date.now()}`,
      type: stratStore.activeTool as TacticsElementType,
      color: stratStore.activeColor,
      points: [...currentPoints.value]
    })
  }
  currentPoints.value = []
}
</script>

<template>
  <div class="tactics-board-wrapper flex flex-col gap-4">
    <!-- TACTICAL TOOLBAR -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl">
      <!-- TOOLS -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
        <button
          v-for="tool in tools"
          :key="tool.id"
          @click="stratStore.activeTool = tool.id"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer',
            stratStore.activeTool === tool.id
              ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <component :is="tool.icon" class="w-3.5 h-3.5" />
          <span>{{ tool.label }}</span>
        </button>
      </div>

      <!-- ROLE SELECTOR (WHEN PLAYER PIN SELECTED) -->
      <div v-if="stratStore.activeTool === 'player'" class="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
        <span class="text-[10px] text-slate-500 font-bold uppercase px-2">Role:</span>
        <button
          v-for="role in roles"
          :key="role"
          @click="stratStore.activeRole = role as any"
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors cursor-pointer',
            stratStore.activeRole === role
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          {{ role }}
        </button>
      </div>

      <!-- UNDO / REDO / CLEAR -->
      <div class="flex items-center gap-2">
        <button
          @click="stratStore.undo()"
          class="p-2 bg-slate-950 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
          title="Undo"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
        <button
          @click="stratStore.redo()"
          class="p-2 bg-slate-950 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer"
          title="Redo"
        >
          <RotateCw class="w-4 h-4" />
        </button>
        <button
          @click="stratStore.clearBoard()"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear Board</span>
        </button>
      </div>
    </div>

    <!-- TACTICS CANVAS -->
    <div class="relative w-full h-[620px] lg:h-[720px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
      <svg 
        ref="svgRef"
        viewBox="0 0 1000 1000"
        class="w-full h-full max-w-[960px] max-h-[960px] cursor-crosshair select-none"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
      >
        <!-- BASE RADAR -->
        <VectorMapBlueprint :map-info="mapStore.currentMap" :show-callouts="true" />

        <!-- DRAWN ELEMENTS -->
        <g class="tactics-elements-layer">
          <g v-for="el in stratStore.boardElements" :key="el.id">
            <!-- ARROW -->
            <template v-if="el.type === 'arrow' && el.points.length === 2">
              <defs>
                <marker 
                  :id="`arrowhead-${el.id}`" 
                  markerWidth="8" 
                  markerHeight="8" 
                  refX="6" 
                  refY="4" 
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" :fill="el.color" />
                </marker>
              </defs>
              <line 
                :x1="el.points[0].x * 10" 
                :y1="el.points[0].y * 10" 
                :x2="el.points[1].x * 10" 
                :y2="el.points[1].y * 10" 
                :stroke="el.color" 
                stroke-width="3.5" 
                :marker-end="`url(#arrowhead-${el.id})`"
              />
            </template>

            <!-- LINE -->
            <template v-else-if="el.type === 'line' && el.points.length === 2">
              <line 
                :x1="el.points[0].x * 10" 
                :y1="el.points[0].y * 10" 
                :x2="el.points[1].x * 10" 
                :y2="el.points[1].y * 10" 
                :stroke="el.color" 
                stroke-width="2.5" 
                stroke-dasharray="4 4"
              />
            </template>

            <!-- PLAYER ICON -->
            <template v-else-if="el.type === 'player_icon' && el.points.length >= 1">
              <g :transform="`translate(${el.points[0].x * 10}, ${el.points[0].y * 10})`">
                <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#de9b35" stroke-width="2" />
                <text x="0" y="4" font-size="9" font-weight="900" text-anchor="middle" fill="#de9b35" font-family="monospace">
                  {{ el.playerRole || 'P' }}
                </text>
              </g>
            </template>

            <!-- SMOKE CLOUD -->
            <template v-else-if="el.type === 'smoke_cloud' && el.points.length >= 1">
              <g :transform="`translate(${el.points[0].x * 10}, ${el.points[0].y * 10})`">
                <circle cx="0" cy="0" :r="el.radius || 28" fill="#94a3b8" fill-opacity="0.35" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4" />
                <text x="0" y="4" font-size="10" font-weight="bold" fill="#f1f5f9" text-anchor="middle">SMOKE</text>
              </g>
            </template>

            <!-- FLASH BURST -->
            <template v-else-if="el.type === 'flash_burst' && el.points.length >= 1">
              <g :transform="`translate(${el.points[0].x * 10}, ${el.points[0].y * 10})`">
                <circle cx="0" cy="0" :r="el.radius || 20" fill="#eab308" fill-opacity="0.4" stroke="#eab308" stroke-width="2" />
                <text x="0" y="4" font-size="10" font-weight="bold" fill="#fef08a" text-anchor="middle">FLASH</text>
              </g>
            </template>

            <!-- MOLOTOV FIRE -->
            <template v-else-if="el.type === 'molotov_fire' && el.points.length >= 1">
              <g :transform="`translate(${el.points[0].x * 10}, ${el.points[0].y * 10})`">
                <circle cx="0" cy="0" :r="el.radius || 25" fill="#ef4444" fill-opacity="0.35" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 3" />
                <text x="0" y="4" font-size="10" font-weight="bold" fill="#fee2e2" text-anchor="middle">FIRE</text>
              </g>
            </template>
          </g>

          <!-- CURRENT IN-PROGRESS DRAWING LINE -->
          <line 
            v-if="isDrawing && currentPoints.length === 2"
            :x1="currentPoints[0].x * 10" 
            :y1="currentPoints[0].y * 10" 
            :x2="currentPoints[1].x * 10" 
            :y2="currentPoints[1].y * 10" 
            stroke="#de9b35" 
            stroke-width="3" 
            stroke-dasharray="4 4"
          />
        </g>
      </svg>
    </div>
  </div>
</template>
