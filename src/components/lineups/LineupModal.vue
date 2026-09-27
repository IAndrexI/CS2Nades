<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import NadeIcon from '../common/NadeIcon.vue'
import VectorMapBlueprint from '../map/VectorMapBlueprint.vue'
import { trajectoryPath, pctToSvg } from '../../utils/radarCoords'
import { 
  X, 
  Heart, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Play, 
  Terminal, 
  CheckCircle2,
  AlertCircle,
  Globe,
  Crosshair,
  MapPin,
  Sparkles,
  Eye,
  Maximize2,
  Layers
} from 'lucide-vue-next'
import { useConfirmDialog } from '../../composables/useConfirmDialog'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const lineup = computed(() => lineupStore.activeLineup)
const targetMap = computed(() => {
  if (!lineup.value) return mapStore.currentMap
  return mapStore.availableMaps.find(m => m.id === lineup.value?.mapId) || mapStore.currentMap
})

const copiedCommand = ref(false)
const activeMediaTab = ref<'aim' | 'standing' | 'landing' | 'radar' | 'video'>('aim')
const isLightboxOpen = ref(false)
const lightboxImageUrl = ref<string | null>(null)

// Reset active media tab on lineup change
watch(lineup, (newLineup) => {
  if (newLineup) {
    activeMediaTab.value = 'aim'
  }
})

function copyConsole() {
  if (!lineup.value?.consoleCommand) return
  navigator.clipboard.writeText(lineup.value.consoleCommand)
  copiedCommand.value = true
  setTimeout(() => {
    copiedCommand.value = false
  }, 2000)
}

function openLightbox(url?: string) {
  if (url) {
    lightboxImageUrl.value = url
    isLightboxOpen.value = true
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isLightboxOpen.value) {
      isLightboxOpen.value = false
    } else {
      lineupStore.closeLineup()
    }
  }
}

const { confirmAction } = useConfirmDialog()

