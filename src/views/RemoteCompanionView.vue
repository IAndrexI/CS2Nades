<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMapStore } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import { useThemeStore } from '../stores/themeStore'
import { useCompanionStore } from '../stores/companionStore'
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
  Gamepad2
} from 'lucide-vue-next'

const route = useRoute()
const mapStore = useMapStore()
const lineupStore = useLineupStore()
const themeStore = useThemeStore()
const companionStore = useCompanionStore()

const inputPairCode = ref<string>('')
const selectedTab = ref<'lineups' | 'maps' | 'voice'>('lineups')
const searchQuery = ref<string>('')
const selectedNadeFilter = ref<GrenadeType | 'all'>('all')
const selectedSideFilter = ref<TeamSide>('all')
const copiedCommandId = ref<string | null>(null)

// Voice Recognition State
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
})

onUnmounted(() => {
  if (recognition) {
    recognition.abort()
  }
})

function handleConnect() {
  if (!inputPairCode.value.trim()) return
  companionStore.connectAsPhone(inputPairCode.value.trim(), navigator.userAgent.includes('iPhone') ? 'iPhone' : navigator.userAgent.includes('Android') ? 'Android' : 'Mobile Phone')
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
      matchedAction = {
        type: 'select_lineup',
        payload: { lineupId: bestMatch.id },
        description: `Launched: ${bestMatch.title} (${bestMatch.grenadeType.toUpperCase()})`
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
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none pb-24">
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

      <!-- PAIRING CODE INPUT -->
      <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
        <input 
          v-model="inputPairCode"
          placeholder="Code"
          class="w-16 bg-transparent text-center font-mono font-black text-xs text-amber-400 uppercase focus:outline-none"
          maxlength="6"
          @keyup.enter="handleConnect"
        />
        <button 
          @click="handleConnect"
          class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg transition-colors cursor-pointer"
        >
          Join
        </button>
      </div>
    </header>

    <!-- MAIN BODY -->
    <main class="flex-1 p-3 flex flex-col gap-3 max-w-lg mx-auto w-full">
      
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
            <span>Close Desktop Modal</span>
          </button>
        </div>

        <div v-if="activeLineups.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            v-for="l in activeLineups"
            :key="l.id"
            @click="handleSelectLineup(l)"
            class="p-3 bg-slate-900 hover:bg-slate-850 active:scale-[0.98] border border-slate-800 hover:border-amber-500/60 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer shadow group"
          >
            <div class="flex items-center gap-2.5 min-w-0">
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

            <!-- TELEPORT COPY BUTTON -->
            <button
              v-if="l.consoleCommand"
              @click.stop="copyTeleportCommand(l)"
              class="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-amber-400 shrink-0 transition-colors cursor-pointer"
              title="Copy Teleport Command"
            >
              <Check v-if="copiedCommandId === l.id" class="w-3.5 h-3.5 text-emerald-400" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div v-else class="p-8 text-center bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col items-center gap-2">
          <span class="text-sm text-slate-400 font-bold">No lineups found</span>
          <span class="text-xs text-slate-500">Try changing map or clearing search query.</span>
        </div>
      </div>

    </main>

    <!-- BOTTOM FLOATING STATUS BAR -->
    <footer class="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3 flex items-center justify-between text-xs z-30">
      <div class="flex items-center gap-2">
        <span 
          class="w-2.5 h-2.5 rounded-full"
          :class="companionStore.isPaired ? 'bg-emerald-400' : 'bg-rose-500'"
        ></span>
        <span class="text-slate-300 font-medium text-[11px]">
          {{ companionStore.isPaired ? 'Real-Time Sync Active' : 'Connecting to Desktop...' }}
        </span>
      </div>

      <button
        @click="handleCloseLineup"
        class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
      >
        Clear Screen
      </button>
    </footer>
  </div>
</template>
