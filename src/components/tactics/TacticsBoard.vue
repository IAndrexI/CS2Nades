<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useStratStore } from '../../stores/stratStore'
import { useGameRoomStore } from '../../stores/gameRoomStore'
import { useAuthStore } from '../../stores/authStore'
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
  Sparkles
} from 'lucide-vue-next'

const mapStore = useMapStore()
const stratStore = useStratStore()
const gameRoomStore = useGameRoomStore()
const authStore = useAuthStore()

const svgRef = ref<SVGSVGElement | null>(null)
const isDrawing = ref(false)
const currentStroke = ref<{ x: number; y: number }[]>([])
const selectedElementId = ref<string | null>(null)

// Room Link Sharing
const roomCodeInput = ref('')
const isCopied = ref(false)

// Custom Text placement
const isTextInputModalOpen = ref(false)
const pendingTextCoords = ref<{ x: number; y: number }>({ x: 50, y: 50 })
const customTextInput = ref('')
const customFontSize = ref(13)

// Active Player Pin Config
const playerTeam = ref<'t' | 'ct'>('t')
const playerLabel = ref('1')
const playerRoleText = ref('Entry')

// Stroke Width
const activeStrokeWidth = ref(4)

const tools = [
  { id: 'select', label: 'Select', icon: Move },
  { id: 'pen', label: 'Freehand Pen', icon: PenTool },
  { id: 'arrow', label: 'Arrow Path', icon: ArrowUpRight },
  { id: 'line', label: 'Sightline / Line', icon: Minus },
  { id: 'vision_cone', label: 'Vision FOV', icon: Eye },
  { id: 'text', label: 'Text Note', icon: Type },
  { id: 'smoke', label: 'Smoke Bloom', icon: Cloud },
  { id: 'flash', label: 'Flash Burst', icon: Zap },
  { id: 'molotov', label: 'Molotov Fire', icon: Flame },
  { id: 'he_blast', label: 'HE Grenade', icon: Crosshair },
  { id: 'c4_bomb', label: 'C4 Bomb', icon: Crosshair },
  { id: 'plant_a', label: 'Plant A', icon: Crosshair },
  { id: 'plant_b', label: 'Plant B', icon: Crosshair },
  { id: 'player_t', label: 'T Player', icon: User },
  { id: 'player_ct', label: 'CT Player', icon: User },
  { id: 'eraser', label: 'Eraser', icon: Eraser }
]

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

const playerRolesList = ['Entry', 'IGL', 'Support', 'AWP', 'Lurker', 'Anchor', 'Rotator']

onMounted(() => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const roomParam = urlParams.get('room')
    if (roomParam) {
      roomCodeInput.value = roomParam.toUpperCase()
      joinTacticalRoom(roomParam.toUpperCase())
    } else if (!gameRoomStore.currentRoomCode) {
      roomCodeInput.value = `TACTIC-${Math.floor(1000 + Math.random() * 9000)}`
    } else {
      roomCodeInput.value = gameRoomStore.currentRoomCode
    }
  }
})

