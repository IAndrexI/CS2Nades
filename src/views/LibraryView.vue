<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useLineupStore } from '../stores/lineupStore'
import { useMapStore } from '../stores/mapStore'
import LineupCard from '../components/lineups/LineupCard.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import AddLineupModal from '../components/lineups/AddLineupModal.vue'
import QuickAddBar from '../components/lineups/QuickAddBar.vue'
import CommunityPresetsModal from '../components/lineups/CommunityPresetsModal.vue'
import type { Lineup, LineupDisplayMode } from '../types'
import {
  BookmarkCheck,
  BookmarkPlus,
  BookMarked,
  CheckCircle2,
  Footprints,
  Globe,
  Grid,
  Heart,
  Layers,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Zap
} from 'lucide-vue-next'

const router = useRouter()
const lineupStore = useLineupStore()
const mapStore = useMapStore()

const searchQuery = ref('')
const selectedMapFilter = ref('all')
const selectedNadeFilter = ref<string>('all')
const selectedSideFilter = ref<string>('all')
const selectedSourceFilter = ref<string>('all')
const selectedProPlayerFilter = ref<string>('all')
const showFavoritesOnly = ref(false)
const discoveredLineups = ref<Lineup[]>([])
const isFetchingDiscoverFeed = ref(false)
const discoverFeedBanner = ref('')
const quickSelectMode = ref(false)

const externalSourceOptions = [
  { value: 'all', label: 'All Sites & Sources' },
  { value: 'CSNades.gg', label: 'CSNades.gg' },
  { value: 'CS2Lineups', label: 'CS2Lineups' },
  { value: 'NadeKing', label: 'NadeKing' },
  { value: 'Pracc.com', label: 'Pracc.com' },
  { value: 'Scope.gg', label: 'Scope.gg' },
  { value: 'HLTV Pro Utility', label: 'HLTV Pro Utility' },
  { value: 'Bo3.gg', label: 'Bo3.gg' },
  { value: 'Refrag.gg', label: 'Refrag.gg' },
  { value: 'Leetify', label: 'Leetify' },
  { value: 'Community Server', label: 'Community Server' }
]

const siteChips = [
  'CSNades.gg',
  'CS2Lineups',
  'NadeKing',
  'Pracc.com',
  'Scope.gg',
  'HLTV Pro Utility',
  'Bo3.gg',
  'Refrag.gg',
  'Leetify'
]

const displayModeOptions: { id: LineupDisplayMode; label: string }[] = [
  { id: 'cards', label: 'Cards' },
  { id: 'all_images', label: 'Show All Images' },
  { id: 'spot_movement', label: 'Spot & Movement' }
]

async function fetchLiveCommunityFeed() {
  isFetchingDiscoverFeed.value = true
  try {
    const res = await axios.get('/api/lineups/discover')
    const raw = res.data
    const items: Lineup[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.lineups)
        ? raw.lineups
        : []
    discoveredLineups.value = items.map((item) => ({
      ...item,
      sourceWebsite: item.sourceWebsite || 'Community Server'
    }))
    discoverFeedBanner.value =
      items.length > 0
        ? `Fetched ${items.length} live community lineup${items.length === 1 ? '' : 's'} from server feed.`
        : 'Live community feed checked — all curated pro & external-site lineups are ready.'
  } catch {
    discoverFeedBanner.value =
      'Server discover feed unreachable — showing curated multi-site & community lineups.'
  } finally {
    isFetchingDiscoverFeed.value = false
    setTimeout(() => {
      discoverFeedBanner.value = ''
    }, 3500)
  }
}

// General Lineups + Live Community Server Feed (strictly separated from Personal Book clones)
const combinedLibraryLineups = computed<Lineup[]>(() => {
  const seen = new Set<string>()
  const merged: Lineup[] = []

  const communityShared = lineupStore.customLineups.filter(
    (l) => l.isTeamShared && !l.isPersonalBook && !l.externalId
  )

  for (const item of [
    ...lineupStore.generalLineups,
    ...discoveredLineups.value,
    ...communityShared
  ]) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(item)
    }
  }
  return merged
})

