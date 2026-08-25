<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useStratStore } from '../../stores/stratStore'
import { useGameRoomStore } from '../../stores/gameRoomStore'
import { useAuthStore } from '../../stores/authStore'
import VectorMapBlueprint from '../map/VectorMapBlueprint.vue'
import NadeIcon from '../common/NadeIcon.vue'
import type { TacticsElement, TacticsElementType } from '../../types'
import axios from 'axios'
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
  Bomb
} from 'lucide-vue-next'

const mapStore = useMapStore()
const stratStore = useStratStore()
const gameRoomStore = useGameRoomStore()
const authStore = useAuthStore()

const svgRef = ref<SVGSVGElement | null>(null)
const isDrawing = ref(false)
const currentStroke = ref<{ x: number; y: number }[]>([])
const selectedElementId = ref<string | null>(null)

// Room Link Sharing & Cloudflare Tunnel Domain Discovery
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
const newPinSymbol = ref('⭐')
const newPinColor = ref('#de9b35')

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

// Separate Join Room Modal
const isJoinRoomModalOpen = ref(false)
const newRoomInput = ref('')
const copySuccessToast = ref('')

const allToolsCatalogue = [
  { id: 'select', label: 'Select / Move', icon: Move, category: 'General' },
  { id: 'pen', label: 'Freehand Pen', icon: PenTool, category: 'Drawing' },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, category: 'Drawing' },
  { id: 'line', label: 'Sightline / Line', icon: Minus, category: 'Drawing' },
  { id: 'vision_cone', label: 'Vision FOV', icon: Eye, category: 'Drawing' },
  { id: 'text', label: 'Text Callout', icon: Type, category: 'General' },
  { id: 'smoke', label: 'Smoke Bloom', icon: Cloud, category: 'Utility' },
  { id: 'flash', label: 'Flash Burst', icon: Zap, category: 'Utility' },
  { id: 'molotov', label: 'Molotov Fire', icon: Flame, category: 'Utility' },
  { id: 'he_blast', label: 'HE Grenade', icon: Crosshair, category: 'Utility' },
  { id: 'c4_bomb', label: 'C4 Bomb', icon: Bomb, category: 'Objectives' },
  { id: 'plant_a', label: 'Plant A', icon: Crosshair, category: 'Objectives' },
  { id: 'plant_b', label: 'Plant B', icon: Crosshair, category: 'Objectives' },
  { id: 'player_t', label: 'T Player Pin', icon: User, category: 'Players' },
  { id: 'player_ct', label: 'CT Player Pin', icon: User, category: 'Players' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, category: 'General' }
]

const enabledToolIds = ref<string[]>([
  'select', 'pen', 'arrow', 'line', 'vision_cone', 'text',
  'smoke', 'flash', 'molotov', 'he_blast', 'c4_bomb',
  'plant_a', 'plant_b', 'player_t', 'player_ct', 'eraser'
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

const playerRolesList = ['Entry', 'IGL', 'Support', 'AWP', 'Lurker', 'Anchor', 'Rotator']

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
      roomCodeInput.value = `TACTIC-${Math.floor(1000 + Math.random() * 9000)}`
      joinTacticalRoom(roomCodeInput.value)
    } else {
      roomCodeInput.value = gameRoomStore.currentRoomCode
    }
  }

  // Socket element synchronization
  const socket = (gameRoomStore as any).socket?.value || (gameRoomStore as any).socket
  if (socket) {
    socket.on('room:element_added', (el: TacticsElement) => {
      if (!stratStore.boardElements.some(e => e.id === el.id)) {
        stratStore.boardElements.push(el)
      }
    })
    socket.on('room:element_removed', (elId: string) => {
      stratStore.boardElements = stratStore.boardElements.filter(e => e.id !== elId)
    })
    socket.on('room:elements_synced', (els: TacticsElement[]) => {
      stratStore.setBoardElements(els)
    })
  }
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
    symbol: newPinSymbol.value.trim() || '★',
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
  const code = (codeToJoin || roomCodeInput.value || 'TACTIC-SQUAD').trim().toUpperCase()
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
  const room = gameRoomStore.currentRoomCode || roomCodeInput.value || 'TACTIC-SQUAD'
  copyToClipboard(room)
  copySuccessToast.value = 'Room ID Copied!'
  setTimeout(() => { copySuccessToast.value = '' }, 2500)
}

