<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useStratStore } from '../../stores/stratStore'
import { useGameRoomStore } from '../../stores/gameRoomStore'
import { useAuthStore } from '../../stores/authStore'
import VectorMapBlueprint from '../map/VectorMapBlueprint.vue'
import NadeIcon from '../common/NadeIcon.vue'
import type { TacticsElement, TacticsElementType, DirectMessage } from '../../types'
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
  Gamepad2,
  RefreshCw,
  Save,
  AlertTriangle,
  MessageSquare,
  Send,
  Lock,
  ChevronDown
} from 'lucide-vue-next'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import CS2ServerConnectModal from '../lineups/CS2ServerConnectModal.vue'

const mapStore = useMapStore()
const stratStore = useStratStore()
const gameRoomStore = useGameRoomStore()
const authStore = useAuthStore()
const { confirmAction } = useConfirmDialog()

const isTacticsMapDropdownOpen = ref(false)

function handleTacticsMapGlobalClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (isTacticsMapDropdownOpen.value && !target.closest('.tactics-map-dropdown-container')) {
    isTacticsMapDropdownOpen.value = false
  }
}

// RIGHT TACTICAL SIDEBAR (ROOM CHAT / PRIVATE CHAT / PLAYER LIST)
const isRightSidebarVisible = ref(true)
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
    if (decrypted.length !== privateMessages.value.length || 
        (decrypted.length > 0 && decrypted[decrypted.length - 1].id !== privateMessages.value[privateMessages.value.length - 1]?.id)) {
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

const isCs2ServerModalOpen = ref(false)
const isMapSwitchWarnModalOpen = ref(false)
const pendingTargetMapId = ref<string | null>(null)
const tempSaveToast = ref('')

function handleTempSaveCurrentBoard() {
  stratStore.tempSaveBoard(mapStore.currentMapId)
  tempSaveToast.value = `Board temp-saved for ${mapStore.currentMap?.name || mapStore.currentMapId}!`
  setTimeout(() => { tempSaveToast.value = '' }, 2500)
}

function handleRestoreTempSavedBoard() {
  stratStore.restoreTempBoard(mapStore.currentMapId)
  tempSaveToast.value = `Restored saved board!`
  setTimeout(() => { tempSaveToast.value = '' }, 2500)
}

function handleMapSelect(targetMapId: string) {
  if (!targetMapId || targetMapId === mapStore.currentMapId) return

  if (stratStore.boardElements.length > 0) {
    pendingTargetMapId.value = targetMapId
    isMapSwitchWarnModalOpen.value = true
    return
  }

  executeMapSwitch(targetMapId, false)
}

function executeMapSwitch(targetMapId: string, shouldTempSaveCurrent: boolean) {
  if (shouldTempSaveCurrent) {
    stratStore.tempSaveBoard(mapStore.currentMapId)
  }
  stratStore.clearBoard()
  mapStore.setMap(targetMapId)
  gameRoomStore.switchMap(targetMapId, [])
  isMapSwitchWarnModalOpen.value = false
  pendingTargetMapId.value = null
}
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

// Element Drag / Move State
const isDraggingElement = ref(false)
const draggedElementId = ref<string | null>(null)
const dragOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })

// Stroke Width
const activeStrokeWidth = ref(4)

// Separate Join Room Modal
const isJoinRoomModalOpen = ref(false)
const isMembersModalOpen = ref(false)
const newRoomInput = ref('')
const copySuccessToast = ref('')
const isClearConfirmModalOpen = ref(false)
const isSyncingBoard = ref(false)

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

function handleForceSyncBoard() {
  isSyncingBoard.value = true
  // 1. Reload local elements for current map
  stratStore.loadMapElements(mapStore.currentMapId)
  
  // 2. Request authoritative server sync
  const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  if (socket && socket.connected) {
    socket.emit('room:request_sync', { mapId: mapStore.currentMapId })
    if (gameRoomStore.isHost) {
      socket.emit('room:elements_sync', { elements: stratStore.boardElements, mapId: mapStore.currentMapId })
    }
  }

  setTimeout(() => {
    isSyncingBoard.value = false
    copySuccessToast.value = '✓ Visuals Synced'
    setTimeout(() => {
      copySuccessToast.value = ''
    }, 2500)
  }, 600)
}

const allToolsCatalogue = [
  { id: 'select', label: 'Select / Move', icon: Move, category: 'General' },
  { id: 'pen', label: 'Freehand Pen', icon: PenTool, category: 'Drawing' },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, category: 'Drawing' },
  { id: 'line', label: 'Sightline / Line', icon: Minus, category: 'Drawing' },
  { id: 'text', label: 'Text Callout', icon: Type, category: 'General' },
  { id: 'smoke', label: 'Smoke Bloom', icon: Cloud, category: 'Utility' },
  { id: 'flash', label: 'Flash Burst', icon: Zap, category: 'Utility' },
  { id: 'molotov', label: 'Molotov Fire', icon: Flame, category: 'Utility' },
  { id: 'he_blast', label: 'HE Grenade', icon: Crosshair, category: 'Utility' },
  { id: 'c4_bomb', label: 'C4 Bomb', icon: Bomb, category: 'Objectives' },
  { id: 'player_t', label: 'T Player Pin', icon: User, category: 'Players' },
  { id: 'player_ct', label: 'CT Player Pin', icon: User, category: 'Players' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, category: 'General' }
]

