<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import { useAuthStore } from '../../stores/authStore'
import axios from 'axios'
import { 
  Gamepad2, 
  Wifi, 
  MapPin, 
  Crosshair, 
  Copy, 
  Check, 
  X, 
  RefreshCw, 
  Sparkles, 
  Terminal,
  Send
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'lineupCreated'): void
}>()

const mapStore = useMapStore()
const lineupStore = useLineupStore()
const authStore = useAuthStore()

const serverForm = reactive({
  host: localStorage.getItem('cs2_rcon_host') || '127.0.0.1',
  port: localStorage.getItem('cs2_rcon_port') || '27015',
  password: localStorage.getItem('cs2_rcon_pass') || '',
  rawPosInput: ''
})

const isConnecting = ref(false)
const connectionStatus = ref<'idle' | 'connected' | 'error'>('idle')
const connectionMessage = ref('')
const isFetchingPos = ref(false)
const isExecuting = ref(false)
const consoleLog = ref('')
const isCopied = ref(false)

const fetchedPosition = ref<{
  worldCoords: { x: number; y: number; z: number }
  angles: { pitch: number; yaw: number; roll: number }
  radarCoords: { x: number; y: number }
  mapName: string
  setposCommand: string
  setangCommand: string
  consoleCommand: string
} | null>(null)

const selectedNadeType = ref<'smoke' | 'flash' | 'molotov' | 'he'>('smoke')
const lineupTitle = ref('')
const lineupLocation = ref('')

async function testConnection() {
  isConnecting.value = true
  connectionStatus.value = 'idle'
  connectionMessage.value = ''

  localStorage.setItem('cs2_rcon_host', serverForm.host)
  localStorage.setItem('cs2_rcon_port', serverForm.port)
  localStorage.setItem('cs2_rcon_pass', serverForm.password)

  try {
    const res = await axios.post('/api/cs2/rcon-exec', {
      host: serverForm.host,
      port: serverForm.port,
      password: serverForm.password,
      command: 'echo "[CS2Nades] Connection verified successfully!"'
    })
    connectionStatus.value = 'connected'
    connectionMessage.value = '✓ Connected to CS2 Server'
    consoleLog.value = res.data.response || 'CS2 Server Ready'
  } catch (err: any) {
    connectionStatus.value = 'error'
    connectionMessage.value = err.response?.data?.error || 'Connection timed out. Check IP/Port/Password'
  } finally {
    isConnecting.value = false
  }
}

async function fetchPlayerPosition() {
  isFetchingPos.value = true
  try {
    const res = await axios.post('/api/cs2/fetch-pos', {
      host: serverForm.host,
      port: serverForm.port,
      password: serverForm.password,
      rawPosInput: serverForm.rawPosInput,
      mapName: mapStore.currentMapId
    })
    fetchedPosition.value = res.data
    if (res.data.mapName && res.data.mapName !== mapStore.currentMapId) {
      mapStore.setMap(res.data.mapName)
    }
    if (!lineupTitle.value) {
      lineupTitle.value = `CS2 Live ${selectedNadeType.value.toUpperCase()} Lineup`
    }
    consoleLog.value = `[Captured Live Coordinates]\n${res.data.consoleCommand}\nRadar Coords: ${res.data.radarCoords.x}%, ${res.data.radarCoords.y}%`
  } catch (err: any) {
    consoleLog.value = `Failed to fetch position: ${err.message}`
  } finally {
    isFetchingPos.value = false
  }
}

async function handlePushTeleport() {
  if (!fetchedPosition.value) return
  isExecuting.value = true
  try {
    const res = await axios.post('/api/cs2/push-lineup', {
      host: serverForm.host,
      port: serverForm.port,
      password: serverForm.password,
      consoleCommand: fetchedPosition.value.consoleCommand,
      nadeType: selectedNadeType.value
    })
    consoleLog.value = res.data.response || 'Player teleported and grenade equipped in CS2!'
  } catch (e: any) {
    consoleLog.value = `Teleport error: ${e.message}`
  } finally {
    isExecuting.value = false
  }
}

