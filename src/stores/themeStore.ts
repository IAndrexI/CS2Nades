import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const THEME_STORAGE_KEY = 'cs2_stratbook_theme_mode'
const PHONE_MODE_STORAGE_KEY = 'cs2_stratbook_phone_mode'

export type ThemeMode = 'dark' | 'light'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeMode>('dark')
  const isPhoneMode = ref<boolean>(false)
  const windowWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1200)

  // Initialize from localStorage
  function loadTheme() {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      if (storedTheme === 'light' || storedTheme === 'dark') {
        theme.value = storedTheme
      }
      const storedPhone = localStorage.getItem(PHONE_MODE_STORAGE_KEY)
      if (storedPhone !== null) {
        isPhoneMode.value = storedPhone === 'true'
      }
    } catch (e) {
      console.error('Failed to load theme preference', e)
    }
  }

  function applyTheme() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    
    if (theme.value === 'light') {
      root.classList.remove('dark')
      root.classList.add('light-theme')
    } else {
      root.classList.remove('light-theme')
      root.classList.add('dark')
    }

    if (isPhoneMode.value) {
      root.classList.add('phone-mode-active')
    } else {
      root.classList.remove('phone-mode-active')
    }
  }

  function setTheme(newTheme: ThemeMode) {
    theme.value = newTheme
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function togglePhoneMode() {
    isPhoneMode.value = !isPhoneMode.value
    localStorage.setItem(PHONE_MODE_STORAGE_KEY, String(isPhoneMode.value))
    applyTheme()
  }

  // Handle window resize
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      windowWidth.value = window.innerWidth
    })
  }

  const isCompactMobile = computed(() => {
    return isPhoneMode.value || windowWidth.value < 768
  })

  loadTheme()
  applyTheme()

  return {
    theme,
    isPhoneMode,
    windowWidth,
    isCompactMobile,
    setTheme,
    toggleTheme,
    togglePhoneMode
  }
})