function handleCopyRoomLink() {
  const room = gameRoomStore.currentRoomCode || roomCodeInput.value || 'TACTIC-SQUAD'
  const baseDomain = serverPublicUrl.value || window.location.origin
  const url = `${baseDomain}/tactics?room=${room}`
  copyToClipboard(url)
  isCopied.value = true
  copySuccessToast.value = 'Room Link Copied to Clipboard!'
  setTimeout(() => { isCopied.value = false; copySuccessToast.value = '' }, 2500)
}

function placeCustomPin(pin: CustomPinDefinition) {
  stratStore.addBoardElement({
    id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type: 'text',
    color: pin.color,
    points: [{ x: 50, y: 50 }],
    text: `${pin.symbol} ${pin.label}`,
    radius: 13
  })
}

function getMapCoords(e: MouseEvent): { x: number; y: number } {
  if (!svgRef.value) return { x: 0, y: 0 }
  const rect = svgRef.value.getBoundingClientRect()
  const x = Math.round((((e.clientX - rect.left) / rect.width) * 100) * 10) / 10
  const y = Math.round((((e.clientY - rect.top) / rect.height) * 100) * 10) / 10
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
}

function handleMouseDown(e: MouseEvent) {
  if (!gameRoomStore.isHost && !gameRoomStore.allowGuestsToDraw) {
    return
  }
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
    let finalPoints = [...currentStroke.value]
    // Tail-controlled mode: First click was the Head (target), dragging pulled the Tail.
    // We reverse so points[0] = Tail (origin), points[1] = Head (destination + arrowhead)
    if (tool === 'arrow' && arrowControlMode.value === 'tail_controls') {
      finalPoints = [currentStroke.value[1], currentStroke.value[0]]
    }

    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: (tool === 'pen' ? 'pen' : tool === 'arrow' ? 'arrow' : tool === 'vision_cone' ? 'vision_cone' : 'line') as TacticsElementType,
      color: stratStore.activeColor,
      strokeWidth: activeStrokeWidth.value,
      points: finalPoints
    })
  }
  currentStroke.value = []
}

function addElement(element: TacticsElement) {
  stratStore.addBoardElement(element)
  const socket = (gameRoomStore as any).socket?.value || (gameRoomStore as any).socket
  if (socket && socket.connected) {
    socket.emit('room:element_add', element)
  }
}

function handleElementClick(e: MouseEvent, el: TacticsElement) {
  e.stopPropagation()
  if (stratStore.activeTool === 'eraser') {
    stratStore.removeBoardElement(el.id)
    const socket = (gameRoomStore as any).socket?.value || (gameRoomStore as any).socket
    if (socket && socket.connected) socket.emit('room:element_remove', el.id)
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
    const id = selectedElementId.value
    stratStore.removeBoardElement(id)
    const socket = (gameRoomStore as any).socket?.value || (gameRoomStore as any).socket
    if (socket && socket.connected) socket.emit('room:element_remove', id)
    selectedElementId.value = null
  }
}

function getSvgPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return ''
  return points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x * 10} ${pt.y * 10}` : `${acc} L ${pt.x * 10} ${pt.y * 10}`
  }, '')
}

function getArrowheadPolygon(p1: { x: number; y: number }, p2: { x: number; y: number }): string {
  const x1 = p1.x * 10, y1 = p1.y * 10
  const x2 = p2.x * 10, y2 = p2.y * 10
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 14
  const width = 8
  const tipX = x2, tipY = y2
  const leftX = tipX - len * Math.cos(angle) + width * Math.sin(angle)
  const leftY = tipY - len * Math.sin(angle) - width * Math.cos(angle)
  const rightX = tipX - len * Math.cos(angle) - width * Math.sin(angle)
  const rightY = tipY - len * Math.sin(angle) + width * Math.cos(angle)
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`
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
    <!-- TOP BAR: ROOM STATUS, 1-CLICK COPY ID, SHARE LINK & HOST PERMISSIONS -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <!-- ROOM BADGE & 1-CLICK COPY CODE -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          @click="handleCopyRoomCode"
          class="flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer group shadow-sm"
          title="Click to copy Room Code"
        >
          <Radio class="w-4 h-4 text-emerald-400 animate-pulse" />
          <span class="text-xs text-slate-400 font-bold uppercase">Room:</span>
          <span class="text-xs font-mono font-black text-amber-400 group-hover:text-amber-300">{{ gameRoomStore.currentRoomCode || roomCodeInput }}</span>
          <span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-bold">Copy ID</span>
        </button>

        <!-- 1-CLICK SHARE LINK -->
        <button
          @click="handleCopyRoomLink"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          title="Share direct room invite link"
        >
          <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
          <Share2 v-else class="w-3.5 h-3.5 text-amber-400" />
          <span>{{ isCopied ? 'Link Copied!' : 'Share Invite Link' }}</span>
        </button>

        <!-- SEPARATE JOIN ROOM BUTTON -->
        <button
          @click="isJoinRoomModalOpen = true"
          class="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <span>Join Another Room</span>
        </button>

        <!-- HOST LOCK / GUEST PERMISSION TOGGLE -->
        <div v-if="gameRoomStore.isHost" class="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <span class="font-bold text-slate-400">Guests Can Draw:</span>
          <button
            @click="gameRoomStore.setRoomLock(!gameRoomStore.allowGuestsToDraw)"
            :class="[
              'px-2 py-0.5 rounded text-[10px] font-black uppercase transition-colors cursor-pointer',
              gameRoomStore.allowGuestsToDraw ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
            ]"
          >
            {{ gameRoomStore.allowGuestsToDraw ? 'ON' : 'LOCKED' }}
          </button>
        </div>

        <span v-if="copySuccessToast" class="text-xs font-bold text-emerald-400 animate-fade-in">
          {{ copySuccessToast }}
        </span>
      </div>

      <!-- MAP SELECTOR & CUSTOMIZE TOOLBAR BUTTON -->
      <div class="flex items-center gap-2.5">
        <button
          @click="isCustomizeToolbarOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          title="Customize toolbar icons and add custom pins"
        >
          <Settings2 class="w-3.5 h-3.5" />
          <span>Customize Icons</span>
        </button>

        <span class="text-xs text-slate-400 font-bold hidden sm:inline">Map:</span>
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

    <!-- MAIN TACTICAL TOOLBAR (CUSTOMIZED BY USER) -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <!-- ENABLED DRAWING & STAMP TOOLS -->
      <div class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
        <button
          v-for="tool in visibleTools"
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

        <!-- CUSTOM PINS QUICK ACCESS -->
        <button
          v-for="pin in customPins"
          :key="pin.id"
          @click="placeCustomPin(pin)"
          :title="`Place custom pin: ${pin.label}`"
          class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-slate-300 hover:text-white"
        >
          <span>{{ pin.symbol }}</span>
          <span class="hidden md:inline">{{ pin.label }}</span>
        </button>
      </div>

      <!-- ARROW TAIL PIVOT TOGGLE (IF ARROW ACTIVE) -->
      <div 
        v-if="stratStore.activeTool === 'arrow'"
        class="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs"
      >
        <span class="text-[10px] text-slate-400 font-bold uppercase px-1">Arrow Pivot:</span>
        <button
          @click="arrowControlMode = 'tail_controls'"
          :class="['px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer', arrowControlMode === 'tail_controls' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white']"
          title="Drag tail to steer arrow direction (Target fixed at first click)"
        >
          Tail Controls
        </button>
        <button
          @click="arrowControlMode = 'head_controls'"
          :class="['px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer', arrowControlMode === 'head_controls' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white']"
          title="Standard drag towards head"
        >
          Head Controls
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

            <!-- 3. DIRECTIONAL ARROW (IMMUTABLE COLOR) -->
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

          <!-- ARROW PREVIEW (TAIL-GUIDED) -->
          <g v-else-if="isDrawing && currentStroke.length === 2 && stratStore.activeTool === 'arrow'">
            <line
              :x1="arrowControlMode === 'tail_controls' ? currentStroke[1].x * 10 : currentStroke[0].x * 10"
              :y1="arrowControlMode === 'tail_controls' ? currentStroke[1].y * 10 : currentStroke[0].y * 10"
              :x2="arrowControlMode === 'tail_controls' ? currentStroke[0].x * 10 : currentStroke[1].x * 10"
              :y2="arrowControlMode === 'tail_controls' ? currentStroke[0].y * 10 : currentStroke[1].y * 10"
              :stroke="stratStore.activeColor"
              :stroke-width="activeStrokeWidth"
              stroke-linecap="round"
            />
            <!-- Visual Tail Pivot Circle -->
            <circle
              :cx="arrowControlMode === 'tail_controls' ? currentStroke[1].x * 10 : currentStroke[0].x * 10"
              :cy="arrowControlMode === 'tail_controls' ? currentStroke[1].y * 10 : currentStroke[0].y * 10"
              r="4.5"
              :fill="stratStore.activeColor"
              stroke="#0f172a"
              stroke-width="1.5"
            />
            <polygon
              :points="getArrowheadPolygon(
                arrowControlMode === 'tail_controls' ? currentStroke[1] : currentStroke[0],
                arrowControlMode === 'tail_controls' ? currentStroke[0] : currentStroke[1]
              )"
              :fill="stratStore.activeColor"
            />
          </g>

          <line
            v-else-if="isDrawing && currentStroke.length === 2 && stratStore.activeTool === 'line'"
            :x1="currentStroke[0].x * 10"
            :y1="currentStroke[0].y * 10"
            :x2="currentStroke[1].x * 10"
            :y2="currentStroke[1].y * 10"
            :stroke="stratStore.activeColor"
            :stroke-width="activeStrokeWidth"
            stroke-linecap="round"
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

    <!-- MODAL 1: CUSTOMIZE TOOLBAR & ENABLED ICONS -->
    <div
      v-if="isCustomizeToolbarOpen"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:items-center animate-fade-in"
      @click.self="isCustomizeToolbarOpen = false"
    >
      <div class="my-auto w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        <!-- HEADER -->
        <div class="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <Settings2 class="w-5 h-5 text-amber-400" />
            <div>
              <h3 class="text-sm font-black uppercase text-white">Customize Tactics Room Toolbar</h3>
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

        <!-- BODY: TOOL TOGGLES -->
        <div class="p-6 overflow-y-auto flex flex-col gap-6 text-xs">
          <!-- TOOL CATEGORIES -->
          <div class="flex flex-col gap-3">
            <h4 class="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Enabled Toolbar Icons</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                v-for="tool in allToolsCatalogue"
                :key="tool.id"
                @click="toggleToolEnabled(tool.id)"
                :class="[
                  'flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left',
                  enabledToolIds.includes(tool.id)
                    ? 'bg-amber-500/15 border-amber-500/50 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                ]"
              >
                <div class="flex items-center gap-2">
                  <component :is="tool.icon" class="w-4 h-4 text-amber-400" />
                  <span>{{ tool.label }}</span>
                </div>
                <div
                  :class="[
                    'w-4 h-4 rounded-md border flex items-center justify-center text-[10px]',
                    enabledToolIds.includes(tool.id) ? 'bg-amber-500 border-amber-500 text-slate-950 font-black' : 'border-slate-700'
                  ]"
                >
                  <Check v-if="enabledToolIds.includes(tool.id)" class="w-3 h-3 stroke-[3]" />
                </div>
              </button>
            </div>
          </div>

          <!-- CREATE CUSTOM STAMPED PIN -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3">
            <h4 class="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Create Custom Tactical Pin</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                v-model="newPinLabel"
                type="text"
                placeholder="Pin Label (e.g. Danger, Sniper)"
                class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <input
                v-model="newPinSymbol"
                type="text"
                placeholder="Symbol (e.g. ⚠️, 🎯, 💀)"
                class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                @click="handleAddCustomPin"
                class="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow"
              >
                <Plus class="w-4 h-4" />
                <span>Add Pin</span>
              </button>
            </div>

            <!-- EXISTING CUSTOM PINS -->
            <div v-if="customPins.length > 0" class="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              <div
                v-for="pin in customPins"
                :key="pin.id"
                class="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl"
              >
                <span>{{ pin.symbol }}</span>
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

        <!-- FOOTER -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            @click="isCustomizeToolbarOpen = false"
            class="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
          >
            Save & Close
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
      <div class="my-auto w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
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

    <!-- MODAL 3: JOIN ROOM MODAL -->
    <div
      v-if="isJoinRoomModalOpen"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:items-center animate-fade-in"
      @click.self="isJoinRoomModalOpen = false"
    >
      <div class="my-auto w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
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
          class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
          autofocus
        />

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            @click="isJoinRoomModalOpen = false"
            class="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="joinTacticalRoom(newRoomInput)"
            :disabled="!newRoomInput.trim()"
            class="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-lg"
          >
            Connect Room
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
