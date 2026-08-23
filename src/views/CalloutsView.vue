<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapStore, type CalloutItem } from '../stores/mapStore'
import VectorMapBlueprint from '../components/map/VectorMapBlueprint.vue'
import { 
  Layers, 
  Plus, 
  Search, 
  Trash2, 
  MapPin, 
  Check, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Crosshair,
  RotateCcw
} from 'lucide-vue-next'

const mapStore = useMapStore()

const searchQuery = ref('')
const isAddingCallout = ref(false)
const newCalloutCoords = ref<{ x: number; y: number } | null>(null)
const newCalloutName = ref('')
const newCalloutSite = ref('Mid')

const svgElement = ref<SVGSVGElement | null>(null)
const mapContainer = ref<HTMLDivElement | null>(null)

const filteredCallouts = computed(() => {
  const all = mapStore.currentMapCallouts
  if (!searchQuery.value.trim()) return all
  const q = searchQuery.value.toLowerCase().trim()
  return all.filter(c => c.name.toLowerCase().includes(q) || (c.site && c.site.toLowerCase().includes(q)))
})

// Coordinate calculation using direct SVG bounding box (100% precision)
function handleMapClick(e: MouseEvent) {
  if (!isAddingCallout.value || !svgElement.value) return
  const rect = svgElement.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const rawX = ((e.clientX - rect.left) / rect.width) * 100
  const rawY = ((e.clientY - rect.top) / rect.height) * 100
  
  const pctX = Math.round(Math.min(Math.max(rawX, 0), 100) * 10) / 10
  const pctY = Math.round(Math.min(Math.max(rawY, 0), 100) * 10) / 10

  newCalloutCoords.value = { x: pctX, y: pctY }
}

function handleSaveCallout() {
  if (!newCalloutName.value.trim() || !newCalloutCoords.value) return
  mapStore.addCustomCallout(mapStore.currentMapId, {
    name: newCalloutName.value.trim(),
    site: newCalloutSite.value,
    coords: newCalloutCoords.value
  })

  newCalloutName.value = ''
  newCalloutCoords.value = null
  isAddingCallout.value = false
}

function handleCancelAdd() {
  isAddingCallout.value = false
  newCalloutCoords.value = null
  newCalloutName.value = ''
}

function handleDeleteCallout(id: string) {
  if (confirm('Delete this callout?')) {
    mapStore.deleteCustomCallout(mapStore.currentMapId, id)
  }
}

function handleClearAll() {
  if (confirm(`Clear all callouts for ${mapStore.currentMap.name}?`)) {
    mapStore.clearCustomCallouts(mapStore.currentMapId)
  }
}
</script>

