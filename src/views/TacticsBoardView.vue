<script setup lang="ts">
import { useMapStore } from '../stores/mapStore'
import { useStratStore } from '../stores/stratStore'
import { useGameRoomStore } from '../stores/gameRoomStore'
import MapSelectorSidebar from '../components/map/MapSelectorSidebar.vue'
import TacticsBoard from '../components/tactics/TacticsBoard.vue'
import MapSettingsModal from '../components/map/MapSettingsModal.vue'

const mapStore = useMapStore()
const stratStore = useStratStore()
const gameRoomStore = useGameRoomStore()

function handleMapSelect(mapId: string) {
  if (!mapId) return
  stratStore.saveCurrentMapElements(mapStore.currentMapId)
  mapStore.setMap(mapId)
  stratStore.loadMapElements(mapId)
  gameRoomStore.switchMap(mapId, stratStore.getElementsForMap(mapId))
}
</script>

<template>
  <div class="tactics-view flex flex-col lg:flex-row gap-6 max-w-[1650px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
    <!-- LEFT SIDE: MAP SELECTION SIDEBAR (MATCHING LINEUPS) -->
    <div class="w-full lg:w-60 xl:w-64 flex-shrink-0">
      <MapSelectorSidebar @select="handleMapSelect" />
    </div>

    <!-- RIGHT SIDE / MAIN CONTENT: TACTICS BOARD CANVAS & TOOLBAR -->
    <div class="flex-grow flex flex-col gap-4 min-w-0">
      <TacticsBoard />
    </div>

    <!-- MODALS -->
    <MapSettingsModal 
      :is-open="mapStore.isMapSettingsOpen" 
      @close="mapStore.isMapSettingsOpen = false" 
    />
  </div>
</template>
