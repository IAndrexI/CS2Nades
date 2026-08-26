<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLineupStore } from '../stores/lineupStore'
import { useMapStore } from '../stores/mapStore'
import LineupCard from '../components/lineups/LineupCard.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import AddLineupModal from '../components/lineups/AddLineupModal.vue'
import NadeIcon from '../components/common/NadeIcon.vue'
import type { GrenadeType, TeamSide } from '../types'
import { 
  Grid, 
  Search, 
  Heart, 
  Plus, 
  Filter, 
  Layers,
  Trash2,
  RefreshCw
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()

const searchQuery = ref('')
const selectedMapFilter = ref('all')
const selectedNadeFilter = ref<string>('all')
const selectedSideFilter = ref<string>('all')
const showFavoritesOnly = ref(false)

const allDisplayLineups = computed(() => {
  return lineupStore.allLineups.filter(lineup => {
    // Map filter
    if (selectedMapFilter.value !== 'all' && lineup.mapId !== selectedMapFilter.value) {
      return false
    }

    // Nade filter
    if (selectedNadeFilter.value !== 'all' && lineup.grenadeType !== selectedNadeFilter.value) {
      return false
    }

    // Side filter
    if (selectedSideFilter.value !== 'all' && lineup.side !== selectedSideFilter.value && lineup.side !== 'all') {
      return false
    }

    // Favorites filter
    if (showFavoritesOnly.value && !lineupStore.isFavorite(lineup.id)) {
      return false
    }

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchTitle = lineup.title.toLowerCase().includes(q)
      const matchStart = lineup.startLocation.toLowerCase().includes(q)
      const matchEnd = lineup.endLocation.toLowerCase().includes(q)
      const matchMap = lineup.mapId.toLowerCase().includes(q)
      if (!matchTitle && !matchStart && !matchEnd && !matchMap) return false
    }

    return true
  })
})

import { useConfirmDialog } from '../composables/useConfirmDialog'

const { confirmAction } = useConfirmDialog()

async function handleClearAll() {
  const ok = await confirmAction({
    title: 'Delete All Lineups?',
    message: 'Are you sure you want to delete ALL lineups in the library? This cannot be undone.',
    confirmLabel: 'Delete All Lineups',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    lineupStore.clearAllLineups()
  }
}
</script>

<template>
  <div class="library-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
          <Grid class="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">Lineup Library</h1>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-xs font-mono font-bold">
              {{ allDisplayLineups.length }} Lineups
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Searchable catalog of indexed smokes, flashes, molotovs, and HE nades across all maps
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- SYNC BUTTON -->
        <button
          @click="lineupStore.syncWithServer()"
          :disabled="lineupStore.isSyncing"
          class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5 text-amber-400" :class="{ 'animate-spin': lineupStore.isSyncing }" />
          <span>Sync Server</span>
        </button>

        <!-- CLEAR ALL BUTTON -->
        <button
          v-if="allDisplayLineups.length > 0"
          @click="handleClearAll"
          class="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          title="Delete all custom and saved lineups"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear All</span>
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

    <!-- FILTER BAR -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs">
      <div class="flex flex-wrap items-center gap-3">
        <!-- MAP SELECT -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 font-bold">Map:</span>
          <select 
            v-model="selectedMapFilter"
            class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
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
            class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
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
            class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Sides</option>
            <option value="t">Terrorist (T)</option>
            <option value="ct">Counter-Terrorist (CT)</option>
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
          <span>Favorites Only</span>
        </button>
      </div>

      <!-- SEARCH INPUT -->
      <div class="relative w-full sm:w-64">
        <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search lineups, spots, tags..." 
          class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>

    <!-- CARDS GRID -->
    <div 
      v-if="allDisplayLineups.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <LineupCard 
        v-for="lineup in allDisplayLineups" 
        :key="lineup.id" 
        :lineup="lineup" 
      />
    </div>

    <!-- EMPTY STATE -->
    <div 
      v-else 
      class="flex flex-col items-center justify-center p-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center gap-3"
    >
      <Grid class="w-8 h-8 text-slate-600" />
      <h3 class="text-sm font-bold text-slate-300">No Lineups Found</h3>
      <p class="text-xs text-slate-500 max-w-sm">
        Use the radar minimap or click "Add Lineup" above to create and index your first grenade throw!
      </p>
      <button 
        @click="lineupStore.isAddModalOpen = true"
        class="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md hover:from-amber-500 cursor-pointer"
      >
        Create Lineup
      </button>
    </div>

    <!-- MODALS -->
    <LineupModal />
    <AddLineupModal />
  </div>
</template>
