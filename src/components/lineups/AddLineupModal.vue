<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useAuthStore } from '../../stores/authStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { GrenadeType, TeamSide, ThrowType, TickrateType } from '../../types'
import { 
  X, 
  MapPin, 
  Crosshair, 
  Plus, 
  Trash2, 
  Check, 
  Video, 
  Image as ImageIcon,
  Share2,
  Lock
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const authStore = useAuthStore()

const formData = reactive({
  title: '',
  mapId: mapStore.currentMapId,
  grenadeType: 'smoke' as GrenadeType,
  side: 't' as TeamSide,
  throwType: 'jumpthrow' as ThrowType,
  tickrate: 'cs2_subtick' as TickrateType,
  startLocation: '',
  endLocation: '',
  site: 'A' as 'A' | 'B' | 'Mid' | 'Spawn' | 'General',
  originCoords: { x: 50, y: 50 },
  landingCoords: { x: 50, y: 30 },
  curveOffset: 0,
  isTeamShared: true,
  videoUrl: '',
  imageUrl: '',
  description: '',
  instructions: [''],
  consoleCommand: '',
  difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  tags: ''
})

watch(() => mapStore.tempPlacement, (newVal) => {
  if (newVal.origin) {
    formData.originCoords = { ...newVal.origin }
  }
  if (newVal.landing) {
    formData.landingCoords = { ...newVal.landing }
  }
}, { deep: true })

function addInstructionStep() {
  formData.instructions.push('')
}

function removeInstructionStep(index: number) {
  if (formData.instructions.length > 1) {
    formData.instructions.splice(index, 1)
  }
}

function startPickFromMap() {
  lineupStore.isAddModalOpen = false
  mapStore.startPlacement()
}

function handleSave() {
  if (!formData.title.trim()) {
    alert('Please provide a lineup title.')
    return
  }

  const tagsArray = formData.tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  const cleanInstructions = formData.instructions.filter(i => i.trim().length > 0)

  const newLineup = lineupStore.addLineup({
    title: formData.title,
    mapId: formData.mapId,
    grenadeType: formData.grenadeType,
    side: formData.side,
    throwType: formData.throwType,
    tickrate: formData.tickrate,
    startLocation: formData.startLocation || 'Custom Spot',
    endLocation: formData.endLocation || 'Target Spot',
    site: formData.site,
    originCoords: formData.originCoords,
    landingCoords: formData.landingCoords,
    curveOffset: formData.curveOffset,
    videoUrl: formData.videoUrl || undefined,
    imageUrl: formData.imageUrl || undefined,
    description: formData.description,
    instructions: cleanInstructions.length ? cleanInstructions : ['Execute throw alignment.'],
    consoleCommand: formData.consoleCommand || undefined,
    difficulty: formData.difficulty,
    author: authStore.currentUser?.username || 'You',
    tags: tagsArray.length ? tagsArray : ['Custom']
  })

  // Tag author info
  if (authStore.currentUser) {
    (newLineup as any).userId = authStore.currentUser.id;
    (newLineup as any).authorName = authStore.currentUser.username;
    (newLineup as any).isTeamShared = formData.isTeamShared
  }

  lineupStore.isAddModalOpen = false
  resetForm()
}

function resetForm() {
  formData.title = ''
  formData.startLocation = ''
  formData.endLocation = ''
  formData.videoUrl = ''
  formData.imageUrl = ''
  formData.description = ''
  formData.instructions = ['']
  formData.consoleCommand = ''
  formData.tags = ''
  formData.isTeamShared = true
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="lineupStore.isAddModalOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="lineupStore.isAddModalOpen = false"
    >
      <div class="relative w-full max-w-3xl max-h-[90vh] my-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Plus class="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 class="text-lg font-black tracking-tight text-white">Create New Grenade Lineup</h2>
            <p class="text-xs text-slate-400">
              {{ authStore.currentUser ? `Creating as ${authStore.currentUser.username} (${authStore.currentUser.inGameRole})` : 'Indexed grenade guide' }}
            </p>
          </div>
        </div>

        <button 
          @click="lineupStore.isAddModalOpen = false"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- BODY -->
      <div class="flex-grow overflow-y-auto p-6 flex flex-col gap-5 text-xs">
        <!-- ROW 1: TITLE, MAP & PRIVACY -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2 flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Lineup Title *</label>
            <input 
              v-model="formData.title" 
              type="text" 
              placeholder="e.g. Deep Monster Smoke from T Spawn" 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Map</label>
            <select 
              v-model="formData.mapId"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
            >
              <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
                {{ map.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- ROW 2: GRENADE TYPE, SIDE, THROW TYPE -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Grenade Type</label>
            <select 
              v-model="formData.grenadeType"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80 uppercase font-mono font-bold"
            >
              <option value="smoke">Smoke Grenade</option>
              <option value="flash">Flashbang</option>
              <option value="molotov">Molotov / Incendiary</option>
              <option value="he">HE Grenade</option>
              <option value="decoy">Decoy</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Team Side</label>
            <select 
              v-model="formData.side"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80 uppercase font-bold"
            >
              <option value="t">Terrorist (T)</option>
              <option value="ct">Counter-Terrorist (CT)</option>
              <option value="all">Both Sides</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Throw Technique</label>
            <select 
              v-model="formData.throwType"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80 uppercase font-bold"
            >
              <option value="standing">Standing (Left-Click)</option>
              <option value="jumpthrow">Jumpthrow</option>
              <option value="runthrow">Runthrow</option>
              <option value="crouch_jumpthrow">Crouch + Jumpthrow</option>
              <option value="left_right_click">Left + Right Click</option>
              <option value="w_jumpthrow">W-Key Jumpthrow</option>
            </select>
          </div>
        </div>

        <!-- ROW 3: RADAR COORDINATES PICKER -->
        <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Crosshair class="w-4 h-4 text-amber-400" />
              <span class="font-bold text-slate-200">Radar Positioning Coordinates</span>
            </div>
            <button 
              type="button"
              @click="startPickFromMap"
              class="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg font-bold text-xs transition-colors cursor-pointer"
            >
              <MapPin class="w-3.5 h-3.5" />
              <span>Click to Pinpoint on Radar Map</span>
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span class="text-slate-500">Origin X (%):</span>
              <input v-model.number="formData.originCoords.x" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200" />
            </div>
            <div>
              <span class="text-slate-500">Origin Y (%):</span>
              <input v-model.number="formData.originCoords.y" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200" />
            </div>
            <div>
              <span class="text-slate-500">Target X (%):</span>
              <input v-model.number="formData.landingCoords.x" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200" />
            </div>
            <div>
              <span class="text-slate-500">Target Y (%):</span>
              <input v-model.number="formData.landingCoords.y" type="number" step="0.1" class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200" />
            </div>
          </div>
        </div>

        <!-- ROW 4: LOCATIONS, SITE, SHARING -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Standing Spot (Start)</label>
            <input 
              v-model="formData.startLocation" 
              type="text" 
              placeholder="e.g. T Spawn (Trash Can)" 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Landing Spot (Target)</label>
            <input 
              v-model="formData.endLocation" 
              type="text" 
              placeholder="e.g. Snipers Window" 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Target Bomb Site</label>
            <select 
              v-model="formData.site"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80 font-bold"
            >
              <option value="A">A Site</option>
              <option value="B">B Site</option>
              <option value="Mid">Mid</option>
              <option value="Spawn">Spawn / Arch</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>

        <!-- ROW 5: VIDEO & IMAGE URLS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300 flex items-center gap-1.5">
              <Video class="w-3.5 h-3.5 text-rose-400" />
              <span>Video URL (YouTube Embed / Streamable / MP4)</span>
            </label>
            <input 
              v-model="formData.videoUrl" 
              type="text" 
              placeholder="https://www.youtube.com/embed/..." 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300 flex items-center gap-1.5">
              <ImageIcon class="w-3.5 h-3.5 text-sky-400" />
              <span>Alignment Image URL</span>
            </label>
            <input 
              v-model="formData.imageUrl" 
              type="text" 
              placeholder="https://... image link" 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
            />
          </div>
        </div>

        <!-- ROW 6: STEP BY STEP INSTRUCTIONS -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="font-bold text-slate-300">Step-by-Step Instructions</label>
            <button 
              type="button" 
              @click="addInstructionStep"
              class="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Add Step</span>
            </button>
          </div>

          <div 
            v-for="(step, idx) in formData.instructions" 
            :key="idx"
            class="flex items-center gap-2"
          >
            <span class="w-6 text-center font-mono font-bold text-slate-500">{{ idx + 1 }}.</span>
            <input 
              v-model="formData.instructions[idx]" 
              type="text" 
              placeholder="Describe alignment step..."
              class="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/80"
            />
            <button 
              type="button" 
              @click="removeInstructionStep(idx)"
              class="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- ROW 7: PRACTICE CONSOLE COMMAND -->
        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Practice Console Command</label>
          <input 
            v-model="formData.consoleCommand" 
            type="text" 
            placeholder="setpos 1290.4 -430.1 -160.0; setang -12.4 94.2 0.0" 
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500/80"
          />
        </div>
      </div>

      <!-- FOOTER -->
      <div class="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-950/60">
        <!-- TEAM SHARING TOGGLE -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="formData.isTeamShared = !formData.isTeamShared"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer',
              formData.isTeamShared ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
            ]"
          >
            <Share2 v-if="formData.isTeamShared" class="w-3.5 h-3.5" />
            <Lock v-else class="w-3.5 h-3.5" />
            <span>{{ formData.isTeamShared ? 'Shared with Team' : 'Private to My Account' }}</span>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button 
            type="button"
            @click="lineupStore.isAddModalOpen = false"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            @click="handleSave"
            class="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <Check class="w-4 h-4 stroke-[3]" />
            <span>Save Lineup</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>
</template>
