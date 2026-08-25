<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStratStore } from '../../stores/stratStore'
import { useLineupStore } from '../../stores/lineupStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { Strategy, StratPhase, StratPlayerAssignment, Lineup } from '../../types'
import { 
  X, 
  Users, 
  Trash2, 
  Clock, 
  Shield, 
  Crosshair, 
  Zap, 
  ExternalLink,
  ChevronRight
} from 'lucide-vue-next'

const stratStore = useStratStore()
const lineupStore = useLineupStore()

const strat = computed(() => stratStore.activeStrat)
const activePhaseIndex = ref(0)

const currentPhase = computed<StratPhase | null>(() => {
  if (!strat.value || !strat.value.phases.length) return null
  return strat.value.phases[activePhaseIndex.value] || strat.value.phases[0]
})

function getLineupById(id: string): Lineup | undefined {
  return lineupStore.allLineups.find(l => l.id === id)
}

function openLinkedLineup(lineupId: string) {
  const l = getLineupById(lineupId)
  if (l) {
    lineupStore.openLineup(l)
  }
}

function handleDelete() {
  if (!strat.value) return
  if (confirm(`Delete strategy "${strat.value.title}"?`)) {
    stratStore.deleteStrat(strat.value.id)
  }
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="strat"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="stratStore.closeStrat()"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] my-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Users class="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-black tracking-tight text-white">{{ strat.title }}</h2>
              <span 
                :class="[
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                  strat.side === 't' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                ]"
              >
                {{ strat.side === 't' ? 'T SIDE' : 'CT SIDE' }}
              </span>
              <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase">
                {{ strat.buyType.replace('_', ' ') }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">{{ strat.summary }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button 
            v-if="strat.isCustom"
            @click="handleDelete"
            class="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Delete Strat"
          >
            <Trash2 class="w-5 h-5" />
          </button>

          <button 
            @click="stratStore.closeStrat()"
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-grow overflow-y-auto p-6 flex flex-col gap-6">
        <!-- PHASE TIMELINE TABS -->
        <div class="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
          <button 
            v-for="(phase, idx) in strat.phases"
            :key="phase.id"
            @click="activePhaseIndex = idx"
            :class="[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activePhaseIndex === idx 
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            ]"
          >
            <Clock class="w-3.5 h-3.5" />
            <span>{{ phase.name }}</span>
          </button>
        </div>

        <!-- PHASE CONTENT -->
        <div v-if="currentPhase" class="flex flex-col gap-4">
          <div class="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300">
            {{ currentPhase.description }}
          </div>

          <!-- 5 PLAYER SLOTS BREAKDOWN -->
          <div class="flex flex-col gap-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Player Role Assignments & Utility</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div 
                v-for="assignment in currentPhase.playerAssignments"
                :key="assignment.slot"
                class="p-4 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col gap-3"
              >
                <!-- SLOT HEADER -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono font-black text-amber-400">
                      P{{ assignment.slot }}
                    </span>
                    <span class="font-bold text-xs text-white">{{ assignment.playerName || `Player ${assignment.slot}` }}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold font-mono">
                    {{ assignment.role }}
                  </span>
                </div>

                <!-- INSTRUCTIONS -->
                <p class="text-xs text-slate-300 leading-relaxed">
                  {{ assignment.instructions }}
                </p>

                <!-- LINKED LINEUPS -->
                <div v-if="assignment.lineupIds && assignment.lineupIds.length" class="flex flex-col gap-1.5 pt-2 border-t border-slate-800/60">
                  <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Required Lineups:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="lid in assignment.lineupIds"
                      :key="lid"
                      @click="openLinkedLineup(lid)"
                      class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 font-medium transition-colors cursor-pointer"
                    >
                      <NadeIcon 
                        v-if="getLineupById(lid)" 
                        :type="getLineupById(lid)!.grenadeType" 
                        :size="13" 
                        :filled="true" 
                      />
                      <span>{{ getLineupById(lid)?.title || 'View Lineup' }}</span>
                      <ExternalLink class="w-2.5 h-2.5 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</Teleport>
</template>
