<script setup lang="ts">
import { ref } from 'vue'
import { useMapStore } from '../stores/mapStore'
import { useStratStore } from '../stores/stratStore'
import { useGameRoomStore } from '../stores/gameRoomStore'
import { useThemeStore } from '../stores/themeStore'
import { useAuthStore } from '../stores/authStore'
import MapSelectorSidebar from '../components/map/MapSelectorSidebar.vue'
import TacticsBoard from '../components/tactics/TacticsBoard.vue'
import MapSettingsModal from '../components/map/MapSettingsModal.vue'
import { AlertTriangle, Trash2, Download, CloudUpload, X } from 'lucide-vue-next'
import axios from 'axios'

const mapStore = useMapStore()
const stratStore = useStratStore()
const gameRoomStore = useGameRoomStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const isMapSwitchWarnModalOpen = ref(false)
const pendingTargetMapId = ref<string | null>(null)
const isSavingToServer = ref(false)

function handleMapSelect(targetMapId: string) {
  if (!targetMapId || targetMapId === mapStore.currentMapId) return

  // Permission check: only host can change map unless setting toggled
  if (gameRoomStore.currentRoomCode && !gameRoomStore.isHost && gameRoomStore.onlyHostCanChangeMap) {
    alert('Only the Room Host can change maps (Host locked map switching).')
    return
  }

  // If there are active markings on current board, warn user and offer options
  if (stratStore.boardElements.length > 0) {
    pendingTargetMapId.value = targetMapId
    isMapSwitchWarnModalOpen.value = true
    return
  }

  // Otherwise switch immediately with a fresh board
  executeMapSwitch(targetMapId)
}

function executeMapSwitch(targetMapId: string) {
  stratStore.saveCurrentMapElements(mapStore.currentMapId)
  mapStore.setMap(targetMapId)
  stratStore.loadMapElements(targetMapId)
  gameRoomStore.switchMap(targetMapId, stratStore.boardElements)
  isMapSwitchWarnModalOpen.value = false
  pendingTargetMapId.value = null
}

function handleSaveToFileAndSwitch() {
  if (!pendingTargetMapId.value) return
  const data = {
    version: '1.0',
    app: 'Protutech CS2 Tactics',
    mapId: mapStore.currentMapId,
    mapName: mapStore.currentMap?.name || mapStore.currentMapId,
    exportedAt: new Date().toISOString(),
    elements: stratStore.boardElements,
    author: authStore.currentUser?.username || 'Player'
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cs2_tactics_${mapStore.currentMapId}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)

  executeMapSwitch(pendingTargetMapId.value)
}

async function handleSaveToServerAndSwitch() {
  if (!pendingTargetMapId.value) return
  if (!authStore.token) {
    authStore.isAuthModalOpen = true
    return
  }
  isSavingToServer.value = true
  try {
    await axios.post('/api/tactics/save-server', {
      title: `${mapStore.currentMap?.name || mapStore.currentMapId} Strategy ${new Date().toLocaleDateString()}`,
      mapId: mapStore.currentMapId,
      elements: stratStore.boardElements
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    executeMapSwitch(pendingTargetMapId.value)
  } catch (e: any) {
    alert(e.response?.data?.error || 'Failed to save to server')
  } finally {
    isSavingToServer.value = false
  }
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

    <!-- MODAL 2: CENTERED MAP SWITCH & OPTIONS DIALOG -->
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
              Switch Map Options
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed">
              You have <strong class="text-amber-400">{{ stratStore.boardElements.length }} active markings/pins</strong> on
              <strong class="text-white uppercase">{{ mapStore.currentMap?.name || mapStore.currentMapId }}</strong>.
            </p>
            <p class="text-xs text-slate-400 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              Choose an action for your current markings before switching to
              <strong class="text-emerald-400 uppercase font-mono">{{ pendingTargetMapId }}</strong>:
            </p>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="flex flex-col gap-2.5 w-full pt-1">
            <!-- OPTION 1: CLEAR BOARD & SWITCH -->
            <button
              @click="pendingTargetMapId && executeMapSwitch(pendingTargetMapId)"
              class="w-full py-3 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 hover:opacity-90"
              :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
            >
              <Trash2 class="w-4 h-4" />
              <span>Clear Board & Switch</span>
            </button>

            <!-- OPTION 2: SAVE TO FILE & SWITCH -->
            <button
              @click="handleSaveToFileAndSwitch"
              class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Download class="w-3.5 h-3.5 text-cyan-400" />
              <span>Save to File (Export JSON) & Switch</span>
            </button>

            <!-- OPTION 3: SAVE TO SERVER & SWITCH -->
            <button
              @click="handleSaveToServerAndSwitch"
              class="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CloudUpload class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ isSavingToServer ? 'Saving to Server...' : 'Save to Server & Switch' }}</span>
            </button>

            <!-- OPTION 4: CANCEL -->
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
