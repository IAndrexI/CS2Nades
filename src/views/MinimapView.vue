<script setup lang="ts">
import { useMapStore } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import NadeFilterBar from '../components/map/NadeFilterBar.vue'
import InteractiveMinimap from '../components/map/InteractiveMinimap.vue'
import LineupGrid from '../components/lineups/LineupGrid.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import AddLineupModal from '../components/lineups/AddLineupModal.vue'

const mapStore = useMapStore()
const lineupStore = useLineupStore()
</script>

<template>
  <div class="minimap-view flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
    <!-- NADE FILTER BAR -->
    <NadeFilterBar />

    <!-- INTERACTIVE RADAR MINIMAP -->
    <InteractiveMinimap />

    <!-- LINEUP GRID / DIRECTORY BELOW MAP -->
    <div class="pt-4 border-t border-slate-800/80">
      <LineupGrid />
    </div>

    <!-- MODALS -->
    <LineupModal />
    <AddLineupModal />
  </div>
</template>
