<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMapStore } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import { useThemeStore } from '../stores/themeStore'
import { useCompanionStore } from '../stores/companionStore'
import { useGameRoomStore } from '../stores/gameRoomStore'
import NadeIcon from '../components/common/NadeIcon.vue'
import type { GrenadeType, TeamSide, Lineup } from '../types'
import { 
  Smartphone, 
  Mic, 
  MicOff, 
  Wifi, 
  WifiOff, 
  Radio, 
  Volume2, 
  Check, 
  Copy, 
  X, 
  Sliders, 
  Sparkles, 
  ChevronRight, 
  Search,
  RotateCcw,
  Zap,
  Gamepad2,
  Users,
  Send,
  Moon,
  Sun,
  Flame,
  LogOut,
  ArrowRight,
  Shield,
  Bell
} from 'lucide-vue-next'

const route = useRoute()
const mapStore = useMapStore()
const lineupStore = useLineupStore()
const themeStore = useThemeStore()
const companionStore = useCompanionStore()
const gameRoomStore = useGameRoomStore()

const inputPairCode = ref<string>('')
const inputSquadRoomCode = ref<string>('')
const isRoomModalOpen = ref<boolean>(false)
const searchQuery = ref<string>('')
const selectedNadeFilter = ref<GrenadeType | 'all'>('all')
const selectedSideFilter = ref<TeamSide>('all')
const copiedCommandId = ref<string | null>(null)
const broadcastSuccessId = ref<string | null>(null)

// ── PHONE INACTIVITY & SLEEP / STANDBY SYSTEM ───────────────
const isSleeping = ref<boolean>(false)
const sleepReason = ref<string>('')
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes idle
let inactivityTimeout: any = null

function resetInactivityTimer() {
  if (isSleeping.value) return // Don't reset if already sleeping
  if (inactivityTimeout) clearTimeout(inactivityTimeout)
  inactivityTimeout = setTimeout(() => {
    enterSleepMode('Auto-sleep due to 3 minutes of inactivity')
  }, INACTIVITY_TIMEOUT_MS)
}

function onUserInteraction() {
  if (!isSleeping.value) {
    resetInactivityTimer()
  }
}

function enterSleepMode(reason: string) {
  isSleeping.value = true
  sleepReason.value = reason
  companionStore.notifyPhoneSleep()
  if (recognition && isListening.value) {
    try { recognition.stop() } catch (e) {}
    isListening.value = false
  }
}

function wakeFromSleep() {
  isSleeping.value = false
  companionStore.notifyPhoneWake()
  
  // Reconnect to active squad room if was in one
  if (gameRoomStore.currentRoomCode) {
    const user = localStorage.getItem('cs2_stratbook_user') ? JSON.parse(localStorage.getItem('cs2_stratbook_user') || '{}') : null
    gameRoomStore.joinRoom(gameRoomStore.currentRoomCode, user)
  }
  
  resetInactivityTimer()
}

function handleVisibilityChange() {
  if (document.hidden) {
    enterSleepMode('Phone screen locked or switched tab')
  } else {
    wakeFromSleep()
  }
}

// ── VOICE RECOGNITION STATE ──────────────────────────────────
const isSpeechSupported = ref<boolean>(false)
const isListening = ref<boolean>(false)
const voiceTranscript = ref<string>('')
const voiceStatusMessage = ref<string>('Tap microphone and speak commands like "Mirage window smoke"')
const isVoiceSuccess = ref<boolean | null>(null)

let recognition: any = null

onMounted(() => {
  // Check pairing code from URL query param (?code=1234)
  const queryCode = route.query.code as string
  if (queryCode) {
    inputPairCode.value = queryCode.toUpperCase().trim()
    handleConnect()
  } else if (companionStore.pairingCode) {
    inputPairCode.value = companionStore.pairingCode
    handleConnect()
  }

  // Setup Web Speech Recognition
  setupSpeechRecognition()

  // Setup Inactivity & Sleep / Visibility Listeners
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('touchstart', onUserInteraction, { passive: true })
  window.addEventListener('pointerdown', onUserInteraction, { passive: true })
  window.addEventListener('keydown', onUserInteraction, { passive: true })
  resetInactivityTimer()
})

onUnmounted(() => {
  if (recognition) {
    try { recognition.abort() } catch (e) {}
  }
  if (inactivityTimeout) clearTimeout(inactivityTimeout)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('touchstart', onUserInteraction)
  window.removeEventListener('pointerdown', onUserInteraction)
  window.removeEventListener('keydown', onUserInteraction)
})

