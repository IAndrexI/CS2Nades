<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { DEFAULT_LINEUPS } from '../../data/defaultLineups'
import NadeIcon from '../common/NadeIcon.vue'
import type { Lineup, GrenadeType } from '../../types'
import { 
  X, 
  Globe, 
  Download, 
  Search, 
  Check, 
  Sparkles, 
  ExternalLink, 
  Layers, 
  ArrowRight,
  Filter,
  CheckCircle2,
  RefreshCw
} from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const lineupStore = useLineupStore()
const mapStore = useMapStore()

const searchQuery = ref('')
const selectedMap = ref<string>('all')
const selectedSource = ref<string>('all')
const selectedNadeType = ref<string>('all')
const isImporting = ref(false)
const importSuccessMessage = ref('')

const sources = [
  { id: 'all', name: 'All Popular Sources' },
  { id: 'CSNades.gg', name: 'CSNades.gg', desc: 'Interactive Radar Meta Lineups' },
  { id: 'NadeKing', name: 'NadeKing', desc: 'YouTube & Pro Precision Throws' },
  { id: 'CS2Lineups', name: 'CS2Lineups.com', desc: 'Subtick Jumpthrow Library' },
  { id: 'Pracc.com', name: 'Pracc.com Hub', desc: 'Scrim & Competitive Meta' },
  { id: 'Scope.gg', name: 'Scope.gg Guides', desc: 'Analytics & Tactical Setups' }
]

const nadeFilterOptions = [
  { id: 'all', label: 'All Nades' },
  { id: 'smoke', label: 'Smokes' },
  { id: 'flash', label: 'Flashes' },
  { id: 'molotov', label: 'Molotovs' },
  { id: 'he', label: 'HE Nades' }
]

const filteredPresets = computed(() => {
  return DEFAULT_LINEUPS.filter(lineup => {
    // Map filter
    if (selectedMap.value !== 'all' && lineup.mapId !== selectedMap.value) {
      return false
    }

    // Source filter
    if (selectedSource.value !== 'all' && lineup.sourceWebsite !== selectedSource.value) {
      return false
    }

    // Nade type filter
    if (selectedNadeType.value !== 'all' && lineup.grenadeType !== selectedNadeType.value) {
      return false
    }

    // Search query
    if (searchQuery.value.trim() !== '') {
      const q = searchQuery.value.toLowerCase()
      const matchTitle = lineup.title.toLowerCase().includes(q)
      const matchStart = lineup.startLocation.toLowerCase().includes(q)
      const matchEnd = lineup.endLocation.toLowerCase().includes(q)
      const matchMap = lineup.mapId.toLowerCase().includes(q)
      const matchTags = lineup.tags.some(t => t.toLowerCase().includes(q))
      if (!matchTitle && !matchStart && !matchEnd && !matchMap && !matchTags) {
        return false
      }
    }

    return true
  })
})

function isAlreadyInCustom(lineupId: string): boolean {
  return lineupStore.customLineups.some(l => l.id === lineupId || l.title === DEFAULT_LINEUPS.find(d => d.id === lineupId)?.title)
}

function importSingleLineup(lineup: Lineup) {
  if (isAlreadyInCustom(lineup.id)) return
  const toAdd = {
    ...lineup,
    id: `custom-${lineup.id}-${Date.now()}`,
    inLibrary: true,
    isTeamShared: true,
    isCustom: true
  }
  lineupStore.customLineups.push(toAdd)
  lineupStore.pushToServer(toAdd).catch(() => {})
  importSuccessMessage.value = `Imported "${lineup.title}" to your Squad Library!`
  setTimeout(() => {
    importSuccessMessage.value = ''
  }, 2500)
}

function importAllFiltered() {
  isImporting.value = true
  let count = 0
  filteredPresets.value.forEach(preset => {
    if (!isAlreadyInCustom(preset.id)) {
      const toAdd = {
        ...preset,
        id: `custom-${preset.id}-${Date.now()}`,
        inLibrary: true,
        isTeamShared: true,
        isCustom: true
      }
      lineupStore.customLineups.push(toAdd)
      lineupStore.pushToServer(toAdd).catch(() => {})
      count++
    }
  })
  isImporting.value = false
  importSuccessMessage.value = `Successfully imported ${count} lineups to your Squad Library!`
  setTimeout(() => {
    importSuccessMessage.value = ''
  }, 3000)
}

