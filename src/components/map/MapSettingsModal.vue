<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import type { MapInfo } from '../../types'
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Check, 
  MapPin, 
  Sliders, 
  Layers,
  Sparkles
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const mapStore = useMapStore()

const activeTab = ref<'current' | 'add_map'>('current')
const selectedEditMapId = ref<string>(mapStore.currentMapId)
const customUrlInput = ref<string>('')
const uploadFeedback = ref<string | null>(null)

// Current map being inspected in settings
const activeEditMap = computed(() => {
  return mapStore.availableMaps.find(m => m.id === selectedEditMapId.value) || mapStore.currentMap
})

// New Custom Map Form
const newMapForm = reactive({
  id: '',
  name: '',
  code: '',
  radarImage: '',
  siteAX: 70,
  siteAY: 35,
  siteBX: 30,
  siteBY: 35,
  description: ''
})

// Handle local file upload
function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string
    mapStore.setCustomRadarImage(selectedEditMapId.value, dataUrl)
    uploadFeedback.value = `Custom radar applied for ${activeEditMap.value.name}!`
    setTimeout(() => { uploadFeedback.value = null }, 3000)
  }
  reader.readAsDataURL(file)
}

function applyCustomUrl() {
  if (!customUrlInput.value.trim()) return
  mapStore.setCustomRadarImage(selectedEditMapId.value, customUrlInput.value.trim())
  uploadFeedback.value = `Custom radar URL applied for ${activeEditMap.value.name}!`
  customUrlInput.value = ''
  setTimeout(() => { uploadFeedback.value = null }, 3000)
}

function handleResetDefault() {
  mapStore.resetCustomRadarImage(selectedEditMapId.value)
  uploadFeedback.value = `Reset to official CS2 radar for ${activeEditMap.value.name}.`
  setTimeout(() => { uploadFeedback.value = null }, 3000)
}

// Handle adding a brand new custom map
function handleCreateCustomMap() {
  if (!newMapForm.name.trim() || !newMapForm.radarImage) {
    alert('Please provide a Map Name and upload or paste a Radar Image.')
    return
  }

  const generatedId = newMapForm.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const newMap: MapInfo = {
    id: generatedId,
    name: newMapForm.name,
    code: newMapForm.code || `de_${generatedId}`,
    activePool: false,
    radarImage: newMapForm.radarImage,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: Number(newMapForm.siteAX), y: Number(newMapForm.siteAY) },
      b: { x: Number(newMapForm.siteBX), y: Number(newMapForm.siteBY) }
    },
    callouts: [
      { id: 'site_a', name: 'A Site', site: 'A', coords: { x: Number(newMapForm.siteAX), y: Number(newMapForm.siteAY) } },
      { id: 'site_b', name: 'B Site', site: 'B', coords: { x: Number(newMapForm.siteBX), y: Number(newMapForm.siteBY) } }
    ],
    description: newMapForm.description || 'Custom user map.',
    thumbnail: newMapForm.radarImage,
    isCustom: true
  }

  mapStore.addCustomMap(newMap)
  selectedEditMapId.value = newMap.id
  activeTab.value = 'current'
  uploadFeedback.value = `Custom map "${newMap.name}" created and loaded!`
}

function handleNewMapFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    newMapForm.radarImage = event.target?.result as string
  }
  reader.readAsDataURL(file)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="relative w-full max-w-4xl h-[85vh] max-h-[88vh] my-auto bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <!-- HEADER -->
        <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md shrink-0">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
              <Layers class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-black tracking-tight text-white uppercase">Map & Callout Settings</h2>
              <p class="text-xs text-slate-400">Select map on left to configure custom callouts, radar textures, and opacity</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="activeTab = activeTab === 'add_map' ? 'current' : 'add_map'"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>{{ activeTab === 'add_map' ? 'Back to Maps' : 'Add Custom Map' }}</span>
            </button>
            <button 
              @click="emit('close')"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- MAIN CONTENT WITH LEFT MAPS SIDEBAR -->
        <div class="flex-grow flex flex-col sm:flex-row overflow-hidden">
          <!-- LEFT SIDEBAR: MAP SELECTION LIST -->
          <div class="w-full sm:w-56 bg-slate-950/90 border-r border-slate-800 flex flex-col p-3 gap-1 overflow-y-auto shrink-0">
            <span class="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2 py-1">Select CS2 Map</span>
            <button
              v-for="map in mapStore.availableMaps"
              :key="map.id"
              @click="selectedEditMapId = map.id; if (activeTab === 'add_map') activeTab = 'current'"
              :class="[
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group',
                selectedEditMapId === map.id && activeTab !== 'add_map'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              ]"
            >
              <img 
                v-if="map.icon" 
                :src="map.icon" 
                :alt="map.name" 
                class="w-4 h-4 object-contain shrink-0 group-hover:scale-110 transition-transform"
              />
              <span v-else class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span class="truncate uppercase font-mono">{{ map.name }}</span>
            </button>
          </div>

          <!-- RIGHT CONTENT: MAP CONFIGURATION & CALLOUTS -->
          <div class="flex-grow p-5 overflow-y-auto flex flex-col gap-5 text-xs">
            <div 
              v-if="uploadFeedback" 
              class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2 font-medium animate-fade-in shrink-0"
            >
              <Check class="w-4 h-4" />
              <span>{{ uploadFeedback }}</span>
            </div>

            <!-- TAB 1: MANAGE SELECTED MAP -->
            <template v-if="activeTab === 'current'">
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-black uppercase text-white tracking-wide">{{ activeEditMap.name }} Overview</h3>
                  <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase font-bold">{{ activeEditMap.code }}</span>
                </div>
                <button
                  v-if="mapStore.customRadarImages[activeEditMap.id]"
                  @click="handleResetDefault"
                  class="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 font-semibold cursor-pointer"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>Reset Default Radar</span>
                </button>
              </div>

              <!-- RADAR PREVIEW & OVERLAY TEXTURE -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- PREVIEW BOX -->
                <div class="flex flex-col gap-2">
                  <span class="font-bold text-slate-300 uppercase text-[10px]">Active Radar Texture</span>
                  <div class="relative aspect-square w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    <img 
                      :src="mapStore.customRadarImages[activeEditMap.id] || activeEditMap.radarImage" 
                      :alt="activeEditMap.name"
                      class="w-full h-full object-contain p-2"
                    />
                  </div>
                </div>

                <!-- UPLOAD / REPLACE CONTROLS -->
                <div class="flex flex-col gap-3 justify-center">
                  <span class="font-bold text-slate-300 uppercase text-[10px]">Custom Radar Image</span>
                  <p class="text-slate-400 text-[11px]">
                    Upload a custom high-resolution CS2 radar or simple radar style overlay for this map.
                  </p>

                  <label class="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl bg-slate-950/60 cursor-pointer transition-colors group">
                    <Upload class="w-6 h-6 text-slate-500 group-hover:text-amber-400 mb-1 transition-colors" />
                    <span class="font-bold text-slate-300 group-hover:text-white text-xs">Browse local image file</span>
                    <span class="text-[10px] text-slate-500 mt-0.5">PNG, JPG or WebP (1024x1024 recommended)</span>
                    <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
                  </label>

                  <div class="flex items-center gap-2">
                    <input
                      v-model="customUrlInput"
                      type="url"
                      placeholder="Or paste direct image URL..."
                      class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      @click="applyCustomUrl"
                      :disabled="!customUrlInput.trim()"
                      class="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-400 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              <!-- CALLOUTS PREVIEW / LIST -->
              <div class="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-300 uppercase text-[10px]">Active Callouts ({{ activeEditMap.callouts?.length || 0 }})</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                  <div
                    v-for="callout in activeEditMap.callouts"
                    :key="callout.id"
                    class="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl"
                  >
                    <span class="font-medium text-slate-300 truncate text-[11px]">{{ callout.name }}</span>
                    <span v-if="callout.site" class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">{{ callout.site }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- TAB 2: CREATE BRAND NEW MAP -->
            <template v-else-if="activeTab === 'add_map'">
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 class="text-sm font-black uppercase text-white tracking-wide">Add Custom CS2 Map</h3>
                <span class="text-[11px] text-slate-400">Add custom workshop maps or custom tactical overviews</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Map Name *</label>
                  <input
                    v-model="newMapForm.name"
                    type="text"
                    placeholder="e.g., Tuscan, Season, Cache II"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Map Code</label>
                  <input
                    v-model="newMapForm.code"
                    type="text"
                    placeholder="e.g., de_tuscan"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Radar Image *</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="newMapForm.radarImage"
                    type="text"
                    placeholder="Image URL or upload below..."
                    class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <label class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs cursor-pointer border border-slate-700">
                    <Upload class="w-3.5 h-3.5 inline mr-1" />
                    Upload
                    <input type="file" accept="image/*" class="hidden" @change="handleNewMapFileUpload" />
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
                <textarea
                  v-model="newMapForm.description"
                  rows="2"
                  placeholder="Optional brief notes or layout info..."
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  @click="activeTab = 'current'"
                  class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  @click="handleCreateCustomMap"
                  :disabled="!newMapForm.name.trim() || !newMapForm.radarImage"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
                >
                  Create & Load Map
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
