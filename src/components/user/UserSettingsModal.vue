<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useLineupStore } from '../../stores/lineupStore'
import { useStratStore } from '../../stores/stratStore'
import { useMapStore } from '../../stores/mapStore'
import JSZip from 'jszip'
import { 
  User, 
  Settings, 
  Palette, 
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
  Download,
  FolderDown,
  Sparkles,
  AlertTriangle,
  Upload,
  RotateCcw,
  Layout,
  MessageSquare
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const authStore = useAuthStore()
const themeStore = useThemeStore()
const lineupStore = useLineupStore()
const stratStore = useStratStore()
const mapStore = useMapStore()

const activeTab = ref<'profile' | 'appearance' | 'socials' | 'backup' | 'privacy' | 'security'>('profile')
const isSaving = ref(false)
const saveSuccess = ref(false)
const errorMessage = ref('')
const isExportingZip = ref(false)
const exportSuccess = ref(false)
const avatarUploadError = ref('')

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
  discordWebhook: '',
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

function populateForms() {
  const u = authStore.currentUser
  if (!u) return

  profileForm.inGameRole = u.inGameRole || 'Entry Fragger'
  profileForm.bio = u.bio || ''
  profileForm.gender = u.gender || ''
  profileForm.birthday = u.birthday || ''
  profileForm.avatar = u.avatar || ''

  const s = u.socials || {}
  socialsForm.steamUrl = s.steamUrl || ''
  socialsForm.discordTag = s.discordTag || ''
  socialsForm.discordWebhook = s.discordWebhook || ''
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
  if (open) {
    populateForms()
    saveSuccess.value = false
    errorMessage.value = ''
    avatarUploadError.value = ''
  }
})

onMounted(() => {
  if (props.isOpen) populateForms()
})

function handleAvatarFileUpload(e: Event) {
  avatarUploadError.value = ''
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Strict image & GIF verification
  const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
  if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
    avatarUploadError.value = 'Only image files (PNG, JPG, WebP, GIF, SVG) are accepted.'
    return
  }

  const reader = new FileReader()
  reader.onload = (loadEvent) => {
    const dataUrl = loadEvent.target?.result as string
    if (dataUrl) {
      profileForm.avatar = dataUrl
    }
  }
  reader.readAsDataURL(file)
}

