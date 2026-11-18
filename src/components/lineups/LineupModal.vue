<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useCS2ServerStore } from '../../stores/cs2ServerStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { DEFAULT_LINEUP_IMAGE } from '../../config/site'
import { getLineupSetupConsoleCommand } from '../../core/radar/mapBounds'
import {
  generateLineupPracticeScript,
  radarToWorldCoords
} from '../../core/radar/coordinateEngine'
import type { LineupInstructionStep, ModalDisplayMode } from '../../types'
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crosshair,
  Download,
  Edit3,
  Eye,
  FileCode,
  Film,
  Flame,
  Footprints,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  MapPin,
  Mic,
  Navigation,
  Send,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  Wind,
  X,
  Zap,
  ZoomIn
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const cs2Store = useCS2ServerStore()
const voiceStore = useVoiceStore()

const copiedCmd = ref(false)
const copiedSetupCmd = ref(false)
const copiedScript = ref(false)
const showPracticeScript = ref(false)
const rconPushStatus = ref<string | null>(null)
const isPushingRcon = ref(false)
const activeImageSubTab = ref<'aim' | 'standing' | 'landing'>('aim')

// Crosshair Magnifier Loupe State
const loupeEnabled = ref(true)
const isHoveringAim = ref(false)
const loupePos = ref({ x: 50, y: 50 })

const lineup = computed(() => lineupStore.selectedLineup)
const isModalVisible = computed(
  () => Boolean(lineup.value && lineupStore.isLineupModalOpen)
)
const mapInfo = computed(() =>
  lineup.value ? mapStore.getMapById(lineup.value.mapId) : null
)
const isInPersonalBook = computed(() =>
  lineup.value ? lineupStore.isInPersonalBook(lineup.value.id) : false
)

const modalViewOptions: { id: ModalDisplayMode; label: string }[] = [
  { id: 'all_images', label: 'All Images (All-in-One)' },
  { id: 'spot_movement', label: 'Spot & Movement Only' },
  { id: 'tabs', label: 'Step Tabs / Video' }
]

const standingImageUrl = computed(() => {
  const l = lineup.value
  if (!l) return DEFAULT_LINEUP_IMAGE
  return l.standingScreenshot || l.standingSvg || l.imageUrl || DEFAULT_LINEUP_IMAGE
})

const aimImageUrl = computed(() => {
  const l = lineup.value
  if (!l) return DEFAULT_LINEUP_IMAGE
  return l.aimScreenshot || l.aimSvg || l.imageUrl || DEFAULT_LINEUP_IMAGE
})

const landingImageUrl = computed(() => {
  const l = lineup.value
  if (!l) return DEFAULT_LINEUP_IMAGE
  return l.landingScreenshot || l.landingSvg || l.imageUrl || DEFAULT_LINEUP_IMAGE
})

// Synthesize structured instructionSteps for any lineup so Step-by-Step Photo & All-in-One modes always work
const synthesizedSteps = computed<LineupInstructionStep[]>(() => {
  const l = lineup.value
  if (!l) return []
  if (l.instructionSteps && l.instructionSteps.length > 0) {
    return l.instructionSteps
  }

  const fallbackImg = l.imageUrl || DEFAULT_LINEUP_IMAGE
  return [
    {
      id: `${l.id}-step-1`,
      stepNumber: 1,
      phase: 'position',
      title: `Position at ${l.startLocation}`,
      description:
        l.instructions[0] ||
        `Stand at ${l.startLocation}${l.movementDetails ? ` (${l.movementDetails})` : ''}.`,
      imageUrl: l.standingScreenshot || fallbackImg,
      keybindHint: l.movementType === 'crouch' ? 'Hold CTRL (Crouch)' : 'Align position'
    },
    {
      id: `${l.id}-step-2`,
      stepNumber: 2,
      phase: 'aim',
      title: `Aim Towards ${l.endLocation} Landmark`,
      description:
        l.instructions[1] || `Place your crosshair on the landmark for ${l.endLocation}.`,
      imageUrl: l.aimScreenshot || fallbackImg,
      crosshairNote: l.cs2Pos
        ? `Pitch ${(l.cs2Pos.pitch ?? 0).toFixed(1)}° / Yaw ${(l.cs2Pos.yaw ?? 0).toFixed(1)}°`
        : 'Exact crosshair alignment'
    },
    {
      id: `${l.id}-step-3`,
      stepNumber: 3,
      phase: 'throw',
      title: `Execute ${l.throwType.replace(/_/g, '+').toUpperCase()}`,
      description:
        l.instructions[2] ||
        `Perform a ${l.throwType.replace(/_/g, ' ')} (${l.clickType || 'left'} click) to land the ${l.grenadeType} at ${l.endLocation}.`,
      imageUrl: l.landingScreenshot || fallbackImg,
      keybindHint:
        l.throwType === 'jumpthrow'
          ? 'Mouse1 + Jump'
          : l.throwType === 'w_jumpthrow'
            ? 'W + Jump + Mouse1'
            : `${(l.clickType || 'left').toUpperCase()} Click Throw`
    }
  ]
})

