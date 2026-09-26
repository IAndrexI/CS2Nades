<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { GrenadeType, TeamSide, ThrowType, TickrateType } from '../../types'
import { parseCS2Pos, worldToRadarCoords, radarToWorldCoords } from '../../utils/coordinateMapper'
import axios from 'axios'
import { 
  X, 
  MapPin, 
  Crosshair, 
  Plus, 
  Trash2, 
  Check, 
  Video, 
  Image as ImageIcon,
  Share2,
  Lock,
  Terminal,
  Upload,
  Clipboard,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  FileText
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const activeTab = ref<'basics' | 'position' | 'screenshots' | 'guide'>('basics')

const rawCS2PosInput = ref<string>('')
const parsedPosStatus = ref<{
  success: boolean
  message: string
  details?: { posX: number; posY: number; posZ: number; pitch?: number; yaw?: number; radarX: number; radarY: number }
} | null>(null)

const isUploadingImage = ref<boolean>(false)
const selectedImagePreview = ref<string | null>(null)

const formData = reactive({
  title: '',
  mapId: mapStore.currentMapId,
  grenadeType: 'smoke' as GrenadeType,
  side: 't' as TeamSide,
  throwType: 'jumpthrow' as ThrowType,
  tickrate: 'cs2_subtick' as TickrateType,
  startLocation: '',
  endLocation: '',
  site: 'A' as 'A' | 'B' | 'Mid' | 'Spawn' | 'General',
  originCoords: { x: 50, y: 50 },
  landingCoords: { x: 50, y: 30 },
  curveOffset: 0,
  isTeamShared: true,
  videoUrl: '',
  imageUrl: '',
  aimScreenshot: '',
  standingScreenshot: '',
  landingScreenshot: '',
  description: '',
  instructions: [''],
  consoleCommand: '',
  cs2Pos: undefined as { x: number; y: number; z: number; pitch?: number; yaw?: number; roll?: number } | undefined,
  difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  tags: ''
})

// Current map radar image
const currentMapInfo = computed(() => {
  return mapStore.availableMaps.find(m => m.id === formData.mapId) || mapStore.currentMap
})

// Watch mapStore temp placement if user used full radar pinpoint mode
watch(() => mapStore.tempPlacement, (newVal) => {
  if (newVal.origin) {
    formData.originCoords = { ...newVal.origin }
  }
  if (newVal.landing) {
    formData.landingCoords = { ...newVal.landing }
  }
}, { deep: true })

// Watch map change to recompute radar coords if raw pos exists
watch(() => formData.mapId, (newMapId) => {
  if (rawCS2PosInput.value) {
    processCS2PosInput(rawCS2PosInput.value)
  }
})

// ── CS2 CONSOLE POS & SETPOS PARSING ──────────────────────────
function processCS2PosInput(val: string) {
  if (!val.trim()) {
    parsedPosStatus.value = null
    return
  }

  const parsed = parseCS2Pos(val)
  if (parsed && parsed.valid) {
    const radar = worldToRadarCoords(parsed.posX, parsed.posY, formData.mapId)
    formData.originCoords = { x: radar.x, y: radar.y }
    formData.consoleCommand = parsed.consoleCommand
    formData.cs2Pos = {
      x: parsed.posX,
      y: parsed.posY,
      z: parsed.posZ,
      pitch: parsed.angPitch,
      yaw: parsed.angYaw,
      roll: parsed.angRoll
    }

    parsedPosStatus.value = {
      success: true,
      message: `Successfully mapped to ${currentMapInfo.value.name}!`,
      details: {
        posX: parsed.posX,
        posY: parsed.posY,
        posZ: parsed.posZ,
        pitch: parsed.angPitch,
        yaw: parsed.angYaw,
        radarX: radar.x,
        radarY: radar.y
      }
    }
  } else {
    parsedPosStatus.value = {
      success: false,
      message: 'Could not parse setpos / getpos format. Example: "setpos 1290 -430 -160; setang -12 94 0"'
    }
  }
}

async function handlePastePosFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      rawCS2PosInput.value = text
      processCS2PosInput(text)
    }
  } catch (err) {
    alert('Clipboard read permission denied. Please paste directly into the box with Ctrl+V.')
  }
}

