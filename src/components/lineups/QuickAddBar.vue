<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useCs2ServerStore } from '../../stores/cs2ServerStore'
import { parseQuickLineupInput, type ParsedLineupDraft } from '../../utils/quickLineupParser'
import NadeIcon from '../common/NadeIcon.vue'
import type { Lineup } from '../../types'
import { 
  Zap, 
  Plus, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Layers, 
  Sliders, 
  Terminal, 
  X,
  Crosshair,
  MapPin,
  Clipboard,
  Server,
  RefreshCw,
  Camera
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const cs2ServerStore = useCs2ServerStore()

const inputText = ref('')
const isFocused = ref(false)
const lastAddedTitle = ref<string | null>(null)
const successTimer = ref<any>(null)


// Parse draft on the fly as user types
const parsedDraft = computed<ParsedLineupDraft | null>(() => {
  if (!inputText.value.trim()) return null
  return parseQuickLineupInput(inputText.value, mapStore.currentMapId)
})

// Quick meta presets for active map
const quickPresets = computed(() => {
  const mapId = mapStore.currentMapId
  if (mapId === 'mirage') {
    return [
      'Window Smoke from T Spawn',
      'Stairs Smoke from T Roof',
      'Jungle Smoke from T Roof',
      'B Short Smoke from Apartments',
      'A Site Flash from Palace'
    ]
  } else if (mapId === 'dust2') {
    return [
      'Xbox Smoke from Outside Long',
      'Long A Flash from Long Doors',
      'B Doors Smoke from Tunnels',
      'CT Cross Smoke from Long'
    ]
  } else if (mapId === 'inferno') {
    return [
      'Coffins Molotov from Banana',
      'Banana Smoke from T Spawn',
      'Pit Flash from Second Mid',
      'Arch Smoke from Banana'
    ]
  } else if (mapId === 'ancient') {
    return [
      'Donut Smoke from T Spawn',
      'Cave Smoke from B Main',
      'Red Room Molotov from Mid'
    ]
  } else if (mapId === 'anubis') {
    return [
      'Connector Smoke from Canal',
      'B Site Smoke from B Main',
      'A Site Flash from Camera'
    ]
  } else {
    return [
      'A Site Smoke from T Spawn',
      'B Site Smoke from T Spawn',
      'Mid Flash from Spawn'
    ]
  }
})

// Execute 1-Click / 1-Type Add
function handleInstantAdd() {
  if (!parsedDraft.value) return

  const draft = parsedDraft.value
  const newLineup: Lineup = {
    id: `custom-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    title: draft.title,
    mapId: draft.mapId,
    grenadeType: draft.grenadeType,
    side: draft.side,
    throwType: draft.throwType,
    tickrate: draft.tickrate,
    originCoords: draft.originCoords,
    landingCoords: draft.landingCoords,
    curveOffset: draft.curveOffset,
    startLocation: draft.startLocation,
    endLocation: draft.endLocation,
    site: draft.site,
    tags: draft.tags,
    instructions: draft.instructions,
    consoleCommand: draft.consoleCommand || undefined,
    difficulty: draft.difficulty,
    cs2Pos: draft.cs2Pos,
    isCustom: true,
    inLibrary: true,
    isTeamShared: true,
    createdAt: new Date().toISOString()
  }

  // Save to lineupStore
  lineupStore.addLineup(newLineup)

  // Switch map if different
  if (draft.mapId !== mapStore.currentMapId) {
    mapStore.currentMapId = draft.mapId
  }

  // Show success feedback
  lastAddedTitle.value = newLineup.title
  inputText.value = ''
  
  if (successTimer.value) clearTimeout(successTimer.value)
  successTimer.value = setTimeout(() => {
    lastAddedTitle.value = null
  }, 3500)
}

function handleAddPreset(presetText: string) {
  inputText.value = presetText
  handleInstantAdd()
}

async function handlePasteClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      inputText.value = text.trim()
    }
  } catch (e) {}
}

async function handleServerAutoCapture() {
  const customTitle = inputText.value.trim() || undefined
  const captured = await cs2ServerStore.autoInsertFullLineup({ customTitle })
  if (captured) {
    lastAddedTitle.value = captured.title
    inputText.value = ''
    if (successTimer.value) clearTimeout(successTimer.value)
    successTimer.value = setTimeout(() => {
      lastAddedTitle.value = null
    }, 4000)
  }
}

async function handleAutoInsertWithSnap() {
  const customTitle = inputText.value.trim() || undefined
  const captured = await cs2ServerStore.autoInsertFullLineup({ captureSnap: true, customTitle })
  if (captured) {
    lastAddedTitle.value = captured.title
    inputText.value = ''
    if (successTimer.value) clearTimeout(successTimer.value)
    successTimer.value = setTimeout(() => {
      lastAddedTitle.value = null
    }, 4000)
  }
}

function handleOpenFullModal() {
  lineupStore.isAddModalOpen = true
}
</script>

<template>
  <div class="quick-add-bar w-full flex flex-col gap-2 p-3 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 rounded-2xl shadow-xl">
    
    <!-- TOP ROW: TITLE & INPUT FIELD -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <div class="p-2 bg-amber-500 text-slate-950 rounded-xl shadow font-black flex items-center justify-center">
          <Zap class="w-4 h-4 fill-current" />
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
            <span>⚡ Quick-Add Lineup</span>
            <span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold">1-Type / 1-Push</span>
          </span>
          <span class="text-[10px] text-slate-400">Type nade name, paste setpos, or 1-click auto-insert from CS2:</span>
        </div>
      </div>

      <!-- MAIN INPUT BOX -->
      <div class="relative flex-1 flex items-center min-w-0">
        <input 
          v-model="inputText"
          @focus="isFocused = true"
          @keyup.enter="handleInstantAdd"
          placeholder="e.g. Mirage Window Smoke from T Spawn, Inferno B Coffins Molotov, or paste setpos..."
          class="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
        />

        <div class="absolute right-1.5 flex items-center gap-1">
          <button
            v-if="!inputText"
            @click="handlePasteClipboard"
            class="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Paste from Clipboard"
          >
            <Clipboard class="w-3.5 h-3.5" />
          </button>
          
          <button
            v-else
            @click="inputText = ''"
            class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- BUTTONS GROUP -->
      <div class="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
        <!-- 1-CLICK INSTANT ADD ACTION BUTTON (IF TYPING) -->
        <button
          v-if="parsedDraft"
          @click="handleInstantAdd"
          class="px-3.5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 hover:scale-[1.02] active:scale-95 shadow-amber-500/25 ring-2 ring-amber-400/50"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Push to Add</span>
        </button>

        <!-- 1-CLICK CS2 SERVER AUTO-CAPTURE -->
        <button
          @click="handleServerAutoCapture"
          :disabled="cs2ServerStore.isCapturing"
          class="px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer bg-slate-950 hover:bg-slate-850 text-amber-400 border border-amber-500/50 hover:border-amber-400 hover:scale-[1.02] active:scale-95"
          title="Auto-capture current position & angles from CS2 / Live GSI"
        >
          <RefreshCw v-if="cs2ServerStore.isCapturing" class="w-3.5 h-3.5 animate-spin" />
          <Zap v-else class="w-3.5 h-3.5 fill-current text-amber-400" />
          <span>Auto-Insert</span>
        </button>

        <!-- 1-CLICK CS2 SNAP & INSERT -->
        <button
          @click="handleAutoInsertWithSnap"
          :disabled="cs2ServerStore.isCapturing"
          class="px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-[1.02] active:scale-95 shadow-amber-500/20"
          title="Grab screen frame from CS2 window and auto-insert lineup"
        >
          <Camera class="w-3.5 h-3.5 text-slate-950" />
          <span>+ Snap</span>
        </button>
      </div>
    </div>


    <!-- LIVE DETECTED TAGS / INTENT PREVIEW (WHEN TYPING) -->
    <div v-if="parsedDraft" class="flex items-center gap-1.5 flex-wrap p-2 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] animate-fade-in">
      <span class="text-slate-400 font-bold text-[10px] uppercase">Detected:</span>
      
      <!-- MAP -->
      <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-white uppercase text-[10px]">
        🗺️ {{ parsedDraft.mapName }}
      </span>

      <!-- GRENADE -->
      <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-amber-400 flex items-center gap-1 uppercase text-[10px]">
        <NadeIcon :type="parsedDraft.grenadeType" :size="12" :filled="true" />
        <span>{{ parsedDraft.grenadeType }}</span>
      </span>

      <!-- SIDE -->
      <span 
        :class="[
          'px-2 py-0.5 rounded font-bold uppercase text-[10px] border',
          parsedDraft.side === 't' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
        ]"
      >
        {{ parsedDraft.side === 't' ? 'T Side' : 'CT Side' }}
      </span>

      <!-- THROW TYPE -->
      <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-slate-300 uppercase text-[10px]">
        🎯 {{ parsedDraft.throwType.replace('_', ' ') }}
      </span>

      <!-- TARGET -->
      <span class="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 font-bold text-emerald-300 text-[10px] flex items-center gap-1">
        <span>{{ parsedDraft.startLocation }}</span>
        <ArrowRight class="w-2.5 h-2.5" />
        <strong class="text-white">{{ parsedDraft.endLocation }}</strong>
      </span>

      <span v-if="parsedDraft.cs2Pos" class="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 font-mono text-emerald-400 text-[10px]">
        setpos pos ✓
      </span>

      <span class="text-[10px] text-slate-500 ml-auto hidden md:inline">
        Press <strong>Enter</strong> or click <strong>Push to Add</strong>
      </span>
    </div>

    <!-- QUICK 1-CLICK PRESET CHIPS (FOR ACTIVE MAP) -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-slate-950/80">
      <span class="text-[10px] font-bold text-slate-500 uppercase shrink-0">1-Click Presets:</span>
      <button
        v-for="preset in quickPresets"
        :key="preset"
        @click="handleAddPreset(preset)"
        class="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-lg text-[10px] font-bold text-slate-300 hover:text-amber-400 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
      >
        <Plus class="w-2.5 h-2.5 text-amber-500" />
        <span>{{ preset }}</span>
      </button>

      <button
        @click="handleOpenFullModal"
        class="ml-auto px-2 py-1 text-slate-400 hover:text-white text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
      >
        <Sliders class="w-3 h-3" />
        <span>Full Form</span>
      </button>
    </div>

    <!-- SUCCESS NOTIFICATION TOAST -->
    <Transition name="fade">
      <div 
        v-if="lastAddedTitle" 
        class="p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-bounce"
      >
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
            <Check class="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span class="text-xs text-white font-bold">
            🎉 Added <span class="text-emerald-300">"{{ lastAddedTitle }}"</span> to your lineups & radar!
          </span>
        </div>
        <button 
          @click="lastAddedTitle = null"
          class="text-slate-400 hover:text-white p-1"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
