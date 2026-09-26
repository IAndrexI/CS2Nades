<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMapStore } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import { useGameRoomStore } from '../stores/gameRoomStore'
import { useThemeStore } from '../stores/themeStore'
import NadeIcon from '../components/common/NadeIcon.vue'
import type { GrenadeType, TeamSide, Lineup } from '../types'
import { 
  Crosshair, 
  MapPin, 
  Copy, 
  Check, 
  Sliders, 
  Minimize2, 
  Maximize2, 
  Radio, 
  Search, 
  Sparkles, 
  Terminal, 
  Users, 
  Eye, 
  EyeOff, 
  Layers, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  X,
  ExternalLink,
  Shield,
  Zap,
  ArrowRight
} from 'lucide-vue-next'

const route = useRoute()
const mapStore = useMapStore()
const lineupStore = useLineupStore()
const gameRoomStore = useGameRoomStore()
const themeStore = useThemeStore()

// ── OVERLAY CONFIGURATION & STATE ─────────────────────────────
const hudOpacity = ref<number>(90)
const isCompactMode = ref<boolean>(false)
const isSoundEnabled = ref<boolean>(true)
const activeTab = ref<'radar' | 'lineups' | 'squad'>('lineups')
const searchQuery = ref<string>('')
const selectedNadeFilter = ref<GrenadeType | 'all'>('all')
const selectedSiteFilter = ref<'all' | 'A' | 'B' | 'Mid'>('all')

const copiedCommandId = ref<string | null>(null)
const selectedLineup = ref<Lineup | null>(null)
const selectedScreenshot = ref<string | null>(null)

// Current map radar
const currentMapInfo = computed(() => {
  return mapStore.currentMap
})

