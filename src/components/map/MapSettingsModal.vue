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
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="relative w-full max-w-2xl max-h-[85vh] my-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <!-- HEADER -->
      <div class="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Layers class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-black tracking-tight text-white">Map & Radar Overview Settings</h2>
            <p class="text-xs text-slate-400">Input custom radar images, calibrate opacity, or add custom workshop maps</p>
          </div>
        </div>

        <button 
          @click="emit('close')"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- TABS -->
      <div class="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/40">
        <button
          @click="activeTab = 'current'"
          :class="[
            'px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'current'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          ]"
        >
          Manage Existing Maps
        </button>
        <button
          @click="activeTab = 'add_map'"
          :class="[
            'flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'add_map'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          ]"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Add Custom Map</span>
        </button>
      </div>

      <!-- BODY -->
      <div class="flex-grow overflow-y-auto p-6 flex flex-col gap-5 text-xs">
        <!-- FEEDBACK ALERT -->
        <div 
          v-if="uploadFeedback" 
          class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2 font-medium animate-fade-in"
        >
          <Check class="w-4 h-4" />
          <span>{{ uploadFeedback }}</span>
        </div>

        <!-- TAB 1: MANAGE EXISTING MAPS -->
        <template v-if="activeTab === 'current'">
          <!-- MAP SELECTOR & OPACITY SLIDER -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
            <div class="flex flex-col gap-1.5">
              <label class="font-bold text-slate-300">Select Map to Customize:</label>
              <select 
                v-model="selectedEditMapId"
                class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
              >
                <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
                  {{ map.name }} ({{ map.code }}) {{ map.isCustom ? '[Custom]' : '' }}
                </option>
              </select>
            </div>

            <!-- OPACITY SLIDER -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between font-bold text-slate-300">
                <span>Radar Opacity / Brightness:</span>
                <span class="text-amber-400 font-mono">{{ Math.round(mapStore.radarOpacity * 100) }}%</span>
              </div>
              <input 
                v-model.number="mapStore.radarOpacity" 
                type="range" 
                min="0.2" 
                max="1.0" 
                step="0.05"
                class="w-full accent-amber-500 cursor-pointer mt-2"
              />
            </div>
          </div>

          <!-- RADAR PREVIEW & CURRENT SOURCE -->
          <div class="flex flex-col sm:flex-row gap-4 items-center p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div class="w-32 h-32 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-slate-800 relative">
              <img 
                :src="activeEditMap.radarImage" 
                :alt="activeEditMap.name" 
                class="w-full h-full object-cover"
              />
              <span class="absolute bottom-1 right-1 px-1.5 py-0.2 bg-black/80 rounded text-[9px] font-mono text-slate-300">
                1000x1000
              </span>
            </div>

            <div class="flex flex-col gap-2 flex-grow">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-sm">{{ activeEditMap.name }} Radar</span>
                <button
                  v-if="mapStore.customRadarImages[activeEditMap.id]"
                  @click="handleResetDefault"
                  class="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 font-semibold cursor-pointer"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>Restore Official CS2 Radar</span>
                </button>
              </div>

              <p class="text-slate-400 text-[11px] leading-relaxed">
                You can upload high-res official CS2 radar files, SimpleRadar PNGs, or your own team-annotated radar blueprints.
              </p>

              <!-- UPLOAD LOCAL FILE -->
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <label class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
                  <Upload class="w-4 h-4 stroke-[2.5]" />
                  <span>Upload Radar File (PNG / JPG / SVG)</span>
                  <input type="file" accept="image/*" @change="handleFileUpload" class="hidden" />
                </label>
              </div>
            </div>
          </div>

          <!-- PASTE IMAGE URL ALTERNATIVE -->
          <div class="flex flex-col gap-1.5 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
            <label class="font-bold text-slate-300">Or Paste Image URL / Local Path:</label>
            <div class="flex items-center gap-2">
              <input 
                v-model="customUrlInput" 
                type="text" 
                placeholder="https://... or /maps/custom_radar.png" 
                class="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              />
              <button 
                @click="applyCustomUrl"
                class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Apply URL
              </button>
            </div>
          </div>
        </template>

        <!-- TAB 2: ADD BRAND NEW CUSTOM MAP -->
        <template v-else>
          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Map Name *</label>
                <input 
                  v-model="newMapForm.name" 
                  type="text" 
                  placeholder="e.g. Thera / Basalt / Aim Map" 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Map Code</label>
                <input 
                  v-model="newMapForm.code" 
                  type="text" 
                  placeholder="e.g. de_thera" 
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <!-- RADAR FILE UPLOAD OR URL -->
            <div class="flex flex-col gap-1.5 p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <label class="font-bold text-slate-300">Radar Overview Image *</label>
              <div class="flex flex-wrap items-center gap-3">
                <label class="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs rounded-xl transition-colors cursor-pointer">
                  <Upload class="w-4 h-4" />
                  <span>Choose Radar Image File</span>
                  <input type="file" accept="image/*" @change="handleNewMapFileUpload" class="hidden" />
                </label>
                <span class="text-slate-500 text-[11px]">or paste link below:</span>
              </div>
              <input 
                v-model="newMapForm.radarImage" 
                type="text" 
                placeholder="https://... or data:image/..." 
                class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs mt-1"
              />
            </div>

            <!-- BOMB SITES A & B POSITIONING -->
            <div class="grid grid-cols-2 gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div class="flex flex-col gap-2">
                <span class="font-bold text-slate-300">A Site Coordinates (%):</span>
                <div class="flex gap-2">
                  <input v-model.number="newMapForm.siteAX" type="number" placeholder="X" class="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white" />
                  <input v-model.number="newMapForm.siteAY" type="number" placeholder="Y" class="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white" />
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <span class="font-bold text-slate-300">B Site Coordinates (%):</span>
                <div class="flex gap-2">
                  <input v-model.number="newMapForm.siteBX" type="number" placeholder="X" class="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white" />
                  <input v-model.number="newMapForm.siteBY" type="number" placeholder="Y" class="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white" />
                </div>
              </div>
            </div>

            <button
              @click="handleCreateCustomMap"
              class="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus class="w-4 h-4 stroke-[3]" />
              <span>Save & Load Custom Map</span>
            </button>
          </div>
        </template>
      </div>

      <!-- STICKY FOOTER -->
      <div class="sticky bottom-0 z-10 flex items-center justify-end gap-3 p-4 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md">
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
