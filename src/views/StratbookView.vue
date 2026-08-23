<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStratStore } from '../stores/stratStore'
import { useMapStore } from '../stores/mapStore'
import StratCard from '../components/strats/StratCard.vue'
import StratModal from '../components/strats/StratModal.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import { Plus, BookOpen, Shield, Users, Search } from 'lucide-vue-next'

const stratStore = useStratStore()
const mapStore = useMapStore()

const searchQuery = ref('')
const selectedSide = ref<'all' | 't' | 'ct'>('all')

const filteredStrats = computed(() => {
  return stratStore.currentMapStrats.filter(s => {
    if (selectedSide.value !== 'all' && s.side !== selectedSide.value) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      return s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)
    }
    return true
  })
})

const isCreateModalOpen = ref(false)
const newStratTitle = ref('')
const newStratSide = ref<'t' | 'ct'>('t')
const newStratSummary = ref('')

function handleCreateStrat() {
  if (!newStratTitle.value.trim()) return
  const created = stratStore.addStrat({
    title: newStratTitle.value,
    mapId: mapStore.currentMapId,
    side: newStratSide.value,
    buyType: 'full_buy',
    summary: newStratSummary.value || 'Custom team strategy execute.',
    tags: ['Custom', 'Team Play'],
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Setup & Execute',
        description: 'Synchronized utility and site breach.',
        playerAssignments: [
          { slot: 1, role: 'IGL', instructions: 'Call timings.', lineupIds: [], position: { x: 50, y: 80 } },
          { slot: 2, role: 'Entry', instructions: 'First entry.', lineupIds: [], position: { x: 55, y: 70 } },
          { slot: 3, role: 'Support', instructions: 'Flash / Smoke support.', lineupIds: [], position: { x: 45, y: 75 } },
          { slot: 4, role: 'Support', instructions: 'Secondary support.', lineupIds: [], position: { x: 40, y: 75 } },
          { slot: 5, role: 'Lurker', instructions: 'Hold flank / lurk.', lineupIds: [], position: { x: 30, y: 60 } }
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
  <div class="stratbook-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
          <BookOpen class="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">Team Stratbook</h1>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-xs font-mono font-bold">
              {{ mapStore.currentMap.name }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Organized 5-player executes, site takes, and tactical defaults linked with utility
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- SIDE TOGGLE -->
        <div class="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            @click="selectedSide = 'all'"
            :class="[
              'px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer',
              selectedSide === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            ]"
          >
            All
          </button>
          <button
            @click="selectedSide = 't'"
            :class="[
              'px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer',
              selectedSide === 't' ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-amber-400'
            ]"
          >
            T Side
          </button>
          <button
            @click="selectedSide = 'ct'"
            :class="[
              'px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer',
              selectedSide === 'ct' ? 'bg-sky-600/30 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-sky-400'
            ]"
          >
            CT Side
          </button>
        </div>

        <!-- NEW STRAT BUTTON -->
        <button
          @click="isCreateModalOpen = true"
          class="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>New Strat</span>
        </button>
      </div>
    </div>

    <!-- STRATS GRID -->
    <div v-if="filteredStrats.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <StratCard 
        v-for="strat in filteredStrats" 
        :key="strat.id" 
        :strat="strat" 
      />
    </div>

    <!-- EMPTY STATE -->
    <div 
      v-else 
      class="flex flex-col items-center justify-center p-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center gap-3"
    >
      <BookOpen class="w-8 h-8 text-slate-600" />
      <h3 class="text-sm font-bold text-slate-300">No Strats for {{ mapStore.currentMap.name }}</h3>
      <p class="text-xs text-slate-500 max-w-sm">
        Create your first team execute playbook or switch to another map.
      </p>
      <button 
        @click="isCreateModalOpen = true"
        class="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
      >
        Create Strategy
      </button>
    </div>

    <!-- CREATE STRAT MODAL -->
    <div 
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      @click.self="isCreateModalOpen = false"
    >
      <div class="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-xs">
        <h2 class="text-base font-black text-white">Create New Strategy</h2>
        
        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Strategy Title</label>
          <input 
            v-model="newStratTitle" 
            type="text" 
            placeholder="e.g. Mirage Fast B Split" 
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Team Side</label>
          <select 
            v-model="newStratSide" 
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
          >
            <option value="t">Terrorist (T)</option>
            <option value="ct">Counter-Terrorist (CT)</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Summary / Execution Goal</label>
          <textarea 
            v-model="newStratSummary" 
            rows="3" 
            placeholder="Describe the execute and phase goals..." 
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button 
            @click="isCreateModalOpen = false" 
            class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            @click="handleCreateStrat" 
            class="px-5 py-2 bg-amber-500 text-slate-950 rounded-xl font-black hover:bg-amber-400 cursor-pointer"
          >
            Create
          </button>
        </div>
      </div>
    </div>

    <!-- MODALS -->
    <StratModal />
    <LineupModal />
  </div>
</template>
