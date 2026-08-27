<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useAdminStore } from '../stores/adminStore'
import { useLineupStore } from '../stores/lineupStore'
import { useGameRoomStore } from '../stores/gameRoomStore'
import axios from 'axios'
import { 
  ShieldCheck, 
  Sliders, 
  Users, 
  Layers, 
  Server, 
  Check, 
  Trash2, 
  Edit3, 
  Key, 
  Sparkles,
  Lock,
  Download,
  AlertCircle,
  Radio,
  Ghost,
  RefreshCw,
  UserPlus,
  UserX,
  Eye,
  LogIn,
  Copy,
  X
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const adminStore = useAdminStore()
const lineupStore = useLineupStore()

const activeTab = ref<'branding' | 'users' | 'groups' | 'rooms' | 'system'>('branding')
const saveSuccess = ref(false)

const openRooms = ref<any[]>([])
const isLoadingRooms = ref(false)

async function fetchOpenRooms() {
  isLoadingRooms.value = true
  try {
    const res = await axios.get('/api/admin/rooms')
    openRooms.value = res.data
  } catch (e) {
    console.error('Failed to load open channels', e)
  } finally {
    isLoadingRooms.value = false
  }
}

async function handleCloseAdminRoom(code: string) {
  const ok = await confirmAction({
    title: 'Close Channel / Room?',
    message: `Are you sure you want to forcibly close room "${code}"? All active participants will be disconnected.`,
    confirmLabel: 'Close Room',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    try {
      await axios.delete(`/api/admin/rooms/${code}`)
      await fetchOpenRooms()
    } catch (e) {}
  }
}

function handleJoinAdminRoom(code: string, isGhost = false) {
  router.push(`/tactics?room=${code}`)
}

// Squad group form
const newGroupName = ref('')
const newGroupDescription = ref('')
const newGroupMembers = ref('')

const brandingForm = reactive({
  siteTitle: adminStore.settings.siteTitle,
  teamName: adminStore.settings.teamName,
  logoUrl: adminStore.settings.logoUrl || '',
  primaryAccentColor: adminStore.settings.primaryAccentColor,
  allowRegistration: adminStore.settings.allowRegistration,
  defaultRadarOpacity: adminStore.settings.defaultRadarOpacity,
  defaultRadarMode: adminStore.settings.defaultRadarMode
})

const presetColors = [
  { name: 'CS2 Gold', hex: '#de9b35' },
  { name: 'Cyber Cyan', hex: '#00f0ff' },
  { name: 'Tactical Emerald', hex: '#10b981' },
  { name: 'Crimson Flame', hex: '#f43f5e' },
  { name: 'Electric Purple', hex: '#a855f7' },
  { name: 'Amber Glow', hex: '#f59e0b' }
]

// User management state
const editingUserId = ref<string | null>(null)
const editUserRole = ref<string>('player')
const resetPasswordUserId = ref<string | null>(null)
const newPasswordInput = ref<string>('')
const userSearchQuery = ref<string>('')
const userStatusFilter = ref<'all' | 'online' | 'away' | 'offline' | 'admin' | 'guest'>('all')

const filteredUsers = computed(() => {
  return (adminStore.usersList as any[]).filter(user => {
    // Status filter
    const status = user.status || authStore.getUserStatus(user.username) || 'offline'
    if (userStatusFilter.value === 'online' && status !== 'online') return false
    if (userStatusFilter.value === 'away' && status !== 'away') return false
    if (userStatusFilter.value === 'offline' && status !== 'offline') return false
    if (userStatusFilter.value === 'admin' && user.role !== 'admin') return false
    if (userStatusFilter.value === 'guest' && user.role !== 'guest' && !user.isGuest) return false

    // Search query
    if (userSearchQuery.value.trim()) {
      const q = userSearchQuery.value.toLowerCase().trim()
      const matchName = user.username?.toLowerCase().includes(q)
      const matchEmail = user.email?.toLowerCase().includes(q)
      const matchRole = user.role?.toLowerCase().includes(q) || user.inGameRole?.toLowerCase().includes(q)
      const matchSteam = user.steamId?.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchRole && !matchSteam) return false
    }
    return true
  })
})

function formatLastSeen(lastSeen?: number | null, status?: string): string {
  if (status === 'online') return 'Active now'
  if (status === 'away') return 'Away'
  if (!lastSeen) return 'Never'
  const diffSec = Math.floor((Date.now() - Number(lastSeen)) / 1000)
  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

// Temp Account Creation State for Admin Testing
const isTempAccountModalOpen = ref(false)
const tempAccountType = ref<'guest' | 'verified_user'>('guest')
const tempCustomUsername = ref('')
const isCreatingTemp = ref(false)
const createdTempResult = ref<any | null>(null)
const tempCopiedToast = ref('')

async function handleCreateTempAccount() {
  isCreatingTemp.value = true
  try {
    const data = await authStore.createTempAccount(tempAccountType.value, tempCustomUsername.value.trim() || undefined)
    createdTempResult.value = data
    await adminStore.fetchUsers()
  } catch (e: any) {
    alert(e.response?.data?.error || 'Failed to generate test account')
  } finally {
    isCreatingTemp.value = false
  }
}

function handleLoginAsTempNow() {
  if (!createdTempResult.value) return
  authStore.loginAsTemp(createdTempResult.value.token, createdTempResult.value.user)
  isTempAccountModalOpen.value = false
  router.push('/')
}

onMounted(async () => {
  await adminStore.fetchSettings()
  await adminStore.fetchUsers()
  brandingForm.siteTitle = adminStore.settings.siteTitle
  brandingForm.teamName = adminStore.settings.teamName
  brandingForm.primaryAccentColor = adminStore.settings.primaryAccentColor
  brandingForm.allowRegistration = adminStore.settings.allowRegistration
  brandingForm.defaultRadarOpacity = adminStore.settings.defaultRadarOpacity
})

async function handleSaveBranding() {
  await adminStore.saveSettings(brandingForm)
  saveSuccess.value = true
  setTimeout(() => { saveSuccess.value = false }, 3000)
}

async function handleUpdateUserRole(userId: string, role: string) {
  await adminStore.updateUser(userId, { role })
  editingUserId.value = null
}

async function handleResetPassword(userId: string) {
  if (!newPasswordInput.value.trim()) return
  await adminStore.updateUser(userId, { newPassword: newPasswordInput.value.trim() })
  resetPasswordUserId.value = null
  newPasswordInput.value = ''
  alert('User password updated successfully!')
}

import { useConfirmDialog } from '../composables/useConfirmDialog'

const { confirmAction } = useConfirmDialog()

async function handleDeleteUser(userId: string, username: string) {
  const ok = await confirmAction({
    title: 'Delete User Account?',
    message: `Are you sure you want to permanently delete user "${username}"? All associated data will be removed.`,
    confirmLabel: 'Delete User',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    await adminStore.deleteUser(userId)
  }
}

async function handleAddSquadGroup() {
  if (!newGroupName.value.trim()) return
  const gameRoomStore = useGameRoomStore()
  const members = newGroupMembers.value.split(',').map(m => m.trim()).filter(Boolean)
  await gameRoomStore.createGroup(newGroupName.value.trim(), newGroupDescription.value.trim(), members)
  newGroupName.value = ''
  newGroupDescription.value = ''
  newGroupMembers.value = ''
  alert('Squad Group Created!')
}
</script>

<template>
  <div class="admin-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- ACCESS CHECK -->
    <div 
      v-if="!authStore.isAdmin"
      class="p-12 bg-slate-900/90 border border-slate-800 rounded-3xl text-center flex flex-col items-center gap-4"
    >
      <div class="p-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl">
        <Lock class="w-8 h-8" />
      </div>
      <h2 class="text-lg font-black text-white uppercase">Admin Authentication Required</h2>
      <p class="text-xs text-slate-400 max-w-md">
        You must be signed in with an administrator account to access the website branding, user roles, and display configuration panel.
      </p>
      <button
        @click="authStore.authMode = 'login'; authStore.isAuthModalOpen = true"
        class="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer"
      >
        Sign In as Admin
      </button>
    </div>

    <template v-else>
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
        <div class="flex items-center gap-3">
          <div class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shadow-lg">
            <ShieldCheck class="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-black uppercase text-white tracking-wide">Administrator Panel</h1>
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
                ROOT ACCESS
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              Customize website display, manage user permissions, and configure self-hosted server options
            </p>
          </div>
        </div>

        <div v-if="saveSuccess" class="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl">
          <Check class="w-4 h-4 stroke-[3]" />
          <span>Settings Applied!</span>
        </div>
      </div>

      <!-- ADMIN TABS -->
      <div class="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
        <button
          @click="activeTab = 'branding'"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer',
            activeTab === 'branding' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>Display & Branding</span>
        </button>

        <button
          @click="activeTab = 'users'"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer',
            activeTab === 'users' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          <Users class="w-3.5 h-3.5" />
          <span>User Accounts ({{ adminStore.usersList.length }})</span>
        </button>

        <button
          @click="activeTab = 'groups'"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer',
            activeTab === 'groups' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Squad Groups (Auto-Allow)</span>
        </button>

        <button
          @click="activeTab = 'rooms'; fetchOpenRooms()"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer',
            activeTab === 'rooms' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-purple-400 hover:text-purple-300'
          ]"
        >
          <Radio class="w-3.5 h-3.5" />
          <span>Open Channels & Live Rooms ({{ openRooms.length }})</span>
        </button>

        <button
          @click="activeTab = 'system'"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer',
            activeTab === 'system' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
          ]"
        >
          <Server class="w-3.5 h-3.5" />
          <span>Proxmox & Portainer Storage</span>
        </button>
      </div>

      <!-- TAB 1: DISPLAY & BRANDING -->
      <div v-if="activeTab === 'branding'" class="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-6 text-xs text-slate-200 shadow-xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- SITE TITLE -->
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Website Title</label>
            <input 
              v-model="brandingForm.siteTitle" 
              type="text" 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          <!-- TEAM NAME -->
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Team / Organization Name</label>
            <input 
              v-model="brandingForm.teamName" 
              type="text" 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- THEME ACCENT COLOR -->
        <div class="flex flex-col gap-2.5 p-4 bg-slate-950 border border-slate-800 rounded-xl">
          <label class="font-bold text-slate-300 flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-amber-400" />
            <span>Theme Accent Color</span>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button
              v-for="color in presetColors"
              :key="color.hex"
              @click="brandingForm.primaryAccentColor = color.hex"
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer',
                brandingForm.primaryAccentColor === color.hex ? 'border-white bg-slate-800 shadow-md' : 'border-slate-800 bg-slate-900 text-slate-400'
              ]"
            >
              <span class="w-3.5 h-3.5 rounded-full shadow-sm" :style="{ backgroundColor: color.hex }"></span>
              <span>{{ color.name }}</span>
            </button>
            <input 
              v-model="brandingForm.primaryAccentColor" 
              type="color" 
              class="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
            />
          </div>
        </div>

        <!-- RADAR DISPLAY OPTIONS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-950 border border-slate-800 rounded-xl">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between font-bold">
              <span class="text-slate-300">Default Radar Brightness / Opacity:</span>
              <span class="text-amber-400 font-mono">{{ Math.round(brandingForm.defaultRadarOpacity * 100) }}%</span>
            </div>
            <input 
              v-model.number="brandingForm.defaultRadarOpacity" 
              type="range" 
              min="0.3" 
              max="1.0" 
              step="0.05"
              class="w-full accent-amber-500 cursor-pointer mt-1"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-bold text-slate-300">Allow Public User Registrations</label>
            <div class="flex items-center gap-3 mt-1">
              <button
                type="button"
                @click="brandingForm.allowRegistration = !brandingForm.allowRegistration"
                :class="[
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  brandingForm.allowRegistration 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                ]"
              >
                {{ brandingForm.allowRegistration ? '✓ Registrations Open' : '✕ Registrations Disabled (Invite Only)' }}
              </button>
            </div>
          </div>
        </div>

        <!-- SAVE BUTTON -->
        <div class="flex justify-end pt-2">
          <button
            @click="handleSaveBranding"
            class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Check class="w-4 h-4 stroke-[3]" />
            <span>Save & Apply Display Settings</span>
          </button>
        </div>
      </div>

      <!-- TAB 2: USER ACCOUNTS MANAGEMENT (ALL ONLINE & OFFLINE USERS) -->
      <div v-else-if="activeTab === 'users'" class="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-5 shadow-xl">
        <!-- HEADER & REFRESH -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-black uppercase tracking-wider text-white">All Platform Users & Members</h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Inspect all registered accounts, live online/away presence, login methods (Email/Steam/Guest), and permissions.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              @click="isTempAccountModalOpen = true; createdTempResult = null"
              class="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-105"
            >
              <UserPlus class="w-3.5 h-3.5" />
              <span>Create Temp Test Account</span>
            </button>

            <button
              @click="adminStore.fetchUsers()"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow"
            >
              <RefreshCw class="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <!-- STATS BAR & FILTERS -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-1">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Accounts</span>
            <span class="text-lg font-black text-white font-mono">{{ adminStore.usersList.length }}</span>
          </div>
          <div class="p-3 bg-slate-950 border border-emerald-900/40 rounded-xl flex flex-col gap-1">
            <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online Now
            </span>
            <span class="text-lg font-black text-emerald-400 font-mono">
              {{ adminStore.usersList.filter((u: any) => (u.status || authStore.getUserStatus(u.username)) === 'online').length }}
            </span>
          </div>
          <div class="p-3 bg-slate-950 border border-cyan-900/40 rounded-xl flex flex-col gap-1">
            <span class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Guests Online
            </span>
            <span class="text-lg font-black text-cyan-400 font-mono">
              {{ adminStore.usersList.filter((u: any) => u.isGuest && (u.status || authStore.getUserStatus(u.username)) === 'online').length }}
            </span>
          </div>
          <div class="p-3 bg-slate-950 border border-amber-900/40 rounded-xl flex flex-col gap-1">
            <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              Away
            </span>
            <span class="text-lg font-black text-amber-400 font-mono">
              {{ adminStore.usersList.filter((u: any) => (u.status || authStore.getUserStatus(u.username)) === 'away').length }}
            </span>
          </div>
          <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-1">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-slate-600"></span>
              Offline
            </span>
            <span class="text-lg font-black text-slate-400 font-mono">
              {{ adminStore.usersList.filter((u: any) => (u.status || authStore.getUserStatus(u.username)) === 'offline').length }}
            </span>
          </div>
        </div>

        <!-- SEARCH AND STATUS FILTER TABS -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              @click="userStatusFilter = 'all'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                userStatusFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              ]"
            >
              All ({{ adminStore.usersList.length }})
            </button>
            <button
              @click="userStatusFilter = 'online'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                userStatusFilter === 'online' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-emerald-400'
              ]"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Online ({{ adminStore.usersList.filter((u: any) => (u.status || authStore.getUserStatus(u.username)) === 'online').length }})</span>
            </button>
            <button
              @click="userStatusFilter = 'guest'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                userStatusFilter === 'guest' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-cyan-400'
              ]"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>Guests ({{ adminStore.usersList.filter((u: any) => u.isGuest).length }})</span>
            </button>
            <button
              @click="userStatusFilter = 'offline'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                userStatusFilter === 'offline' ? 'bg-slate-700 text-white font-black' : 'text-slate-400 hover:text-white'
              ]"
            >
              Offline
            </button>
            <button
              @click="userStatusFilter = 'admin'"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                userStatusFilter === 'admin' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-amber-400'
              ]"
            >
              Admins
            </button>
          </div>

          <div class="relative w-full sm:w-64">
            <input
              v-model="userSearchQuery"
              type="text"
              placeholder="Search user, email, SteamID..."
              class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- USERS TABLE -->
        <div class="overflow-x-auto border border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase font-mono">
              <tr>
                <th class="p-3.5">User / Account</th>
                <th class="p-3.5">Online Presence</th>
                <th class="p-3.5">Account Tier / Auth</th>
                <th class="p-3.5">In-Game Role</th>
                <th class="p-3.5">System Role</th>
                <th class="p-3.5">Lineups</th>
                <th class="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80 bg-slate-900/60">
              <tr v-if="filteredUsers.length === 0">
                <td colspan="7" class="p-8 text-center text-slate-500 italic">
                  No users found matching your filters.
                </td>
              </tr>
              <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-slate-850 transition-colors">
                <!-- USER INFO -->
                <td class="p-3.5">
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <img 
                        :src="user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`" 
                        class="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 object-cover" 
                      />
                      <span 
                        :class="[
                          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900',
                          (user.status || authStore.getUserStatus(user.username)) === 'online' ? 'bg-emerald-500' :
                          (user.status || authStore.getUserStatus(user.username)) === 'away' ? 'bg-amber-500' : 'bg-slate-600'
                        ]"
                      ></span>
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-white">{{ user.username }}</span>
                        <Crown v-if="user.role === 'admin'" class="w-3 h-3 text-amber-400" />
                      </div>
                      <span class="text-[10px] text-slate-500">{{ user.email || 'No email registered' }}</span>
                    </div>
                  </div>
                </td>

                <!-- PRESENCE STATUS & LAST SEEN -->
                <td class="p-3.5">
                  <div class="flex flex-col">
                    <span 
                      :class="[
                        'inline-flex items-center gap-1 text-[11px] font-bold font-mono uppercase',
                        (user.status || authStore.getUserStatus(user.username)) === 'online' ? 'text-emerald-400' :
                        (user.status || authStore.getUserStatus(user.username)) === 'away' ? 'text-amber-400' : 'text-slate-500'
                      ]"
                    >
                      <span 
                        :class="[
                          'w-1.5 h-1.5 rounded-full',
                          (user.status || authStore.getUserStatus(user.username)) === 'online' ? 'bg-emerald-500 animate-pulse' :
                          (user.status || authStore.getUserStatus(user.username)) === 'away' ? 'bg-amber-500' : 'bg-slate-600'
                        ]"
                      ></span>
                      <span>{{ (user.status || authStore.getUserStatus(user.username)) || 'offline' }}</span>
                    </span>
                    <span class="text-[10px] text-slate-500">
                      {{ formatLastSeen(user.lastSeen, user.status || authStore.getUserStatus(user.username)) }}
                    </span>
                  </div>
                </td>

                <!-- ACCOUNT AUTH TIER -->
                <td class="p-3.5">
                  <div class="flex flex-wrap items-center gap-1">
                    <span 
                      v-if="user.steamId" 
                      class="px-2 py-0.5 rounded bg-[#171a21] border border-[#2a475e] text-[#66c0f4] font-mono text-[10px] font-bold flex items-center gap-1"
                    >
                      <img src="/icons/steam.webp" class="w-3 h-3" />
                      <span>Steam Linked</span>
                    </span>
                    <span 
                      v-if="user.email" 
                      class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1"
                    >
                      <span>✓ Email Verified</span>
                    </span>
                    <span 
                      v-if="!user.steamId && !user.email && user.role !== 'admin'" 
                      class="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold"
                    >
                      Limited Guest
                    </span>
                  </div>
                </td>

                <!-- IN-GAME ROLE -->
                <td class="p-3.5">
                  <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px]">
                    {{ user.inGameRole || 'Player' }}
                  </span>
                </td>

                <!-- SYSTEM ROLE SELECT -->
                <td class="p-3.5">
                  <select 
                    :value="user.role"
                    @change="handleUpdateUserRole(user.id, ($event.target as HTMLSelectElement).value)"
                    class="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="player">Player</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                    <option value="guest">Guest</option>
                  </select>
                </td>

                <!-- LINEUPS COUNT -->
                <td class="p-3.5 font-mono text-slate-400 font-bold">
                  {{ user.lineupsCount || 0 }} nades
                </td>

                <!-- ACTIONS -->
                <td class="p-3.5 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- RESET PASSWORD TRIGGER -->
                    <button
                      @click="resetPasswordUserId = user.id; newPasswordInput = ''"
                      class="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Reset User Password"
                    >
                      <Key class="w-4 h-4" />
                    </button>

                    <!-- DELETE USER -->
                    <button
                      v-if="user.id !== authStore.currentUser?.id"
                      @click="handleDeleteUser(user.id, user.username)"
                      class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- RESET PASSWORD INLINE MODAL -->
        <div 
          v-if="resetPasswordUserId" 
          class="p-4 bg-slate-950 border border-amber-500/40 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in"
        >
          <div class="flex items-center gap-2 text-xs">
            <Key class="w-4 h-4 text-amber-400" />
            <span class="font-bold text-white">Reset Password for User:</span>
            <span class="font-mono text-amber-400 font-bold">{{ adminStore.usersList.find(u => u.id === resetPasswordUserId)?.username }}</span>
          </div>

          <div class="flex items-center gap-2">
            <input 
              v-model="newPasswordInput" 
              type="password" 
              placeholder="Enter new password..." 
              class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button 
              @click="handleResetPassword(resetPasswordUserId)" 
              class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer"
            >
              Save Password
            </button>
            <button 
              @click="resetPasswordUserId = null" 
              class="px-2.5 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 3: SQUAD GROUPS (AUTO-ALLOW ROOM ACCESS) -->
      <div v-else-if="activeTab === 'groups'" class="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-6 shadow-xl text-xs text-slate-300">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-black uppercase tracking-wider text-white">Squad Groups & Auto-Allow Roster</h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Users added to squad groups are automatically allowed into live Game Rooms without host approval.
            </p>
          </div>
        </div>

        <!-- CREATE NEW SQUAD GROUP -->
        <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-3">
          <span class="font-bold text-amber-400 uppercase tracking-wide text-xs">Create Squad Roster Group</span>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input 
              v-model="newGroupName" 
              type="text" 
              placeholder="Group Name (e.g. Main 5-Stack)"
              class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
            <input 
              v-model="newGroupDescription" 
              type="text" 
              placeholder="Description (e.g. Competitive Roster)"
              class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
            <input 
              v-model="newGroupMembers" 
              type="text" 
              placeholder="Usernames (comma separated)"
              class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div class="flex justify-end">
            <button
              @click="handleAddSquadGroup"
              class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md cursor-pointer"
            >
              Add Squad Group
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 4: OPEN CHANNELS & LIVE ROOMS -->
      <div v-else-if="activeTab === 'rooms'" class="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-5 shadow-xl text-xs text-slate-300">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Radio class="w-4 h-4 text-amber-400" />
            <h2 class="text-sm font-black uppercase tracking-wider text-white">Live Channels & Open Rooms</h2>
          </div>
          <button
            @click="fetchOpenRooms"
            :disabled="isLoadingRooms"
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <RefreshCw :class="['w-3.5 h-3.5 text-amber-400', isLoadingRooms ? 'animate-spin' : '']" />
            <span>Refresh Rooms</span>
          </button>
        </div>

        <div v-if="openRooms.length === 0" class="text-center p-8 text-slate-500 italic bg-slate-950/60 rounded-xl border border-slate-800">
          No tactical rooms are currently active on the server.
        </div>

        <div class="grid grid-cols-1 gap-3">
          <div
            v-for="room in openRooms"
            :key="room.code"
            class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black font-mono text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  {{ room.code }}
                </span>
                <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase text-[10px] font-bold">
                  {{ room.mapId }}
                </span>
                <span class="text-xs text-slate-400">Host: <strong class="text-white">{{ room.host }}</strong></span>
              </div>
              <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                <span>Members: <strong class="text-emerald-400">{{ room.membersCount }}</strong></span>
                <span>Drawings / Pins: <strong class="text-amber-400">{{ room.elementsCount }}</strong></span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="handleJoinAdminRoom(room.code, true)"
                class="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Observe room without appearing on roster"
              >
                <Ghost class="w-3.5 h-3.5" />
                <span>Ghost Observe</span>
              </button>

              <button
                @click="handleJoinAdminRoom(room.code, false)"
                class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer"
              >
                Join Room
              </button>

              <button
                @click="handleCloseAdminRoom(room.code)"
                class="p-2 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl transition-all cursor-pointer"
                title="Force close room"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: PROXMOX & SYSTEM STORAGE -->
      <div v-else class="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-4 shadow-xl text-xs text-slate-300">
        <h2 class="text-sm font-black uppercase tracking-wider text-white">Self-Hosted LXC & Database Status</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
            <span class="font-bold text-white text-xs">Persistent Storage Path</span>
            <span class="font-mono text-slate-400 text-[11px] bg-slate-900 p-2 rounded border border-slate-800">
              /app/server/data/db.json
            </span>
            <p class="text-slate-500 text-[11px]">
              Mapped to Docker volume mount for persistent user accounts, custom lineups, and strategies on Proxmox LXC.
            </p>
          </div>

          <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2">
            <span class="font-bold text-white text-xs">Portainer Stack Sync</span>
            <span class="text-emerald-400 font-bold flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Running Node.js + Socket.io Server</span>
            </span>
            <p class="text-slate-500 text-[11px]">
              Ready for single-container deployment or multi-container swarm.
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- TEMP TEST ACCOUNT CREATION MODAL FOR ADMIN -->
    <div
      v-if="isTempAccountModalOpen"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
      @click.self="isTempAccountModalOpen = false"
    >
      <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <UserPlus class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-black uppercase tracking-wider text-white text-sm">Create Temp Testing Account</h3>
              <p class="text-xs text-slate-400">Generate instant test credentials as a Guest or Verified Player.</p>
            </div>
          </div>
          <button
            @click="isTempAccountModalOpen = false"
            class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- STAGE 1: CREATION FORM -->
        <div v-if="!createdTempResult" class="flex flex-col gap-4">
          <!-- ACCOUNT TYPE PICKER -->
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="tempAccountType = 'guest'"
              :class="[
                'p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer',
                tempAccountType === 'guest'
                  ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="font-black text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                  <UserX class="w-4 h-4 text-amber-400" />
                  Temp Guest
                </span>
                <span v-if="tempAccountType === 'guest'" class="w-2 h-2 rounded-full bg-amber-400"></span>
              </div>
              <p class="text-[11px] text-slate-400">
                Tests unverified guest limits: read-only live tactics, spectator mode, no lineup saves.
              </p>
            </button>

            <button
              type="button"
              @click="tempAccountType = 'verified_user'"
              :class="[
                'p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer',
                tempAccountType === 'verified_user'
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="font-black text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                  <ShieldCheck class="w-4 h-4 text-emerald-400" />
                  Temp Verified User
                </span>
                <span v-if="tempAccountType === 'verified_user'" class="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <p class="text-[11px] text-slate-400">
                Tests full platform access: custom lineups, drawing tools, live squad room interactions.
              </p>
            </button>
          </div>

          <!-- CUSTOM USERNAME (OPTIONAL) -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-slate-300">Custom Test Username (Optional)</label>
            <input
              v-model="tempCustomUsername"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
              :placeholder="tempAccountType === 'guest' ? 'e.g. TestGuest_Alpha (or leave empty for auto-generated)' : 'e.g. TestPlayer_Beta (or leave empty for auto-generated)'"
            />
          </div>

          <button
            @click="handleCreateTempAccount"
            :disabled="isCreatingTemp"
            class="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
          >
            <Sparkles class="w-4 h-4" />
            <span>{{ isCreatingTemp ? 'Generating Test Account...' : 'Generate & Activate Account' }}</span>
          </button>
        </div>

        <!-- STAGE 2: ACCOUNT GENERATED SUCCESS -->
        <div v-else class="flex flex-col gap-4 animate-fade-in">
          <div class="p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center gap-2 text-emerald-300 font-black text-xs uppercase">
              <Check class="w-4 h-4 text-emerald-400" />
              <span>Temp Account Created Successfully!</span>
            </div>

            <div class="flex flex-col gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 font-sans">Account Type:</span>
                <span :class="createdTempResult.isGuest ? 'text-amber-400' : 'text-emerald-400 font-bold'">
                  {{ createdTempResult.isGuest ? 'Guest Tester (Limited Access)' : 'Verified Player (Full Access)' }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400 font-sans">Username:</span>
                <span class="text-white font-bold">{{ createdTempResult.user.username }}</span>
              </div>
              <div v-if="!createdTempResult.isGuest" class="flex items-center justify-between">
                <span class="text-slate-400 font-sans">Default Password:</span>
                <span class="text-amber-400 font-bold">{{ createdTempResult.defaultPassword }}</span>
              </div>
              <div v-if="!createdTempResult.isGuest" class="flex items-center justify-between">
                <span class="text-slate-400 font-sans">Email:</span>
                <span class="text-slate-300 text-[11px]">{{ createdTempResult.user.email }}</span>
              </div>
            </div>
          </div>

          <!-- ACTIONS: LOGIN NOW OR CLOSE -->
          <div class="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              @click="handleLoginAsTempNow"
              class="w-full sm:flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn class="w-4 h-4" />
              <span>Login & Test As This User Now</span>
            </button>

            <button
              @click="isTempAccountModalOpen = false; createdTempResult = null"
              class="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