// ── IN-GAME SCREENSHOT DROP & PASTE (CTRL+V) ─────────────────
async function handleImageFile(file: File, slot: 'aim' | 'standing' | 'landing' | 'main') {
  if (!file || !file.type.startsWith('image/')) return
  isUploadingImage.value = true

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string
      if (!base64Data) return

      // Try uploading to server
      let finalUrl = base64Data
      try {
        const res = await axios.post('/api/upload', { image: base64Data, filename: file.name })
        if (res.data && res.data.url) {
          finalUrl = res.data.url
        }
      } catch (uploadErr) {
        console.warn('Server upload failed, using local base64', uploadErr)
      }

      // Assign to target slot
      if (slot === 'aim' || slot === 'main') {
        formData.aimScreenshot = finalUrl
        formData.imageUrl = finalUrl // primary thumbnail
      } else if (slot === 'standing') {
        formData.standingScreenshot = finalUrl
      } else if (slot === 'landing') {
        formData.landingScreenshot = finalUrl
      }

      isUploadingImage.value = false
    }
    reader.readAsDataURL(file)
  } catch (err) {
    console.error('Error handling screenshot:', err)
    isUploadingImage.value = false
  }
}

function handleFileInputChange(e: Event, slot: 'aim' | 'standing' | 'landing') {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    handleImageFile(target.files[0], slot)
  }
}

function handleDrop(e: DragEvent, slot: 'aim' | 'standing' | 'landing') {
  e.preventDefault()
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    handleImageFile(e.dataTransfer.files[0], slot)
  }
}

// Global Clipboard Paste (Ctrl+V) listener
function handleGlobalPaste(e: ClipboardEvent) {
  if (!lineupStore.isAddModalOpen) return
  
  // If user is pasting into text input, don't intercept unless it's an image
  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile()
      if (blob) {
        e.preventDefault()
        // Auto-assign to first empty screenshot slot or aim slot
        if (!formData.aimScreenshot) {
          handleImageFile(blob, 'aim')
        } else if (!formData.standingScreenshot) {
          handleImageFile(blob, 'standing')
        } else if (!formData.landingScreenshot) {
          handleImageFile(blob, 'landing')
        } else {
          handleImageFile(blob, 'aim')
        }
        activeTab.value = 'screenshots'
        break
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('paste', handleGlobalPaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', handleGlobalPaste)
})

// ── INTERACTIVE MINI-RADAR CLICK PICKER ───────────────────────
const isDraggingOrigin = ref(false)
const isDraggingLanding = ref(false)
const radarContainerRef = ref<HTMLDivElement | null>(null)

function handleMiniRadarClick(e: MouseEvent) {
  if (!radarContainerRef.value) return
  const rect = radarContainerRef.value.getBoundingClientRect()
  const clickX = Math.max(0, Math.min(100, Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1))))
  const clickY = Math.max(0, Math.min(100, Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1))))

  // If shift key or right click, set landing spot; else set origin
  if (e.shiftKey || e.button === 2) {
    formData.landingCoords = { x: clickX, y: clickY }
  } else {
    formData.originCoords = { x: clickX, y: clickY }
  }
}

function setPlacementPoint(type: 'origin' | 'landing', e: MouseEvent) {
  if (!radarContainerRef.value) return
  const rect = radarContainerRef.value.getBoundingClientRect()
  const clickX = Math.max(0, Math.min(100, Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1))))
  const clickY = Math.max(0, Math.min(100, Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1))))

  if (type === 'origin') {
    formData.originCoords = { x: clickX, y: clickY }
  } else {
    formData.landingCoords = { x: clickX, y: clickY }
  }
}

function startPickFromMap() {
  lineupStore.isAddModalOpen = false
  mapStore.startPlacement()
}

function addInstructionStep() {
  formData.instructions.push('')
}

function removeInstructionStep(index: number) {
  if (formData.instructions.length > 1) {
    formData.instructions.splice(index, 1)
  }
}

