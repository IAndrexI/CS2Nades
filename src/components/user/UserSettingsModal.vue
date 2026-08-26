<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { 
  User, 
  Settings, 
  Palette, 
  Image, 
  Link as LinkIcon, 
  Lock, 
  Bell, 
  Shield, 
  Trash2, 
  Check, 
  X, 
  ExternalLink,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()

const activeTab = ref<'profile' | 'appearance' | 'banners' | 'socials' | 'notifications' | 'privacy' | 'security'>('profile')
const isSaving = ref(false)
const saveSuccess = ref(false)
const errorMessage = ref('')

const profileForm = reactive({
  inGameRole: '',
  bio: '',
  gender: '',
  birthday: '',
  avatar: ''
})

const socialsForm = reactive({
  steamUrl: '',
  discordTag: '',
  reddit: '',
  youtube: '',
  twitter: '',
  twitch: ''
})

const privacyForm = reactive({
  hideSteam: false,
  hideSocials: false,
  hideDetails: false,
  hideLineups: false,
  hideFromList: false
})

const notificationsForm = reactive({
  emailLineups: false,
  emailStrats: false,
  discordAlerts: false,
  highlightColor: '#de9b35'
})

const securityForm = reactive({
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const deleteConfirmInput = ref('')
const isDeleteModalOpen = ref(false)

const bannerPresets = [
  { id: 'mirage', name: 'Mirage Sunset', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80' },
  { id: 'dust2', name: 'Dust II Palms', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80' },
  { id: 'inferno', name: 'Inferno Alley', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80' },
  { id: 'nuke', name: 'Nuke Silo', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80' },
  { id: 'carbon', name: 'Carbon Fiber Gold', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80' },
  { id: 'crimson', name: 'Crimson Cyber', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80' }
]

const selectedBanner = ref('')
const customBannerUrl = ref('')

const themeColors = [
  { hex: '#de9b35', name: 'CS2 Gold (Default)' },
  { hex: '#f97316', name: 'T Orange' },
  { hex: '#0ea5e9', name: 'CT Blue' },
  { hex: '#ef4444', name: 'Crimson Red' },
  { hex: '#10b981', name: 'Emerald Green' },
  { hex: '#a855f7', name: 'Amethyst Purple' },
  { hex: '#06b6d4', name: 'Cyber Cyan' },
  { hex: '#eab308', name: 'Flash Yellow' }
]

function populateForms() {
  const u = authStore.currentUser
  if (!u) return

  profileForm.inGameRole = u.inGameRole || 'Entry Fragger'
  profileForm.bio = u.bio || ''
  profileForm.gender = u.gender || ''
  profileForm.birthday = u.birthday || ''
  profileForm.avatar = u.avatar || ''

  selectedBanner.value = u.banner || bannerPresets[0].url

  const s = u.socials || {}
  socialsForm.steamUrl = s.steamUrl || ''
  socialsForm.discordTag = s.discordTag || ''
  socialsForm.reddit = s.reddit || ''
  socialsForm.youtube = s.youtube || ''
  socialsForm.twitter = s.twitter || ''
  socialsForm.twitch = s.twitch || ''

  const p = u.privacy || {}
  privacyForm.hideSteam = !!p.hideSteam
  privacyForm.hideSocials = !!p.hideSocials
  privacyForm.hideDetails = !!p.hideDetails
  privacyForm.hideLineups = !!p.hideLineups
  privacyForm.hideFromList = !!p.hideFromList

  const n = u.notifications || {}
  notificationsForm.emailLineups = !!n.emailLineups
  notificationsForm.emailStrats = !!n.emailStrats
  notificationsForm.discordAlerts = !!n.discordAlerts
  notificationsForm.highlightColor = n.highlightColor || '#de9b35'

  securityForm.email = u.email || ''
}

watch(() => props.isOpen, (open) => {
  if (open) populateForms()
})

onMounted(() => {
  populateForms()
})

async function handleSaveSettings() {
  isSaving.value = true
  errorMessage.value = ''
  saveSuccess.value = false

  try {
    const updatePayload: any = {
      inGameRole: profileForm.inGameRole,
      bio: profileForm.bio,
      gender: profileForm.gender,
      birthday: profileForm.birthday,
      avatar: profileForm.avatar,
      banner: selectedBanner.value || customBannerUrl.value,
      socials: { ...socialsForm },
      privacy: { ...privacyForm },
      notifications: { ...notificationsForm },
      email: securityForm.email
    }

    if (securityForm.newPassword) {
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        errorMessage.value = 'New passwords do not match'
        isSaving.value = false
        return
      }
      if (securityForm.newPassword.length < 4) {
        errorMessage.value = 'Password must be at least 4 characters'
        isSaving.value = false
        return
      }
      updatePayload.password = securityForm.newPassword
    }

    const ok = await authStore.updateProfile(updatePayload)
    if (ok) {
      saveSuccess.value = true
      securityForm.newPassword = ''
      securityForm.confirmPassword = ''
      setTimeout(() => { saveSuccess.value = false }, 3000)
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save settings'
  } finally {
    isSaving.value = false
  }
}

async function handleDeleteAccount() {
  if (deleteConfirmInput.value.toUpperCase() !== 'DELETE') return
  await authStore.deleteAccount()
  isDeleteModalOpen.value = false
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start sm:items-center animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="my-auto w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] sm:max-h-[85vh]">
      <!-- LEFT SIDEBAR TABS -->
      <div class="w-full md:w-64 bg-slate-950 p-4 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div class="flex flex-col gap-2">
          <!-- TOP HEADER WITH USER INFO & MOBILE CLOSE -->
          <div class="flex items-center justify-between p-2.5 bg-slate-900 rounded-2xl border border-slate-800">
            <div class="flex items-center gap-2.5 min-w-0">
              <img
                :src="profileForm.avatar || authStore.currentUser?.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + (authStore.currentUser?.username || 'user'))"
                class="w-9 h-9 rounded-xl object-cover border border-amber-500/40 shrink-0"
              />
              <div class="flex flex-col leading-tight min-w-0">
                <span class="font-black text-white text-xs truncate">{{ authStore.currentUser?.username }}</span>
                <span class="text-[10px] text-amber-400 font-mono font-bold">{{ profileForm.inGameRole || 'Player' }}</span>
              </div>
            </div>
            <button
              @click="emit('close')"
              class="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- TABS LIST (Horizontal on mobile, vertical on desktop) -->
          <div class="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto gap-1 py-1 md:py-0 scrollbar-thin">
            <button
              @click="activeTab = 'profile'"
              :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'profile' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
            >
              <User class="w-4 h-4 shrink-0" />
              <span>Profile & Bio</span>
            </button>

            <button
              @click="activeTab = 'appearance'"
              :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'appearance' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
            >
              <Palette class="w-4 h-4 shrink-0" />
              <span>Theme Accent Color</span>
            </button>

            <button
              @click="activeTab = 'banners'"
              :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'banners' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
            >
              <Image class="w-4 h-4 shrink-0" />
              <span>Profile Banners</span>
            </button>

            <button
              @click="activeTab = 'socials'"
              :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'socials' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
            >
              <LinkIcon class="w-4 h-4 shrink-0" />
              <span>Linked Accounts</span>
            </button>

            <button
              @click="activeTab = 'notifications'"
              :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'notifications' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
            >
              <Bell class="w-4 h-4 shrink-0" />
              <span>Notifications</span>
            </button>

            <button
              @click="activeTab = 'privacy'"
              :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'privacy' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
            >
              <Shield class="w-4 h-4 shrink-0" />
              <span>Privacy & Visibility</span>
            </button>

            <button
              @click="activeTab = 'security'"
              :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'security' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
            >
              <Lock class="w-4 h-4 shrink-0" />
              <span>Security & Danger Zone</span>
            </button>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="hidden md:flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-white text-xs font-bold transition-colors cursor-pointer mt-4"
        >
          <X class="w-4 h-4" />
          <span>Close Window</span>
        </button>
      </div>

      <!-- RIGHT TAB CONTENT -->
      <div class="flex-1 flex flex-col justify-between min-h-0 bg-slate-900 overflow-hidden">
        <!-- TOP DESKTOP HEADER -->
        <div class="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <span class="text-xs font-black uppercase tracking-wider text-amber-400">Settings & Customization</span>
          <button
            @click="emit('close')"
            class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- SCROLLABLE BODY -->
        <div class="flex-1 p-5 sm:p-6 overflow-y-auto flex flex-col gap-6">
          <!-- TAB 1: PROFILE & BIO -->
          <div v-if="activeTab === 'profile'" class="flex flex-col gap-4 text-xs">
            <h3 class="text-sm font-black uppercase text-white tracking-wide">Profile Information</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Tactical In-Game Role</label>
                <input
                  v-model="profileForm.inGameRole"
                  type="text"
                  placeholder="e.g. Entry Fragger, IGL, AWP"
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Custom Avatar URL</label>
                <input
                  v-model="profileForm.avatar"
                  type="text"
                  placeholder="https://... image link"
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Gender (Optional)</label>
                <input
                  v-model="profileForm.gender"
                  type="text"
                  placeholder="e.g. Male / Female / Non-binary"
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Birthday (Optional)</label>
                <input
                  v-model="profileForm.birthday"
                  type="date"
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-bold text-slate-300">Player Bio / Signature</label>
              <textarea
                v-model="profileForm.bio"
                rows="3"
                placeholder="Share your competitive rank, favorite maps, team history..."
                class="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 text-xs resize-none"
              ></textarea>
            </div>
          </div>

          <!-- TAB 2: THEME & ACCENT COLOR -->
          <div v-if="activeTab === 'appearance'" class="flex flex-col gap-4 text-xs">
            <h3 class="text-sm font-black uppercase text-white tracking-wide">Website Theme Accent Color</h3>
            <p class="text-slate-400">Choose your personalized website accent color. This replaces basic dark/light mode and permanently saves to your account and device.</p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                v-for="color in themeColors"
                :key="color.hex"
                @click="authStore.setThemeColor(color.hex)"
                :class="[
                  'flex items-center gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer text-left',
                  authStore.userThemeColor === color.hex ? 'bg-slate-800 border-white shadow-lg' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                ]"
              >
                <div class="w-6 h-6 rounded-full border border-slate-700 shadow shrink-0" :style="{ backgroundColor: color.hex }" />
                <span class="font-bold text-slate-200 text-xs">{{ color.name }}</span>
              </button>
            </div>
          </div>

          <!-- TAB 3: BANNERS -->
          <div v-if="activeTab === 'banners'" class="flex flex-col gap-4 text-xs">
            <h3 class="text-sm font-black uppercase text-white tracking-wide">Profile Banners</h3>
            <p class="text-slate-400">Select a CS2 tactical banner to display on your public profile header.</p>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="banner in bannerPresets"
                :key="banner.id"
                @click="selectedBanner = banner.url"
                :class="[
                  'relative h-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group',
                  selectedBanner === banner.url ? 'border-amber-500 shadow-xl' : 'border-slate-800 opacity-70 hover:opacity-100'
                ]"
              >
                <img :src="banner.url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                  <span class="text-[10px] font-black text-white uppercase">{{ banner.name }}</span>
                </div>
                <div v-if="selectedBanner === banner.url" class="absolute top-2 right-2 p-1 bg-amber-500 text-slate-950 rounded-full">
                  <Check class="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5 mt-2">
              <label class="font-bold text-slate-300">Or Paste Custom Banner Image URL</label>
              <input
                v-model="customBannerUrl"
                @input="selectedBanner = customBannerUrl"
                type="text"
                placeholder="https://... custom wide banner image"
                class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <!-- TAB 4: SOCIALS LINKING -->
          <div v-if="activeTab === 'socials'" class="flex flex-col gap-4 text-xs">
            <h3 class="text-sm font-black uppercase text-white tracking-wide">Link Social Media Accounts</h3>
            <p class="text-slate-400">Connect your profiles so teammates and friends can find your channels and Steam profile.</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300 flex items-center gap-1.5">
                  <img src="/icons/steam.webp" alt="Steam" class="w-3.5 h-3.5 object-contain" />
                  <span>Steam Profile URL / SteamID</span>
                </label>
                <input
                  v-model="socialsForm.steamUrl"
                  type="text"
                  placeholder="https://steamcommunity.com/id/..."
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Discord Username / Tag</label>
                <input
                  v-model="socialsForm.discordTag"
                  type="text"
                  placeholder="e.g. player#0001 or username"
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">YouTube Channel</label>
                <input
                  v-model="socialsForm.youtube"
                  type="text"
                  placeholder="https://youtube.com/@..."
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Reddit Username</label>
                <input
                  v-model="socialsForm.reddit"
                  type="text"
                  placeholder="u/username"
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Twitch Channel</label>
                <input
                  v-model="socialsForm.twitch"
                  type="text"
                  placeholder="https://twitch.tv/..."
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Twitter / X</label>
                <input
                  v-model="socialsForm.twitter"
                  type="text"
                  placeholder="https://x.com/..."
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>
          </div>

          <!-- TAB 5: NOTIFICATIONS -->
          <div v-if="activeTab === 'notifications'" class="flex flex-col gap-4 text-xs">
            <h3 class="text-sm font-black uppercase text-white tracking-wide">Notification Settings</h3>

            <div class="flex flex-col gap-3">
              <label class="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                <div>
                  <span class="font-bold text-white block">Email Lineup Updates</span>
                  <span class="text-[11px] text-slate-400">Receive email alerts when team members add new lineups</span>
                </div>
                <input v-model="notificationsForm.emailLineups" type="checkbox" class="w-4 h-4 accent-amber-500 cursor-pointer" />
              </label>

              <label class="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                <div>
                  <span class="font-bold text-white block">Email Strategy Alerts</span>
                  <span class="text-[11px] text-slate-400">Notify me when competitive playbook strats are created or updated</span>
                </div>
                <input v-model="notificationsForm.emailStrats" type="checkbox" class="w-4 h-4 accent-amber-500 cursor-pointer" />
              </label>

              <label class="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                <div>
                  <span class="font-bold text-white block">Discord Webhook Alerts</span>
                  <span class="text-[11px] text-slate-400">Broadcast room invites and new strats to Discord</span>
                </div>
                <input v-model="notificationsForm.discordAlerts" type="checkbox" class="w-4 h-4 accent-amber-500 cursor-pointer" />
              </label>
            </div>
          </div>

          <!-- TAB 6: PRIVACY -->
          <div v-if="activeTab === 'privacy'" class="flex flex-col gap-4 text-xs">
            <h3 class="text-sm font-black uppercase text-white tracking-wide">Privacy & Visibility</h3>

            <div class="flex flex-col gap-3">
              <label class="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                <div>
                  <span class="font-bold text-white block">Hide Personal Details</span>
                  <span class="text-[11px] text-slate-400">Hide gender and birthday from your public profile card</span>
                </div>
                <input v-model="privacyForm.hideDetails" type="checkbox" class="w-4 h-4 accent-amber-500 cursor-pointer" />
              </label>

              <label class="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                <div>
                  <span class="font-bold text-white block">Hide Steam Account</span>
                  <span class="text-[11px] text-slate-400">Keep your SteamID and profile private from other users</span>
                </div>
                <input v-model="privacyForm.hideSteam" type="checkbox" class="w-4 h-4 accent-amber-500 cursor-pointer" />
              </label>

              <label class="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                <div>
                  <span class="font-bold text-white block">Visible in Direct Messages & User Directory</span>
                  <span class="text-[11px] text-slate-400">Allow teammates and players to discover your profile and message you (Default: Visible)</span>
                </div>
                <input 
                  type="checkbox" 
                  :checked="!privacyForm.hideFromList" 
                  @change="privacyForm.hideFromList = !($event.target as HTMLInputElement).checked"
                  class="w-4 h-4 accent-amber-500 cursor-pointer" 
                />
              </label>

              <label class="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                <div>
                  <span class="font-bold text-white block">Hide Linked Socials</span>
                  <span class="text-[11px] text-slate-400">Do not display YouTube, Discord, Reddit, or Twitch links</span>
                </div>
                <input v-model="privacyForm.hideSocials" type="checkbox" class="w-4 h-4 accent-amber-500 cursor-pointer" />
              </label>
            </div>
          </div>

          <!-- TAB 7: SECURITY & DANGER ZONE -->
          <div v-if="activeTab === 'security'" class="flex flex-col gap-6 text-xs">
            <div class="flex flex-col gap-3">
              <h3 class="text-sm font-black uppercase text-white tracking-wide">Change Email & Password</h3>

              <div class="flex flex-col gap-1.5">
                <label class="font-bold text-slate-300">Account Email</label>
                <input
                  v-model="securityForm.email"
                  type="email"
                  class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1.5">
                  <label class="font-bold text-slate-300">New Password</label>
                  <input
                    v-model="securityForm.newPassword"
                    type="password"
                    placeholder="••••••••"
                    class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="font-bold text-slate-300">Confirm New Password</label>
                  <input
                    v-model="securityForm.confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>
            </div>

            <!-- DANGER ZONE -->
            <div class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col gap-3 mt-4">
              <div class="flex items-center gap-2 text-rose-400 font-black uppercase text-xs">
                <AlertTriangle class="w-4 h-4" />
                <span>Danger Zone: Delete Account</span>
              </div>
              <p class="text-[11px] text-slate-300">
                Permanently delete your account, personal lineups, custom strats, and server files. This action is irreversible.
              </p>
              <button
                type="button"
                @click="isDeleteModalOpen = true"
                class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs cursor-pointer self-start shadow"
              >
                Delete Account Completely
              </button>
            </div>
          </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <div class="pt-4 border-t border-slate-800 flex items-center justify-between mt-6">
          <div>
            <span v-if="saveSuccess" class="text-emerald-400 font-bold text-xs flex items-center gap-1">
              <Check class="w-3.5 h-3.5" /> Saved successfully!
            </span>
            <span v-if="errorMessage" class="text-rose-400 font-bold text-xs">
              {{ errorMessage }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="emit('close')"
              class="px-4 py-2 text-slate-400 hover:text-white rounded-xl font-bold text-xs cursor-pointer"
            >
              Close
            </button>
            <button
              @click="handleSaveSettings"
              :disabled="isSaving"
              class="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-lg disabled:opacity-50"
            >
              {{ isSaving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- DELETE CONFIRM MODAL -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div class="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        <h3 class="text-base font-black text-rose-400 uppercase">Confirm Account Deletion</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          This will wipe your credentials, personal lineups, and all custom tactics data. Type <span class="font-mono font-bold text-rose-400">DELETE</span> to confirm.
        </p>
        <input
          v-model="deleteConfirmInput"
          type="text"
          placeholder="DELETE"
          class="bg-slate-950 border border-rose-500/50 rounded-xl px-3 py-2 text-white font-mono text-center text-sm uppercase focus:outline-none focus:border-rose-400"
        />
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            @click="isDeleteModalOpen = false"
            class="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="handleDeleteAccount"
            :disabled="deleteConfirmInput.toUpperCase() !== 'DELETE'"
            class="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white font-black rounded-xl text-xs cursor-pointer shadow"
          >
            Wipe & Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</Teleport>
</template>