const enabledToolIds = ref<string[]>([
  'select', 'pen', 'arrow', 'line', 'text',
  'smoke', 'flash', 'molotov', 'he_blast', 'c4_bomb',
  'player_t', 'player_ct', 'eraser'
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

  // Automatic Background Reconciliation Auto-Sync
  autoSyncTimer = setInterval(() => {
    const s = gameRoomStore.getSocket()
    if (s && s.connected) {
      s.emit('room:request_sync', { mapId: mapStore.currentMapId })
    }
    if (selectedPrivateRecipientId.value && rightSidebarTab.value === 'private_chat') {
      silentRefreshPrivateThread(selectedPrivateRecipientId.value)
    }
  }, 2500)

  // Restore saved tool preferences
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

// Watch and persist tool preferences
watch(() => stratStore.activeTool, (tool) => {
  if (tool) localStorage.setItem('cs2_tactics_pref_tool', tool)
})
watch(arrowControlMode, (mode) => {
  if (mode) localStorage.setItem('cs2_tactics_pref_arrow_mode', mode)
})
watch(activeStrokeWidth, (w) => {
  if (w) localStorage.setItem('cs2_tactics_pref_stroke_width', String(w))
})
watch(() => stratStore.activeColor, (col) => {
  if (col) localStorage.setItem('cs2_tactics_pref_color', col)
})

let autoSyncTimer: any = null

function handleWindowFocusSync() {
  const s = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  if (s && s.connected) {
    s.emit('room:request_sync', { mapId: mapStore.currentMapId })
  }
}

onUnmounted(() => {
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
  const code = (codeToJoin || roomCodeInput.value || `PIC-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase()
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
  copySuccessToast.value = 'Room ID Copied!'
  setTimeout(() => { copySuccessToast.value = '' }, 2500)
}

function handleCopyRoomLink() {
  const room = gameRoomStore.currentRoomCode || roomCodeInput.value || 'PIC-1001'
  const baseDomain = serverPublicUrl.value || window.location.origin
  const url = `${baseDomain}/tactics?room=${room}`
  copyToClipboard(url)
  isCopied.value = true
  copySuccessToast.value = 'Room Link Copied to Clipboard!'
  setTimeout(() => { isCopied.value = false; copySuccessToast.value = '' }, 2500)
}

function placeCustomPin(pin: CustomPinDefinition) {
  if (!gameRoomStore.isHost && !gameRoomStore.allowGuestsToDraw) {
    alert('Host has locked drawing permissions for guests.')
    return
  }
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
  if (!svgRef.value) return { x: 50, y: 50 }
  const rect = svgRef.value.getBoundingClientRect()
  const x = Math.round((((e.clientX - rect.left) / rect.width) * 100) * 10) / 10
  const y = Math.round((((e.clientY - rect.top) / rect.height) * 100) * 10) / 10
  return { x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) }
}

function handleElementMouseDown(e: MouseEvent, el: TacticsElement) {
  if (stratStore.activeTool === 'select') {
    e.stopPropagation()
    if (!gameRoomStore.isHost && !gameRoomStore.allowGuestsToDraw) {
      alert('Host has locked tactical board modifications for guests.')
      return
    }
    const coords = getMapCoords(e)
    isDraggingElement.value = true
    draggedElementId.value = el.id
    selectedElementId.value = el.id
    dragOffset.value = {
      x: coords.x - el.points[0].x,
      y: coords.y - el.points[0].y
    }
  }
}

const isErasing = ref(false)

function distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }): number {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y)
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y)
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)))
}

function eraseAtCoords(coords: { x: number; y: number }) {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  const s = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  const toRemoveIds: string[] = []
  const eraseRadius = 7.0

  stratStore.boardElements.forEach(el => {
    if (el.type === 'pen') {
      const remaining = el.points.filter(pt => Math.hypot(pt.x - coords.x, pt.y - coords.y) > eraseRadius)
      if (remaining.length < el.points.length) {
        if (remaining.length < 2) {
          toRemoveIds.push(el.id)
        } else {
          el.points = remaining
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
      if (Math.hypot(el.points[0].x - coords.x, el.points[0].y - coords.y) <= (eraseRadius + 1.0)) {
        toRemoveIds.push(el.id)
      }
    }
  })

  toRemoveIds.forEach(id => {
    stratStore.removeBoardElement(id, { userId: currentUserId })
    if (s && s.connected) {
      s.emit('room:element_remove', { elementId: id, mapId: mapStore.currentMapId })
    }
  })
}

function handleMouseDown(e: MouseEvent) {
  if (!gameRoomStore.isHost && !gameRoomStore.allowGuestsToDraw) {
    return
  }
  const tool = stratStore.activeTool
  if (tool === 'select') return

  const coords = getMapCoords(e)

  if (tool === 'eraser') {
    isErasing.value = true
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
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'smoke_cloud',
      color: '#94a3b8',
      points: [coords],
      radius: 32,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    })
    return
  }

  if (tool === 'flash') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'flash_burst',
      color: '#eab308',
      points: [coords],
      radius: 16,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    })
    return
  }

  if (tool === 'molotov') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'molotov_fire',
      color: '#f97316',
      points: [coords],
      radius: 25,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    })
    return
  }

  if (tool === 'he_blast') {
    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'he_blast',
      color: '#22c55e',
      points: [coords],
      radius: 20,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    })
    return
  }

  if (tool === 'c4_bomb') {
    // Check if clicked inside Site A or Site B plant zones (red box)
    const siteA = mapStore.currentMap.sites?.a
    const siteB = mapStore.currentMap.sites?.b

    const distA = siteA ? Math.hypot(coords.x - siteA.x, coords.y - siteA.y) : 999
    const distB = siteB ? Math.hypot(coords.x - siteB.x, coords.y - siteB.y) : 999

    const isInsideSite = distA <= 7.5 || distB <= 7.5

    if (!isInsideSite) {
      tempSaveToast.value = '⚠️ C4 can ONLY be placed inside Site A or Site B plant box!'
      setTimeout(() => { tempSaveToast.value = '' }, 3500)
      return
    }

    const myUserId = authStore.currentUser?.id || 'guest'
    const myUsername = authStore.currentUser?.username || 'Player'

    // Limit 1 bomb per player: Remove player's existing bomb if already placed
    const existingBomb = stratStore.boardElements.find(e => 
      e.type === 'c4_bomb' && (e.authorId === myUserId || e.authorUsername === myUsername)
    )

    if (existingBomb) {
      stratStore.removeBoardElement(existingBomb.id, { userId: myUserId, username: myUsername })
      const s = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
      if (s && s.connected) s.emit('room:element_remove', { elementId: existingBomb.id, mapId: mapStore.currentMapId })
    }

    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'c4_bomb',
      color: '#ef4444',
      points: [coords],
      radius: 16,
      authorId: myUserId,
      authorUsername: myUsername,
      authorAvatar: authStore.currentUser?.avatar
    })
    return
  }

  if (tool === 'player_t' || tool === 'player_ct') {
    const isT = tool === 'player_t'
    const existingSameSide = stratStore.boardElements.filter(e => e.type === tool)
    if (existingSameSide.length >= 5) {
      alert(`Maximum 5 ${isT ? 'T' : 'CT'} player pins allowed (5v5 format).`)
      return
    }

    const usedNums = new Set(existingSameSide.map(e => e.playerNum || '1'))
    const nextNum = ['1', '2', '3', '4', '5'].find(n => !usedNums.has(n)) || String(existingSameSide.length + 1)

    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: tool as any,
      color: isT ? '#f97316' : '#0ea5e9',
      points: [coords],
      playerNum: nextNum,
      radius: 15,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    })
    return
  }

  // DRAWING TOOLS
  isDrawing.value = true
  currentStroke.value = [coords]
}

function handleMouseMove(e: MouseEvent) {
  if (isDraggingElement.value && draggedElementId.value) {
    const el = stratStore.boardElements.find(item => item.id === draggedElementId.value)
    if (el) {
      const coords = getMapCoords(e)
      // If dragging C4 bomb, maintain plant zone constraint
      if (el.type === 'c4_bomb') {
        const siteA = mapStore.currentMap.sites?.a
        const siteB = mapStore.currentMap.sites?.b
        const distA = siteA ? Math.hypot(coords.x - siteA.x, coords.y - siteA.y) : 999
        const distB = siteB ? Math.hypot(coords.x - siteB.x, coords.y - siteB.y) : 999
        if (distA > 8 && distB > 8) {
          return // do not drag outside plant zones
        }
      }

      const targetX = Math.round(Math.max(3, Math.min(97, coords.x - dragOffset.value.x)) * 10) / 10
      const targetY = Math.round(Math.max(3, Math.min(97, coords.y - dragOffset.value.y)) * 10) / 10

      if (el.points.length === 1) {
        el.points[0] = { x: targetX, y: targetY }
      } else if (el.points.length >= 2) {
        const dx = targetX - el.points[0].x
        const dy = targetY - el.points[0].y
        el.points = el.points.map(pt => ({
          x: Math.round(Math.max(3, Math.min(97, pt.x + dx)) * 10) / 10,
          y: Math.round(Math.max(3, Math.min(97, pt.y + dy)) * 10) / 10
        }))
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
    currentStroke.value.push(coords)
  } else if (tool === 'arrow' || tool === 'line') {
    if (currentStroke.value.length === 1) {
      currentStroke.value.push(coords)
    } else {
      currentStroke.value[1] = coords
    }
  }
}

function handleMouseUp() {
  if (isErasing.value) {
    isErasing.value = false
  }

  if (isDraggingElement.value) {
    isDraggingElement.value = false
    draggedElementId.value = null
    stratStore.saveCurrentMapElements(mapStore.currentMapId)
    const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
    if (socket && socket.connected) {
      socket.emit('room:elements_sync', { elements: stratStore.boardElements, mapId: mapStore.currentMapId })
    }
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

    addElement({
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: (tool === 'pen' ? 'pen' : tool === 'arrow' ? 'arrow' : 'line') as TacticsElementType,
      color: stratStore.activeColor,
      strokeWidth: activeStrokeWidth.value,
      points: finalPoints,
      authorId: authStore.currentUser?.id,
      authorUsername: authStore.currentUser?.username
    })
  }
  currentStroke.value = []
}

function addElement(element: TacticsElement) {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  stratStore.addBoardElement(element, { userId: currentUserId, username: authStore.currentUser?.username })
  const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  if (socket && socket.connected) {
    socket.emit('room:element_add', { element, mapId: mapStore.currentMapId })
  }
}

function handleUndo() {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  const res = stratStore.undo(currentUserId)
  const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  if (res && socket && socket.connected) {
    if (res.action === 'remove') {
      socket.emit('room:element_remove', { elementId: res.element.id, mapId: mapStore.currentMapId })
    } else if (res.action === 'add') {
      socket.emit('room:element_add', { element: res.element, mapId: mapStore.currentMapId })
    }
  }
}

function handleRedo() {
  const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
  const res = stratStore.redo(currentUserId)
  const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  if (res && socket && socket.connected) {
    if (res.action === 'add') {
      socket.emit('room:element_add', { element: res.element, mapId: mapStore.currentMapId })
    } else if (res.action === 'remove') {
      socket.emit('room:element_remove', { elementId: res.element.id, mapId: mapStore.currentMapId })
    }
  }
}

function handleElementClick(e: MouseEvent, el: TacticsElement) {
  e.stopPropagation()
  if (stratStore.activeTool === 'eraser') {
    const currentUserId = authStore.currentUser?.id || authStore.currentUser?.username
    stratStore.removeBoardElement(el.id, { userId: currentUserId })
    const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
    if (socket && socket.connected) socket.emit('room:element_remove', { elementId: el.id, mapId: mapStore.currentMapId })
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
  if (!gameRoomStore.isHost && !gameRoomStore.allowGuestsToDraw) {
    alert('Host has locked tactical board modifications for guests.')
    return
  }
  if (selectedElementId.value) {
    const id = selectedElementId.value
    stratStore.removeBoardElement(id)
    const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
    if (socket && socket.connected) socket.emit('room:element_remove', { elementId: id, mapId: mapStore.currentMapId })
    selectedElementId.value = null
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
  const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  if (socket && socket.connected) {
    socket.emit('room:clear_drawings', { mapId: mapStore.currentMapId })
  }
  isClearConfirmModalOpen.value = false
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

        <!-- SQUAD ROSTER & HOST TRANSFER -->
        <button
          @click="isMembersModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer group"
          title="View squad members and manage host permissions"
        >
          <Crown v-if="gameRoomStore.isHost" class="w-3.5 h-3.5 text-amber-400" />
          <Users v-else class="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
          <span>Members ({{ gameRoomStore.members.length }})</span>
        </button>

        <!-- GHOST MODE TOGGLE (ADMIN ONLY - SILENT JOIN / INVISIBLE OBSERVATION) -->
        <button
          v-if="authStore.isAdmin"
          @click="gameRoomStore.toggleGhostMode"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm',
            gameRoomStore.isGhostMode
              ? 'bg-purple-950/90 text-purple-300 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
              : 'bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800'
          ]"
          :title="gameRoomStore.isGhostMode ? 'Ghost Mode Active: You are invisible to other room members' : 'Enable Ghost Mode to join & observe silently without being seen on member roster'"
        >
          <Ghost :class="['w-3.5 h-3.5', gameRoomStore.isGhostMode ? 'text-purple-400 animate-pulse' : 'text-slate-500']" />
          <span>{{ gameRoomStore.isGhostMode ? 'Ghost: Invisible' : 'Ghost Mode' }}</span>
        </button>

        <!-- USER VIEW MODE TOGGLE (ADMIN ONLY) -->
        <button
          v-if="authStore.isActualAdmin"
          @click="authStore.toggleUserPreviewMode()"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm',
            authStore.isUserPreviewMode
              ? 'bg-purple-500 text-slate-950 border-purple-400 font-black shadow-[0_0_10px_rgba(168,85,247,0.4)]'
              : 'bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800'
          ]"
          :title="authStore.isUserPreviewMode ? 'Currently previewing as regular user. Click to return to Admin View' : 'Preview website and room exactly as regular players see it'"
        >
          <Eye class="w-3.5 h-3.5" />
          <span>{{ authStore.isUserPreviewMode ? 'User Mode: Active' : 'User Mode' }}</span>
        </button>

        <!-- DIRECT SERVER CONNECT -->
        <button
          @click="isCs2ServerModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm group"
          title="Connect to CS2 Practice Server via RCON to capture live in-game lineups"
        >
          <Gamepad2 class="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Server</span>
        </button>

        <!-- LIVE AUTO-SYNC BADGE & FORCE SYNC OPTION BUTTON -->
        <div class="flex items-center gap-1.5 p-1 pl-2.5 bg-slate-950/90 rounded-xl border border-slate-800 text-xs shadow-sm">
          <div class="flex items-center gap-1.5 mr-1" title="Real-time automatic tactical synchronization active">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-[11px] font-bold text-slate-300">Auto-Synced</span>
          </div>

          <button
            @click="handleForceSyncBoard"
            :class="[
              'flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-[11px] font-bold transition-all cursor-pointer group',
              isSyncingBoard ? 'text-amber-400 border-amber-500/50' : 'text-slate-300 hover:text-white'
            ]"
            title="Force a manual hard re-sync of all tactical elements with the server"
          >
            <RefreshCw :class="['w-3 h-3 text-amber-400', isSyncingBoard ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500']" />
            <span>{{ isSyncingBoard ? 'Syncing...' : 'Force Sync' }}</span>
          </button>
        </div>

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
        <div v-else class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px]">
          <span :class="gameRoomStore.allowGuestsToDraw ? 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' : 'w-2 h-2 rounded-full bg-rose-500'"></span>
          <span class="text-slate-400 font-bold">{{ gameRoomStore.allowGuestsToDraw ? 'Guest (Drawing Active)' : 'Guest (Board Locked by Host)' }}</span>
        </div>

        <span v-if="copySuccessToast" class="text-xs font-bold text-emerald-400 animate-fade-in">
          {{ copySuccessToast }}
        </span>
      </div>

      <!-- TEMP SAVE, RESTORE, CUSTOMIZE & MAP SELECTOR -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- TEMP SAVE BUTTON -->
        <button
          @click="handleTempSaveCurrentBoard"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          title="Temporarily snapshot and save current drawings for this map"
        >
          <Save class="w-3.5 h-3.5" />
          <span>Temp Save</span>
        </button>

        <!-- RESTORE TEMP SAVED BOARD -->
        <button
          v-if="stratStore.tempSavedBoards[mapStore.currentMapId]"
          @click="handleRestoreTempSavedBoard"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          :title="`Restore temp-saved board (${stratStore.tempSavedBoards[mapStore.currentMapId]?.savedAt})`"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Restore Save</span>
        </button>

        <span v-if="tempSaveToast" class="text-xs font-bold text-amber-400 animate-fade-in px-1">
          {{ tempSaveToast }}
        </span>

        <button
          @click="isCustomizeToolbarOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          title="Customize toolbar icons and add custom pins"
        >
          <Settings2 class="w-3.5 h-3.5" />
          <span>Customize Icons</span>
        </button>

        <!-- MAP SELECTOR INTERACTIVE DROPDOWN -->
        <div class="relative tactics-map-dropdown-container">
          <button
            @click="isTacticsMapDropdownOpen = !isTacticsMapDropdownOpen"
            class="flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <img 
              v-if="mapStore.currentMap.icon" 
              :src="mapStore.currentMap.icon" 
              :alt="mapStore.currentMap.name" 
              class="w-4 h-4 object-contain"
            />
            <span v-else class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span class="uppercase tracking-wide font-mono">{{ mapStore.currentMap.name }}</span>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isTacticsMapDropdownOpen }" />
          </button>

          <!-- DROPDOWN LIST -->
          <div 
            v-if="isTacticsMapDropdownOpen"
            class="absolute top-full right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col py-1 animate-fade-in"
          >
            <div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
              <span>Switch Map</span>
              <span class="text-[10px] text-amber-400 font-mono">{{ mapStore.availableMaps.length }} Maps</span>
            </div>

            <div class="max-h-72 overflow-y-auto">
              <button
                v-for="map in mapStore.availableMaps"
                :key="map.id"
                @click="handleMapSelect(map.id); isTacticsMapDropdownOpen = false"
                :class="[
                  'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer',
                  mapStore.currentMapId === map.id 
                    ? 'bg-amber-500/20 text-amber-400 font-bold' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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

                <span v-if="map.isCustom" class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  CUSTOM
                </span>
                <span v-else-if="map.activePool" class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black">
                  PREMIER
                </span>
                <span v-else class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                  RESERVE
                </span>
              </button>
            </div>
          </div>
        </div>
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
          @click="handleUndo"
          title="Undo Your Input"
          class="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
        <button
          @click="handleRedo"
          title="Redo Your Input"
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
          @click="isRightSidebarVisible = !isRightSidebarVisible"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm',
            isRightSidebarVisible ? 'bg-amber-500 text-slate-950 font-black border-amber-400' : 'bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800'
          ]"
          title="Toggle Right Tactical Panel (Room Chat, Private DMs & Players List)"
        >
          <MessageSquare class="w-3.5 h-3.5" />
          <span>Chat & Squad</span>
        </button>
        <button
          @click="handleClearBoard"
          title="Clear Board"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- 5v5 PLAYER PIN STATUS DRAWER -->
    <div 
      v-if="stratStore.activeTool === 'player_t' || stratStore.activeTool === 'player_ct'"
      class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs animate-fade-in"
    >
      <div class="flex items-center gap-3">
        <span class="font-bold text-slate-200 flex items-center gap-1.5">
          <User class="w-4 h-4 text-amber-400" />
          {{ stratStore.activeTool === 'player_t' ? 'Terrorist (T) 5v5 Pin' : 'Counter-Terrorist (CT) 5v5 Pin' }}:
        </span>
        <span class="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-400 text-xs font-mono font-black border border-slate-800">
          T Pins: {{ stratStore.boardElements.filter(e => e.type === 'player_t').length }}/5
        </span>
        <span class="px-2.5 py-1 rounded-lg bg-slate-950 text-sky-400 text-xs font-mono font-black border border-slate-800">
          CT Pins: {{ stratStore.boardElements.filter(e => e.type === 'player_ct').length }}/5
        </span>
      </div>
      <p class="text-[11px] text-slate-400">
        Click map to place pin (Auto 1..5). Switch to <strong>Select / Move</strong> tool to drag pins anywhere.
      </p>
    </div>

    <!-- TACTICAL BOARD + RIGHT SIDEBAR (PUBLIC CHAT, PRIVATE CHAT & PLAYERS LIST) -->
    <div class="flex flex-col xl:flex-row gap-4 items-start w-full">
      <!-- RADAR CANVAS AREA -->
      <div class="relative flex-grow w-full aspect-square max-w-4xl mx-auto bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none">
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

          <!-- LAYER 2: PLACED TACTICAL ELEMENTS -->
          <g class="tactics-elements-layer">
            <g
              v-for="el in stratStore.boardElements"
              :key="el.id"
              @mousedown="(e) => handleElementMouseDown(e, el)"
              @click="(e) => handleElementClick(e, el)"
              :class="{ 
                'opacity-80': selectedElementId === el.id, 
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

              <!-- 4. SMOKE BLOOM (CS2 VOLUMETRIC SCALED RADIUS) -->
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
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="13" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5" />
                <text
                  :x="el.points[0].x * 10"
                  :y="el.points[0].y * 10 + 4"
                  font-size="12"
                  text-anchor="middle"
                  class="select-none pointer-events-none"
                >
                  ☁️
                </text>
              </g>

              <!-- 6. FLASH BURST -->
              <g v-else-if="el.type === 'flash_burst'">
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="18" fill="#eab308" fill-opacity="0.25" stroke="#eab308" stroke-width="1.5" stroke-dasharray="3 2" />
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="12" fill="#0f172a" stroke="#eab308" stroke-width="1.5" />
                <text
                  :x="el.points[0].x * 10"
                  :y="el.points[0].y * 10 + 4"
                  font-size="12"
                  text-anchor="middle"
                  class="select-none pointer-events-none"
                >
                  ⚡
                </text>
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
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="13" fill="#0f172a" stroke="#f97316" stroke-width="1.5" />
                <text
                  :x="el.points[0].x * 10"
                  :y="el.points[0].y * 10 + 4"
                  font-size="12"
                  text-anchor="middle"
                  class="select-none pointer-events-none"
                >
                  🔥
                </text>
              </g>

              <!-- 8. HE GRENADE BLAST -->
              <g v-else-if="el.type === 'he_blast'">
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="20" fill="#22c55e" fill-opacity="0.2" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3 2" />
                <circle :cx="el.points[0].x * 10" :cy="el.points[0].y * 10" r="12" fill="#0f172a" stroke="#22c55e" stroke-width="1.5" />
                <text
                  :x="el.points[0].x * 10"
                  :y="el.points[0].y * 10 + 4"
                  font-size="12"
                  text-anchor="middle"
                  class="select-none pointer-events-none"
                >
                  🎯
                </text>
              </g>

              <!-- 9. C4 BOMB (PLANT ZONE ONLY, WITH USER BADGE) -->
              <g v-else-if="el.type === 'c4_bomb' || el.type === 'plant_a' || el.type === 'plant_b'">
                <!-- Main Bomb Base -->
                <rect
                  :x="el.points[0].x * 10 - 14"
                  :y="el.points[0].y * 10 - 14"
                  width="28"
                  height="28"
                  rx="6"
                  fill="#7f1d1d"
                  stroke="#ef4444"
                  stroke-width="2"
                  class="shadow-xl"
                />
                <text
                  :x="el.points[0].x * 10"
                  :y="el.points[0].y * 10 + 4.5"
                  font-size="14"
                  text-anchor="middle"
                  class="select-none pointer-events-none"
                >
                  💣
                </text>

                <!-- Small Player Badge on Top-Right Corner of Bomb -->
                <g :transform="`translate(${el.points[0].x * 10 + 9}, ${el.points[0].y * 10 - 9})`">
                  <circle cx="0" cy="0" r="7" fill="#0f172a" stroke="#de9b35" stroke-width="1.5" />
                  <image
                    v-if="el.authorAvatar"
                    :href="el.authorAvatar"
                    x="-5"
                    y="-5"
                    width="10"
                    height="10"
                    clip-path="circle(5px at center)"
                  />
                  <text
                    v-else
                    x="0"
                    y="3"
                    fill="#de9b35"
                    font-size="7"
                    font-weight="900"
                    text-anchor="middle"
                  >
                    {{ (el.authorUsername || 'P').charAt(0).toUpperCase() }}
                  </text>
                </g>
              </g>

              <!-- 10. PLAYER PIN (5v5 ROSTER, MOVEABLE) -->
              <g v-else-if="el.type === 'player_t' || el.type === 'player_ct' || el.type === 'player_icon'">
                <circle
                  :cx="el.points[0].x * 10"
                  :cy="el.points[0].y * 10"
                  r="15"
                  :fill="el.color"
                  stroke="#0f172a"
                  stroke-width="2.5"
                  class="shadow-xl"
                />
                <text
                  :x="el.points[0].x * 10"
                  :y="el.points[0].y * 10 + 4.5"
                  fill="#0f172a"
                  font-size="12"
                  font-weight="900"
                  font-family="sans-serif"
                  text-anchor="middle"
                >
                  {{ el.playerNum || '1' }}
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
          </g>
        </svg>
      </div>

      <!-- RIGHT TACTICAL SIDEBAR (PUBLIC ROOM CHAT / PRIVATE DM / PLAYERS LIST) -->
      <div
        v-if="isRightSidebarVisible"
        class="w-full xl:w-80 h-[560px] xl:h-[720px] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden shrink-0 animate-fade-in"
      >
        <!-- HEADER TABS -->
        <div class="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-1 shrink-0">
          <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 flex-1">
            <button
              @click="rightSidebarTab = 'public_chat'"
              :class="[
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                rightSidebarTab === 'public_chat' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
              ]"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>Room Chat</span>
            </button>

            <button
              @click="rightSidebarTab = 'private_chat'"
              :class="[
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                rightSidebarTab === 'private_chat' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
              ]"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>Messages</span>
            </button>

            <button
              @click="rightSidebarTab = 'players'"
              :class="[
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                rightSidebarTab === 'players' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
              ]"
            >
              <Users class="w-3.5 h-3.5" />
              <span>Players ({{ gameRoomStore.members.length }})</span>
            </button>
          </div>

          <button
            @click="isRightSidebarVisible = false"
            class="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            title="Hide Sidebar"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- TAB 1: PUBLIC ROOM CHAT -->
        <div v-if="rightSidebarTab === 'public_chat'" class="flex-1 flex flex-col justify-between overflow-hidden">
          <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 scrollbar-thin text-xs">
            <div v-if="gameRoomStore.chatMessages.length === 0" class="m-auto text-center text-slate-500 italic p-4">
              <span>No room messages yet. Say hello to everyone!</span>
            </div>
            <div
              v-for="(msg, mIdx) in gameRoomStore.chatMessages"
              :key="`rc-${mIdx}`"
              :class="[
                'flex flex-col max-w-[88%] rounded-2xl p-2.5 text-xs',
                msg.username === (authStore.currentUser?.username || 'Teammate')
                  ? 'self-end bg-amber-500 text-slate-950 font-medium'
                  : 'self-start bg-slate-950 border border-slate-800 text-slate-200'
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

          <form @submit.prevent="sendRoomMessage" class="p-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center gap-1.5">
            <input
              v-model="roomChatInput"
              type="text"
              placeholder="Message everyone in room..."
              class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              :disabled="!roomChatInput.trim()"
              class="p-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black rounded-xl cursor-pointer"
            >
              <Send class="w-4 h-4" />
            </button>
          </form>
        </div>

        <!-- TAB 2: MESSAGES -->
        <div v-else-if="rightSidebarTab === 'private_chat'" class="flex-1 flex flex-col justify-between overflow-hidden">
          <div v-if="!selectedPrivateRecipientId" class="flex-1 p-4 flex flex-col items-center justify-center text-center gap-3 text-xs">
            <MessageSquare class="w-8 h-8 text-amber-400/70" />
            <span class="font-bold text-slate-200">Direct Messages</span>
            <span class="text-[11px] text-slate-400">Select a player from the Players tab to start a direct message.</span>
            <button
              @click="rightSidebarTab = 'players'"
              class="px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
            >
              Choose Player
            </button>
          </div>

          <template v-else>
            <!-- TARGET HEADER -->
            <div class="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-white">DM with {{ selectedPrivateRecipientUser?.username || selectedPrivateRecipientId }}</span>
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

            <!-- PRIVATE FEED -->
            <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 scrollbar-thin text-xs">
              <div v-if="privateMessages.length === 0" class="m-auto text-center text-slate-500 italic p-4">
                <span>No private messages yet. Say hello!</span>
              </div>
              <div
                v-for="pmsg in privateMessages"
                :key="pmsg.id"
                :class="[
                  'flex flex-col max-w-[88%] rounded-2xl p-2.5 text-xs',
                  pmsg.senderId === authStore.currentUser?.id
                    ? 'self-end bg-amber-500 text-slate-950 font-medium'
                    : 'self-start bg-slate-950 border border-slate-800 text-slate-200'
                ]"
              >
                <div class="flex items-center gap-1.5 mb-0.5 opacity-80 text-[10px]">
                  <span class="font-bold">{{ pmsg.senderUsername }}</span>
                  <span class="text-[9px] opacity-75">{{ new Date(pmsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
                <p class="leading-relaxed whitespace-pre-wrap break-words">{{ pmsg.text }}</p>
              </div>
            </div>

            <form @submit.prevent="sendPrivateMessage" class="p-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center gap-1.5">
              <input
                v-model="privateChatInput"
                type="text"
                placeholder="Send encrypted message..."
                class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                :disabled="!privateChatInput.trim()"
                class="p-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black rounded-xl cursor-pointer"
              >
                <Send class="w-4 h-4" />
              </button>
            </form>
          </template>
        </div>

        <!-- TAB 3: PLAYERS ROSTER -->
        <div v-else-if="rightSidebarTab === 'players'" class="flex-1 overflow-y-auto p-3 flex flex-col gap-2 text-xs scrollbar-thin">
          <div
            v-for="member in gameRoomStore.members"
            :key="member.socketId"
            class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <img
                :src="member.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + member.username)"
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
                class="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg cursor-pointer border border-slate-700"
                title="Send Private Message"
              >
                <MessageSquare class="w-3.5 h-3.5" />
              </button>
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

    <!-- MODAL 4: SQUAD MEMBERS & TRANSFER HOST MODAL -->
    <Teleport to="body">
      <div
        v-if="isMembersModalOpen"
        class="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:items-center animate-fade-in"
        @click.self="isMembersModalOpen = false"
      >
        <div class="my-auto w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Users class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase text-white tracking-wider">Tactical Squad Roster</h3>
                <p class="text-[11px] text-slate-400">Room: <span class="font-mono text-amber-400 font-bold">{{ gameRoomStore.currentRoomCode || roomCodeInput }}</span> ({{ gameRoomStore.members.length }} Connected)</p>
              </div>
            </div>
            <button @click="isMembersModalOpen = false" class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
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
                    <span v-if="member.isHost" class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase flex items-center gap-0.5">
                      <Crown class="w-2.5 h-2.5" /> Host
                    </span>
                    <span v-else class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-bold uppercase">
                      Guest
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">{{ member.inGameRole }}</span>
                </div>
              </div>

              <!-- TRANSFER HOST BUTTON (ONLY HOST SEES AND CAN TRANSFER TO GUESTS) -->
              <div v-if="gameRoomStore.isHost && !member.isHost">
                <button
                  @click="handleTransferHost(member.username)"
                  class="flex items-center gap-1 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
                  title="Transfer Room Host permissions"
                >
                  <Crown class="w-3.5 h-3.5 text-amber-400" />
                  <span>Transfer Host</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <span class="text-slate-400 text-[11px]">
              {{ gameRoomStore.isHost ? '👑 You have Host privileges.' : '👤 You are connected as a Guest.' }}
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

    <!-- MODAL 4: CENTERED CLEAR BOARD CONFIRMATION DIALOG -->
    <Teleport to="body">
      <div
        v-if="isClearConfirmModalOpen"
        class="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in"
        @click.self="isClearConfirmModalOpen = false"
      >
        <div class="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center items-center">
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
              class="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer hover:scale-[1.02]"
            >
              Clear Board
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- CS2 DEDICATED SERVER CONNECT MODAL -->
    <CS2ServerConnectModal
      :is-open="isCs2ServerModalOpen"
      @close="isCs2ServerModalOpen = false"
    />

    <!-- MODAL 5: CENTERED MAP SWITCH & BOARD WIPE WARNING -->
    <Teleport to="body">
      <div
        v-if="isMapSwitchWarnModalOpen"
        class="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in"
        @click.self="isMapSwitchWarnModalOpen = false"
      >
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-center items-center">
          <div class="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl shadow-inner">
            <AlertTriangle class="w-8 h-8 stroke-[2.5]" />
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="text-base font-black uppercase text-white tracking-wide">
              Switch Map & Start Fresh Board?
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              You have <strong class="text-amber-400">{{ stratStore.boardElements.length }} active markings/pins</strong> on
              <strong class="text-white uppercase">{{ mapStore.currentMap?.name || mapStore.currentMapId }}</strong>.
            </p>
            <p class="text-xs text-slate-400 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              All tactical boards are temporary unless saved. Changing maps will start a fresh, clean board for
              <strong class="text-emerald-400 uppercase font-mono">{{ pendingTargetMapId }}</strong>.
            </p>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="flex flex-col gap-2.5 w-full pt-1">
            <button
              @click="pendingTargetMapId && executeMapSwitch(pendingTargetMapId, true)"
              class="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Save class="w-4 h-4" />
              <span>Temp Save Board & Switch</span>
            </button>

            <button
              @click="pendingTargetMapId && executeMapSwitch(pendingTargetMapId, false)"
              class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 class="w-3.5 h-3.5 text-rose-400" />
              <span>Discard Markings & Start Fresh</span>
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
  </div>
</template>
