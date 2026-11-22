<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import LineupCard from './LineupCard.vue'
import type { Lineup, LineupDisplayMode } from '../../types'
import {
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  CheckSquare,
  Footprints,
  Globe,
  Layers,
  LayoutGrid,
  Search,
  Sparkles,
  User
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()

const quickSelectMode = ref(false)
const batchNotice = ref<string | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | null = null

function showBatchNotice(msg: string) {
  batchNotice.value = msg
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    batchNotice.value = null
  }, 3200)
}

function matchesMapAndFilters(lineup: Lineup): boolean {
  if (lineup.mapId !== mapStore.currentMapId) return false

  if (lineupStore.activeExecute && lineupStore.activeExecute.mapId === mapStore.currentMapId) {
    return lineupStore.activeExecute.lineupIds.includes(lineup.id)
  }

  if (!mapStore.selectedNadeTypes.includes(lineup.grenadeType)) return false

  if (
    mapStore.selectedSide !== 'all' &&
    lineup.side !== 'all' &&
    lineup.side !== mapStore.selectedSide
  ) {
    return false
  }

  if (mapStore.selectedSite !== 'all' && lineup.site && lineup.site !== mapStore.selectedSite) {
    return false
  }

  if (mapStore.selectedThrowType !== 'all' && lineup.throwType !== mapStore.selectedThrowType) {
    return false
  }

  if (mapStore.surfaceLevel !== 'all') {
    const floor =
      lineup.radarFloor ||
      (lineup as any).level ||
      (lineup.tags || []).find(
        (t) => t.toLowerCase() === 'upper' || t.toLowerCase() === 'lower'
      )
    if (floor && String(floor).toLowerCase() !== mapStore.surfaceLevel) {
      return false
    }
  }

  if (mapStore.searchQuery.trim() !== '') {
    const query = mapStore.searchQuery.toLowerCase()
    const matchTitle = lineup.title.toLowerCase().includes(query)
    const matchStart = lineup.startLocation.toLowerCase().includes(query)
    const matchEnd = lineup.endLocation.toLowerCase().includes(query)
    const matchSource = (lineup.sourceWebsite || '').toLowerCase().includes(query)
    const matchPro = (lineup.proPlayer || '').toLowerCase().includes(query)
    const matchTags = (lineup.tags || []).some((t) => t.toLowerCase().includes(query))
    if (!matchTitle && !matchStart && !matchEnd && !matchSource && !matchPro && !matchTags) {
      return false
    }
  }

  return true
}

const generalForMap = computed(() =>
  lineupStore.generalLineups.filter(matchesMapAndFilters)
)
const personalForMap = computed(() =>
  lineupStore.personalBookLineups.filter(matchesMapAndFilters)
)
const allForMap = computed(() =>
  lineupStore.allLineups.filter(matchesMapAndFilters)
)

const lineups = computed<Lineup[]>(() => {
  if (lineupStore.activeCatalogTab === 'general') return generalForMap.value
  if (lineupStore.activeCatalogTab === 'personal') return personalForMap.value
  return allForMap.value
})

const displayModeOptions: { id: LineupDisplayMode; label: string }[] = [
  { id: 'cards', label: 'Cards' },
  { id: 'all_images', label: 'Show All Images' },
  { id: 'spot_movement', label: 'Spot & Movement' }
]

const gridLayoutClass = computed(() => {
  if (lineupStore.lineupDisplayMode === 'all_images') {
    return 'grid grid-cols-1 gap-4'
  }
  if (lineupStore.lineupDisplayMode === 'spot_movement') {
    return 'grid grid-cols-1 xl:grid-cols-2 gap-2.5'
  }
  return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
})

const unbookmarkedForMap = computed(() =>
  generalForMap.value.filter((l) => !lineupStore.isInPersonalBook(l.id))
)

function toggleQuickSelectMode() {
  quickSelectMode.value = !quickSelectMode.value
  if (quickSelectMode.value && lineupStore.activeCatalogTab === 'personal') {
    lineupStore.activeCatalogTab = 'general'
  }
  if (!quickSelectMode.value) {
    lineupStore.clearQuickSelect()
  }
}

function selectAllVisibleGeneral() {
  for (const item of unbookmarkedForMap.value) {
    if (!lineupStore.quickSelectIds.includes(item.id)) {
      lineupStore.toggleQuickSelect(item.id)
    }
  }
}

function handleAddSelected() {
  const count = lineupStore.addQuickSelectedToPersonalBook()
  if (count > 0) {
    showBatchNotice(`Added ${count} selected lineup${count === 1 ? '' : 's'} to My Personal Book`)
  } else {
    showBatchNotice('Selected lineups are already in your Personal Book.')
  }
  quickSelectMode.value = false
}

function handleAddAllForMap() {
  let count = 0
  for (const item of unbookmarkedForMap.value) {
    lineupStore.quickAddToPersonalBook(item)
    count++
  }
  if (count > 0) {
    showBatchNotice(
      `Added ${count} ${mapStore.currentMap.name} lineup${count === 1 ? '' : 's'} to My Personal Book`
    )
  } else {
    showBatchNotice(`All matching ${mapStore.currentMap.name} lineups are already in My Book`)
  }
  lineupStore.clearQuickSelect()
}
</script>