async function handleExecutePracticeConfig() {
  isExecuting.value = true
  const pracCmd = 'sv_cheats 1; sv_infinite_ammo 1; sv_grenade_trajectory_prac_pipreview 1; sv_showimpacts 1; mp_roundtime_defuse 60; mp_buy_anywhere 1; mp_buytime 9999; mp_restartgame 1'
  try {
    const res = await axios.post('/api/cs2/rcon-exec', {
      host: serverForm.host,
      port: serverForm.port,
      password: serverForm.password,
      command: pracCmd
    })
    consoleLog.value = `[Practice Mode Enabled]\n${res.data.response}`
  } catch (e: any) {
    consoleLog.value = `Practice config error: ${e.message}`
  } finally {
    isExecuting.value = false
  }
}

function handleCreateLineupDirectly() {
  if (!fetchedPosition.value) return

  const newL = lineupStore.addLineup({
    title: lineupTitle.value || `Direct CS2 ${selectedNadeType.value.toUpperCase()} Lineup`,
    mapId: mapStore.currentMapId,
    grenadeType: selectedNadeType.value,
    side: 'all',
    startLocation: lineupLocation.value || 'Player Position',
    endLocation: 'Site Breach',
    difficulty: 'medium',
    throwType: 'jumpthrow',
    tickrate: 'cs2_subtick',
    tags: ['cs2-rcon', selectedNadeType.value],
    originCoords: fetchedPosition.value.radarCoords,
    landingCoords: { 
      x: Math.round((fetchedPosition.value.radarCoords.x + 15) * 10) / 10, 
      y: Math.round((fetchedPosition.value.radarCoords.y - 15) * 10) / 10 
    },
    consoleCommand: fetchedPosition.value.consoleCommand,
    description: `Directly captured from CS2 server. ${fetchedPosition.value.consoleCommand}`,
    instructions: [
      `Execute in CS2 console: ${fetchedPosition.value.consoleCommand}`,
      `Align crosshair and perform ${selectedNadeType.value} throw.`
    ],
    authorName: authStore.currentUser?.username || 'CS2 Player'
  })

  emit('lineupCreated')
  emit('close')
  lineupStore.openLineup(newL)
}