function resetProfileDefaults() {
  profileForm.inGameRole = 'Entry Fragger'
  profileForm.bio = ''
  profileForm.gender = ''
  profileForm.birthday = ''
  profileForm.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${authStore.currentUser?.username || 'player'}`
}

function resetAppearanceDefaults() {
  themeStore.resetThemeDefaults()
}

function resetPrivacyDefaults() {
  privacyForm.hideSteam = false
  privacyForm.hideSocials = false
  privacyForm.hideDetails = false
  privacyForm.hideLineups = false
  privacyForm.hideFromList = false
  themeStore.toggleUnreadNotificationBadge(true)
}

async function handleSaveSettings() {
  isSaving.value = true
  errorMessage.value = ''
  saveSuccess.value = false

  try {
    const updates = {
      inGameRole: profileForm.inGameRole,
      bio: profileForm.bio,
      gender: profileForm.gender,
      birthday: profileForm.birthday,
      avatar: profileForm.avatar,
      socials: { ...socialsForm },
      privacy: { ...privacyForm },
      notifications: { ...notificationsForm },
      themeSettings: {
        bg: themeStore.customBgColor,
        accent: themeStore.customAccentColor,
        modalBg: themeStore.customModalBgColor
      }
    }

    const success = await authStore.updateProfile(updates)
    if (success) {
      saveSuccess.value = true
      setTimeout(() => {
        saveSuccess.value = false
      }, 3000)
    } else {
      errorMessage.value = authStore.authError || 'Failed to save settings'
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error updating settings'
  } finally {
    isSaving.value = false
  }
}

async function handleDeleteAccount() {
  if (deleteConfirmInput.value.toUpperCase() !== 'DELETE') return
  try {
    await authStore.deleteAccount()
    isDeleteModalOpen.value = false
    emit('close')
  } catch (err) {
    alert('Failed to delete account')
  }
}

async function handleExportZipData() {
  isExportingZip.value = true
  exportSuccess.value = false

  try {
    const zip = new JSZip()

    const backupData = {
      exportDate: new Date().toISOString(),
      user: authStore.currentUser,
      lineups: lineupStore.customLineups,
      strats: stratStore.customStrats,
      boardElements: stratStore.boardElements,
      customCallouts: mapStore.customCallouts,
      customRadarImages: mapStore.customRadarImages,
      theme: {
        bgColor: themeStore.customBgColor,
        accentColor: themeStore.customAccentColor,
        modalBgColor: themeStore.customModalBgColor,
        themeMode: themeStore.theme
      }
    }

    zip.file('cs2_tactical_data_summary.json', JSON.stringify(backupData, null, 2))
    zip.file('lineups.json', JSON.stringify(lineupStore.customLineups, null, 2))
    zip.file('strats.json', JSON.stringify(stratStore.customStrats, null, 2))
    zip.file('custom_callouts.json', JSON.stringify(mapStore.customCallouts, null, 2))
    zip.file('user_profile.json', JSON.stringify(authStore.currentUser, null, 2))
    zip.file('local_storage_dump.json', JSON.stringify(localStorage, null, 2))

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CS2Nades_Tactical_Backup_${authStore.currentUser?.username || 'offline'}_${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportSuccess.value = true
    setTimeout(() => {
      exportSuccess.value = false
    }, 4000)
  } catch (e) {
    console.error('ZIP export error:', e)
    alert('Failed to package zip file: ' + String(e))
  } finally {
    isExportingZip.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      @click.self="emit('close')"
    >
      <div 
        class="relative w-full max-w-4xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] sm:max-h-[85vh]"
        :style="{ backgroundColor: themeStore.customModalBgColor }"
      >
        <!-- LEFT TABS SIDEBAR -->
        <div class="w-full md:w-60 bg-slate-950/80 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
          <div class="flex flex-col gap-3">
            <!-- USER BADGE -->
            <div class="flex items-center gap-3 p-2 bg-slate-900/60 rounded-2xl border border-slate-800">
              <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                <img
                  v-if="profileForm.avatar || authStore.currentUser?.avatar"
                  :src="profileForm.avatar || authStore.currentUser?.avatar"
                  class="w-full h-full object-cover"
                />
                <span v-else class="font-black text-sm text-amber-400 font-mono">
                  {{ authStore.currentUser?.username?.slice(0, 2).toUpperCase() || 'P' }}
                </span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-white text-xs truncate">{{ authStore.currentUser?.username }}</span>
                <span class="text-[10px] text-amber-400 font-mono">{{ profileForm.inGameRole || authStore.currentUser?.inGameRole || 'Player' }}</span>
              </div>
            </div>

            <!-- TABS -->
            <div class="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
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
                <span>Theme & Colors</span>
              </button>

              <button
                @click="activeTab = 'socials'"
                :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'socials' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
              >
                <LinkIcon class="w-4 h-4 shrink-0" />
                <span>Linked Accounts</span>
              </button>

              <button
                @click="activeTab = 'backup'"
                :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'backup' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
              >
                <FolderDown class="w-4 h-4 shrink-0" />
                <span>Data Backup (ZIP)</span>
              </button>

              <button
                @click="activeTab = 'privacy'"
                :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'privacy' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
              >
                <Shield class="w-4 h-4 shrink-0" />
                <span>Privacy & Alerts</span>
              </button>

              <button
                @click="activeTab = 'security'"
                :class="['flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer whitespace-nowrap shrink-0', activeTab === 'security' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white hover:bg-slate-900']"
              >
                <Lock class="w-4 h-4 shrink-0" />
                <span>Security & Account</span>
              </button>
            </div>
          </div>

          <button
            @click="emit('close')"
            class="hidden md:flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        <!-- RIGHT TAB CONTENT -->
        <div class="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
          <!-- TOP DESKTOP HEADER -->
          <div class="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
            <span class="text-xs font-black uppercase tracking-wider text-amber-400">Settings</span>
            <button
              @click="emit('close')"
              class="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- SCROLLABLE BODY -->
          <div class="flex-1 p-5 sm:p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
            <!-- TAB 1: PROFILE & BIO -->
            <div v-if="activeTab === 'profile'" class="flex flex-col gap-5 text-xs">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 class="text-sm font-black uppercase text-white tracking-wide">Profile Information</h3>
                <button
                  type="button"
                  @click="resetProfileDefaults"
                  class="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  title="Reset profile fields to default"
                >
                  <RotateCcw class="w-3 h-3" />
                  <span>Reset Section</span>
                </button>
              </div>

              <!-- AVATAR UPLOAD (WITH GIF SUPPORT) -->
              <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col gap-3">
                <label class="font-bold text-slate-200">Profile Icon / Avatar (GIF or Image)</label>
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border-2 border-amber-500/50 flex items-center justify-center shrink-0 shadow-md">
                    <img
                      v-if="profileForm.avatar"
                      :src="profileForm.avatar"
                      class="w-full h-full object-cover"
                      alt="Avatar Preview"
                    />
                    <span v-else class="text-slate-500 font-bold text-xs">No Icon</span>
                  </div>

                  <div class="flex-1 flex flex-col gap-2">
                    <label class="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl bg-slate-900/60 cursor-pointer transition-all group">
                      <Upload class="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span class="font-bold text-slate-200 text-xs">Upload Avatar / Animated GIF</span>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml" 
                        class="hidden" 
                        @change="handleAvatarFileUpload" 
                      />
                    </label>
                    <span v-if="avatarUploadError" class="text-rose-400 font-bold text-[11px]">{{ avatarUploadError }}</span>
                    <input
                      v-model="profileForm.avatar"
                      type="text"
                      placeholder="Or paste image URL (https://...)"
                      class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="font-bold text-slate-300">Competitive Role</label>
                  <select
                    v-model="profileForm.inGameRole"
                    class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs font-bold"
                  >
                    <option value="IGL">In-Game Leader (IGL)</option>
                    <option value="AWPer">Primary AWPer</option>
                    <option value="Entry Fragger">Entry Fragger</option>
                    <option value="Support / Utility">Support / Utility</option>
                    <option value="Lurker">Lurker</option>
                    <option value="Coach / Analyst">Coach / Analyst</option>
                  </select>
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

            <!-- TAB 2: THEME & POPUP GUI CUSTOMIZER WITH INTERACTIVE PREVIEW -->
            <div v-if="activeTab === 'appearance'" class="flex flex-col gap-5 text-xs">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 class="text-sm font-black uppercase text-white tracking-wide">Theme & Popup GUI Styling</h3>
                <button
                  type="button"
                  @click="resetAppearanceDefaults"
                  class="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  title="Reset theme and colors to default"
                >
                  <RotateCcw class="w-3 h-3" />
                  <span>Reset Section</span>
                </button>
              </div>

              <!-- 1. ACCENT COLOR CUSTOMIZER -->
              <div class="flex flex-col gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-black uppercase text-white text-xs">Website Accent Glow Color</h4>
                    <p class="text-slate-400 text-[11px]">Controls button highlights, badges, and tactical pins.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      :value="themeStore.customAccentColor"
                      @input="themeStore.setCustomAccentColor(($event.target as HTMLInputElement).value)"
                      class="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                      title="Open Color Wheel"
                    />
                    <input
                      type="text"
                      :value="themeStore.customAccentColor"
                      @input="themeStore.setCustomAccentColor(($event.target as HTMLInputElement).value)"
                      class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-center text-xs uppercase"
                      placeholder="#de9b35"
                    />
                  </div>
                </div>

                <!-- DYNAMIC PREVIOUSLY CHOSEN ACCENT CHIPS -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="text-[10px] text-slate-500 uppercase font-mono mr-1">Previously Chosen:</span>
                  <button
                    v-for="hex in themeStore.recentAccentColors"
                    :key="hex"
                    @click="themeStore.setCustomAccentColor(hex)"
                    :class="[
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono cursor-pointer transition-all',
                      themeStore.customAccentColor.toLowerCase() === hex.toLowerCase() ? 'bg-slate-800 border-white shadow' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    ]"
                  >
                    <div class="w-3 h-3 rounded-full border border-slate-700 shrink-0" :style="{ backgroundColor: hex }" />
                    <span class="text-slate-200">{{ hex }}</span>
                  </button>
                </div>
              </div>

              <!-- 2. BACKGROUND CANVAS COLOR CUSTOMIZER -->
              <div class="flex flex-col gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-black uppercase text-white text-xs">Website Canvas Background Color</h4>
                    <p class="text-slate-400 text-[11px]">Controls the overall application workspace backdrop.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      :value="themeStore.customBgColor"
                      @input="themeStore.setCustomBgColor(($event.target as HTMLInputElement).value)"
                      class="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                      title="Open Color Wheel"
                    />
                    <input
                      type="text"
                      :value="themeStore.customBgColor"
                      @input="themeStore.setCustomBgColor(($event.target as HTMLInputElement).value)"
                      class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-center text-xs uppercase"
                      placeholder="#090d13"
                    />
                  </div>
                </div>

                <!-- DYNAMIC PREVIOUSLY CHOSEN BG CHIPS -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="text-[10px] text-slate-500 uppercase font-mono mr-1">Previously Chosen:</span>
                  <button
                    v-for="hex in themeStore.recentBgColors"
                    :key="hex"
                    @click="themeStore.setCustomBgColor(hex)"
                    :class="[
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono cursor-pointer transition-all',
                      themeStore.customBgColor.toLowerCase() === hex.toLowerCase() ? 'bg-slate-800 border-white shadow' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    ]"
                  >
                    <div class="w-3 h-3 rounded-full border border-slate-700 shrink-0" :style="{ backgroundColor: hex }" />
                    <span class="text-slate-200">{{ hex }}</span>
                  </button>
                </div>
              </div>

              <!-- 3. POPUP GUI / MODAL BACKGROUND COLOR CUSTOMIZER -->
              <div class="flex flex-col gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-black uppercase text-white text-xs">Popup GUI / Modal Background Color</h4>
                    <p class="text-slate-400 text-[11px]">Controls the background color of dialog modals and popup panels.</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      :value="themeStore.customModalBgColor"
                      @input="themeStore.setCustomModalBgColor(($event.target as HTMLInputElement).value)"
                      class="w-8 h-8 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                      title="Open Color Wheel"
                    />
                    <input
                      type="text"
                      :value="themeStore.customModalBgColor"
                      @input="themeStore.setCustomModalBgColor(($event.target as HTMLInputElement).value)"
                      class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-center text-xs uppercase"
                      placeholder="#0f172a"
                    />
                  </div>
                </div>

                <!-- DYNAMIC PREVIOUSLY CHOSEN MODAL CHIPS -->
                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="text-[10px] text-slate-500 uppercase font-mono mr-1">Previously Chosen:</span>
                  <button
                    v-for="hex in themeStore.recentModalColors"
                    :key="hex"
                    @click="themeStore.setCustomModalBgColor(hex)"
                    :class="[
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono cursor-pointer transition-all',
                      themeStore.customModalBgColor.toLowerCase() === hex.toLowerCase() ? 'bg-slate-800 border-white shadow' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    ]"
                  >
                    <div class="w-3 h-3 rounded-full border border-slate-700 shrink-0" :style="{ backgroundColor: hex }" />
                    <span class="text-slate-200">{{ hex }}</span>
                  </button>
                </div>
              </div>

              <!-- 4. LIVE INTERACTIVE SAMPLE MODAL PREVIEW -->
              <div class="flex flex-col gap-2 p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <span class="font-bold text-white text-xs flex items-center gap-1.5">
                  <Layout class="w-3.5 h-3.5 text-amber-400" />
                  Live Sample Modal & Component Preview
                </span>
                
                <div 
                  class="p-4 rounded-2xl border border-slate-700/60 shadow-xl flex flex-col gap-3 transition-colors"
                  :style="{ backgroundColor: themeStore.customModalBgColor }"
                >
                  <div class="flex items-center justify-between border-b border-slate-700/50 pb-2">
                    <div class="flex items-center gap-2">
                      <Sparkles class="w-4 h-4" :style="{ color: themeStore.customAccentColor }" />
                      <span class="font-black text-white text-xs">Sample Modal Dialog</span>
                    </div>
                    <span 
                      class="px-2 py-0.5 rounded text-[10px] font-black text-slate-950 uppercase"
                      :style="{ backgroundColor: themeStore.customAccentColor }"
                    >
                      Active Accent
                    </span>
                  </div>

                  <p class="text-slate-300 text-xs">
                    This is how your customized popup modal looks with your selected colors.
                  </p>

                  <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/40">
                    <button
                      type="button"
                      class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs"
                    >
                      Secondary
                    </button>
                    <button
                      type="button"
                      class="px-4 py-1.5 font-black text-slate-950 rounded-lg text-xs shadow"
                      :style="{ backgroundColor: themeStore.customAccentColor }"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: LINKED SOCIALS -->
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
                  <label class="font-bold text-slate-300 flex items-center gap-1.5">
                    <span class="text-[#5865F2] font-bold">#</span>
                    <span>Discord Username / Tag</span>
                  </label>
                  <input
                    v-model="socialsForm.discordTag"
                    type="text"
                    placeholder="username#0000 or username"
                    class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <!-- DISCORD WEBHOOK DM NOTIFICATION -->
                <div class="flex flex-col gap-1.5 sm:col-span-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <label class="font-bold text-slate-200 flex items-center gap-2">
                    <Bell class="w-4 h-4 text-[#5865F2]" />
                    <span>Discord DM Forwarding Webhook</span>
                  </label>
                  <span class="text-[11px] text-slate-400">Receive an automated Discord ping whenever someone sends you a message.</span>
                  <input
                    v-model="socialsForm.discordWebhook"
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs font-mono mt-1"
                  />
                </div>
              </div>
            </div>

            <!-- TAB 4: DATA BACKUP & LOCAL ZIP EXPORT -->
            <div v-if="activeTab === 'backup'" class="flex flex-col gap-4 text-xs">
              <h3 class="text-sm font-black uppercase text-white tracking-wide">Data Backup & Local ZIP Export</h3>
              <p class="text-slate-400">
                Download all your personal lineups, custom tactical board saves, custom callouts, and profile settings into a single downloadable .ZIP archive.
              </p>

              <div class="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-bold text-white text-sm block">Export All Tactical Data to ZIP</span>
                    <span class="text-slate-400 text-xs">Packages lineups.json, strats.json, callouts.json, and user_profile.json</span>
                  </div>
                  <button
                    type="button"
                    @click="handleExportZipData"
                    :disabled="isExportingZip"
                    class="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <Download class="w-4 h-4" />
                    <span>{{ isExportingZip ? 'Packaging ZIP...' : 'Download ZIP' }}</span>
                  </button>
                </div>

                <div v-if="exportSuccess" class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
                  <Check class="w-4 h-4" />
                  <span>ZIP downloaded successfully to your computer!</span>
                </div>
              </div>
            </div>

            <!-- TAB 5: PRIVACY & NOTIFICATION ALERTS -->
            <div v-if="activeTab === 'privacy'" class="flex flex-col gap-4 text-xs">
              <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 class="text-sm font-black uppercase text-white tracking-wide">Privacy & Notification Settings</h3>
                <button
                  type="button"
                  @click="resetPrivacyDefaults"
                  class="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                  title="Reset privacy and notification options to default"
                >
                  <RotateCcw class="w-3 h-3" />
                  <span>Reset Section</span>
                </button>
              </div>

              <div class="flex flex-col gap-2.5">
                <!-- UNREAD MESSAGE NOTIFICATION BADGE TOGGLE -->
                <label class="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <MessageSquare class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="font-bold text-white block">Unread Message Notification Icon</span>
                      <span class="text-[11px] text-slate-400">Show glowing notification count badge on top navigation when messages arrive</span>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    :checked="themeStore.showUnreadNotificationBadge" 
                    @change="themeStore.toggleUnreadNotificationBadge(($event.target as HTMLInputElement).checked)"
                    class="w-4 h-4 accent-amber-500 cursor-pointer" 
                  />
                </label>

                <label class="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                  <div>
                    <span class="font-bold text-white block">Visible in Messages & Directory</span>
                    <span class="text-[11px] text-slate-400">Allow teammates to find your profile in the player directory</span>
                  </div>
                  <input 
                    type="checkbox" 
                    :checked="!privacyForm.hideFromList" 
                    @change="privacyForm.hideFromList = !($event.target as HTMLInputElement).checked"
                    class="w-4 h-4 accent-amber-500 cursor-pointer" 
                  />
                </label>

                <label class="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer">
                  <div>
                    <span class="font-bold text-white block">Hide Linked Socials</span>
                    <span class="text-[11px] text-slate-400">Do not display social profile links on your card</span>
                  </div>
                  <input v-model="privacyForm.hideSocials" type="checkbox" class="w-4 h-4 accent-amber-500 cursor-pointer" />
                </label>
              </div>
            </div>

            <!-- TAB 6: SECURITY & CLEAN DELETE -->
            <div v-if="activeTab === 'security'" class="flex flex-col gap-6 text-xs">
              <div class="flex flex-col gap-3">
                <h3 class="text-sm font-black uppercase text-white tracking-wide">Account Security</h3>

                <div class="flex flex-col gap-1.5">
                  <label class="font-bold text-slate-300">Account Email</label>
                  <input
                    v-model="securityForm.email"
                    type="email"
                    class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <!-- CLEAN DELETE ACCOUNT -->
              <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 mt-4">
                <div class="flex flex-col gap-0.5">
                  <span class="font-bold text-white text-xs">Delete Account & Data</span>
                  <span class="text-[11px] text-slate-400">Permanently wipe your account credentials and personal tactical files.</span>
                </div>
                <button
                  type="button"
                  @click="isDeleteModalOpen = true"
                  class="px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          <!-- FOOTER ACTIONS -->
          <div class="p-4 sm:px-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
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
                class="px-6 py-2.5 font-black text-slate-950 rounded-xl text-xs cursor-pointer shadow-lg disabled:opacity-50 transition-all"
                :style="{ backgroundColor: themeStore.customAccentColor }"
              >
                {{ isSaving ? 'Saving...' : 'Save' }}
              </button>
            </div>
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
        <h3 class="text-base font-black text-rose-400 uppercase">Confirm Delete</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          Type <span class="font-mono font-bold text-rose-400">DELETE</span> to confirm permanently removing your account.
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
            Delete
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