<template>
  <div class="lineup-grid-container flex flex-col gap-4">
    <!-- GRID HEADER: CATALOG TABS + DISPLAY MODE SWITCHER + SELECT FOR MY BOOK -->
    <div class="flex flex-col gap-3 bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] shadow-lg">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Title & Map -->
        <div class="flex items-center gap-2.5">
          <h2 class="text-sm font-semibold tracking-tight text-white">
            Lineups ({{ lineups.length }})
          </h2>
          <span class="text-xs text-slate-400">on {{ mapStore.currentMap.name }}</span>
        </div>

        <!-- 3-Way Display Mode Switcher -->
        <div class="flex flex-wrap items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/[0.07] text-xs font-medium">
          <button
            v-for="mode in displayModeOptions"
            :key="mode.id"
            @click="lineupStore.lineupDisplayMode = mode.id"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer',
              lineupStore.lineupDisplayMode === mode.id
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <LayoutGrid v-if="mode.id === 'cards'" class="w-3.5 h-3.5" />
            <Layers v-else-if="mode.id === 'all_images'" class="w-3.5 h-3.5" />
            <Footprints v-else class="w-3.5 h-3.5" />
            <span>{{ mode.label }}</span>
          </button>
        </div>
      </div>

      <!-- Second Row: General vs Personal Catalog Tabs + Select for My Book Controls -->
      <div class="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-white/[0.06]">
        <!-- Catalog Separation Tabs -->
        <div class="flex flex-wrap items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/[0.07] text-xs font-medium">
          <button
            @click="lineupStore.activeCatalogTab = 'general'"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer',
              lineupStore.activeCatalogTab === 'general'
                ? 'bg-white/[0.12] text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <Globe class="w-3.5 h-3.5 text-amber-400" />
            <span>General Lineups</span>
            <span class="px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[10px] font-mono">
              {{ generalForMap.length }}
            </span>
          </button>

          <button
            @click="lineupStore.activeCatalogTab = 'personal'"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer',
              lineupStore.activeCatalogTab === 'personal'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <User class="w-3.5 h-3.5 text-emerald-400" />
            <span>My Personal Book</span>
            <span class="px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[10px] font-mono">
              {{ personalForMap.length }}
            </span>
          </button>

          <button
            @click="lineupStore.activeCatalogTab = 'all'"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer',
              lineupStore.activeCatalogTab === 'all'
                ? 'bg-white/[0.12] text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>All</span>
            <span class="px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[10px] font-mono">
              {{ allForMap.length }}
            </span>
          </button>
        </div>

        <!-- Select for My Book Controls -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="toggleQuickSelectMode"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer',
              quickSelectMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold'
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/[0.08]'
            ]"
          >
            <CheckSquare class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ quickSelectMode ? 'Selection Mode Active' : 'Select for My Book' }}</span>
          </button>

          <button
            v-if="unbookmarkedForMap.length > 0"
            @click="handleAddAllForMap"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <BookmarkPlus class="w-3.5 h-3.5" />
            <span>Save All on Map ({{ unbookmarkedForMap.length }})</span>
          </button>
        </div>
      </div>

      <!-- Active Batch Selection Toolbar -->
      <div
        v-if="quickSelectMode || lineupStore.quickSelectIds.length > 0"
        class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/80 border border-white/[0.1] rounded-xl text-xs"
      >
        <div class="flex items-center gap-2 text-slate-300">
          <span class="font-semibold text-amber-400">
            {{ lineupStore.quickSelectIds.length }} selected
          </span>
          <button
            v-if="unbookmarkedForMap.length > 0"
            @click="selectAllVisibleGeneral"
            class="px-2.5 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-medium cursor-pointer"
          >
            Select Visible ({{ unbookmarkedForMap.length }})
          </button>
          <button
            v-if="lineupStore.quickSelectIds.length > 0"
            @click="lineupStore.clearQuickSelect()"
            class="px-2.5 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white font-medium cursor-pointer"
          >
            Clear
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="handleAddSelected"
            :disabled="lineupStore.quickSelectIds.length === 0"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all',
              lineupStore.quickSelectIds.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
            ]"
          >
            <BookmarkCheck class="w-3.5 h-3.5" />
            <span>Save Selected ({{ lineupStore.quickSelectIds.length }}) to My Book</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Batch Add Feedback Banner -->
    <div
      v-if="batchNotice"
      class="px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2"
    >
      <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
      <span>{{ batchNotice }}</span>
    </div>

    <!-- LINEUPS GRID / VISUAL STRIPS / SPOT & MOVEMENT LIST -->
    <div v-if="lineups.length > 0" :class="gridLayoutClass">
      <LineupCard
        v-for="lineup in lineups"
        :key="lineup.id"
        :lineup="lineup"
        :selectable="quickSelectMode && !lineup.isCustom && !lineup.isPersonalBook"
        :selected="lineupStore.quickSelectIds.includes(lineup.id)"
        @toggle-select="lineupStore.toggleQuickSelect($event)"
      />
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else
      class="flex flex-col items-center justify-center p-12 bg-slate-900/40 border border-dashed border-white/[0.1] rounded-2xl text-center gap-3"
    >
      <div class="p-3 bg-white/[0.05] rounded-full text-slate-400">
        <Search class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-semibold text-slate-200">
          {{
            lineupStore.activeCatalogTab === 'personal'
              ? `No Personal Book Lineups on ${mapStore.currentMap.name}`
              : 'No Lineups Found'
          }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          <template v-if="lineupStore.activeCatalogTab === 'personal'">
            Switch to General Lineups to save meta lineups into your Personal Book, or create a custom lineup on the radar.
          </template>
          <template v-else>
            No grenade lineups match your current grenade toggles, team side, or search query for {{ mapStore.currentMap.name }}.
          </template>
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button
          @click="lineupStore.isPresetsModalOpen = true"
          class="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Browse Meta Sources ({{ lineupStore.potentialArchiveLineups.length }})
        </button>
        <button
          @click="mapStore.resetFilters()"
          class="px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
      </div>
    </div>
  </div>
</template>
