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
  CheckCircle2
} from 'lucide-vue-next'

const authStore = useAuthStore()

const form = reactive({
  username: '',
  email: '',
  password: '',
  inGameRole: 'Entry' as 'IGL' | 'Entry' | 'Support' | 'Lurker' | 'AWP'
})

const roles = ['IGL', 'Entry', 'Support', 'Lurker', 'AWP']

async function handleSubmit() {
  if (authStore.authMode === 'login') {
    await authStore.login(form.username, form.password)
  } else {
    await authStore.register(form.username, form.email, form.password, form.inGameRole)
  }
}
</script>

<template>
  <div 
    v-if="authStore.isAuthModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    @click.self="authStore.isAuthModalOpen = false"
  >
    <div class="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <User class="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 class="text-base font-black tracking-tight text-white">
              {{ authStore.authMode === 'login' ? 'Sign In to Stratbook' : 'Create Team Account' }}
            </h2>
            <p class="text-xs text-slate-400">
              {{ authStore.authMode === 'login' ? 'Access your personal lineups and team playbooks' : 'Join your squad with your custom tactical role' }}
            </p>
          </div>
        </div>

        <button 
          @click="authStore.isAuthModalOpen = false"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- FORM -->
      <form @submit.prevent="handleSubmit" class="p-6 flex flex-col gap-4 text-xs">
        <!-- ERROR MESSAGE -->
        <div 
          v-if="authStore.authError"
          class="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-2 font-medium"
        >
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ authStore.authError }}</span>
        </div>

        <!-- USERNAME -->
        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Username</label>
          <div class="relative">
            <User class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              v-model="form.username" 
              type="text" 
              required
              placeholder="e.g. S1mple / NiKo"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- EMAIL (IF REGISTER) -->
        <div v-if="authStore.authMode === 'register'" class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Email (Optional)</label>
          <div class="relative">
            <Mail class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              v-model="form.email" 
              type="email" 
              placeholder="player@team.com"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- IN-GAME ROLE (IF REGISTER) -->
        <div v-if="authStore.authMode === 'register'" class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">In-Game Role</label>
          <div class="grid grid-cols-5 gap-1.5">
            <button
              v-for="role in roles"
              :key="role"
              type="button"
              @click="form.inGameRole = role as any"
              :class="[
                'py-1.5 rounded-lg font-bold font-mono text-[11px] transition-all cursor-pointer text-center',
                form.inGameRole === role 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              ]"
            >
              {{ role }}
            </button>
          </div>
        </div>

        <!-- PASSWORD -->
        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Password</label>
          <div class="relative">
            <Lock class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              v-model="form.password" 
              type="password" 
              required
              placeholder="••••••••"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- SUBMIT BUTTON -->
        <button 
          type="submit"
          :disabled="authStore.isLoading"
          class="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
        >
          <LogIn v-if="authStore.authMode === 'login'" class="w-4 h-4 stroke-[3]" />
          <UserPlus v-else class="w-4 h-4 stroke-[3]" />
          <span>{{ authStore.authMode === 'login' ? 'Sign In' : 'Register Account' }}</span>
        </button>

        <!-- SWITCH MODE TOGGLE -->
        <div class="text-center pt-2 border-t border-slate-800 text-slate-400 text-[11px]">
          <span v-if="authStore.authMode === 'login'">
            Don't have an account? 
            <button 
              type="button" 
              @click="authStore.authMode = 'register'" 
              class="text-amber-400 font-bold hover:underline ml-1 cursor-pointer"
            >
              Create one
            </button>
          </span>
          <span v-else>
            Already have an account? 
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
</template>
