import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { LayoutMode } from '../types'

const THEME_STORAGE_KEY = 'cs2_stratbook_theme_mode'
const PHONE_MODE_STORAGE_KEY = 'cs2_stratbook_phone_mode'
const LAYOUT_MODE_STORAGE_KEY = 'cs2_stratbook_layout_mode'
const BG_COLOR_STORAGE_KEY = 'cs2_stratbook_bg_color'
const ACCENT_COLOR_STORAGE_KEY = 'cs2_stratbook_accent_color'
const MODAL_BG_STORAGE_KEY = 'cs2_stratbook_modal_bg_color'
const RECENT_ACCENT_KEY = 'cs2_stratbook_recent_accents'
const RECENT_BG_KEY = 'cs2_stratbook_recent_bgs'
const RECENT_MODAL_KEY = 'cs2_stratbook_recent_modals'
const UNREAD_BADGE_KEY = 'cs2_stratbook_unread_badge_enabled'

export const PROTUTECH_THEME_KEY = 'protutech_theme_mode'
export const PROTUTECH_PALETTE_KEY = 'protutech_theme_palette'

export type ThemeMode = 'dark' | 'light'
export type ThemePalette =
  | 'protutech-obsidian'
  | 'adobe-classic'
  | 'cyber-emerald'
  | 'sunset-ember'
  | 'cs2-gold'

export interface PalettePreset {
  label: string
  bg: string
  surface: string
  modal: string
  hover: string
  accent: string
  secondary: string
  border: string
}

export const PALETTE_PRESETS: Record<ThemePalette, PalettePreset> = {
  'protutech-obsidian': {
    label: 'Obsidian Neon',
    bg: '#080c16',
    surface: '#0d1322',
    modal: '#121a2d',
    hover: '#18223b',
    accent: '#00f2fe',
    secondary: '#7f00ff',
    border: '#1e293b'
  },
  'adobe-classic': {
    label: 'Adobe Classic',
    bg: '#18181b',
    surface: '#202024',
    modal: '#27272a',
    hover: '#323238',
    accent: '#38bdf8',
    secondary: '#818cf8',
    border: '#3f3f46'
  },
  'cyber-emerald': {
    label: 'Cyber Emerald',
    bg: '#05100e',
    surface: '#091a17',
    modal: '#0f2824',
    hover: '#153832',
    accent: '#10b981',
    secondary: '#06b6d4',
    border: '#134e4a'
  },
  'sunset-ember': {
    label: 'Sunset Ember',
    bg: '#120910',
    surface: '#1d0f1a',
    modal: '#291525',
    hover: '#381c32',
    accent: '#f59e0b',
    secondary: '#f43f5e',
    border: '#4c1d3d'
  },
  'cs2-gold': {
    label: 'CS2 Gold',
    bg: '#090d13',
    surface: '#162032',
    modal: '#0f172a',
    hover: '#1e293b',
    accent: '#de9b35',
    secondary: '#f59e0b',
    border: '#1e293b'
  }
}

