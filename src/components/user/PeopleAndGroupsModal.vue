<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useGameRoomStore } from '../../stores/gameRoomStore'
import { useThemeStore } from '../../stores/themeStore'
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import axios from 'axios'
import { 
  Users, 
  User, 
  ShieldCheck, 
  Crown, 
  MessageSquare, 
  Radio, 
  Ghost, 
  Plus, 
  Trash2, 
  X, 
  Clock, 
  Sparkles,
  ExternalLink,
  Lock,
  Unlock,
  KeyRound,
  Eye
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'openDm', targetUserId: string): void
  (e: 'joinRoom', roomCode: string, isGhost?: boolean): void
}>()

const authStore = useAuthStore()
const gameRoomStore = useGameRoomStore()
const themeStore = useThemeStore()
const { confirmAction } = useConfirmDialog()

const activeTab = ref<'people' | 'groups' | 'rooms'>('people')
const people = ref<any[]>([])
const searchQuery = ref('')
const isLoading = ref(false)

// Open channels / live rooms for Admin
const openRooms = ref<any[]>([])
const isLoadingRooms = ref(false)

// New Group Form
const isCreatingGroup = ref(false)
const newGroupName = ref('')
const newGroupDesc = ref('')
const newGroupMembers = ref('')

async function fetchPeople() {
  isLoading.value = true
  try {
    const res = await axios.get('/api/dm/users')
    people.value = res.data
    await authStore.fetchPresence()
  } catch (e) {
    console.error('Failed to load users', e)
  } finally {
    isLoading.value = false
  }
}

async function fetchOpenRooms() {
  if (!authStore.isAdmin) return
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

async function handleCreateGroup() {
  if (!newGroupName.value.trim()) return
  const members = newGroupMembers.value.split(',').map(m => m.trim()).filter(Boolean)
  await gameRoomStore.createGroup(newGroupName.value.trim(), newGroupDesc.value.trim(), members)
  newGroupName.value = ''
  newGroupDesc.value = ''
  newGroupMembers.value = ''
  isCreatingGroup.value = false
  await gameRoomStore.fetchGroups()
}

async function handleCloseRoom(code: string) {
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
    } catch (e) {
      console.error('Failed to close room', e)
    }
  }
}

function handleStartSquadRoom(group: any) {
  const roomCode = `PIC-${Math.floor(1000 + Math.random() * 9000)}`
  emit('joinRoom', roomCode, false)
  emit('close')
}

function handleJoinChannel(code: string, isGhost = false) {
  emit('joinRoom', code, isGhost)
  emit('close')
}

const filteredPeople = computed(() => {
  if (!searchQuery.value.trim()) return people.value
  const q = searchQuery.value.toLowerCase()
  return people.value.filter((p: any) => 
    p.username.toLowerCase().includes(q) || 
    (p.inGameRole && p.inGameRole.toLowerCase().includes(q))
  )
})

