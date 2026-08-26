<script setup lang="ts">
import { onMounted, watch } from 'vue'
import Navbar from './components/layout/Navbar.vue'
import AuthModal from './components/auth/AuthModal.vue'
import GlobalConfirmModal from './components/common/GlobalConfirmModal.vue'
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
  if (isAuth) {
    authStore.isAuthModalOpen = false
  } else {
    authStore.isAuthModalOpen = true
  }
}, { immediate: true })
</script>

<template>
  <div 
    class="app-root min-h-screen text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200"
    :style="{ backgroundColor: themeStore.customBgColor }"
  >
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
          <span class="font-mono text-xs text-slate-300 font-bold">Protutech | CS2 nade</span>
        </div>
        <div class="flex items-center gap-4 text-xs font-semibold">
          <a 
            href="https://discord.gg/XEDqfYEW5h" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-[#5865F2] hover:text-[#7289da] hover:underline flex items-center gap-1.5 font-bold transition-colors"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Discord Community</span>
          </a>
          <span class="text-slate-700">•</span>
          <span class="text-slate-500">v2.0</span>
        </div>
      </div>
    </footer>

    <!-- GLOBAL AUTH MODAL -->
    <AuthModal />

    <!-- GLOBAL CENTERED CONFIRMATION MODAL -->
    <GlobalConfirmModal />
  </div>
</template>
