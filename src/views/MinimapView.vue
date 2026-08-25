<script setup lang="ts">
import { useMapStore } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import MapSelectorSidebar from '../components/map/MapSelectorSidebar.vue'
import NadeFilterBar from '../components/map/NadeFilterBar.vue'
import InteractiveMinimap from '../components/map/InteractiveMinimap.vue'
import LineupGrid from '../components/lineups/LineupGrid.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import AddLineupModal from '../components/lineups/AddLineupModal.vue'
import CreateExecuteModal from '../components/lineups/CreateExecuteModal.vue'
import MapSettingsModal from '../components/map/MapSettingsModal.vue'

const mapStore = useMapStore()
const lineupStore = useLineupStore()
</script>

<template>
  <div class="minimap-view flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
    <!-- LEFT SIDE: MAP SELECTION WITH THUMBNAIL IMAGES -->
    <div class="w-full lg:w-60 xl:w-64 flex-shrink-0">
      <MapSelectorSidebar />
    </div>

    <!-- RIGHT SIDE / MAIN CONTENT: FILTERS, RADAR MINIMAP, LINEUP GRID -->
    <div class="flex-grow flex flex-col gap-6 min-w-0">
      <!-- NADE FILTER BAR -->
      <NadeFilterBar />

      <!-- INTERACTIVE RADAR MINIMAP -->
      <InteractiveMinimap />

      <!-- LINEUP GRID / DIRECTORY BELOW MAP -->
      <div class="pt-4 border-t border-slate-800/80">
        <LineupGrid />
      </div>
    </div>

    <!-- MODALS -->
    <LineupModal />
    <AddLineupModal />
    <CreateExecuteModal />
    <MapSettingsModal 
      :is-open="mapStore.isMapSettingsOpen" 
      @close="mapStore.isMapSettingsOpen = false" 
    />
  </div>
</template>