function parseHexToRgb(hexColor: string): string {
  let hex = (hexColor || '#00f2fe').replace('#', '').trim()
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const pr = parseInt(hex.substring(0, 2), 16)
  const pg = parseInt(hex.substring(2, 4), 16)
  const pb = parseInt(hex.substring(4, 6), 16)
  const r = Number.isNaN(pr) ? 0 : pr
  const g = Number.isNaN(pg) ? 242 : pg
  const b = Number.isNaN(pb) ? 254 : pb
  return `${r}, ${g}, ${b}`
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeMode>('dark')
  const palette = ref<ThemePalette>('protutech-obsidian')
  const isPhoneMode = ref<boolean>(false)
  const layoutMode = ref<LayoutMode>('auto')
  const windowWidth = ref<number>(typeof window !== 'undefined' ? window.innerWidth : 1200)

  const customBgColor = ref<string>(PALETTE_PRESETS['protutech-obsidian'].bg)
  const customAccentColor = ref<string>(PALETTE_PRESETS['protutech-obsidian'].accent)
  const customModalBgColor = ref<string>(PALETTE_PRESETS['protutech-obsidian'].modal)

  const effectiveBgColor = computed(() =>
    theme.value === 'light' ? '#f8fafc' : customBgColor.value
  )
  const effectiveModalBgColor = computed(() =>
    theme.value === 'light' ? '#ffffff' : customModalBgColor.value
  )

  const recentAccentColors = ref<string[]>([
    '#00f2fe',
    '#7f00ff',
    '#38bdf8',
    '#10b981',
    '#f59e0b',
    '#ef4444'
  ])
  const recentBgColors = ref<string[]>(['#080c16', '#0d1322', '#121a2d', '#18181b', '#05100e'])
  const recentModalColors = ref<string[]>(['#121a2d', '#18223b', '#202024', '#0f2824', '#291525'])

  const showUnreadNotificationBadge = ref<boolean>(true)

  const isDark = computed({
    get: () => theme.value === 'dark',
    set: (val: boolean) => setTheme(val ? 'dark' : 'light')
  })

  function loadTheme() {
    try {
      const storedPalette = localStorage.getItem(PROTUTECH_PALETTE_KEY) as ThemePalette | null
      if (storedPalette && storedPalette in PALETTE_PRESETS) {
        palette.value = storedPalette
      }

      const storedProtutechTheme = localStorage.getItem(PROTUTECH_THEME_KEY) as ThemeMode | null
      if (storedProtutechTheme === 'light' || storedProtutechTheme === 'dark') {
        theme.value = storedProtutechTheme
      } else {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        if (storedTheme === 'light' || storedTheme === 'dark') {
          theme.value = storedTheme
        }
      }

      const storedLayout = localStorage.getItem(LAYOUT_MODE_STORAGE_KEY) as LayoutMode | null
      if (storedLayout && ['auto', 'desktop', 'mobile'].includes(storedLayout)) {
        layoutMode.value = storedLayout
      }

      const storedPhone = localStorage.getItem(PHONE_MODE_STORAGE_KEY)
      if (storedPhone !== null) {
        isPhoneMode.value = storedPhone === 'true'
      } else if (typeof window !== 'undefined' && window.innerWidth < 768) {
        isPhoneMode.value = true
      }

      const activePreset = PALETTE_PRESETS[palette.value] || PALETTE_PRESETS['protutech-obsidian']
      const storedBg = localStorage.getItem(BG_COLOR_STORAGE_KEY)
      customBgColor.value = storedBg || activePreset.bg

      const storedAccent = localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)
      customAccentColor.value = storedAccent || activePreset.accent

      const storedModal = localStorage.getItem(MODAL_BG_STORAGE_KEY)
      customModalBgColor.value = storedModal || activePreset.modal

      const storedBadgePref = localStorage.getItem(UNREAD_BADGE_KEY)
      if (storedBadgePref !== null) showUnreadNotificationBadge.value = storedBadgePref === 'true'

      const storedRecentAccents = localStorage.getItem(RECENT_ACCENT_KEY)
      if (storedRecentAccents) recentAccentColors.value = JSON.parse(storedRecentAccents)

      const storedRecentBgs = localStorage.getItem(RECENT_BG_KEY)
      if (storedRecentBgs) recentBgColors.value = JSON.parse(storedRecentBgs)

      const storedRecentModals = localStorage.getItem(RECENT_MODAL_KEY)
      if (storedRecentModals) recentModalColors.value = JSON.parse(storedRecentModals)
    } catch (e) {
      console.error('Failed to load theme preference', e)
    }
  }

  function applyTheme() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const isLight = theme.value === 'light'
    const preset = PALETTE_PRESETS[palette.value] || PALETTE_PRESETS['protutech-obsidian']

    if (isLight) {
      root.classList.remove('dark')
      root.classList.add('light-theme')
    } else {
      root.classList.remove('light-theme')
      root.classList.add('dark')
    }

    root.setAttribute('data-palette', palette.value)
    root.setAttribute('data-theme', theme.value)
    root.style.colorScheme = theme.value

    Array.from(root.classList).forEach((cls) => {
      if (cls.startsWith('palette-')) {
        root.classList.remove(cls)
      }
    })
    root.classList.add(`palette-${palette.value}`)

    if (isPhoneMode.value) {
      root.classList.add('phone-mode-active')
      root.classList.remove('desktop-mode-active')
    } else {
      root.classList.remove('phone-mode-active')
      root.classList.add('desktop-mode-active')
    }

    const activeBg = effectiveBgColor.value
    const activeModalBg = effectiveModalBgColor.value
    const activeSurface = isLight ? '#f1f5f9' : preset.surface
    const activeHover = isLight ? '#e2e8f0' : preset.hover
    const activeBorder = isLight ? '#e2e8f0' : preset.border
    const activeAccent = customAccentColor.value || preset.accent
    const accentRgb = parseHexToRgb(activeAccent)

    root.style.setProperty('--app-bg', activeBg)
    root.style.setProperty('--app-surface', activeSurface)
    root.style.setProperty('--app-modal-bg', activeModalBg)
    root.style.setProperty('--app-hover', activeHover)
    root.style.setProperty('--app-border', activeBorder)
    root.style.setProperty('--app-accent', activeAccent)
    root.style.setProperty('--app-secondary', preset.secondary)
    root.style.setProperty('--primary-accent', activeAccent)
    root.style.setProperty('--app-accent-rgb', accentRgb)
    root.style.setProperty('--primary-accent-rgb', accentRgb)

    root.style.setProperty('--color-bg-base', activeBg)
    root.style.setProperty('--color-bg-surface', activeSurface)
    root.style.setProperty('--color-bg-card', activeModalBg)
    root.style.setProperty('--color-bg-hover', activeHover)
    root.style.setProperty('--color-border', activeBorder)
    root.style.setProperty('--color-accent-primary', activeAccent)
    root.style.setProperty('--color-accent-secondary', preset.secondary)
    root.style.setProperty('--color-cs-gold', activeAccent)
    root.style.setProperty('--color-cs-gold-hover', activeAccent + 'ee')

    if (document.body) {
      document.body.style.backgroundColor = activeBg
      document.body.style.color = isLight ? '#0f172a' : '#f8fafc'
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) {
      themeMeta.setAttribute('content', activeBg)
    }
  }

  function addRecentColor(listRef: typeof recentAccentColors, color: string, storageKey: string) {
    if (!color || !color.startsWith('#')) return
    const normalized = color.toLowerCase()
    const updated = [normalized, ...listRef.value.filter((c) => c.toLowerCase() !== normalized)].slice(
      0,
      10
    )
    listRef.value = updated
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  function setPalette(newPalette: ThemePalette) {
    const targetPalette: ThemePalette =
      newPalette in PALETTE_PRESETS ? newPalette : 'protutech-obsidian'
    const preset = PALETTE_PRESETS[targetPalette]

    palette.value = targetPalette
    customBgColor.value = preset.bg
    customAccentColor.value = preset.accent
    customModalBgColor.value = preset.modal

    localStorage.setItem(PROTUTECH_PALETTE_KEY, targetPalette)
    localStorage.setItem(BG_COLOR_STORAGE_KEY, preset.bg)
    localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, preset.accent)
    localStorage.setItem(MODAL_BG_STORAGE_KEY, preset.modal)
    applyTheme()
  }

  function setTheme(newTheme: ThemeMode) {
    theme.value = newTheme
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    localStorage.setItem(PROTUTECH_THEME_KEY, newTheme)
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
    showUnreadNotificationBadge.value =
      enabled !== undefined ? enabled : !showUnreadNotificationBadge.value
    localStorage.setItem(UNREAD_BADGE_KEY, String(showUnreadNotificationBadge.value))
  }

  function resetThemeDefaults() {
    theme.value = 'dark'
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    localStorage.setItem(PROTUTECH_THEME_KEY, 'dark')
    setPalette('protutech-obsidian')
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setLayoutMode(mode: LayoutMode) {
    layoutMode.value = mode
    localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, mode)
    if (mode === 'mobile') {
      isPhoneMode.value = true
    } else if (mode === 'desktop') {
      isPhoneMode.value = false
    } else {
      isPhoneMode.value = windowWidth.value < 768
    }
    localStorage.setItem(PHONE_MODE_STORAGE_KEY, String(isPhoneMode.value))
    applyTheme()
  }

  function togglePhoneMode() {
    isPhoneMode.value = !isPhoneMode.value
    layoutMode.value = isPhoneMode.value ? 'mobile' : 'desktop'
    localStorage.setItem(PHONE_MODE_STORAGE_KEY, String(isPhoneMode.value))
    localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, layoutMode.value)
    applyTheme()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      windowWidth.value = window.innerWidth
      if (layoutMode.value === 'auto') {
        isPhoneMode.value = window.innerWidth < 768
        applyTheme()
      }
    })
  }

  const isCompactMobile = computed(() => {
    return isPhoneMode.value || windowWidth.value < 768
  })

  watch(isPhoneMode, () => {
    applyTheme()
  })

  loadTheme()
  applyTheme()

  return {
    theme,
    isDark,
    palette,
    layoutMode,
    isPhoneMode,
    windowWidth,
    isCompactMobile,
    customBgColor,
    customAccentColor,
    customModalBgColor,
    effectiveBgColor,
    effectiveModalBgColor,
    recentAccentColors,
    recentBgColors,
    recentModalColors,
    showUnreadNotificationBadge,
    setTheme,
    setPalette,
    setLayoutMode,
    setCustomBgColor,
    setCustomAccentColor,
    setCustomModalBgColor,
    toggleUnreadNotificationBadge,
    resetThemeDefaults,
    toggleTheme,
    togglePhoneMode
  }
})
