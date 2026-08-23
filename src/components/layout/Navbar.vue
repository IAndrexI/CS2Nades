<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import DataSyncModal from '../common/DataSyncModal.vue'
import { 
  Crosshair, 
  Map as MapIcon, 
  BookOpen, 
  PenTool, 
  Grid, 
  Plus, 
  Database, 
  ChevronDown
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()
const router = useRouter()
const route = useRoute()

const isMapDropdownOpen = ref(false)
const isDataModalOpen = ref(false)

const navLinks = [
  { name: 'Radar Minimap', path: '/', icon: MapIcon },
  { name: 'Stratbook', path: '/strats', icon: BookOpen },
  { name: 'Tactics Board', path: '/tactics', icon: PenTool },
  { name: 'Lineup Library', path: '/library', icon: Grid }
]

function selectMap(mapId: string) {
  mapStore.setMap(mapId)
  isMapDropdownOpen.value = false
}
</script>

<template>
  <header class="navbar-wrapper w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <!-- LOGO & BRANDING -->
      <div class="flex items-center gap-6">
        <router-link to="/" class="flex items-center gap-2.5 group cursor-pointer">
          <div class="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Crosshair class="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-black tracking-wider text-white uppercase group-hover:text-amber-400 transition-colors">
              CS2 STRATBOOK
            </span>
            <span class="text-[10px] font-mono text-amber-500/90 font-bold -mt-0.5 tracking-widest">
              PROXMOX // SELF-HOSTED
            </span>
          </div>
        </router-link>

        <!-- MAP SELECTOR DROPDOWN -->
        <div class="relative">
          <button
            @click="isMapDropdownOpen = !isMapDropdownOpen"
            class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span class="uppercase tracking-wide font-mono">{{ mapStore.currentMap.name }}</span>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400" />
          </button>

          <!-- DROPDOWN MENU -->
          <div 
            v-if="isMapDropdownOpen"
            class="absolute top-full left-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col py-1 animate-fade-in"
          >
            <div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              Active Duty & Reserve Maps
            </div>
            <button
              v-for="map in mapStore.availableMaps"
              :key="map.id"
              @click="selectMap(map.id)"
              :class="[
                'flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer',
                mapStore.currentMapId === map.id 
                  ? 'bg-amber-500/20 text-amber-400 font-bold' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              ]"
            >
              <span>{{ map.name }}</span>
              <span v-if="map.activePool" class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                ACTIVE
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN NAVIGATION TABS -->
      <nav class="hidden md:flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
        <router-link
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          :class="[
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
            route.path === link.path 
              ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <component :is="link.icon" class="w-3.5 h-3.5" />
          <span>{{ link.name }}</span>
        </router-link>
      </nav>

      <!-- RIGHT ACTIONS: SYNC / BACKUP -->
      <div class="flex items-center gap-2.5">
        <button
          @click="isDataModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          title="Backup & Storage Settings"
        >
          <Database class="w-3.5 h-3.5 text-amber-400" />
          <span class="hidden sm:inline">Data & Sync</span>
        </button>

        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 stroke-[3]" />
          <span>Add Nade</span>
        </button>
      </div>
    </div>

    <!-- DATA SYNC MODAL -->
    <DataSyncModal 
      :is-open="isDataModalOpen" 
      @close="isDataModalOpen = false" 
    />
  </header>
</template>
