<script setup lang="ts">
import { computed } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import LineupCard from './LineupCard.vue'
import { Plus, Search, Filter } from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()

const lineups = computed(() => lineupStore.filteredLineups)
</script>

<template>
  <div class="lineup-grid-container flex flex-col gap-4">
    <!-- GRID HEADER -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-black tracking-wider uppercase text-slate-300">
          Lineups ({{ lineups.length }})
        </h2>
        <span class="text-xs text-slate-500 font-mono">on {{ mapStore.currentMap.name }}</span>
      </div>

      <button 
        @click="lineupStore.isAddModalOpen = true"
        class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Add Lineup</span>
      </button>
    </div>

    <!-- CARDS GRID -->
    <div 
      v-if="lineups.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <LineupCard 
        v-for="lineup in lineups" 
        :key="lineup.id" 
        :lineup="lineup" 
      />
    </div>

    <!-- EMPTY STATE -->
    <div 
      v-else
      class="flex flex-col items-center justify-center p-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center gap-3"
    >
      <div class="p-3 bg-slate-800/80 rounded-full text-slate-500">
        <Search class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-300">No Lineups Found</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-sm">
          No grenade lineups match your current grenade toggles, team side, or search query for {{ mapStore.currentMap.name }}.
        </p>
      </div>
      <button 
        @click="mapStore.resetFilters()"
        class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
      >
        Reset Filters
      </button>
    </div>
  </div>
</template>