const proPlayerOptions = computed(() => {
  const base = ['m0NESY', 'ZywOo', 'donk', 'ropz', 'Aleksib', 'Karrigan']
  const set = new Set<string>(base)
  for (const item of combinedLibraryLineups.value) {
    if (item.proPlayer) set.add(item.proPlayer)
  }
  return [
    { value: 'all', label: 'All Pros' },
    ...Array.from(set).map((name) => ({ value: name, label: name }))
  ]
})

const allDisplayLineups = computed(() => {
  return combinedLibraryLineups.value.filter((lineup) => {
    if (selectedMapFilter.value !== 'all' && lineup.mapId !== selectedMapFilter.value) {
      return false
    }
    if (selectedNadeFilter.value !== 'all' && lineup.grenadeType !== selectedNadeFilter.value) {
      return false
    }
    if (
      selectedSideFilter.value !== 'all' &&
      lineup.side !== selectedSideFilter.value &&
      lineup.side !== 'all'
    ) {
      return false
    }

    if (selectedSourceFilter.value !== 'all') {
      if (selectedSourceFilter.value === 'Community Server') {
        const isCommunity =
          lineup.sourceWebsite === 'Community Server' ||
          (!lineup.sourceWebsite && (lineup.isCustom || lineup.isTeamShared))
        if (!isCommunity) return false
      } else if (lineup.sourceWebsite !== selectedSourceFilter.value) {
        return false
      }
    }

    if (selectedProPlayerFilter.value !== 'all') {
      if ((lineup.proPlayer || '').toLowerCase() !== selectedProPlayerFilter.value.toLowerCase()) {
        return false
      }
    }

    if (showFavoritesOnly.value && !lineupStore.isFavorite(lineup.id)) {
      return false
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchTitle = lineup.title.toLowerCase().includes(q)
      const matchStart = lineup.startLocation.toLowerCase().includes(q)
      const matchEnd = lineup.endLocation.toLowerCase().includes(q)
      const matchMap = lineup.mapId.toLowerCase().includes(q)
      const matchSource = (lineup.sourceWebsite || '').toLowerCase().includes(q)
      const matchPro = (lineup.proPlayer || '').toLowerCase().includes(q)
      const matchTeam = (lineup.proTeam || '').toLowerCase().includes(q)
      const matchTourney = (lineup.tournament || '').toLowerCase().includes(q)
      const matchTags = (lineup.tags || []).some((t) => t.toLowerCase().includes(q))
      if (
        !matchTitle &&
        !matchStart &&
        !matchEnd &&
        !matchMap &&
        !matchSource &&
        !matchPro &&
        !matchTeam &&
        !matchTourney &&
        !matchTags
      ) {
        return false
      }
    }

    return true
  })
})

const gridLayoutClass = computed(() => {
  if (lineupStore.lineupDisplayMode === 'all_images') {
    return 'grid grid-cols-1 gap-4'
  }
  if (lineupStore.lineupDisplayMode === 'spot_movement') {
    return 'grid grid-cols-1 xl:grid-cols-2 gap-2.5'
  }
  return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
})

const unbookmarkedVisible = computed(() =>
  allDisplayLineups.value.filter((l) => !lineupStore.isInPersonalBook(l.id))
)

function toggleQuickSelectMode() {
  quickSelectMode.value = !quickSelectMode.value
  if (!quickSelectMode.value) {
    lineupStore.clearQuickSelect()
  }
}

function selectAllVisible() {
  for (const item of unbookmarkedVisible.value) {
    if (!lineupStore.quickSelectIds.includes(item.id)) {
      lineupStore.toggleQuickSelect(item.id)
    }
  }
}

function addSelectedToPersonalBook() {
  const added = lineupStore.addQuickSelectedToPersonalBook()
  discoverFeedBanner.value =
    added > 0
      ? `Added ${added} selected general lineup${added === 1 ? '' : 's'} to your Personal Book!`
      : 'Selected lineups are already saved in your Personal Book.'
  quickSelectMode.value = false
  setTimeout(() => {
    discoverFeedBanner.value = ''
  }, 3200)
}

function addAllVisibleToPersonalBook() {
  let added = 0
  for (const item of unbookmarkedVisible.value) {
    lineupStore.quickAddToPersonalBook(item)
    added++
  }
  discoverFeedBanner.value =
    added > 0
      ? `Saved ${added} visible lineup${added === 1 ? '' : 's'} to your Personal Book!`
      : 'All matching lineups are already in your Personal Book.'
  lineupStore.clearQuickSelect()
  setTimeout(() => {
    discoverFeedBanner.value = ''
  }, 3200)
}
</script>