const currentStep = computed<LineupInstructionStep | null>(() => {
  const steps = synthesizedSteps.value
  if (!steps.length) return null
  const idx = Math.max(0, Math.min(steps.length - 1, lineupStore.activeInstructionStepIndex))
  return steps[idx] ?? steps[0]!
})

const aimNoteText = computed(() => {
  const l = lineup.value
  if (!l) return ''
  const aimStep = synthesizedSteps.value.find((s) => s.phase === 'aim') || synthesizedSteps.value[1]
  return (
    aimStep?.crosshairNote ||
    aimStep?.description ||
    l.instructions?.[1] ||
    (l.cs2Pos?.pitch !== undefined && l.cs2Pos?.yaw !== undefined
      ? `Pitch ${l.cs2Pos.pitch.toFixed(1)}° / Yaw ${l.cs2Pos.yaw.toFixed(1)}°`
      : `Align crosshair toward ${l.endLocation}`)
  )
})

const computedWorldOrigin = computed(() => {
  const l = lineup.value
  if (!l) return null
  if (l.cs2Pos) return l.cs2Pos
  const w = radarToWorldCoords(l.mapId, l.originCoords)
  return { x: w.x, y: w.y, z: w.z, pitch: -32.0, yaw: -115.0 }
})

const computedConsoleCmd = computed(() => {
  const l = lineup.value
  if (!l) return ''
  if (l.consoleCommand) return l.consoleCommand
  const w = computedWorldOrigin.value
  if (!w) return ''
  return `setpos ${w.x} ${w.y} ${w.z}; setang ${w.pitch} ${w.yaw} 0`
})

const setupConsoleCmd = computed(() => {
  const l = lineup.value
  if (!l) return ''
  return getLineupSetupConsoleCommand(l)
})

const practiceScriptContent = computed(() => {
  const l = lineup.value
  if (!l) return ''
  return (
    l.practiceScript ||
    generateLineupPracticeScript(l.title, computedConsoleCmd.value, l.throwType)
  )
})

watch(
  () => lineup.value?.id,
  () => {
    copiedCmd.value = false
    copiedSetupCmd.value = false
    copiedScript.value = false
    rconPushStatus.value = null
  }
)

function handleAimMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  loupePos.value = {
    x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

async function copySetupCommand() {
  if (await copyToClipboard(setupConsoleCmd.value)) {
    copiedSetupCmd.value = true
    setTimeout(() => {
      copiedSetupCmd.value = false
    }, 2000)
  }
}

async function copyConsoleCommand() {
  if (await copyToClipboard(computedConsoleCmd.value)) {
    copiedCmd.value = true
    setTimeout(() => {
      copiedCmd.value = false
    }, 2000)
  }
}

async function copyPracticeScript() {
  if (await copyToClipboard(practiceScriptContent.value)) {
    copiedScript.value = true
    setTimeout(() => {
      copiedScript.value = false
    }, 2000)
  }
}

function downloadPracticeCfg() {
  if (!lineup.value) return
  const blob = new Blob([practiceScriptContent.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `practice_${lineup.value.id}.cfg`
  a.click()
  URL.revokeObjectURL(url)
}

async function teleportInCS2() {
  if (!lineup.value) return
  isPushingRcon.value = true
  rconPushStatus.value = null
  const res = await cs2Store.pushLineupToGame(lineup.value)
  isPushingRcon.value = false
  if (res?.success) {
    rconPushStatus.value = 'Teleported player in CS2!'
  } else {
    rconPushStatus.value = res?.error || 'RCON server offline — copied setup command instead'
    copySetupCommand()
  }
}

function jumpToVideoTab() {
  lineupStore.modalDisplayMode = 'tabs'
  lineupStore.activeInstructionFormat = 'video'
}
</script>

<template>
  <div
    v-if="isModalVisible && lineup"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    @click.self="lineupStore.closeLineup()"
  >
    <div
      class="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col"
    >
      <!-- Top Header -->
      <div
        class="flex flex-col gap-3 px-4 sm:px-6 py-3.5 bg-slate-950/90 border-b border-slate-800"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Lineup Title & Badges -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                lineup.grenadeType === 'smoke'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                  : lineup.grenadeType === 'flash'
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
                    : lineup.grenadeType === 'molotov'
                      ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                      : 'bg-red-500/15 border-red-500/40 text-red-400'
              ]"
            >
              <Wind v-if="lineup.grenadeType === 'smoke'" class="w-5 h-5" />
              <Zap v-else-if="lineup.grenadeType === 'flash'" class="w-5 h-5" />
              <Flame v-else-if="lineup.grenadeType === 'molotov'" class="w-5 h-5" />
              <Sparkles v-else class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30"
                >
                  {{ mapInfo?.name || lineup.mapId }}
                </span>
                <span
                  :class="[
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                    lineup.side === 't'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-sky-500/15 text-sky-400'
                  ]"
                >
                  {{ lineup.side.toUpperCase() }} Side
                </span>
                <span
                  v-if="lineup.radarFloor"
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                >
                  {{ lineup.radarFloor }}
                </span>
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300"
                >
                  {{ lineup.throwType.replace(/_/g, ' + ').toUpperCase() }}
                </span>
                <span
                  v-if="lineup.playerRole"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30"
                >
                  Role: {{ lineup.playerRole }}
                </span>
                <span
                  v-if="lineup.proPlayer"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  ★ {{ lineup.proPlayer }}<template v-if="lineup.proTeam"> ({{ lineup.proTeam }})</template>
                </span>
                <span
                  v-if="lineup.tournament"
                  class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25"
                >
                  {{ lineup.tournament }}
                </span>
                <a
                  v-if="lineup.sourceWebsite && lineup.sourceUrl"
                  :href="lineup.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
                >
                  {{ lineup.sourceWebsite }} ↗
                </a>
                <span
                  v-else-if="lineup.sourceWebsite"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                >
                  {{ lineup.sourceWebsite }}
                </span>
              </div>
              <h2 class="text-base sm:text-lg font-extrabold text-white truncate mt-0.5">
                {{ lineup.title }}
              </h2>
            </div>
          </div>

          <!-- Primary Modal Action Bar -->
          <div class="flex flex-wrap items-center gap-1.5">
            <!-- Save to Personal Book -->
            <button
              @click="lineupStore.togglePersonalBook(lineup)"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-sm',
                isInPersonalBook
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950'
              ]"
            >
              <BookmarkCheck v-if="isInPersonalBook" class="w-4 h-4" />
              <BookmarkPlus v-else class="w-4 h-4" />
              <span>{{ isInPersonalBook ? '✓ In Personal Book' : '+ Save to Personal Book' }}</span>
            </button>

            <!-- Copy Setup CMD -->
            <button
              @click="copySetupCommand"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
              title="Copy CS2 setup console command (setpos_exact + setang + grenade)"
            >
              <Check v-if="copiedSetupCmd" class="w-3.5 h-3.5 text-emerald-400" />
              <Terminal v-else class="w-3.5 h-3.5" />
              <span>{{ copiedSetupCmd ? 'Copied!' : 'Copy Setup CMD' }}</span>
            </button>

            <!-- Voice Nav -->
            <button
              @click="voiceStore.startListening(true)"
              :class="[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                voiceStore.isListening
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700'
              ]"
              title="Voice Control: Say 'Next step', 'Previous step', 'Show video', or 'Copy command'"
            >
              <Mic class="w-3.5 h-3.5" />
              <span class="hidden md:inline">
                {{ voiceStore.isListening ? 'Hands-Free' : 'Voice Nav' }}
              </span>
            </button>

            <button
              @click="lineupStore.toggleFavorite(lineup.id)"
              :class="[
                'p-2 rounded-xl border transition-colors cursor-pointer',
                lineupStore.isFavorite(lineup.id)
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-white'
              ]"
              title="Favorite Lineup"
            >
              <Star class="w-4 h-4" :fill="lineupStore.isFavorite(lineup.id) ? 'currentColor' : 'none'" />
            </button>

            <button
              @click="lineupStore.startPlacingLineup(lineup)"
              class="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
              title="Edit Lineup"
            >
              <Edit3 class="w-4 h-4" />
            </button>

            <button
              v-if="lineup.isCustom"
              @click="lineupStore.deleteLineup(lineup.id)"
              class="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition-colors cursor-pointer"
              title="Delete Custom Lineup"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <button
              @click="lineupStore.closeLineup()"
              class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Modal"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 3-Way Modal Display Mode Switcher -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div class="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              v-for="mode in modalViewOptions"
              :key="mode.id"
              @click="lineupStore.modalDisplayMode = mode.id"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                lineupStore.modalDisplayMode === mode.id
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              ]"
            >
              <Layers v-if="mode.id === 'all_images'" class="w-3.5 h-3.5" />
              <Footprints v-else-if="mode.id === 'spot_movement'" class="w-3.5 h-3.5" />
              <ListOrdered v-else class="w-3.5 h-3.5" />
              <span>{{ mode.label }}</span>
            </button>
          </div>

          <div class="flex items-center gap-2 text-[11px]">
            <button
              v-if="lineup.videoUrl && lineupStore.modalDisplayMode !== 'tabs'"
              @click="jumpToVideoTab"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold cursor-pointer"
            >
              <Film class="w-3.5 h-3.5" />
              <span>Watch Video Clip</span>
            </button>
            <span class="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-semibold">
              📍 {{ lineup.startLocation }} → 🎯 {{ lineup.endLocation }}
            </span>
          </div>
        </div>
      </div>

      <!-- =========================================================
           MODE 1: ALL IMAGES (ALL-IN-ONE) — NO TAB CLICKING NEEDED
           ========================================================= -->
      <div
        v-if="lineupStore.modalDisplayMode === 'all_images'"
        class="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5"
      >
        <!-- Visual Header Controls -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Eye class="w-4 h-4 text-amber-400" />
            <span>Standing, Aim Alignment &amp; Landing Result — All Visible Simultaneously</span>
          </div>
          <button
            @click="loupeEnabled = !loupeEnabled"
            :class="[
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer',
              loupeEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            ]"
          >
            <ZoomIn class="w-3.5 h-3.5" />
            <span>Aim 2.8× Loupe: {{ loupeEnabled ? 'ON (Hover Aim)' : 'OFF' }}</span>
          </button>
        </div>

        <!-- 3 Simultaneous Visual Panels -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 1. Standing Position -->
          <div class="flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg">
            <div class="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span class="text-xs font-black text-sky-300 uppercase">1. Standing Position</span>
              <span class="text-[10px] font-mono text-slate-400">{{ lineup.startLocation }}</span>
            </div>
            <div class="relative aspect-video w-full bg-slate-950 overflow-hidden">
              <img :src="standingImageUrl" :alt="`Standing at ${lineup.startLocation}`" class="w-full h-full object-cover" />
              <div class="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-200 line-clamp-2">
                {{ synthesizedSteps[0]?.description || `Stand at ${lineup.startLocation}` }}
              </div>
            </div>
          </div>

          <!-- 2. Aim Alignment (with Reticle + Loupe Toggle) -->
          <div class="flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-amber-500/40 shadow-lg">
            <div class="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span class="text-xs font-black text-amber-300 uppercase flex items-center gap-1">
                <Crosshair class="w-3.5 h-3.5" />
                <span>2. Aim Alignment</span>
              </span>
              <span class="text-[10px] font-mono text-emerald-300">
                {{ aimNoteText }}
              </span>
            </div>
            <div
              class="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-crosshair"
              @mouseenter="isHoveringAim = true"
              @mouseleave="isHoveringAim = false"
              @mousemove="handleAimMouseMove"
            >
              <img :src="aimImageUrl" :alt="`Aim alignment for ${lineup.title}`" class="w-full h-full object-cover" />

              <!-- Crosshair Reticle Overlay -->
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="relative flex items-center justify-center">
                  <div class="w-9 h-9 rounded-full border-2 border-amber-400/75 animate-ping absolute"></div>
                  <div class="w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-500/10"></div>
                  <div class="w-9 h-0.5 bg-emerald-400 absolute"></div>
                  <div class="h-9 w-0.5 bg-emerald-400 absolute"></div>
                </div>
              </div>

              <!-- 2.8x Precision Loupe -->
              <div
                v-if="loupeEnabled && isHoveringAim"
                class="absolute w-32 h-32 rounded-full border-2 border-amber-400 shadow-2xl pointer-events-none overflow-hidden"
                :style="{
                  left: `calc(${loupePos.x}% - 64px)`,
                  top: `calc(${loupePos.y}% - 64px)`,
                  backgroundImage: `url(${aimImageUrl})`,
                  backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                  backgroundSize: '280%'
                }"
              >
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-full h-px bg-emerald-400/80"></div>
                  <div class="h-full w-px bg-emerald-400/80 absolute"></div>
                </div>
              </div>

              <div class="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-200 line-clamp-2 pointer-events-none">
                {{ synthesizedSteps[1]?.description || `Aim at landmark for ${lineup.endLocation}` }}
              </div>
            </div>
          </div>

          <!-- 3. Landing Result -->
          <div class="flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg">
            <div class="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span class="text-xs font-black text-emerald-300 uppercase">3. Landing Result</span>
              <span class="text-[10px] font-mono text-slate-400">{{ lineup.endLocation }}</span>
            </div>
            <div class="relative aspect-video w-full bg-slate-950 overflow-hidden">
              <img :src="landingImageUrl" :alt="`Result at ${lineup.endLocation}`" class="w-full h-full object-cover" />
              <div class="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-200 line-clamp-2">
                {{ synthesizedSteps[2]?.description || `Lands at ${lineup.endLocation}` }}
              </div>
            </div>
          </div>
        </div>

        <!-- All Step-by-Step Cards Side-by-Side Simultaneously -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="step in synthesizedSteps"
            :key="step.id"
            class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5"
          >
            <div class="flex items-center justify-between text-[10px] font-black uppercase">
              <span class="text-amber-400">Step {{ step.stepNumber }} • {{ step.phase }}</span>
              <span
                v-if="step.keybindHint || step.crosshairNote"
                class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-emerald-300"
              >
                {{ step.keybindHint || step.crosshairNote }}
              </span>
            </div>
            <div class="text-xs font-bold text-white">{{ step.title }}</div>
            <p class="text-xs text-slate-300 leading-relaxed">{{ step.description }}</p>
          </div>
        </div>

        <!-- Execution Details & Console Command Bar -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Execution, Movement &amp; Coordinates
              </h3>
              <span v-if="lineup.movementDetails" class="text-[11px] font-semibold text-sky-300">
                🏃 {{ lineup.movementDetails }}
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Stand Spot</div>
                <div class="text-xs font-bold text-white mt-0.5">{{ lineup.startLocation }}</div>
                <div class="text-[10px] font-mono text-slate-400">{{ lineup.originCoords.x }}%, {{ lineup.originCoords.y }}%</div>
              </div>
              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Landing Target</div>
                <div class="text-xs font-bold text-white mt-0.5">{{ lineup.endLocation }}</div>
                <div class="text-[10px] font-mono text-slate-400">{{ lineup.landingCoords.x }}%, {{ lineup.landingCoords.y }}%</div>
              </div>
              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Movement &amp; Throw</div>
                <div class="text-xs font-bold text-white mt-0.5 capitalize">
                  {{ (lineup.movementType || 'stationary').replace(/_/g, ' ') }}
                </div>
                <div class="text-[10px] font-mono text-amber-300 uppercase">
                  {{ lineup.throwType.replace(/_/g, ' + ') }} • {{ lineup.clickType || 'left' }}
                </div>
              </div>
              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">CS2 Angles</div>
                <div class="text-xs font-mono font-bold text-white mt-0.5">
                  {{ computedWorldOrigin?.pitch }}° / {{ computedWorldOrigin?.yaw }}°
                </div>
                <div class="text-[10px] font-mono text-slate-400 truncate">
                  {{ computedWorldOrigin?.x }}, {{ computedWorldOrigin?.y }}, {{ computedWorldOrigin?.z }}
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                <Terminal class="w-3.5 h-3.5" />
                <span>1-Click CS2 Setup Command</span>
              </div>
              <button
                @click="showPracticeScript = !showPracticeScript"
                class="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <FileCode class="w-3 h-3" />
                <span>{{ showPracticeScript ? 'Hide CFG' : 'Practice CFG' }}</span>
              </button>
            </div>

            <div class="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300">
              <span class="truncate">{{ setupConsoleCmd }}</span>
              <button
                @click="copySetupCommand"
                class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-sans font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Check v-if="copiedSetupCmd" class="w-3 h-3 text-emerald-400" />
                <Copy v-else class="w-3 h-3" />
                <span>{{ copiedSetupCmd ? 'Copied!' : 'Copy' }}</span>
              </button>
            </div>

            <div v-if="showPracticeScript" class="space-y-2">
              <pre class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-28">{{ practiceScriptContent }}</pre>
              <div class="flex items-center gap-2">
                <button
                  @click="copyPracticeScript"
                  class="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Copy class="w-3 h-3" />
                  <span>{{ copiedScript ? 'Copied Script!' : 'Copy Full Script' }}</span>
                </button>
                <button
                  @click="downloadPracticeCfg"
                  class="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download class="w-3 h-3" />
                  <span>Download .cfg</span>
                </button>
              </div>
            </div>

            <button
              @click="teleportInCS2"
              :disabled="isPushingRcon"
              class="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Send class="w-3.5 h-3.5" />
              <span>{{ isPushingRcon ? 'Sending RCON...' : 'Teleport in CS2 (RCON / Copy CMD)' }}</span>
            </button>
            <div v-if="rconPushStatus" class="text-[11px] text-center font-semibold text-amber-300">
              {{ rconPushStatus }}
            </div>
          </div>
        </div>
      </div>

      <!-- =========================================================
           MODE 2: SPOT & MOVEMENT ONLY (CLEAN FOCUS PANEL + AIM)
           ========================================================= -->
      <div
        v-else-if="lineupStore.modalDisplayMode === 'spot_movement'"
        class="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
      >
        <!-- Left 6 Cols: Clean Spot & Movement Focus Panel -->
        <div class="lg:col-span-6 flex flex-col gap-4">
          <div class="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Footprints class="w-4 h-4" />
                <span>Spot &amp; Movement Focus</span>
              </span>
              <span class="text-[11px] font-mono text-slate-400">
                Origin {{ lineup.originCoords.x }}%, {{ lineup.originCoords.y }}% → {{ lineup.landingCoords.x }}%, {{ lineup.landingCoords.y }}%
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-[10px] font-bold uppercase text-amber-400">📍 Stand Spot</div>
                <div class="text-sm font-black text-white mt-0.5">{{ lineup.startLocation }}</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-[10px] font-bold uppercase text-emerald-400">🎯 Target</div>
                <div class="text-sm font-black text-white mt-0.5">{{ lineup.endLocation }}</div>
              </div>
            </div>

            <!-- Movement Required -->
            <div class="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1.5">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                🏃 Movement Required
              </div>
              <div class="text-sm font-black text-white capitalize">
                {{ (lineup.movementType || 'stationary').replace(/_/g, ' ') }}
              </div>
              <p v-if="lineup.movementDetails" class="text-xs text-slate-200 leading-relaxed">
                {{ lineup.movementDetails }}
              </p>
            </div>

            <!-- Throw Type + Click Type -->
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-[10px] font-bold uppercase text-slate-400">⚡ Throw Type</div>
                <div class="text-xs font-mono font-black text-amber-400 uppercase mt-1">
                  {{ lineup.throwType.replace(/_/g, ' + ') }}
                </div>
              </div>
              <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div class="text-[10px] font-bold uppercase text-slate-400">🖱️ Click Type</div>
                <div class="text-xs font-mono font-black text-white uppercase mt-1">
                  {{ lineup.clickType || 'left' }} click
                </div>
              </div>
            </div>

            <!-- Aim Note -->
            <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                🎯 Aim Note
              </div>
              <p class="text-xs font-semibold text-white leading-relaxed">
                {{ aimNoteText }}
              </p>
            </div>

            <!-- 1-Click Setup CMD -->
            <div class="space-y-2 pt-1">
              <div class="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300">
                <span class="truncate">{{ setupConsoleCmd }}</span>
                <button
                  @click="copySetupCommand"
                  class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-black text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Check v-if="copiedSetupCmd" class="w-3.5 h-3.5" />
                  <Terminal v-else class="w-3.5 h-3.5" />
                  <span>{{ copiedSetupCmd ? 'Copied!' : 'Setup CMD' }}</span>
                </button>
              </div>
              <button
                @click="teleportInCS2"
                :disabled="isPushingRcon"
                class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send class="w-3.5 h-3.5" />
                <span>{{ isPushingRcon ? 'Teleporting...' : 'Teleport to Spot in CS2 (RCON)' }}</span>
              </button>
              <div v-if="rconPushStatus" class="text-[11px] text-center font-semibold text-amber-300">
                {{ rconPushStatus }}
              </div>
            </div>
          </div>
        </div>

        <!-- Right 6 Cols: Compact Aim Crosshair Image + Quick Steps -->
        <div class="lg:col-span-6 flex flex-col gap-3">
          <div class="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden">
            <div class="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span class="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                <Crosshair class="w-3.5 h-3.5" />
                <span>Compact Aim Crosshair Reference</span>
              </span>
              <span class="text-[10px] font-mono text-slate-400">Hover to magnify 2.8×</span>
            </div>
            <div
              class="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-crosshair"
              @mouseenter="isHoveringAim = true"
              @mouseleave="isHoveringAim = false"
              @mousemove="handleAimMouseMove"
            >
              <img :src="aimImageUrl" :alt="`Aim crosshair for ${lineup.title}`" class="w-full h-full object-cover" />
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="relative flex items-center justify-center">
                  <div class="w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-500/10"></div>
                  <div class="w-8 h-0.5 bg-emerald-400 absolute"></div>
                  <div class="h-8 w-0.5 bg-emerald-400 absolute"></div>
                </div>
              </div>
              <div
                v-if="isHoveringAim"
                class="absolute w-32 h-32 rounded-full border-2 border-amber-400 shadow-2xl pointer-events-none overflow-hidden"
                :style="{
                  left: `calc(${loupePos.x}% - 64px)`,
                  top: `calc(${loupePos.y}% - 64px)`,
                  backgroundImage: `url(${aimImageUrl})`,
                  backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                  backgroundSize: '280%'
                }"
              >
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-full h-px bg-emerald-400/80"></div>
                  <div class="h-full w-px bg-emerald-400/80 absolute"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Concise Checklist -->
          <div class="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Quick Execution Steps
            </h3>
            <ol class="space-y-1.5">
              <li
                v-for="(inst, idx) in lineup.instructions"
                :key="idx"
                class="flex items-start gap-2 text-xs text-slate-200"
              >
                <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {{ idx + 1 }}
                </span>
                <span class="leading-relaxed">{{ inst }}</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- =========================================================
           MODE 3: STEP TABS / VIDEO (INTERACTIVE WALKTHROUGH)
           ========================================================= -->
      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 overflow-y-auto"
      >
        <!-- Left 7 Cols: Multi-Format Instruction Viewer (Step-by-Step Photos | Individual Images | Video) -->
        <div class="lg:col-span-7 flex flex-col gap-3">
          <!-- Instruction Format Switcher Bar -->
          <div
            class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800"
          >
            <div class="flex items-center gap-1">
              <button
                @click="lineupStore.activeInstructionFormat = 'steps'"
                :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  lineupStore.activeInstructionFormat === 'steps'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <ListOrdered class="w-3.5 h-3.5" />
                <span>Step-by-Step Photos ({{ synthesizedSteps.length }})</span>
              </button>

              <button
                @click="lineupStore.activeInstructionFormat = 'images'"
                :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  lineupStore.activeInstructionFormat === 'images'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <ImageIcon class="w-3.5 h-3.5" />
                <span>Individual Images &amp; Loupe</span>
              </button>

              <button
                @click="lineupStore.activeInstructionFormat = 'video'"
                :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  lineupStore.activeInstructionFormat === 'video'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <Film class="w-3.5 h-3.5" />
                <span>Video Clip</span>
              </button>
            </div>

            <!-- Stepper Controls when in Step-by-Step mode -->
            <div
              v-if="lineupStore.activeInstructionFormat === 'steps'"
              class="flex items-center gap-1"
            >
              <button
                @click="lineupStore.prevInstructionStep()"
                class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Previous Step (Voice: 'Previous step')"
              >
                <ChevronLeft class="w-3.5 h-3.5" />
              </button>
              <span class="text-xs font-mono text-amber-400 px-2 font-bold">
                Step {{ lineupStore.activeInstructionStepIndex + 1 }} / {{ synthesizedSteps.length }}
              </span>
              <button
                @click="lineupStore.nextInstructionStep()"
                class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                title="Next Step (Voice: 'Next step')"
              >
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- FORMAT 1: STEP-BY-STEP PHOTO INSTRUCTIONS -->
          <div
            v-if="lineupStore.activeInstructionFormat === 'steps' && currentStep"
            class="flex flex-col gap-3"
          >
            <div
              class="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner"
            >
              <img
                :src="currentStep.imageUrl || lineup.imageUrl || DEFAULT_LINEUP_IMAGE"
                :alt="currentStep.title"
                class="w-full h-full object-cover"
              />

              <!-- Crosshair Reticle Overlay on Aim Phase -->
              <div
                v-if="currentStep.phase === 'aim'"
                class="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div class="relative flex items-center justify-center">
                  <div class="w-10 h-10 rounded-full border-2 border-amber-400/80 animate-ping absolute"></div>
                  <div class="w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-500/10"></div>
                  <div class="w-8 h-0.5 bg-emerald-400 absolute"></div>
                  <div class="h-8 w-0.5 bg-emerald-400 absolute"></div>
                </div>
              </div>

              <!-- Step Badge Overlay -->
              <div
                class="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40"
              >
                <span
                  class="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center"
                >
                  {{ currentStep.stepNumber }}
                </span>
                <div>
                  <div class="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                    Phase: {{ currentStep.phase }}
                  </div>
                  <div class="text-xs font-bold text-white">{{ currentStep.title }}</div>
                </div>
              </div>

              <!-- Keybind / Crosshair Note Pill -->
              <div
                v-if="currentStep.keybindHint || currentStep.crosshairNote"
                class="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono text-emerald-300"
              >
                {{ currentStep.keybindHint || currentStep.crosshairNote }}
              </div>
            </div>

            <!-- Interactive Step Strip -->
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="(step, idx) in synthesizedSteps"
                :key="step.id"
                @click="lineupStore.activeInstructionStepIndex = idx"
                :class="[
                  'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                  lineupStore.activeInstructionStepIndex === idx
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                ]"
              >
                <div class="flex items-center justify-between text-[10px] font-bold uppercase mb-1">
                  <span class="text-amber-400">Step {{ step.stepNumber }}</span>
                  <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {{ step.phase }}
                  </span>
                </div>
                <div class="text-xs font-bold truncate">{{ step.title }}</div>
                <div class="text-[11px] opacity-80 line-clamp-2 mt-0.5">
                  {{ step.description }}
                </div>
              </button>
            </div>
          </div>

          <!-- FORMAT 2: INDIVIDUAL IMAGES WITH CROSSHAIR MAGNIFIER LOUPE -->
          <div
            v-else-if="lineupStore.activeInstructionFormat === 'images'"
            class="flex flex-col gap-3"
          >
            <div class="flex flex-wrap items-center gap-2">
              <button
                @click="activeImageSubTab = 'standing'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer',
                  activeImageSubTab === 'standing'
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                ]"
              >
                1. Standing Spot
              </button>
              <button
                @click="activeImageSubTab = 'aim'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer',
                  activeImageSubTab === 'aim'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                ]"
              >
                2. Aim Point (Hover to Magnify 2.8×)
              </button>
              <button
                @click="activeImageSubTab = 'landing'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer',
                  activeImageSubTab === 'landing'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                ]"
              >
                3. Landing Result
              </button>
            </div>

            <div
              class="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-crosshair"
              @mouseenter="isHoveringAim = true"
              @mouseleave="isHoveringAim = false"
              @mousemove="handleAimMouseMove"
            >
              <img
                :src="
                  activeImageSubTab === 'standing'
                    ? standingImageUrl
                    : activeImageSubTab === 'aim'
                      ? aimImageUrl
                      : landingImageUrl
                "
                :alt="lineup.title"
                class="w-full h-full object-cover"
              />

              <!-- 2.8x Precision Crosshair Loupe on Aim Image -->
              <div
                v-if="isHoveringAim && activeImageSubTab === 'aim'"
                class="absolute w-36 h-36 rounded-full border-2 border-amber-400 shadow-2xl pointer-events-none overflow-hidden"
                :style="{
                  left: `calc(${loupePos.x}% - 72px)`,
                  top: `calc(${loupePos.y}% - 72px)`,
                  backgroundImage: `url(${aimImageUrl})`,
                  backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                  backgroundSize: '280%'
                }"
              >
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-full h-px bg-emerald-400/80"></div>
                  <div class="h-full w-px bg-emerald-400/80 absolute"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- FORMAT 3: VIDEO PLAYER / TRAJECTORY PREVIEW -->
          <div v-else class="flex flex-col gap-3">
            <div
              class="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center"
            >
              <video
                v-if="
                  lineup.videoUrl &&
                  (lineup.videoUrl.endsWith('.mp4') ||
                    lineup.videoUrl.endsWith('.webm') ||
                    lineup.videoUrl.startsWith('/uploads/'))
                "
                :src="lineup.videoUrl"
                controls
                autoplay
                loop
                muted
                class="w-full h-full object-contain"
              ></video>
              <iframe
                v-else-if="lineup.videoUrl"
                :src="lineup.videoUrl"
                class="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowfullscreen
              ></iframe>
              <div v-else class="p-6 text-center space-y-3">
                <Film class="w-10 h-10 text-amber-400 mx-auto opacity-80" />
                <div class="text-sm font-bold text-white">
                  No External Video Clip Attached Yet
                </div>
                <p class="text-xs text-slate-400 max-w-md">
                  Use <strong>All Images (All-in-One)</strong> or <strong>Step-by-Step Photos</strong>, or click <strong>Edit Lineup</strong> to upload an MP4/WebM clip.
                </p>
                <button
                  @click="lineupStore.modalDisplayMode = 'all_images'"
                  class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Switch to All Images View
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right 5 Cols: Execution Details, Coordinates, Console Commands & Practice Scripts -->
        <div class="lg:col-span-5 flex flex-col gap-4">
          <!-- Tactical Execution Specs -->
          <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              Execution &amp; Coordinate Details
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              {{ lineup.description }}
            </p>

            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                  <MapPin class="w-3 h-3 text-amber-400" />
                  Throw Position
                </div>
                <div class="text-xs font-bold text-white mt-0.5">{{ lineup.startLocation }}</div>
                <div class="text-[10px] font-mono text-slate-400">
                  Radar: {{ lineup.originCoords.x }}%, {{ lineup.originCoords.y }}%
                </div>
              </div>

              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                  <Crosshair class="w-3 h-3 text-emerald-400" />
                  Landing Target
                </div>
                <div class="text-xs font-bold text-white mt-0.5">{{ lineup.endLocation }}</div>
                <div class="text-[10px] font-mono text-slate-400">
                  Radar: {{ lineup.landingCoords.x }}%, {{ lineup.landingCoords.y }}%
                </div>
              </div>

              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                  <Footprints class="w-3 h-3 text-sky-400" />
                  Movement &amp; Throw
                </div>
                <div class="text-xs font-bold text-white mt-0.5 capitalize">
                  {{ (lineup.movementType || 'Stationary').replace(/_/g, ' ') }} • {{ lineup.throwType.replace(/_/g, '+') }}
                </div>
                <div class="text-[10px] font-mono text-slate-400">
                  Click: {{ (lineup.clickType || 'left').toUpperCase() }} • Subtick
                </div>
              </div>

              <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80">
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                  <Navigation class="w-3 h-3 text-purple-400" />
                  CS2 World Coords
                </div>
                <div class="text-xs font-mono font-bold text-white mt-0.5">
                  {{ computedWorldOrigin?.x }}, {{ computedWorldOrigin?.y }}, {{ computedWorldOrigin?.z }}
                </div>
                <div class="text-[10px] font-mono text-slate-400">
                  Ang: {{ computedWorldOrigin?.pitch }}° / {{ computedWorldOrigin?.yaw }}°
                </div>
              </div>
            </div>
          </div>

          <!-- Numbered Text Checklist -->
          <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Checklist Instructions
            </h3>
            <ol class="space-y-2">
              <li
                v-for="(inst, idx) in lineup.instructions"
                :key="idx"
                class="flex items-start gap-2.5 text-xs text-slate-200"
              >
                <span
                  class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5"
                >
                  {{ idx + 1 }}
                </span>
                <span class="leading-relaxed">{{ inst }}</span>
              </li>
            </ol>
          </div>

          <!-- Console Commands, Configs & Live CS2 RCON Teleport -->
          <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                <Terminal class="w-3.5 h-3.5" />
                <span>CS2 Console &amp; Practice Script</span>
              </div>
              <button
                @click="showPracticeScript = !showPracticeScript"
                class="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <FileCode class="w-3 h-3" />
                <span>{{ showPracticeScript ? 'Hide CFG Script' : 'View Practice CFG' }}</span>
              </button>
            </div>

            <!-- Setup Command Box -->
            <div
              class="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300"
            >
              <span class="truncate">{{ computedConsoleCmd }}</span>
              <button
                @click="copyConsoleCommand"
                class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-sans font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Check v-if="copiedCmd" class="w-3 h-3 text-emerald-400" />
                <Copy v-else class="w-3 h-3" />
                <span>{{ copiedCmd ? 'Copied!' : 'Copy' }}</span>
              </button>
            </div>

            <!-- Expandable Full Practice Config Script -->
            <div v-if="showPracticeScript" class="space-y-2 pt-1">
              <pre
                class="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36"
              >{{ practiceScriptContent }}</pre>
              <div class="flex items-center gap-2">
                <button
                  @click="copyPracticeScript"
                  class="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy class="w-3.5 h-3.5" />
                  <span>{{ copiedScript ? 'Copied Script!' : 'Copy Full Script' }}</span>
                </button>
                <button
                  @click="downloadPracticeCfg"
                  class="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download class="w-3.5 h-3.5" />
                  <span>Download .cfg</span>
                </button>
              </div>
            </div>

            <!-- RCON Teleport to Position in CS2 -->
            <button
              @click="teleportInCS2"
              :disabled="isPushingRcon"
              class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 transition-all cursor-pointer"
            >
              <Send class="w-3.5 h-3.5" />
              <span>
                {{
                  isPushingRcon
                    ? 'Sending RCON setpos to CS2...'
                    : 'Teleport to Lineup in CS2 (RCON / Copy setpos)'
                }}
              </span>
            </button>
            <div v-if="rconPushStatus" class="text-[11px] text-center font-semibold text-amber-300">
              {{ rconPushStatus }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
