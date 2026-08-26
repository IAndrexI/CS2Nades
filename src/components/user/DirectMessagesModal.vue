<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { 
  MessageSquare, 
  Send, 
  User, 
  Users,
  Search,
  X, 
  Clock, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Sparkles
} from 'lucide-vue-next'
import axios from 'axios'
import type { DirectMessage } from '../../types'

const props = defineProps<{
  isOpen: boolean
  initialTargetUserId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()

interface Contact {
  id: string
  username: string
  avatar?: string
  inGameRole?: string
  lastMessage?: string
  lastMessageTime?: string
}

interface CommunityUser {
  id: string
  username: string
  avatar?: string
  inGameRole?: string
  bio?: string
  themeColor?: string
  isOnline?: boolean
}

const activeSidebarTab = ref<'chats' | 'people'>('chats')
const contacts = ref<Contact[]>([])
const allPeople = ref<CommunityUser[]>([])
const searchQuery = ref('')
const selectedContactId = ref<string | null>(null)
const selectedContactInfo = ref<Contact | CommunityUser | null>(null)
const messages = ref<DirectMessage[]>([])
const messageInput = ref('')
const isLoading = ref(false)
const isTogglingVisibility = ref(false)
const chatContainerRef = ref<HTMLDivElement | null>(null)

// Visibility status in directory (default: visible = true)
const isVisibleInDirectory = ref(true)

async function fetchConversations() {
  if (!authStore.token) return
  try {
    const res = await axios.get('/api/dm/conversations')
    contacts.value = res.data
    if (props.initialTargetUserId) {
      selectedContactId.value = props.initialTargetUserId
      await fetchMessages(props.initialTargetUserId)
    } else if (contacts.value.length > 0 && !selectedContactId.value) {
      selectContact(contacts.value[0])
    }
  } catch (err) {
    console.error('Failed to load conversations', err)
  }
}

async function fetchAllPeople() {
  if (!authStore.token) return
  try {
    const res = await axios.get('/api/dm/users')
    allPeople.value = res.data
  } catch (err) {
    console.error('Failed to load community users', err)
  }
}

async function fetchMessages(targetId: string) {
  if (!authStore.token) return
  isLoading.value = true
  try {
    const res = await axios.get(`/api/dm/messages/${targetId}`)
    messages.value = res.data
    await scrollToBottom()
  } catch (err) {
    console.error('Failed to load messages', err)
  } finally {
    isLoading.value = false
  }
}

function selectContact(contact: Contact | CommunityUser) {
  selectedContactId.value = contact.id
  selectedContactInfo.value = contact
  fetchMessages(contact.id)
}

const filteredContacts = computed(() => {
  if (!searchQuery.value.trim()) return contacts.value
  const q = searchQuery.value.toLowerCase()
  return contacts.value.filter(c => c.username.toLowerCase().includes(q))
})

const filteredPeople = computed(() => {
  if (!searchQuery.value.trim()) return allPeople.value
  const q = searchQuery.value.toLowerCase()
  return allPeople.value.filter(p => 
    p.username.toLowerCase().includes(q) || 
    (p.inGameRole && p.inGameRole.toLowerCase().includes(q))
  )
})

async function handleToggleVisibility() {
  if (isTogglingVisibility.value) return
  isTogglingVisibility.value = true
  const nextVal = !isVisibleInDirectory.value
  try {
    const res = await axios.post('/api/dm/visibility', { isVisible: nextVal })
    isVisibleInDirectory.value = res.data.isVisible
    if (authStore.currentUser) {
      if (!authStore.currentUser.privacy) authStore.currentUser.privacy = {}
      authStore.currentUser.privacy.hideFromList = !res.data.isVisible
    }
    // Refresh people list
    await fetchAllPeople()
  } catch (err) {
    console.error('Failed to toggle directory visibility', err)
  } finally {
    isTogglingVisibility.value = false
  }
}

async function handleSendMessage() {
  if (!messageInput.value.trim() || !selectedContactId.value) return
  const textToSend = messageInput.value.trim()
  messageInput.value = ''

  try {
    const res = await axios.post(`/api/dm/messages/${selectedContactId.value}`, { text: textToSend })
    messages.value.push(res.data)
    await scrollToBottom()
    // Refresh conversation list preview
    const c = contacts.value.find(x => x.id === selectedContactId.value)
    if (c) {
      c.lastMessage = textToSend
      c.lastMessageTime = new Date().toISOString()
    } else if (selectedContactInfo.value) {
      // Add newly started conversation to contacts
      contacts.value.unshift({
        id: selectedContactInfo.value.id,
        username: selectedContactInfo.value.username,
        avatar: selectedContactInfo.value.avatar,
        inGameRole: selectedContactInfo.value.inGameRole,
        lastMessage: textToSend,
        lastMessageTime: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error('Failed to send message', err)
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    // Check initial user privacy setting (default is visible)
    if (authStore.currentUser?.privacy?.hideFromList === true) {
      isVisibleInDirectory.value = false
    } else {
      isVisibleInDirectory.value = true
    }
    fetchConversations()
    fetchAllPeople()
  }
})

watch(() => props.initialTargetUserId, (newId) => {
  if (newId) {
    selectedContactId.value = newId
    fetchMessages(newId)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start sm:items-center animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="my-auto w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[88vh] sm:h-[82vh] max-h-[92vh] sm:max-h-[85vh]">
        <!-- LEFT SIDEBAR: CONTACTS & COMMUNITY PEOPLE -->
        <div class="w-full md:w-80 bg-slate-950 p-4 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 max-h-[35vh] md:max-h-none">
          <div class="flex flex-col gap-3 min-h-0 flex-1">
            <!-- SIDEBAR HEADER -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <MessageSquare class="w-4 h-4 text-amber-400" />
                <h3 class="text-sm font-black uppercase text-white tracking-wider">Messages</h3>
              </div>
              <button @click="emit('close')" class="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer">
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- TABS: CHATS vs FIND PEOPLE -->
            <div class="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                @click="activeSidebarTab = 'chats'"
                :class="[
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  activeSidebarTab === 'chats'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <MessageSquare class="w-3.5 h-3.5" />
                <span>Chats ({{ contacts.length }})</span>
              </button>
              <button
                @click="activeSidebarTab = 'people'"
                :class="[
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  activeSidebarTab === 'people'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <Users class="w-3.5 h-3.5" />
                <span>People ({{ allPeople.length }})</span>
              </button>
            </div>

            <!-- SEARCH BAR -->
            <div class="relative">
              <Search class="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="activeSidebarTab === 'chats' ? 'Search conversations...' : 'Find players by name or role...'"
                class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            <!-- LIST: CHATS OR PEOPLE -->
            <div class="flex flex-col gap-1 overflow-y-auto flex-1 scrollbar-thin pr-1">
              <!-- TAB 1: ACTIVE CHATS -->
              <template v-if="activeSidebarTab === 'chats'">
                <div
                  v-if="filteredContacts.length === 0"
                  class="text-center p-6 text-slate-500 text-xs italic flex flex-col items-center gap-2"
                >
                  <span>No conversations found.</span>
                  <button
                    @click="activeSidebarTab = 'people'"
                    class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg text-[11px] cursor-pointer"
                  >
                    Find People to Message
                  </button>
                </div>

                <button
                  v-for="contact in filteredContacts"
                  :key="contact.id"
                  @click="selectContact(contact)"
                  :class="[
                    'flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer',
                    selectedContactId === contact.id
                      ? 'bg-slate-800 border-amber-500/50 shadow-md'
                      : 'bg-slate-900/50 border-transparent hover:bg-slate-900 text-slate-400'
                  ]"
                >
                  <img
                    :src="contact.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + contact.username)"
                    class="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                  <div class="flex flex-col min-w-0 flex-1">
                    <div class="flex items-center justify-between">
                      <span class="font-bold text-white text-xs truncate">{{ contact.username }}</span>
                      <span class="text-[9px] text-amber-400 font-mono">{{ contact.inGameRole || 'Player' }}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 truncate mt-0.5">{{ contact.lastMessage || 'Say hello!' }}</p>
                  </div>
                </button>
              </template>

              <!-- TAB 2: ALL PEOPLE DIRECTORY -->
              <template v-else>
                <div
                  v-if="filteredPeople.length === 0"
                  class="text-center p-6 text-slate-500 text-xs italic"
                >
                  No visible players found matching your search.
                </div>

                <div
                  v-for="person in filteredPeople"
                  :key="person.id"
                  class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 gap-2.5 transition-all"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      :src="person.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + person.username)"
                      class="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div class="flex flex-col min-w-0 flex-1">
                      <span class="font-bold text-white text-xs truncate">{{ person.username }}</span>
                      <span class="text-[10px] text-slate-400 font-mono truncate">{{ person.inGameRole || 'Tactician' }}</span>
                    </div>
                  </div>

                  <button
                    @click="selectContact(person)"
                    class="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0"
                  >
                    Chat
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- BOTTOM BAR: DIRECTORY VISIBILITY TOGGLE (DEFAULT IS VISIBLE) -->
          <div class="pt-3 border-t border-slate-800/80 flex flex-col gap-2 mt-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck class="w-3.5 h-3.5 text-amber-400" />
                Visibility:
              </span>
              <button
                @click="handleToggleVisibility"
                :disabled="isTogglingVisibility"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer border',
                  isVisibleInDirectory
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                ]"
                title="Toggle whether other players can discover you in the Direct Messages directory"
              >
                <Eye v-if="isVisibleInDirectory" class="w-3 h-3" />
                <EyeOff v-else class="w-3 h-3" />
                <span>{{ isVisibleInDirectory ? 'Visible (Public)' : 'Hidden (Private)' }}</span>
              </button>
            </div>
            <p class="text-[9px] text-slate-500 leading-tight">
              Default is visible. You can change this anytime here or in Settings.
            </p>
          </div>
        </div>

        <!-- RIGHT PANEL: ACTIVE CHAT MESSAGES -->
        <div class="flex-1 flex flex-col justify-between bg-slate-900 min-h-0">
          <!-- HEADER -->
          <div class="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img
                v-if="selectedContactInfo"
                :src="selectedContactInfo.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + selectedContactInfo.username)"
                class="w-7 h-7 rounded-lg object-cover border border-slate-700"
              />
              <div>
                <span class="text-xs font-bold text-slate-200">
                  {{ selectedContactInfo?.username ? ('Chat with ' + selectedContactInfo.username) : 'Direct Message' }}
                </span>
                <span v-if="selectedContactInfo?.inGameRole" class="block text-[10px] text-amber-400 font-mono">
                  {{ selectedContactInfo.inGameRole }}
                </span>
              </div>
            </div>
            <button
              @click="emit('close')"
              class="hidden md:block p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Chat"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- MESSAGES FEED -->
          <div ref="chatContainerRef" class="flex-1 p-4 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
            <div v-if="messages.length === 0" class="m-auto text-center text-slate-500 text-xs italic flex flex-col items-center gap-1">
              <Sparkles class="w-5 h-5 text-amber-400/60 mb-1" />
              <span>Send a private message to begin the conversation</span>
            </div>

            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="[
                'flex flex-col max-w-[80%] rounded-2xl p-3 text-xs',
                msg.senderId === authStore.currentUser?.id
                  ? 'self-end bg-amber-500 text-slate-950 font-medium'
                  : 'self-start bg-slate-950 border border-slate-800 text-slate-200'
              ]"
            >
              <div class="flex items-center gap-2 mb-1 opacity-75 text-[10px]">
                <span class="font-bold">{{ msg.senderUsername }}</span>
                <span>{{ new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>
              <p class="leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>
            </div>
          </div>

          <!-- INPUT BOX -->
          <form @submit.prevent="handleSendMessage" class="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
            <input
              v-model="messageInput"
              type="text"
              :placeholder="selectedContactId ? 'Type a message...' : 'Select a person from the list first...'"
              :disabled="!selectedContactId"
              class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
            <button
              type="submit"
              :disabled="!messageInput.trim() || !selectedContactId"
              class="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow"
            >
              <Send class="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
