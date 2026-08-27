import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const THEME_STORAGE_KEY = 'cs2_stratbook_theme_mode'
const PHONE_MODE_STORAGE_KEY = 'cs2_stratbook_phone_mode'
const BG_COLOR_STORAGE_KEY = 'cs2_stratbook_bg_color'
const ACCENT_COLOR_STORAGE_KEY = 'cs2_stratbook_accent_color'
const MODAL_BG_STORAGE_KEY = 'cs2_stratbook_modal_bg_color'
const RECENT_ACCENT_KEY = 'cs2_stratbook_recent_accents'
const RECENT_BG_KEY = 'cs2_stratbook_recent_bgs'
const RECENT_MODAL_KEY = 'cs2_stratbook_recent_modals'
const UNREAD_BADGE_KEY = 'cs2_stratbook_unread_badge_enabled'

export type ThemeMode = 'dark' | 'light'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeMode>('dark')
  const isPhoneMode = ref<boolean>(false)
  const windowWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1200)

  const customBgColor = ref<string>('#090d13')
  const customAccentColor = ref<string>('#de9b35')
  const customModalBgColor = ref<string>('#0f172a')

  const recentAccentColors = ref<string[]>(['#de9b35', '#f97316', '#0ea5e9', '#ef4444', '#22c55e', '#a855f7'])
  const recentBgColors = ref<string[]>(['#090d13', '#05070a', '#10141d', '#0b1118', '#141824'])
  const recentModalColors = ref<string[]>(['#0f172a', '#0a0f18', '#111827', '#181b26', '#141c2b'])

  const showUnreadNotificationBadge = ref<boolean>(true)

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
      const storedBg = localStorage.getItem(BG_COLOR_STORAGE_KEY)
      if (storedBg) {
        customBgColor.value = storedBg
      }
      const storedAccent = localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)
      if (storedAccent) {
        customAccentColor.value = storedAccent
      }
      const storedModal = localStorage.getItem(MODAL_BG_STORAGE_KEY)
      if (storedModal) {
        customModalBgColor.value = storedModal
      }
      const storedBadgePref = localStorage.getItem(UNREAD_BADGE_KEY)
      if (storedBadgePref !== null) {
        showUnreadNotificationBadge.value = storedBadgePref === 'true'
      }
      const storedRecentAccents = localStorage.getItem(RECENT_ACCENT_KEY)
      if (storedRecentAccents) {
        recentAccentColors.value = JSON.parse(storedRecentAccents)
      }
      const storedRecentBgs = localStorage.getItem(RECENT_BG_KEY)
      if (storedRecentBgs) {
        recentBgColors.value = JSON.parse(storedRecentBgs)
      }
      const storedRecentModals = localStorage.getItem(RECENT_MODAL_KEY)
      if (storedRecentModals) {
        recentModalColors.value = JSON.parse(storedRecentModals)
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

    // Apply custom background & accent colors
    root.style.setProperty('--app-bg', customBgColor.value)
    root.style.setProperty('--app-accent', customAccentColor.value)
    root.style.setProperty('--app-modal-bg', customModalBgColor.value)
    root.style.setProperty('--primary-accent', customAccentColor.value)
    root.style.setProperty('--color-cs-gold', customAccentColor.value)
    root.style.setProperty('--color-cs-gold-hover', customAccentColor.value + 'ee')

    // Compute RGB for dynamic alpha transparency
    let hex = customAccentColor.value.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const r = parseInt(hex.substring(0, 2), 16) || 222
    const g = parseInt(hex.substring(2, 4), 16) || 155
    const b = parseInt(hex.substring(4, 6), 16) || 53
    root.style.setProperty('--app-accent-rgb', `${r}, ${g}, ${b}`)
    root.style.setProperty('--primary-accent-rgb', `${r}, ${g}, ${b}`)

    if (document.body) {
      document.body.style.backgroundColor = customBgColor.value
    }
  }

  function addRecentColor(listRef: typeof recentAccentColors, color: string, storageKey: string) {
    if (!color || !color.startsWith('#')) return
    const normalized = color.toLowerCase()
    const updated = [normalized, ...listRef.value.filter(c => c.toLowerCase() !== normalized)].slice(0, 10)
    listRef.value = updated
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  function setTheme(newTheme: ThemeMode) {
    theme.value = newTheme
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme()
  }

  function setCustomBgColor(color: string) {
    if (!color) return
    customBgColor.value = color
    localStorage.setItem(BG_COLOR_STORAGE_KEY, color)
    addRecentColor(recentBgColors, color, RECENT_BG_KEY)
    applyTheme()
  }

  function setCustomAccentColor(color: string) {
    if (!color) return
    customAccentColor.value = color
    localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, color)
    addRecentColor(recentAccentColors, color, RECENT_ACCENT_KEY)
    applyTheme()
  }

  function setCustomModalBgColor(color: string) {
    if (!color) return
    customModalBgColor.value = color
    localStorage.setItem(MODAL_BG_STORAGE_KEY, color)
    addRecentColor(recentModalColors, color, RECENT_MODAL_KEY)
    applyTheme()
  }

  function toggleUnreadNotificationBadge(enabled?: boolean) {
    showUnreadNotificationBadge.value = enabled !== undefined ? enabled : !showUnreadNotificationBadge.value
    localStorage.setItem(UNREAD_BADGE_KEY, String(showUnreadNotificationBadge.value))
  }

  function resetThemeDefaults() {
    customBgColor.value = '#090d13'
    customAccentColor.value = '#de9b35'
    customModalBgColor.value = '#0f172a'
    localStorage.setItem(BG_COLOR_STORAGE_KEY, '#090d13')
    localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, '#de9b35')
    localStorage.setItem(MODAL_BG_STORAGE_KEY, '#0f172a')
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
    customBgColor,
    customAccentColor,
    customModalBgColor,
    recentAccentColors,
    recentBgColors,
    recentModalColors,
    showUnreadNotificationBadge,
    setTheme,
    setCustomBgColor,
    setCustomAccentColor,
    setCustomModalBgColor,
    toggleUnreadNotificationBadge,
    resetThemeDefaults,
    toggleTheme,
    togglePhoneMode
  }
})
