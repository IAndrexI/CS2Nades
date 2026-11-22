<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useGameRoomStore } from '../../stores/gameRoomStore'
import DataSyncModal from '../common/DataSyncModal.vue'
import MapSettingsModal from '../map/MapSettingsModal.vue'
import LineupConflictModal from '../lineups/LineupConflictModal.vue'
import UserSettingsModal from '../user/UserSettingsModal.vue'
import DirectMessagesModal from '../user/DirectMessagesModal.vue'
import PeopleAndGroupsModal from '../user/PeopleAndGroupsModal.vue'
import PracticeServerModal from '../common/PracticeServerModal.vue'
import RemotePairModal from '../common/RemotePairModal.vue'
import InstallAppModal from '../common/InstallAppModal.vue'
import { useCompanionStore } from '../../stores/companionStore'
import { usePwaStore } from '../../stores/pwaStore'
import { useVoiceStore } from '../../stores/voiceStore'

import {
  Map as MapIcon,
  BookOpen,
  Grid,
  Plus,
  ChevronDown,
  Settings2,
  Layers,
  User,
  Users,
  Gamepad2,
  ShieldCheck,
  LogOut,
  BookMarked,
  Radio,
  RefreshCw,
  MessageSquare,
  Smartphone,
  Monitor,
  Menu,
  X,
  PenTool,
  Eye,
  UserX,
  Mic,
  Newspaper,
  WifiOff,
  SlidersHorizontal,
  Moon,
  Sun,
  ExternalLink
} from 'lucide-vue-next'

const mapStore = useMapStore()
const lineupStore = useLineupStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const gameRoomStore = useGameRoomStore()
const companionStore = useCompanionStore()
const pwaStore = usePwaStore()
const voiceStore = useVoiceStore()
const router = useRouter()
const route = useRoute()

const isMapDropdownOpen = ref(false)
const isToolsDropdownOpen = ref(false)
const isUserDropdownOpen = ref(false)
const isDataModalOpen = ref(false)
const isMobileMenuOpen = ref(false)
const isUserSettingsOpen = ref(false)
const isDirectMessagesOpen = ref(false)
const isPeopleGroupsOpen = ref(false)
const isPracticeModalOpen = ref(false)
const isRemoteModalOpen = ref(false)
const isInstallAppModalOpen = ref(false)
const directMessageTargetId = ref<string | undefined>(undefined)

function openDirectMessageWith(userId: string) {
  directMessageTargetId.value = userId
  isDirectMessagesOpen.value = true
}

function handleJoinRoomFromPeople(roomCode: string) {
  router.push(`/tactics?room=${roomCode}`)
}

function handleNewNadeClick() {
  if (authStore.isLimitedGuest) {
    authStore.authError = 'Limited Guest Mode: Creating and saving custom lineups requires an account with Email or Steam.'
    authStore.isAuthModalOpen = true
    return
  }
  lineupStore.isAddModalOpen = true
}

const customRoleInput = ref('')

const navLinks = [
  { name: 'Radar', path: '/', icon: MapIcon },
  { name: 'Live Tactics', path: '/tactics', icon: PenTool },
  { name: 'Callouts', path: '/callouts', icon: Layers },
  { name: 'Stratbook', path: '/strats', icon: BookOpen },
  { name: 'Library', path: '/library', icon: Grid },
  { name: 'My Book', path: '/my-lineups', icon: BookMarked },
  { name: 'Updates', path: '/updates', icon: Newspaper }
]

const inGameRoles = ['IGL', 'Entry Fragger', 'Support', 'AWPer', 'Lurker', 'Anchor', 'Flex']

async function changeRole(role: string) {
  if (authStore.currentUser && role.trim()) {
    await authStore.updateProfile({ inGameRole: role.trim() })
  }
}

async function handleSaveCustomRole() {
  if (customRoleInput.value.trim()) {
    await changeRole(customRoleInput.value.trim())
    customRoleInput.value = ''
  }
}

const ACTIVE_DUTY_IDS = new Set(['mirage', 'dust2', 'inferno', 'nuke', 'ancient', 'anubis', 'cache'])

