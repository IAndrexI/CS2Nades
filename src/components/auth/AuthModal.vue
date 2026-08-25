<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { 
  X, 
  User, 
  Lock, 
  Mail, 
  Shield, 
  Crosshair, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  ExternalLink,
  Sparkles,
  Check
} from 'lucide-vue-next'

const authStore = useAuthStore()

const activeTab = ref<'credentials' | 'steam'>('credentials')

const steamForm = reactive({
  steamInput: '',
  inGameRole: 'Entry Fragger'
})

const credentialsForm = reactive({
  username: '',
  email: '',
  password: '',
  inGameRole: 'Entry Fragger'
})

const roles = ['IGL', 'Entry Fragger', 'Support', 'AWPer', 'Lurker', 'Anchor', 'Flex']

async function handleSteamSync() {
  if (!steamForm.steamInput.trim()) {
    authStore.authError = 'Please enter your Steam Profile URL or SteamID'
    return
  }
  await authStore.loginWithSteamProfile(steamForm.steamInput.trim(), steamForm.inGameRole)
}

async function handleCredentialsSubmit() {
  if (authStore.authMode === 'login') {
    await authStore.login(credentialsForm.username, credentialsForm.password)
  } else {
    await authStore.register(credentialsForm.username, credentialsForm.email, credentialsForm.password, credentialsForm.inGameRole)
  }
}

async function handleQuickGuest() {
  const randNum = Math.floor(1000 + Math.random() * 9000)
  await authStore.register(`TacticalPlayer_${randNum}`, `player${randNum}@protutech.local`, `protutech123`, credentialsForm.inGameRole)
}
</script>

