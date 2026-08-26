<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useLineupStore } from '../stores/lineupStore'
import { useMapStore } from '../stores/mapStore'
import LineupCard from '../components/lineups/LineupCard.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import AddLineupModal from '../components/lineups/AddLineupModal.vue'
import { 
  User, 
  Plus, 
  Shield, 
  Heart, 
  Lock, 
  Share2, 
  Search,
  BookMarked,
  Trash2
} from 'lucide-vue-next'

const authStore = useAuthStore()
const lineupStore = useLineupStore()
const mapStore = useMapStore()

const searchQuery = ref('')
const selectedMapFilter = ref('all')
const selectedNadeFilter = ref('all')
const showFavoritesOnly = ref(false)

// User's personal lineups (custom lineups created by this user or saved in their local workspace)
const myLineups = computed(() => {
  const currentUserId = authStore.currentUser?.id
  const currentUsername = authStore.currentUser?.username?.toLowerCase()

  return lineupStore.customLineups.filter(lineup => {
    // Check if matches user or local custom
    if (currentUserId && (lineup as any).userId && (lineup as any).userId !== currentUserId) {
      return false
    }

    // Map filter
    if (selectedMapFilter.value !== 'all' && lineup.mapId !== selectedMapFilter.value) {
      return false
    }

    // Nade filter
    if (selectedNadeFilter.value !== 'all' && lineup.grenadeType !== selectedNadeFilter.value) {
      return false
    }

    // Favorites
    if (showFavoritesOnly.value && !lineupStore.isFavorite(lineup.id)) {
      return false
    }

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      return lineup.title.toLowerCase().includes(q) || lineup.startLocation.toLowerCase().includes(q) || lineup.endLocation.toLowerCase().includes(q)
    }

    return true
  })
})

import { useConfirmDialog } from '../composables/useConfirmDialog'

const { confirmAction } = useConfirmDialog()

async function handleClearAll() {
  const ok = await confirmAction({
    title: 'Delete All Personal Lineups?',
    message: 'Are you sure you want to delete all your personal lineups? This cannot be undone.',
    confirmLabel: 'Delete All',
    cancelLabel: 'Cancel',
    isDestructive: true
  })
  if (ok) {
    lineupStore.clearAllLineups()
  }
}
</script>

<template>
  <div class="my-lineups-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- AUTHENTICATED HEADER -->
    <div 
      v-if="authStore.isAuthenticated"
      class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl"
    >
      <div class="flex items-center gap-4">
        <div class="relative">
          <img 
            :src="authStore.currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${authStore.currentUser?.username}`" 
            :alt="authStore.currentUser?.username"
            class="w-14 h-14 rounded-2xl bg-slate-950 border-2 border-amber-500/50 p-1 shadow-lg"
          />
          <span class="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-md font-mono uppercase">
            {{ authStore.currentUser?.inGameRole || 'Player' }}
          </span>
        </div>

        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">
              {{ authStore.currentUser?.username }}'s Personal Playbook
            </h1>
            <span 
              :class="[
                'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase',
                authStore.isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
              ]"
            >
              {{ authStore.currentUser?.role }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Your private and customized indexed smokes, flashes, molotovs, and executes
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          v-if="myLineups.length > 0"
          @click="handleClearAll"
          class="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        <button
          @click="lineupStore.isAddModalOpen = true"
          class="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4 stroke-[3]" />
          <span>Create My Lineup</span>
        </button>
      </div>
    </div>

    <!-- UNAUTHENTICATED HERO PROMPT -->
    <div 
      v-else
      class="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl"
    >
      <div class="flex items-center gap-4">
        <div class="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
          <BookMarked class="w-8 h-8 stroke-[2.5]" />
        </div>
        <div>
          <h2 class="text-lg font-black text-white uppercase">Personal Lineup Workspaces</h2>
          <p class="text-xs text-slate-400 max-w-lg mt-1">
            Sign in to create your own isolated lineup library, save custom crosshair guides, and sync synchronized execute utility with your teammates.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="authStore.authMode = 'login'; authStore.isAuthModalOpen = true"
          class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Sign In
        </button>
        <button
          @click="authStore.authMode = 'register'; authStore.isAuthModalOpen = true"
          class="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:from-amber-500 cursor-pointer"
        >
          Create Account
        </button>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs">
      <div class="flex flex-wrap items-center gap-3">
        <!-- MAP SELECT -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 font-bold">Map:</span>
          <select 
            v-model="selectedMapFilter"
            class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Maps</option>
            <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
              {{ map.name }}
            </option>
          </select>
        </div>

        <!-- NADE SELECT -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-400 font-bold">Type:</span>
          <select 
            v-model="selectedNadeFilter"
            class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Types</option>
            <option value="smoke">Smokes</option>
            <option value="flash">Flashes</option>
            <option value="molotov">Molotovs</option>
            <option value="he">HE Grenades</option>
          </select>
        </div>

        <!-- FAVORITES TOGGLE -->
        <button
          @click="showFavoritesOnly = !showFavoritesOnly"
          :class="[
            'flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer',
            showFavoritesOnly 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          ]"
        >
          <Heart class="w-3.5 h-3.5" :class="{ 'fill-current': showFavoritesOnly }" />
          <span>Favorites</span>
        </button>
      </div>

      <!-- SEARCH INPUT -->
      <div class="relative w-full sm:w-64">
        <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search my lineups..." 
          class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>

    <!-- CARDS GRID -->
    <div 
      v-if="myLineups.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <LineupCard 
        v-for="lineup in myLineups" 
        :key="lineup.id" 
        :lineup="lineup" 
      />
    </div>

    <!-- EMPTY STATE -->
    <div 
      v-else 
      class="flex flex-col items-center justify-center p-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center gap-3"
    >
      <BookMarked class="w-8 h-8 text-slate-600" />
      <h3 class="text-sm font-bold text-slate-300">No Personal Lineups Yet</h3>
      <p class="text-xs text-slate-500 max-w-sm">
        Use the radar minimap to click and create your own indexed lineups with crosshair screenshots and throw binds!
      </p>
      <button 
        @click="lineupStore.isAddModalOpen = true"
        class="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md hover:from-amber-500 cursor-pointer"
      >
        Create First Lineup
      </button>
    </div>

    <!-- MODALS -->
    <LineupModal />
    <AddLineupModal />
  </div>
</template>