function handleCopyConsoleCommand() {
  if (!fetchedPosition.value) return
  navigator.clipboard.writeText(fetchedPosition.value.consoleCommand)
  isCopied.value = true
  setTimeout(() => { isCopied.value = false }, 2000)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex justify-center items-center animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        <!-- HEADER -->
        <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
              <Gamepad2 class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black uppercase text-white tracking-wide">CS2 Server Lineup Ingestion</h2>
                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  Direct Live Sync
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Connect directly to your CS2 Practice Server via RCON or paste setpos to auto-capture lineups
              </p>
            </div>
          </div>
          <button @click="emit('close')" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- BODY -->
        <div class="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          <!-- SECTION 1: SERVER CONNECTION SETTINGS -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                <Wifi class="w-3.5 h-3.5 text-amber-400" />
                Server Connection (RCON / Netcon)
              </span>
              <span v-if="connectionMessage" :class="connectionStatus === 'connected' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'">
                {{ connectionMessage }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase">Server IP / Host</label>
                <input
                  v-model="serverForm.host"
                  type="text"
                  placeholder="127.0.0.1"
                  class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase">Port (Default: 27015)</label>
                <input
                  v-model="serverForm.port"
                  type="text"
                  placeholder="27015"
                  class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase">RCON Password</label>
                <input
                  v-model="serverForm.password"
                  type="password"
                  placeholder="rcon_password"
                  class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button
                @click="testConnection"
                :disabled="isConnecting"
                class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw :class="['w-3.5 h-3.5 text-amber-400', isConnecting ? 'animate-spin' : '']" />
                <span>{{ isConnecting ? 'Testing...' : 'Test Connection' }}</span>
              </button>

              <button
                @click="handleExecutePracticeConfig"
                :disabled="isExecuting"
                class="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Terminal class="w-3.5 h-3.5" />
                <span>Enable Practice Mode (sv_cheats 1)</span>
              </button>
            </div>
          </div>

          <!-- SECTION 2: LIVE POSITION CAPTURE -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                <Crosshair class="w-3.5 h-3.5 text-amber-400" />
                Capture Standing Position & Crosshair Pitch/Yaw
              </span>
              <span class="text-[10px] text-slate-400 font-mono">
                Map: <strong class="text-amber-400 uppercase">{{ mapStore.currentMapId }}</strong>
              </span>
            </div>

            <!-- MANUAL PASTE FALLBACK -->
            <div class="flex flex-col gap-1">
              <label class="text-[10px] text-slate-400 font-bold uppercase">
                Paste CS2 Console Output (or click Fetch from Live Server):
              </label>
              <div class="flex gap-2">
                <input
                  v-model="serverForm.rawPosInput"
                  type="text"
                  placeholder="setpos -1450.25 210.50 -120.00; setang 12.50 -89.40 0.00"
                  class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
                <button
                  @click="fetchPlayerPosition"
                  :disabled="isFetchingPos"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <RefreshCw :class="['w-3.5 h-3.5', isFetchingPos ? 'animate-spin' : '']" />
                  <span>Fetch Position</span>
                </button>
              </div>
            </div>

            <!-- CAPTURED POSITION PREVIEW -->
            <div v-if="fetchedPosition" class="p-3.5 bg-slate-900 border border-amber-500/40 rounded-xl flex flex-col gap-2.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-amber-400 flex items-center gap-1">
                  <MapPin class="w-4 h-4 text-emerald-400" />
                  Live Position Captured
                </span>
                <span class="text-[10px] font-mono text-slate-300">
                  Radar Pin: X={{ fetchedPosition.radarCoords.x }}%, Y={{ fetchedPosition.radarCoords.y }}%
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">World X:</span>
                  <strong class="text-white">{{ fetchedPosition.worldCoords.x.toFixed(1) }}</strong>
                </div>
                <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">World Y:</span>
                  <strong class="text-white">{{ fetchedPosition.worldCoords.y.toFixed(1) }}</strong>
                </div>
                <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Pitch:</span>
                  <strong class="text-amber-400">{{ fetchedPosition.angles.pitch.toFixed(1) }}°</strong>
                </div>
                <div class="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span class="text-[9px] text-slate-500 block">Yaw:</span>
                  <strong class="text-amber-400">{{ fetchedPosition.angles.yaw.toFixed(1) }}°</strong>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 pt-1">
                <button
                  @click="handleCopyConsoleCommand"
                  class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Check v-if="isCopied" class="w-3 h-3 text-emerald-400" />
                  <Copy v-else class="w-3 h-3" />
                  <span>{{ isCopied ? 'Command Copied!' : 'Copy setpos; setang' }}</span>
                </button>

                <button
                  @click="handlePushTeleport"
                  :disabled="isExecuting"
                  class="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Send class="w-3 h-3" />
                  <span>Teleport in CS2 Now</span>
                </button>
              </div>
            </div>
          </div>

          <!-- SECTION 3: 1-CLICK CREATE LINEUP -->
          <div v-if="fetchedPosition" class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3">
            <span class="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-amber-400" />
              Save Directly into Stratbook Lineups
            </span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase">Lineup Title</label>
                <input
                  v-model="lineupTitle"
                  type="text"
                  placeholder="e.g. A Site Connector Smoke"
                  class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase">Standing Location Callout</label>
                <input
                  v-model="lineupLocation"
                  type="text"
                  placeholder="e.g. T Roof / Palace / Banana"
                  class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <!-- GRENADE TYPE -->
            <div class="flex items-center gap-2 pt-1">
              <span class="text-[10px] font-bold text-slate-400 uppercase">Nade Type:</span>
              <div class="flex gap-1.5">
                <button
                  type="button"
                  @click="selectedNadeType = 'smoke'"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                    selectedNadeType === 'smoke' ? 'bg-slate-700 text-white border-slate-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                  ]"
                >
                  Smoke
                </button>
                <button
                  type="button"
                  @click="selectedNadeType = 'flash'"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                    selectedNadeType === 'flash' ? 'bg-amber-500 text-slate-950 font-black border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                  ]"
                >
                  Flash
                </button>
                <button
                  type="button"
                  @click="selectedNadeType = 'molotov'"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                    selectedNadeType === 'molotov' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                  ]"
                >
                  Molotov
                </button>
              </div>
            </div>

            <button
              @click="handleCreateLineupDirectly"
              class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg mt-2"
            >
              ✓ Create & Save Lineup from CS2 Server
            </button>
          </div>

          <!-- SERVER CONSOLE LOG -->
          <div v-if="consoleLog" class="p-3 bg-black/80 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
            <span class="text-[9px] text-slate-500 block mb-1 uppercase font-bold">Server Console Output:</span>
            {{ consoleLog }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
