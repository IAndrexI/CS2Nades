<script setup lang="ts">
import { useLineupStore } from '../../stores/lineupStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { Lineup } from '../../types'
import { Heart, Play, ArrowRight } from 'lucide-vue-next'

const props = defineProps<{
  lineup: Lineup
}>()

const lineupStore = useLineupStore()
</script>

<template>
  <div 
    @click="lineupStore.openLineup(lineup)"
    class="lineup-card group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col"
  >
    <!-- TOP THUMBNAIL / PREVIEW -->
    <div class="relative w-full h-32 bg-slate-950 overflow-hidden flex items-center justify-center">
      <img 
        :src="lineup.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'" 
        :alt="lineup.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
      />
      
      <!-- NADE TYPE BADGE (TOP LEFT) -->
      <div class="absolute top-2.5 left-2.5 p-1.5 bg-slate-950/80 backdrop-blur-md rounded-lg border border-slate-800 shadow-md">
        <NadeIcon :type="lineup.grenadeType" :size="16" :filled="true" />
      </div>

      <!-- TEAM SIDE BADGE (TOP RIGHT) -->
      <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        <span 
          :class="[
            'px-2 py-0.5 rounded text-[10px] font-bold uppercase backdrop-blur-md',
            lineup.side === 't' ? 'bg-amber-600/80 text-white' : lineup.side === 'ct' ? 'bg-sky-600/80 text-white' : 'bg-slate-700/80 text-white'
          ]"
        >
          {{ lineup.side }}
        </span>
      </div>

      <!-- VIDEO INDICATOR -->
      <div v-if="lineup.videoUrl" class="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[10px] text-slate-300 font-semibold">
        <Play class="w-2.5 h-2.5 fill-current text-amber-400" />
        <span>Video</span>
      </div>

      <!-- FAVORITE BUTTON -->
      <button 
        @click.stop="lineupStore.toggleFavorite(lineup.id)"
        class="absolute bottom-2.5 right-2.5 p-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
      >
        <Heart class="w-3.5 h-3.5" :class="{ 'fill-rose-500 text-rose-500': lineupStore.isFavorite(lineup.id) }" />
      </button>
    </div>

    <!-- CONTENT -->
    <div class="p-3.5 flex flex-col flex-grow gap-2">
      <h3 class="font-bold text-xs text-white group-hover:text-amber-400 transition-colors line-clamp-1">
        {{ lineup.title }}
      </h3>

      <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
        <span class="truncate max-w-[90px]">{{ lineup.startLocation }}</span>
        <ArrowRight class="w-3 h-3 text-slate-600 flex-shrink-0" />
        <span class="truncate max-w-[90px] text-slate-300 font-medium">{{ lineup.endLocation }}</span>
      </div>

      <div class="flex items-center justify-between pt-2 mt-auto border-t border-slate-800 text-[10px]">
        <span class="font-mono uppercase font-bold text-amber-400">
          {{ lineup.throwType.replace('_', ' ') }}
        </span>
        <span class="text-slate-400 font-medium">
          Site {{ lineup.site || 'General' }}
        </span>
      </div>
    </div>
  </div>
</template>
