<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStratStore } from '../../stores/stratStore'
import { useMapStore } from '../../stores/mapStore'
import type { Strategy, StratPhase } from '../../types'
import {
  Users,
  CheckCircle2,
  BookmarkCheck,
  Send,
  Layers,
  ChevronRight
} from 'lucide-vue-next'

const props = defineProps<{
  strat: Strategy
}>()

const router = useRouter()
const stratStore = useStratStore()
const mapStore = useMapStore()

const selectedPhaseIdx = ref(0)

const stratMap = computed(() => mapStore.getMapById(props.strat.mapId))

const radarImageSrc = computed(() => {
  if (!stratMap.value) return '/radars/de_mirage_radar.png'
  if (mapStore.radarSkin === 'simpleradar' && stratMap.value.simpleRadarImage) {
    return stratMap.value.simpleRadarImage
  }
  return stratMap.value.radarImage
})

const currentPhase = computed<StratPhase | undefined>(() => {
  return props.strat.phases[selectedPhaseIdx.value] || props.strat.phases[0]
})

const isMarkedForTactics = computed(() => {
  return stratStore.selectedStratForTacticsId === props.strat.id
})

const primarySourceLabel = computed(() => {
  if (props.strat.isCustom) return 'Custom'
  if (props.strat.tags.some((t) => t.toLowerCase().includes('cs2flow'))) return 'CS2Flow'
  if (props.strat.tags.some((t) => t.toLowerCase().includes('cs2journal'))) return 'CS2Journal'
  if (props.strat.tags.some((t) => t.toLowerCase().includes('pracc'))) return 'Pracc.com'
  if (props.strat.tags.some((t) => t.toLowerCase().includes('refrag'))) return 'Refrag.gg'
  return 'Pro Meta'
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

function handleToggleMark(e: MouseEvent) {
  e.stopPropagation()
  if (isMarkedForTactics.value) {
    stratStore.markStratForTactics(null)
  } else {
    stratStore.markStratForTactics(props.strat)
  }
}

function handleSendToTactics(e: MouseEvent) {
  e.stopPropagation()
  stratStore.applyStratToBoard(props.strat, selectedPhaseIdx.value)
  router.push('/tactics')
}
</script>

<template>
  <div
    @click="stratStore.openStrat(strat)"
    :class="[
      'strat-card group relative rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 backdrop-blur-xl',
      isMarkedForTactics
        ? 'bg-slate-900/95 border-2 border-amber-500/60 shadow-[0_12px_36px_-10px_rgba(245,158,11,0.25)]'
        : 'bg-slate-900/75 hover:bg-slate-900/95 border border-white/[0.08] hover:border-white/[0.16] shadow-xl'
    ]"
  >
    <div class="flex flex-col gap-3.5">
      <!-- TOP BADGE BAR -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            :class="[
              'px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border',
              strat.side === 't'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
            ]"
          >
            {{ strat.side === 't' ? 'T Side' : 'CT Side' }}
          </span>

          <span
            v-if="strat.targetSite"
            class="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-200 border border-white/[0.08] text-[10px] font-semibold tracking-wide"
          >
            {{ strat.targetSite === 'Default' ? 'Default' : `Site ${strat.targetSite}` }}
          </span>

          <span
            class="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-white/[0.05] text-[10px] font-medium"
          >
            {{ formatBuyType(strat.buyType) }}
          </span>

          <span
            :class="[
              'px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
              primarySourceLabel === 'CS2Flow'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : primarySourceLabel === 'Custom'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
            ]"
          >
            {{ primarySourceLabel }}
          </span>
        </div>

        <span
          v-if="isMarkedForTactics"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold"
        >
          <CheckCircle2 class="w-3 h-3" />
          <span>In Use</span>
        </span>
      </div>

      <!-- TITLE & SUMMARY -->
      <div>
        <h3
          class="text-[15px] font-bold text-white group-hover:text-amber-300 transition-colors leading-snug tracking-tight"
        >
          {{ strat.title }}
        </h3>
        <p class="text-xs text-slate-400 leading-relaxed line-clamp-2 mt-1.5">
          {{ strat.summary }}
        </p>
      </div>

      <!-- MINI 1:1 INTERACTIVE RADAR PREVIEW + ROLE BREAKDOWN -->
      <div
        class="grid grid-cols-[120px_1fr] gap-3.5 items-center p-2.5 rounded-xl bg-slate-950/70 border border-white/[0.06]"
      >
        <!-- 1:1 Radar Canvas -->
        <div
          class="relative w-[120px] h-[120px] aspect-square rounded-lg overflow-hidden bg-black border border-white/[0.08] shrink-0"
        >
          <img
            :src="radarImageSrc"
            :alt="stratMap?.name || strat.mapId"
            class="w-full h-full object-cover opacity-85 select-none pointer-events-none"
            loading="lazy"
          />

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            class="absolute inset-0 w-full h-full pointer-events-none"
          >
            <!-- Tactical Arrows & Utility Drawings -->
            <template v-if="strat.tacticsDrawings && strat.tacticsDrawings.length">
              <template v-for="draw in strat.tacticsDrawings" :key="draw.id">
                <polyline
                  v-if="(draw.type === 'arrow' || draw.type === 'line') && draw.points.length >= 2"
                  :points="draw.points.map((p) => `${p.x},${p.y}`).join(' ')"
                  fill="none"
                  :stroke="draw.color || '#f59e0b'"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-dasharray="2.5 1.5"
                  opacity="0.85"
                />
                <circle
                  v-else-if="draw.type === 'smoke_cloud' && draw.points[0]"
                  :cx="draw.points[0].x"
                  :cy="draw.points[0].y"
                  r="4.2"
                  fill="rgba(148, 163, 184, 0.45)"
                  stroke="#cbd5e1"
                  stroke-width="0.8"
                />
                <circle
                  v-else-if="draw.type === 'molotov_fire' && draw.points[0]"
                  :cx="draw.points[0].x"
                  :cy="draw.points[0].y"
                  r="3.8"
                  fill="rgba(249, 115, 22, 0.45)"
                  stroke="#fb923c"
                  stroke-width="0.8"
                />
              </template>
            </template>

            <!-- 5 Player Assignments Pins (1..5) -->
            <template v-if="currentPhase">
              <g
                v-for="p in currentPhase.playerAssignments"
                :key="p.slot"
                :transform="`translate(${p.position.x}, ${p.position.y})`"
              >
                <circle
                  r="5.2"
                  :fill="strat.side === 't' ? '#f59e0b' : '#0ea5e9'"
                  stroke="#020617"
                  stroke-width="1.2"
                />
                <text
                  text-anchor="middle"
                  dominant-baseline="central"
                  fill="#020617"
                  font-size="5.6"
                  font-weight="800"
                  font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  {{ p.slot }}
                </text>
              </g>
            </template>
          </svg>

          <!-- Phase Selector Pill Overlay -->
          <div
            v-if="strat.phases.length > 1"
            class="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 p-0.5 rounded-md bg-slate-950/90 border border-white/10 backdrop-blur-md"
            @click.stop
          >
            <button
              v-for="(phase, idx) in strat.phases"
              :key="phase.id"
              type="button"
              @click.stop="selectedPhaseIdx = idx"
              :class="[
                'px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer',
                selectedPhaseIdx === idx
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              ]"
              :title="phase.name"
            >
              P{{ idx + 1 }}
            </button>
          </div>
        </div>

        <!-- 5 Player Compact Assignment List -->
        <div class="flex flex-col gap-1 min-w-0">
          <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-0.5">
            <span class="truncate">{{ currentPhase?.name || 'Phase 1' }}</span>
            <span class="inline-flex items-center gap-1 text-slate-500 shrink-0">
              <Layers class="w-3 h-3" />
              {{ strat.phases.length }}P
            </span>
          </div>

          <div
            v-for="p in currentPhase?.playerAssignments || []"
            :key="p.slot"
            class="flex items-center gap-1.5 text-[11px] leading-tight truncate"
          >
            <span
              :class="[
                'w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-black shrink-0',
                strat.side === 't'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              ]"
            >
              {{ p.slot }}
            </span>
            <span class="font-semibold text-slate-300 shrink-0">{{ p.role }}:</span>
            <span class="text-slate-400 truncate">{{ p.instructions }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD FOOTER ACTIONS -->
    <div class="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.06]">
      <div class="flex items-center gap-2">
        <!-- Mark to Use button -->
        <button
          type="button"
          @click="handleToggleMark"
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
            isMarkedForTactics
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
          ]"
        >
          <BookmarkCheck class="w-3.5 h-3.5" />
          <span>{{ isMarkedForTactics ? 'Marked in Use' : 'Mark to Use' }}</span>
        </button>

        <!-- Send to Live Tactics button -->
        <button
          type="button"
          @click="handleSendToTactics"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-sm"
        >
          <Send class="w-3.5 h-3.5" />
          <span>Send to Live Tactics</span>
        </button>
      </div>

      <span
        class="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400 group-hover:text-white transition-colors"
      >
        <span>Details</span>
        <ChevronRight class="w-3.5 h-3.5" />
      </span>
    </div>
  </div>
</template>
