<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { DEFAULT_LINEUP_IMAGE } from '../../config/site'
import { getLineupSetupConsoleCommand } from '../../core/radar/mapBounds'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import NadeIcon from '../common/NadeIcon.vue'
import type { Lineup, LineupDisplayMode } from '../../types'
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  Crosshair,
  Heart,
  Maximize2,
  Play,
  Radar,
  Terminal,
  Trash2
} from 'lucide-vue-next'

const props = defineProps<{
  lineup: Lineup
  displayMode?: LineupDisplayMode
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-select', id: string): void
}>()

const router = useRouter()
const lineupStore = useLineupStore()
const mapStore = useMapStore()
const { confirmAction } = useConfirmDialog()

const copiedCmd = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const effectiveMode = computed<LineupDisplayMode>(
  () => props.displayMode ?? lineupStore.lineupDisplayMode
)

const isInBook = computed(() => lineupStore.isInPersonalBook(props.lineup.id))

const mapName = computed(
  () => mapStore.getMapById(props.lineup.mapId)?.name || props.lineup.mapId
)

const cardThumbnail = computed(
  () =>
    props.lineup.imageUrl ||
    props.lineup.aimScreenshot ||
    props.lineup.standingScreenshot ||
    props.lineup.landingScreenshot ||
    DEFAULT_LINEUP_IMAGE
)

const standingImg = computed(
  () => props.lineup.standingScreenshot || props.lineup.imageUrl || DEFAULT_LINEUP_IMAGE
)
const aimImg = computed(
  () => props.lineup.aimScreenshot || props.lineup.imageUrl || DEFAULT_LINEUP_IMAGE
)
const landingImg = computed(
  () => props.lineup.landingScreenshot || props.lineup.imageUrl || DEFAULT_LINEUP_IMAGE
)

const movementText = computed(() =>
  (props.lineup.movementType || 'stationary').replace(/_/g, ' ')
)
const throwText = computed(() => props.lineup.throwType.replace(/_/g, ' '))
const clickText = computed(() => props.lineup.clickType || 'left')

const stepCaptions = computed(() => {
  const l = props.lineup
  const steps = l.instructionSteps || []
  const posStep = steps.find((s) => s.phase === 'position') || steps[0]
  const aimStep = steps.find((s) => s.phase === 'aim') || steps[1]
  const throwStep =
    steps.find((s) => s.phase === 'throw' || s.phase === 'result' || s.phase === 'movement') ||
    steps[2]

  return {
    stand:
      posStep?.description ||
      l.instructions?.[0] ||
      `Stand at ${l.startLocation}${l.movementDetails ? ` (${l.movementDetails})` : ''}.`,
    aim:
      aimStep?.description ||
      l.instructions?.[1] ||
      `Align crosshair for ${l.endLocation}.`,
    aimNote:
      aimStep?.crosshairNote ||
      (l.cs2Pos?.pitch !== undefined && l.cs2Pos?.yaw !== undefined
        ? `Pitch ${l.cs2Pos.pitch.toFixed(1)}° / Yaw ${l.cs2Pos.yaw.toFixed(1)}°`
        : 'Crosshair Alignment'),
    result:
      throwStep?.description ||
      l.instructions?.[2] ||
      `Execute ${throwText.value} (${clickText.value} click) to hit ${l.endLocation}.`
  }
})

async function copyText(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copiedCmd.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copiedCmd.value = false
  }, 1800)
}

function handleCopySetupCmd(e: MouseEvent) {
  e.stopPropagation()
  const cmd = getLineupSetupConsoleCommand(props.lineup)
  copyText(cmd)
}

function handleToggleBook(e: MouseEvent) {
  e.stopPropagation()
  lineupStore.togglePersonalBook(props.lineup)
}