function joinTacticalRoom(codeToJoin?: string) {
  const code = (codeToJoin || roomCodeInput.value || 'TACTIC-SQUAD').trim().toUpperCase()
  const user = authStore.currentUser || {
    id: `guest-${Date.now()}`,
    username: `Player_${Math.floor(1000 + Math.random() * 9000)}`,
    inGameRole: 'Entry Fragger',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`
  }
  gameRoomStore.joinRoom(code, user as any)
}

function handleCopyRoomLink() {
  const room = gameRoomStore.currentRoomCode || roomCodeInput.value || 'TACTIC-SQUAD'
  const url = `${window.location.origin}/tactics?room=${room}`
  navigator.clipboard.writeText(url)
  isCopied.value = true
  setTimeout(() => { isCopied.value = false }, 2500)
}

function getMapCoords(e: MouseEvent): { x: number; y: number } {
  if (!svgRef.value) return { x: 0, y: 0 }
  const rect = svgRef.value.getBoundingClientRect()
  const x = Math.round((((e.clientX - rect.left) / rect.width) * 100) * 10) / 10
  const y = Math.round((((e.clientY - rect.top) / rect.height) * 100) * 10) / 10
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
}

function handleMouseDown(e: MouseEvent) {
  const tool = stratStore.activeTool
  if (tool === 'select' || tool === 'eraser') return

  const coords = getMapCoords(e)

  if (tool === 'text') {
    pendingTextCoords.value = coords
    customTextInput.value = ''
    isTextInputModalOpen.value = true
    return
  }

  if (tool === 'smoke') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'smoke_cloud',
      color: '#94a3b8',
      points: [coords],
      radius: 28
    })
    return
  }

  if (tool === 'flash') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'flash_burst',
      color: '#eab308',
      points: [coords],
      radius: 18
    })
    return
  }

  if (tool === 'molotov') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'molotov_fire',
      color: '#ef4444',
      points: [coords],
      radius: 24
    })
    return
  }

  if (tool === 'he_blast') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'he_blast',
      color: '#22c55e',
      points: [coords],
      radius: 20
    })
    return
  }

  if (tool === 'c4_bomb') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'c4_bomb',
      color: '#f97316',
      points: [coords],
      radius: 16
    })
    return
  }

  if (tool === 'plant_a' || tool === 'plant_b') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: tool as any,
      color: stratStore.activeColor,
      points: [coords],
      text: tool === 'plant_a' ? 'A' : 'B',
      radius: 18
    })
    return
  }

  if (tool === 'player_t' || tool === 'player_ct') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: tool as any,
      color: tool === 'player_t' ? '#f97316' : '#0ea5e9',
      points: [coords],
      playerRole: playerRoleText.value,
      playerNum: playerLabel.value,
      radius: 16
    })
    return
  }

  // DRAWING TOOLS
  isDrawing.value = true
  currentStroke.value = [coords]
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value) return
  const coords = getMapCoords(e)
  const tool = stratStore.activeTool

  if (tool === 'pen') {
    currentStroke.value.push(coords)
  } else if (tool === 'arrow' || tool === 'line' || tool === 'vision_cone') {
    if (currentStroke.value.length === 1) {
      currentStroke.value.push(coords)
    } else {
      currentStroke.value[1] = coords
    }
  }
}

function handleMouseUp() {
  if (!isDrawing.value) return
  isDrawing.value = false

  const tool = stratStore.activeTool
  if (currentStroke.value.length >= 2) {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: (tool === 'pen' ? 'pen' : tool === 'arrow' ? 'arrow' : tool === 'vision_cone' ? 'vision_cone' : 'line') as TacticsElementType,
      color: stratStore.activeColor,
      strokeWidth: activeStrokeWidth.value,
      points: [...currentStroke.value]
    })
  }
  currentStroke.value = []
}

function addElement(element: TacticsElement) {
  stratStore.addBoardElement(element)
  if (gameRoomStore.currentRoomCode) {
    gameRoomStore.sendStroke({
      id: element.id,
      tool: 'pen',
      color: element.color,
      width: element.strokeWidth || 4,
      points: element.points.map(p => ({ x: p.x * 10, y: p.y * 10 }))
    })
  }
}

function handleElementClick(e: MouseEvent, el: TacticsElement) {
  e.stopPropagation()
  if (stratStore.activeTool === 'eraser') {
    stratStore.removeBoardElement(el.id)
  } else if (stratStore.activeTool === 'select') {
    selectedElementId.value = selectedElementId.value === el.id ? null : el.id
  }
}

function handleConfirmText() {
  if (customTextInput.value.trim()) {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'text',
      color: stratStore.activeColor,
      points: [pendingTextCoords.value],
      text: customTextInput.value.trim(),
      radius: customFontSize.value
    })
  }
  isTextInputModalOpen.value = false
  customTextInput.value = ''
}

function deleteSelectedElement() {
  if (selectedElementId.value) {
    stratStore.removeBoardElement(selectedElementId.value)
    selectedElementId.value = null
  }
}

function getSvgPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return ''
  return points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x * 10} ${pt.y * 10}` : `${acc} L ${pt.x * 10} ${pt.y * 10}`
  }, '')
}

function getVisionConePath(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const x1 = p1.x * 10, y1 = p1.y * 10
  const x2 = p2.x * 10, y2 = p2.y * 10
  const dx = x2 - x1, dy = y2 - y1
  const angle = Math.atan2(dy, dx)
  const length = Math.sqrt(dx * dx + dy * dy)
  const spread = Math.PI / 6

  const leftX = x1 + Math.cos(angle - spread) * length
  const leftY = y1 + Math.sin(angle - spread) * length
  const rightX = x1 + Math.cos(angle + spread) * length
  const rightY = y1 + Math.sin(angle + spread) * length

  return `M ${x1} ${y1} L ${leftX} ${leftY} A ${length} ${length} 0 0 1 ${rightX} ${rightY} Z`
}
</script>