function handleConnect() {
  if (!inputPairCode.value.trim()) return
  companionStore.connectAsPhone(
    inputPairCode.value.trim(), 
    navigator.userAgent.includes('iPhone') ? 'iPhone' : navigator.userAgent.includes('Android') ? 'Android' : 'Mobile Phone'
  )
}

// ── TACTICAL SQUAD ROOM CREATION & MANAGEMENT ────────────────
function handleCreateTacticsRoom() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
  const mapPrefix = mapStore.currentMapId.slice(0, 3).toUpperCase()
  const generatedRoomCode = `${mapPrefix}-${randomSuffix}`
  
  const user = localStorage.getItem('cs2_stratbook_user') ? JSON.parse(localStorage.getItem('cs2_stratbook_user') || '{}') : { username: 'Mobile Commander' }
  gameRoomStore.joinRoom(generatedRoomCode, user)
  
  // Sync paired desktop to the exact same room
  companionStore.sendCommand('join_tactics_room', { roomCode: generatedRoomCode })
  isRoomModalOpen.value = false
}

function handleJoinTacticsRoom(codeToJoin?: string) {
  const code = (codeToJoin || inputSquadRoomCode.value).toUpperCase().trim()
  if (!code) return
  
  const user = localStorage.getItem('cs2_stratbook_user') ? JSON.parse(localStorage.getItem('cs2_stratbook_user') || '{}') : { username: 'Mobile Commander' }
  gameRoomStore.joinRoom(code, user)
  
  // Sync paired desktop to the exact same room
  companionStore.sendCommand('join_tactics_room', { roomCode: code })
  inputSquadRoomCode.value = ''
  isRoomModalOpen.value = false
}

function handleLeaveTacticsRoom() {
  gameRoomStore.leaveRoom()
}

function handleSyncDesktopToSquad() {
  if (gameRoomStore.currentRoomCode) {
    companionStore.sendCommand('join_tactics_room', { roomCode: gameRoomStore.currentRoomCode })
  }
}

// ── BROADCAST LINEUP TO SQUAD & DESKTOP ─────────────────────
function handleBroadcastLineupToSquad(lineup: Lineup) {
  // 1. Broadcast to Squad Room (if active)
  if (gameRoomStore.currentRoomCode) {
    gameRoomStore.pushLineup(lineup)
  }
  
  // 2. Send via Companion Relay to Desktop & Squad
  companionStore.sendCommand('broadcast_lineup', { lineup })
  companionStore.sendCommand('select_lineup', { lineupId: lineup.id })
  
  broadcastSuccessId.value = lineup.id
  setTimeout(() => {
    if (broadcastSuccessId.value === lineup.id) {
      broadcastSuccessId.value = null
    }
  }, 2200)
}

// ── AVAILABLE LINEUPS FOR ACTIVE MAP ─────────────────────────
const activeLineups = computed(() => {
  let list = lineupStore.allLineups.filter(l => l.mapId === mapStore.currentMapId)
  if (selectedNadeFilter.value !== 'all') {
    list = list.filter(l => l.grenadeType === selectedNadeFilter.value)
  }
  if (selectedSideFilter.value !== 'all') {
    list = list.filter(l => l.side === selectedSideFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(l => 
      l.title.toLowerCase().includes(q) ||
      l.startLocation.toLowerCase().includes(q) ||
      l.endLocation.toLowerCase().includes(q)
    )
  }
  return list
})

// ── REMOTE ACTIONS ──────────────────────────────────────────
function handleSelectMap(mapId: string) {
  mapStore.currentMapId = mapId
  companionStore.sendCommand('switch_map', { mapId })
  if (gameRoomStore.currentRoomCode) {
    gameRoomStore.switchMap(mapId)
  }
}

function handleSelectLineup(lineup: Lineup) {
  lineupStore.openLineup(lineup)
  companionStore.sendCommand('select_lineup', { lineupId: lineup.id })
}

function handleCloseLineup() {
  lineupStore.closeLineup()
  companionStore.sendCommand('close_lineup')
}

function handleFilterNade(type: GrenadeType | 'all') {
  selectedNadeFilter.value = type
  if (type === 'all') {
    companionStore.sendCommand('set_all_nades')
  } else {
    companionStore.sendCommand('filter_nade', { nadeType: type })
  }
}

function handleFilterSide(side: TeamSide) {
  selectedSideFilter.value = side
  companionStore.sendCommand('filter_side', { side })
}

async function copyTeleportCommand(lineup: Lineup) {
  if (!lineup.consoleCommand) return
  try {
    await navigator.clipboard.writeText(lineup.consoleCommand)
    copiedCommandId.value = lineup.id
    setTimeout(() => (copiedCommandId.value = null), 2000)
  } catch (e) {}
}

// ── SPEECH RECOGNITION & VOICE COMMAND PARSER ───────────────
function setupSpeechRecognition() {
  if (typeof window !== 'undefined') {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRec) {
      isSpeechSupported.value = true
      recognition = new SpeechRec()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        isListening.value = true
        voiceStatusMessage.value = 'Listening... Speak now!'
        isVoiceSuccess.value = null
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            voiceTranscript.value = event.results[i][0].transcript
            parseAndExecuteVoice(voiceTranscript.value)
          } else {
            interim += event.results[i][0].transcript
            voiceTranscript.value = interim
          }
        }
      }

      recognition.onerror = (event: any) => {
        isListening.value = false
        voiceStatusMessage.value = `Voice error: ${event.error}`
        isVoiceSuccess.value = false
      }

      recognition.onend = () => {
        isListening.value = false
      }
    }
  }
}