function getMapPoolBadge(map: typeof mapStore.availableMaps[number]): {
  label: 'Active' | 'Reserve' | 'Classic' | 'Custom'
  classes: string
} {
  if (map.isCustom) {
    return {
      label: 'Custom',
      classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    }
  }
  const isActive = map.activePool || ACTIVE_DUTY_IDS.has(map.id)
  if (isActive && map.id !== 'train') {
    return {
      label: 'Active',
      classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    }
  }
  if (map.poolCategory === 'Classic Competitive' || map.id === 'cobblestone') {
    return {
      label: 'Classic',
      classes: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
    }
  }
  return {
    label: 'Reserve',
    classes: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
  }
}

const currentMapBadge = computed(() => getMapPoolBadge(mapStore.currentMap))

const sortedDropdownMaps = computed(() => {
  const rank = (m: typeof mapStore.availableMaps[number]) => {
    const b = getMapPoolBadge(m).label
    if (b === 'Active') return 0
    if (b === 'Reserve') return 1
    if (b === 'Classic') return 2
    return 3
  }
  return [...mapStore.availableMaps].sort((a, b) => rank(a) - rank(b))
})

function selectMap(mapId: string) {
  mapStore.setMap(mapId)
  isMapDropdownOpen.value = false
}

function handleLogout() {
  authStore.logout()
  isUserDropdownOpen.value = false
}

const unreadMessageCount = ref(0)

function handleGlobalClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (isUserDropdownOpen.value && !target.closest('.user-dropdown-container')) {
    isUserDropdownOpen.value = false
  }
  if (isMapDropdownOpen.value && !target.closest('.map-dropdown-container')) {
    isMapDropdownOpen.value = false
  }
  if (isToolsDropdownOpen.value && !target.closest('.tools-dropdown-container')) {
    isToolsDropdownOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleGlobalClick)

  const socket = gameRoomStore.getSocket()
  if (socket) {
    socket.on('dm:new', (msg: any) => {
      if (!isPeopleGroupsOpen.value && msg.senderId !== authStore.currentUser?.id && (msg.recipientId === authStore.currentUser?.id || !msg.recipientId)) {
        unreadMessageCount.value++
      }
    })
    socket.on('group:msg', (msg: any) => {
      if (!isPeopleGroupsOpen.value && msg.senderId !== authStore.currentUser?.id) {
        unreadMessageCount.value++
      }
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
})
</script>

<template>
  <header
    class="navbar-wrapper w-full backdrop-blur-2xl bg-slate-950/80 border-b border-white/[0.07] sticky top-0"
    style="z-index: 999999 !important; position: sticky;"
  >
    <!-- GUEST PREVIEW MODE BANNER (ACTIVE WHEN ADMIN TOGGLES GUEST VIEW) -->
    <div
      v-if="authStore.isGuestPreviewMode"
      class="bg-amber-950/90 border-b border-amber-500/30 text-amber-200 px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2"
    >
      <div class="flex items-center gap-2">
        <UserX class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span>
          <strong class="text-white font-semibold">Guest Preview Mode:</strong>
          Viewing site as an unverified guest (view-only tactics, save limits).
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="authStore.toggleUserPreviewMode()"
          class="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
        >
          Switch to User Mode
        </button>
        <button
          @click="authStore.resetPreviewModes()"
          class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
        >
          Exit to Admin Mode
        </button>
      </div>
    </div>

    <!-- USER PREVIEW MODE BANNER (ACTIVE WHEN ADMIN TOGGLES USER VIEW) -->
    <div
      v-if="authStore.isUserPreviewMode"
      class="bg-purple-950/90 border-b border-purple-500/30 text-purple-200 px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2"
    >
      <div class="flex items-center gap-2">
        <Eye class="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span>
          <strong class="text-white font-semibold">User Preview Mode:</strong>
          Viewing site and live board as a standard verified player.
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="authStore.toggleGuestPreviewMode()"
          class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
        >
          Switch to Guest Mode
        </button>
        <button
          @click="authStore.resetPreviewModes()"
          class="px-2.5 py-1 bg-purple-500 hover:bg-purple-400 text-slate-950 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
        >
          Exit to Admin Mode
        </button>
      </div>
    </div>

    <!-- MAIN APPLE-STYLE FROSTED HEADER BAR -->
    <div class="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
      <!-- LEFT CLUSTER: MINIMAL BRAND MARK + CLEAN MAP SELECTOR PILL -->
      <div class="flex items-center gap-3 shrink-0">
        <router-link to="/" class="flex items-center gap-2.5 group cursor-pointer">
          <img
            src="/logo.png"
            alt="Protutech"
            class="w-7 h-7 rounded-lg object-cover border border-white/15 group-hover:scale-105 transition-transform flex-shrink-0"
          />
          <span class="text-sm font-semibold tracking-tight text-white group-hover:text-amber-400 transition-colors">
            Protutech
          </span>
        </router-link>

        <div class="h-4 w-px bg-white/10 hidden sm:block"></div>

        <!-- MAP SELECTOR PILL -->
        <div class="relative map-dropdown-container">
          <button
            @click="isMapDropdownOpen = !isMapDropdownOpen"
            class="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full text-xs font-medium text-slate-100 transition-all cursor-pointer"
          >
            <img
              v-if="mapStore.currentMap.icon"
              :src="mapStore.currentMap.icon"
              :alt="mapStore.currentMap.name"
              class="w-4 h-4 object-contain"
            />
            <span v-else class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span class="font-semibold text-white">{{ mapStore.currentMap.name }}</span>
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px] font-medium border hidden sm:inline-block',
                currentMapBadge.classes
              ]"
            >
              {{ currentMapBadge.label }}
            </span>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400" />
          </button>

          <!-- MAP DROPDOWN MENU -->
          <div
            v-if="isMapDropdownOpen"
            class="absolute top-full left-0 mt-2 w-68 bg-slate-900/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col py-1.5 animate-fade-in"
          >
            <div class="px-3.5 py-1.5 text-[11px] font-medium text-slate-400 border-b border-white/[0.07] flex items-center justify-between">
              <span>Select Map</span>
              <button
                @click="mapStore.isMapSettingsOpen = true; isMapDropdownOpen = false"
                class="text-amber-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Settings2 class="w-3 h-3" />
                <span>Custom Radars</span>
              </button>
            </div>

            <div class="max-h-80 overflow-y-auto py-1">
              <button
                v-for="map in sortedDropdownMaps"
                :key="map.id"
                @click="selectMap(map.id)"
                :class="[
                  'w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-left transition-colors cursor-pointer',
                  mapStore.currentMapId === map.id
                    ? 'bg-white/[0.08] text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <img
                    v-if="map.icon"
                    :src="map.icon"
                    :alt="map.name"
                    class="w-4 h-4 object-contain flex-shrink-0"
                  />
                  <span>{{ map.name }}</span>
                </div>

                <span
                  :class="[
                    'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                    getMapPoolBadge(map).classes
                  ]"
                >
                  {{ getMapPoolBadge(map).label }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CENTER CLUSTER: SEGMENTED NAVIGATION PILL -->
      <nav
        :class="[
          themeStore.isPhoneMode ? 'hidden' : 'hidden lg:flex',
          'items-center gap-0.5 p-1 bg-white/[0.04] rounded-full border border-white/[0.07]'
        ]"
      >
        <router-link
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
            route.path === link.path
              ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
          ]"
        >
          <component :is="link.icon" class="w-3.5 h-3.5 opacity-85" />
          <span>{{ link.name }}</span>
        </router-link>
      </nav>

      <!-- RIGHT CLUSTER: DECLUTTERED — ONLY 3 CLEAN CONTROLS -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- 1. SYNC / PHONE STATUS PILL (+ DISCONNECT IF PAIRED) -->
        <div class="hidden sm:flex items-center gap-1">
          <button
            @click="lineupStore.syncWithServer()"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 transition-all cursor-pointer"
            :title="lineupStore.lastSyncTime ? `Last synced at ${lineupStore.lastSyncTime} — Click to sync now` : 'Click to sync lineups with server'"
          >
            <span
              :class="[
                'w-2 h-2 rounded-full',
                lineupStore.syncStatus === 'syncing'
                  ? 'bg-amber-400 animate-pulse'
                  : lineupStore.syncStatus === 'offline'
                    ? 'bg-rose-400'
                    : 'bg-emerald-400'
              ]"
            ></span>
            <span class="hidden xl:inline text-[11px] text-slate-300">
              {{
                companionStore.isPaired
                  ? 'Phone Live'
                  : lineupStore.syncStatus === 'syncing'
                    ? 'Syncing'
                    : lineupStore.syncStatus === 'offline'
                      ? 'Offline'
                      : 'Synced'
              }}
            </span>
          </button>

          <button
            v-if="companionStore.isPaired"
            @click.stop="companionStore.disconnectPhone()"
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
            title="Disconnect Paired Phone"
          >
            <WifiOff class="w-3 h-3" />
            <span class="hidden md:inline">Disconnect Phone</span>
          </button>
        </div>

        <!-- 2. TOOLS & WORKSPACE POPOVER MENU (APPLE CONTROL-CENTER STYLE) -->
        <div class="relative tools-dropdown-container">
          <button
            @click="isToolsDropdownOpen = !isToolsDropdownOpen"
            class="relative flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full text-xs font-medium text-slate-200 transition-all cursor-pointer"
            title="Tools & Workspace Control Center"
          >
            <SlidersHorizontal class="w-3.5 h-3.5 text-slate-300" />
            <span class="hidden md:inline">Tools</span>
            <span
              v-if="(themeStore.showUnreadNotificationBadge && unreadMessageCount > 0) || voiceStore.isListening"
              class="w-2 h-2 rounded-full bg-amber-400"
            ></span>
          </button>

          <!-- APPLE CONTROL-CENTER POPOVER -->
          <div
            v-if="isToolsDropdownOpen"
            class="absolute top-full right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl p-3 z-50 flex flex-col gap-3 animate-fade-in text-xs"
          >
            <div class="flex items-center justify-between px-1">
              <span class="text-[11px] font-semibold text-slate-400 tracking-tight">Tools &amp; Workspace</span>
              <button
                @click="lineupStore.syncWithServer()"
                class="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline cursor-pointer"
              >
                <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': lineupStore.syncStatus === 'syncing' }" />
                <span>{{ lineupStore.syncStatus === 'syncing' ? 'Syncing...' : 'Sync Server' }}</span>
              </button>
            </div>

            <!-- QUICK TILES GRID -->
            <div class="grid grid-cols-2 gap-1.5">
              <!-- Practice Server & CFG -->
              <button
                @click="isPracticeModalOpen = true; isToolsDropdownOpen = false"
                class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors cursor-pointer"
              >
                <div class="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <Gamepad2 class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold text-white truncate">Practice CFG</div>
                  <div class="text-[10px] text-slate-400 truncate">Server &amp; Binds</div>
                </div>
              </button>

              <!-- Phone StreamDeck Remote -->
              <button
                @click="isRemoteModalOpen = true; isToolsDropdownOpen = false"
                class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors cursor-pointer"
              >
                <div class="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                  <Smartphone class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold text-white truncate">
                    {{ companionStore.isPaired ? 'Phone Connected' : 'Phone Deck' }}
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">Touch Remote</div>
                </div>
              </button>

              <!-- Voice Navigation -->
              <button
                @click="voiceStore.isPanelOpen = true; isToolsDropdownOpen = false"
                class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors cursor-pointer"
              >
                <div class="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
                  <Mic class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold text-white truncate">
                    {{ voiceStore.isListening ? 'Listening...' : 'Voice Nav' }}
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">Hands-Free</div>
                </div>
              </button>

              <!-- People & Squads -->
              <button
                @click="isPeopleGroupsOpen = true; unreadMessageCount = 0; isToolsDropdownOpen = false"
                class="relative flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors cursor-pointer"
              >
                <div class="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Users class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold text-white truncate">Squads</div>
                  <div class="text-[10px] text-slate-400 truncate">People &amp; Chat</div>
                </div>
                <span
                  v-if="themeStore.showUnreadNotificationBadge && unreadMessageCount > 0"
                  class="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-[9px] font-bold text-white"
                >
                  {{ unreadMessageCount > 9 ? '9+' : unreadMessageCount }}
                </span>
              </button>

              <!-- Desktop / Mobile Layout Mode -->
              <button
                @click="themeStore.togglePhoneMode(); isToolsDropdownOpen = false"
                class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors cursor-pointer"
              >
                <div class="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                  <Smartphone v-if="themeStore.isPhoneMode" class="w-4 h-4" />
                  <Monitor v-else class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold text-white truncate">
                    {{ themeStore.isPhoneMode ? 'Mobile View' : 'Desktop View' }}
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">Switch Layout</div>
                </div>
              </button>

              <!-- Install App -->
              <button
                @click="isInstallAppModalOpen = true; isToolsDropdownOpen = false"
                class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-left transition-colors cursor-pointer"
              >
                <div class="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <Monitor class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold text-white truncate">
                    {{ pwaStore.isStandaloneMode ? 'App Installed' : 'Install App' }}
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">Desktop &amp; PWA</div>
                </div>
              </button>
            </div>

            <!-- APPEARANCE: THEME DARK/LIGHT & PALETTE SWITCHER -->
            <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-medium text-slate-400">Appearance</span>
                <div class="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-white/[0.07]">
                  <button
                    @click="themeStore.setTheme('dark')"
                    :class="[
                      'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer',
                      themeStore.theme === 'dark'
                        ? 'bg-white/[0.12] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    ]"
                  >
                    <Moon class="w-3 h-3" />
                    <span>Dark</span>
                  </button>
                  <button
                    @click="themeStore.setTheme('light')"
                    :class="[
                      'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer',
                      themeStore.theme === 'light'
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    ]"
                  >
                    <Sun class="w-3 h-3" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              <select
                :value="themeStore.palette"
                @change="(e) => themeStore.setPalette((e.target as HTMLSelectElement).value as any)"
                aria-label="Switch Theme Palette"
                class="w-full bg-slate-950/90 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/[0.08] outline-none cursor-pointer"
              >
                <option value="protutech-obsidian" class="bg-slate-900 text-white">Obsidian Neon</option>
                <option value="adobe-classic" class="bg-slate-900 text-white">Adobe Classic</option>
                <option value="cyber-emerald" class="bg-slate-900 text-white">Cyber Emerald</option>
                <option value="sunset-ember" class="bg-slate-900 text-white">Sunset Ember</option>
              </select>
            </div>

            <!-- COMMUNITY & REPOSITORY LINKS -->
            <div class="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.07]">
              <a
                href="https://github.com/IAndrexI/CS2Nades"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
              >
                <span>GitHub</span>
                <ExternalLink class="w-3 h-3 opacity-70" />
              </a>
              <a
                href="https://discord.gg/XEDqfYEW5h"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
              >
                <span>Discord</span>
                <ExternalLink class="w-3 h-3 opacity-70" />
              </a>
            </div>
          </div>
        </div>

        <!-- 3. PRIMARY CREATE LINEUP BUTTON + USER PROFILE AVATAR -->
        <button
          @click="handleNewNadeClick"
          class="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-950 text-xs rounded-full shadow-sm transition-all cursor-pointer hover:opacity-95"
          :style="{ backgroundColor: themeStore.customAccentColor }"
        >
          <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
          <span class="hidden sm:inline">Create Lineup</span>
        </button>

        <!-- USER PROFILE / SIGN IN -->
        <div class="relative user-dropdown-container" style="z-index: 999999 !important;">
          <template v-if="authStore.isAuthenticated">
            <button
              @click="isUserDropdownOpen = !isUserDropdownOpen"
              class="flex items-center gap-2 p-1 pr-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <div class="relative">
                <img
                  :src="authStore.currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${authStore.currentUser?.username}`"
                  class="w-6 h-6 rounded-full bg-slate-950 border border-white/15 object-cover flex-shrink-0"
                />
                <span
                  :class="[
                    'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950',
                    authStore.currentUserStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                  ]"
                ></span>
              </div>
              <span class="text-white text-xs font-medium truncate max-w-[84px] hidden sm:inline">
                {{ authStore.currentUser?.username }}
              </span>
            </button>

            <!-- USER DROPDOWN -->
            <div
              v-if="isUserDropdownOpen"
              class="absolute top-full right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col py-1.5 animate-fade-in text-xs"
              style="z-index: 9999999 !important;"
            >
              <div class="p-3 border-b border-white/[0.07] flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-white text-sm">{{ authStore.currentUser?.username }}</span>
                  <span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-medium uppercase">
                    {{ authStore.currentUser?.role }}
                  </span>
                </div>
                <div class="flex items-center justify-between pt-1">
                  <span class="text-[11px] text-slate-400">Tactical Role</span>
                  <span class="text-[11px] text-amber-400 font-medium">{{ authStore.currentUser?.inGameRole || 'Player' }}</span>
                </div>
              </div>

              <!-- ROLE SELECTOR LIST -->
              <div class="p-2.5 border-b border-white/[0.07] flex flex-col gap-2">
                <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider px-1">Tactical Role</span>
                <div class="grid grid-cols-2 gap-1">
                  <button
                    v-for="r in inGameRoles"
                    :key="r"
                    @click="changeRole(r)"
                    :class="[
                      'px-2 py-1 rounded-lg text-[11px] font-medium text-left transition-colors cursor-pointer',
                      authStore.currentUser?.inGameRole === r
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                    ]"
                  >
                    {{ r }}
                  </button>
                </div>

                <div class="flex items-center gap-1 mt-1 pt-1.5 border-t border-white/[0.06]">
                  <input
                    v-model="customRoleInput"
                    @keyup.enter="handleSaveCustomRole"
                    type="text"
                    placeholder="Custom role..."
                    class="flex-grow bg-slate-950 border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    @click="handleSaveCustomRole"
                    class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-[11px] cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              </div>

              <button
                @click="isUserSettingsOpen = true; isUserDropdownOpen = false"
                class="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors w-full text-left cursor-pointer"
              >
                <Settings2 class="w-4 h-4 text-slate-400" />
                <span>Profile &amp; Settings</span>
              </button>

              <button
                @click="isDirectMessagesOpen = true; isUserDropdownOpen = false"
                class="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors w-full text-left cursor-pointer"
              >
                <MessageSquare class="w-4 h-4 text-slate-400" />
                <span>Private Messages</span>
              </button>

              <router-link
                to="/game-room"
                @click="isUserDropdownOpen = false"
                class="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <Radio class="w-4 h-4 text-emerald-400" />
                <span>Tactical Live Room</span>
              </router-link>

              <router-link
                to="/my-lineups"
                @click="isUserDropdownOpen = false"
                class="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <BookMarked class="w-4 h-4 text-amber-400" />
                <span>My Personal Book</span>
              </router-link>

              <router-link
                v-if="authStore.isAdmin"
                to="/admin"
                @click="isUserDropdownOpen = false"
                class="flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
              >
                <ShieldCheck class="w-4 h-4 text-amber-400" />
                <span>Admin Dashboard</span>
              </router-link>

              <div v-if="authStore.isActualAdmin" class="flex flex-col border-t border-white/[0.07] bg-slate-950/40">
                <button
                  @click="authStore.toggleUserPreviewMode()"
                  class="flex items-center justify-between px-3.5 py-2 text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors w-full text-left cursor-pointer"
                >
                  <div class="flex items-center gap-2">
                    <Eye class="w-4 h-4 text-purple-400" />
                    <span>Preview User Mode</span>
                  </div>
                  <span :class="['px-1.5 py-0.5 rounded text-[10px] font-medium', authStore.isUserPreviewMode ? 'bg-purple-500 text-slate-950 font-semibold' : 'bg-white/[0.06] text-slate-400']">
                    {{ authStore.isUserPreviewMode ? 'On' : 'Off' }}
                  </span>
                </button>

                <button
                  @click="authStore.toggleGuestPreviewMode()"
                  class="flex items-center justify-between px-3.5 py-2 text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors w-full text-left cursor-pointer"
                >
                  <div class="flex items-center gap-2">
                    <UserX class="w-4 h-4 text-amber-400" />
                    <span>Preview Guest Mode</span>
                  </div>
                  <span :class="['px-1.5 py-0.5 rounded text-[10px] font-medium', authStore.isGuestPreviewMode ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-white/[0.06] text-slate-400']">
                    {{ authStore.isGuestPreviewMode ? 'On' : 'Off' }}
                  </span>
                </button>
              </div>

              <button
                @click="handleLogout"
                class="flex items-center gap-2.5 px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors w-full text-left border-t border-white/[0.07] cursor-pointer"
              >
                <LogOut class="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </template>

          <template v-else>
            <button
              @click="authStore.authMode = 'steam'; authStore.isAuthModalOpen = true"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 hover:text-white text-xs font-medium rounded-full transition-colors cursor-pointer"
            >
              <User class="w-3.5 h-3.5 text-amber-400" />
              <span class="hidden sm:inline">Sign In</span>
            </button>
          </template>
        </div>

        <!-- MOBILE HAMBURGER MENU BUTTON -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          :class="themeStore.isPhoneMode ? 'flex' : 'lg:hidden flex'"
          class="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 rounded-full items-center justify-center cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu v-if="!isMobileMenuOpen" class="w-4 h-4" />
          <X v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- MOBILE NAVIGATION DRAWER -->
    <div
      v-if="isMobileMenuOpen"
      :class="themeStore.isPhoneMode ? 'flex' : 'lg:hidden flex'"
      class="border-t border-white/[0.07] bg-slate-950/95 backdrop-blur-2xl p-3 flex-col gap-1.5 animate-fade-in max-h-[82vh] overflow-y-auto"
    >
      <router-link
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        @click="isMobileMenuOpen = false"
        :class="[
          'flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all',
          route.path === link.path
            ? 'bg-white/[0.1] text-white font-semibold'
            : 'text-slate-300 hover:bg-white/[0.04]'
        ]"
      >
        <component :is="link.icon" class="w-4 h-4" />
        <span>{{ link.name }}</span>
      </router-link>

      <div class="my-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium text-slate-400">Appearance</span>
          <div class="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-white/[0.07]">
            <button
              @click="themeStore.setTheme('dark')"
              :class="[
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1',
                themeStore.theme === 'dark'
                  ? 'bg-white/[0.12] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              <Moon class="w-3 h-3" />
              <span>Dark</span>
            </button>
            <button
              @click="themeStore.setTheme('light')"
              :class="[
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1',
                themeStore.theme === 'light'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              <Sun class="w-3 h-3" />
              <span>Light</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODALS -->
    <InstallAppModal
      :is-open="isInstallAppModalOpen"
      @close="isInstallAppModalOpen = false"
    />
    <DataSyncModal
      :is-open="isDataModalOpen"
      @close="isDataModalOpen = false"
    />
    <MapSettingsModal
      :is-open="mapStore.isMapSettingsOpen"
      @close="mapStore.isMapSettingsOpen = false"
    />
    <UserSettingsModal
      :is-open="isUserSettingsOpen"
      @close="isUserSettingsOpen = false"
    />
    <DirectMessagesModal
      :is-open="isDirectMessagesOpen"
      :initial-target-user-id="directMessageTargetId"
      @close="isDirectMessagesOpen = false; directMessageTargetId = undefined"
    />
    <PeopleAndGroupsModal
      :is-open="isPeopleGroupsOpen"
      @close="isPeopleGroupsOpen = false"
      @open-dm="openDirectMessageWith"
      @join-room="handleJoinRoomFromPeople"
    />
    <PracticeServerModal
      :is-open="isPracticeModalOpen"
      @close="isPracticeModalOpen = false"
    />
    <RemotePairModal
      :is-open="isRemoteModalOpen"
      @close="isRemoteModalOpen = false"
    />
    <LineupConflictModal />
  </header>
</template>
