<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { GrenadeType, TeamSide } from '../../types'
import { 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Search, 
  Sparkles, 
  Layers,
  Crosshair,
  Plus
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()

const nadeTypes: { type: GrenadeType; label: string }[] = [
  { type: 'smoke', label: 'Smokes' },
  { type: 'flash', label: 'Flashes' },
  { type: 'molotov', label: 'Molotovs' },
  { type: 'he', label: 'HE Nades' }
]

const throwTypes = [
  { id: 'all', label: 'All Throws' },
  { id: 'standing', label: 'Standing' },
  { id: 'jumpthrow', label: 'Jumpthrow' },
  { id: 'runthrow', label: 'Runthrow' },
  { id: 'crouch_jumpthrow', label: 'Crouch Jump' },
  { id: 'left_right_click', label: 'Left + Right' }
]

const sites = [
  { id: 'all', label: 'All Sites' },
  { id: 'A', label: 'A Site' },
  { id: 'B', label: 'B Site' },
  { id: 'Mid', label: 'Mid' }
]

const activeCount = computed(() => lineupStore.filteredLineups.length)
</script>

<template>
  <div class="nade-filter-bar w-full flex flex-col gap-2.5 p-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl">
    <!-- TOP ROW: NADE TOGGLES & SIDE SELECTOR -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- NADE TOGGLE BUTTONS -->
      <div class="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800/80">
        <button
          v-for="item in nadeTypes"
          :key="item.type"
          @click="mapStore.toggleNadeType(item.type)"
          @dblclick.prevent="mapStore.selectOnlyNadeType(item.type)"
          :title="`Toggle ${item.label} (Double-click to isolate)`"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer',
            mapStore.selectedNadeTypes.includes(item.type)
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-850 opacity-60'
          ]"
        >
          <NadeIcon :type="item.type" :size="16" :filled="mapStore.selectedNadeTypes.includes(item.type)" />
          <span>{{ item.label }}</span>
          <span 
            :class="[
              'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
              mapStore.selectedNadeTypes.includes(item.type)
                ? 'bg-slate-700 text-amber-400'
                : 'bg-slate-900 text-slate-500'
            ]"
          >
            {{ lineupStore.nadeCounts[item.type] || 0 }}
          </span>
        </button>
      </div>

      <!-- TEAM SIDE TOGGLE (ALL / T / CT) -->
      <div class="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800/80">
        <button
          @click="mapStore.setSide('all')"
          :class="[
            'px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer',
            mapStore.selectedSide === 'all'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          ALL
        </button>
        <button
          @click="mapStore.setSide('t')"
          :class="[
            'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
            mapStore.selectedSide === 't'
              ? 'bg-amber-600/30 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'text-slate-400 hover:text-amber-400'
          ]"
        >
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          T SIDE
        </button>
        <button
          @click="mapStore.setSide('ct')"
          :class="[
            'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
            mapStore.selectedSide === 'ct'
              ? 'bg-sky-600/30 text-sky-400 border border-sky-500/50 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
              : 'text-slate-400 hover:text-sky-400'
          ]"
        >
          <span class="w-2 h-2 rounded-full bg-sky-400"></span>
          CT SIDE
        </button>
      </div>

      <!-- ADD LINEUP / ACTION BUTTON -->
      <div class="flex items-center gap-2">
        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 stroke-[3]" />
          <span>New Lineup</span>
        </button>
      </div>
    </div>

    <!-- BOTTOM ROW: SITES, THROW TYPE, TRAJECTORY TOGGLES, SEARCH -->
    <div class="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
      <!-- SITE PILLS -->
      <div class="flex items-center gap-1.5">
        <span class="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Site:</span>
        <button
          v-for="site in sites"
          :key="site.id"
          @click="mapStore.setSite(site.id)"
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer',
            mapStore.selectedSite === site.id
              ? 'bg-slate-700 text-white font-bold border border-slate-600'
              : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
          ]"
        >
          {{ site.label }}
        </button>
      </div>

      <!-- THROW TYPE SELECT -->
      <div class="flex items-center gap-2">
        <span class="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Throw:</span>
        <select
          v-model="mapStore.selectedThrowType"
          class="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-amber-500/60 cursor-pointer"
        >
          <option v-for="t in throwTypes" :key="t.id" :value="t.id">
            {{ t.label }}
          </option>
        </select>
      </div>

      <!-- MAP DISPLAY TOGGLES -->
      <div class="flex items-center gap-3">
        <button
          @click="mapStore.showTrajectories = !mapStore.showTrajectories"
          :class="[
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer',
            mapStore.showTrajectories
              ? 'text-amber-400 font-medium bg-amber-500/10 border border-amber-500/30'
              : 'text-slate-500 hover:text-slate-300'
          ]"
          title="Toggle: Show all trajectories at once vs only on hover/click"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>All Arcs</span>
        </button>

        <button
          @click="mapStore.showCallouts = !mapStore.showCallouts"
          :class="[
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer',
            mapStore.showCallouts
              ? 'text-sky-400 font-medium bg-sky-500/10 border border-sky-500/30'
              : 'text-slate-500 hover:text-slate-300'
          ]"
          title="Toggle spot name labels on radar (off by default — use /callouts tab for full guide)"
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Callouts</span>
        </button>
      </div>

      <!-- SEARCH & ACTIVE COUNTER -->
      <div class="flex items-center gap-2 flex-grow sm:flex-grow-0">
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            v-model="mapStore.searchQuery"
            placeholder="Search lineups / callouts..."
            class="w-44 bg-slate-950/90 border border-slate-800 text-slate-200 text-xs rounded-md pl-8 pr-2.5 py-1 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all"
          />
        </div>

        <button
          @click="mapStore.resetFilters()"
          title="Reset all filters"
          class="p-1 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>

        <div class="text-[11px] font-mono text-slate-400 pl-1 border-l border-slate-800">
          <span class="text-amber-400 font-bold">{{ activeCount }}</span> shown
        </div>
      </div>
    </div>
  </div>
</template>
