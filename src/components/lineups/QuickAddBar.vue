<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { parseQuickLineupInput, type ParsedLineupDraft } from '../../utils/quickLineupParser'
import {
  snapPointToMapBounds,
  getMapSwitchConsoleCommand,
  getLineupSetupConsoleCommand
} from '../../core/radar/mapBounds'
import NadeIcon from '../common/NadeIcon.vue'
import type { GrenadeType, Lineup } from '../../types'
import {
  Zap,
  Plus,
  Check,
  ArrowRight,
  Sliders,
  X,
  Clipboard,
  Terminal,
  Copy,
  BookMarked,
  ChevronDown,
  ChevronUp,
  Play,
  Crosshair
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()

const inputText = ref('')
const isFocused = ref(false)
const lastAddedTitle = ref<string | null>(null)
const commandStatus = ref<{
  handled: boolean
  message: string
  consoleCommand?: string
} | null>(null)
const successTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const copiedMapCmd = ref(false)
const copiedSetupCmd = ref(false)
const copiedFeedbackCmd = ref(false)

const showQuickPick = ref(false)
const quickPickSearch = ref('')
const quickPickNade = ref<'all' | GrenadeType>('all')

const isCommandInput = computed(() => {
  const t = inputText.value.trim().toLowerCase()
  if (!t) return false
  return (
    t.startsWith('/') ||
    /^setup\s+/.test(t) ||
    /^load\s+/.test(t) ||
    /^switch\s+to\s+/.test(t)
  )
})

const commandPreview = computed(() => {
  if (!isCommandInput.value) return null
  const t = inputText.value.trim().toLowerCase()
  if (t.startsWith('/map') || /^switch\s+to\s+/.test(t)) {
    return {
      badge: 'MAP SWITCH',
      summary: 'Switch radar map/floor & generate CS2 practice console CMD',
      accentClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
    }
  }
  if (t.startsWith('/setup') || /^setup\s+/.test(t) || t.startsWith('/load') || /^load\s+/.test(t)) {
    return {
      badge: 'SETUP LINEUP',
      summary: 'Find matching lineup across maps, focus radar & copy setpos CMD',
      accentClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    }
  }
  if (t.startsWith('/mode')) {
    return {
      badge: 'DISPLAY MODE',
      summary: 'Switch display mode (all images / spot & movement / cards)',
      accentClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    }
  }
  if (t.startsWith('/book')) {
    return {
      badge: 'PERSONAL BOOK',
      summary: 'Save matching general lineup directly into your Personal Book',
      accentClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    }
  }
  return {
    badge: 'COMMAND',
    summary: inputText.value.trim(),
    accentClass: 'bg-slate-800 text-amber-300 border-amber-500/40'
  }
})

// Parse draft on the fly as user types natural lineup descriptions
const parsedDraft = computed<ParsedLineupDraft | null>(() => {
  if (!inputText.value.trim() || isCommandInput.value) return null
  const draft = parseQuickLineupInput(inputText.value, mapStore.currentMapId)
  const originSnap = snapPointToMapBounds(draft.mapId, draft.originCoords)
  const landingSnap = snapPointToMapBounds(draft.mapId, draft.landingCoords)
  return {
    ...draft,
    originCoords: { x: originSnap.x, y: originSnap.y },
    landingCoords: { x: landingSnap.x, y: landingSnap.y }
  }
})

const mapGeneralLineups = computed(() => {
  return lineupStore.generalLineups.filter((l) => l.mapId === mapStore.currentMapId)
})

const filteredQuickPickLineups = computed(() => {
  const q = quickPickSearch.value.trim().toLowerCase()
  return mapGeneralLineups.value.filter((l) => {
    if (quickPickNade.value !== 'all' && l.grenadeType !== quickPickNade.value) return false
    if (!q) return true
    return (
      l.title.toLowerCase().includes(q) ||
      l.startLocation.toLowerCase().includes(q) ||
      l.endLocation.toLowerCase().includes(q) ||
      (l.sourceWebsite || '').toLowerCase().includes(q)
    )
  })
})

const commandExamples = [
  '/map mirage',
  '/map nuke lower',
  '/setup window smoke',
  '/mode all',
  '/mode spot',
  '/book add window smoke'
]

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

function resetFeedbackTimer(delayMs = 4000) {
  if (successTimer.value) clearTimeout(successTimer.value)
  successTimer.value = setTimeout(() => {
    lastAddedTitle.value = null
    commandStatus.value = null
  }, delayMs)
}

function handleSubmit() {
  if (isCommandInput.value) {
    handleRunCommand()
  } else {
    handleInstantAdd()
  }
}

function handleRunCommand() {
  if (!inputText.value.trim()) return
  const res = lineupStore.executeCommandString(inputText.value)
  lastAddedTitle.value = null
  commandStatus.value = res
  if (res.handled) {
    inputText.value = ''
  }
  resetFeedbackTimer(5000)
}

function handleRunQuickCommand(cmd: string) {
  inputText.value = cmd
  handleRunCommand()
}

// Execute 1-Click / 1-Type Add
function handleInstantAdd() {
  if (!parsedDraft.value) return

  const draft = parsedDraft.value
  const originSnap = snapPointToMapBounds(draft.mapId, draft.originCoords)
  const landingSnap = snapPointToMapBounds(draft.mapId, draft.landingCoords)

  const newLineup: Omit<Lineup, 'id' | 'createdAt'> = {
    title: draft.title,
    mapId: draft.mapId,
    grenadeType: draft.grenadeType,
    side: draft.side,
    throwType: draft.throwType,
    movementType:
      draft.throwType === 'crouch' || draft.throwType === 'crouch_jumpthrow'
        ? 'crouch'
        : draft.throwType === 'runthrow' || draft.throwType === 'run_jumpthrow'
          ? 'running'
          : 'stationary',
    tickrate: draft.tickrate,
    originCoords: { x: originSnap.x, y: originSnap.y },
    landingCoords: { x: landingSnap.x, y: landingSnap.y },
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
    isPersonalBook: true,
    inLibrary: true,
    isTeamShared: true
  }

  // Save to lineupStore (also snapped inside addLineup)
  const saved = lineupStore.addLineup(newLineup)

  // Switch map if different
  if (draft.mapId !== mapStore.currentMapId) {
    mapStore.setMap(draft.mapId)
  }

  commandStatus.value = null
  lastAddedTitle.value = saved.title
  inputText.value = ''
  resetFeedbackTimer(3500)
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
  } catch {
    // ignore clipboard errors
  }
}

