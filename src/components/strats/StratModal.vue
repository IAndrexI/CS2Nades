<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStratStore } from '../../stores/stratStore'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import NadeIcon from '../common/NadeIcon.vue'
import type { Strategy, StratPhase, Lineup } from '../../types'
import {
  X,
  Users,
  Trash2,
  Clock,
  ExternalLink,
  BookmarkCheck,
  Send,
  CheckCircle2,
  MapPin
} from 'lucide-vue-next'

const router = useRouter()
const stratStore = useStratStore()
const lineupStore = useLineupStore()
const mapStore = useMapStore()
const { confirmAction } = useConfirmDialog()

const strat = computed(() => stratStore.activeStrat)
const activePhaseIndex = ref(0)
const highlightedSlot = ref<number | null>(null)

watch(
  () => strat.value?.id,
  () => {
    activePhaseIndex.value = 0
    highlightedSlot.value = null
  }
)

const stratMap = computed(() => {
  if (!strat.value) return mapStore.currentMap
  return mapStore.getMapById(strat.value.mapId)
})

const radarImageSrc = computed(() => {
  if (!stratMap.value) return '/radars/de_mirage_radar.png'
  if (mapStore.radarSkin === 'simpleradar' && stratMap.value.simpleRadarImage) {
    return stratMap.value.simpleRadarImage
  }
  return stratMap.value.radarImage
})

const currentPhase = computed<StratPhase | null>(() => {
  if (!strat.value || !strat.value.phases.length) return null
  return strat.value.phases[activePhaseIndex.value] || strat.value.phases[0] || null
})

const isMarkedForTactics = computed(() => {
  return !!strat.value && stratStore.selectedStratForTacticsId === strat.value.id
})

function formatBuyType(buy: Strategy['buyType']): string {
  switch (buy) {
    case 'full_buy':
      return 'Full Buy'
    case 'force_buy':
      return 'Force Buy'
    case 'semi_buy':
      return 'Half Buy'
    case 'pistol':
      return 'Pistol'
    case 'eco':
      return 'Eco'
    default:
      return 'Full Buy'
  }
}

function getLineupById(id: string): Lineup | undefined {
  return lineupStore.allLineups.find((l) => l.id === id)
}

function openLinkedLineup(lineupId: string) {
  const l = getLineupById(lineupId)
  if (l) {
    lineupStore.openLineup(l)
  }
}

function handleToggleMark() {
  if (!strat.value) return
  if (isMarkedForTactics.value) {
    stratStore.markStratForTactics(null)
  } else {
    stratStore.markStratForTactics(strat.value)
  }
}

function handleSendToTactics() {
  if (!strat.value) return
  stratStore.applyStratToBoard(strat.value, activePhaseIndex.value)
  stratStore.closeStrat()
  router.push('/tactics')
}

