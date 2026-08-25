<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useAuthStore } from '../../stores/authStore'
import LineupCard from './LineupCard.vue'
import { Plus, Search, Filter, Globe, User, Users } from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const authStore = useAuthStore()

const sourceTab = ref<'all' | 'server' | 'personal' | 'friends'>('all')

const lineups = computed(() => {
  let list = lineupStore.filteredLineups
  if (sourceTab.value === 'server') {
    list = list.filter(l => l.isTeamShared || !l.userId)
  } else if (sourceTab.value === 'personal') {
    list = list.filter(l => authStore.currentUser && l.userId === authStore.currentUser.id)
  } else if (sourceTab.value === 'friends') {
    const following = authStore.currentUser?.following || []
    list = list.filter(l => l.userId && following.includes(l.userId))
  }
  return list
})
</script>

<template>
  <div class="lineup-grid-container flex flex-col gap-4">
    <!-- GRID HEADER WITH SOURCE FILTER TABS -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-black tracking-wider uppercase text-slate-200">
          Lineups ({{ lineups.length }})
        </h2>
        <span class="text-xs text-slate-500 font-mono">on {{ mapStore.currentMap.name }}</span>
      </div>

      <!-- SOURCE FILTER TABS (SERVER vs PERSONAL vs FRIENDS) -->
      <div class="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          @click="sourceTab = 'all'"
          :class="[
            'px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
            sourceTab === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          All
        </button>
        <button
          @click="sourceTab = 'server'"
          :class="[
            'flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
            sourceTab === 'server' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          <Globe class="w-3 h-3" />
          <span>Server / Team</span>
        </button>
        <button
          @click="sourceTab = 'personal'"
          :class="[
            'flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
            sourceTab === 'personal' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          <User class="w-3 h-3" />
          <span>Personal</span>
        </button>
        <button
          @click="sourceTab = 'friends'"
          :class="[
            'flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
            sourceTab === 'friends' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          <Users class="w-3 h-3" />
          <span>Friends</span>
        </button>
      </div>
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