<template>
  <div class="tactics-board-container flex flex-col gap-4">
    <!-- TOP BAR: ROOM STATUS & LINK SHARING -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <!-- ROOM BADGE & CODE -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
          <Radio class="w-4 h-4 text-emerald-400 animate-pulse" />
          <span class="text-xs text-slate-400 font-bold uppercase">Room:</span>
          <input
            v-model="roomCodeInput"
            @keyup.enter="joinTacticalRoom()"
            placeholder="e.g. SQUAD-ALPHA"
            class="bg-transparent border-none text-white font-mono font-black text-xs uppercase tracking-wider focus:outline-none w-32"
          />
          <button
            @click="joinTacticalRoom()"
            class="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded cursor-pointer"
          >
            Connect
          </button>
        </div>

        <!-- 1-CLICK COPY LINK -->
        <button
          @click="handleCopyRoomLink"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          title="Share room link with teammates"
        >
          <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
          <Share2 v-else class="w-3.5 h-3.5 text-amber-400" />
          <span>{{ isCopied ? 'Link Copied!' : 'Share Room Link' }}</span>
        </button>
      </div>

      <!-- MAP SELECTOR -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 font-bold">Map:</span>
        <select
          :value="mapStore.currentMapId"
          @change="mapStore.setMap(($event.target as HTMLSelectElement).value)"
          class="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold uppercase font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
            {{ map.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- MAIN TACTICAL TOOLBAR -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <!-- DRAWING & STAMP TOOLS -->
      <div class="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
        <button
          v-for="tool in tools"
          :key="tool.id"
          @click="stratStore.activeTool = tool.id as any"
          :title="tool.label"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap',
            stratStore.activeTool === tool.id
              ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          ]"
        >
          <component :is="tool.icon" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ tool.label }}</span>
        </button>
      </div>

      <!-- COLOR PALETTE -->
      <div class="flex items-center gap-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
        <span class="text-[10px] text-slate-400 font-bold uppercase px-1 hidden md:inline">Color:</span>
        <div class="flex items-center gap-1">
          <button
            v-for="color in colorPalette"
            :key="color.hex"
            @click="stratStore.activeColor = color.hex"
            :title="color.name"
            :class="[
              'w-5 h-5 rounded-full border transition-all cursor-pointer',
              stratStore.activeColor === color.hex ? 'scale-125 border-white shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
            ]"
            :style="{ backgroundColor: color.hex }"
          />
        </div>
      </div>

      <!-- BRUSH WIDTH -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
        <button
          @click="activeStrokeWidth = 2"
          :class="['px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer', activeStrokeWidth === 2 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white']"
        >
          Fine
        </button>
        <button
          @click="activeStrokeWidth = 4"
          :class="['px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer', activeStrokeWidth === 4 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white']"
        >
          Medium
        </button>
        <button
          @click="activeStrokeWidth = 7"
          :class="['px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer', activeStrokeWidth === 7 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white']"
        >
          Thick
        </button>
      </div>

      <!-- ACTIONS: UNDO, REDO, CLEAR, DELETE SELECTED -->
      <div class="flex items-center gap-1.5">
        <button
          @click="stratStore.undo()"
          title="Undo"
          class="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
        <button
          @click="stratStore.redo()"
          title="Redo"
          class="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
        >
          <RotateCw class="w-4 h-4" />
        </button>
        <button
          v-if="selectedElementId"
          @click="deleteSelectedElement"
          title="Delete Selected"
          class="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs transition-colors cursor-pointer"
        >
          <Trash2 class="w-4 h-4" />
        </button>
        <button
          @click="stratStore.clearBoard()"
          title="Clear Board"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- PLAYER PIN CONFIG DRAWER -->
    <div 
      v-if="stratStore.activeTool === 'player_t' || stratStore.activeTool === 'player_ct'"
      class="flex flex-wrap items-center gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs animate-fade-in"
    >
      <span class="font-bold text-slate-300">Player Pin Label:</span>
      <div class="flex items-center gap-1">
        <button
          v-for="n in ['1', '2', '3', '4', '5']"
          :key="n"
          @click="playerLabel = n"
          :class="[
            'w-6 h-6 rounded-lg text-xs font-black font-mono transition-colors cursor-pointer',
            playerLabel === n ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
          ]"
        >
          {{ n }}
        </button>
      </div>

      <span class="font-bold text-slate-300 ml-2">Assigned Role:</span>
      <div class="flex items-center gap-1 overflow-x-auto">
        <button
          v-for="r in playerRolesList"
          :key="r"
          @click="playerRoleText = r"
          :class="[
            'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer',
            playerRoleText === r ? 'bg-slate-800 text-amber-400 border border-slate-700' : 'text-slate-400 hover:text-white'
          ]"
        >
          {{ r }}
        </button>
      </div>
    </div>

    <!-- RADAR CANVAS AREA -->
    <div class="relative w-full aspect-square max-w-4xl mx-auto bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none">
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

          <!-- VISION CONE GRADIENT -->
          <radialGradient id="visionGradient" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.05" />
          </radialGradient>
        </defs>

        <!-- LAYER 1: RADAR BLUEPRINT -->
        <VectorMapBlueprint
          :map-info="mapStore.currentMap"
          :show-callouts="true"
        />

        <!-- LAYER 2: PLACED TACTICAL ELEMENTS -->
        <g class="tactics-elements-layer">
          <g
            v-for="el in stratStore.boardElements"
            :key="el.id"
            @click="(e) => handleElementClick(e, el)"
            :class="{ 'opacity-80': selectedElementId === el.id, 'cursor-pointer': stratStore.activeTool === 'select' || stratStore.activeTool === 'eraser' }"
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
                marker-end="url(#arrowhead-active)"
              />
            </g>

            <!-- 4. VISION FOV CONE -->
            <path
              v-else-if="el.type === 'vision_cone' && el.points.length >= 2"
              :d="getVisionConePath(el.points[0], el.points[1])"
              fill="url(#visionGradient)"
              :stroke="el.color"
              stroke-width="1.5"
              stroke-dasharray="4 4"
            />

            <!-- 5. SMOKE BLOOM -->
            <g v-else-if="el.type === 'smoke_cloud'">
              <circle
                :cx="el.points[0].x * 10"
                :cy="el.points[0].y * 10"
                :r="(el.radius || 28) * 1.8"
                fill="url(#smokeGradient)"
                stroke="#94a3b8"
                stroke-width="2"
                stroke-dasharray="6 4"
                class="animate-pulse"
              />
              <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="12" fill="#0f172a" stroke="#94a3b8" stroke-width="2" />
              <text :x="el.points[0].x * 10" :y="el.points[0].y * 10 + 4" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle">S</text>
            </g>

            <!-- 6. FLASH BURST -->
            <g v-else-if="el.type === 'flash_burst'">
              <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" :r="(el.radius || 18) * 1.5" fill="#eab308" fill-opacity="0.3" stroke="#eab308" stroke-width="2" />
              <polygon
                :points="`${el.points[0].x * 10},${el.points[0].y * 10 - 12} ${el.points[0].x * 10 + 4},${el.points[0].y * 10 - 4} ${el.points[0].x * 10 + 12},${el.points[0].y * 10} ${el.points[0].x * 10 + 4},${el.points[0].y * 10 + 4} ${el.points[0].x * 10},${el.points[0].y * 10 + 12} ${el.points[0].x * 10 - 4},${el.points[0].y * 10 + 4} ${el.points[0].x * 10 - 12},${el.points[0].y * 10} ${el.points[0].x * 10 - 4},${el.points[0].y * 10 - 4}`"
                fill="#fde047"
                stroke="#0f172a"
                stroke-width="1.5"
              />
            </g>

            <!-- 7. MOLOTOV FIRE -->
            <g v-else-if="el.type === 'molotov_fire'">
              <circle
                :cx="el.points[0].x * 10"
                :cy="el.points[0].y * 10"
                :r="(el.radius || 24) * 1.7"
                fill="url(#fireGradient)"
                stroke="#f97316"
                stroke-width="2"
              />
              <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="12" fill="#0f172a" stroke="#f97316" stroke-width="2" />
              <text :x="el.points[0].x * 10" :y="el.points[0].y * 10 + 4" fill="#fb923c" font-size="10" font-weight="black" text-anchor="middle">M</text>
            </g>

            <!-- 8. HE GRENADE BLAST -->
            <g v-else-if="el.type === 'he_blast'">
              <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" :r="(el.radius || 20) * 1.5" fill="#22c55e" fill-opacity="0.25" stroke="#22c55e" stroke-width="2" stroke-dasharray="4 3" />
              <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="10" fill="#0f172a" stroke="#22c55e" stroke-width="2" />
              <text :x="el.points[0].x * 10" :y="el.points[0].y * 10 + 3.5" fill="#4ade80" font-size="9" font-weight="black" text-anchor="middle">HE</text>
            </g>

            <!-- 9. C4 BOMB / PLANT SPOT -->
            <g v-else-if="el.type === 'c4_bomb' || el.type === 'plant_a' || el.type === 'plant_b'">
              <rect
                :x="el.points[0].x * 10 - 14"
                :y="el.points[0].y * 10 - 14"
                width="28"
                height="28"
                rx="6"
                :fill="el.type === 'c4_bomb' ? '#b91c1c' : el.color"
                stroke="#ffffff"
                stroke-width="2"
                class="shadow-lg"
              />
              <text
                :x="el.points[0].x * 10"
                :y="el.points[0].y * 10 + 5"
                fill="#ffffff"
                font-size="12"
                font-weight="black"
                font-family="monospace"
                text-anchor="middle"
              >
                {{ el.text || 'C4' }}
              </text>
            </g>

            <!-- 10. PLAYER PIN -->
            <g v-else-if="el.type === 'player_t' || el.type === 'player_ct' || el.type === 'player_icon'">
              <circle
                :cx="el.points[0].x * 10"
                :cy="el.points[0].y * 10"
                r="16"
                :fill="el.color"
                stroke="#0f172a"
                stroke-width="2.5"
                class="shadow-xl"
              />
              <text
                :x="el.points[0].x * 10"
                :y="el.points[0].y * 10 + 5"
                fill="#0f172a"
                font-size="12"
                font-weight="black"
                font-family="sans-serif"
                text-anchor="middle"
              >
                {{ el.playerNum || '1' }}
              </text>
              <text
                v-if="el.playerRole"
                :x="el.points[0].x * 10"
                :y="el.points[0].y * 10 + 26"
                fill="#ffffff"
                font-size="10"
                font-weight="bold"
                text-anchor="middle"
                stroke="#0b0e14"
                stroke-width="3"
                paint-order="stroke fill"
              >
                {{ el.playerRole }}
              </text>
            </g>

            <!-- 11. TEXT ANNOTATION -->
            <g v-else-if="el.type === 'text'">
              <rect
                :x="el.points[0].x * 10 - 4"
                :y="el.points[0].y * 10 - 14"
                :width="Math.max(40, (el.text?.length || 5) * 8 + 12)"
                height="22"
                rx="4"
                fill="#0f172a"
                fill-opacity="0.85"
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

          <!-- ACTIVE CURRENT DRAWING STROKE -->
          <path
            v-if="isDrawing && currentStroke.length > 1 && stratStore.activeTool === 'pen'"
            :d="getSvgPath(currentStroke)"
            fill="none"
            :stroke="stratStore.activeColor"
            :stroke-width="activeStrokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <line
            v-else-if="isDrawing && currentStroke.length === 2 && (stratStore.activeTool === 'arrow' || stratStore.activeTool === 'line')"
            :x1="currentStroke[0].x * 10"
            :y1="currentStroke[0].y * 10"
            :x2="currentStroke[1].x * 10"
            :y2="currentStroke[1].y * 10"
            :stroke="stratStore.activeColor"
            :stroke-width="activeStrokeWidth"
            stroke-linecap="round"
            :marker-end="stratStore.activeTool === 'arrow' ? 'url(#arrowhead-active)' : undefined"
          />

          <path
            v-else-if="isDrawing && currentStroke.length === 2 && stratStore.activeTool === 'vision_cone'"
            :d="getVisionConePath(currentStroke[0], currentStroke[1])"
            fill="url(#visionGradient)"
            :stroke="stratStore.activeColor"
            stroke-width="1.5"
            stroke-dasharray="4 4"
          />
        </g>
      </svg>
    </div>

    <!-- TEXT CALLOUT INPUT MODAL -->
    <div
      v-if="isTextInputModalOpen"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <h3 class="text-sm font-black uppercase text-white">Add Tactical Callout Note</h3>
        <input
          v-model="customTextInput"
          @keyup.enter="handleConfirmText"
          type="text"
          placeholder="e.g. Flash over roof / Hold cross"
          class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          autofocus
        />
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">Font Size:</span>
          <div class="flex items-center gap-1">
            <button
              v-for="s in [10, 12, 14, 16]"
              :key="s"
              @click="customFontSize = s"
              :class="['px-2 py-0.5 rounded text-[10px] font-bold', customFontSize === s ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400']"
            >
              {{ s }}px
            </button>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            @click="isTextInputModalOpen = false"
            class="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="handleConfirmText"
            class="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer shadow"
          >
            Place Note
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
