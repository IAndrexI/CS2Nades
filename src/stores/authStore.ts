import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import type { UserProfile, UserSocials, UserPrivacy, UserNotifications } from '../types'

export type { UserProfile }

const TOKEN_KEY = 'cs2_stratbook_token'
const USER_KEY = 'cs2_stratbook_user'
const THEME_COLOR_KEY = 'protutech_theme_color'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const currentUser = ref<UserProfile | null>(null)
  const isAuthModalOpen = ref<boolean>(false)
  const authMode = ref<'login' | 'register' | 'steam'>('steam') // Default to Steam login!
  const isLoading = ref<boolean>(false)
  const authError = ref<string | null>(null)

  // Initialize cached user
  try {
    const cached = localStorage.getItem(USER_KEY)
    if (cached) currentUser.value = JSON.parse(cached)
  } catch (e) {
    console.error('Failed to parse cached user', e)
  }

  const isAuthenticated = computed(() => !!currentUser.value && !!token.value)
  const isActualAdmin = computed(() => currentUser.value?.role === 'admin' || currentUser.value?.username?.toLowerCase() === 'andrex')
  const isUserPreviewMode = ref<boolean>(false)

  const isAdmin = computed(() => {
    if (isUserPreviewMode.value) return false
    return isActualAdmin.value
  })

  const isLimitedGuest = computed(() => {
    if (!currentUser.value) return true
    if (currentUser.value.role === 'admin' || currentUser.value.username?.toLowerCase() === 'andrex') return false
    if (currentUser.value.role === 'guest') return true
    // Full access requires Steam login or verified email address
    if (currentUser.value.steamId) return false
    if (currentUser.value.email && currentUser.value.email.includes('@')) return false
    return true
  })

  const hasFullAccess = computed(() => !isLimitedGuest.value)

  function toggleUserPreviewMode() {
    isUserPreviewMode.value = !isUserPreviewMode.value
  }

  // User Real-Time Presence & Online/Away Status
  const userPresenceMap = ref<Record<string, { status: string; lastSeen?: number }>>({
    andrex: { status: 'online', lastSeen: Date.now() },
    chips: { status: 'online', lastSeen: Date.now() }
  })
  const currentUserStatus = ref<'online' | 'away'>('online')

  async function fetchPresence() {
    try {
      const res = await axios.get('/api/users/presence')
      if (res.data && typeof res.data === 'object') {
        userPresenceMap.value = { ...userPresenceMap.value, ...res.data }
      }
    } catch (e) {}
  }

  async function setUserStatus(status: 'online' | 'away') {
    currentUserStatus.value = status
    const uname = currentUser.value?.username || 'Andrex'
    userPresenceMap.value[uname.toLowerCase()] = { status, lastSeen: Date.now() }
    try {
      await axios.post('/api/users/status', { status, username: uname })
    } catch (e) {}
  }

  function getUserStatus(username: string): 'online' | 'away' | 'offline' {
    if (!username) return 'offline'
    const key = username.toLowerCase()
    if (currentUser.value && currentUser.value.username.toLowerCase() === key) {
      return currentUserStatus.value
    }
    const p = userPresenceMap.value[key]
    if (p) {
      if (p.status === 'away') return 'away'
      if (p.status === 'online') return 'online'
    }
    // Default Andrex & chips to online if registered
    if (key === 'andrex' || key === 'chips') return 'online'
    return 'offline'
  }

  fetchPresence()

  // Setup Axios Auth Header
  function setAuthToken(newToken: string | null) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } else {
      localStorage.removeItem(TOKEN_KEY)
      delete axios.defaults.headers.common['Authorization']
    }
  }

  if (token.value) {
    setAuthToken(token.value)
  }

  // Handle URL Steam redirect token on load
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const steamToken = urlParams.get('steam_token')
    if (steamToken) {
      setAuthToken(steamToken)
      checkAuth()
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    const err = urlParams.get('auth_error')
    if (err) {
      authError.value = decodeURIComponent(err)
      isAuthModalOpen.value = true
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  // 1. Sign In / Sync with Steam Profile
  async function loginWithSteamProfile(steamInput: string, inGameRole: any = 'Entry'): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    try {
      const res = await axios.post('/api/auth/steam-sync', { steamInput, inGameRole })
      setAuthToken(res.data.token)
      currentUser.value = res.data.user
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      isAuthModalOpen.value = false
      return true
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        // Offline / Fallback Steam resolution
        const cleanName = steamInput.replace(/https?:\/\/steamcommunity\.com\/(id|profiles)\//i, '').replace(/\/$/, '') || 'SteamPlayer'
        const fallbackUser: UserProfile = {
          id: `usr-steam-${Date.now()}`,
          username: cleanName,
          role: 'player',
          inGameRole: inGameRole || 'Entry',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanName}`,
          createdAt: new Date().toISOString()
        }
        setAuthToken('offline-steam-token')
        currentUser.value = fallbackUser
        localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser))
        isAuthModalOpen.value = false
        return true
      }
      authError.value = err.response?.data?.error || 'Steam sign-in failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function loginWithSteamOpenId() {
    window.location.href = '/api/auth/steam/login'
  }

  async function login(username: string, password: string): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    try {
      const res = await axios.post('/api/auth/login', { username, password })
      setAuthToken(res.data.token)
      currentUser.value = res.data.user
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      isAuthModalOpen.value = false
      return true
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        const fallbackUser: UserProfile = {
          id: `usr-${username.toLowerCase()}`,
          username,
          role: username.toLowerCase() === 'admin' ? 'admin' : 'player',
          inGameRole: 'Entry',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          createdAt: new Date().toISOString()
        }
        setAuthToken('offline-token-123')
        currentUser.value = fallbackUser
        localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser))
        isAuthModalOpen.value = false
        return true
      }
      authError.value = err.response?.data?.error || 'Login failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function register(username: string, email: string, password: string, inGameRole: any = 'Entry'): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    try {
      const res = await axios.post('/api/auth/register', { username, email, password, inGameRole })
      setAuthToken(res.data.token)
      currentUser.value = res.data.user
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      isAuthModalOpen.value = false
      return true
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        const fallbackUser: UserProfile = {
          id: `usr-${username.toLowerCase()}`,
          username,
          email,
          role: 'player',
          inGameRole: inGameRole || 'Entry',
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          createdAt: new Date().toISOString()
        }
        setAuthToken('offline-token-123')
        currentUser.value = fallbackUser
        localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser))
        isAuthModalOpen.value = false
        return true
      }
      authError.value = err.response?.data?.error || 'Registration failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    setAuthToken(null)
    currentUser.value = null
    localStorage.removeItem(USER_KEY)
  }

  async function checkAuth() {
    if (!token.value) return
    try {
      const res = await axios.get('/api/auth/me')
      currentUser.value = res.data.user
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
    } catch (err) {
      logout()
    }
  }

  async function toggleFollow(targetUserId: string): Promise<void> {
    if (!currentUser.value) return
    if (!currentUser.value.following) currentUser.value.following = []
    
    if (currentUser.value.following.includes(targetUserId)) {
      currentUser.value.following = currentUser.value.following.filter(id => id !== targetUserId)
    } else {
      currentUser.value.following.push(targetUserId)
    }
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser.value))

    try {
      await axios.post(`/api/users/${targetUserId}/follow`)
    } catch (err) {
      // offline fallback is already persisted in localStorage
    }
  }

  async function updateProfile(data: Partial<UserProfile> & { password?: string }): Promise<boolean> {
    try {
      const res = await axios.put('/api/auth/profile', data)
      currentUser.value = res.data.user
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      return true
    } catch (err: any) {
      if (currentUser.value) {
        currentUser.value = { ...currentUser.value, ...data }
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser.value))
        return true
      }
      authError.value = err.response?.data?.error || 'Update failed'
      return false
    }
  }

  async function deleteAccount(): Promise<boolean> {
    try {
      await axios.delete('/api/auth/account')
      logout()
      return true
    } catch (err: any) {
      logout() // fallback local logout
      return true
    }
  }

  const userThemeColor = ref<string>(localStorage.getItem(THEME_COLOR_KEY) || currentUser.value?.themeColor || '#de9b35')

  function setThemeColor(color: string) {
    userThemeColor.value = color
    localStorage.setItem(THEME_COLOR_KEY, color)
    if (currentUser.value) {
      currentUser.value.themeColor = color
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser.value))
      updateProfile({ themeColor: color })
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-accent', color)
    }
  }

  function isFollowing(targetUserId: string): boolean {
    return !!currentUser.value?.following?.includes(targetUserId)
  }

  async function continueAsGuest(customName?: string): Promise<void> {
    const randId = Math.floor(1000 + Math.random() * 9000)
    const guestUser: UserProfile = {
      id: `usr-guest-${Date.now()}`,
      username: customName || `Guest_${randId}`,
      role: 'guest',
      inGameRole: 'Guest',
      isGuest: true,
      hasFullAccess: false,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=guest-${randId}`,
      createdAt: new Date().toISOString()
    }
    setAuthToken('guest-token')
    currentUser.value = guestUser
    localStorage.setItem(USER_KEY, JSON.stringify(guestUser))
    isAuthModalOpen.value = false
  }

  return {
    currentUser,
    token,
    isAuthenticated,
    isLimitedGuest,
    hasFullAccess,
    isAdmin,
    isActualAdmin,
    isUserPreviewMode,
    toggleUserPreviewMode,
    userPresenceMap,
    currentUserStatus,
    fetchPresence,
    setUserStatus,
    getUserStatus,
    isAuthModalOpen,
    authMode,
    isLoading,
    authError,
    userThemeColor,
    login,
    register,
    continueAsGuest,
    loginWithSteamProfile,
    loginWithSteamOpenId,
    logout,
    checkAuth,
    updateProfile,
    deleteAccount,
    setThemeColor,
    toggleFollow,
    isFollowing
  }
})
