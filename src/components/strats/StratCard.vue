<script setup lang="ts">
import { useStratStore } from '../../stores/stratStore'
import type { Strategy } from '../../types'
import { Users, Crosshair, Shield, Flame, ArrowRight } from 'lucide-vue-next'

const props = defineProps<{
  strat: Strategy
}>()

const stratStore = useStratStore()
</script>

<template>
  <div 
    @click="stratStore.openStrat(strat)"
    class="strat-card group bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-xl transition-all duration-200 cursor-pointer flex flex-col gap-4"
  >
    <!-- TOP ROW: TITLE & BADGES -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span 
            :class="[
              'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
              strat.side === 't' ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40' : 'bg-sky-600/30 text-sky-400 border border-sky-500/40'
            ]"
          >
            {{ strat.side === 't' ? 'T SIDE' : 'CT SIDE' }}
          </span>
          <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold uppercase">
            {{ strat.buyType.replace('_', ' ') }}
          </span>
          <span v-if="strat.targetSite" class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
            SITE {{ strat.targetSite }}
          </span>
        </div>
        <h3 class="text-base font-black text-white group-hover:text-amber-400 transition-colors mt-1">
          {{ strat.title }}
        </h3>
      </div>

      <div class="p-2 bg-slate-950 rounded-lg text-slate-500 group-hover:text-amber-400 transition-colors">
        <ArrowRight class="w-4 h-4" />
      </div>
    </div>

    <!-- SUMMARY -->
    <p class="text-xs text-slate-400 leading-relaxed line-clamp-2">
      {{ strat.summary }}
    </p>

    <!-- FOOTER: PHASES & PLAYER SLOTS -->
    <div class="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
      <div class="flex items-center gap-1.5 text-slate-400">
        <Users class="w-3.5 h-3.5 text-amber-400" />
        <span class="font-bold text-slate-200">5-Player Execute</span>
      </div>

      <div class="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
        <span>{{ strat.phases.length }} Phases</span>
      </div>
    </div>
  </div>
</template>