async function handlePinOnRadar(e: MouseEvent) {
  e.stopPropagation()
  lineupStore.selectLineup(props.lineup)
  const minimapEl = document.querySelector('.interactive-minimap')
  if (minimapEl) {
    minimapEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (router.currentRoute.value.path !== '/') {
    await router.push('/')
    setTimeout(() => {
      document
        .querySelector('.interactive-minimap')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
  }
}

function handleOpenViewer(e?: MouseEvent) {
  e?.stopPropagation()
  lineupStore.openLineup(props.lineup)
}

function handleToggleSelect(e: Event) {
  e.stopPropagation()
  emit('toggle-select', props.lineup.id)
}

async function handleDelete(e: MouseEvent) {
  e.stopPropagation()
  const ok = await confirmAction({
    title: 'Delete Lineup?',
    message: `Are you sure you want to delete "${props.lineup.title}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    lineupStore.deleteLineup(props.lineup.id)
  }
}
</script>

<template>
  <!-- =========================================================
       MODE 1: ALL IMAGES (SHOW ALL 3 STAGES WITHOUT CLICKING)
       ========================================================= -->
  <div
    v-if="effectiveMode === 'all_images'"
    :class="[
      'lineup-card-all-images w-full bg-slate-900/95 border rounded-2xl overflow-hidden shadow-xl transition-all duration-200 flex flex-col gap-3 p-4',
      selected
        ? 'border-amber-500 ring-2 ring-amber-500/30'
        : 'border-slate-800 hover:border-slate-700'
    ]"
  >
    <!-- Header Bar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <!-- Quick-Select Checkbox -->
        <label
          v-if="selectable"
          @click.stop
          class="flex items-center justify-center p-1 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer hover:border-amber-500"
          title="Select for Personal Book"
        >
          <input
            type="checkbox"
            :checked="!!selected"
            @change="handleToggleSelect"
            class="w-4 h-4 accent-amber-500 cursor-pointer"
          />
        </label>

        <div class="p-1.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center">
          <NadeIcon :type="lineup.grenadeType" :size="18" :filled="true" />
        </div>

        <button
          @click="handleOpenViewer"
          class="text-left font-black text-sm text-white hover:text-amber-400 transition-colors cursor-pointer truncate max-w-[320px] sm:max-w-md"
        >
          {{ lineup.title }}
        </button>

        <span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-bold uppercase text-amber-400">
          {{ mapName }}
        </span>

        <span
          :class="[
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
            lineup.side === 't'
              ? 'bg-amber-600/80 text-white'
              : lineup.side === 'ct'
                ? 'bg-sky-600/80 text-white'
                : 'bg-slate-700 text-white'
          ]"
        >
          {{ lineup.side }}
        </span>

        <span
          v-if="lineup.radarFloor"
          class="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase"
        >
          {{ lineup.radarFloor }}
        </span>

        <span
          v-if="lineup.sourceWebsite"
          class="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold"
        >
          {{ lineup.sourceWebsite }}
        </span>

        <span
          v-if="lineup.proPlayer"
          class="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold"
        >
          ★ {{ lineup.proPlayer }}<template v-if="lineup.proTeam"> · {{ lineup.proTeam }}</template>
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          @click="handleToggleBook"
          :class="[
            'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer',
            isInBook
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
          ]"
          :title="isInBook ? 'Remove from Personal Book' : 'Add to Personal Book'"
        >
          <BookmarkCheck v-if="isInBook" class="w-3.5 h-3.5" />
          <BookmarkPlus v-else class="w-3.5 h-3.5" />
          <span>{{ isInBook ? '✓ In My Book' : '+ My Book' }}</span>
        </button>

        <button
          @click="handleCopySetupCmd"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-colors cursor-pointer"
          title="Copy setpos + setang + grenade setup console command"
        >
          <Check v-if="copiedCmd" class="w-3.5 h-3.5 text-emerald-400" />
          <Terminal v-else class="w-3.5 h-3.5" />
          <span>{{ copiedCmd ? 'Copied!' : 'Setup CMD' }}</span>
        </button>

        <button
          @click="handlePinOnRadar"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-sky-300 border border-sky-500/30 text-[11px] font-bold transition-colors cursor-pointer"
          title="Select & pin on interactive radar"
        >
          <Radar class="w-3.5 h-3.5" />
          <span>Radar</span>
        </button>

        <button
          @click="handleOpenViewer"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black transition-colors cursor-pointer shadow"
          title="Open Full Viewer Modal"
        >
          <Maximize2 class="w-3.5 h-3.5" />
          <span>Full Viewer</span>
        </button>

        <button
          @click.stop="lineupStore.toggleFavorite(lineup.id)"
          class="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          title="Toggle Favorite"
        >
          <Heart class="w-3.5 h-3.5" :class="{ 'fill-rose-500 text-rose-500': lineupStore.isFavorite(lineup.id) }" />
        </button>

        <button
          v-if="lineup.isCustom"
          @click="handleDelete"
          class="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-600 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Delete Lineup"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Compact Spot & Movement Strip -->
    <div class="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-[11px]">
      <span class="font-bold text-amber-300">📍 Stand: {{ lineup.startLocation }}</span>
      <ArrowRight class="w-3 h-3 text-slate-500" />
      <span class="font-bold text-emerald-300">🎯 Target: {{ lineup.endLocation }}</span>
      <span class="h-3 w-px bg-slate-800 hidden sm:inline"></span>
      <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold text-sky-300 capitalize">
        🏃 Movement: {{ movementText }}
      </span>
      <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono font-bold text-amber-400 uppercase">
        ⚡ {{ throwText }}
      </span>
      <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono font-bold text-slate-300 uppercase">
        🖱️ {{ clickText }} click
      </span>
      <span
        v-if="lineup.movementDetails"
        class="text-slate-300 italic truncate max-w-md"
      >
        — {{ lineup.movementDetails }}
      </span>
    </div>

    <!-- 3 Visual Stages Side-by-Side (Immediately Visible) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- Stage 1: Stand Spot -->
      <div class="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col">
        <div class="relative aspect-video w-full overflow-hidden bg-slate-950">
          <img
            :src="standingImg"
            :alt="`Stand at ${lineup.startLocation}`"
            loading="lazy"
            decoding="async"
            class="w-full h-full object-cover opacity-95"
          />
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent pointer-events-none"></div>

          <div class="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-950/90 border border-sky-500/40 text-[10px] font-black uppercase text-sky-300">
            1. Stand Spot: {{ lineup.startLocation }}
          </div>
          <div class="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-bold text-slate-300 capitalize">
            {{ movementText }}
          </div>
          <div class="absolute bottom-2 inset-x-2 text-[11px] font-medium text-white leading-snug line-clamp-2 drop-shadow">
            {{ stepCaptions.stand }}
          </div>
        </div>
      </div>

      <!-- Stage 2: Aim Point + Crosshair Reticle -->
      <div class="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col">
        <div class="relative aspect-video w-full overflow-hidden bg-slate-950">
          <img
            :src="aimImg"
            :alt="`Aim point for ${lineup.title}`"
            loading="lazy"
            decoding="async"
            class="w-full h-full object-cover opacity-95"
          />
          <!-- Crosshair Reticle Overlay -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="relative flex items-center justify-center">
              <div class="w-7 h-7 rounded-full border-2 border-emerald-400/90 bg-emerald-500/10 shadow"></div>
              <div class="w-9 h-0.5 bg-emerald-400/90 absolute"></div>
              <div class="h-9 w-0.5 bg-emerald-400/90 absolute"></div>
            </div>
          </div>
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent pointer-events-none"></div>

          <div class="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-950/90 border border-amber-500/40 text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
            <Crosshair class="w-3 h-3" />
            <span>2. Aim Point</span>
          </div>
          <div class="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-emerald-300">
            {{ stepCaptions.aimNote }}
          </div>
          <div class="absolute bottom-2 inset-x-2 text-[11px] font-medium text-white leading-snug line-clamp-2 drop-shadow">
            {{ stepCaptions.aim }}
          </div>
        </div>
      </div>

      <!-- Stage 3: Throw & Result -->
      <div class="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col">
        <div class="relative aspect-video w-full overflow-hidden bg-slate-950">
          <img
            :src="landingImg"
            :alt="`Result at ${lineup.endLocation}`"
            loading="lazy"
            decoding="async"
            class="w-full h-full object-cover opacity-95"
          />
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent pointer-events-none"></div>

          <div class="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-950/90 border border-emerald-500/40 text-[10px] font-black uppercase text-emerald-300">
            3. Throw &amp; Result: {{ lineup.endLocation }}
          </div>
          <div class="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono uppercase text-amber-300">
            {{ throwText }} • {{ clickText }}
          </div>
          <div class="absolute bottom-2 inset-x-2 text-[11px] font-medium text-white leading-snug line-clamp-2 drop-shadow">
            {{ stepCaptions.result }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- =========================================================
       MODE 2: SPOT & MOVEMENT ONLY (SCANNABLE HORIZONTAL STRIP)
       ========================================================= -->
  <div
    v-else-if="effectiveMode === 'spot_movement'"
    :class="[
      'lineup-card-spot-movement group w-full bg-slate-900/90 hover:bg-slate-850 border rounded-xl px-3 py-2.5 shadow-md transition-all flex flex-wrap items-center justify-between gap-2.5',
      selected
        ? 'border-amber-500 ring-2 ring-amber-500/30'
        : 'border-slate-800 hover:border-slate-700'
    ]"
  >
    <!-- Left: Checkbox + Nade + Title + Map + Source -->
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <label
        v-if="selectable"
        @click.stop
        class="flex items-center justify-center p-1 rounded bg-slate-950 border border-slate-700 cursor-pointer shrink-0"
      >
        <input
          type="checkbox"
          :checked="!!selected"
          @change="handleToggleSelect"
          class="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
        />
      </label>

      <div class="p-1.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
        <NadeIcon :type="lineup.grenadeType" :size="16" :filled="true" />
      </div>

      <div class="min-w-0 flex flex-col gap-0.5">
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            @click="handleOpenViewer"
            class="text-left font-bold text-xs text-white group-hover:text-amber-400 transition-colors truncate max-w-[220px] cursor-pointer"
          >
            {{ lineup.title }}
          </button>
          <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[9px] font-bold uppercase text-amber-400">
            {{ mapName }}
          </span>
          <span
            :class="[
              'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase',
              lineup.side === 't' ? 'bg-amber-600/80 text-white' : lineup.side === 'ct' ? 'bg-sky-600/80 text-white' : 'bg-slate-700 text-white'
            ]"
          >
            {{ lineup.side }}
          </span>
          <span
            v-if="lineup.sourceWebsite"
            class="px-1.5 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[9px] font-semibold"
          >
            {{ lineup.sourceWebsite }}
          </span>
        </div>

        <!-- Core Spot + Movement Essentials -->
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <span class="text-amber-300 font-semibold">
            📍 Stand: {{ lineup.startLocation }}
          </span>
          <span class="text-slate-500">→</span>
          <span class="text-emerald-300 font-semibold">
            🎯 Target: {{ lineup.endLocation }}
          </span>
          <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-sky-300 font-semibold capitalize text-[10px]">
            🏃 Movement: {{ movementText }}
          </span>
          <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono uppercase font-bold text-[10px]">
            ⚡ {{ throwText }}
          </span>
          <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono uppercase text-[10px]">
            🖱️ {{ clickText }}
          </span>
        </div>
      </div>
    </div>

    <!-- Right: 1-Click Actions -->
    <div class="flex items-center gap-1.5 shrink-0">
      <button
        @click="handleToggleBook"
        :class="[
          'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer',
          isInBook
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
        ]"
      >
        <BookmarkCheck v-if="isInBook" class="w-3 h-3" />
        <BookmarkPlus v-else class="w-3 h-3" />
        <span>{{ isInBook ? '✓ In My Book' : '+ My Book' }}</span>
      </button>

      <button
        @click="handleCopySetupCmd"
        class="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
        title="Copy Setup Console Command"
      >
        <Check v-if="copiedCmd" class="w-3 h-3 text-emerald-400" />
        <Copy v-else class="w-3 h-3" />
        <span>{{ copiedCmd ? 'Copied!' : 'Setup CMD' }}</span>
      </button>

      <button
        @click="handlePinOnRadar"
        class="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-sky-300 border border-sky-500/30 text-[10px] font-bold transition-colors cursor-pointer"
        title="Pin on Radar"
      >
        <Radar class="w-3 h-3" />
        <span>Radar</span>
      </button>

      <button
        @click="handleOpenViewer"
        class="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors cursor-pointer"
        title="Open Full Viewer"
      >
        <Maximize2 class="w-3 h-3" />
      </button>
    </div>
  </div>

  <!-- =========================================================
       MODE 3: CARDS (STANDARD CARD WITH MOVEMENT & BOOK ACTIONS)
       ========================================================= -->
  <div
    v-else
    @click="handleOpenViewer"
    :class="[
      'lineup-card group relative bg-slate-900/90 hover:bg-slate-850 border rounded-xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col',
      selected
        ? 'border-amber-500 ring-2 ring-amber-500/30'
        : 'border-slate-800 hover:border-slate-700'
    ]"
  >
    <!-- TOP THUMBNAIL / PREVIEW -->
    <div class="relative w-full h-32 bg-slate-950 overflow-hidden flex items-center justify-center">
      <img
        :src="cardThumbnail"
        :alt="lineup.title"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-95 group-hover:opacity-100"
      />

      <!-- TOP LEFT: SELECTBOX + NADE TYPE BADGE -->
      <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
        <label
          v-if="selectable"
          @click.stop
          class="p-1 bg-slate-950/90 backdrop-blur-md rounded-lg border border-slate-700 shadow-md flex items-center cursor-pointer hover:border-amber-400"
          title="Select for Personal Book"
        >
          <input
            type="checkbox"
            :checked="!!selected"
            @change="handleToggleSelect"
            class="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
          />
        </label>

        <div class="p-1.5 bg-slate-950/85 backdrop-blur-md rounded-lg border border-slate-800 shadow-md flex items-center gap-1.5">
          <NadeIcon :type="lineup.grenadeType" :size="16" :filled="true" />
        </div>
      </div>

      <!-- TOP RIGHT: SIDE + MAP + DELETE -->
      <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        <span class="px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-800 text-[9px] font-bold uppercase text-amber-300 backdrop-blur-md">
          {{ mapName }}
        </span>

        <span
          :class="[
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase backdrop-blur-md',
            lineup.side === 't'
              ? 'bg-amber-600/80 text-white'
              : lineup.side === 'ct'
                ? 'bg-sky-600/80 text-white'
                : 'bg-slate-700/80 text-white'
          ]"
        >
          {{ lineup.side }}
        </span>

        <button
          v-if="lineup.isCustom"
          @click="handleDelete"
          class="p-1 bg-slate-950/80 hover:bg-rose-600 backdrop-blur-md rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Delete Lineup"
        >
          <Trash2 class="w-3 h-3" />
        </button>
      </div>

      <!-- VIDEO INDICATOR -->
      <div
        v-if="lineup.videoUrl"
        class="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded text-[10px] text-slate-200 font-semibold border border-slate-800"
      >
        <Play class="w-2.5 h-2.5 fill-current text-amber-400" />
        <span>Video</span>
      </div>

      <!-- FAVORITE BUTTON -->
      <button
        @click.stop="lineupStore.toggleFavorite(lineup.id)"
        class="absolute bottom-2.5 right-2.5 p-1.5 bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md rounded-lg text-slate-400 hover:text-rose-500 border border-slate-800 transition-colors cursor-pointer"
        title="Toggle Favorite"
      >
        <Heart class="w-3.5 h-3.5" :class="{ 'fill-rose-500 text-rose-500': lineupStore.isFavorite(lineup.id) }" />
      </button>
    </div>

    <!-- CONTENT -->
    <div class="p-3.5 flex flex-col flex-grow gap-2">
      <h3 class="font-bold text-xs text-white group-hover:text-amber-400 transition-colors line-clamp-1">
        {{ lineup.title }}
      </h3>

      <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
        <span class="truncate max-w-[95px]">{{ lineup.startLocation }}</span>
        <ArrowRight class="w-3 h-3 text-slate-600 flex-shrink-0" />
        <span class="truncate max-w-[95px] text-slate-200 font-medium">{{ lineup.endLocation }}</span>
      </div>

      <!-- Movement + Throw Type Pill -->
      <div class="flex flex-wrap items-center gap-1 text-[10px]">
        <span class="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-sky-300 font-semibold capitalize">
          {{ movementText }} • {{ throwText }}
        </span>
        <span class="px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 font-mono uppercase">
          {{ clickText }}
        </span>
      </div>

      <div v-if="lineup.proPlayer || lineup.sourceWebsite" class="flex flex-wrap items-center gap-1">
        <span
          v-if="lineup.proPlayer"
          class="px-1.5 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded font-bold text-[9px] truncate max-w-[140px]"
          :title="lineup.proTeam ? `${lineup.proPlayer} (${lineup.proTeam})` : lineup.proPlayer"
        >
          ★ {{ lineup.proPlayer }}<template v-if="lineup.proTeam"> · {{ lineup.proTeam }}</template>
        </span>
        <span
          v-if="lineup.sourceWebsite"
          class="px-1.5 py-0.5 bg-slate-800/90 text-amber-400/90 border border-amber-500/20 rounded font-semibold text-[9px]"
        >
          {{ lineup.sourceWebsite }}
        </span>
      </div>

      <!-- Quick Action Row -->
      <div class="flex items-center justify-between gap-1.5 pt-2 mt-auto border-t border-slate-800 text-[10px]">
        <button
          @click="handleToggleBook"
          :class="[
            'flex items-center gap-1 px-2 py-1 rounded-lg font-bold border transition-colors cursor-pointer',
            isInBook
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
          ]"
          :title="isInBook ? 'In Personal Book (click to remove)' : 'Save to Personal Book'"
        >
          <BookmarkCheck v-if="isInBook" class="w-3 h-3" />
          <BookmarkPlus v-else class="w-3 h-3" />
          <span>{{ isInBook ? '✓ In My Book' : '+ My Book' }}</span>
        </button>

        <div class="flex items-center gap-1">
          <button
            @click="handleCopySetupCmd"
            class="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-bold transition-colors cursor-pointer"
            title="Copy Setup CMD"
          >
            <Check v-if="copiedCmd" class="w-3 h-3 text-emerald-400" />
            <Terminal v-else class="w-3 h-3" />
            <span>{{ copiedCmd ? 'Copied!' : 'Setup CMD' }}</span>
          </button>

          <button
            @click="handlePinOnRadar"
            class="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
            title="Pin on Radar"
          >
            <Radar class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