// ── SAVE LINEUP ──────────────────────────────────────────────
function handleSave() {
  if (!formData.title.trim()) {
    alert('Please provide a lineup title.')
    activeTab.value = 'basics'
    return
  }

  const tagsArray = formData.tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  const cleanInstructions = formData.instructions.filter(i => i.trim().length > 0)

  // Primary image fallback
  const primaryImg = formData.aimScreenshot || formData.standingScreenshot || formData.landingScreenshot || formData.imageUrl || undefined

  const newLineup = lineupStore.addLineup({
    title: formData.title,
    mapId: formData.mapId,
    grenadeType: formData.grenadeType,
    side: formData.side,
    throwType: formData.throwType,
    tickrate: formData.tickrate,
    startLocation: formData.startLocation || 'Custom Spot',
    endLocation: formData.endLocation || 'Target Spot',
    site: formData.site,
    originCoords: formData.originCoords,
    landingCoords: formData.landingCoords,
    curveOffset: formData.curveOffset,
    videoUrl: formData.videoUrl || undefined,
    imageUrl: primaryImg,
    aimScreenshot: formData.aimScreenshot || undefined,
    standingScreenshot: formData.standingScreenshot || undefined,
    landingScreenshot: formData.landingScreenshot || undefined,
    cs2Pos: formData.cs2Pos,
    description: formData.description,
    instructions: cleanInstructions.length ? cleanInstructions : ['Execute throw alignment.'],
    consoleCommand: formData.consoleCommand || undefined,
    difficulty: formData.difficulty,
    author: authStore.currentUser?.username || 'You',
    tags: tagsArray.length ? tagsArray : ['Custom']
  })

  // Tag author info
  if (authStore.currentUser) {
    (newLineup as any).userId = authStore.currentUser.id;
    (newLineup as any).authorName = authStore.currentUser.username;
    (newLineup as any).isTeamShared = formData.isTeamShared
  }

  lineupStore.isAddModalOpen = false
  resetForm()
}

