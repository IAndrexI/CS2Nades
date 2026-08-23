import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import axios from 'axios'
import type { UserProfile } from './authStore'

export interface SiteSettings {
  siteTitle: string
  teamName: string
  logoUrl?: string
  primaryAccentColor: string
  allowRegistration: boolean
  defaultRadarMode: 'official' | 'blueprint' | 'hybrid'
  defaultRadarOpacity: number
  customRadars?: Record<string, string>
  customMaps?: any[]
}

const SETTINGS_STORAGE_KEY = 'cs2_stratbook_admin_settings'

export const useAdminStore = defineStore('admin', () => {
  const settings = ref<SiteSettings>({
    siteTitle: 'CS2 STRATBOOK',
    teamName: 'PRO TACTICS',
    logoUrl: '',
    primaryAccentColor: '#de9b35',
    allowRegistration: true,
    defaultRadarMode: 'official',
    defaultRadarOpacity: 0.92,
    customRadars: {},
    customMaps: []
  })

  const usersList = ref<UserProfile[]>([])
  const isLoading = ref<boolean>(false)
  const isSettingsModalOpen = ref<boolean>(false)

  // Initialize from Storage
  try {
    const cached = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (cached) {
      settings.value = { ...settings.value, ...JSON.parse(cached) }
    }
  } catch (e) {
    console.error('Failed to parse settings cache', e)
  }

  // Apply CSS root variables dynamically for theme colors
  function applyThemeVariables() {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-cs-gold', settings.value.primaryAccentColor)
      // Apply accent color glow
      document.documentElement.style.setProperty('--color-cs-gold-hover', settings.value.primaryAccentColor + 'dd')
    }
  }

  applyThemeVariables()

  watch(settings, (newVal) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newVal))
    applyThemeVariables()
  }, { deep: true })

  async function fetchSettings() {
    try {
      const res = await axios.get('/api/settings')
      settings.value = { ...settings.value, ...res.data }
      applyThemeVariables()
    } catch (e) {
      // Offline fallback
      applyThemeVariables()
    }
  }

  async function saveSettings(newSettings: Partial<SiteSettings>): Promise<boolean> {
    try {
      const res = await axios.put('/api/admin/settings', newSettings)
      settings.value = { ...settings.value, ...res.data }
      applyThemeVariables()
      return true
    } catch (e) {
      // Fallback
      settings.value = { ...settings.value, ...newSettings }
      applyThemeVariables()
      return true
    }
  }

  async function fetchUsers(): Promise<UserProfile[]> {
    isLoading.value = true
    try {
      const res = await axios.get('/api/admin/users')
      usersList.value = res.data
      return res.data
    } catch (e) {
      // Fallback mock
      return usersList.value
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(id: string, data: { role?: string; inGameRole?: string; newPassword?: string }): Promise<boolean> {
    try {
      const res = await axios.put(`/api/admin/users/${id}`, data)
      const idx = usersList.value.findIndex(u => u.id === id)
      if (idx >= 0) {
        usersList.value[idx] = res.data
      }
      return true
    } catch (e) {
      const idx = usersList.value.findIndex(u => u.id === id)
      if (idx >= 0) {
        usersList.value[idx] = { ...usersList.value[idx], ...data } as any
      }
      return true
    }
  }

  async function deleteUser(id: string): Promise<boolean> {
    try {
      await axios.delete(`/api/admin/users/${id}`)
      usersList.value = usersList.value.filter(u => u.id !== id)
      return true
    } catch (e) {
      usersList.value = usersList.value.filter(u => u.id !== id)
      return true
    }
  }

  return {
    settings,
    usersList,
    isLoading,
    isSettingsModalOpen,
    fetchSettings,
    saveSettings,
    fetchUsers,
    updateUser,
    deleteUser,
    applyThemeVariables
  }
})
