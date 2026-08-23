import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export interface UserProfile {
  id: string
  username: string
  email?: string
  role: 'admin' | 'coach' | 'player' | 'guest'
  inGameRole?: 'IGL' | 'Entry' | 'Support' | 'Lurker' | 'AWP' | 'Flex'
  avatar?: string
  createdAt?: string
}

const TOKEN_KEY = 'cs2_stratbook_token'
const USER_KEY = 'cs2_stratbook_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const currentUser = ref<UserProfile | null>(null)
  const isAuthModalOpen = ref<boolean>(false)
  const authMode = ref<'login' | 'register'>('login')
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
  const isAdmin = computed(() => currentUser.value?.role === 'admin')

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
      // Fallback for standalone mock/offline dev if server is not reachable
      if (err.code === 'ERR_NETWORK' || !err.response) {
        // Offline demo login
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
      // If token expired
      logout()
    }
  }

  async function updateProfile(data: Partial<UserProfile> & { password?: string }): Promise<boolean> {
    try {
      const res = await axios.put('/api/auth/profile', data)
      currentUser.value = res.data.user
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      return true
    } catch (err: any) {
      authError.value = err.response?.data?.error || 'Update failed'
      return false
    }
  }

  return {
    currentUser,
    token,
    isAuthenticated,
    isAdmin,
    isAuthModalOpen,
    authMode,
    isLoading,
    authError,
    login,
    register,
    logout,
    checkAuth,
    updateProfile
  }
})
