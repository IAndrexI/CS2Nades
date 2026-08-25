<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import { useAuthStore } from '../../stores/authStore'
import { useAdminStore } from '../../stores/adminStore'
import { useThemeStore } from '../../stores/themeStore'
import { BRANDING, NAV_LABELS } from '../../config/site'
import DataSyncModal from '../common/DataSyncModal.vue'
import MapSettingsModal from '../map/MapSettingsModal.vue'
import LineupConflictModal from '../lineups/LineupConflictModal.vue'

import { 
  Crosshair, 
  Map as MapIcon, 
  BookOpen, 
  Grid, 
  Plus, 
  ChevronDown, 
  Settings2, 
  Layers, 
  User, 
  ShieldCheck, 
  LogOut, 
  BookMarked, 
  Radio, 
  RefreshCw,
  Sun,
  Moon,
  Smartphone,
  Monitor,
  Menu,
  X
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()
const authStore = useAuthStore()
const adminStore = useAdminStore()
const themeStore = useThemeStore()
const router = useRouter()
const route = useRoute()

const isMapDropdownOpen = ref(false)
const isUserDropdownOpen = ref(false)
const isDataModalOpen = ref(false)
const isMobileMenuOpen = ref(false)

const isRoleSelectorOpen = ref(false)

const navLinks = [
  { name: NAV_LABELS.radar, path: '/', icon: MapIcon },
  { name: NAV_LABELS.callouts, path: '/callouts', icon: Layers },
  { name: NAV_LABELS.strats, path: '/strats', icon: BookOpen },
  { name: NAV_LABELS.library, path: '/library', icon: Grid },
  { name: NAV_LABELS.myLineups, path: '/my-lineups', icon: BookMarked }
]

const inGameRoles = ['IGL', 'Entry Fragger', 'Support', 'AWPer', 'Lurker', 'Anchor', 'Flex']

async function changeRole(role: string) {
  if (authStore.currentUser) {
    await authStore.updateProfile({ inGameRole: role as any })
  }
  isRoleSelectorOpen.value = false
}

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
    <div class="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
      <!-- LOGO & BRANDING -->
      <div class="flex items-center gap-3 sm:gap-5">
        <router-link to="/" class="flex items-center gap-2.5 group cursor-pointer">
          <img 
            src="/logo.png" 
            alt="Protutech" 
            class="w-8 h-8 rounded-xl object-cover shadow-lg border border-amber-500/40 group-hover:scale-105 transition-transform flex-shrink-0"
          />
          <div class="flex flex-col">
            <span class="text-sm font-black tracking-wider text-white uppercase group-hover:text-amber-400 transition-colors">
              Protutech
            </span>
            <span class="text-[9px] font-mono text-amber-500/90 font-bold -mt-0.5 tracking-widest uppercase hidden xs:inline">
              Tactical Hub
            </span>
          </div>
        </router-link>

        <!-- MAP SELECTOR DROPDOWN -->
        <div class="relative">
          <button
            @click="isMapDropdownOpen = !isMapDropdownOpen"
            class="flex items-center gap-2 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <img 
              v-if="mapStore.currentMap.icon" 
              :src="mapStore.currentMap.icon" 
              :alt="mapStore.currentMap.name" 
              class="w-4 h-4 object-contain"
            />
            <span v-else class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
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

            <div class="max-h-72 overflow-y-auto">
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
                <div class="flex items-center gap-2">
                  <img 
                    v-if="map.icon" 
                    :src="map.icon" 
                    :alt="map.name" 
                    class="w-4 h-4 object-contain flex-shrink-0"
                  />
                  <span>{{ map.name }}</span>
                </div>

                <span v-if="map.isCustom" class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  CUSTOM
                </span>
                <span v-else-if="map.activePool" class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-black">
                  PREMIER
                </span>
                <span v-else class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-500">
                  RESERVE
                </span>
              </button>
            </div>

            <div class="p-2 border-t border-slate-800 bg-slate-950/60">
              <button 
                @click="mapStore.isMapSettingsOpen = true; isMapDropdownOpen = false" 
                class="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers class="w-3.5 h-3.5 text-amber-400" />
                <span>Custom Radar / Settings</span>
              </button>
            </div>
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
            'flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
            route.path === link.path 
              ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700' 
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <component :is="link.icon" class="w-3.5 h-3.5" />
          <span>{{ link.name }}</span>
        </router-link>
      </nav>

      <!-- RIGHT ACTIONS: DISCORD, THEME, SYNC, USER PROFILE, NEW NADE -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- DISCORD INVITE BUTTON -->
        <a
          href="https://discord.gg/XEDqfYEW5h"
          target="_blank"
          rel="noopener noreferrer"
          title="Join our Discord Community"
          class="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#5865F2] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span class="hidden lg:inline">Discord</span>
        </a>

        <!-- LIGHT / DARK MODE TOGGLE BUTTON -->
        <button
          @click="themeStore.toggleTheme"
          :title="themeStore.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          class="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-xl transition-colors cursor-pointer"
        >
          <Sun v-if="themeStore.theme === 'dark'" class="w-3.5 h-3.5 text-amber-400" />
          <Moon v-else class="w-3.5 h-3.5 text-slate-300" />
        </button>

        <!-- USER PROFILE / LOGIN BUTTON -->
        <div class="relative">
          <template v-if="authStore.isAuthenticated">
            <button
              @click="isUserDropdownOpen = !isUserDropdownOpen"
              class="flex items-center gap-2 p-1.5 pl-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer shadow-sm"
            >
              <div class="flex flex-col text-right leading-none hidden sm:flex">
                <span class="text-white text-xs font-bold truncate max-w-[90px]">{{ authStore.currentUser?.username }}</span>
                <span class="text-[9px] text-amber-400 font-mono font-semibold">{{ authStore.currentUser?.inGameRole || 'Player' }}</span>
              </div>
              <img 
                :src="authStore.currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${authStore.currentUser?.username}`" 
                class="w-6 h-6 rounded-lg bg-slate-950 border border-slate-700 object-cover flex-shrink-0" 
              />
            </button>

            <!-- USER DROPDOWN -->
            <div 
              v-if="isUserDropdownOpen"
              class="absolute top-full right-0 mt-2 w-60 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col py-1 animate-fade-in text-xs"
            >
              <div class="p-3 border-b border-slate-800 flex flex-col gap-1 bg-slate-950/60">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white text-sm">{{ authStore.currentUser?.username }}</span>
                  <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-black uppercase">{{ authStore.currentUser?.role }}</span>
                </div>
                <!-- CURRENT ROLE & SWITCHER -->
                <div class="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span class="text-[10px] text-slate-400">Tactical Role:</span>
                  <span class="text-[10px] text-amber-400 font-bold font-mono">{{ authStore.currentUser?.inGameRole || 'Player' }}</span>
                </div>
              </div>

              <!-- ROLE SELECTOR LIST -->
              <div class="p-2 border-b border-slate-800">
                <span class="text-[10px] text-slate-400 font-bold uppercase block px-1 pb-1">Change Active Role</span>
                <div class="grid grid-cols-2 gap-1">
                  <button
                    v-for="r in inGameRoles"
                    :key="r"
                    @click="changeRole(r)"
                    :class="[
                      'px-2 py-1 rounded text-[10px] font-bold text-left transition-colors cursor-pointer',
                      authStore.currentUser?.inGameRole === r
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    ]"
                  >
                    {{ r }}
                  </button>
                </div>
              </div>

              <router-link
                to="/game-room"
                @click="isUserDropdownOpen = false"
                class="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Radio class="w-4 h-4 text-emerald-400" />
                <span>Tactical Live Room</span>
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
              <span class="hidden sm:inline">Sign In</span>
            </button>
          </template>
        </div>

        <!-- NEW NADE BUTTON -->
        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 stroke-[3]" />
          <span>New Nade</span>
        </button>

        <!-- MOBILE HAMBURGER MENU BUTTON -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="md:hidden p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl"
        >
          <Menu v-if="!isMobileMenuOpen" class="w-4 h-4" />
          <X v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- MOBILE NAVIGATION DRAWER -->
    <div 
      v-if="isMobileMenuOpen"
      class="md:hidden border-t border-slate-800 bg-slate-950/95 p-3 flex flex-col gap-1 animate-fade-in"
    >
      <router-link
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        @click="isMobileMenuOpen = false"
        :class="[
          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all',
          route.path === link.path 
            ? 'bg-slate-800 text-amber-400 border border-slate-700' 
            : 'text-slate-300 hover:bg-slate-900'
        ]"
      >
        <component :is="link.icon" class="w-4 h-4" />
        <span>{{ link.name }}</span>
      </router-link>

      <a
        href="https://discord.gg/XEDqfYEW5h"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#5865F2] hover:bg-slate-900 transition-all"
      >
        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        <span>Protutech Discord</span>
      </a>
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
