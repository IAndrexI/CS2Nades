<script setup lang="ts">
import { useMapStore } from '../stores/mapStore'
import TacticsBoard from '../components/tactics/TacticsBoard.vue'
import { PenTool } from 'lucide-vue-next'

const mapStore = useMapStore()
</script>

<template>
  <div class="tactics-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- HEADER -->
    <div class="flex items-center justify-between p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
          <PenTool class="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">Tactics Drawing Board</h1>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-xs font-mono font-bold">
              {{ mapStore.currentMap.name }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Draw custom execute paths, assign player roles (P1-P5), place smoke blooms, and plan team movements
          </p>
        </div>
      </div>
    </div>

    <!-- TACTICS BOARD COMPONENT -->
    <TacticsBoard />
  </div>
</template>