// Filtered lineups for overlay
const overlayLineups = computed(() => {
  let list = lineupStore.allLineups.filter(l => l.mapId === mapStore.currentMapId)
  if (selectedNadeFilter.value !== 'all') {
    list = list.filter(l => l.grenadeType === selectedNadeFilter.value)
  }
  if (selectedSiteFilter.value !== 'all') {
    list = list.filter(l => l.site === selectedSiteFilter.value)
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

// Auto-select first lineup if none selected
watch(overlayLineups, (list) => {
  if (list.length && (!selectedLineup.value || !list.some(l => l.id === selectedLineup.value?.id))) {
    selectedLineup.value = list[0]
  }
}, { immediate: true })

// ── COPY TELEPORT BIND ───────────────────────────────────────
async function copyTeleport(lineup: Lineup) {
  if (!lineup.consoleCommand) return
  try {
    await navigator.clipboard.writeText(lineup.consoleCommand)
    copiedCommandId.value = lineup.id
    setTimeout(() => {
      if (copiedCommandId.value === lineup.id) copiedCommandId.value = null
    }, 2000)
  } catch (e) {}
}

// ── HOTKEY LISTENER IN OVERLAY WINDOW ─────────────────────────
function handleKeyDown(e: KeyboardEvent) {
  // Number keys 1-9 to quickly select lineup
  if (e.key >= '1' && e.key <= '9' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
    const idx = parseInt(e.key) - 1
    if (idx < overlayLineups.value.length) {
      selectedLineup.value = overlayLineups.value[idx]
      copyTeleport(selectedLineup.value)
    }
  }
  // Key 'c' to copy active lineup command
  if ((e.key === 'c' || e.key === 'C') && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) && selectedLineup.value) {
    copyTeleport(selectedLineup.value)
  }
  // Key 'Tab' or 'Space' to toggle between radar and lineup list
  if (e.key === ' ' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
    e.preventDefault()
    activeTab.value = activeTab.value === 'lineups' ? 'radar' : 'lineups'
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  // Join room if query param exists (?room=MIR-1234)
  const queryRoom = route.query.room as string
  if (queryRoom) {
    const user = localStorage.getItem('cs2_stratbook_user') ? JSON.parse(localStorage.getItem('cs2_stratbook_user') || '{}') : { username: 'Overlay Player' }
    gameRoomStore.joinRoom(queryRoom, user)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div 
    class="min-h-screen text-slate-100 flex flex-col font-sans select-none overflow-hidden transition-opacity duration-150"
    :style="{ 
      opacity: hudOpacity / 100,
      backgroundColor: 'rgba(2, 6, 23, 0.92)' 
    }"
  >
    
    <!-- TOP COMPACT DRAGGABLE HUD BAR -->
    <header class="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 p-2.5 flex items-center justify-between shadow-xl shrink-0">
      <div class="flex items-center gap-2">
        <div class="p-1.5 bg-amber-500 text-slate-950 rounded-lg shadow font-black text-xs flex items-center gap-1">
          <Crosshair class="w-3.5 h-3.5 stroke-[3]" />
          <span>CS2 HUD</span>
        </div>

        <!-- MAP SELECTOR DROPDOWN -->
        <select 
          v-model="mapStore.currentMapId"
          class="bg-slate-900 border border-slate-700 text-amber-400 font-black text-xs uppercase rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option v-for="m in mapStore.availableMaps" :key="m.id" :value="m.id">
            {{ m.name }}
          </option>
        </select>

        <!-- SQUAD ROOM BADGE -->
        <span 
          v-if="gameRoomStore.currentRoomCode" 
          class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-mono font-bold flex items-center gap-1"
        >
          <Radio class="w-2.5 h-2.5 animate-pulse" />
          <span>{{ gameRoomStore.currentRoomCode }}</span>
        </span>
      </div>

      <!-- CONTROLS: OPACITY SLIDER & COMPACT TOGGLE -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5" title="Overlay Opacity">
          <Sliders class="w-3 h-3 text-slate-400" />
          <input 
            v-model.number="hudOpacity" 
            type="range" 
            min="30" 
            max="100" 
            step="5" 
            class="w-14 accent-amber-500 cursor-pointer"
          />
          <span class="text-[10px] font-mono text-slate-400 w-6 text-right">{{ hudOpacity }}%</span>
        </div>

        <button 
          @click="isCompactMode = !isCompactMode"
          class="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          :title="isCompactMode ? 'Expand HUD' : 'Collapse to Mini-Bar'"
        >
          <Maximize2 v-if="isCompactMode" class="w-3.5 h-3.5" />
          <Minimize2 v-else class="w-3.5 h-3.5" />
        </button>
      </div>
    </header>

    <!-- COMPACT MINI-BAR MODE -->
    <div v-if="isCompactMode" class="p-3 flex items-center justify-between text-xs bg-slate-950/80">
      <div class="flex items-center gap-2">
        <span class="font-bold text-amber-400 uppercase">{{ currentMapInfo.name }}</span>
        <span class="text-slate-500">•</span>
        <span class="text-slate-300">{{ overlayLineups.length }} Lineups Loaded</span>
      </div>
      <button 
        @click="isCompactMode = false"
        class="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-[10px] uppercase rounded-md cursor-pointer hover:bg-amber-400"
      >
        Open Lineups
      </button>
    </div>

    <!-- FULL HUD MODE -->
    <div v-else class="flex-1 flex flex-col min-h-0 overflow-hidden">
      
      <!-- SUB-NAV / TAB SWITCHER -->
      <div class="flex items-center justify-between px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/80 text-xs shrink-0">
        <div class="flex items-center gap-1">
          <button 
            @click="activeTab = 'lineups'"
            :class="[
              'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1',
              activeTab === 'lineups' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            <Crosshair class="w-3 h-3" />
            <span>Lineups ({{ overlayLineups.length }})</span>
          </button>

          <button 
            @click="activeTab = 'radar'"
            :class="[
              'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1',
              activeTab === 'radar' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            <MapPin class="w-3 h-3" />
            <span>Live Radar</span>
          </button>

          <button 
            @click="activeTab = 'squad'"
            :class="[
              'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1',
              activeTab === 'squad' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            <Users class="w-3 h-3" />
            <span>Squad Calls</span>
            <span v-if="gameRoomStore.activeBroadcastLineups.length" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
        </div>

        <!-- SITE FILTER PILLS -->
        <div class="flex items-center gap-1 text-[10px] font-bold">
          <button 
            @click="selectedSiteFilter = 'all'"
            :class="selectedSiteFilter === 'all' ? 'text-amber-400 font-black' : 'text-slate-500 hover:text-slate-300'"
          >
            ALL
          </button>
          <span class="text-slate-700">|</span>
          <button 
            @click="selectedSiteFilter = 'A'"
            :class="selectedSiteFilter === 'A' ? 'text-amber-400 font-black' : 'text-slate-500 hover:text-slate-300'"
          >
            A SITE
          </button>
          <span class="text-slate-700">|</span>
          <button 
            @click="selectedSiteFilter = 'B'"
            :class="selectedSiteFilter === 'B' ? 'text-amber-400 font-black' : 'text-slate-500 hover:text-slate-300'"
          >
            B SITE
          </button>
          <span class="text-slate-700">|</span>
          <button 
            @click="selectedSiteFilter = 'Mid'"
            :class="selectedSiteFilter === 'Mid' ? 'text-amber-400 font-black' : 'text-slate-500 hover:text-slate-300'"
          >
            MID
          </button>
        </div>
      </div>

      <!-- TAB 1: LINEUPS QUICK BROWSER -->
      <div v-show="activeTab === 'lineups'" class="flex-1 flex flex-col min-h-0 p-2.5 gap-2 overflow-hidden">
        
        <!-- NADE TYPE FILTER CHIPS -->
        <div class="grid grid-cols-5 gap-1 shrink-0">
          <button
            @click="selectedNadeFilter = 'all'"
            :class="[
              'py-1 rounded-md text-[10px] font-black text-center cursor-pointer transition-all',
              selectedNadeFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
            ]"
          >
            ALL
          </button>
          <button
            @click="selectedNadeFilter = 'smoke'"
            :class="[
              'py-1 rounded-md text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all',
              selectedNadeFilter === 'smoke' ? 'bg-slate-600 text-white shadow' : 'bg-slate-950/60 text-slate-400'
            ]"
          >
            <NadeIcon type="smoke" :size="11" />
            <span>SMOKE</span>
          </button>
          <button
            @click="selectedNadeFilter = 'flash'"
            :class="[
              'py-1 rounded-md text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all',
              selectedNadeFilter === 'flash' ? 'bg-yellow-500/40 text-yellow-300 border border-yellow-500/60' : 'bg-slate-950/60 text-slate-400'
            ]"
          >
            <NadeIcon type="flash" :size="11" />
            <span>FLASH</span>
          </button>
          <button
            @click="selectedNadeFilter = 'molotov'"
            :class="[
              'py-1 rounded-md text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all',
              selectedNadeFilter === 'molotov' ? 'bg-red-500/40 text-red-300 border border-red-500/60' : 'bg-slate-950/60 text-slate-400'
            ]"
          >
            <NadeIcon type="molotov" :size="11" />
            <span>MOLO</span>
          </button>
          <button
            @click="selectedNadeFilter = 'he'"
            :class="[
              'py-1 rounded-md text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all',
              selectedNadeFilter === 'he' ? 'bg-emerald-500/40 text-emerald-300 border border-emerald-500/60' : 'bg-slate-950/60 text-slate-400'
            ]"
          >
            <NadeIcon type="he" :size="11" />
            <span>HE</span>
          </button>
        </div>

        <!-- SEARCH INPUT -->
        <div class="relative shrink-0">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input 
            v-model="searchQuery" 
            placeholder="Search nades (Window, Stairs, Connector)..."
            class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <!-- SPLIT LAYOUT: SCROLLABLE LIST & DETAIL CARD -->
        <div class="flex-1 flex flex-col md:flex-row gap-2 min-h-0 overflow-hidden">
          
          <!-- LEFT: LINEUPS LIST -->
          <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            <div
              v-for="(lineup, idx) in overlayLineups"
              :key="lineup.id"
              @click="selectedLineup = lineup"
              :class="[
                'p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer',
                selectedLineup?.id === lineup.id 
                  ? 'bg-amber-500/20 border-amber-500/60 text-white shadow' 
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
              ]"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono text-[10px] text-slate-500 font-bold w-3.5 text-center">{{ idx + 1 }}</span>
                <div class="p-1 bg-slate-900 rounded-lg shrink-0">
                  <NadeIcon :type="lineup.grenadeType" :size="14" :filled="true" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-xs truncate">{{ lineup.title }}</span>
                  <span class="text-[10px] text-slate-400 truncate">{{ lineup.startLocation }} → {{ lineup.endLocation }}</span>
                </div>
              </div>

              <!-- TELEPORT COPY BUTTON -->
              <button 
                v-if="lineup.consoleCommand"
                @click.stop="copyTeleport(lineup)"
                class="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-amber-400 shrink-0 cursor-pointer"
                title="Copy CS2 setpos teleport"
              >
                <Check v-if="copiedCommandId === lineup.id" class="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- RIGHT: ACTIVE LINEUP QUICK PREVIEW HUD -->
          <div v-if="selectedLineup" class="w-full md:w-56 bg-slate-950 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-2 shrink-0 overflow-y-auto">
            <div class="flex items-center justify-between">
              <span class="font-black text-xs text-amber-400 truncate">{{ selectedLineup.title }}</span>
              <span class="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {{ selectedLineup.throwType.replace('_', ' ') }}
              </span>
            </div>

            <!-- PREVIEW SCREENSHOT (AIM OR STANDING) -->
            <div 
              class="relative aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 cursor-pointer group"
              @click="selectedScreenshot = selectedLineup.aimScreenshot || selectedLineup.imageUrl || selectedLineup.standingScreenshot || null"
            >
              <img 
                :src="selectedLineup.aimScreenshot || selectedLineup.imageUrl || selectedLineup.standingScreenshot || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                <Eye class="w-3.5 h-3.5" /> Click to Zoom
              </div>
            </div>

            <!-- INSTRUCTIONS BRIEF -->
            <div class="flex flex-col gap-1 text-[11px] text-slate-300 leading-snug">
              <span class="text-[10px] font-bold text-slate-500 uppercase">Alignment:</span>
              <p class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800/80 text-[10px]">
                {{ selectedLineup.instructions[0] || 'Align crosshair as shown and execute throw.' }}
              </p>
            </div>

            <!-- 1-CLICK CONSOLE BIND COPY -->
            <button 
              v-if="selectedLineup.consoleCommand"
              @click="copyTeleport(selectedLineup)"
              class="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer transition-all active:scale-95"
            >
              <Check v-if="copiedCommandId === selectedLineup.id" class="w-3.5 h-3.5 stroke-[3]" />
              <Terminal v-else class="w-3.5 h-3.5" />
              <span>{{ copiedCommandId === selectedLineup.id ? 'Copied Teleport!' : 'Copy Teleport Bind' }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- TAB 2: LIVE RADAR MINIMAP -->
      <div v-show="activeTab === 'radar'" class="flex-1 flex flex-col p-2.5 gap-2 min-h-0 overflow-hidden">
        <div class="relative flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          <img 
            :src="currentMapInfo.radarImage" 
            :alt="currentMapInfo.name" 
            class="w-full h-full object-contain"
          />

          <!-- ACTIVE BROADCAST LINEUPS OVERLAY -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none">
            <g v-for="l in gameRoomStore.activeBroadcastLineups" :key="l.id">
              <line 
                :x1="`${l.originCoords.x}%`" 
                :y1="`${l.originCoords.y}%`" 
                :x2="`${l.landingCoords.x}%`" 
                :y2="`${l.landingCoords.y}%`" 
                stroke="#f59e0b" 
                stroke-width="3" 
                stroke-dasharray="5 3" 
              />
              <circle :cx="`${l.originCoords.x}%`" :cy="`${l.originCoords.y}%`" r="6" fill="#f97316" stroke="#ffffff" stroke-width="1.5" />
              <circle :cx="`${l.landingCoords.x}%`" :cy="`${l.landingCoords.y}%`" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" />
            </g>
          </svg>
        </div>
      </div>

      <!-- TAB 3: SQUAD REAL-TIME CALLS -->
      <div v-show="activeTab === 'squad'" class="flex-1 flex flex-col p-2.5 gap-2 min-h-0 overflow-y-auto">
        <div v-if="gameRoomStore.activeBroadcastLineups.length" class="space-y-2">
          <div 
            v-for="(b, idx) in gameRoomStore.activeBroadcastLineups" 
            :key="idx"
            class="p-2.5 bg-slate-950 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-2 shadow"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div class="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                <Radio class="w-4 h-4 animate-pulse" />
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-xs text-white truncate">{{ b.title }}</span>
                <span class="text-[10px] text-slate-400 truncate">{{ b.startLocation }} → {{ b.endLocation }}</span>
              </div>
            </div>

            <button 
              v-if="b.consoleCommand"
              @click="copyTeleport(b)"
              class="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer shrink-0"
            >
              {{ copiedCommandId === b.id ? 'Copied!' : 'Copy Teleport' }}
            </button>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 gap-2">
          <Users class="w-8 h-8 opacity-40" />
          <span class="text-xs font-bold text-slate-400">No active squad executes called yet</span>
          <span class="text-[11px]">When teammates broadcast a lineup in your room, it will instantly pop up here!</span>
        </div>
      </div>

    </div>

    <!-- FULLSCREEN SCREENSHOT LIGHTBOX POPUP -->
    <div 
      v-if="selectedScreenshot" 
      class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
      @click="selectedScreenshot = null"
    >
      <div class="relative max-w-full max-h-full">
        <img :src="selectedScreenshot" class="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
        <button 
          @click="selectedScreenshot = null"
          class="absolute top-2 right-2 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- FOOTER SHORTCUTS STRIP -->
    <footer class="bg-slate-950 border-t border-slate-800/80 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
      <div class="flex items-center gap-3">
        <span><kbd class="px-1 bg-slate-900 border border-slate-700 rounded text-amber-300">1-9</kbd> Quick Pick</span>
        <span><kbd class="px-1 bg-slate-900 border border-slate-700 rounded text-amber-300">C</kbd> Copy Bind</span>
        <span><kbd class="px-1 bg-slate-900 border border-slate-700 rounded text-amber-300">Space</kbd> Radar/List</span>
      </div>
      <span class="text-emerald-400 font-bold">100% VAC Safe Overlay</span>
    </footer>

  </div>
</template>
