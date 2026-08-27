<script setup lang="ts">
import { ref } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useStratStore } from '../stores/stratStore'
import { useGameRoomStore } from '../stores/gameRoomStore'
import { useThemeStore } from '../stores/themeStore'
import MapSelectorSidebar from '../components/map/MapSelectorSidebar.vue'
import TacticsBoard from '../components/tactics/TacticsBoard.vue'
import MapSettingsModal from '../components/map/MapSettingsModal.vue'
import { AlertTriangle, Save, Trash2, X, ArrowRight, Sparkles } from 'lucide-vue-next'

const mapStore = useMapStore()
const stratStore = useStratStore()
const gameRoomStore = useGameRoomStore()
const themeStore = useThemeStore()

const isMapSwitchWarnModalOpen = ref(false)
const pendingTargetMapId = ref<string | null>(null)

function handleMapSelect(targetMapId: string) {
  if (!targetMapId || targetMapId === mapStore.currentMapId) return

  // If there are active markings on current board, warn user and offer temp save!
  if (stratStore.boardElements.length > 0) {
    pendingTargetMapId.value = targetMapId
    isMapSwitchWarnModalOpen.value = true
    return
  }

  // Otherwise switch immediately with a fresh board
  executeMapSwitch(targetMapId, false)
}

function executeMapSwitch(targetMapId: string, shouldTempSaveCurrent: boolean) {
  if (shouldTempSaveCurrent) {
    stratStore.tempSaveBoard(mapStore.currentMapId)
  }
  
  stratStore.saveCurrentMapElements(mapStore.currentMapId)
  mapStore.setMap(targetMapId)
  stratStore.loadMapElements(targetMapId)
  gameRoomStore.switchMap(targetMapId, stratStore.boardElements)
  isMapSwitchWarnModalOpen.value = false
  pendingTargetMapId.value = null
}
</script>

<template>
  <div class="tactics-view flex flex-col lg:flex-row gap-6 max-w-[1650px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
    <!-- LEFT SIDE: MAP SELECTION SIDEBAR (MATCHING LINEUPS) -->
    <div class="w-full lg:w-60 xl:w-64 flex-shrink-0">
      <MapSelectorSidebar :custom-handler="true" @select="handleMapSelect" />
    </div>

    <!-- RIGHT SIDE / MAIN CONTENT: TACTICS BOARD CANVAS & TOOLBAR -->
    <div class="flex-grow flex flex-col gap-4 min-w-0">
      <TacticsBoard />
    </div>

    <!-- MODAL 1: MAP SETTINGS -->
    <MapSettingsModal 
      :is-open="mapStore.isMapSettingsOpen" 
      @close="mapStore.isMapSettingsOpen = false" 
    />

    <!-- MODAL 2: CENTERED MAP SWITCH & BOARD WIPE WARNING -->
    <Teleport to="body">
      <div
        v-if="isMapSwitchWarnModalOpen"
        class="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in"
        @click.self="isMapSwitchWarnModalOpen = false"
      >
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-center items-center">
          <div class="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl shadow-inner">
            <AlertTriangle class="w-8 h-8 stroke-[2.5]" />
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="text-base font-black uppercase text-white tracking-wide">
              Switch Map & Start Fresh Board?
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              You have <strong class="text-amber-400">{{ stratStore.boardElements.length }} active markings/pins</strong> on
              <strong class="text-white uppercase">{{ mapStore.currentMap?.name || mapStore.currentMapId }}</strong>.
            </p>
            <p class="text-xs text-slate-400 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              All tactical boards are temporary unless saved. Changing maps will start a fresh, clean board for
              <strong class="text-emerald-400 uppercase font-mono">{{ pendingTargetMapId }}</strong>.
            </p>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="flex flex-col gap-2.5 w-full pt-1">
            <!-- OPTION 1: TEMP SAVE & SWITCH -->
            <button
              @click="pendingTargetMapId && executeMapSwitch(pendingTargetMapId, true)"
              class="w-full py-3 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 hover:opacity-90"
              :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
            >
              <Save class="w-4 h-4" />
              <span>Temp Save Board & Switch</span>
            </button>

            <!-- OPTION 2: DISCARD & START FRESH -->
            <button
              @click="pendingTargetMapId && executeMapSwitch(pendingTargetMapId, false)"
              class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 class="w-3.5 h-3.5 text-rose-400" />
              <span>Discard Markings & Start Fresh</span>
            </button>

            <!-- OPTION 3: CANCEL -->
            <button
              @click="isMapSwitchWarnModalOpen = false; pendingTargetMapId = null"
              class="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel (Stay on {{ mapStore.currentMap?.name }})
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