function resetForm() {
  formData.title = ''
  formData.startLocation = ''
  formData.endLocation = ''
  formData.videoUrl = ''
  formData.imageUrl = ''
  formData.aimScreenshot = ''
  formData.standingScreenshot = ''
  formData.landingScreenshot = ''
  formData.cs2Pos = undefined
  formData.description = ''
  formData.instructions = ['']
  formData.consoleCommand = ''
  rawCS2PosInput.value = ''
  parsedPosStatus.value = null
  formData.tags = ''
  formData.isTeamShared = true
  activeTab.value = 'basics'
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="lineupStore.isAddModalOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="lineupStore.isAddModalOpen = false"
    >
      <div class="relative w-full max-w-4xl max-h-[92vh] my-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        <!-- HEADER -->
        <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shadow">
              <Plus class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Create New Grenade Lineup</span>
                <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono rounded-full">
                  CS2 Ready
                </span>
              </h2>
              <p class="text-xs text-slate-400">
                Directly paste in-game screenshots & <code class="text-amber-300 font-mono">setpos / getpos</code> coordinates
              </p>
            </div>
          </div>

          <button 
            @click="lineupStore.isAddModalOpen = false"
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- NAVIGATION TABS -->
        <div class="flex items-center gap-1.5 px-5 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            @click="activeTab = 'basics'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
              activeTab === 'basics' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            ]"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>1. Essentials</span>
          </button>

          <button
            @click="activeTab = 'position'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
              activeTab === 'position' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            ]"
          >
            <Terminal class="w-3.5 h-3.5" />
            <span>2. Position & Console Pos</span>
            <span v-if="formData.cs2Pos" class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </button>

          <button
            @click="activeTab = 'screenshots'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
              activeTab === 'screenshots' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            ]"
          >
            <ImageIcon class="w-3.5 h-3.5" />
            <span>3. In-Game Screenshots</span>
            <span v-if="formData.aimScreenshot || formData.standingScreenshot" class="w-2 h-2 rounded-full bg-emerald-400"></span>
          </button>

          <button
            @click="activeTab = 'guide'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0',
              activeTab === 'guide' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            ]"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>4. Instructions & Notes</span>
          </button>
        </div>

        <!-- BODY -->
        <div class="flex-grow overflow-y-auto p-5 sm:p-6 text-xs text-slate-200">
          
          <!-- TAB 1: BASICS & ESSENTIALS -->
          <div v-show="activeTab === 'basics'" class="flex flex-col gap-4 animate-fade-in">
            <!-- TITLE & MAP -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2 flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Lineup Title *</label>
                <input 
                  v-model="formData.title" 
                  type="text" 
                  placeholder="e.g. Window Smoke from T Spawn" 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Map</label>
                <select 
                  v-model="formData.mapId"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
                    {{ map.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- GRENADE TYPE, SIDE, THROW TECHNIQUE -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Grenade Type</label>
                <select 
                  v-model="formData.grenadeType"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 uppercase font-mono font-bold"
                >
                  <option value="smoke">Smoke Grenade</option>
                  <option value="flash">Flashbang</option>
                  <option value="molotov">Molotov / Incendiary</option>
                  <option value="he">HE Grenade</option>
                  <option value="decoy">Decoy</option>
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Team Side</label>
                <select 
                  v-model="formData.side"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 uppercase font-bold"
                >
                  <option value="t">Terrorist (T)</option>
                  <option value="ct">Counter-Terrorist (CT)</option>
                  <option value="all">Both Sides</option>
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Throw Technique</label>
                <select 
                  v-model="formData.throwType"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 uppercase font-bold"
                >
                  <option value="standing">Standing (Left-Click)</option>
                  <option value="jumpthrow">Jumpthrow</option>
                  <option value="runthrow">Runthrow</option>
                  <option value="crouch_jumpthrow">Crouch + Jumpthrow</option>
                  <option value="left_right_click">Left + Right Click</option>
                  <option value="w_jumpthrow">W-Key Jumpthrow</option>
                </select>
              </div>
            </div>

            <!-- LOCATIONS & BOMB SITE -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Standing Spot Name</label>
                <input 
                  v-model="formData.startLocation" 
                  type="text" 
                  placeholder="e.g. T Roof / Trash Can" 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Landing Target Name</label>
                <input 
                  v-model="formData.endLocation" 
                  type="text" 
                  placeholder="e.g. Snipers Nest / Window" 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Target Bomb Site</label>
                <select 
                  v-model="formData.site"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="A">A Site</option>
                  <option value="B">B Site</option>
                  <option value="Mid">Mid</option>
                  <option value="Spawn">Spawn</option>
                  <option value="General">General Area</option>
                </select>
              </div>
            </div>
          </div>

          <!-- TAB 2: POSITION & CS2 CONSOLE POS -->
          <div v-show="activeTab === 'position'" class="flex flex-col gap-5 animate-fade-in">
            
            <!-- CS2 CONSOLE POS DIRECT PARSER -->
            <div class="p-4 bg-slate-950 border-2 border-amber-500/40 rounded-2xl flex flex-col gap-3 shadow-xl">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Terminal class="w-4 h-4 text-amber-400" />
                  <span class="font-black text-white text-xs uppercase tracking-wider">
                    Direct CS2 Console Position Parser (setpos / getpos)
                  </span>
                </div>
                <button
                  type="button"
                  @click="handlePastePosFromClipboard"
                  class="flex items-center gap-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                >
                  <Clipboard class="w-3 h-3" />
                  <span>Paste from Clipboard</span>
                </button>
              </div>

              <p class="text-[11px] text-slate-400 leading-relaxed">
                In CS2 practice, open console (<kbd class="px-1 bg-slate-800 border border-slate-700 rounded text-amber-300">~</kbd>), type <code class="text-amber-400 font-mono">getpos</code> or copy your <code class="text-amber-400 font-mono">setpos</code> string, and paste it below. It will <strong>automatically map the radar coordinates and angles</strong> for {{ currentMapInfo.name }}!
              </p>

              <div class="relative">
                <input 
                  v-model="rawCS2PosInput"
                  @input="processCS2PosInput(rawCS2PosInput)"
                  type="text"
                  placeholder="Paste here: setpos 1290.4 -430.1 -160.0; setang -12.4 94.2 0.0"
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-20 py-2.5 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  @click="processCS2PosInput(rawCS2PosInput)"
                  class="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Parse
                </button>
              </div>

              <!-- PARSED STATUS FEEDBACK -->
              <div 
                v-if="parsedPosStatus" 
                :class="[
                  'p-2.5 rounded-xl border flex flex-col gap-1 text-[11px]',
                  parsedPosStatus.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                ]"
              >
                <div class="flex items-center gap-1.5 font-bold">
                  <Check v-if="parsedPosStatus.success" class="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <X v-else class="w-3.5 h-3.5 text-rose-400" />
                  <span>{{ parsedPosStatus.message }}</span>
                </div>
                <div v-if="parsedPosStatus.details" class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px] text-slate-300 pt-1 border-t border-slate-800">
                  <span>X: <strong>{{ parsedPosStatus.details.posX.toFixed(1) }}</strong></span>
                  <span>Y: <strong>{{ parsedPosStatus.details.posY.toFixed(1) }}</strong></span>
                  <span>Z: <strong>{{ parsedPosStatus.details.posZ.toFixed(1) }}</strong></span>
                  <span>Radar: <strong>{{ parsedPosStatus.details.radarX }}%, {{ parsedPosStatus.details.radarY }}%</strong></span>
                </div>
              </div>
            </div>

            <!-- INTERACTIVE MINI-RADAR PLACEMENT & COORDINATES -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              <!-- LEFT: INTERACTIVE RADAR VIEW -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                    <Crosshair class="w-3.5 h-3.5 text-amber-400" />
                    <span>Interactive Radar Preview ({{ currentMapInfo.name }})</span>
                  </span>
                  <span class="text-[10px] text-slate-400">Click to set Origin • Shift+Click for Landing</span>
                </div>

                <div 
                  ref="radarContainerRef"
                  @click="handleMiniRadarClick"
                  class="relative aspect-square w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden cursor-crosshair select-none shadow-inner"
                >
                  <!-- RADAR BACKGROUND -->
                  <img 
                    :src="currentMapInfo.radarImage" 
                    :alt="currentMapInfo.name"
                    class="w-full h-full object-cover opacity-80 pointer-events-none"
                  />

                  <!-- TRAJECTORY LINE -->
                  <svg class="absolute inset-0 w-full h-full pointer-events-none">
                    <line 
                      :x1="`${formData.originCoords.x}%`" 
                      :y1="`${formData.originCoords.y}%`" 
                      :x2="`${formData.landingCoords.x}%`" 
                      :y2="`${formData.landingCoords.y}%`" 
                      stroke="#f59e0b" 
                      stroke-width="2" 
                      stroke-dasharray="4 3" 
                    />
                  </svg>

                  <!-- ORIGIN PIN (ORANGE) -->
                  <div 
                    class="absolute -translate-x-1/2 -translate-y-1/2 p-1 bg-amber-500 text-slate-950 rounded-full shadow-lg ring-2 ring-white cursor-pointer"
                    :style="{ left: `${formData.originCoords.x}%`, top: `${formData.originCoords.y}%` }"
                    title="Standing Origin"
                  >
                    <MapPin class="w-3.5 h-3.5 fill-current" />
                  </div>

                  <!-- LANDING PIN (RED) -->
                  <div 
                    class="absolute -translate-x-1/2 -translate-y-1/2 p-1 bg-rose-500 text-white rounded-full shadow-lg ring-2 ring-white cursor-pointer animate-pulse"
                    :style="{ left: `${formData.landingCoords.x}%`, top: `${formData.landingCoords.y}%` }"
                    title="Landing Target"
                  >
                    <Crosshair class="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                <button 
                  type="button"
                  @click="startPickFromMap"
                  class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MapPin class="w-3.5 h-3.5" />
                  <span>Open Full-Screen Minimap Picker</span>
                </button>
              </div>

              <!-- RIGHT: COORDINATES & CONSOLE COMMAND -->
              <div class="flex flex-col gap-4">
                <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3">
                  <span class="font-bold text-slate-300 text-xs">Radar Placement Coordinates (%)</span>
                  
                  <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1">
                      <span class="text-amber-400 font-bold text-[11px]">📍 Standing Spot (Origin)</span>
                      <div class="flex items-center gap-2">
                        <input v-model.number="formData.originCoords.x" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                        <input v-model.number="formData.originCoords.y" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                      </div>
                    </div>

                    <div class="flex flex-col gap-1">
                      <span class="text-rose-400 font-bold text-[11px]">🎯 Landing Spot (Target)</span>
                      <div class="flex items-center gap-2">
                        <input v-model.number="formData.landingCoords.x" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                        <input v-model.number="formData.landingCoords.y" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- PRACTICE CONSOLE COMMAND -->
                <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-2">
                  <label class="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                    <Terminal class="w-3.5 h-3.5 text-emerald-400" />
                    <span>Practice Teleport & Aim Command</span>
                  </label>
                  <input 
                    v-model="formData.consoleCommand" 
                    type="text" 
                    placeholder="setpos 1290.4 -430.1 -160.0; setang -12.4 94.2 0.0" 
                    class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <span class="text-[10px] text-slate-500">Auto-generated from your parsed position or type custom CS2 binds.</span>
                </div>
              </div>

            </div>
          </div>

          <!-- TAB 3: IN-GAME SCREENSHOTS -->
          <div v-show="activeTab === 'screenshots'" class="flex flex-col gap-5 animate-fade-in">
            
            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-300">
              <div class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Tip:</strong> You can directly press <kbd class="px-1.5 py-0.5 bg-slate-900 border border-amber-500/40 rounded font-mono text-white text-[10px]">Ctrl + V</kbd> anywhere on this screen to paste an in-game screenshot from your clipboard!
                </span>
              </div>
            </div>

            <!-- 3 SLOTS: AIM, STANDING, LANDING -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <!-- SLOT 1: AIM / CROSSHAIR ALIGNMENT -->
              <div 
                @dragover.prevent 
                @drop="handleDrop($event, 'aim')"
                class="flex flex-col gap-2 p-3.5 bg-slate-950 border-2 border-dashed rounded-2xl transition-all"
                :class="formData.aimScreenshot ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800 hover:border-amber-500/50'"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Crosshair class="w-3.5 h-3.5 text-amber-400" />
                    <span>Crosshair / Aim Spot *</span>
                  </span>
                  <span v-if="formData.aimScreenshot" class="text-[10px] text-emerald-400 font-bold">Uploaded</span>
                </div>

                <!-- PREVIEW OR DROPZONE -->
                <div v-if="formData.aimScreenshot" class="relative aspect-video w-full rounded-xl overflow-hidden group border border-slate-800">
                  <img :src="formData.aimScreenshot" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      type="button" 
                      @click="selectedImagePreview = formData.aimScreenshot" 
                      class="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      @click="formData.aimScreenshot = ''; formData.imageUrl = ''" 
                      class="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <label v-else class="aspect-video w-full border border-slate-800 hover:border-amber-500/60 rounded-xl flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors">
                  <Upload class="w-6 h-6 text-slate-500" />
                  <span class="text-[11px] font-bold text-slate-300">Drop or Paste Aim Screenshot</span>
                  <span class="text-[9px] text-slate-500">Ctrl+V or click to browse</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleFileInputChange($event, 'aim')" />
                </label>
              </div>

              <!-- SLOT 2: STANDING POSITION -->
              <div 
                @dragover.prevent 
                @drop="handleDrop($event, 'standing')"
                class="flex flex-col gap-2 p-3.5 bg-slate-950 border-2 border-dashed rounded-2xl transition-all"
                :class="formData.standingScreenshot ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800 hover:border-amber-500/50'"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <MapPin class="w-3.5 h-3.5 text-sky-400" />
                    <span>Standing / Feet Spot</span>
                  </span>
                  <span v-if="formData.standingScreenshot" class="text-[10px] text-emerald-400 font-bold">Uploaded</span>
                </div>

                <!-- PREVIEW OR DROPZONE -->
                <div v-if="formData.standingScreenshot" class="relative aspect-video w-full rounded-xl overflow-hidden group border border-slate-800">
                  <img :src="formData.standingScreenshot" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      type="button" 
                      @click="selectedImagePreview = formData.standingScreenshot" 
                      class="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      @click="formData.standingScreenshot = ''" 
                      class="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <label v-else class="aspect-video w-full border border-slate-800 hover:border-amber-500/60 rounded-xl flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors">
                  <Upload class="w-6 h-6 text-slate-500" />
                  <span class="text-[11px] font-bold text-slate-300">Drop Standing Screenshot</span>
                  <span class="text-[9px] text-slate-500">Wall/Corner position</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleFileInputChange($event, 'standing')" />
                </label>
              </div>

              <!-- SLOT 3: LANDING / RESULT -->
              <div 
                @dragover.prevent 
                @drop="handleDrop($event, 'landing')"
                class="flex flex-col gap-2 p-3.5 bg-slate-950 border-2 border-dashed rounded-2xl transition-all"
                :class="formData.landingScreenshot ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800 hover:border-amber-500/50'"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Sparkles class="w-3.5 h-3.5 text-rose-400" />
                    <span>Landing Result Spot</span>
                  </span>
                  <span v-if="formData.landingScreenshot" class="text-[10px] text-emerald-400 font-bold">Uploaded</span>
                </div>

                <!-- PREVIEW OR DROPZONE -->
                <div v-if="formData.landingScreenshot" class="relative aspect-video w-full rounded-xl overflow-hidden group border border-slate-800">
                  <img :src="formData.landingScreenshot" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      type="button" 
                      @click="selectedImagePreview = formData.landingScreenshot" 
                      class="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      @click="formData.landingScreenshot = ''" 
                      class="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 cursor-pointer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <label v-else class="aspect-video w-full border border-slate-800 hover:border-amber-500/60 rounded-xl flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors">
                  <Upload class="w-6 h-6 text-slate-500" />
                  <span class="text-[11px] font-bold text-slate-300">Drop Landing Result</span>
                  <span class="text-[9px] text-slate-500">Smoke bloom / fire spread</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleFileInputChange($event, 'landing')" />
                </label>
              </div>

            </div>

            <!-- OPTIONAL VIDEO / EXTERNAL IMAGE URL -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300 flex items-center gap-1.5">
                  <Video class="w-3.5 h-3.5 text-rose-400" />
                  <span>Video URL (YouTube Embed / MP4)</span>
                </label>
                <input 
                  v-model="formData.videoUrl" 
                  type="text" 
                  placeholder="https://www.youtube.com/embed/..." 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon class="w-3.5 h-3.5 text-sky-400" />
                  <span>External Image URL</span>
                </label>
                <input 
                  v-model="formData.imageUrl" 
                  type="text" 
                  placeholder="https://... image link" 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

          </div>

          <!-- TAB 4: INSTRUCTIONS & NOTES -->
          <div v-show="activeTab === 'guide'" class="flex flex-col gap-4 animate-fade-in">
            <!-- STEP BY STEP INSTRUCTIONS -->
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <label class="font-bold text-slate-300">Step-by-Step Instructions</label>
                <button 
                  type="button" 
                  @click="addInstructionStep"
                  class="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </div>

              <div 
                v-for="(step, idx) in formData.instructions" 
                :key="idx"
                class="flex items-center gap-2"
              >
                <span class="w-6 text-center font-mono font-bold text-slate-500">{{ idx + 1 }}.</span>
                <input 
                  v-model="formData.instructions[idx]" 
                  type="text" 
                  placeholder="e.g. Wedge yourself into the corner of the trash can..."
                  class="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
                <button 
                  type="button" 
                  @click="removeInstructionStep(idx)"
                  class="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- DESCRIPTION -->
            <div class="flex flex-col gap-1.5">
              <label class="font-bold text-slate-300">Description / Tactical Purpose</label>
              <textarea 
                v-model="formData.description" 
                rows="2"
                placeholder="Deep smoke that blocks snipers nest vision into Top Mid without gaps..."
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
              ></textarea>
            </div>

            <!-- TAGS & DIFFICULTY -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Tags (comma separated)</label>
                <input 
                  v-model="formData.tags" 
                  type="text" 
                  placeholder="Execute, Fast Mid, Default, Retake" 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Difficulty</label>
                <select 
                  v-model="formData.difficulty"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="easy">Easy (100% Consistent)</option>
                  <option value="medium">Medium (Requires specific lineup alignment)</option>
                  <option value="hard">Hard (Pixel-perfect / Running Jumpthrow)</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70">
          <!-- TEAM SHARING TOGGLE -->
          <button
            type="button"
            @click="formData.isTeamShared = !formData.isTeamShared"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border',
              formData.isTeamShared ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
            ]"
          >
            <Share2 v-if="formData.isTeamShared" class="w-3.5 h-3.5" />
            <Lock v-else class="w-3.5 h-3.5" />
            <span>{{ formData.isTeamShared ? 'Shared with Squad' : 'Private to Me' }}</span>
          </button>

          <div class="flex items-center gap-3">
            <button 
              type="button"
              @click="lineupStore.isAddModalOpen = false"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button"
              @click="handleSave"
              class="flex items-center gap-1.5 px-5 py-2 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer hover:opacity-90"
              :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
            >
              <Check class="w-4 h-4 stroke-[3]" />
              <span>Save Lineup</span>
            </button>
          </div>
        </div>

      </div>

      <!-- FULL-SCREEN IMAGE PREVIEW LIGHTBOX -->
      <div 
        v-if="selectedImagePreview" 
        class="fixed inset-0 z-[100000] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        @click="selectedImagePreview = null"
      >
        <div class="relative max-w-4xl max-h-[90vh]">
          <img :src="selectedImagePreview" class="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
          <button 
            @click="selectedImagePreview = null"
            class="absolute top-2 right-2 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>
  </Teleport>
</template>
