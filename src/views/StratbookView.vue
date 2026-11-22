<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStratStore } from '../stores/stratStore'
import { useMapStore } from '../stores/mapStore'
import { useThemeStore } from '../stores/themeStore'
import { snapPointToMapBounds } from '../core/radar/mapBounds'
import StratCard from '../components/strats/StratCard.vue'
import StratModal from '../components/strats/StratModal.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import type { Strategy } from '../types'
import {
  Plus,
  BookOpen,
  Search,
  CheckCircle2,
  Send,
  X,
  RotateCcw,
  Layers,
  Eye
} from 'lucide-vue-next'

const router = useRouter()
const stratStore = useStratStore()
const mapStore = useMapStore()
const themeStore = useThemeStore()

// Filters
const searchQuery = ref('')
const selectedSide = ref<'all' | 't' | 'ct'>('all')
const selectedSite = ref<'all' | 'A' | 'B' | 'Mid' | 'Default'>('all')
const selectedBuy = ref<'all' | 'full_buy' | 'pistol' | 'eco' | 'force_buy'>('all')
const selectedSource = ref<'all' | 'cs2flow' | 'pro_meta' | 'custom'>('all')

const ACTIVE_DUTY_IDS = new Set([
  'mirage',
  'dust2',
  'inferno',
  'nuke',
  'ancient',
  'anubis',
  'cache'
])

const activeDutyMaps = computed(() => {
  return mapStore.availableMaps.filter((m) => ACTIVE_DUTY_IDS.has(m.id))
})

const reserveAndClassicMaps = computed(() => {
  return mapStore.availableMaps.filter((m) => !ACTIVE_DUTY_IDS.has(m.id))
})

const stratCountByMap = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const s of stratStore.allStrats) {
    counts[s.mapId] = (counts[s.mapId] || 0) + 1
  }
  return counts
})

function matchesSourceFilter(strat: Strategy, source: typeof selectedSource.value): boolean {
  if (source === 'all') return true
  if (source === 'custom') return !!strat.isCustom
  const hasCs2Flow = strat.tags.some((t) => t.toLowerCase().includes('cs2flow'))
  if (source === 'cs2flow') return hasCs2Flow
  if (source === 'pro_meta') return !strat.isCustom && (!hasCs2Flow || strat.tags.some((t) => t.toLowerCase().includes('pro meta')))
  return true
}

const filteredStrats = computed(() => {
  return stratStore.currentMapStrats.filter((s) => {
    if (selectedSide.value !== 'all' && s.side !== selectedSide.value) return false
    if (selectedSite.value !== 'all' && s.targetSite !== selectedSite.value) return false
    if (selectedBuy.value !== 'all') {
      if (selectedBuy.value === 'force_buy') {
        if (s.buyType !== 'force_buy' && s.buyType !== 'semi_buy') return false
      } else if (s.buyType !== selectedBuy.value) {
        return false
      }
    }
    if (!matchesSourceFilter(s, selectedSource.value)) return false

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const inTitle = s.title.toLowerCase().includes(q)
      const inSummary = s.summary.toLowerCase().includes(q)
      const inTags = s.tags.some((t) => t.toLowerCase().includes(q))
      const inPhases = s.phases.some((p) =>
        p.playerAssignments.some(
          (a) =>
            a.instructions.toLowerCase().includes(q) ||
            a.role.toLowerCase().includes(q)
        )
      )
      return inTitle || inSummary || inTags || inPhases
    }
    return true
  })
})

const hasActiveFilters = computed(() => {
  return (
    selectedSide.value !== 'all' ||
    selectedSite.value !== 'all' ||
    selectedBuy.value !== 'all' ||
    selectedSource.value !== 'all' ||
    searchQuery.value.trim() !== ''
  )
})

function resetFilters() {
  selectedSide.value = 'all'
  selectedSite.value = 'all'
  selectedBuy.value = 'all'
  selectedSource.value = 'all'
  searchQuery.value = ''
}

function handleOpenMarkedInTactics() {
  const marked = stratStore.selectedStratForTactics
  if (!marked) return
  stratStore.applyStratToBoard(marked, 0)
  router.push('/tactics')
}

// Create New Strategy Modal State
const isCreateModalOpen = ref(false)
const newStratTitle = ref('')
const newStratSide = ref<'t' | 'ct'>('t')
const newStratSite = ref<'A' | 'B' | 'Mid' | 'Default'>('A')
const newStratBuy = ref<'full_buy' | 'pistol' | 'force_buy' | 'eco'>('full_buy')
const newStratSummary = ref('')

