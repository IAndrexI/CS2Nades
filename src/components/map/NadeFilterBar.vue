<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { GrenadeType, TeamSide } from '../../types'
import { 
  Eye, 
  RotateCcw, 
  Search, 
  Sparkles, 
  Layers,
  Crosshair,
  Plus,
  Users,
  Shield,
  Layers2,
  Play
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()

const nadeTypes: { type: GrenadeType; label: string }[] = [
  { type: 'smoke', label: 'Smokes' },
  { type: 'flash', label: 'Flashes' },
  { type: 'molotov', label: 'Molotovs' },
  { type: 'he', label: 'HE Nades' }
]

const surfaceLevels = [
  { id: 'all', label: 'All Levels' },
  { id: 'upper', label: 'Upper' },
  { id: 'lower', label: 'Lower' }
]

const teams = [
  { id: 'all', label: 'All Teams' },
  { id: 't', label: 'T Side', color: 'text-amber-400' },
  { id: 'ct', label: 'CT Side', color: 'text-sky-400' }
]

const activeCount = computed(() => lineupStore.filteredLineups.length)
</script>

<template>
  <div class="nade-filter-bar w-full flex flex-col gap-3 p-3 sm:p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
    <!-- TOP ROW: GRENADE TYPES, TEAMS, SURFACE LEVEL, EXECUTES, AND ADD BUTTON -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      
      <!-- LEFT CLUSTER: GRENADE TYPES & TEAM SELECTOR -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- NADE TOGGLE BUTTONS (csnades.gg style) -->
        <div class="flex items-center gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            v-for="item in nadeTypes"
            :key="item.type"
            @click="mapStore.toggleNadeType(item.type)"
            @dblclick.prevent="mapStore.selectOnlyNadeType(item.type)"
            :title="`Toggle ${item.label} (Double-click to isolate)`"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap',
              mapStore.selectedNadeTypes.includes(item.type)
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 opacity-60'
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

        <!-- TEAM FILTER (REPLACING THROW TYPE TAB) -->
        <div class="flex items-center gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800">
          <button
            v-for="team in teams"
            :key="team.id"
            @click="mapStore.setSide(team.id as TeamSide)"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              mapStore.selectedSide === team.id
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <span 
              v-if="team.id === 't'" 
              class="w-2 h-2 rounded-full bg-amber-500"
            ></span>
            <span 
              v-else-if="team.id === 'ct'" 
              class="w-2 h-2 rounded-full bg-sky-400"
            ></span>
            <span>{{ team.label }}</span>
          </button>
        </div>

        <!-- SURFACE LEVEL FILTER (FOR NUKE, VERTIGO, MULTI-LEVEL MAPS) -->
        <div class="flex items-center gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800">
          <span class="text-[10px] uppercase font-mono font-bold text-slate-500 px-1.5 flex items-center gap-1">
            <Layers2 class="w-3 h-3" />
            <span class="hidden sm:inline">Level:</span>
          </span>
          <button
            v-for="lvl in surfaceLevels"
            :key="lvl.id"
            @click="mapStore.setSurfaceLevel(lvl.id as any)"
            :class="[
              'px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap',
              mapStore.surfaceLevel === lvl.id
                ? 'bg-slate-800 text-amber-400 border border-slate-700'
                : 'text-slate-500 hover:text-slate-300'
            ]"
          >
            {{ lvl.label }}
          </button>
        </div>
      </div>

      <!-- RIGHT CLUSTER: EXECUTE GROUPS & ADD NADE ACTION BUTTONS -->
      <div class="flex items-center gap-2">
        <!-- EXECUTE GROUP SELECTOR -->
        <div class="relative flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
          <select 
            :value="lineupStore.activeExecuteId || 'all'"
            @change="lineupStore.setActiveExecute(($event.target as HTMLSelectElement).value === 'all' ? null : ($event.target as HTMLSelectElement).value)"
            class="bg-transparent text-xs font-bold text-slate-200 px-2 py-1 focus:outline-none cursor-pointer uppercase font-mono"
          >
            <option value="all">⚡ All Nades View</option>
            <optgroup v-if="lineupStore.currentMapExecutes.length > 0" label="Tactical Executes">
              <option 
                v-for="exec in lineupStore.currentMapExecutes" 
                :key="exec.id" 
                :value="exec.id"
              >
                🎯 {{ exec.title }} ({{ exec.lineupIds.length }} nades)
              </option>
            </optgroup>
          </select>

          <!-- CREATE EXECUTE BUTTON -->
          <button
            @click="lineupStore.isCreateExecuteModalOpen = true"
            title="Create Synchronized Execute Group"
            class="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            <Sparkles class="w-3 h-3" />
            <span class="hidden md:inline">+ Execute Group</span>
          </button>
        </div>

        <!-- ADD LINEUP / ACTION BUTTON -->
        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus class="w-3.5 h-3.5 stroke-[3]" />
          <span>New Nade</span>
        </button>
      </div>
    </div>

    <!-- BOTTOM ROW: SEARCH, DISPLAY TOGGLES (CALLOUTS / ARCS), ACTIVE COUNTER -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80 text-xs">
      <!-- MAP DISPLAY TOGGLES -->
      <div class="flex items-center gap-2">
        <button
          @click="mapStore.showTrajectories = !mapStore.showTrajectories"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer border',
            mapStore.showTrajectories
              ? 'text-amber-400 font-medium bg-amber-500/10 border-amber-500/30'
              : 'text-slate-400 border-slate-800 hover:text-white bg-slate-950'
          ]"
          title="Toggle trajectory lines"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>All Arcs</span>
        </button>

        <button
          @click="mapStore.showCallouts = !mapStore.showCallouts"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer border',
            mapStore.showCallouts
              ? 'text-sky-400 font-medium bg-sky-500/10 border-sky-500/30'
              : 'text-slate-400 border-slate-800 hover:text-white bg-slate-950'
          ]"
          title="Toggle map spot labels"
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Callouts</span>
        </button>

        <!-- ACTIVE EXECUTE BADGE IF SELECTED -->
        <div v-if="lineupStore.activeExecute" class="flex items-center gap-2 px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-bold">
          <span>Active Execute: <strong>{{ lineupStore.activeExecute.title }}</strong></span>
          <button 
            @click="lineupStore.setActiveExecute(null)" 
            class="text-amber-400 hover:text-white font-bold ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- SEARCH & ACTIVE COUNTER -->
      <div class="flex items-center gap-2 flex-grow sm:flex-grow-0">
        <div class="relative flex-grow sm:flex-grow-0">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            v-model="mapStore.searchQuery"
            placeholder="Search spot / nade..."
            class="w-full sm:w-48 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-2.5 py-1.5 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <button
          @click="mapStore.resetFilters()"
          title="Reset all filters"
          class="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-400 rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>

        <div class="text-[11px] font-mono text-slate-400 pl-1 border-l border-slate-800 whitespace-nowrap">
          <span class="text-amber-400 font-bold">{{ activeCount }}</span> nades shown
        </div>
      </div>
    </div>
  </div>
</template>