function selectPresetForInspection(preset: Lineup) {
  mapStore.setMap(preset.mapId)
  lineupStore.openLineup(preset)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        
        <!-- HEADER -->
        <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Globe class="w-6 h-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-black text-white tracking-tight">Popular CS2 Lineups & Meta Sources</h2>
                <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                  {{ DEFAULT_LINEUPS.length }} Curated
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Pulls verified lineups, jumps, and setpos coordinates from leading CS2 tactical websites.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="importAllFiltered"
              :disabled="filteredPresets.length === 0 || isImporting"
              class="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <Download class="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Import All ({{ filteredPresets.length }})</span>
            </button>

            <button 
              @click="emit('close')"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- SUCCESS ALERT -->
        <div v-if="importSuccessMessage" class="px-5 py-2.5 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 class="w-4 h-4 text-emerald-400" />
          <span>{{ importSuccessMessage }}</span>
        </div>

        <!-- FILTER TOOLBAR -->
        <div class="p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <!-- SOURCE WEBSITE BUTTONS -->
          <div class="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              v-for="src in sources"
              :key="src.id"
              @click="selectedSource = src.id"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border',
                selectedSource === src.id
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
              ]"
            >
              {{ src.name }}
            </button>
          </div>

          <!-- RIGHT CONTROLS: MAP, NADE TYPE, SEARCH -->
          <div class="flex flex-wrap items-center gap-2 flex-grow sm:flex-grow-0">
            <!-- MAP SELECTOR -->
            <select
              v-model="selectedMap"
              class="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">🗺️ All Maps</option>
              <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
                {{ map.name }}
              </option>
            </select>

            <!-- NADE TYPE SELECTOR -->
            <select
              v-model="selectedNadeType"
              class="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option v-for="opt in nadeFilterOptions" :key="opt.id" :value="opt.id">
                {{ opt.label }}
              </option>
            </select>

            <!-- SEARCH INPUT -->
            <div class="relative flex-grow sm:flex-grow-0">
              <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search preset or spot..."
                class="w-full sm:w-44 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        <!-- PRESETS GRID CONTAINER -->
        <div class="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div v-if="filteredPresets.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
            <Globe class="w-12 h-12 text-slate-600 mb-3" />
            <p class="text-sm font-bold text-slate-300">No popular lineups found</p>
            <p class="text-xs text-slate-500 mt-1">Try selecting a different source website or clearing your search filters.</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="lineup in filteredPresets"
              :key="lineup.id"
              class="group bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col"
            >
              <!-- TOP BANNER -->
              <div class="relative h-28 bg-slate-950 overflow-hidden flex items-center justify-center">
                <img 
                  :src="lineup.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'" 
                  :alt="lineup.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-70 group-hover:opacity-100"
                />

                <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/60"></div>

                <!-- NADE BADGE -->
                <div class="absolute top-2.5 left-2.5 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 shadow-md">
                  <NadeIcon :type="lineup.grenadeType" :size="16" :filled="true" />
                </div>

                <!-- MAP & SIDE BADGES -->
                <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded bg-slate-900/90 text-amber-400 border border-slate-800 text-[10px] font-bold uppercase backdrop-blur-md">
                    {{ lineup.mapId }}
                  </span>
                  <span 
                    :class="[
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase backdrop-blur-md',
                      lineup.side === 't' ? 'bg-amber-600/80 text-white' : 'bg-sky-600/80 text-white'
                    ]"
                  >
                    {{ lineup.side }}
                  </span>
                </div>

                <!-- SOURCE BADGE -->
                <div v-if="lineup.sourceWebsite" class="absolute bottom-2 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-slate-900/90 backdrop-blur-md rounded text-[10px] text-amber-300 font-bold border border-amber-500/20">
                  <Globe class="w-2.5 h-2.5" />
                  <span>{{ lineup.sourceWebsite }}</span>
                </div>
              </div>

              <!-- BODY -->
              <div class="p-3.5 flex flex-col flex-grow gap-2">
                <h3 class="font-bold text-xs text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {{ lineup.title }}
                </h3>

                <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span class="truncate max-w-[100px]">{{ lineup.startLocation }}</span>
                  <ArrowRight class="w-3 h-3 text-slate-600 flex-shrink-0" />
                  <span class="truncate max-w-[100px] text-slate-300 font-semibold">{{ lineup.endLocation }}</span>
                </div>

                <div class="flex items-center justify-between pt-2 mt-auto border-t border-slate-800/80 text-[10px]">
                  <span class="font-mono uppercase font-bold text-amber-400">
                    {{ lineup.throwType.replace('_', ' ') }}
                  </span>
                  
                  <div class="flex items-center gap-1.5">
                    <button
                      @click="selectPresetForInspection(lineup)"
                      class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-colors cursor-pointer"
                      title="Inspect lineup on radar"
                    >
                      View on Radar
                    </button>

                    <button
                      @click="importSingleLineup(lineup)"
                      :disabled="isAlreadyInCustom(lineup.id)"
                      :class="[
                        'px-2 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer',
                        isAlreadyInCustom(lineup.id)
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40'
                      ]"
                    >
                      <Check v-if="isAlreadyInCustom(lineup.id)" class="w-3 h-3" />
                      <Download v-else class="w-3 h-3" />
                      <span>{{ isAlreadyInCustom(lineup.id) ? 'Added' : 'Import' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div class="flex items-center gap-2">
            <span>Sources:</span>
            <span class="text-slate-300 font-semibold">CSNades.gg</span> •
            <span class="text-slate-300 font-semibold">NadeKing</span> •
            <span class="text-slate-300 font-semibold">CS2Lineups</span> •
            <span class="text-slate-300 font-semibold">Pracc.com</span> •
            <span class="text-slate-300 font-semibold">Scope.gg</span>
          </div>

          <div class="text-[11px] font-mono text-slate-500">
            CS2 Subtick Calibrated Coordinates
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
