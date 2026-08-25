<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import NadeIcon from '../common/NadeIcon.vue'
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
  Globe
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const lineup = computed(() => lineupStore.activeLineup)

const copiedCommand = ref(false)
const activeTab = ref<'guide' | 'video'>('guide')

function copyConsole() {
  if (!lineup.value?.consoleCommand) return
  navigator.clipboard.writeText(lineup.value.consoleCommand)
  copiedCommand.value = true
  setTimeout(() => {
    copiedCommand.value = false
  }, 2000)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    lineupStore.closeLineup()
  }
}

function handleDelete() {
  if (!lineup.value) return
  if (confirm(`Delete lineup "${lineup.value.title}"?`)) {
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
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="lineupStore.closeLineup()"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] my-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-inner">
            <NadeIcon :type="lineup.grenadeType" :size="24" :filled="true" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-black tracking-tight text-white">{{ lineup.title }}</h2>
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
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              From <span class="text-slate-200 font-semibold">{{ lineup.startLocation }}</span> to <span class="text-slate-200 font-semibold">{{ lineup.endLocation }}</span>
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

          <!-- EDIT/DELETE IF CUSTOM -->
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
      <div class="flex-grow overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
        <!-- LEFT COLUMN: MEDIA (VIDEO / SCREENSHOTS) -->
        <div class="w-full lg:w-7/12 flex flex-col gap-4">
          <!-- MEDIA TABS -->
          <div class="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-fit">
            <button 
              @click="activeTab = 'guide'"
              :class="[
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'guide' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              Visual Guide
            </button>
            <button 
              v-if="lineup.videoUrl"
              @click="activeTab = 'video'"
              :class="[
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'video' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              <Play class="w-3.5 h-3.5 fill-current" />
              <span>Video Playback</span>
            </button>
          </div>

          <!-- VIDEO PLAYER -->
          <div 
            v-if="activeTab === 'video' && lineup.videoUrl"
            class="w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-xl"
          >
            <iframe 
              :src="lineup.videoUrl" 
              class="w-full h-full border-0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
            ></iframe>
          </div>

          <!-- ALIGNMENT SCREENSHOTS / GUIDE -->
          <div v-else class="flex flex-col gap-4">
            <div class="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center group">
              <img 
                :src="lineup.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'" 
                :alt="lineup.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <span class="text-xs font-semibold text-slate-200 bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md">
                  Crosshair Alignment & Throw Position
                </span>
              </div>
            </div>

            <!-- DUAL STANDING & AIM GUIDE PREVIEWS -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span class="text-slate-400 font-medium">Throw Technique:</span>
                <span class="text-amber-400 font-bold uppercase tracking-wider text-sm">
                  {{ lineup.throwType.replace('_', ' ') }}
                </span>
              </div>
              <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span class="text-slate-400 font-medium">Execution Difficulty:</span>
                <span 
                  :class="[
                    'font-bold uppercase tracking-wider text-sm',
                    lineup.difficulty === 'easy' ? 'text-emerald-400' : lineup.difficulty === 'medium' ? 'text-amber-400' : 'text-rose-400'
                  ]"
                >
                  {{ lineup.difficulty }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: STEP-BY-STEP INSTRUCTIONS & CONSOLE COMMAND -->
        <div class="w-full lg:w-5/12 flex flex-col gap-5">
          <!-- DESCRIPTION -->
          <div v-if="lineup.description" class="text-xs text-slate-300 leading-relaxed p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            {{ lineup.description }}
          </div>

          <!-- STEP BY STEP INSTRUCTIONS -->
          <div class="flex flex-col gap-2.5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Step-by-Step Instructions</h3>
            <div class="flex flex-col gap-2">
              <div 
                v-for="(step, idx) in lineup.instructions" 
                :key="idx"
                class="flex items-start gap-3 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-200"
              >
                <span class="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[11px] flex-shrink-0 mt-0.5">
                  {{ idx + 1 }}
                </span>
                <span class="leading-relaxed">{{ step }}</span>
              </div>
            </div>
          </div>

          <!-- PRACTICE CONSOLE COMMAND -->
          <div v-if="lineup.consoleCommand" class="flex flex-col gap-2 mt-auto">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Terminal class="w-3.5 h-3.5 text-amber-400" />
                <span>CS2 Practice Command</span>
              </span>
              <button 
                @click="copyConsole"
                class="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Check v-if="copiedCommand" class="w-3.5 h-3.5" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span>{{ copiedCommand ? 'Copied!' : 'Copy Bind' }}</span>
              </button>
            </div>
            <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto select-all">
              {{ lineup.consoleCommand }}
            </div>
          </div>

          <!-- TAGS -->
          <div v-if="lineup.tags && lineup.tags.length" class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
            <span 
              v-for="tag in lineup.tags" 
              :key="tag"
              class="px-2 py-0.5 bg-slate-800/80 text-slate-400 rounded text-[10px] font-medium"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</Teleport>
</template>
