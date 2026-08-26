<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useAdminStore } from '../stores/adminStore'
import { useLineupStore } from '../stores/lineupStore'
import { useGameRoomStore } from '../stores/gameRoomStore'
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
  AlertCircle
} from 'lucide-vue-next'

const authStore = useAuthStore()
const adminStore = useAdminStore()
const lineupStore = useLineupStore()

const activeTab = ref<'branding' | 'users' | 'groups' | 'system'>('branding')
const saveSuccess = ref(false)

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

      <!-- TAB 2: USER ACCOUNTS MANAGEMENT -->
      <div v-else-if="activeTab === 'users'" class="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-black uppercase tracking-wider text-white">Registered Users & Team Members</h2>
          <span class="text-xs text-slate-400 font-mono">{{ adminStore.usersList.length }} users registered</span>
        </div>

        <div class="overflow-x-auto border border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase font-mono">
              <tr>
                <th class="p-3.5">User</th>
                <th class="p-3.5">In-Game Role</th>
                <th class="p-3.5">System Role</th>
                <th class="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80 bg-slate-900/60">
              <tr v-for="user in adminStore.usersList" :key="user.id" class="hover:bg-slate-850 transition-colors">
                <td class="p-3.5 flex items-center gap-3">
                  <img 
                    :src="user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`" 
                    class="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800" 
                  />
                  <div class="flex flex-col">
                    <span class="font-bold text-white">{{ user.username }}</span>
                    <span class="text-[10px] text-slate-500">{{ user.email || 'No email' }}</span>
                  </div>
                </td>
                <td class="p-3.5">
                  <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px]">
                    {{ user.inGameRole || 'Player' }}
                  </span>
                </td>
                <td class="p-3.5">
                  <span 
                    :class="[
                      'px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase',
                      user.role === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                    ]"
                  >
                    {{ user.role }}
                  </span>
                </td>
                <td class="p-3.5 text-right flex items-center justify-end gap-2">
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

                  <button
                    v-if="user.id !== authStore.currentUser?.id"
                    @click="handleDeleteUser(user.id, user.username)"
                    class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Delete User"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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

      <!-- TAB 4: PROXMOX & SYSTEM STORAGE -->
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
  </div>
</template>