function handleCreateStrat() {
  if (!newStratTitle.value.trim()) return
  const mId = mapStore.currentMapId
  const mapSites = mapStore.currentMap.sites
  const targetAnchor =
    newStratSite.value === 'B'
      ? mapSites.b
      : newStratSite.value === 'A'
        ? mapSites.a
        : { x: 50, y: 50 }

  const p1 = snapPointToMapBounds(mId, { x: targetAnchor.x, y: Math.min(88, targetAnchor.y + 12) })
  const p2 = snapPointToMapBounds(mId, { x: Math.min(88, targetAnchor.x + 8), y: targetAnchor.y })
  const p3 = snapPointToMapBounds(mId, { x: Math.max(12, targetAnchor.x - 8), y: targetAnchor.y })
  const p4 = snapPointToMapBounds(mId, { x: targetAnchor.x, y: targetAnchor.y })
  const p5 = snapPointToMapBounds(mId, { x: 50, y: 55 })

  const created = stratStore.addStrat({
    title: newStratTitle.value.trim(),
    mapId: mId,
    side: newStratSide.value,
    buyType: newStratBuy.value,
    targetSite: newStratSite.value,
    summary: newStratSummary.value.trim() || 'Custom team strategy execute and tactical setup.',
    tags: ['Custom', 'Team Play', `Site ${newStratSite.value}`],
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Setup & Execute',
        description: 'Synchronized utility deployment and site breach.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (IGL)',
            instructions: 'Call utility countdown and throw primary cross smoke.',
            lineupIds: [],
            position: { x: p1.x, y: p1.y }
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Point Entry)',
            instructions: 'First contact entry behind pop-flash.',
            lineupIds: [],
            position: { x: p4.x, y: p4.y }
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Flash & Trade)',
            instructions: 'Throw entry pop-flash and trade first contact onto site.',
            lineupIds: [],
            position: { x: p2.x, y: p2.y }
          },
          {
            slot: 4,
            role: 'AWP',
            playerName: 'Player 4 (AWP Overwatch)',
            instructions: 'Hold rotation angle and lock down post-plant line.',
            lineupIds: [],
            position: { x: p3.x, y: p3.y }
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Lurk / Cutoff)',
            instructions: 'Hold flank and cut off CT rotations.',
            lineupIds: [],
            position: { x: p5.x, y: p5.y }
          }
        ]
      }
    ]
  })
  isCreateModalOpen.value = false
  newStratTitle.value = ''
  newStratSummary.value = ''
  stratStore.openStrat(created)
}
</script>

