<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import { Map, Shield, Layers, Plus } from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()

function getMapLineupCount(mapId: string) {
  return lineupStore.allLineups.filter(l => l.mapId === mapId).length
}
</script>

<template>
  <aside class="map-selector-sidebar flex flex-col gap-3 w-full">
    <!-- SIDEBAR HEADER -->
    <div class="flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl">
      <div class="flex items-center gap-2">
        <Map class="w-4 h-4 text-amber-400" />
        <span class="text-xs font-black uppercase text-white tracking-wider">Select Map</span>
      </div>
      <span class="px-2 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px] font-mono font-bold">
        {{ mapStore.availableMaps.length }} Maps
      </span>
    </div>

    <!-- MAP CARDS: HORIZONTAL SCROLL ON MOBILE, VERTICAL STACK ON DESKTOP -->
    <div class="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto lg:max-h-[720px] pb-2 lg:pb-0 pr-1 custom-scrollbar select-none">
      <button
        v-for="map in mapStore.availableMaps"
        :key="map.id"
        @click="mapStore.setMap(map.id)"
        :class="[
          'group relative flex-shrink-0 w-44 sm:w-48 lg:w-full rounded-xl overflow-hidden border text-left transition-all duration-200 cursor-pointer',
          mapStore.currentMapId === map.id
            ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-slate-850'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-850'
        ]"
      >
        <!-- THUMBNAIL BACKGROUND -->
        <div class="relative h-20 sm:h-22 lg:h-24 w-full bg-slate-950 overflow-hidden">
          <img
            :src="map.thumbnail"
            :alt="map.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60 group-hover:opacity-85"
            :class="{ 'opacity-90 scale-105': mapStore.currentMapId === map.id }"
          />
          <!-- DARK GRADIENT OVERLAY -->
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

          <!-- POOL BADGE (TOP RIGHT) -->
          <div class="absolute top-2 right-2">
            <span
              :class="[
                'px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wider backdrop-blur-md',
                map.activePool
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700'
              ]"
            >
              {{ map.activePool ? 'Active' : 'Reserve' }}
            </span>
          </div>

          <!-- LINEUP COUNT BADGE (TOP LEFT) -->
          <div class="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-md rounded text-[10px] font-mono text-slate-300 font-bold border border-slate-800">
            <span class="text-amber-400 font-black">{{ getMapLineupCount(map.id) }}</span>
            <span class="text-[9px] text-slate-400 uppercase">Nades</span>
          </div>

          <!-- MAP NAME & CODE (BOTTOM) -->
          <div class="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
            <div>
              <h3 
                :class="[
                  'text-sm font-black uppercase tracking-wide leading-none transition-colors',
                  mapStore.currentMapId === map.id ? 'text-amber-400' : 'text-white group-hover:text-amber-300'
                ]"
              >
                {{ map.name }}
              </h3>
              <span class="text-[10px] font-mono text-slate-400">{{ map.code }}</span>
            </div>

            <!-- ACTIVE INDICATOR DOT -->
            <div 
              v-if="mapStore.currentMapId === map.id"
              class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse"
            ></div>
          </div>
        </div>
      </button>

      <!-- CUSTOM MAP ADD BUTTON -->
      <button
        @click="mapStore.isMapSettingsOpen = true"
        class="flex-shrink-0 w-36 sm:w-40 lg:w-full h-20 sm:h-22 lg:h-16 rounded-xl border border-dashed border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/50 flex items-center justify-center gap-2 text-slate-400 hover:text-amber-400 text-xs font-bold transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Custom Map</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.4);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.6);
}
</style>