<template>
  <div 
    v-if="authStore.isAuthModalOpen"
    class="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex min-h-full items-center justify-center p-4 sm:p-6 text-center animate-fade-in"
    @click.self="authStore.isAuthenticated ? (authStore.isAuthModalOpen = false) : null"
  >
    <div class="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto text-left flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
        <div class="flex items-center gap-3">
          <img src="/logo.png" alt="Protutech" class="w-10 h-10 rounded-xl object-cover shadow-lg border border-amber-500/40" />
          <div>
            <h2 class="text-base font-black tracking-tight text-white uppercase">
              Protutech Tactical Access
            </h2>
            <p class="text-xs text-slate-400">
              Sign up or log in to manage your lineups, friends, and tactical strats
            </p>
          </div>
        </div>

        <button 
          v-if="authStore.isAuthenticated"
          @click="authStore.isAuthModalOpen = false"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- TABS: STEAM vs STANDARD CREDENTIALS -->
      <div class="flex items-center border-b border-slate-800 bg-slate-950/40 px-6 pt-3">
        <button
          @click="activeTab = 'steam'"
          :class="[
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'steam'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          ]"
        >
          <!-- STEAM ICON -->
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5l1.62-2.36a3.68 3.68 0 0 1-.46-.34L7.5 17.1a2.8 2.8 0 1 1 2.8-2.8l1.7 1.15a3.65 3.65 0 1 1 5.3 4.15l-1.95 1.35A10 10 0 1 0 12 2zm3.3 12.35a2.15 2.15 0 1 0 0 4.3 2.15 2.15 0 0 0 0-4.3z" />
          </svg>
          <span>Steam Profile Connect</span>
        </button>

        <button
          @click="activeTab = 'credentials'"
          :class="[
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'credentials'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          ]"
        >
          <User class="w-3.5 h-3.5" />
          <span>Username & Password</span>
        </button>
      </div>

      <!-- BODY -->
      <div class="p-6 flex flex-col gap-4 text-xs">
        <!-- ERROR MESSAGE -->
        <div 
          v-if="authStore.authError"
          class="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2 font-medium animate-fade-in"
        >
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ authStore.authError }}</span>
        </div>

        <!-- TAB 1: STEAM LOGIN & PROFILE SYNC -->
        <template v-if="activeTab === 'steam'">
          <!-- 1-CLICK STEAM OPENID BUTTON -->
          <div class="flex flex-col gap-2">
            <button
              type="button"
              @click="authStore.loginWithSteamOpenId()"
              class="w-full py-3 px-4 bg-[#171a21] hover:bg-[#2a475e] text-white border border-[#2a475e] font-black text-xs rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-3 group"
            >
              <svg class="w-5 h-5 fill-[#66c0f4] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5l1.62-2.36a3.68 3.68 0 0 1-.46-.34L7.5 17.1a2.8 2.8 0 1 1 2.8-2.8l1.7 1.15a3.65 3.65 0 1 1 5.3 4.15l-1.95 1.35A10 10 0 1 0 12 2zm3.3 12.35a2.15 2.15 0 1 0 0 4.3 2.15 2.15 0 0 0 0-4.3z" />
              </svg>
              <span class="tracking-wide">Sign In Directly with Steam (1-Click)</span>
            </button>
          </div>

          <!-- DIVIDER -->
          <div class="flex items-center gap-3 my-1">
            <div class="flex-grow h-px bg-slate-800"></div>
            <span class="text-[10px] uppercase font-mono text-slate-500 font-bold">Or Pull Profile via Steam Link</span>
            <div class="flex-grow h-px bg-slate-800"></div>
          </div>

          <!-- STEAM PROFILE URL / ID INPUT -->
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Steam Profile Link or SteamID64</label>
            <input 
              v-model="steamForm.steamInput" 
              type="text" 
              placeholder="https://steamcommunity.com/id/s1mple or 76561198..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
            />
            <span class="text-[10px] text-slate-500">
              Automatically pulls your CS2 gamer tag and high-res Steam avatar!
            </span>
          </div>

          <!-- IN-GAME ROLE SELECTION -->
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Your Tactical Squad Role</label>
            <div class="grid grid-cols-5 gap-1.5">
              <button
                v-for="role in roles"
                :key="role"
                type="button"
                @click="steamForm.inGameRole = role as any"
                :class="[
                  'py-2 rounded-xl font-bold font-mono text-[11px] transition-all cursor-pointer text-center',
                  steamForm.inGameRole === role 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                ]"
              >
                {{ role }}
              </button>
            </div>
          </div>

          <!-- CONNECT BUTTON -->
          <button 
            type="button"
            @click="handleSteamSync"
            :disabled="authStore.isLoading"
            class="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
          >
            <Sparkles class="w-4 h-4 stroke-[2.5]" />
            <span>Sync & Enter Stratbook</span>
          </button>
        </template>

        <!-- TAB 2: USERNAME / PASSWORD -->
        <form v-else @submit.prevent="handleCredentialsSubmit" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Username</label>
            <div class="relative">
              <User class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                v-model="credentialsForm.username" 
                type="text" 
                required
                placeholder="Username (e.g. admin)"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <div v-if="authStore.authMode === 'register'" class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Email (Optional)</label>
            <div class="relative">
              <Mail class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                v-model="credentialsForm.email" 
                type="email" 
                placeholder="player@team.com"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Password</label>
            <div class="relative">
              <Lock class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                v-model="credentialsForm.password" 
                type="password" 
                required
                placeholder="••••••••"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          <!-- ROLE SELECTOR & CUSTOM ROLE (WHEN REGISTERING) -->
          <div v-if="authStore.authMode === 'register'" class="flex flex-col gap-1.5">
            <label class="font-bold text-slate-300">Tactical Role</label>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="r in roles.slice(0, 6)"
                :key="r"
                type="button"
                @click="credentialsForm.inGameRole = r"
                :class="[
                  'px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center',
                  credentialsForm.inGameRole === r
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                ]"
              >
                {{ r }}
              </button>
            </div>
            <input
              v-model="credentialsForm.inGameRole"
              type="text"
              placeholder="Or type custom role (e.g. Captain, Re-fragger)..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500 mt-1"
            />
          </div>

          <button 
            type="submit"
            :disabled="authStore.isLoading"
            class="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
          >
            <LogIn v-if="authStore.authMode === 'login'" class="w-4 h-4 stroke-[3]" />
            <UserPlus v-else class="w-4 h-4 stroke-[3]" />
            <span>{{ authStore.authMode === 'login' ? 'Sign In' : 'Register' }}</span>
          </button>

          <div class="text-center pt-2 border-t border-slate-800 text-slate-400 text-[11px]">
            <span v-if="authStore.authMode === 'login'">
              Need an account? 
              <button 
                type="button" 
                @click="authStore.authMode = 'register'" 
                class="text-amber-400 font-bold hover:underline ml-1 cursor-pointer"
              >
                Register
              </button>
            </span>
            <span v-else>
              Already registered? 
              <button 
                type="button" 
                @click="authStore.authMode = 'login'" 
                class="text-amber-400 font-bold hover:underline ml-1 cursor-pointer"
              >
                Sign In
              </button>
            </span>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