<template>
  <div
    class="stratbook-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-fade-in"
  >
    <!-- TOP HEADER -->
    <div
      class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-xl"
    >
      <div class="flex items-center gap-3.5">
        <div
          class="p-3 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-2xl"
        >
          <BookOpen class="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="text-xl font-bold text-white tracking-tight">
              Map-Specific Team Stratbook
            </h1>
            <span
              class="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold"
            >
              {{ mapStore.currentMap.name }}
            </span>
            <span
              class="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-300 text-xs font-medium"
            >
              {{ stratStore.currentMapStrats.length }} Strategies on Map ({{ stratStore.allStrats.length }} Total)
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Curated CS2Flow.com & Tier-1 Pro Meta 5-player executes, splits, and CT defaults across all 11 competitive maps
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="router.push('/tactics')"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 transition-all cursor-pointer"
        >
          <Layers class="w-4 h-4 text-amber-400" />
          <span>Live Tactics Board</span>
        </button>

        <button
          type="button"
          @click="isCreateModalOpen = true"
          class="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:opacity-90"
          :style="{ backgroundColor: themeStore.customAccentColor || '#f59e0b', color: '#020617' }"
        >
          <Plus class="w-4 h-4 stroke-[2.5]" />
          <span>New Strategy</span>
        </button>
      </div>
    </div>

    <!-- MARKED STRATEGY FOR LIVE TACTICS BANNER -->
    <div
      v-if="stratStore.selectedStratForTactics"
      class="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-slate-900/90 border border-amber-500/40 shadow-lg"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0"
        >
          <CheckCircle2 class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-amber-400"
            >
              Marked Strategy for Live Tactics
            </span>
            <span
              class="px-2 py-0.5 rounded-full bg-white/[0.08] text-white text-[10px] font-semibold"
            >
              {{ mapStore.getMapById(stratStore.selectedStratForTactics.mapId)?.name }}
            </span>
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                stratStore.selectedStratForTactics.side === 't'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-sky-500/20 text-sky-300'
              ]"
            >
              {{ stratStore.selectedStratForTactics.side === 't' ? 'T Side' : 'CT Side' }}
            </span>
          </div>
          <h3 class="text-sm font-bold text-white truncate mt-0.5">
            {{ stratStore.selectedStratForTactics.title }}
          </h3>
          <p class="text-xs text-slate-300 truncate">
            {{ stratStore.selectedStratForTactics.summary }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          @click="stratStore.openStrat(stratStore.selectedStratForTactics)"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 transition-colors cursor-pointer"
        >
          <Eye class="w-3.5 h-3.5" />
          <span>Inspect Phases</span>
        </button>

        <button
          type="button"
          @click="handleOpenMarkedInTactics"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-md"
        >
          <Send class="w-3.5 h-3.5" />
          <span>Open in Live Tactics Board</span>
        </button>

        <button
          type="button"
          @click="stratStore.markStratForTactics(null)"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Clear Marked Strategy"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- HORIZONTAL MAP SELECTOR PILL BAR (ACTIVE DUTY 7 + RESERVE & CLASSIC 4) -->
    <div
      class="flex flex-col gap-3 p-4 bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] rounded-2xl"
    >
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <!-- Active Duty (7) -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Duty Premier ({{ activeDutyMaps.length }})
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="m in activeDutyMaps"
              :key="m.id"
              type="button"
              @click="mapStore.setMap(m.id)"
              :class="[
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
                mapStore.currentMapId === m.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-300 border-white/[0.07]'
              ]"
            >
              <span>{{ m.name }}</span>
              <span
                :class="[
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  mapStore.currentMapId === m.id
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-white/[0.06] text-slate-400'
                ]"
              >
                {{ stratCountByMap[m.id] || 0 }}
              </span>
            </button>
          </div>
        </div>

        <!-- Divider -->
        <div class="hidden lg:block w-px h-10 bg-white/[0.08]"></div>

        <!-- Reserve & Classic (4) -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-sky-400"></span>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Reserve & Classic ({{ reserveAndClassicMaps.length }})
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="m in reserveAndClassicMaps"
              :key="m.id"
              type="button"
              @click="mapStore.setMap(m.id)"
              :class="[
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
                mapStore.currentMapId === m.id
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                  : 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-300 border-white/[0.07]'
              ]"
            >
              <span>{{ m.name }}</span>
              <span
                :class="[
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  mapStore.currentMapId === m.id
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-white/[0.06] text-slate-400'
                ]"
              >
                {{ stratCountByMap[m.id] || 0 }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- FILTER BAR: SIDE, TARGET SITE, BUY TYPE, SOURCE & SEARCH -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]"
      >
        <div class="flex flex-wrap items-center gap-2">
          <!-- Side Filter -->
          <div
            class="flex items-center gap-0.5 p-1 bg-slate-950/90 rounded-xl border border-white/[0.07]"
          >
            <button
              type="button"
              @click="selectedSide = 'all'"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                selectedSide === 'all'
                  ? 'bg-white/[0.12] text-white'
                  : 'text-slate-400 hover:text-white'
              ]"
            >
              All Sides
            </button>
            <button
              type="button"
              @click="selectedSide = 't'"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                selectedSide === 't'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300'
              ]"
            >
              T Side
            </button>
            <button
              type="button"
              @click="selectedSide = 'ct'"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                selectedSide === 'ct'
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-sky-300'
              ]"
            >
              CT Side
            </button>
          </div>

          <!-- Target Site Filter -->
          <div
            class="flex items-center gap-0.5 p-1 bg-slate-950/90 rounded-xl border border-white/[0.07]"
          >
            <button
              v-for="siteOpt in [
                { id: 'all', label: 'All Sites' },
                { id: 'A', label: 'A' },
                { id: 'B', label: 'B' },
                { id: 'Mid', label: 'Mid' },
                { id: 'Default', label: 'Default' }
              ] as const"
              :key="siteOpt.id"
              type="button"
              @click="selectedSite = siteOpt.id"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                selectedSite === siteOpt.id
                  ? 'bg-white/[0.12] text-white'
                  : 'text-slate-400 hover:text-white'
              ]"
            >
              {{ siteOpt.label }}
            </button>
          </div>

          <!-- Buy Type Filter -->
          <div
            class="flex items-center gap-0.5 p-1 bg-slate-950/90 rounded-xl border border-white/[0.07]"
          >
            <button
              v-for="buyOpt in [
                { id: 'all', label: 'All Buys' },
                { id: 'full_buy', label: 'Full Buy' },
                { id: 'pistol', label: 'Pistol' },
                { id: 'eco', label: 'Eco' },
                { id: 'force_buy', label: 'Force' }
              ] as const"
              :key="buyOpt.id"
              type="button"
              @click="selectedBuy = buyOpt.id"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                selectedBuy === buyOpt.id
                  ? 'bg-white/[0.12] text-white'
                  : 'text-slate-400 hover:text-white'
              ]"
            >
              {{ buyOpt.label }}
            </button>
          </div>

          <!-- Source Filter -->
          <div
            class="flex items-center gap-0.5 p-1 bg-slate-950/90 rounded-xl border border-white/[0.07]"
          >
            <button
              v-for="srcOpt in [
                { id: 'all', label: 'All Sources' },
                { id: 'cs2flow', label: 'CS2Flow' },
                { id: 'pro_meta', label: 'Pro Meta' },
                { id: 'custom', label: 'Custom' }
              ] as const"
              :key="srcOpt.id"
              type="button"
              @click="selectedSource = srcOpt.id"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                selectedSource === srcOpt.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              ]"
            >
              {{ srcOpt.label }}
            </button>
          </div>
        </div>

        <!-- Search Input & Reset -->
        <div class="flex items-center gap-2 flex-1 sm:flex-initial min-w-[220px]">
          <div class="relative flex-1">
            <Search
              class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="`Search ${mapStore.currentMap.name} strats...`"
              class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/90 border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
          <button
            v-if="hasActiveFilters"
            type="button"
            @click="resetFilters"
            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-slate-300 cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>

    <!-- STRATS GRID -->
    <div
      v-if="filteredStrats.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
    >
      <StratCard v-for="strat in filteredStrats" :key="strat.id" :strat="strat" />
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else
      class="flex flex-col items-center justify-center p-14 bg-slate-900/50 border border-dashed border-white/[0.1] rounded-2xl text-center gap-3"
    >
      <BookOpen class="w-8 h-8 text-slate-500" />
      <h3 class="text-sm font-bold text-slate-200">
        No matching strategies on {{ mapStore.currentMap.name }}
      </h3>
      <p class="text-xs text-slate-400 max-w-md">
        Try clearing your active filters or create a custom 5-player strategy for
        {{ mapStore.currentMap.name }}.
      </p>
      <div class="flex items-center gap-2 mt-1">
        <button
          v-if="hasActiveFilters"
          type="button"
          @click="resetFilters"
          class="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
        <button
          type="button"
          @click="isCreateModalOpen = true"
          class="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-semibold rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
        >
          Create Strategy
        </button>
      </div>
    </div>

    <!-- CREATE STRAT MODAL -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      @click.self="isCreateModalOpen = false"
    >
      <div
        class="relative w-full max-w-md bg-slate-900 border border-white/[0.1] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-xs"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-white">
            New Strategy for {{ mapStore.currentMap.name }}
          </h2>
          <button
            type="button"
            @click="isCreateModalOpen = false"
            class="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-semibold text-slate-300">Strategy Title</label>
          <input
            v-model="newStratTitle"
            type="text"
            :placeholder="`e.g. ${mapStore.currentMap.name} Fast A Split`"
            class="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
          />
        </div>

        <div class="grid grid-cols-3 gap-2.5">
          <div class="flex flex-col gap-1.5">
            <label class="font-semibold text-slate-300">Team Side</label>
            <select
              v-model="newStratSide"
              class="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-2.5 py-2 text-white font-semibold"
            >
              <option value="t">T Side</option>
              <option value="ct">CT Side</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-semibold text-slate-300">Target Site</label>
            <select
              v-model="newStratSite"
              class="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-2.5 py-2 text-white font-semibold"
            >
              <option value="A">Site A</option>
              <option value="B">Site B</option>
              <option value="Mid">Mid</option>
              <option value="Default">Default</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-semibold text-slate-300">Buy Type</label>
            <select
              v-model="newStratBuy"
              class="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-2.5 py-2 text-white font-semibold"
            >
              <option value="full_buy">Full Buy</option>
              <option value="pistol">Pistol</option>
              <option value="force_buy">Force Buy</option>
              <option value="eco">Eco</option>
            </select>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-semibold text-slate-300">Summary / Execution Goal</label>
          <textarea
            v-model="newStratSummary"
            rows="3"
            placeholder="Describe the utility timing, entry routes, and post-plant setup..."
            class="w-full bg-slate-950 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="isCreateModalOpen = false"
            class="px-4 py-2 bg-white/[0.06] text-slate-300 rounded-xl font-semibold hover:bg-white/[0.1] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleCreateStrat"
            class="px-5 py-2 font-semibold rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
            :style="{
              backgroundColor: themeStore.customAccentColor || '#f59e0b',
              color: '#020617'
            }"
          >
            Create Strategy
          </button>
        </div>
      </div>
    </div>

    <!-- MODALS -->
    <StratModal />
    <LineupModal />
  </div>
</template>