watch(() => props.isOpen, (open) => {
  if (open) {
    fetchPeople()
    gameRoomStore.fetchGroups()
    if (authStore.isAdmin) fetchOpenRooms()
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex justify-center items-center animate-fade-in"
      @click.self="emit('close')"
    >
      <div 
        class="relative w-full max-w-4xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto h-[85vh] max-h-[88vh]"
        :style="{ backgroundColor: themeStore.customModalBgColor }"
      >
        <!-- HEADER -->
        <div class="p-5 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
              <Users class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black uppercase text-white tracking-wide">Community Directory & Squad Groups</h2>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                View players, live online/away statuses, squad rosters, and active tactical channels
              </p>
            </div>
          </div>

          <!-- TABS -->
          <div class="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              @click="activeTab = 'people'"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'people' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              ]"
            >
              <User class="w-3.5 h-3.5" />
              <span>People ({{ people.length }})</span>
            </button>

            <button
              @click="activeTab = 'groups'"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'groups' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              ]"
            >
              <Users class="w-3.5 h-3.5" />
              <span>Squad Groups ({{ gameRoomStore.squadGroups.length }})</span>
            </button>

            <button
              v-if="authStore.isAdmin"
              @click="activeTab = 'rooms'; fetchOpenRooms()"
              :class="[
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'rooms' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-purple-400 hover:text-purple-300'
              ]"
            >
              <Radio class="w-3.5 h-3.5" />
              <span>Open Channels ({{ openRooms.length }})</span>
            </button>

            <button @click="emit('close')" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1">
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- TAB CONTENT CONTAINER -->
        <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs scrollbar-thin">
          <!-- TAB 1: ALL PEOPLE -->
          <div v-if="activeTab === 'people'" class="flex flex-col gap-4">
            <!-- STATUS TOGGLE FOR CURRENT USER -->
            <div v-if="authStore.currentUser" class="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div class="flex items-center gap-3">
                <img
                  :src="authStore.currentUser.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + authStore.currentUser.username)"
                  class="w-9 h-9 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-white text-xs">{{ authStore.currentUser.username }}</span>
                    <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold uppercase">
                      {{ authStore.currentUser.role }}
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-400">Set your live status visible to squad members</span>
                </div>
              </div>

              <!-- ONLINE / AWAY SWITCH -->
              <div class="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                <button
                  @click="authStore.setUserStatus('online')"
                  :class="[
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    authStore.currentUserStatus === 'online'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Online</span>
                </button>
                <button
                  @click="authStore.setUserStatus('away')"
                  :class="[
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    authStore.currentUserStatus === 'away'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Away</span>
                </button>
              </div>
            </div>

            <!-- SEARCH -->
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search people by username or in-game role..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
            />

            <!-- USERS GRID -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="person in filteredPeople"
                :key="person.id"
                class="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <!-- AVATAR WITH LIVE STATUS BADGE -->
                  <div class="relative shrink-0">
                    <img
                      :src="person.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + person.username)"
                      class="w-11 h-11 rounded-2xl object-cover border border-slate-700"
                    />
                    <!-- STATUS BADGE -->
                    <span
                      v-if="authStore.getUserStatus(person.username) === 'online'"
                      class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-[0_0_8px_#10b981]"
                      title="Online"
                    ></span>
                    <span
                      v-else-if="authStore.getUserStatus(person.username) === 'away'"
                      class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-950"
                      title="Away"
                    ></span>
                    <span
                      v-else
                      class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-600 border-2 border-slate-950"
                      title="Offline"
                    ></span>
                  </div>

                  <div class="flex flex-col min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="font-black text-white text-xs truncate">{{ person.username }}</span>
                      <Crown v-if="person.role === 'admin' || person.username.toLowerCase() === 'andrex'" class="w-3.5 h-3.5 text-amber-400 shrink-0" title="Administrator" />
                    </div>
                    <span class="text-[10px] text-amber-400 font-mono">{{ person.inGameRole || 'Player' }}</span>
                    <span class="text-[10px] text-slate-400 font-mono mt-0.5">
                      Status: <strong :class="authStore.getUserStatus(person.username) === 'online' ? 'text-emerald-400' : authStore.getUserStatus(person.username) === 'away' ? 'text-amber-400' : 'text-slate-500'">{{ authStore.getUserStatus(person.username).toUpperCase() }}</strong>
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    @click="emit('openDm', person.id); emit('close')"
                    class="p-2 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Send Private Message"
                  >
                    <MessageSquare class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: SQUAD GROUPS -->
          <div v-if="activeTab === 'groups'" class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs uppercase tracking-wide">Competitive Squad Rosters</span>
              <button
                v-if="authStore.isAdmin"
                @click="isCreatingGroup = !isCreatingGroup"
                class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Create Squad Group</span>
              </button>
            </div>

            <!-- CREATE GROUP INLINE FORM -->
            <div v-if="isCreatingGroup" class="p-4 bg-slate-950 border border-amber-500/40 rounded-2xl flex flex-col gap-3">
              <h4 class="font-black text-white text-xs uppercase">New Squad Group</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  v-model="newGroupName"
                  type="text"
                  placeholder="Group Name (e.g. A-Execute Lineup Team)"
                  class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
                <input
                  v-model="newGroupMembers"
                  type="text"
                  placeholder="Members (comma separated: Andrex, chips)"
                  class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <textarea
                v-model="newGroupDesc"
                placeholder="Description / squad tactical focus..."
                class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                rows="2"
              ></textarea>
              <div class="flex justify-end gap-2">
                <button @click="isCreatingGroup = false" class="px-3 py-1.5 text-slate-400 hover:text-white">Cancel</button>
                <button @click="handleCreateGroup" class="px-4 py-1.5 bg-amber-500 text-slate-950 font-black rounded-xl">Save Group</button>
              </div>
            </div>

            <!-- SQUAD GROUPS LIST -->
            <div class="grid grid-cols-1 gap-3">
              <div
                v-for="group in gameRoomStore.squadGroups"
                :key="group.id"
                class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <ShieldCheck class="w-4 h-4 text-amber-400" />
                    <h3 class="font-black text-white text-xs uppercase tracking-wide">{{ group.name }}</h3>
                  </div>
                  <button
                    @click="handleStartSquadRoom(group)"
                    class="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Radio class="w-3.5 h-3.5" />
                    <span>Launch Tactics Room</span>
                  </button>
                </div>

                <p class="text-xs text-slate-400 leading-relaxed">{{ group.description }}</p>

                <!-- MEMBERS PILLS WITH ONLINE STATUS -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="text-[10px] text-slate-500 uppercase font-bold mr-1">Roster:</span>
                  <div
                    v-for="member in group.memberUsernames"
                    :key="member"
                    class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200"
                  >
                    <span
                      :class="[
                        'w-2 h-2 rounded-full',
                        authStore.getUserStatus(member) === 'online' ? 'bg-emerald-400 animate-pulse' : authStore.getUserStatus(member) === 'away' ? 'bg-amber-400' : 'bg-slate-600'
                      ]"
                    ></span>
                    <span>{{ member }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: OPEN CHANNELS / ACTIVE ROOMS (ADMIN ONLY) -->
          <div v-if="activeTab === 'rooms' && authStore.isAdmin" class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-xs uppercase tracking-wide">Live Tactical Channels on Server</span>
              <button
                @click="fetchOpenRooms"
                :disabled="isLoadingRooms"
                class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold flex items-center gap-1 text-[11px]"
              >
                <RefreshCw :class="['w-3 h-3 text-amber-400', isLoadingRooms ? 'animate-spin' : '']" />
                <span>Refresh Channels</span>
              </button>
            </div>

            <div v-if="openRooms.length === 0" class="text-center p-8 text-slate-500 italic bg-slate-950/60 rounded-2xl border border-slate-800">
              No active tactical rooms open currently on the server.
            </div>

            <div class="grid grid-cols-1 gap-3">
              <div
                v-for="room in openRooms"
                :key="room.code"
                class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
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
                    <span>Drawings: <strong class="text-amber-400">{{ room.elementsCount }}</strong></span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <!-- JOIN AS GHOST (SILENT) -->
                  <button
                    @click="handleJoinChannel(room.code, true)"
                    class="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Silently inspect room without appearing on roster"
                  >
                    <Ghost class="w-3.5 h-3.5" />
                    <span>Ghost Observe</span>
                  </button>

                  <!-- REGULAR JOIN -->
                  <button
                    @click="handleJoinChannel(room.code, false)"
                    class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Join Room
                  </button>

                  <!-- CLOSE ROOM (ADMIN) -->
                  <button
                    @click="handleCloseRoom(room.code)"
                    class="p-2 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl transition-all cursor-pointer"
                    title="Close room"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
