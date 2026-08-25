<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { MessageSquare, Send, User, X, Clock, Check } from 'lucide-vue-next'
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

const contacts = ref<Contact[]>([])
const selectedContactId = ref<string | null>(null)
const messages = ref<DirectMessage[]>([])
const messageInput = ref('')
const isLoading = ref(false)
const chatContainerRef = ref<HTMLDivElement | null>(null)

async function fetchConversations() {
  if (!authStore.token) return
  try {
    const res = await axios.get('/api/dm/conversations')
    contacts.value = res.data
    if (props.initialTargetUserId) {
      selectedContactId.value = props.initialTargetUserId
      await fetchMessages(props.initialTargetUserId)
    } else if (contacts.value.length > 0 && !selectedContactId.value) {
      selectedContactId.value = contacts.value[0].id
      await fetchMessages(contacts.value[0].id)
    }
  } catch (err) {
    console.error('Failed to load conversations', err)
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
    fetchConversations()
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
      <div class="my-auto w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[88vh] sm:h-[80vh] max-h-[92vh] sm:max-h-[85vh]">
      <!-- LEFT SIDEBAR: CONTACTS LIST -->
      <div class="w-full md:w-72 bg-slate-950 p-4 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 max-h-[30vh] md:max-h-none">
        <div class="flex flex-col gap-3 min-h-0 flex-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <MessageSquare class="w-4 h-4 text-amber-400" />
              <h3 class="text-sm font-black uppercase text-white">Direct Messages</h3>
            </div>
            <button @click="emit('close')" class="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="flex flex-col gap-1 overflow-y-auto flex-1 scrollbar-thin">
            <div
              v-if="contacts.length === 0"
              class="text-center p-6 text-slate-500 text-xs italic"
            >
              No active conversations yet. Visit a user's profile to start a chat!
            </div>

            <button
              v-for="contact in contacts"
              :key="contact.id"
              @click="selectedContactId = contact.id; fetchMessages(contact.id)"
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
          </div>
        </div>

        <button
          @click="emit('close')"
          class="hidden md:flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-white text-xs font-bold transition-colors cursor-pointer mt-2"
        >
          <X class="w-4 h-4" />
          <span>Close Chat</span>
        </button>
      </div>

      <!-- RIGHT SIDEBAR: ACTIVE CHAT MESSAGES -->
      <div class="flex-1 flex flex-col justify-between bg-slate-900 min-h-0">
        <!-- HEADER -->
        <div class="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-slate-300">
              {{ contacts.find(c => c.id === selectedContactId)?.username ? ('Chat with ' + contacts.find(c => c.id === selectedContactId)?.username) : 'Direct Message' }}
            </span>
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
          <div v-if="messages.length === 0" class="m-auto text-center text-slate-500 text-xs italic">
            Send a private message to begin the conversation
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
            placeholder="Type a message..."
            class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            :disabled="!messageInput.trim()"
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