function toggleVoiceListening() {
  if (!recognition) return
  if (isListening.value) {
    recognition.stop()
    isListening.value = false
  } else {
    voiceTranscript.value = ''
    try {
      recognition.start()
    } catch (e) {
      recognition.stop()
      setTimeout(() => recognition.start(), 200)
    }
  }
}

function parseAndExecuteVoice(text: string) {
  const t = text.toLowerCase().trim()
  let matchedAction: any = null

  // 1. Detect Map intent
  const maps: Record<string, string> = {
    'mirage': 'mirage',
    'dust': 'dust2',
    'dust 2': 'dust2',
    'dust two': 'dust2',
    'inferno': 'inferno',
    'nuke': 'nuke',
    'ancient': 'ancient',
    'anubis': 'anubis',
    'vertigo': 'vertigo',
    'train': 'train',
    'overpass': 'overpass',
    'cache': 'cache'
  }

  let detectedMap: string | null = null
  for (const [key, mapId] of Object.entries(maps)) {
    if (t.includes(key)) {
      detectedMap = mapId
      break
    }
  }

  // 2. Detect Action: Close
  if (t.includes('close') || t.includes('exit') || t.includes('hide') || t.includes('dismiss')) {
    matchedAction = {
      type: 'close_lineup',
      description: 'Closed active lineup on desktop'
    }
    handleCloseLineup()
  }
  // 3. Detect Map Switch
  else if (detectedMap && (t.includes('switch') || t.includes('open') || t.includes('go to') || t === detectedMap || t.includes('map'))) {
    matchedAction = {
      type: 'switch_map',
      payload: { mapId: detectedMap },
      description: `Switched map to ${detectedMap.toUpperCase()}`
    }
    handleSelectMap(detectedMap)
  }
  // 4. Detect Specific Lineup / Callout Intent
  else {
    const targetMapId = detectedMap || mapStore.currentMapId
    const candidates = lineupStore.allLineups.filter(l => l.mapId === targetMapId)
    
    // Check if query matches title, end location or start location
    let bestMatch: Lineup | null = null
    for (const l of candidates) {
      const titleLower = l.title.toLowerCase()
      const endLower = l.endLocation.toLowerCase()
      const startLower = l.startLocation.toLowerCase()
      const nade = l.grenadeType.toLowerCase()

      if (t.includes(endLower) || t.includes(titleLower) || (t.includes(nade) && (t.includes(endLower) || t.includes(startLower)))) {
        bestMatch = l
        break
      }
    }

    if (bestMatch) {
      if (detectedMap) handleSelectMap(detectedMap)
      handleSelectLineup(bestMatch)
      if (gameRoomStore.currentRoomCode) {
        handleBroadcastLineupToSquad(bestMatch)
      }
      matchedAction = {
        type: 'select_lineup',
        payload: { lineupId: bestMatch.id },
        description: `Launched & Broadcast: ${bestMatch.title} (${bestMatch.grenadeType.toUpperCase()})`
      }
    } else if (detectedMap) {
      handleSelectMap(detectedMap)
      matchedAction = {
        type: 'switch_map',
        payload: { mapId: detectedMap },
        description: `Switched map to ${detectedMap.toUpperCase()}`
      }
    }
  }

  if (matchedAction) {
    isVoiceSuccess.value = true
    voiceStatusMessage.value = `🎯 ${matchedAction.description}`
    companionStore.sendVoiceCommand(text, matchedAction)
  } else {
    isVoiceSuccess.value = false
    voiceStatusMessage.value = `⚠️ Could not match: "${text}". Try "Mirage window smoke" or "Dust 2 xbox"`
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none pb-24 relative overflow-x-hidden">
    
    <!-- 💤 PHONE SLEEP / STANDBY OVERLAY (BATTERY & DATA SAVER) -->
    <Transition name="fade">
      <div 
        v-if="isSleeping"
        @click="wakeFromSleep"
        class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none"
      >
        <div class="relative mb-6">
          <div class="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
            <Moon class="w-10 h-10" />
          </div>
          <span class="absolute -top-1 -right-1 flex h-4 w-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        <h2 class="text-xl font-black text-white uppercase tracking-wider mb-2">
          Phone in Standby
        </h2>
        
        <p class="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
          {{ sleepReason || 'Connection suspended to preserve battery & bandwidth while phone is idle.' }}
        </p>

        <button 
          @click.stop="wakeFromSleep"
          class="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Zap class="w-4 h-4 fill-current" />
          <span>Tap Screen to Reconnect</span>
        </button>

        <span class="text-[10px] text-slate-600 font-mono mt-8">
          CS2 Tactical Companion • Auto-Reconnection Ready
        </span>
      </div>
    </Transition>

    <!-- TOP APP BAR -->
    <header class="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-3 flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-2">
        <div 
          class="p-2 rounded-xl flex items-center justify-center shadow"
          :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
        >
          <Smartphone class="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h1 class="text-xs font-black uppercase text-white tracking-wide flex items-center gap-1.5">
            <span>CS2 Deck Controller</span>
            <span 
              class="w-2 h-2 rounded-full"
              :class="companionStore.isPaired ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'"
            ></span>
          </h1>
          <span class="text-[10px] text-slate-400 font-mono">
            {{ companionStore.isPaired ? `Paired (Deck #${companionStore.pairingCode})` : 'Disconnected' }}
          </span>
        </div>
      </div>

      <!-- PAIRING CODE INPUT & SQUAD ROOM TOGGLE -->
      <div class="flex items-center gap-2">
        <button
          @click="isRoomModalOpen = true"
          :class="[
            'px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm',
            gameRoomStore.currentRoomCode 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'
          ]"
        >
          <Users class="w-3.5 h-3.5" />
          <span class="font-mono text-[11px] uppercase">
            {{ gameRoomStore.currentRoomCode || 'Squad' }}
          </span>
        </button>

        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
          <input 
            v-model="inputPairCode"
            placeholder="Code"
            class="w-14 bg-transparent text-center font-mono font-black text-xs text-amber-400 uppercase focus:outline-none"
            maxlength="6"
            @keyup.enter="handleConnect"
          />
          <button 
            @click="handleConnect"
            class="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg transition-colors cursor-pointer"
          >
            Join
          </button>
        </div>
      </div>
    </header>

    <!-- MAIN BODY -->
    <main class="flex-1 p-3 flex flex-col gap-3 max-w-lg mx-auto w-full">
      
      <!-- SQUAD LIVE BROADCAST BAR (ACTIVE ROOM NOTIFICATIONS) -->
      <div 
        v-if="gameRoomStore.currentRoomCode" 
        class="p-3 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-lg"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
            <Radio class="w-4 h-4 animate-pulse" />
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Squad Room: {{ gameRoomStore.currentRoomCode }}
              </span>
              <span class="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 font-mono text-[9px] rounded font-bold">
                {{ gameRoomStore.members.length }} Online
              </span>
            </div>
            <span class="text-[11px] text-slate-300 font-medium truncate">
              {{ gameRoomStore.activeBroadcastLineups.length ? `Latest: ${gameRoomStore.activeBroadcastLineups[gameRoomStore.activeBroadcastLineups.length - 1].title}` : 'Tap "Push to Squad" on any lineup to sync radar' }}
            </span>
          </div>
        </div>

        <button
          @click="handleSyncDesktopToSquad"
          class="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase rounded-xl transition-all shrink-0 cursor-pointer shadow"
          title="Sync Paired PC to this Room"
        >
          Sync PC
        </button>
      </div>

      <!-- VOICE COMMAND STRIP / BAR -->
      <div class="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 shadow-md">
        <button
          @click="toggleVoiceListening"
          :class="[
            'p-3 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-lg',
            isListening 
              ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/40' 
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          ]"
        >
          <Mic v-if="!isListening" class="w-5 h-5 stroke-[2.5]" />
          <MicOff v-else class="w-5 h-5 stroke-[2.5]" />
        </button>

        <div class="flex-1 min-w-0 flex flex-col">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-400">
              {{ isListening ? '🎙️ Listening to Voice...' : '🎙️ Voice Assistant' }}
            </span>
            <span v-if="voiceTranscript" class="text-[9px] font-mono text-slate-400 truncate max-w-[120px]">
              "{{ voiceTranscript }}"
            </span>
          </div>
          <span 
            :class="[
              'text-[11px] font-medium truncate mt-0.5',
              isVoiceSuccess === true ? 'text-emerald-400 font-bold' : isVoiceSuccess === false ? 'text-rose-400' : 'text-slate-300'
            ]"
          >
            {{ voiceStatusMessage }}
          </span>
        </div>
      </div>

      <!-- MAP SELECTOR HORIZONTAL CAROUSEL -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between px-1">
          <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Map:</span>
          <span class="text-xs font-mono font-bold text-amber-400 uppercase">{{ mapStore.currentMap.name }}</span>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            v-for="map in mapStore.availableMaps"
            :key="map.id"
            @click="handleSelectMap(map.id)"
            :class="[
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer shrink-0',
              mapStore.currentMapId === map.id 
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg scale-[1.02]' 
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            ]"
          >
            <img :src="map.icon" class="w-4 h-4 object-contain rounded" />
            <span>{{ map.name }}</span>
          </button>
        </div>
      </div>

      <!-- NADE FILTER PILLS -->
      <div class="grid grid-cols-5 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
        <button
          @click="handleFilterNade('all')"
          :class="[
            'py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer text-center',
            selectedNadeFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          ALL
        </button>
        <button
          @click="handleFilterNade('smoke')"
          :class="[
            'py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1',
            selectedNadeFilter === 'smoke' ? 'bg-slate-500/30 text-slate-300 border border-slate-500/50' : 'text-slate-400'
          ]"
        >
          <NadeIcon type="smoke" :size="12" />
          <span>SMOKE</span>
        </button>
        <button
          @click="handleFilterNade('flash')"
          :class="[
            'py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1',
            selectedNadeFilter === 'flash' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 'text-slate-400'
          ]"
        >
          <NadeIcon type="flash" :size="12" />
          <span>FLASH</span>
        </button>
        <button
          @click="handleFilterNade('molotov')"
          :class="[
            'py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1',
            selectedNadeFilter === 'molotov' ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'text-slate-400'
          ]"
        >
          <NadeIcon type="molotov" :size="12" />
          <span>MOLO</span>
        </button>
        <button
          @click="handleFilterNade('he')"
          :class="[
            'py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1',
            selectedNadeFilter === 'he' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'text-slate-400'
          ]"
        >
          <NadeIcon type="he" :size="12" />
          <span>HE</span>
        </button>
      </div>

      <!-- SEARCH BAR -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          v-model="searchQuery"
          placeholder="Filter lineups (e.g. Window, Stairs, Connector)..."
          class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      <!-- LINEUPS TOUCH DECK GRID -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Lineups ({{ activeLineups.length }})
          </span>
          <button
            @click="handleCloseLineup"
            class="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X class="w-3 h-3" />
            <span>Close Modal on PC</span>
          </button>
        </div>

        <div v-if="activeLineups.length" class="grid grid-cols-1 gap-2.5">
          <div
            v-for="l in activeLineups"
            :key="l.id"
            @click="handleSelectLineup(l)"
            class="p-3 bg-slate-900 hover:bg-slate-850 active:scale-[0.99] border border-slate-800 hover:border-amber-500/60 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer shadow group"
          >
            <!-- LINEUP INFO -->
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="p-2 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                <NadeIcon :type="l.grenadeType" :size="20" :filled="true" />
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-xs text-white truncate group-hover:text-amber-400 transition-colors">
                  {{ l.title }}
                </span>
                <span class="text-[10px] text-slate-400 truncate">
                  {{ l.startLocation }} → {{ l.endLocation }}
                </span>
              </div>
            </div>

            <!-- ACTION BUTTONS: BROADCAST TO SQUAD + COPY TELEPORT -->
            <div class="flex items-center gap-1.5 shrink-0" @click.stop>
              <!-- BROADCAST TO SQUAD -->
              <button
                @click="handleBroadcastLineupToSquad(l)"
                :class="[
                  'px-2.5 py-1.5 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1 transition-all cursor-pointer border shadow',
                  broadcastSuccessId === l.id 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 scale-105' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                ]"
                title="Broadcast Lineup to Squad Room"
              >
                <Check v-if="broadcastSuccessId === l.id" class="w-3 h-3 stroke-[3]" />
                <Send v-else class="w-3 h-3" />
                <span>{{ broadcastSuccessId === l.id ? 'Broadcasted' : 'Squad' }}</span>
              </button>

              <!-- TELEPORT COPY BUTTON -->
              <button
                v-if="l.consoleCommand"
                @click="copyTeleportCommand(l)"
                class="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-amber-400 transition-colors cursor-pointer"
                title="Copy Teleport Command"
              >
                <Check v-if="copiedCommandId === l.id" class="w-3.5 h-3.5 text-emerald-400" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="p-8 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col items-center gap-2">
          <span class="text-sm text-slate-400 font-bold">No lineups found</span>
          <span class="text-xs text-slate-500">Try changing map or clearing search query.</span>
        </div>
      </div>

    </main>

    <!-- SQUAD ROOM CREATION / JOIN MODAL -->
    <Transition name="fade">
      <div 
        v-if="isRoomModalOpen"
        class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="isRoomModalOpen = false"
      >
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl flex flex-col gap-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <Users class="w-5 h-5 text-emerald-400" />
              <h2 class="text-sm font-black text-white uppercase tracking-wider">
                Tactical Squad Room
              </h2>
            </div>
            <button 
              @click="isRoomModalOpen = false" 
              class="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- CURRENT ROOM INFO IF ACTIVE -->
          <div v-if="gameRoomStore.currentRoomCode" class="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-300 font-bold">Active Room:</span>
              <span class="text-sm font-mono font-black text-emerald-400">{{ gameRoomStore.currentRoomCode }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400">
              <span>Members in Room:</span>
              <span class="font-bold text-white">{{ gameRoomStore.members.length }}</span>
            </div>

            <div class="flex items-center gap-2 mt-2">
              <button
                @click="handleSyncDesktopToSquad"
                class="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow"
              >
                Sync PC to Room
              </button>
              <button
                @click="handleLeaveTacticsRoom"
                class="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>

          <!-- CREATE OR JOIN NEW ROOM -->
          <div v-else class="flex flex-col gap-3">
            <button
              @click="handleCreateTacticsRoom"
              class="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap class="w-4 h-4 fill-current" />
              <span>Create New Squad Room</span>
            </button>

            <div class="flex items-center gap-2 my-1">
              <div class="h-px bg-slate-800 flex-1"></div>
              <span class="text-[10px] font-mono text-slate-500 uppercase">Or Join Room</span>
              <div class="h-px bg-slate-800 flex-1"></div>
            </div>

            <div class="flex items-center gap-2">
              <input 
                v-model="inputSquadRoomCode"
                placeholder="Enter Code (e.g. MIR-4821)"
                class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 uppercase placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                @keyup.enter="handleJoinTacticsRoom()"
              />
              <button
                @click="handleJoinTacticsRoom()"
                class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Join
              </button>
            </div>
          </div>

          <span class="text-[10px] text-slate-500 text-center">
            Creating or joining a room syncs your phone and PC into the live tactical radar.
          </span>
        </div>
      </div>
    </Transition>

    <!-- BOTTOM FLOATING STATUS BAR -->
    <footer class="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 flex items-center justify-between text-xs z-30">
      <div class="flex items-center gap-2">
        <span 
          class="w-2.5 h-2.5 rounded-full"
          :class="companionStore.isPaired ? 'bg-emerald-400' : 'bg-rose-500'"
        ></span>
        <span class="text-slate-300 font-medium text-[11px]">
          {{ companionStore.isPaired ? 'Sync Active' : 'Connecting...' }}
        </span>
        <span v-if="gameRoomStore.currentRoomCode" class="text-emerald-400 font-mono text-[10px] font-bold">
          • Room {{ gameRoomStore.currentRoomCode }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="enterSleepMode('Manual standby')"
          class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded-xl transition-colors cursor-pointer"
          title="Put Phone in Sleep / Standby"
        >
          <Moon class="w-3.5 h-3.5" />
        </button>

        <button
          @click="handleCloseLineup"
          class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
        >
          Clear Screen
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