async function handleDelete() {
  if (!lineup.value) return
  const ok = await confirmAction({
    title: 'Delete Lineup?',
    message: `Are you sure you want to delete "${lineup.value.title}"? This action cannot be undone.`,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    lineupStore.deleteLineup(lineup.value.id)
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
      v-if="lineup"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="lineupStore.closeLineup()"
    >
      <div class="relative w-full max-w-4xl max-h-[92vh] my-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        <!-- HEADER -->
        <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-inner">
              <NadeIcon :type="lineup.grenadeType" :size="24" :filled="true" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-base sm:text-lg font-black tracking-tight text-white">{{ lineup.title }}</h2>
                <span 
                  :class="[
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                    lineup.side === 't' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  ]"
                >
                  {{ lineup.side === 't' ? 'T SIDE' : lineup.side === 'ct' ? 'CT SIDE' : 'BOTH SIDES' }}
                </span>
                <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  {{ lineup.tickrate === 'cs2_subtick' ? 'CS2 SUBTICK' : lineup.tickrate }}
                </span>
                <a 
                  v-if="lineup.sourceWebsite" 
                  :href="lineup.sourceUrl || '#'" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold transition-colors"
                  :title="`Curated from ${lineup.sourceWebsite}`"
                >
                  <Globe class="w-2.5 h-2.5" />
                  <span>{{ lineup.sourceWebsite }}</span>
                  <ExternalLink v-if="lineup.sourceUrl" class="w-2.5 h-2.5 opacity-70" />
                </a>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                From <span class="text-slate-200 font-semibold">{{ lineup.startLocation }}</span> to <span class="text-slate-200 font-semibold">{{ lineup.endLocation }}</span>
                <span v-if="lineup.site" class="text-amber-400 font-bold ml-1">({{ lineup.site }} Site)</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- SHARE TO LIBRARY BUTTON -->
            <button
              v-if="lineup.isCustom"
              @click="lineupStore.toggleShareToLibrary(lineup.id)"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                lineup.inLibrary || lineup.isTeamShared
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
              ]"
              :title="lineup.inLibrary || lineup.isTeamShared ? 'Lineup is in Shared Library' : 'Add Lineup to Library'"
            >
              <Globe class="w-3.5 h-3.5" />
              <span>{{ lineup.inLibrary || lineup.isTeamShared ? 'In Library' : 'Add to Library' }}</span>
            </button>

            <!-- FAVORITE BUTTON -->
            <button 
              @click="lineupStore.toggleFavorite(lineup.id)"
              class="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              :title="lineupStore.isFavorite(lineup.id) ? 'Remove from favorites' : 'Add to favorites'"
            >
              <Heart 
                class="w-5 h-5" 
                :class="{ 'fill-rose-500 text-rose-500': lineupStore.isFavorite(lineup.id) }" 
              />
            </button>

            <!-- DELETE IF CUSTOM -->
            <template v-if="lineup.isCustom">
              <button 
                @click="handleDelete"
                class="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Delete Lineup"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </template>

            <!-- CLOSE BUTTON -->
            <button 
              @click="lineupStore.closeLineup()"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- BODY (SCROLLABLE) -->
        <div class="flex-grow overflow-y-auto p-5 sm:p-6 flex flex-col lg:flex-row gap-6">
          
          <!-- LEFT COLUMN: SCREENSHOTS GALLERY & MEDIA -->
          <div class="w-full lg:w-7/12 flex flex-col gap-3">
            
            <!-- MEDIA SUB-TABS SELECTOR -->
            <div class="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none w-full text-xs font-bold">
              
              <!-- AIM / CROSSHAIR TAB -->
              <button 
                @click="activeMediaTab = 'aim'"
                :class="[
                  'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
                  activeMediaTab === 'aim' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
                ]"
              >
                <Crosshair class="w-3.5 h-3.5" />
                <span>Aim Spot</span>
              </button>

              <!-- STANDING SPOT TAB -->
              <button 
                v-if="lineup.standingScreenshot"
                @click="activeMediaTab = 'standing'"
                :class="[
                  'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
                  activeMediaTab === 'standing' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
                ]"
              >
                <MapPin class="w-3.5 h-3.5" />
                <span>Standing Spot</span>
              </button>

              <!-- LANDING SPOT TAB -->
              <button 
                v-if="lineup.landingScreenshot"
                @click="activeMediaTab = 'landing'"
                :class="[
                  'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
                  activeMediaTab === 'landing' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
                ]"
              >
                <Sparkles class="w-3.5 h-3.5" />
                <span>Landing Result</span>
              </button>

              <!-- RADAR & LANDING SPOT TAB -->
              <button 
                @click="activeMediaTab = 'radar'"
                :class="[
                  'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
                  activeMediaTab === 'radar' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
                ]"
              >
                <Layers class="w-3.5 h-3.5" />
                <span>Radar & Landing</span>
              </button>

              <!-- VIDEO PLAYBACK TAB -->
              <button 
                v-if="lineup.videoUrl"
                @click="activeMediaTab = 'video'"
                :class="[
                  'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
                  activeMediaTab === 'video' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-slate-200'
                ]"
              >
                <Play class="w-3.5 h-3.5 fill-current" />
                <span>Video</span>
              </button>
            </div>

            <!-- MEDIA CONTAINER -->
            <div class="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center group">
              
              <!-- VIDEO PLAYER -->
              <iframe 
                v-if="activeMediaTab === 'video' && lineup.videoUrl"
                :src="lineup.videoUrl" 
                class="w-full h-full border-0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
              ></iframe>

              <!-- RADAR & LANDING SPOT VIEW -->
              <div 
                v-else-if="activeMediaTab === 'radar'"
                class="w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden"
              >
                <svg 
                  class="w-full h-full object-contain"
                  :viewBox="targetMap?.viewBox || '0 0 1000 1000'"
                >
                  <VectorMapBlueprint :mapInfo="targetMap || mapStore.currentMap" />
                  
                  <!-- TRAJECTORY ARC -->
                  <path 
                    :d="trajectoryPath(lineup.originCoords, lineup.landingCoords, targetMap?.viewBox || '0 0 1000 1000', lineup.curveOffset || 0)"
                    fill="none"
                    stroke="#000000"
                    stroke-width="7"
                    stroke-linecap="round"
                    opacity="0.6"
                  />
                  <path 
                    :d="trajectoryPath(lineup.originCoords, lineup.landingCoords, targetMap?.viewBox || '0 0 1000 1000', lineup.curveOffset || 0)"
                    fill="none"
                    :stroke="lineup.grenadeType === 'smoke' ? '#94a3b8' : lineup.grenadeType === 'flash' ? '#eab308' : lineup.grenadeType === 'molotov' ? '#ef4444' : '#22c55e'"
                    stroke-width="3.5"
                    stroke-dasharray="6 4"
                    stroke-linecap="round"
                  />

                  <!-- PLAYER ORIGIN PIN -->
                  <circle 
                    :cx="pctToSvg(lineup.originCoords, targetMap?.viewBox || '0 0 1000 1000').x" 
                    :cy="pctToSvg(lineup.originCoords, targetMap?.viewBox || '0 0 1000 1000').y" 
                    r="14" 
                    fill="#38bdf8" 
                    fill-opacity="0.3" 
                    stroke="#38bdf8" 
                    stroke-width="2" 
                  />
                  <circle 
                    :cx="pctToSvg(lineup.originCoords, targetMap?.viewBox || '0 0 1000 1000').x" 
                    :cy="pctToSvg(lineup.originCoords, targetMap?.viewBox || '0 0 1000 1000').y" 
                    r="6" 
                    fill="#38bdf8" 
                    stroke="#ffffff" 
                    stroke-width="2" 
                  />

                  <!-- GRENADE LANDING PIN -->
                  <circle 
                    :cx="pctToSvg(lineup.landingCoords, targetMap?.viewBox || '0 0 1000 1000').x" 
                    :cy="pctToSvg(lineup.landingCoords, targetMap?.viewBox || '0 0 1000 1000').y" 
                    r="24" 
                    fill="#ef4444" 
                    fill-opacity="0.25" 
                    stroke="#ef4444" 
                    stroke-width="2" 
                    class="animate-pulse"
                  />
                  <circle 
                    :cx="pctToSvg(lineup.landingCoords, targetMap?.viewBox || '0 0 1000 1000').x" 
                    :cy="pctToSvg(lineup.landingCoords, targetMap?.viewBox || '0 0 1000 1000').y" 
                    r="8" 
                    fill="#ef4444" 
                    stroke="#ffffff" 
                    stroke-width="2" 
                  />
                </svg>

                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3.5 flex items-end justify-between pointer-events-none">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[11px] font-bold text-emerald-300 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5">
                      <Sparkles class="w-3 h-3 text-emerald-400" />
                      <span>Landing Location: {{ lineup.endLocation }} ({{ lineup.landingCoords.x }}%, {{ lineup.landingCoords.y }}%)</span>
                    </span>
                    <span class="text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-md">
                      Origin: {{ lineup.startLocation }} ({{ lineup.originCoords.x }}%, {{ lineup.originCoords.y }}%)
                    </span>
                  </div>
                </div>
              </div>

              <!-- STANDING SCREENSHOT -->
              <div 
                v-else-if="activeMediaTab === 'standing' && lineup.standingScreenshot"
                class="w-full h-full cursor-zoom-in"
                @click="openLightbox(lineup.standingScreenshot)"
              >
                <img 
                  :src="lineup.standingScreenshot" 
                  alt="Standing Position"
                  class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5 pointer-events-none">
                  <span class="text-[11px] font-bold text-sky-300 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5">
                    <MapPin class="w-3 h-3 text-sky-400" />
                    <span>Standing / Feet Alignment Spot</span>
                  </span>
                  <span class="text-[10px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <Maximize2 class="w-3 h-3" /> Click to Zoom
                  </span>
                </div>
              </div>

              <!-- LANDING SCREENSHOT -->
              <div 
                v-else-if="activeMediaTab === 'landing' && lineup.landingScreenshot"
                class="w-full h-full cursor-zoom-in"
                @click="openLightbox(lineup.landingScreenshot)"
              >
                <img 
                  :src="lineup.landingScreenshot" 
                  alt="Landing Result"
                  class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5 pointer-events-none">
                  <span class="text-[11px] font-bold text-rose-300 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5">
                    <Sparkles class="w-3 h-3 text-rose-400" />
                    <span>Grenade Detonation & Bloom Spread</span>
                  </span>
                  <span class="text-[10px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <Maximize2 class="w-3 h-3" /> Click to Zoom
                  </span>
                </div>
              </div>

              <!-- AIM / CROSSHAIR (DEFAULT) -->
              <div 
                v-else
                class="w-full h-full cursor-zoom-in"
                @click="openLightbox(lineup.aimScreenshot || lineup.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80')"
              >
                <img 
                  :src="lineup.aimScreenshot || lineup.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'" 
                  :alt="lineup.title"
                  class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5 pointer-events-none">
                  <span class="text-[11px] font-bold text-amber-300 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1.5">
                    <Crosshair class="w-3 h-3 text-amber-400" />
                    <span>Crosshair Aim Alignment</span>
                  </span>
                  <span class="text-[10px] text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <Maximize2 class="w-3 h-3" /> Click to Zoom
                  </span>
                </div>
              </div>

            </div>

            <!-- THROW TECHNIQUE & DIFFICULTY BADGES -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col gap-1">
                <span class="text-slate-400 font-medium text-[11px]">Throw Technique:</span>
                <span class="text-amber-400 font-bold uppercase tracking-wider text-xs">
                  {{ lineup.throwType.replace('_', ' ') }}
                </span>
              </div>
              <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col gap-1">
                <span class="text-slate-400 font-medium text-[11px]">Execution Difficulty:</span>
                <span 
                  :class="[
                    'font-bold uppercase tracking-wider text-xs',
                    lineup.difficulty === 'easy' ? 'text-emerald-400' : lineup.difficulty === 'medium' ? 'text-amber-400' : 'text-rose-400'
                  ]"
                >
                  {{ lineup.difficulty }}
                </span>
              </div>
            </div>

            <!-- CS2 WORLD COORDINATES STATS (IF LOGGED) -->
            <div v-if="lineup.cs2Pos" class="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-[11px] text-slate-300 font-mono">
              <span>CS2 In-Game Coordinates:</span>
              <span class="text-emerald-400 font-bold">
                X: {{ lineup.cs2Pos.x.toFixed(1) }}, Y: {{ lineup.cs2Pos.y.toFixed(1) }}, Z: {{ lineup.cs2Pos.z.toFixed(1) }}
              </span>
            </div>

          </div>

          <!-- RIGHT COLUMN: STEP-BY-STEP INSTRUCTIONS & CONSOLE COMMAND -->
          <div class="w-full lg:w-5/12 flex flex-col gap-4">
            
            <!-- DESCRIPTION -->
            <div v-if="lineup.description" class="text-xs text-slate-300 leading-relaxed p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
              {{ lineup.description }}
            </div>

            <!-- STEP BY STEP INSTRUCTIONS -->
            <div class="flex flex-col gap-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Step-by-Step Instructions</h3>
              <div class="flex flex-col gap-2">
                <div 
                  v-for="(step, idx) in lineup.instructions" 
                  :key="idx"
                  class="flex items-start gap-3 p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-xs text-slate-200"
                >
                  <span class="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[11px] flex-shrink-0 mt-0.5">
                    {{ idx + 1 }}
                  </span>
                  <span class="leading-relaxed">{{ step }}</span>
                </div>
              </div>
            </div>

            <!-- PRACTICE CONSOLE COMMAND -->
            <div v-if="lineup.consoleCommand" class="flex flex-col gap-2.5 mt-auto p-4 bg-black/90 border-2 border-amber-500/40 rounded-2xl shadow-xl">
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Terminal class="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>CS2 Console Teleport & Aim Bind</span>
                </span>
                <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                  setpos_exact
                </span>
              </div>

              <!-- HIGH VISIBILITY CONSOLE TERMINAL BOX -->
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-slate-950 border border-slate-700/80 rounded-xl">
                <div class="flex items-center gap-2 flex-1 min-w-0 px-2 py-1">
                  <span class="text-emerald-400 font-mono font-black text-sm select-none">&gt;</span>
                  <span 
                    @click="copyConsole"
                    class="flex-1 font-mono text-xs sm:text-sm font-bold text-emerald-300 tracking-wide select-all truncate cursor-pointer hover:text-white transition-colors"
                    title="Click to copy console command"
                  >
                    {{ lineup.consoleCommand }}
                  </span>
                </div>

                <button 
                  @click="copyConsole"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                >
                  <Check v-if="copiedCommand" class="w-3.5 h-3.5 stroke-[3] text-slate-950" />
                  <Copy v-else class="w-3.5 h-3.5 stroke-[2.5]" />
                  <span class="tracking-wide">{{ copiedCommand ? 'COPIED!' : 'COPY' }}</span>
                </button>
              </div>

              <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>💡 Paste into CS2 console (<kbd class="px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">~</kbd>) to teleport and align your crosshair.</span>
              </div>
            </div>

            <!-- TAGS -->
            <div v-if="lineup.tags && lineup.tags.length" class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
              <span 
                v-for="tag in lineup.tags" 
                :key="tag"
                class="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold"
              >
                #{{ tag }}
              </span>
            </div>

          </div>

        </div>

      </div>

      <!-- LIGHTBOX FULLSCREEN PREVIEW -->
      <div 
        v-if="isLightboxOpen && lightboxImageUrl" 
        class="fixed inset-0 z-[100000] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
        @click="isLightboxOpen = false"
      >
        <div class="relative max-w-5xl max-h-[92vh]">
          <img :src="lightboxImageUrl" class="max-w-full max-h-[88vh] rounded-2xl shadow-2xl object-contain" />
          <button 
            @click="isLightboxOpen = false"
            class="absolute top-3 right-3 p-2.5 bg-slate-900/90 text-white rounded-full hover:bg-slate-800 cursor-pointer shadow-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>
  </Teleport>
</template>