<template>
  <div class="callouts-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-xl">
          <Layers class="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">Custom Callouts Editor</h1>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-sky-400 text-xs font-mono font-bold">
              {{ mapStore.currentMap.name }} ({{ filteredCallouts.length }} Callouts)
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Click anywhere on the radar map to drop custom team spot callout pins
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- MAP SELECTOR -->
        <select 
          :value="mapStore.currentMapId"
          @change="mapStore.setMap(($event.target as HTMLSelectElement).value)"
          class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 font-bold text-xs focus:outline-none focus:border-sky-500 cursor-pointer uppercase font-mono"
        >
          <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
            {{ map.name }}
          </option>
        </select>

        <!-- CLEAR ALL BUTTON -->
        <button
          v-if="filteredCallouts.length > 0"
          @click="handleClearAll"
          class="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          title="Clear all callouts for this map"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        <!-- ADD CALLOUT BUTTON -->
        <button
          @click="isAddingCallout = !isAddingCallout"
          :class="[
            'flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer',
            isAddingCallout 
              ? 'bg-rose-500 text-white' 
              : 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 text-slate-950 font-black'
          ]"
        >
          <Plus v-if="!isAddingCallout" class="w-4 h-4 stroke-[3]" />
          <X v-else class="w-4 h-4" />
          <span>{{ isAddingCallout ? 'Cancel' : 'Add Callout' }}</span>
        </button>
      </div>
    </div>

    <!-- MAIN CALLOUTS LAYOUT: MAP (LEFT) | CALLOUTS DIRECTORY (RIGHT) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- LEFT 2 COLS: RADAR MAP WITH CALLOUTS PINNED -->
      <div class="lg:col-span-2 flex flex-col gap-3">
        <div 
          ref="mapContainer"
          class="relative w-full h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none"
          :class="[isAddingCallout ? 'cursor-crosshair' : 'cursor-default']"
          @click="handleMapClick"
        >
          <svg 
            ref="svgElement"
            viewBox="0 0 1000 1000" 
            class="w-full h-full max-w-[960px] max-h-[960px] drop-shadow-[0_0_24px_rgba(0,0,0,0.8)]"
          >
            <!-- BASE MAP (Radar Texture) -->
            <VectorMapBlueprint 
              :map-info="mapStore.currentMap" 
              :show-callouts="false" 
            />

            <!-- CALLOUTS OVERLAY LAYER -->
            <g class="callouts-pins-layer">
              <g 
                v-for="callout in filteredCallouts" 
                :key="callout.id" 
                :transform="`translate(${callout.coords.x * 10}, ${callout.coords.y * 10})`"
                class="transition-transform duration-150 hover:scale-125"
              >
                <!-- Marker Dot -->
                <circle cx="0" cy="0" r="4" fill="#38bdf8" stroke="#0f172a" stroke-width="1.5" />

                <!-- Callout Badge -->
                <rect 
                  :x="-(callout.name.length * 4)" 
                  y="-22" 
                  :width="callout.name.length * 8" 
                  height="16" 
                  rx="4" 
                  fill="#0a0f18" 
                  fill-opacity="0.9"
                  stroke="#38bdf8"
                  stroke-width="1"
                  stroke-opacity="0.6"
                />

                <text 
                  x="0" 
                  y="-11" 
                  font-size="10" 
                  font-weight="900" 
                  text-anchor="middle" 
                  fill="#f0f9ff"
                  class="tracking-wider uppercase font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none"
                >
                  {{ callout.name }}
                </text>
              </g>
            </g>

            <!-- TEMPORARY NEW CALLOUT PIN (IF CLICKED) -->
            <g v-if="newCalloutCoords" :transform="`translate(${newCalloutCoords.x * 10}, ${newCalloutCoords.y * 10})`">
              <circle cx="0" cy="0" r="16" fill="#38bdf8" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2" class="animate-pulse" />
              <circle cx="0" cy="0" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
            </g>
          </svg>

          <!-- ADD CALLOUT HUD INSTRUCTION -->
          <div 
            v-if="isAddingCallout && !newCalloutCoords"
            class="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 bg-sky-500 text-slate-950 rounded-xl shadow-xl font-bold text-xs animate-bounce"
          >
            <Crosshair class="w-4 h-4 animate-spin" />
            <span>Click anywhere on the radar map to place the callout location</span>
          </div>
        </div>

        <!-- NEW CALLOUT FORM MODAL / DRAWER -->
        <div 
          v-if="newCalloutCoords"
          class="p-4 bg-slate-900 border border-sky-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl"
        >
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <div class="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <MapPin class="w-4 h-4" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold text-white">Callout Position: {{ newCalloutCoords.x }}%, {{ newCalloutCoords.y }}%</span>
              <span class="text-[10px] text-slate-400">Enter callout name and zone</span>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input 
              v-model="newCalloutName"
              type="text" 
              placeholder="Callout Name (e.g. Quad, Tetris, Ninja)"
              class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 flex-grow sm:w-56"
            />
            <select 
              v-model="newCalloutSite"
              class="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="A">A Site</option>
              <option value="B">B Site</option>
              <option value="Mid">Mid</option>
              <option value="Spawn">Spawn</option>
            </select>
            <button
              @click="handleSaveCallout"
              class="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Save
            </button>
            <button
              @click="handleCancelAdd"
              class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT 1 COL: CALLOUT DIRECTORY LIST -->
      <div class="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-4 shadow-xl h-[620px]">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black uppercase tracking-wider text-white">
            Callout Directory
          </span>
          <span class="text-[10px] text-slate-400 font-mono">{{ filteredCallouts.length }} spots</span>
        </div>

        <!-- SEARCH -->
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search spot name..."
            class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500 placeholder-slate-500"
          />
        </div>

        <!-- CALLOUTS LIST -->
        <div class="flex-grow overflow-y-auto flex flex-col gap-1.5 pr-1 text-xs">
          <div 
            v-if="filteredCallouts.length === 0" 
            class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500"
          >
            <Layers class="w-8 h-8 stroke-[1.5] mb-2 text-slate-600" />
            <p class="font-bold text-xs text-slate-400">No Callouts Added Yet</p>
            <p class="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Click "Add Callout" and click on the radar to drop your team's custom spots.
            </p>
          </div>

          <div 
            v-for="callout in filteredCallouts" 
            :key="callout.id"
            class="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-850 border border-slate-800/80 rounded-xl transition-colors"
          >
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-sky-400"></span>
              <span class="font-bold text-slate-200">{{ callout.name }}</span>
            </div>

            <div class="flex items-center gap-2">
              <span 
                v-if="callout.site"
                class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px] font-bold"
              >
                {{ callout.site }}
              </span>

              <button
                @click="handleDeleteCallout(callout.id)"
                class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                title="Delete callout"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
