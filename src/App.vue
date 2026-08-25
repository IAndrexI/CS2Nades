<script setup lang="ts">
import { onMounted, watch } from 'vue'
import Navbar from './components/layout/Navbar.vue'
import AuthModal from './components/auth/AuthModal.vue'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'

const authStore = useAuthStore()
const themeStore = useThemeStore()

// Auto-detect mobile screen on load and resize
function checkAutoMobile() {
  if (typeof window !== 'undefined') {
    const isMobileViewport = window.innerWidth < 768
    if (isMobileViewport && !themeStore.isPhoneMode) {
      themeStore.isPhoneMode = true
    }
  }
}

onMounted(() => {
  checkAutoMobile()
  window.addEventListener('resize', checkAutoMobile)

  // Enforce Sign In / Account creation to use Protutech
  if (!authStore.isAuthenticated) {
    authStore.isAuthModalOpen = true
  }
})

// Watch auth status
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (!isAuth) {
    authStore.isAuthModalOpen = true
  }
})
</script>

<template>
  <div class="app-root min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
    <!-- NAVBAR -->
    <Navbar />

    <!-- MAIN VIEW ROUTER CONTENT -->
    <main class="flex-grow">
      <router-view />
    </main>

    <!-- PROTUTECH CLEAN FOOTER -->
    <footer class="mt-auto border-t border-slate-900 bg-slate-950/80 py-5 text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <img src="/logo.png" alt="Protutech" class="w-5 h-5 rounded-md object-cover" />
          <span class="font-mono text-xs text-slate-300 font-bold">Protutech // CS2 Tactical Hub</span>
        </div>
        <div class="flex items-center gap-4 text-xs font-semibold">
          <a 
            href="https://discord.gg/XEDqfYEW5h" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-[#5865F2] hover:underline flex items-center gap-1.5"
          >
            <span>Discord Server</span>
          </a>
          <span class="text-slate-700">•</span>
          <span class="text-slate-500">v2.0</span>
        </div>
      </div>
    </footer>

    <!-- GLOBAL AUTH MODAL -->
    <AuthModal />
  </div>
</template>