async function handleDelete() {
  if (!strat.value) return
  const ok = await confirmAction({
    title: 'Delete Strategy?',
    message: `Are you sure you want to delete strategy "${strat.value.title}"?`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    stratStore.deleteStrat(strat.value.id)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="strat"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto animate-fade-in"
      @click.self="stratStore.closeStrat()"
    >
      <div
        class="relative w-full max-w-5xl max-h-[92vh] my-auto bg-slate-900/95 border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <!-- HEADER -->
        <div
          class="flex flex-wrap items-start justify-between gap-4 p-5 border-b border-white/[0.08] bg-slate-950/70"
        >
          <div class="flex items-start gap-3.5 min-w-0 flex-1">
            <div
              class="p-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl shrink-0"
            >
              <Users class="w-5 h-5 stroke-[2.2]" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-bold tracking-tight text-white">
                  {{ strat.title }}
                </h2>
                <span
                  class="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-200 text-[10px] font-semibold"
                >
                  {{ stratMap?.name || strat.mapId }}
                </span>
                <span
                  :class="[
                    'px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border',
                    strat.side === 't'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  ]"
                >
                  {{ strat.side === 't' ? 'T Side' : 'CT Side' }}
                </span>
                <span
                  v-if="strat.targetSite"
                  class="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold"
                >
                  {{ strat.targetSite === 'Default' ? 'Default' : `Site ${strat.targetSite}` }}
                </span>
                <span
                  class="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 text-[10px] font-medium"
                >
                  {{ formatBuyType(strat.buyType) }}
                </span>
                <span
                  v-if="isMarkedForTactics"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold"
                >
                  <CheckCircle2 class="w-3 h-3" />
                  <span>Marked for Live Tactics</span>
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1 leading-relaxed">{{ strat.summary }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <!-- Mark to Use -->
            <button
              type="button"
              @click="handleToggleMark"
              :class="[
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
                isMarkedForTactics
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/[0.1]'
              ]"
            >
              <BookmarkCheck class="w-4 h-4" />
              <span>{{ isMarkedForTactics ? 'Marked in Use' : 'Mark to Use' }}</span>
            </button>

            <!-- Send to Live Tactics -->
            <button
              type="button"
              @click="handleSendToTactics"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-md"
            >
              <Send class="w-4 h-4" />
              <span>Send to Live Tactics</span>
            </button>

            <button
              v-if="strat.isCustom"
              type="button"
              @click="handleDelete"
              class="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
              title="Delete Strategy"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <button
              type="button"
              @click="stratStore.closeStrat()"
              class="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- BODY -->
        <div class="flex-grow overflow-y-auto p-6 flex flex-col gap-5">
          <!-- PHASE TIMELINE TABS -->
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div
              class="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/90 rounded-xl border border-white/[0.07]"
            >
              <button
                v-for="(phase, idx) in strat.phases"
                :key="phase.id"
                type="button"
                @click="activePhaseIndex = idx"
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  activePhaseIndex === idx
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                ]"
              >
                <Clock class="w-3.5 h-3.5" />
                <span>{{ phase.name }}</span>
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <span
                v-for="tag in strat.tags"
                :key="tag"
                class="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300 font-medium"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- PHASE CONTENT: 1:1 RADAR + 5 PLAYER ASSIGNMENTS -->
          <div
            v-if="currentPhase"
            class="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start"
          >
            <!-- LEFT: 1:1 Interactive Radar Preview -->
            <div
              class="flex flex-col gap-3 p-3.5 bg-slate-950/80 border border-white/[0.07] rounded-2xl"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-200 flex items-center gap-1.5">
                  <MapPin class="w-3.5 h-3.5 text-amber-400" />
                  <span>{{ stratMap?.name }} Tactical Positions</span>
                </span>
                <span class="text-[11px] text-slate-400 font-mono">
                  Phase {{ activePhaseIndex + 1 }}/{{ strat.phases.length }}
                </span>
              </div>

              <div
                class="relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-white/[0.08]"
              >
                <img
                  :src="radarImageSrc"
                  :alt="stratMap?.name"
                  class="w-full h-full object-cover opacity-90 select-none pointer-events-none"
                />

                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  class="absolute inset-0 w-full h-full"
                >
                  <!-- Tactical Drawings -->
                  <template v-if="strat.tacticsDrawings && strat.tacticsDrawings.length">
                    <template v-for="draw in strat.tacticsDrawings" :key="draw.id">
                      <polyline
                        v-if="
                          (draw.type === 'arrow' || draw.type === 'line') &&
                          draw.points.length >= 2
                        "
                        :points="draw.points.map((p) => `${p.x},${p.y}`).join(' ')"
                        fill="none"
                        :stroke="draw.color || '#f59e0b'"
                        stroke-width="1.4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray="2.5 1.5"
                        opacity="0.9"
                      />
                      <circle
                        v-else-if="draw.type === 'smoke_cloud' && draw.points[0]"
                        :cx="draw.points[0].x"
                        :cy="draw.points[0].y"
                        r="3.8"
                        fill="rgba(148, 163, 184, 0.45)"
                        stroke="#e2e8f0"
                        stroke-width="0.7"
                      />
                      <circle
                        v-else-if="draw.type === 'molotov_fire' && draw.points[0]"
                        :cx="draw.points[0].x"
                        :cy="draw.points[0].y"
                        r="3.5"
                        fill="rgba(249, 115, 22, 0.45)"
                        stroke="#fb923c"
                        stroke-width="0.7"
                      />
                    </template>
                  </template>

                  <!-- 5 Player Assignments Pins -->
                  <g
                    v-for="p in currentPhase.playerAssignments"
                    :key="p.slot"
                    :transform="`translate(${p.position.x}, ${p.position.y})`"
                    class="cursor-pointer"
                    @mouseenter="highlightedSlot = p.slot"
                    @mouseleave="highlightedSlot = null"
                    @click="
                      highlightedSlot = highlightedSlot === p.slot ? null : p.slot
                    "
                  >
                    <circle
                      v-if="highlightedSlot === p.slot"
                      r="6.5"
                      fill="none"
                      :stroke="strat.side === 't' ? '#fbbf24' : '#38bdf8'"
                      stroke-width="1.2"
                      opacity="0.9"
                    />
                    <circle
                      r="4.2"
                      :fill="strat.side === 't' ? '#f59e0b' : '#0ea5e9'"
                      stroke="#020617"
                      stroke-width="1"
                    />
                    <text
                      text-anchor="middle"
                      dominant-baseline="central"
                      fill="#020617"
                      font-size="4.4"
                      font-weight="800"
                      font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
                    >
                      {{ p.slot }}
                    </text>
                  </g>
                </svg>
              </div>

              <p class="text-[11px] text-slate-400 leading-relaxed">
                {{ currentPhase.description }}
              </p>
            </div>

            <!-- RIGHT: 5 PLAYER ROLE ASSIGNMENTS & LINKED UTILITY -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  5-Player Role Assignments & Instructions
                </h3>
                <span class="text-xs text-slate-500">
                  Hover or click a player to highlight on radar
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  v-for="assignment in currentPhase.playerAssignments"
                  :key="assignment.slot"
                  @mouseenter="highlightedSlot = assignment.slot"
                  @mouseleave="highlightedSlot = null"
                  :class="[
                    'p-4 rounded-2xl border transition-all flex flex-col gap-2.5',
                    highlightedSlot === assignment.slot
                      ? 'bg-slate-950 border-amber-500/60 shadow-lg'
                      : 'bg-slate-950/75 border-white/[0.07] hover:border-white/[0.15]'
                  ]"
                >
                  <!-- SLOT HEADER -->
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <span
                        :class="[
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0',
                          strat.side === 't'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-sky-500 text-slate-950'
                        ]"
                      >
                        {{ assignment.slot }}
                      </span>
                      <span class="font-semibold text-xs text-white truncate">
                        {{ assignment.playerName || `Player ${assignment.slot}` }}
                      </span>
                    </div>
                    <span
                      class="px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-200 border border-white/[0.08] text-[10px] font-semibold font-mono shrink-0"
                    >
                      {{ assignment.role }}
                    </span>
                  </div>

                  <!-- INSTRUCTIONS -->
                  <p class="text-xs text-slate-300 leading-relaxed">
                    {{ assignment.instructions }}
                  </p>

                  <!-- RADAR COORDS PILL -->
                  <div class="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
                    <span>
                      Radar Pos: ({{ assignment.position.x.toFixed(1) }}%,
                      {{ assignment.position.y.toFixed(1) }}%)
                    </span>
                  </div>

                  <!-- LINKED LINEUPS -->
                  <div
                    v-if="assignment.lineupIds && assignment.lineupIds.length"
                    class="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]"
                  >
                    <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Linked Utility:
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="lid in assignment.lineupIds"
                        :key="lid"
                        type="button"
                        @click="openLinkedLineup(lid)"
                        class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/[0.1] rounded-lg text-[11px] text-slate-200 font-medium transition-colors cursor-pointer"
                      >
                        <NadeIcon
                          v-if="getLineupById(lid)"
                          :type="getLineupById(lid)!.grenadeType"
                          :size="13"
                          :filled="true"
                        />
                        <span>{{ getLineupById(lid)?.title || lid }}</span>
                        <ExternalLink class="w-2.5 h-2.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
