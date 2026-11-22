<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useLineupStore } from '../stores/lineupStore'
import { useMapStore } from '../stores/mapStore'
import { useThemeStore } from '../stores/themeStore'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import LineupCard from '../components/lineups/LineupCard.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import AddLineupModal from '../components/lineups/AddLineupModal.vue'
import QuickAddBar from '../components/lineups/QuickAddBar.vue'
import NadeIcon from '../components/common/NadeIcon.vue'
import type { LineupDisplayMode } from '../types'
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  BookMarked,
  Footprints,
  Globe,
  Heart,
  Layers,
  LayoutGrid,
  ListPlus,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const lineupStore = useLineupStore()
const mapStore = useMapStore()
const themeStore = useThemeStore()
const { confirmAction } = useConfirmDialog()

const searchQuery = ref('')
const selectedMapFilter = ref('all')
const selectedNadeFilter = ref('all')
const showFavoritesOnly = ref(false)

// Browse General Lineups Drawer/Modal State
const isQuickPickOpen = ref(false)
const quickPickSearch = ref('')
const quickPickMap = ref('all')
const quickPickNade = ref('all')
const quickPickSite = ref('all')

const displayModeOptions: { id: LineupDisplayMode; label: string }[] = [
  { id: 'cards', label: 'Cards' },
  { id: 'all_images', label: 'Show All Images' },
  { id: 'spot_movement', label: 'Spot & Movement' }
]

