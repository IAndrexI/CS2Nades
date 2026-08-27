<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useGameRoomStore } from '../../stores/gameRoomStore'
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
  Sparkles,
  Lock,
  Plus,
  Trash2,
  Crown,
  Settings,
  UserMinus,
  UserPlus,
  LogOut
} from 'lucide-vue-next'
import axios from 'axios'
import type { DirectMessage } from '../../types'
import { generateConversationSecret, encryptMessage, decryptMessage } from '../../utils/crypto'
import { useConfirmDialog } from '../../composables/useConfirmDialog'

const props = defineProps<{
  isOpen: boolean
  initialTargetUserId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const gameRoomStore = useGameRoomStore()
const { confirmAction } = useConfirmDialog()

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

export interface GroupChat {
  id: string
  name: string
  description?: string
  creatorId?: string
  creatorUsername?: string
  memberUsernames: string[]
  createdAt?: string
}

export interface GroupMessage {
  id: string
  groupId: string
  senderId: string
  senderUsername: string
  senderAvatar?: string
  inGameRole?: string
  text: string
  createdAt: string
}

const activeSidebarTab = ref<'chats' | 'groups' | 'people'>('chats')
const contacts = ref<Contact[]>([])
const allPeople = ref<CommunityUser[]>([])
const squadGroups = ref<GroupChat[]>([])
const searchQuery = ref('')

// Active Selection State
const selectedContactId = ref<string | null>(null)
const selectedContactInfo = ref<Contact | CommunityUser | null>(null)
const messages = ref<DirectMessage[]>([])

const selectedGroupId = ref<string | null>(null)
const selectedGroupInfo = ref<GroupChat | null>(null)
const groupMessages = ref<GroupMessage[]>([])

const messageInput = ref('')
const isLoading = ref(false)
const isTogglingVisibility = ref(false)
const chatContainerRef = ref<HTMLDivElement | null>(null)

// Create Group Modal State
const isCreateGroupModalOpen = ref(false)
const newGroupName = ref('')
const newGroupDesc = ref('')
const newGroupSelectedUsers = ref<string[]>([])
const isCreatingGroup = ref(false)

// Visibility status in directory (default: visible = true)
const isVisibleInDirectory = ref(true)

async function fetchConversations() {
  if (!authStore.token) return
  try {
    const res = await axios.get('/api/dm/conversations')
    const rawContacts = res.data
    // Decrypt preview of last messages
    if (authStore.currentUser) {
      for (const c of rawContacts) {
        if (c.lastMessage && c.lastMessage.startsWith('ENC:')) {
          const secret = generateConversationSecret(authStore.currentUser.id, c.id)
          c.lastMessage = await decryptMessage(c.lastMessage, secret)
        }
      }
    }
    contacts.value = rawContacts
    if (props.initialTargetUserId) {
      selectedContactId.value = props.initialTargetUserId
      await fetchMessages(props.initialTargetUserId)
    } else if (contacts.value.length > 0 && !selectedContactId.value && !selectedGroupId.value) {
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

async function fetchSquadGroups() {
  try {
    const res = await axios.get('/api/groups')
    squadGroups.value = res.data
  } catch (err) {
    console.error('Failed to load squad groups', err)
  }
}

async function fetchMessages(targetId: string) {
  if (!authStore.token) return
  isLoading.value = true
  selectedGroupId.value = null
  selectedGroupInfo.value = null
  try {
    const res = await axios.get(`/api/dm/messages/${targetId}`)
    const rawMsgs = res.data
    if (authStore.currentUser) {
      const secret = generateConversationSecret(authStore.currentUser.id, targetId)
      const decrypted = await Promise.all(
        rawMsgs.map(async (m: DirectMessage) => {
          const plain = await decryptMessage(m.text, secret)
          return { ...m, text: plain }
        })
      )
      messages.value = decrypted
    } else {
      messages.value = rawMsgs
    }
    await scrollToBottom()
  } catch (err) {
    console.error('Failed to load messages', err)
  } finally {
    isLoading.value = false
  }
}

async function fetchGroupMessages(groupId: string) {
  if (!authStore.token) return
  isLoading.value = true
  selectedContactId.value = null
  selectedContactInfo.value = null
  try {
    const res = await axios.get(`/api/groups/${groupId}/messages`)
    groupMessages.value = res.data
    await scrollToBottom()
  } catch (err) {
    console.error('Failed to load group messages', err)
  } finally {
    isLoading.value = false
  }
}

function selectContact(contact: Contact | CommunityUser) {
  selectedGroupId.value = null
  selectedGroupInfo.value = null
  selectedContactId.value = contact.id
  selectedContactInfo.value = contact
  fetchMessages(contact.id)
}

function selectGroup(group: GroupChat) {
  selectedContactId.value = null
  selectedContactInfo.value = null
  selectedGroupId.value = group.id
  selectedGroupInfo.value = group
  fetchGroupMessages(group.id)
}

const filteredContacts = computed(() => {
  if (!searchQuery.value.trim()) return contacts.value
  const q = searchQuery.value.toLowerCase()
  return contacts.value.filter(c => c.username.toLowerCase().includes(q))
})

const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return squadGroups.value
  const q = searchQuery.value.toLowerCase()
  return squadGroups.value.filter(g => 
    g.name.toLowerCase().includes(q) || 
    (g.description && g.description.toLowerCase().includes(q)) ||
    g.memberUsernames.some(u => u.toLowerCase().includes(q))
  )
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

// REAL-TIME AUTO UPDATE HANDLERS
async function handleIncomingDm(newMsg: DirectMessage) {
  if (!authStore.currentUser) return
  
  const isCurrentChat = (selectedContactId.value === newMsg.senderId) || 
                        (selectedContactId.value === newMsg.recipientId)

  let plainText = newMsg.text
  if (newMsg.text.startsWith('ENC:')) {
    const secret = generateConversationSecret(
      authStore.currentUser.id, 
      newMsg.senderId === authStore.currentUser.id ? newMsg.recipientId : newMsg.senderId
    )
    plainText = await decryptMessage(newMsg.text, secret)
  }

  if (isCurrentChat) {
    const exists = messages.value.some(m => m.id === newMsg.id)
    if (!exists) {
      messages.value.push({ ...newMsg, text: plainText })
      await scrollToBottom()
    }
  }

  const otherPartyId = newMsg.senderId === authStore.currentUser.id ? newMsg.recipientId : newMsg.senderId
  const contact = contacts.value.find(c => c.id === otherPartyId)
  if (contact) {
    contact.lastMessage = plainText
    contact.lastMessageTime = newMsg.createdAt
  } else {
    await fetchConversations()
  }
}

function handleIncomingGroupMsg(msg: GroupMessage) {
  if (selectedGroupId.value === msg.groupId) {
    const exists = groupMessages.value.some(m => m.id === msg.id)
    if (!exists) {
      groupMessages.value.push(msg)
      scrollToBottom()
    }
  }
}

async function handleSendMessage() {
  if (!messageInput.value.trim() || !authStore.currentUser) return
  const textToSend = messageInput.value.trim()
  messageInput.value = ''

  if (selectedGroupId.value) {
    try {
      const res = await axios.post(`/api/groups/${selectedGroupId.value}/messages`, { text: textToSend })
      const exists = groupMessages.value.some(m => m.id === res.data.id)
      if (!exists) {
        groupMessages.value.push(res.data)
        await scrollToBottom()
      }
    } catch (err) {
      console.error('Failed to send group message', err)
    }
    return
  }

  if (selectedContactId.value) {
    try {
      const secret = generateConversationSecret(authStore.currentUser.id, selectedContactId.value)
      const encryptedText = await encryptMessage(textToSend, secret)
      
      const res = await axios.post(`/api/dm/messages/${selectedContactId.value}`, { text: encryptedText })
      const exists = messages.value.some(m => m.id === res.data.id)
      if (!exists) {
        messages.value.push({ ...res.data, text: textToSend })
        await scrollToBottom()
      }
      
      const c = contacts.value.find(x => x.id === selectedContactId.value)
      if (c) {
        c.lastMessage = textToSend
        c.lastMessageTime = new Date().toISOString()
      }
    } catch (err) {
      console.error('Failed to send message', err)
    }
  }
}

async function handleDeleteCurrentThread() {
  if (!selectedContactId.value) return
  const ok = await confirmAction({
    title: 'Delete Chat History?',
    message: 'Are you sure you want to permanently delete this direct message conversation?',
    confirmLabel: 'Delete Chat',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (!ok) return

  try {
    await axios.delete(`/api/dm/thread/${selectedContactId.value}`)
    messages.value = []
    contacts.value = contacts.value.filter(c => c.id !== selectedContactId.value)
    selectedContactId.value = null
    selectedContactInfo.value = null
  } catch (err) {
    console.error('Failed to delete chat thread', err)
  }
}

async function handleCreateGroup() {
  if (!newGroupName.value.trim() || !authStore.currentUser) return
  isCreatingGroup.value = true
  try {
    const res = await axios.post('/api/groups', {
      name: newGroupName.value.trim(),
      description: newGroupDesc.value.trim(),
      memberUsernames: [authStore.currentUser.username, ...newGroupSelectedUsers.value]
    })
    squadGroups.value.unshift(res.data)
    selectGroup(res.data)
    isCreateGroupModalOpen.value = false
    newGroupName.value = ''
    newGroupDesc.value = ''
    newGroupSelectedUsers.value = []
  } catch (err) {
    console.error('Failed to create group', err)
  } finally {
    isCreatingGroup.value = false
  }
}

async function handleDeleteGroup(group: GroupChat) {
  const ok = await confirmAction({
    title: `Delete Group "${group.name}"?`,
    message: 'Are you sure you want to permanently delete this group chat and its history for all members?',
    confirmLabel: 'Delete Group',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (!ok) return

  try {
    await axios.delete(`/api/groups/${group.id}`)
    squadGroups.value = squadGroups.value.filter(g => g.id !== group.id)
    if (selectedGroupId.value === group.id) {
      selectedGroupId.value = null
      selectedGroupInfo.value = null
      groupMessages.value = []
    }
  } catch (err) {
    console.error('Failed to delete group', err)
  }
}

function toggleUserForGroup(username: string) {
  if (newGroupSelectedUsers.value.includes(username)) {
    newGroupSelectedUsers.value = newGroupSelectedUsers.value.filter(u => u !== username)
  } else {
    newGroupSelectedUsers.value.push(username)
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

// Manage Group Modal State
const isManageGroupModalOpen = ref(false)
const editGroupName = ref('')
const selectedUserToAdd = ref('')
const isUpdatingGroup = ref(false)

function handleOpenManageGroup() {
  if (!selectedGroupInfo.value) return
  editGroupName.value = selectedGroupInfo.value.name
  selectedUserToAdd.value = ''
  isManageGroupModalOpen.value = true
}

async function handleSaveGroupName() {
  if (!selectedGroupId.value || !editGroupName.value.trim()) return
  isUpdatingGroup.value = true
  try {
    const res = await axios.put(`/api/groups/${selectedGroupId.value}`, {
      name: editGroupName.value.trim()
    })
    selectedGroupInfo.value = res.data
    const idx = squadGroups.value.findIndex(g => g.id === res.data.id)
    if (idx >= 0) squadGroups.value[idx] = res.data
  } catch (err) {
    console.error('Failed to rename group', err)
  } finally {
    isUpdatingGroup.value = false
  }
}

async function handleAddUserToGroup() {
  if (!selectedGroupId.value || !selectedUserToAdd.value || !selectedGroupInfo.value) return
  isUpdatingGroup.value = true
  try {
    const updatedMembers = Array.from(new Set([...selectedGroupInfo.value.memberUsernames, selectedUserToAdd.value]))
    const res = await axios.put(`/api/groups/${selectedGroupId.value}`, {
      memberUsernames: updatedMembers
    })
    selectedGroupInfo.value = res.data
    const idx = squadGroups.value.findIndex(g => g.id === res.data.id)
    if (idx >= 0) squadGroups.value[idx] = res.data
    selectedUserToAdd.value = ''
  } catch (err) {
    console.error('Failed to add user to group', err)
  } finally {
    isUpdatingGroup.value = false
  }
}

async function handleRemoveUserFromGroup(username: string) {
  if (!selectedGroupId.value || !selectedGroupInfo.value) return
  const ok = await confirmAction({
    title: `Remove ${username}?`,
    message: `Are you sure you want to remove ${username} from ${selectedGroupInfo.value.name}?`,
    confirmLabel: 'Remove Member',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (!ok) return

  isUpdatingGroup.value = true
  try {
    const updatedMembers = selectedGroupInfo.value.memberUsernames.filter(u => u !== username)
    const res = await axios.put(`/api/groups/${selectedGroupId.value}`, {
      memberUsernames: updatedMembers
    })
    selectedGroupInfo.value = res.data
    const idx = squadGroups.value.findIndex(g => g.id === res.data.id)
    if (idx >= 0) squadGroups.value[idx] = res.data
  } catch (err) {
    console.error('Failed to remove user from group', err)
  } finally {
    isUpdatingGroup.value = false
  }
}

async function handleLeaveCurrentGroup() {
  if (!selectedGroupId.value || !selectedGroupInfo.value) return
  const ok = await confirmAction({
    title: 'Leave Group Chat?',
    message: `Are you sure you want to leave ${selectedGroupInfo.value.name}?`,
    confirmLabel: 'Leave Group',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (!ok) return

  try {
    await axios.post(`/api/groups/${selectedGroupId.value}/leave`)
    squadGroups.value = squadGroups.value.filter(g => g.id !== selectedGroupId.value)
    selectedGroupId.value = null
    selectedGroupInfo.value = null
    groupMessages.value = []
  } catch (err) {
    console.error('Failed to leave group', err)
  }
}

const availableUsersToAdd = computed(() => {
  if (!selectedGroupInfo.value) return []
  const currentMembers = new Set(selectedGroupInfo.value.memberUsernames.map(u => u.toLowerCase()))
  return allPeople.value.filter(p => !currentMembers.has(p.username.toLowerCase()))
})

onMounted(() => {
  const socket = (gameRoomStore as any).getSocket ? (gameRoomStore as any).getSocket() : ((gameRoomStore as any).socket?.value || (gameRoomStore as any).socket)
  if (socket) {
    socket.on('dm:new', handleIncomingDm)
    if (authStore.currentUser) {
      socket.on(`dm:${authStore.currentUser.id}`, handleIncomingDm)
    }
    socket.on('group:msg', handleIncomingGroupMsg)
    socket.on('group:updated', (updatedGroup: GroupChat) => {
      const idx = squadGroups.value.findIndex(g => g.id === updatedGroup.id)
      if (idx >= 0) squadGroups.value[idx] = updatedGroup
      else squadGroups.value.push(updatedGroup)
      if (selectedGroupId.value === updatedGroup.id) {
        selectedGroupInfo.value = updatedGroup
      }
    })
    socket.on('group:deleted', ({ id }: { id: string }) => {
      squadGroups.value = squadGroups.value.filter(g => g.id !== id)
      if (selectedGroupId.value === id) {
        selectedGroupId.value = null
        selectedGroupInfo.value = null
        groupMessages.value = []
      }
    })
  }
})

watch(() => props.isOpen, (open) => {
  if (open) {
    fetchConversations()
    fetchAllPeople()
    fetchSquadGroups()
    if (authStore.currentUser?.privacy?.hideFromList !== undefined) {
      isVisibleInDirectory.value = !authStore.currentUser.privacy.hideFromList
    }
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
        <!-- LEFT SIDEBAR -->
        <div class="w-full md:w-80 bg-slate-950 p-4 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 max-h-[35vh] md:max-h-none">
          <div class="flex flex-col gap-3 min-h-0 flex-1">
            <!-- SIDEBAR HEADER -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <MessageSquare class="w-4 h-4 text-amber-400" />
                <h3 class="text-sm font-black uppercase text-white tracking-wider">Tactical Chat</h3>
              </div>
              <button @click="emit('close')" class="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer">
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- TABS: CHATS vs GROUPS vs FIND PEOPLE -->
            <div class="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                @click="activeSidebarTab = 'chats'"
                :class="[
                  'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  activeSidebarTab === 'chats'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <span>DMs ({{ contacts.length }})</span>
              </button>

              <button
                @click="activeSidebarTab = 'groups'"
                :class="[
                  'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  activeSidebarTab === 'groups'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <span>Groups ({{ squadGroups.length }})</span>
              </button>

              <button
                @click="activeSidebarTab = 'people'"
                :class="[
                  'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  activeSidebarTab === 'people'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                ]"
              >
                <span>Players ({{ allPeople.length }})</span>
              </button>
            </div>

            <!-- SEARCH BAR & CREATE GROUP BUTTON -->
            <div class="flex items-center gap-1.5">
              <div class="relative flex-1">
                <Search class="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="activeSidebarTab === 'chats' ? 'Search conversations...' : activeSidebarTab === 'groups' ? 'Search group chats...' : 'Find players...'"
                  class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>
              <button
                v-if="activeSidebarTab === 'groups'"
                @click="isCreateGroupModalOpen = true"
                class="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer shadow transition-all"
                title="Create New Group Chat"
              >
                <Plus class="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            <!-- LIST: CHATS, GROUPS, OR PEOPLE -->
            <div class="flex flex-col gap-1 overflow-y-auto flex-1 scrollbar-thin pr-1">
              <!-- TAB 1: ACTIVE DIRECT CHATS -->
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

              <!-- TAB 2: SQUAD GROUP CHATS -->
              <template v-else-if="activeSidebarTab === 'groups'">
                <div
                  v-if="filteredGroups.length === 0"
                  class="text-center p-6 text-slate-500 text-xs italic flex flex-col items-center gap-2"
                >
                  <span>No group chats yet.</span>
                  <button
                    @click="isCreateGroupModalOpen = true"
                    class="px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-[11px] cursor-pointer shadow"
                  >
                    Create Group Chat
                  </button>
                </div>

                <div
                  v-for="group in filteredGroups"
                  :key="group.id"
                  @click="selectGroup(group)"
                  :class="[
                    'flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group',
                    selectedGroupId === group.id
                      ? 'bg-slate-800 border-amber-500/50 shadow-md'
                      : 'bg-slate-900/50 border-transparent hover:bg-slate-900 text-slate-400'
                  ]"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Users class="w-4 h-4" />
                    </div>
                    <div class="flex flex-col min-w-0 flex-1">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-white text-xs truncate">{{ group.name }}</span>
                        <span class="text-[9px] text-amber-400 font-mono font-bold">{{ group.memberUsernames.length }} members</span>
                      </div>
                      <p class="text-[10px] text-slate-400 truncate mt-0.5">{{ group.description || group.memberUsernames.join(', ') }}</p>
                    </div>
                  </div>

                  <button
                    v-if="group.creatorId === authStore.currentUser?.id || group.creatorUsername === authStore.currentUser?.username || authStore.isAdmin"
                    @click.stop="handleDeleteGroup(group)"
                    class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors ml-1"
                    title="Delete Group Chat"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </template>

              <!-- TAB 3: ALL PEOPLE DIRECTORY -->
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
                    <div class="flex flex-col min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-white text-xs truncate">{{ person.username }}</span>
                        <span
                          :class="[
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            person.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                          ]"
                        ></span>
                      </div>
                      <span class="text-[10px] text-amber-400 font-mono">{{ person.inGameRole || 'Player' }}</span>
                    </div>
                  </div>

                  <button
                    v-if="person.id !== authStore.currentUser?.id"
                    @click="selectContact(person)"
                    class="px-2.5 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                  >
                    Message
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- BOTTOM BAR: DIRECTORY VISIBILITY TOGGLE -->
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
                title="Toggle whether other players can discover you in the directory"
              >
                <Eye v-if="isVisibleInDirectory" class="w-3 h-3" />
                <EyeOff v-else class="w-3 h-3" />
                <span>{{ isVisibleInDirectory ? 'Visible (Public)' : 'Hidden (Private)' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL: ACTIVE CHAT (DM OR GROUP) -->
        <div class="flex-1 flex flex-col justify-between bg-slate-900 min-h-0">
          <!-- HEADER -->
          <div class="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- DM HEADER -->
              <template v-if="selectedContactInfo">
                <img
                  :src="selectedContactInfo.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + selectedContactInfo.username)"
                  class="w-8 h-8 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-200">
                      {{ 'Chat with ' + selectedContactInfo.username }}
                    </span>
                    <span class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <Lock class="w-2.5 h-2.5" />
                      <span>Encrypted</span>
                    </span>
                  </div>
                  <span v-if="selectedContactInfo.inGameRole" class="block text-[10px] text-amber-400 font-mono">
                    {{ selectedContactInfo.inGameRole }}
                  </span>
                </div>
              </template>

              <!-- GROUP CHAT HEADER -->
              <template v-else-if="selectedGroupInfo">
                <div class="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Users class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-200">{{ selectedGroupInfo.name }}</span>
                    <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
                      Group
                    </span>
                  </div>
                  <span class="block text-[10px] text-slate-400 truncate max-w-xs">
                    {{ selectedGroupInfo.memberUsernames.length }} members: {{ selectedGroupInfo.memberUsernames.join(', ') }}
                  </span>
                </div>
              </template>

              <template v-else>
                <div class="flex items-center gap-2">
                  <MessageSquare class="w-4 h-4 text-amber-400" />
                  <span class="text-xs font-bold text-slate-300">Select a Conversation or Group</span>
                </div>
              </template>
            </div>

            <div class="flex items-center gap-1.5">
              <!-- CLEAR / DELETE DM THREAD BUTTON -->
              <button
                v-if="selectedContactId && messages.length > 0"
                @click="handleDeleteCurrentThread"
                class="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                title="Delete this conversation history"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Delete Chat</span>
              </button>

              <!-- MANAGE GROUP BUTTON (FOR HOST/ADMIN) -->
              <button
                v-if="selectedGroupInfo && (selectedGroupInfo.creatorId === authStore.currentUser?.id || selectedGroupInfo.creatorUsername === authStore.currentUser?.username || authStore.isAdmin)"
                @click="handleOpenManageGroup"
                class="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border border-slate-700"
                title="Manage Group: Rename, Add or Remove Members"
              >
                <Settings class="w-3.5 h-3.5" />
                <span>Manage</span>
              </button>

              <!-- LEAVE GROUP BUTTON (FOR REGULAR MEMBERS) -->
              <button
                v-if="selectedGroupInfo && !(selectedGroupInfo.creatorId === authStore.currentUser?.id || selectedGroupInfo.creatorUsername === authStore.currentUser?.username || authStore.isAdmin)"
                @click="handleLeaveCurrentGroup"
                class="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                title="Leave Group Chat"
              >
                <LogOut class="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>

              <!-- DELETE GROUP BUTTON (FOR HOST/ADMIN) -->
              <button
                v-if="selectedGroupInfo && (selectedGroupInfo.creatorId === authStore.currentUser?.id || selectedGroupInfo.creatorUsername === authStore.currentUser?.username || authStore.isAdmin)"
                @click="handleDeleteGroup(selectedGroupInfo)"
                class="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                title="Delete Group Chat"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                @click="emit('close')"
                class="hidden md:block p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- MESSAGES FEED -->
          <div ref="chatContainerRef" class="flex-1 p-4 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
            <!-- EMPTY STATES -->
            <div v-if="!selectedContactId && !selectedGroupId" class="m-auto text-center text-slate-500 text-xs italic flex flex-col items-center gap-2">
              <Sparkles class="w-6 h-6 text-amber-400/60" />
              <span>Select a direct message or group chat from the sidebar</span>
            </div>

            <div v-else-if="selectedContactId && messages.length === 0" class="m-auto text-center text-slate-500 text-xs italic flex flex-col items-center gap-1">
              <Lock class="w-5 h-5 text-emerald-400/60 mb-1" />
              <span>Send an encrypted direct message to start the conversation</span>
            </div>

            <div v-else-if="selectedGroupId && groupMessages.length === 0" class="m-auto text-center text-slate-500 text-xs italic flex flex-col items-center gap-1">
              <Users class="w-5 h-5 text-amber-400/60 mb-1" />
              <span>Send a message to everyone in {{ selectedGroupInfo?.name }}</span>
            </div>

            <!-- 1. DIRECT MESSAGES RENDER -->
            <template v-if="selectedContactId">
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
                <p class="leading-relaxed whitespace-pre-wrap break-words">{{ msg.text }}</p>
              </div>
            </template>

            <!-- 2. GROUP CHAT MESSAGES RENDER -->
            <template v-else-if="selectedGroupId">
              <div
                v-for="gmsg in groupMessages"
                :key="gmsg.id"
                :class="[
                  'flex flex-col max-w-[80%] rounded-2xl p-3 text-xs',
                  gmsg.senderId === authStore.currentUser?.id
                    ? 'self-end bg-amber-500 text-slate-950 font-medium'
                    : 'self-start bg-slate-950 border border-slate-800 text-slate-200'
                ]"
              >
                <div class="flex items-center gap-2 mb-1 opacity-75 text-[10px]">
                  <span class="font-bold">{{ gmsg.senderUsername }}</span>
                  <span v-if="gmsg.inGameRole" class="font-mono text-[9px] text-amber-400">[{{ gmsg.inGameRole }}]</span>
                  <span>{{ new Date(gmsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                </div>
                <p class="leading-relaxed whitespace-pre-wrap break-words">{{ gmsg.text }}</p>
              </div>
            </template>
          </div>

          <!-- INPUT BOX -->
          <form @submit.prevent="handleSendMessage" class="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
            <input
              v-model="messageInput"
              type="text"
              :placeholder="selectedContactId ? 'Type an encrypted direct message...' : selectedGroupId ? 'Message squad group...' : 'Select a conversation first...'"
              :disabled="!selectedContactId && !selectedGroupId"
              class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
            <button
              type="submit"
              :disabled="!messageInput.trim() || (!selectedContactId && !selectedGroupId)"
              class="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow"
            >
              <Send class="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- CREATE GROUP CHAT MODAL -->
    <div
      v-if="isCreateGroupModalOpen"
      class="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4 text-amber-400" />
            <h3 class="text-sm font-black uppercase text-white">Create Squad Group Chat</h3>
          </div>
          <button @click="isCreateGroupModalOpen = false" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col gap-3 text-xs">
          <div>
            <label class="block font-bold text-slate-300 mb-1">Group Name *</label>
            <input
              v-model="newGroupName"
              type="text"
              placeholder="e.g. Mirage Execution Squad, Premier Team..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-300 mb-1">Description</label>
            <input
              v-model="newGroupDesc"
              type="text"
              placeholder="Optional tactical description..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-300 mb-1">Add Members ({{ newGroupSelectedUsers.length }} selected)</label>
            <div class="max-h-40 overflow-y-auto flex flex-col gap-1 p-2 bg-slate-950 border border-slate-800 rounded-xl scrollbar-thin">
              <div
                v-for="person in allPeople.filter(p => p.username !== authStore.currentUser?.username)"
                :key="person.id"
                @click="toggleUserForGroup(person.username)"
                :class="[
                  'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all',
                  newGroupSelectedUsers.includes(person.username) ? 'bg-amber-500/20 text-white font-bold' : 'hover:bg-slate-900 text-slate-400'
                ]"
              >
                <div class="flex items-center gap-2">
                  <img :src="person.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + person.username)" class="w-5 h-5 rounded-md object-cover" />
                  <span>{{ person.username }}</span>
                </div>
                <div :class="['w-4 h-4 rounded border flex items-center justify-center text-[10px]', newGroupSelectedUsers.includes(person.username) ? 'bg-amber-500 border-amber-500 text-slate-950 font-black' : 'border-slate-700']">
                  <Check v-if="newGroupSelectedUsers.includes(person.username)" class="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            @click="isCreateGroupModalOpen = false"
            class="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="handleCreateGroup"
            :disabled="!newGroupName.trim() || isCreatingGroup"
            class="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow"
          >
            {{ isCreatingGroup ? 'Creating...' : 'Create Group' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MANAGE SQUAD GROUP MODAL (HOST CONTROLS) -->
    <div
      v-if="isManageGroupModalOpen && selectedGroupInfo"
      class="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      @click.self="isManageGroupModalOpen = false"
    >
      <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <Settings class="w-4 h-4 text-amber-400" />
            <h3 class="text-sm font-black uppercase text-white">Manage Group Settings</h3>
          </div>
          <button @click="isManageGroupModalOpen = false" class="text-slate-400 hover:text-white cursor-pointer">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex flex-col gap-4 text-xs">
          <!-- RENAME GROUP -->
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Group Name</label>
            <div class="flex items-center gap-2">
              <input
                v-model="editGroupName"
                type="text"
                class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
              <button
                @click="handleSaveGroupName"
                :disabled="!editGroupName.trim() || isUpdatingGroup"
                class="px-3.5 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40 text-amber-400 font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Save
              </button>
            </div>
          </div>

          <!-- ADD MEMBER -->
          <div v-if="availableUsersToAdd.length > 0" class="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <label class="font-bold text-slate-300 flex items-center gap-1.5">
              <UserPlus class="w-3.5 h-3.5 text-amber-400" />
              Add New Member
            </label>
            <div class="flex items-center gap-2">
              <select
                v-model="selectedUserToAdd"
                class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>Select a player to add...</option>
                <option v-for="user in availableUsersToAdd" :key="user.id" :value="user.username">
                  {{ user.username }} ({{ user.inGameRole || 'Player' }})
                </option>
              </select>
              <button
                @click="handleAddUserToGroup"
                :disabled="!selectedUserToAdd || isUpdatingGroup"
                class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black rounded-xl transition-all cursor-pointer shadow"
              >
                Add
              </button>
            </div>
          </div>

          <!-- MEMBER LIST & REMOVE -->
          <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
            <label class="font-bold text-slate-300">
              Members ({{ selectedGroupInfo.memberUsernames.length }})
            </label>
            <div class="max-h-48 overflow-y-auto flex flex-col gap-1 p-2 bg-slate-950 border border-slate-800 rounded-xl scrollbar-thin">
              <div
                v-for="username in selectedGroupInfo.memberUsernames"
                :key="username"
                class="flex items-center justify-between p-2 bg-slate-900/60 rounded-lg border border-slate-800/80"
              >
                <div class="flex items-center gap-2">
                  <img :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${username}`" class="w-5 h-5 rounded-md object-cover" />
                  <span class="font-bold text-slate-200">{{ username }}</span>
                  <span
                    v-if="username === selectedGroupInfo.creatorUsername"
                    class="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-black rounded font-mono"
                  >
                    <Crown class="w-2.5 h-2.5" />
                    HOST
                  </span>
                </div>

                <!-- REMOVE MEMBER BUTTON (HOST ONLY, CANNOT REMOVE SELF/HOST) -->
                <button
                  v-if="username !== selectedGroupInfo.creatorUsername"
                  @click="handleRemoveUserFromGroup(username)"
                  :disabled="isUpdatingGroup"
                  class="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                  title="Remove from group"
                >
                  <UserMinus class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            @click="isManageGroupModalOpen = false"
            class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
