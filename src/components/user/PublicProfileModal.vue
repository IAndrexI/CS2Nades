<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { User, MessageSquare, UserPlus, UserCheck, ExternalLink, X, Shield, Calendar } from 'lucide-vue-next'
import axios from 'axios'

const props = defineProps<{
  isOpen: boolean
  userId: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-dm', userId: string): void
}>()

const authStore = useAuthStore()
const profile = ref<any>(null)
const isLoading = ref(false)

async function fetchUserProfile(id: string) {
  isLoading.value = true
  try {
    const res = await axios.get(`/api/users/${id}`)
    profile.value = res.data
  } catch (err) {
    console.error('Failed to load profile', err)
  } finally {
    isLoading.value = false
  }
}

watch(() => props.userId, (newId) => {
  if (newId && props.isOpen) {
    fetchUserProfile(newId)
  }
})

watch(() => props.isOpen, (open) => {
  if (open && props.userId) {
    fetchUserProfile(props.userId)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && profile"
      class="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex justify-center items-start sm:items-center animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="my-auto w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
      <!-- PROFILE BANNER -->
      <div class="relative h-36 w-full bg-slate-950">
        <img
          :src="profile.banner || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80'"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40"></div>
        <button
          @click="emit('close')"
          class="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- PROFILE INFO -->
      <div class="p-6 pt-0 flex flex-col gap-4 relative">
        <!-- AVATAR & QUICK ACTIONS -->
        <div class="flex items-end justify-between -mt-12 mb-2">
          <img
            :src="profile.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + profile.username)"
            class="w-20 h-20 rounded-2xl object-cover border-4 border-slate-900 shadow-2xl bg-slate-950"
          />
          <div class="flex items-center gap-2">
            <button
              v-if="authStore.currentUser?.id !== profile.id"
              @click="authStore.toggleFollow(profile.id)"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow',
                authStore.isFollowing(profile.id)
                  ? 'bg-slate-800 border border-slate-700 text-amber-400'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              ]"
            >
              <UserCheck v-if="authStore.isFollowing(profile.id)" class="w-3.5 h-3.5" />
              <UserPlus v-else class="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{{ authStore.isFollowing(profile.id) ? 'Following' : 'Follow' }}</span>
            </button>

            <button
              v-if="authStore.currentUser?.id !== profile.id"
              @click="emit('open-dm', profile.id); emit('close')"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow"
            >
              <MessageSquare class="w-3.5 h-3.5 text-amber-400" />
              <span>Message</span>
            </button>
          </div>
        </div>

        <!-- USERNAME & ROLE -->
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-black text-white uppercase">{{ profile.username }}</h2>
            <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 text-[10px] font-mono font-bold">
              {{ profile.inGameRole || 'Player' }}
            </span>
          </div>
          <p v-if="profile.bio" class="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">{{ profile.bio }}</p>
        </div>

        <!-- DETAILS (GENDER / BIRTHDAY) -->
        <div v-if="profile.gender || profile.birthday" class="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span v-if="profile.gender" class="flex items-center gap-1.5">
            <User class="w-3.5 h-3.5 text-amber-400" /> {{ profile.gender }}
          </span>
          <span v-if="profile.birthday" class="flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-amber-400" /> {{ profile.birthday }}
          </span>
        </div>

        <!-- LINKED SOCIALS -->
        <div v-if="profile.socials && Object.values(profile.socials).some(Boolean)" class="flex flex-col gap-2 pt-2 border-t border-slate-800 text-xs">
          <span class="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Connected Accounts</span>
          <div class="flex flex-wrap gap-2">
            <a
              v-if="profile.socials.steamUrl || profile.steamId"
              :href="profile.socials.steamUrl || ('https://steamcommunity.com/profiles/' + profile.steamId)"
              target="_blank"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition-colors font-mono text-[11px]"
            >
              <img src="/icons/steam.webp" alt="Steam" class="w-3.5 h-3.5 object-contain" />
              <span>Steam</span>
              <ExternalLink class="w-3 h-3 text-slate-500" />
            </a>
            <span
              v-if="profile.socials.discordTag"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl font-mono text-[11px]"
            >
              <span>Discord: {{ profile.socials.discordTag }}</span>
            </span>
            <a
              v-if="profile.socials.youtube"
              :href="profile.socials.youtube"
              target="_blank"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition-colors font-mono text-[11px]"
            >
              <span>YouTube</span>
              <ExternalLink class="w-3 h-3 text-slate-500" />
            </a>
            <a
              v-if="profile.socials.twitch"
              :href="profile.socials.twitch"
              target="_blank"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition-colors font-mono text-[11px]"
            >
              <span>Twitch</span>
              <ExternalLink class="w-3 h-3 text-slate-500" />
            </a>
            <a
              v-if="profile.socials.reddit"
              :href="'https://reddit.com/user/' + profile.socials.reddit.replace('u/', '')"
              target="_blank"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition-colors font-mono text-[11px]"
            >
              <span>Reddit</span>
              <ExternalLink class="w-3 h-3 text-slate-500" />
            </a>
            <a
              v-if="profile.socials.twitter"
              :href="profile.socials.twitter"
              target="_blank"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition-colors font-mono text-[11px]"
            >
              <span>Twitter / X</span>
              <ExternalLink class="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</Teleport>
</template>