<template>
  <div class="library-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-fade-in">
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
          <Grid class="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">
              General Lineups Directory
            </h1>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-xs font-mono font-bold">
              {{ allDisplayLineups.length }} Catalog Lineups
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Multi-site CS2 utility archive across CSNades.gg, CS2Lineups, NadeKing, Pracc.com, Scope.gg, HLTV, Bo3.gg, Refrag.gg &amp; Leetify — cleanly separated from your Personal Book.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Link to Personal Book -->
        <button
          @click="router.push('/my-lineups')"
          class="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <BookMarked class="w-3.5 h-3.5" />
          <span>My Personal Book ({{ lineupStore.personalBookLineups.length }})</span>
        </button>

        <!-- META SOURCES MODAL BUTTON -->
        <button
          @click="lineupStore.isPresetsModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Meta Sources</span>
        </button>

        <!-- FETCH LIVE COMMUNITY FEED BUTTON -->
        <button
          @click="fetchLiveCommunityFeed"
          :disabled="isFetchingDiscoverFeed"
          class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
        >
          <Globe class="w-3.5 h-3.5 text-cyan-400" :class="{ 'animate-pulse': isFetchingDiscoverFeed }" />
          <span>Live Community Feed</span>
        </button>

        <!-- SYNC BUTTON -->
        <button
          @click="lineupStore.syncWithServer()"
          :disabled="lineupStore.isSyncing"
          class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5 text-amber-400" :class="{ 'animate-spin': lineupStore.isSyncing }" />
          <span>Sync</span>
        </button>

        <!-- ADD LINEUP -->
        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Add Lineup</span>
        </button>
      </div>
    </div>

    <!-- BANNER -->
    <div
      v-if="discoverFeedBanner"
      class="px-4 py-2.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in"
    >
      <CheckCircle2 class="w-4 h-4 text-cyan-400 flex-shrink-0" />
      <span>{{ discoverFeedBanner }}</span>
    </div>

    <!-- ⚡ QUICK ADD BAR -->
    <QuickAddBar />

    <!-- SITE CHIPS + DISPLAY MODE SWITCHER + QUICK-SELECT BAR -->
    <div class="flex flex-col gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs">
      <!-- Top Row: Site Pills + Display Mode Switcher -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Quick CS2 Site Chips -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            @click="selectedSourceFilter = 'all'"
            :class="[
              'px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer',
              selectedSourceFilter === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            ]"
          >
            All Sites
          </button>
          <button
            v-for="site in siteChips"
            :key="site"
            @click="selectedSourceFilter = selectedSourceFilter === site ? 'all' : site"
            :class="[
              'px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer',
              selectedSourceFilter === site
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            ]"
          >
            {{ site }}
          </button>
        </div>

        <!-- 3-Way Display Mode Switcher -->
        <div class="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 font-bold">
          <button
            v-for="mode in displayModeOptions"
            :key="mode.id"
            @click="lineupStore.lineupDisplayMode = mode.id"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer',
              lineupStore.lineupDisplayMode === mode.id
                ? 'bg-amber-500 text-slate-950 font-black shadow'
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

      <!-- Second Row: Dropdown Filters + Search + Quick-Select Toggle -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- MAP SELECT -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 font-bold">Map:</span>
            <select
              v-model="selectedMapFilter"
              class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Maps</option>
              <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
                {{ map.name }}
              </option>
            </select>
          </div>

          <!-- NADE SELECT -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 font-bold">Type:</span>
            <select
              v-model="selectedNadeFilter"
              class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="smoke">Smokes</option>
              <option value="flash">Flashes</option>
              <option value="molotov">Molotovs</option>
              <option value="he">HE Grenades</option>
              <option value="decoy">Decoys</option>
            </select>
          </div>

          <!-- SIDE SELECT -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 font-bold">Side:</span>
            <select
              v-model="selectedSideFilter"
              class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Sides</option>
              <option value="t">Terrorist (T)</option>
              <option value="ct">Counter-Terrorist (CT)</option>
            </select>
          </div>

          <!-- SOURCE SELECT -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 font-bold">Source:</span>
            <select
              v-model="selectedSourceFilter"
              class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option v-for="opt in externalSourceOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- PRO PLAYER SELECT -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400 font-bold">Pro:</span>
            <select
              v-model="selectedProPlayerFilter"
              class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-purple-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option v-for="pro in proPlayerOptions" :key="pro.value" :value="pro.value">
                {{ pro.label }}
              </option>
            </select>
          </div>

          <!-- FAVORITES TOGGLE -->
          <button
            @click="showFavoritesOnly = !showFavoritesOnly"
            :class="[
              'flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer',
              showFavoritesOnly
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            ]"
          >
            <Heart class="w-3.5 h-3.5" :class="{ 'fill-current': showFavoritesOnly }" />
            <span>Favorites</span>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Quick-Select Toggle -->
          <button
            @click="toggleQuickSelectMode"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer',
              quickSelectMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/40'
            ]"
          >
            <Zap class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ quickSelectMode ? 'Quick-Select ON' : 'Quick-Select to Book' }}</span>
          </button>

          <!-- SEARCH INPUT -->
          <div class="relative w-full sm:w-56">
            <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search lineups, spots, sites..."
              class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <!-- Batch Quick-Select Toolbar -->
      <div
        v-if="quickSelectMode || lineupStore.quickSelectIds.length > 0"
        class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950 border border-amber-500/35 rounded-xl"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-bold text-amber-400">{{ lineupStore.quickSelectIds.length }} selected</span>
          <button
            v-if="unbookmarkedVisible.length > 0"
            @click="selectAllVisible"
            class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
          >
            Select Visible ({{ unbookmarkedVisible.length }})
          </button>
          <button
            v-if="lineupStore.quickSelectIds.length > 0"
            @click="lineupStore.clearQuickSelect()"
            class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold cursor-pointer"
          >
            Clear
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="unbookmarkedVisible.length > 0"
            @click="addAllVisibleToPersonalBook"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/35 font-bold cursor-pointer"
          >
            <BookmarkPlus class="w-3.5 h-3.5" />
            <span>Add All Visible ({{ unbookmarkedVisible.length }})</span>
          </button>

          <button
            @click="addSelectedToPersonalBook"
            :disabled="lineupStore.quickSelectIds.length === 0"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition-all',
              lineupStore.quickSelectIds.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            ]"
          >
            <BookmarkCheck class="w-3.5 h-3.5" />
            <span>Add Selected ({{ lineupStore.quickSelectIds.length }}) to My Book</span>
          </button>
        </div>
      </div>
    </div>

    <!-- LINEUPS GRID / VISUAL STRIPS / SPOT & MOVEMENT ROWS -->
    <div v-if="allDisplayLineups.length > 0" :class="gridLayoutClass">
      <LineupCard
        v-for="lineup in allDisplayLineups"
        :key="lineup.id"
        :lineup="lineup"
        :selectable="quickSelectMode"
        :selected="lineupStore.quickSelectIds.includes(lineup.id)"
        @toggle-select="lineupStore.toggleQuickSelect($event)"
      />
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else
      class="flex flex-col items-center justify-center p-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center gap-3"
    >
      <Grid class="w-8 h-8 text-slate-600" />
      <h3 class="text-sm font-bold text-slate-300">No General Lineups Match Your Filters</h3>
      <p class="text-xs text-slate-500 max-w-sm">
        Try clearing your search or switching site, map, or grenade filters.
      </p>
      <div class="flex items-center gap-2 mt-2">
        <button
          @click="
            selectedMapFilter = 'all';
            selectedNadeFilter = 'all';
            selectedSideFilter = 'all';
            selectedSourceFilter = 'all';
            selectedProPlayerFilter = 'all';
            showFavoritesOnly = false;
            searchQuery = '';
          "
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
        >
          Reset Filters
        </button>
        <button
          @click="lineupStore.isAddModalOpen = true"
          class="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md hover:from-amber-500 cursor-pointer"
        >
          Create Lineup
        </button>
      </div>
    </div>

    <!-- MODALS -->
    <LineupModal />
    <AddLineupModal />
    <CommunityPresetsModal
      v-if="lineupStore.isPresetsModalOpen"
      @close="lineupStore.isPresetsModalOpen = false"
    />
  </div>
</template>
