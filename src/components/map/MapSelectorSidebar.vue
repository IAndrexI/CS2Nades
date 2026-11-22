<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import { Trophy, Plus } from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()

const poolFilter = ref<'all' | 'premier' | 'reserve'>('premier')

const ACTIVE_DUTY_IDS = new Set(['mirage', 'dust2', 'inferno', 'nuke', 'ancient', 'anubis', 'cache'])

function isMapActiveDuty(m: typeof mapStore.availableMaps[number]): boolean {
  if (m.id === 'train') return false
  return Boolean(m.activePool || ACTIVE_DUTY_IDS.has(m.id))
}

function getMapLineupCount(mapId: string) {
  return lineupStore.allLineups.filter(l => l.mapId === mapId).length
}

const filteredMaps = computed(() => {
  if (poolFilter.value === 'premier') {
    return mapStore.availableMaps.filter(m => isMapActiveDuty(m))
  }
  if (poolFilter.value === 'reserve') {
    return mapStore.availableMaps.filter(m => !isMapActiveDuty(m))
  }
  return mapStore.availableMaps
})

const props = defineProps<{
  customHandler?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', mapId: string): void
}>()

function handleSelectMap(mapId: string) {
  emit('select', mapId)
  if (!props.customHandler) {
    mapStore.setMap(mapId)
  }
}

const activeCount = computed(() => mapStore.availableMaps.filter(m => isMapActiveDuty(m)).length)
const reserveCount = computed(() => mapStore.availableMaps.filter(m => !isMapActiveDuty(m)).length)
</script>

<template>
  <aside class="map-selector-sidebar flex flex-col gap-3 w-full">
    <!-- SIDEBAR HEADER WITH APPLE-STYLE PILL TABS -->
    <div class="flex flex-col gap-2.5 p-3 bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-lg">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <Trophy class="w-3.5 h-3.5 text-amber-400" />
          <span class="text-xs font-semibold text-white tracking-tight">Map Pool</span>
        </div>
        <span class="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 text-[10px] font-mono font-medium">
          {{ mapStore.availableMaps.length }} Maps
        </span>
      </div>

      <!-- SEGMENTED PILL TABS -->
      <div class="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/[0.07] text-[11px] font-medium">
        <button
          @click="poolFilter = 'premier'"
          title="Active Duty / Premier Map Pool"
          :class="[
            'py-1.5 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap',
            poolFilter === 'premier'
              ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <span>Active</span>
          <span class="text-[10px] opacity-75 font-mono">({{ activeCount }})</span>
        </button>
        <button
          @click="poolFilter = 'reserve'"
          title="Reserve Pool & Classic Competitive Maps"
          :class="[
            'py-1.5 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap',
            poolFilter === 'reserve'
              ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <span>Reserve</span>
          <span class="text-[10px] opacity-75 font-mono">({{ reserveCount }})</span>
        </button>
        <button
          @click="poolFilter = 'all'"
          title="All CS2 Maps (Active Duty, Reserve & Classic)"
          :class="[
            'py-1.5 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap',
            poolFilter === 'all'
              ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <span>All</span>
          <span class="text-[10px] opacity-75 font-mono">({{ mapStore.availableMaps.length }})</span>
        </button>
      </div>
    </div>

    <!-- MAP CARDS: HORIZONTAL SCROLL ON MOBILE, VERTICAL STACK ON DESKTOP -->
    <div class="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto lg:max-h-[720px] pb-2 lg:pb-0 pr-1 custom-scrollbar select-none">
      <button
        v-for="map in filteredMaps"
        :key="map.id"
        @click="handleSelectMap(map.id)"
        :class="[
          'group relative flex-shrink-0 w-44 sm:w-48 lg:w-full rounded-2xl overflow-hidden border text-left transition-all duration-200 cursor-pointer',
          mapStore.currentMapId === map.id
            ? 'border-amber-500/80 ring-1 ring-amber-500/30 shadow-lg bg-slate-900'
            : 'border-white/[0.08] hover:border-white/[0.16] bg-slate-900/60 hover:bg-slate-900/90'
        ]"
      >
        <!-- THUMBNAIL / MINIMAP BACKGROUND -->
        <div class="relative h-20 sm:h-22 lg:h-24 w-full bg-slate-950 overflow-hidden">
          <img
            :src="map.thumbnail"
            :alt="map.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-55 group-hover:opacity-85"
            :class="{ 'opacity-90 scale-105': mapStore.currentMapId === map.id }"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent"></div>

          <!-- POOL BADGE (TOP RIGHT) -->
          <div class="absolute top-2 right-2 flex items-center gap-1.5">
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide backdrop-blur-md border',
                isMapActiveDuty(map)
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                  : map.poolCategory === 'Classic Competitive' || map.id === 'cobblestone'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/35'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/35'
              ]"
            >
              {{ isMapActiveDuty(map) ? 'Active' : (map.poolCategory === 'Classic Competitive' || map.id === 'cobblestone' ? 'Classic' : 'Reserve') }}
            </span>
          </div>

          <!-- LINEUP COUNT BADGE (TOP LEFT) -->
          <div class="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-slate-950/75 backdrop-blur-md rounded-full text-[10px] font-mono text-slate-300 font-medium border border-white/[0.08]">
            <span class="text-amber-400 font-semibold">{{ getMapLineupCount(map.id) }}</span>
            <span class="text-[9px] text-slate-400">nades</span>
          </div>

          <!-- MAP ICON + NAME & CODE (BOTTOM) -->
          <div class="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
            <div class="flex items-center gap-2">
              <div
                v-if="map.icon"
                class="w-7 h-7 rounded-xl bg-slate-950/70 border border-white/[0.12] p-0.5 flex-shrink-0 flex items-center justify-center backdrop-blur-md"
              >
                <img :src="map.icon" :alt="map.name" class="w-full h-full object-contain filter drop-shadow" />
              </div>

              <div>
                <h3
                  :class="[
                    'text-sm font-semibold tracking-tight leading-none transition-colors',
                    mapStore.currentMapId === map.id ? 'text-amber-400' : 'text-white group-hover:text-amber-300'
                  ]"
                >
                  {{ map.name }}
                </h3>
                <span class="text-[10px] font-mono text-slate-400">{{ map.code }}</span>
              </div>
            </div>

            <!-- ACTIVE INDICATOR DOT -->
            <div
              v-if="mapStore.currentMapId === map.id"
              class="w-2 h-2 rounded-full bg-amber-400"
            ></div>
          </div>
        </div>
      </button>

      <!-- CUSTOM MAP ADD BUTTON -->
      <button
        @click="mapStore.isMapSettingsOpen = true"
        class="flex-shrink-0 w-36 sm:w-40 lg:w-full h-20 sm:h-22 lg:h-12 rounded-2xl border border-dashed border-white/[0.12] hover:border-amber-500/50 hover:bg-white/[0.03] flex items-center justify-center gap-2 text-slate-400 hover:text-amber-400 text-xs font-medium transition-all cursor-pointer"
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
  background: rgba(15, 23, 42, 0.4);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.5);
}
</style>
