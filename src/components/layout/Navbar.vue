<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import { useAuthStore } from '../../stores/authStore'
import { useAdminStore } from '../../stores/adminStore'
import { BRANDING, NAV_LABELS } from '../../config/site'
import DataSyncModal from '../common/DataSyncModal.vue'
import MapSettingsModal from '../map/MapSettingsModal.vue'
import LineupConflictModal from '../lineups/LineupConflictModal.vue'

import { 
  Crosshair, 
  Map as MapIcon, 
  BookOpen, 
  PenTool, 
  Grid, 
  Plus, 
  Database, 
  ChevronDown,
  Settings2,
  Layers,
  User,
  ShieldCheck,
  LogOut,
  UserCheck,
  BookMarked,
  Radio,
  RefreshCw
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()
const authStore = useAuthStore()
const adminStore = useAdminStore()
const router = useRouter()
const route = useRoute()

const isMapDropdownOpen = ref(false)
const isUserDropdownOpen = ref(false)
const isDataModalOpen = ref(false)

const navLinks = [
  { name: NAV_LABELS.radar, path: '/', icon: MapIcon },
  { name: NAV_LABELS.callouts, path: '/callouts', icon: Layers },
  { name: NAV_LABELS.gameRoom, path: '/game-room', icon: Radio, isLive: true },
  { name: NAV_LABELS.strats, path: '/strats', icon: BookOpen },
  { name: NAV_LABELS.library, path: '/library', icon: Grid },
  { name: NAV_LABELS.myLineups, path: '/my-lineups', icon: BookMarked }
]

function selectMap(mapId: string) {
  mapStore.setMap(mapId)
  isMapDropdownOpen.value = false
}

function handleLogout() {
  authStore.logout()
  isUserDropdownOpen.value = false
}

async function handleSyncLineups() {
  await lineupStore.syncWithServer()
}
</script>

<template>
  <header class="navbar-wrapper w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <!-- LOGO & BRANDING (CONFIGURABLE VIA SITE.TS & ADMIN) -->
      <div class="flex items-center gap-6">
        <router-link to="/" class="flex items-center gap-2.5 group cursor-pointer">
          <div class="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Crosshair class="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-black tracking-wider text-white uppercase group-hover:text-amber-400 transition-colors">
              {{ adminStore.settings.siteTitle || BRANDING.siteTitle }}
            </span>
            <span class="text-[10px] font-mono text-amber-500/90 font-bold -mt-0.5 tracking-widest uppercase">
              {{ adminStore.settings.teamName || BRANDING.teamName }} // {{ BRANDING.tagline }}
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
            class="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col py-1 animate-fade-in"
          >
            <div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
              <span>Select Map</span>
              <button 
                @click="mapStore.isMapSettingsOpen = true; isMapDropdownOpen = false" 
                class="text-amber-400 hover:underline flex items-center gap-1 text-[10px] lowercase"
              >
                <Settings2 class="w-3 h-3" />
                <span>custom radars</span>
              </button>
            </div>

            <div class="max-h-60 overflow-y-auto">
              <button
                v-for="map in mapStore.availableMaps"
                :key="map.id"
                @click="selectMap(map.id)"
                :class="[
                  'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer',
                  mapStore.currentMapId === map.id 
                    ? 'bg-amber-500/20 text-amber-400 font-bold' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                ]"
              >
                <span>{{ map.name }}</span>
                <span v-if="map.isCustom" class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  CUSTOM
                </span>
                <span v-else-if="map.activePool" class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  ACTIVE
                </span>
              </button>
            </div>

            <div class="p-2 border-t border-slate-800 bg-slate-950/60">
              <button 
                @click="mapStore.isMapSettingsOpen = true; isMapDropdownOpen = false"
                class="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers class="w-3.5 h-3.5 text-amber-400" />
                <span>Custom Radar / Map Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN NAVIGATION TABS -->
      <nav class="hidden lg:flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
        <router-link
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
            route.path === link.path 
              ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <component :is="link.icon" class="w-3.5 h-3.5" :class="{ 'text-emerald-400 animate-pulse': link.isLive }" />
          <span>{{ link.name }}</span>
        </router-link>
      </nav>

      <!-- RIGHT ACTIONS: SYNC, USER AUTH, ADMIN, NEW NADE -->
      <div class="flex items-center gap-2.5">
        <!-- SERVER LINEUP SYNC BUTTON -->
        <button
          @click="handleSyncLineups"
          :disabled="lineupStore.isSyncing"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          :title="lineupStore.lastSyncTime ? `Last synced at ${lineupStore.lastSyncTime}` : 'Sync with Server'"
        >
          <RefreshCw class="w-3.5 h-3.5 text-amber-400" :class="{ 'animate-spin': lineupStore.isSyncing }" />
          <span class="hidden sm:inline">Sync</span>
        </button>

        <!-- ADMIN PANEL LINK (IF ADMIN) -->
        <router-link
          v-if="authStore.isAdmin"
          to="/admin"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            route.path === '/admin'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 text-amber-400'
          ]"
          title="Admin Panel"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Admin</span>
        </router-link>

        <!-- USER PROFILE / LOGIN BUTTON -->
        <div class="relative">
          <template v-if="authStore.isAuthenticated">
            <button
              @click="isUserDropdownOpen = !isUserDropdownOpen"
              class="flex items-center gap-2 p-1 pl-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              <span class="hidden sm:inline">{{ authStore.currentUser?.username }}</span>
              <img 
                :src="authStore.currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${authStore.currentUser?.username}`" 
                class="w-6 h-6 rounded-lg bg-slate-950 border border-slate-700" 
              />
            </button>

            <!-- USER DROPDOWN -->
            <div 
              v-if="isUserDropdownOpen"
              class="absolute top-full right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col py-1 animate-fade-in text-xs"
            >
              <div class="p-3 border-b border-slate-800 flex flex-col gap-0.5">
                <span class="font-bold text-white">{{ authStore.currentUser?.username }}</span>
                <span class="text-[10px] text-amber-400 font-mono font-semibold uppercase">{{ authStore.currentUser?.inGameRole || 'Player' }} • {{ authStore.currentUser?.role }}</span>
              </div>

              <router-link
                to="/game-room"
                @click="isUserDropdownOpen = false"
                class="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Radio class="w-4 h-4 text-emerald-400" />
                <span>Live Game Room</span>
              </router-link>

              <router-link
                to="/my-lineups"
                @click="isUserDropdownOpen = false"
                class="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <BookMarked class="w-4 h-4 text-amber-400" />
                <span>My Personal Lineups</span>
              </router-link>

              <router-link
                v-if="authStore.isAdmin"
                to="/admin"
                @click="isUserDropdownOpen = false"
                class="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ShieldCheck class="w-4 h-4 text-amber-400" />
                <span>Admin Dashboard</span>
              </router-link>

              <button
                @click="handleLogout"
                class="flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors w-full text-left border-t border-slate-800 cursor-pointer"
              >
                <LogOut class="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </template>

          <template v-else>
            <button
              @click="authStore.authMode = 'steam'; authStore.isAuthModalOpen = true"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-amber-400 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <User class="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          </template>
        </div>

        <!-- NEW NADE BUTTON -->
        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 stroke-[3]" />
          <span>Add Nade</span>
        </button>
      </div>
    </div>

    <!-- MODALS -->
    <DataSyncModal 
      :is-open="isDataModalOpen" 
      @close="isDataModalOpen = false" 
    />
    <MapSettingsModal
      :is-open="mapStore.isMapSettingsOpen"
      @close="mapStore.isMapSettingsOpen = false"
    />
    <LineupConflictModal />
  </header>
</template>