const generalSiteOptions = [
  'all',
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

// Strictly isolated Personal Book (accessible signed-in OR locally without login)
const myLineups = computed(() => {
  const currentUserId = authStore.currentUser?.id

  return lineupStore.personalBookLineups.filter((lineup) => {
    if (
      currentUserId &&
      lineup.userId &&
      lineup.userId !== currentUserId &&
      !lineup.isPersonalBook
    ) {
      return false
    }

    if (selectedMapFilter.value !== 'all' && lineup.mapId !== selectedMapFilter.value) {
      return false
    }

    if (selectedNadeFilter.value !== 'all' && lineup.grenadeType !== selectedNadeFilter.value) {
      return false
    }

    if (showFavoritesOnly.value && !lineupStore.isFavorite(lineup.id)) {
      return false
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      return (
        lineup.title.toLowerCase().includes(q) ||
        lineup.startLocation.toLowerCase().includes(q) ||
        lineup.endLocation.toLowerCase().includes(q) ||
        lineup.mapId.toLowerCase().includes(q) ||
        (lineup.sourceWebsite || '').toLowerCase().includes(q)
      )
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

const filteredQuickPickLineups = computed(() => {
  return lineupStore.generalLineups.filter((lineup) => {
    if (quickPickMap.value !== 'all' && lineup.mapId !== quickPickMap.value) return false
    if (quickPickNade.value !== 'all' && lineup.grenadeType !== quickPickNade.value) return false
    if (quickPickSite.value !== 'all' && lineup.sourceWebsite !== quickPickSite.value) return false

    if (quickPickSearch.value.trim()) {
      const q = quickPickSearch.value.toLowerCase()
      const matchTitle = lineup.title.toLowerCase().includes(q)
      const matchStart = lineup.startLocation.toLowerCase().includes(q)
      const matchEnd = lineup.endLocation.toLowerCase().includes(q)
      const matchMap = lineup.mapId.toLowerCase().includes(q)
      const matchSite = (lineup.sourceWebsite || '').toLowerCase().includes(q)
      const matchPro = (lineup.proPlayer || '').toLowerCase().includes(q)
      const matchTags = (lineup.tags || []).some((t) => t.toLowerCase().includes(q))
      if (!matchTitle && !matchStart && !matchEnd && !matchMap && !matchSite && !matchPro && !matchTags) {
        return false
      }
    }
    return true
  })
})

const unbookmarkedQuickPick = computed(() =>
  filteredQuickPickLineups.value.filter((l) => !lineupStore.isInPersonalBook(l.id))
)

function addAllFilteredQuickPick() {
  for (const item of unbookmarkedQuickPick.value) {
    lineupStore.quickAddToPersonalBook(item)
  }
}

async function handleClearAll() {
  const ok = await confirmAction({
    title: 'Clear Your Personal Book?',
    message:
      'Are you sure you want to remove all lineups from your Personal Book? General meta lineups in the Library remain untouched.',
    confirmLabel: 'Clear Personal Book',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    lineupStore.clearAllLineups()
  }
}
</script>

<template>
  <div class="my-lineups-view max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-fade-in">
    <!-- PERSONAL BOOK HEADER (ACCESSIBLE SIGNED-IN OR LOCALLY) -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-lg">
      <div class="flex items-center gap-3.5">
        <div v-if="authStore.isAuthenticated" class="relative">
          <img
            :src="
              authStore.currentUser?.avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${authStore.currentUser?.username}`
            "
            :alt="authStore.currentUser?.username"
            class="w-12 h-12 rounded-2xl bg-slate-950 border border-white/[0.15] p-0.5 shadow"
          />
          <span class="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-semibold rounded-md font-mono uppercase">
            {{ authStore.currentUser?.inGameRole || 'Player' }}
          </span>
        </div>
        <div
          v-else
          class="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl"
        >
          <BookMarked class="w-5 h-5" />
        </div>

        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-lg font-semibold text-white tracking-tight">
              {{
                authStore.isAuthenticated
                  ? `${authStore.currentUser?.username}'s Personal Book`
                  : 'My Personal Book'
              }}
            </h1>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium">
              {{ myLineups.length }} Saved
            </span>
            <span
              v-if="!authStore.isAuthenticated"
              class="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 text-[11px] font-medium"
            >
              Local Workspace Ready
            </span>
            <span
              v-else
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase',
                authStore.isAdmin
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-white/[0.06] text-slate-300'
              ]"
            >
              {{ authStore.currentUser?.role }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Your isolated personal nade book — kept separate from General Meta Lineups. Save favorites from any CS2 site or craft your own.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Browse General Lineups Drawer Trigger -->
        <button
          @click="isQuickPickOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-slate-100 border border-white/[0.1] rounded-xl text-xs font-medium transition-all cursor-pointer"
        >
          <ListPlus class="w-3.5 h-3.5 text-amber-400" />
          <span>Browse General Lineups</span>
        </button>

        <button
          @click="router.push('/library')"
          class="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <Globe class="w-3.5 h-3.5 text-sky-400" />
          <span>General Directory</span>
        </button>

        <button
          v-if="!authStore.isAuthenticated"
          @click="
            authStore.authMode = 'login';
            authStore.isAuthModalOpen = true;
          "
          class="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          Sign In to Sync
        </button>

        <button
          v-if="myLineups.length > 0"
          @click="handleClearAll"
          class="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-2 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer hover:opacity-95"
          :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
        >
          <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create My Lineup</span>
        </button>
      </div>
    </div>

    <!-- QUICK ADD & CONSOLE COMMANDS BAR -->
    <QuickAddBar />

    <!-- FILTER + DISPLAY MODE SWITCHER BAR -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl text-xs shadow-lg">
      <div class="flex flex-wrap items-center gap-3">
        <!-- MAP SELECT -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 font-medium">Map:</span>
          <select
            v-model="selectedMapFilter"
            class="bg-slate-950/80 border border-white/[0.08] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all" class="bg-slate-900">All Maps</option>
            <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id" class="bg-slate-900">
              {{ map.name }}
            </option>
          </select>
        </div>

        <!-- NADE SELECT -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 font-medium">Type:</span>
          <select
            v-model="selectedNadeFilter"
            class="bg-slate-950/80 border border-white/[0.08] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all" class="bg-slate-900">All Types</option>
            <option value="smoke" class="bg-slate-900">Smokes</option>
            <option value="flash" class="bg-slate-900">Flashes</option>
            <option value="molotov" class="bg-slate-900">Molotovs</option>
            <option value="he" class="bg-slate-900">HE Grenades</option>
            <option value="decoy" class="bg-slate-900">Decoys</option>
          </select>
        </div>

        <!-- FAVORITES TOGGLE -->
        <button
          @click="showFavoritesOnly = !showFavoritesOnly"
          :class="[
            'flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer border',
            showFavoritesOnly
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
              : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.07]'
          ]"
        >
          <Heart class="w-3.5 h-3.5" :class="{ 'fill-current': showFavoritesOnly }" />
          <span>Favorites</span>
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- 3-Way Display Mode Switcher -->
        <div class="flex flex-wrap items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/[0.07] font-medium">
          <button
            v-for="mode in displayModeOptions"
            :key="mode.id"
            @click="lineupStore.lineupDisplayMode = mode.id"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer',
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

        <!-- SEARCH INPUT -->
        <div class="relative w-full sm:w-56">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search personal book..."
            class="w-full bg-slate-950/80 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70"
          />
        </div>
      </div>
    </div>

    <!-- PERSONAL BOOK LINEUPS GRID / VISUAL STRIPS / SPOT & MOVEMENT ROWS -->
    <div v-if="myLineups.length > 0" :class="gridLayoutClass">
      <LineupCard v-for="lineup in myLineups" :key="lineup.id" :lineup="lineup" />
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else
      class="flex flex-col items-center justify-center p-16 bg-slate-900/40 border border-dashed border-white/[0.1] rounded-2xl text-center gap-3"
    >
      <BookMarked class="w-8 h-8 text-slate-500" />
      <h3 class="text-sm font-semibold text-slate-200">Your Personal Book is Empty</h3>
      <p class="text-xs text-slate-400 max-w-md">
        Select verified lineups from CSNades.gg, NadeKing, Refrag.gg, HLTV, and more into your personal book, or create your own custom lineup.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-2.5 mt-1">
        <button
          @click="isQuickPickOpen = true"
          class="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs cursor-pointer"
        >
          <ListPlus class="w-3.5 h-3.5" />
          <span>Browse General Lineups</span>
        </button>

        <button
          @click="lineupStore.isAddModalOpen = true"
          class="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-medium rounded-xl border border-white/[0.08] text-xs cursor-pointer"
        >
          Create Custom Lineup
        </button>
      </div>
    </div>

    <!-- BROWSE GENERAL LINEUPS DRAWER / MODAL -->
    <Teleport to="body">
      <div
        v-if="isQuickPickOpen"
        class="fixed inset-0 z-[9998] flex items-center justify-end bg-black/75 backdrop-blur-sm animate-fade-in"
        @click.self="isQuickPickOpen = false"
      >
        <div class="w-full max-w-2xl h-full bg-slate-900/95 backdrop-blur-2xl border-l border-white/[0.1] shadow-2xl flex flex-col">
          <!-- Drawer Header -->
          <div class="flex items-center justify-between gap-3 p-5 bg-slate-950/80 border-b border-white/[0.08]">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-amber-400">
                <ListPlus class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base font-semibold text-white tracking-tight">
                  Browse General Lineups
                </h2>
                <p class="text-xs text-slate-400">
                  Search meta lineups across all maps and CS2 sites to save into your Personal Book.
                </p>
              </div>
            </div>

            <button
              @click="isQuickPickOpen = false"
              class="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Drawer Filter Bar -->
          <div class="p-4 bg-slate-950/50 border-b border-white/[0.07] flex flex-col gap-2.5 text-xs">
            <div class="relative">
              <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="quickPickSearch"
                type="text"
                placeholder="Search by lineup name, spot, target, site, or pro..."
                class="w-full bg-slate-900 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <select
                  v-model="quickPickMap"
                  class="bg-slate-900 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 cursor-pointer"
                >
                  <option value="all">All Maps</option>
                  <option v-for="m in mapStore.availableMaps" :key="m.id" :value="m.id">
                    {{ m.name }}
                  </option>
                </select>

                <select
                  v-model="quickPickNade"
                  class="bg-slate-900 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 cursor-pointer"
                >
                  <option value="all">All Utility</option>
                  <option value="smoke">Smokes</option>
                  <option value="flash">Flashes</option>
                  <option value="molotov">Molotovs</option>
                  <option value="he">HE Grenades</option>
                  <option value="decoy">Decoys</option>
                </select>

                <select
                  v-model="quickPickSite"
                  class="bg-slate-900 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 cursor-pointer"
                >
                  <option v-for="site in generalSiteOptions" :key="site" :value="site">
                    {{ site === 'all' ? 'All CS2 Sites' : site }}
                  </option>
                </select>
              </div>

              <button
                v-if="unbookmarkedQuickPick.length > 0"
                @click="addAllFilteredQuickPick"
                class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold cursor-pointer"
              >
                <BookmarkPlus class="w-3.5 h-3.5" />
                <span>Save All ({{ unbookmarkedQuickPick.length }})</span>
              </button>
            </div>
          </div>

          <!-- Drawer Results List -->
          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
            <div
              v-if="filteredQuickPickLineups.length === 0"
              class="flex flex-col items-center justify-center py-16 text-center text-slate-400 text-xs"
            >
              <Search class="w-8 h-8 text-slate-600 mb-2" />
              <p class="font-medium text-slate-300">No general lineups match this filter.</p>
            </div>

            <div
              v-for="item in filteredQuickPickLineups"
              :key="item.id"
              class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="p-1.5 bg-white/[0.05] rounded-lg border border-white/[0.08] shrink-0">
                  <NadeIcon :type="item.grenadeType" :size="18" :filled="true" />
                </div>

                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-semibold text-xs text-white truncate max-w-[240px]">
                      {{ item.title }}
                    </span>
                    <span class="px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/[0.08] text-[9px] font-medium uppercase text-amber-300">
                      {{ mapStore.getMapById(item.mapId)?.name || item.mapId }}
                    </span>
                    <span
                      :class="[
                        'px-1.5 py-0.2 rounded text-[9px] font-medium uppercase',
                        item.side === 't' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                      ]"
                    >
                      {{ item.side }}
                    </span>
                    <span
                      v-if="item.sourceWebsite"
                      class="px-1.5 py-0.2 rounded bg-sky-500/10 border border-sky-500/25 text-sky-300 text-[9px] font-medium"
                    >
                      {{ item.sourceWebsite }}
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                    <span class="text-amber-300 font-medium">{{ item.startLocation }}</span>
                    <ArrowRight class="w-3 h-3 text-slate-600" />
                    <span class="text-emerald-300 font-medium">{{ item.endLocation }}</span>
                    <span class="text-slate-600">•</span>
                    <span class="capitalize text-sky-300">
                      {{ (item.movementType || 'stationary').replace(/_/g, ' ') }}
                    </span>
                    <span class="font-mono uppercase text-[10px] text-slate-400">
                      ({{ item.throwType.replace(/_/g, ' ') }})
                    </span>
                  </div>
                </div>
              </div>

              <button
                @click="lineupStore.togglePersonalBook(item)"
                :class="[
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0',
                  lineupStore.isInPersonalBook(item.id)
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 font-semibold'
                ]"
              >
                <BookmarkCheck v-if="lineupStore.isInPersonalBook(item.id)" class="w-3.5 h-3.5" />
                <BookmarkPlus v-else class="w-3.5 h-3.5" />
                <span>{{ lineupStore.isInPersonalBook(item.id) ? 'In My Book' : 'Save to Book' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODALS -->
    <LineupModal />
    <AddLineupModal />
  </div>
</template>