async function copyText(text: string): Promise<boolean> {
  if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function handleCopyMapPracticeCmd() {
  const cmd = getMapSwitchConsoleCommand(mapStore.currentMapId)
  await copyText(cmd)
  copiedMapCmd.value = true
  commandStatus.value = {
    handled: true,
    message: `Copied ${mapStore.currentMap.name} practice CMD!`,
    consoleCommand: cmd
  }
  resetFeedbackTimer(4000)
  setTimeout(() => {
    copiedMapCmd.value = false
  }, 2000)
}

async function handleCopySelectedSetupCmd() {
  const selected = lineupStore.selectedLineup
  if (!selected) return
  const cmd = getLineupSetupConsoleCommand(selected)
  await copyText(cmd)
  copiedSetupCmd.value = true
  commandStatus.value = {
    handled: true,
    message: `Copied setup CMD for "${selected.title}"!`,
    consoleCommand: cmd
  }
  resetFeedbackTimer(4000)
  setTimeout(() => {
    copiedSetupCmd.value = false
  }, 2000)
}

async function handleCopyFeedbackCmd(cmd: string) {
  await copyText(cmd)
  copiedFeedbackCmd.value = true
  setTimeout(() => {
    copiedFeedbackCmd.value = false
  }, 2000)
}

function handleOpenFullModal() {
  lineupStore.isAddModalOpen = true
}
</script>

<template>
  <div class="quick-add-bar w-full flex flex-col gap-2.5 p-3 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-500/40 rounded-2xl shadow-xl">

    <!-- TOP ROW: TITLE, COMMAND / QUICK-ADD INPUT & PRIMARY ACTION -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div class="flex items-center gap-2 shrink-0">
        <div class="p-2 bg-amber-500 text-slate-950 rounded-xl shadow font-black flex items-center justify-center">
          <Zap class="w-4 h-4 fill-current" />
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
            <span>⚡ Quick-Add &amp; Commands</span>
            <span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold">/cmds • 1-Type</span>
          </span>
          <span class="text-[10px] text-slate-400">Type /map, /setup, /mode, /book add — or describe a lineup to save</span>
        </div>
      </div>

      <!-- MAIN INPUT BOX -->
      <div class="relative flex-1 flex items-center min-w-0">
        <input
          v-model="inputText"
          @focus="isFocused = true"
          @keyup.enter="handleSubmit"
          placeholder="e.g. /map nuke, /setup mirage window smoke, /mode spot, or Mirage Window Smoke from T Spawn..."
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
            title="Clear input"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- BUTTONS GROUP -->
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- COMMAND RUN BUTTON -->
        <button
          v-if="isCommandInput"
          @click="handleRunCommand"
          class="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 hover:scale-[1.02] active:scale-95 shadow-emerald-500/25 ring-2 ring-emerald-400/50 cursor-pointer"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
        </button>

        <!-- PUSH TO ADD ACTION BUTTON -->
        <button
          v-else
          @click="handleInstantAdd"
          :disabled="!parsedDraft"
          :class="[
            'px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all',
            parsedDraft
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 hover:scale-[1.02] active:scale-95 shadow-amber-500/25 ring-2 ring-amber-400/50 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          ]"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Push to Add</span>
        </button>

        <!-- FULL FORM MODAL OPENER -->
        <button
          @click="handleOpenFullModal"
          class="px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-amber-500/40"
          title="Open complete multi-tab creation studio"
        >
          <Sliders class="w-3.5 h-3.5 text-amber-400" />
          <span class="hidden sm:inline">Studio</span>
        </button>
      </div>
    </div>

    <!-- SECOND ROW: 1-CLICK CONSOLE CMDS + QUICK-PICK GENERAL LINEUPS + CMD CHIPS -->
    <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          @click="handleCopyMapPracticeCmd"
          class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border"
          :class="copiedMapCmd
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-950 hover:bg-slate-800 text-sky-300 border-slate-800 hover:border-sky-500/40'"
          :title="`Copy practice console command for ${mapStore.currentMap.name}`"
        >
          <Check v-if="copiedMapCmd" class="w-3.5 h-3.5" />
          <Terminal v-else class="w-3.5 h-3.5" />
          <span>{{ copiedMapCmd ? 'Copied Map CMD!' : '🎮 Map Practice CMD' }}</span>
        </button>

        <button
          v-if="lineupStore.selectedLineup"
          @click="handleCopySelectedSetupCmd"
          class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border"
          :class="copiedSetupCmd
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35'"
          :title="`Copy setpos & weapon CMD for ${lineupStore.selectedLineup.title}`"
        >
          <Check v-if="copiedSetupCmd" class="w-3.5 h-3.5" />
          <Copy v-else class="w-3.5 h-3.5" />
          <span>{{ copiedSetupCmd ? 'Copied Setup CMD!' : '📋 Copy Lineup Setup CMD' }}</span>
        </button>

        <button
          @click="showQuickPick = !showQuickPick"
          class="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border"
          :class="showQuickPick
            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
            : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border-slate-800 hover:border-amber-500/40'"
        >
          <BookMarked class="w-3.5 h-3.5" />
          <span>⚡ Quick-Pick General Lineups ({{ mapGeneralLineups.length }})</span>
          <ChevronUp v-if="showQuickPick" class="w-3.5 h-3.5" />
          <ChevronDown v-else class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- QUICK SLASH COMMAND EXAMPLES -->
      <div class="flex items-center gap-1 overflow-x-auto scrollbar-none">
        <span class="text-[10px] text-slate-500 font-mono uppercase shrink-0 mr-0.5">Cmds:</span>
        <button
          v-for="cmd in commandExamples"
          :key="cmd"
          @click="handleRunQuickCommand(cmd)"
          class="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-[10px] font-mono text-slate-400 hover:text-emerald-300 whitespace-nowrap cursor-pointer transition-colors"
        >
          {{ cmd }}
        </button>
      </div>
    </div>

    <!-- COMMAND PREVIEW PILL (WHEN TYPING A COMMAND) -->
    <div
      v-if="isCommandInput && commandPreview"
      class="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/90 border border-emerald-500/35 rounded-xl text-[11px] animate-fade-in"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span :class="['px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider shrink-0', commandPreview.accentClass]">
          &gt;_ {{ commandPreview.badge }}
        </span>
        <span class="text-slate-300 truncate">{{ commandPreview.summary }}</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-[10px] text-slate-500 hidden md:inline">
          Press <strong>Enter</strong> or click <strong>Run</strong>
        </span>
        <button
          @click="handleRunCommand"
          class="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
        >
          <Play class="w-2.5 h-2.5 fill-current" />
          <span>Run</span>
        </button>
      </div>
    </div>

    <!-- LIVE DETECTED TAGS / INTENT PREVIEW (WHEN TYPING NATURAL LINEUP) -->
    <div
      v-else-if="parsedDraft"
      class="flex items-center gap-1.5 flex-wrap p-2 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] animate-fade-in"
    >
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

      <span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-emerald-300 text-[10px]">
        In-Bounds ✓
      </span>

      <span class="text-[10px] text-slate-500 ml-auto hidden md:inline">
        Press <strong>Enter</strong> or click <strong>Push to Add</strong>
      </span>
    </div>

    <!-- EXPANDABLE QUICK-PICK GENERAL LINEUPS PICKER -->
    <Transition name="fade">
      <div
        v-if="showQuickPick"
        class="p-3 bg-slate-950/95 border border-amber-500/30 rounded-xl flex flex-col gap-2.5 shadow-inner"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black uppercase text-amber-400 tracking-wide">
              General Lineups on {{ mapStore.currentMap.name }}
            </span>
            <span class="text-[10px] text-slate-400">
              1-click save to your Personal Book
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <input
              v-model="quickPickSearch"
              type="text"
              placeholder="Filter callout / site / source..."
              class="px-2.5 py-1 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded-lg text-[11px] text-white placeholder:text-slate-500 outline-none"
            />
            <div class="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                v-for="nade in (['all', 'smoke', 'flash', 'molotov', 'he'] as const)"
                :key="nade"
                @click="quickPickNade = nade"
                :class="[
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer transition-colors',
                  quickPickNade === nade ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                ]"
              >
                {{ nade }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="filteredQuickPickLineups.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1"
        >
          <div
            v-for="item in filteredQuickPickLineups"
            :key="item.id"
            class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div
              @click="lineupStore.selectLineup(item)"
              class="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
              title="Click to highlight on radar"
            >
              <NadeIcon :type="item.grenadeType" :size="16" :filled="true" class="shrink-0" />
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-white truncate hover:text-amber-300">
                  {{ item.title }}
                </div>
                <div class="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <span>{{ item.startLocation }} → {{ item.endLocation }}</span>
                  <span v-if="item.sourceWebsite" class="text-cyan-400/80 font-semibold">• {{ item.sourceWebsite }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="lineupStore.selectLineup(item)"
                class="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-sky-300 border border-slate-800 cursor-pointer"
                title="Focus on Radar"
              >
                <Crosshair class="w-3 h-3" />
              </button>
              <button
                @click="lineupStore.togglePersonalBook(item)"
                :class="[
                  'px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition-all',
                  lineupStore.isInPersonalBook(item.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500 hover:text-slate-950'
                ]"
              >
                <Check v-if="lineupStore.isInPersonalBook(item.id)" class="w-3 h-3" />
                <Plus v-else class="w-3 h-3" />
                <span>{{ lineupStore.isInPersonalBook(item.id) ? 'Saved' : 'Book' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="py-4 text-center text-xs text-slate-500">
          No general lineups match this filter on {{ mapStore.currentMap.name }}.
        </div>
      </div>
    </Transition>

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
    </div>

    <!-- SUCCESS / COMMAND NOTIFICATION TOAST -->
    <Transition name="fade">
      <div
        v-if="lastAddedTitle"
        key="added-toast"
        class="p-2.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-2 shadow-lg"
      >
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
            <Check class="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span class="text-xs text-white font-bold">
            🎉 Added <span class="text-emerald-300">"{{ lastAddedTitle }}"</span> to your Personal Book &amp; radar!
          </span>
        </div>
        <button
          @click="lastAddedTitle = null"
          class="text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        v-else-if="commandStatus"
        key="command-toast"
        :class="[
          'p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-lg border',
          commandStatus.handled
            ? 'bg-emerald-950/90 border-emerald-500/50'
            : 'bg-rose-950/90 border-rose-500/50'
        ]"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Terminal class="w-4 h-4 shrink-0" :class="commandStatus.handled ? 'text-emerald-400' : 'text-rose-400'" />
          <span class="text-xs text-white font-bold">{{ commandStatus.message }}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            v-if="commandStatus.consoleCommand"
            @click="handleCopyFeedbackCmd(commandStatus.consoleCommand)"
            class="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <Check v-if="copiedFeedbackCmd" class="w-3 h-3" />
            <Copy v-else class="w-3 h-3" />
            <span>{{ copiedFeedbackCmd ? 'Copied!' : 'Copy CMD' }}</span>
          </button>
          <button
            @click="commandStatus = null"
            class="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
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
