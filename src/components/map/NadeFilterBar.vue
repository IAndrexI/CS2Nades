<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { GrenadeType, TeamSide } from '../../types'
import {
  RotateCcw,
  Search,
  Sparkles,
  Layers,
  Plus,
  Globe,
  X
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()

const nadeTypes: { type: GrenadeType; label: string }[] = [
  { type: 'smoke', label: 'Smokes' },
  { type: 'flash', label: 'Flashes' },
  { type: 'molotov', label: 'Molotovs' },
  { type: 'he', label: 'HE Nades' }
]

const teams = [
  { id: 'all', label: 'All Sides' },
  { id: 't', label: 'T Side', color: 'text-amber-400' },
  { id: 'ct', label: 'CT Side', color: 'text-sky-400' }
]

const activeCount = computed(() => lineupStore.filteredLineups.length)
</script>

<template>
  <div class="nade-filter-bar w-full flex flex-col gap-3 p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-lg">
    <!-- TOP ROW: GRENADE TYPES, TEAMS, EXECUTES, AND ADD BUTTON -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- LEFT CLUSTER: GRENADE TYPES & TEAM SELECTOR -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- NADE TOGGLE BUTTONS -->
        <div class="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/[0.07] overflow-x-auto max-w-full">
          <button
            v-for="item in nadeTypes"
            :key="item.type"
            @click="mapStore.toggleNadeType(item.type)"
            @dblclick.prevent="mapStore.selectOnlyNadeType(item.type)"
            :title="`Toggle ${item.label} (Double-click to isolate)`"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none whitespace-nowrap',
              mapStore.selectedNadeTypes.includes(item.type)
                ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] opacity-70'
            ]"
          >
            <NadeIcon :type="item.type" :size="16" :filled="mapStore.selectedNadeTypes.includes(item.type)" />
            <span>{{ item.label }}</span>
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium',
                mapStore.selectedNadeTypes.includes(item.type)
                  ? 'bg-white/[0.12] text-amber-300'
                  : 'bg-white/[0.04] text-slate-500'
              ]"
            >
              {{ lineupStore.nadeCounts[item.type] || 0 }}
            </span>
          </button>
        </div>

        <!-- TEAM FILTER -->
        <div class="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/[0.07]">
          <button
            v-for="team in teams"
            :key="team.id"
            @click="mapStore.setSide(team.id as TeamSide)"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              mapStore.selectedSide === team.id
                ? 'bg-white/[0.1] text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <span
              v-if="team.id === 't'"
              class="w-2 h-2 rounded-full bg-amber-400"
            ></span>
            <span
              v-else-if="team.id === 'ct'"
              class="w-2 h-2 rounded-full bg-sky-400"
            ></span>
            <span>{{ team.label }}</span>
          </button>
        </div>
      </div>

      <!-- RIGHT CLUSTER: EXECUTE GROUPS & ADD NADE ACTION BUTTONS -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- EXECUTE GROUP SELECTOR -->
        <div class="relative flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/[0.07]">
          <select
            :value="lineupStore.activeExecuteId || 'all'"
            @change="lineupStore.setActiveExecute(($event.target as HTMLSelectElement).value === 'all' ? null : ($event.target as HTMLSelectElement).value)"
            class="bg-transparent text-xs font-medium text-slate-200 px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="all" class="bg-slate-900 text-white">All Nades View</option>
            <optgroup v-if="lineupStore.currentMapExecutes.length > 0" label="Tactical Executes" class="bg-slate-900 text-white">
              <option
                v-for="exec in lineupStore.currentMapExecutes"
                :key="exec.id"
                :value="exec.id"
                class="bg-slate-900 text-white"
              >
                {{ exec.title }} ({{ exec.lineupIds.length }} nades)
              </option>
            </optgroup>
          </select>

          <!-- CREATE EXECUTE BUTTON -->
          <button
            @click="lineupStore.isCreateExecuteModalOpen = true"
            title="Create Synchronized Execute Group"
            class="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08] rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            <Plus class="w-3 h-3 text-amber-400" />
            <span class="hidden md:inline">Execute Group</span>
          </button>
        </div>

        <!-- COMMUNITY PRESETS BUTTON -->
        <button
          @click="lineupStore.isPresetsModalOpen = true"
          title="Browse and import lineups from CSNades, NadeKing, CS2Lineups, Pracc, and Scope.gg"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] font-medium text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
        >
          <Globe class="w-3.5 h-3.5 text-amber-400" />
          <span>Meta Sources</span>
        </button>

        <!-- ADD LINEUP / ACTION BUTTON -->
        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create Lineup</span>
        </button>
      </div>
    </div>

    <!-- BOTTOM ROW: SEARCH, DISPLAY TOGGLES (CALLOUTS / ARCS), ACTIVE COUNTER -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/[0.06] text-xs">
      <!-- MAP DISPLAY TOGGLES -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="mapStore.showTrajectories = !mapStore.showTrajectories"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer border',
            mapStore.showTrajectories
              ? 'text-amber-300 font-medium bg-amber-500/15 border-amber-500/30'
              : 'text-slate-400 border-white/[0.07] hover:text-white bg-white/[0.03]'
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
              ? 'text-sky-300 font-medium bg-sky-500/15 border-sky-500/30'
              : 'text-slate-400 border-white/[0.07] hover:text-white bg-white/[0.03]'
          ]"
          title="Toggle map spot labels"
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Callouts</span>
        </button>

        <!-- BASIC META LINEUPS TOGGLE -->
        <button
          @click="lineupStore.toggleBasicLineups()"
          :class="[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer border',
            lineupStore.showBasicLineups
              ? 'text-amber-300 font-medium bg-amber-500/15 border-amber-500/30'
              : 'text-slate-400 border-white/[0.07] hover:text-slate-200 bg-white/[0.03]'
          ]"
          :title="lineupStore.showBasicLineups ? 'Basic meta lineups are included (Click to hide)' : 'Basic meta lineups hidden (Click to show)'"
        >
          <Globe class="w-3.5 h-3.5" />
          <span>Basic Nades: {{ lineupStore.showBasicLineups ? 'On' : 'Off' }}</span>
        </button>

        <!-- ACTIVE EXECUTE BADGE IF SELECTED -->
        <div v-if="lineupStore.activeExecute" class="flex items-center gap-2 px-2.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium">
          <span>Active Execute: <strong class="text-white">{{ lineupStore.activeExecute.title }}</strong></span>
          <button
            @click="lineupStore.setActiveExecute(null)"
            class="text-amber-300 hover:text-white ml-0.5 cursor-pointer"
          >
            <X class="w-3 h-3" />
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
            placeholder="Search spot or lineup..."
            class="w-full sm:w-48 bg-slate-950/80 border border-white/[0.08] text-slate-200 text-xs rounded-xl pl-8 pr-2.5 py-1.5 placeholder-slate-500 focus:outline-none focus:border-amber-400/70 transition-all"
          />
        </div>

        <button
          @click="mapStore.resetFilters()"
          title="Reset all filters"
          class="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>

        <div class="text-[11px] font-mono text-slate-400 pl-2 border-l border-white/[0.08] whitespace-nowrap">
          <span class="text-white font-semibold">{{ activeCount }}</span> shown
        </div>
      </div>
    </div>
  </div>
</template>
