<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { io, type Socket } from 'socket.io-client'
import {
  Newspaper,
  RefreshCw,
  Plus,
  X,
  ExternalLink,
  Search,
  MapPin,
  Sparkles,
  Filter,
  ShieldCheck,
  Radio,
  CheckCircle2,
  ArrowRight
} from 'lucide-vue-next'
import { DEFAULT_CS2_UPDATES, type CS2UpdateItem } from '../data/cs2UpdatesData'
import { useMapStore } from '../stores/mapStore'

const router = useRouter()
const mapStore = useMapStore()

const updatesFeed = ref<CS2UpdateItem[]>([...DEFAULT_CS2_UPDATES])
const isSyncingSteam = ref(false)
const syncStatusMessage = ref('')
const syncErrorMessage = ref('')
const lastSyncedAt = ref<string | null>(null)

// Filters
const searchQuery = ref('')
const selectedCategory = ref<'all' | 'patch_note' | 'leak' | 'lineup_impact'>('all')
const selectedSource = ref<
  'all' | 'Valve Official' | 'Gabe Follower' | 'ThourCS' | 'Aquarius' | 'Community Datamine'
>('all')
const selectedMap = ref<string>('all')

// Toggleable Custom Update / Leak Form
const showCreateForm = ref(false)
const isSubmitting = ref(false)
const formError = ref('')
const formSuccess = ref('')

const formTitle = ref('')
const formCategory = ref<'patch_note' | 'leak' | 'lineup_impact'>('leak')
const formSource = ref<
  'Valve Official' | 'Gabe Follower' | 'ThourCS' | 'Aquarius' | 'Community Datamine'
>('Gabe Follower')
const formSourceHandle = ref('')
const formSourceUrl = ref('')
const formVersion = ref('')
const formLineupImpact = ref<'none' | 'low' | 'medium' | 'high'>('medium')
const formAffectedMaps = ref<string[]>([])
const formSummary = ref('')
const formDetailsText = ref('')
const formTagsText = ref('')

const categoryTabs = [
  { id: 'all', label: 'All' },
  { id: 'patch_note', label: 'Official Patch Notes' },
  { id: 'leak', label: 'Leaks & Datamines' },
  { id: 'lineup_impact', label: 'Lineup Impact' }
] as const

const sourceTabs = [
  'all',
  'Valve Official',
  'Gabe Follower',
  'ThourCS',
  'Aquarius',
  'Community Datamine'
] as const

const mapTabs = [
  'all',
  'cobblestone',
  'mirage',
  'dust2',
  'inferno',
  'nuke',
  'ancient',
  'anubis',
  'overpass',
  'vertigo',
  'train',
  'cache'
] as const

const MAP_DISPLAY_NAMES: Record<string, string> = {
  all: 'All Maps',
  cobblestone: 'Cobblestone',
  mirage: 'Mirage',
  dust2: 'Dust II',
  inferno: 'Inferno',
  nuke: 'Nuke',
  ancient: 'Ancient',
  anubis: 'Anubis',
  overpass: 'Overpass',
  vertigo: 'Vertigo',
  train: 'Train',
  cache: 'Cache'
}

let socket: Socket | null = null

function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const port = window.location.port
    if (port === '5173' || port === '3000') {
      return `${window.location.protocol}//${window.location.hostname}:5000`
    }
    return window.location.origin
  }
  return 'http://localhost:5000'
}

function mergeUpdates(incoming: CS2UpdateItem[]) {
  const byId = new Map<string, CS2UpdateItem>()
  for (const item of incoming) {
    if (item && item.id) {
      byId.set(item.id, item)
    }
  }
  for (const item of updatesFeed.value) {
    if (item && item.id && !byId.has(item.id)) {
      byId.set(item.id, item)
    }
  }
  for (const def of DEFAULT_CS2_UPDATES) {
    if (!byId.has(def.id)) {
      byId.set(def.id, def)
    }
  }
  updatesFeed.value = Array.from(byId.values()).sort((a, b) => {
    const da = new Date(a.date).getTime() || 0
    const db = new Date(b.date).getTime() || 0
    return db - da
  })
}

async function fetchUpdates(refresh = false) {
  isSyncingSteam.value = true
  syncErrorMessage.value = ''
  if (refresh) {
    syncStatusMessage.value = ''
  }

  try {
    const endpoint = refresh ? '/api/cs2/updates?refresh=1' : '/api/cs2/updates'
    const res = await axios.get(endpoint)
    const items: CS2UpdateItem[] = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.updates)
        ? res.data.updates
        : []

    if (items.length > 0) {
      mergeUpdates(items)
    }

    lastSyncedAt.value = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })

    if (refresh) {
      syncStatusMessage.value = `Synced ${items.length} live CS2 news & patch items`
      setTimeout(() => {
        syncStatusMessage.value = ''
      }, 4000)
    }
  } catch {
    if (refresh) {
      syncErrorMessage.value =
        'Steam News API or backend server unreachable right now — showing curated offline archive.'
      setTimeout(() => {
        syncErrorMessage.value = ''
      }, 4500)
    }
  } finally {
    isSyncingSteam.value = false
  }
}

function toggleFormMap(mapId: string) {
  const idx = formAffectedMaps.value.indexOf(mapId)
  if (idx >= 0) {
    formAffectedMaps.value.splice(idx, 1)
  } else {
    formAffectedMaps.value.push(mapId)
  }
}

function resetForm() {
  formTitle.value = ''
  formCategory.value = 'leak'
  formSource.value = 'Gabe Follower'
  formSourceHandle.value = ''
  formSourceUrl.value = ''
  formVersion.value = ''
  formLineupImpact.value = 'medium'
  formAffectedMaps.value = []
  formSummary.value = ''
  formDetailsText.value = ''
  formTagsText.value = ''
  formError.value = ''
}

async function submitCustomUpdate() {
  formError.value = ''
  formSuccess.value = ''

  if (!formTitle.value.trim()) {
    formError.value = 'Please enter a headline title for this update or leak.'
    return
  }

  const details = formDetailsText.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const tags = formTagsText.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const defaultHandles: Record<string, string> = {
    'Valve Official': '@CounterStrike',
    'Gabe Follower': '@gabefollower',
    ThourCS: '@ThourCS2',
    Aquarius: '@aquaismissing',
    'Community Datamine': '@CS2Datamine'
  }

  const payload: Omit<CS2UpdateItem, 'id'> = {
    title: formTitle.value.trim(),
    date: new Date().toISOString().split('T')[0] || '2026-11-17',
    category: formCategory.value,
    source: formSource.value,
    sourceHandle: formSourceHandle.value.trim() || defaultHandles[formSource.value] || undefined,
    sourceUrl: formSourceUrl.value.trim() || undefined,
    version: formVersion.value.trim() || undefined,
    summary: formSummary.value.trim() || formTitle.value.trim(),
    details: details.length > 0 ? details : [formSummary.value.trim() || formTitle.value.trim()],
    affectedMaps: [...formAffectedMaps.value],
    lineupImpact: formLineupImpact.value,
    tags: tags.length > 0 ? tags : [formCategory.value, ...formAffectedMaps.value]
  }

  isSubmitting.value = true
  try {
    const res = await axios.post('/api/cs2/updates', payload)
    const created: CS2UpdateItem = res.data
    mergeUpdates([created])
    formSuccess.value = `Logged "${created.title}" to the live squad feed.`
    resetForm()
    showCreateForm.value = false
    setTimeout(() => {
      formSuccess.value = ''
    }, 3500)
  } catch {
    // Graceful local fallback if server is offline
    const localItem: CS2UpdateItem = {
      ...payload,
      id: `local-update-${Date.now()}`
    }
    mergeUpdates([localItem])
    formSuccess.value = `Saved "${localItem.title}" locally (offline mode).`
    resetForm()
    showCreateForm.value = false
    setTimeout(() => {
      formSuccess.value = ''
    }, 3500)
  } finally {
    isSubmitting.value = false
  }
}

function openMapOnRadar(mapId: string) {
  mapStore.setMap(mapId)
  router.push('/')
}

const filteredUpdates = computed(() => {
  return updatesFeed.value.filter((item) => {
    if (selectedCategory.value !== 'all' && item.category !== selectedCategory.value) {
      return false
    }
    if (selectedSource.value !== 'all' && item.source !== selectedSource.value) {
      return false
    }
    if (selectedMap.value !== 'all') {
      const maps = (item.affectedMaps || []).map((m) => m.toLowerCase())
      if (!maps.includes(selectedMap.value)) {
        return false
      }
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const haystack = [
        item.title,
        item.summary,
        item.source,
        item.sourceHandle || '',
        ...(item.details || []),
        ...(item.tags || []),
        ...(item.affectedMaps || [])
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
})

function getSourceBadgeClass(source: CS2UpdateItem['source']) {
  switch (source) {
    case 'Valve Official':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/40'
    case 'Gabe Follower':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/40'
    case 'ThourCS':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/40'
    case 'Aquarius':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700'
  }
}

function getCategoryLabel(cat: CS2UpdateItem['category']) {
  if (cat === 'patch_note') return 'Official Patch Note'
  if (cat === 'lineup_impact') return 'Lineup Impact'
  return 'Leak & Datamine'
}

function getCategoryBadgeClass(cat: CS2UpdateItem['category']) {
  if (cat === 'patch_note') return 'bg-sky-500/10 text-sky-400 border-sky-500/30'
  if (cat === 'lineup_impact') return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
}

function getImpactBadgeClass(impact?: CS2UpdateItem['lineupImpact']) {
  switch (impact) {
    case 'high':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40'
    case 'medium':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    case 'low':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700'
  }
}

function getImpactLabel(impact?: CS2UpdateItem['lineupImpact']) {
  switch (impact) {
    case 'high':
      return 'HIGH LINEUP IMPACT'
    case 'medium':
      return 'MEDIUM LINEUP IMPACT'
    case 'low':
      return 'LOW LINEUP IMPACT'
    default:
      return 'NO LINEUP IMPACT'
  }
}

onMounted(() => {
  fetchUpdates(false)
  try {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    })
    socket.on('cs2:update-posted', (newItem: CS2UpdateItem) => {
      if (newItem && newItem.id) {
        mergeUpdates([newItem])
      }
    })
  } catch {
    // Non-fatal if socket server is offline
  }
})

onUnmounted(() => {
  if (socket) {
    socket.off('cs2:update-posted')
    socket.disconnect()
    socket = null
  }
})
</script>

<template>
  <div class="updates-leaks-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- HEADER -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
      <div class="flex items-center gap-3.5">
        <div class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
          <Newspaper class="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-xl font-black uppercase text-white tracking-wide">
              CS2 Updates, Patch Notes &amp; Leaks
            </h1>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-xs font-mono font-bold">
              {{ filteredUpdates.length }} Entries
            </span>
            <span
              v-if="lastSyncedAt"
              class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold"
            >
              Synced {{ lastSyncedAt }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Track official Valve Steam patch notes, geometry/voxel changes, and datamined CS2 intel from Gabe Follower, ThourCS &amp; Aquarius
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <!-- SYNC LIVE STEAM CS2 NEWS -->
        <button
          @click="fetchUpdates(true)"
          :disabled="isSyncingSteam"
          class="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-sky-400 border border-sky-500/40 rounded-xl font-bold text-xs transition-all cursor-pointer"
        >
          <RefreshCw :class="['w-3.5 h-3.5', isSyncingSteam ? 'animate-spin' : '']" />
          <span>{{ isSyncingSteam ? 'Syncing Steam News...' : 'Sync Live Steam CS2 News' }}</span>
        </button>

        <!-- LOG CUSTOM UPDATE / LEAK TOGGLE -->
        <button
          @click="showCreateForm = !showCreateForm"
          :class="[
            'flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg',
            showCreateForm
              ? 'bg-rose-500 text-white'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black'
          ]"
        >
          <X v-if="showCreateForm" class="w-4 h-4" />
          <Plus v-else class="w-4 h-4 stroke-[2.5]" />
          <span>{{ showCreateForm ? 'Close Form' : 'Log Custom Update / Leak' }}</span>
        </button>
      </div>
    </div>

    <!-- STATUS / FEEDBACK BANNERS -->
    <div
      v-if="syncStatusMessage || formSuccess"
      class="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-bold"
    >
      <CheckCircle2 class="w-4 h-4 shrink-0" />
      <span>{{ formSuccess || syncStatusMessage }}</span>
    </div>

    <div
      v-if="syncErrorMessage"
      class="flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-400 text-xs font-bold"
    >
      <Radio class="w-4 h-4 shrink-0" />
      <span>{{ syncErrorMessage }}</span>
    </div>

    <!-- TOGGLEABLE LOG CUSTOM UPDATE / LEAK FORM -->
    <div
      v-if="showCreateForm"
      class="p-5 bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col gap-4"
    >
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-amber-400" />
          <h2 class="text-sm font-black uppercase text-white tracking-wider">
            Log Custom CS2 Update, Geometry Alert or Leak
          </h2>
        </div>
        <button
          @click="showCreateForm = false"
          class="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div v-if="formError" class="px-3 py-2 bg-rose-500/10 border border-rose-500/40 rounded-lg text-rose-400 text-xs font-bold">
        {{ formError }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="md:col-span-2 flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Title *</label>
          <input
            v-model="formTitle"
            type="text"
            placeholder="e.g. Cobblestone B-Plat Clip Update or New Subtick Smoke Fix"
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</label>
          <select
            v-model="formCategory"
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="leak">Leak &amp; Datamine</option>
            <option value="patch_note">Official Patch Note</option>
            <option value="lineup_impact">Lineup Impact</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Source</label>
          <select
            v-model="formSource"
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="Valve Official">Valve Official</option>
            <option value="Gabe Follower">Gabe Follower</option>
            <option value="ThourCS">ThourCS</option>
            <option value="Aquarius">Aquarius</option>
            <option value="Community Datamine">Community Datamine</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lineup Impact Severity</label>
          <select
            v-model="formLineupImpact"
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="high">High (Breaks / Alters Lineups)</option>
            <option value="medium">Medium (Verify Key Smokes)</option>
            <option value="low">Low (Minor Edge Case)</option>
            <option value="none">None (Informational)</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Source Handle / Version</label>
          <div class="flex gap-2">
            <input
              v-model="formSourceHandle"
              type="text"
              placeholder="@handle"
              class="w-1/2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <input
              v-model="formVersion"
              type="text"
              placeholder="v1.40.x"
              class="w-1/2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div class="md:col-span-2 flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Source Link URL (optional)</label>
          <input
            v-model="formSourceUrl"
            type="url"
            placeholder="https://x.com/... or https://store.steampowered.com/news/app/730"
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tags (comma-separated)</label>
          <input
            v-model="formTagsText"
            type="text"
            placeholder="cobblestone, smoke, skybox"
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <!-- AFFECTED MAPS PICKER -->
      <div class="flex flex-col gap-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Affected Maps</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="m in mapTabs.filter(id => id !== 'all')"
            :key="m"
            type="button"
            @click="toggleFormMap(m)"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase border transition-all cursor-pointer',
              formAffectedMaps.includes(m)
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            ]"
          >
            {{ MAP_DISPLAY_NAMES[m] || m }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Summary</label>
          <textarea
            v-model="formSummary"
            rows="3"
            placeholder="Brief tactical summary of what changed or was leaked..."
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          ></textarea>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bullet Details (one per line)</label>
          <textarea
            v-model="formDetailsText"
            rows="3"
            placeholder="Line 1: Specific skybox or clip brush change&#10;Line 2: Impacted lineups to re-verify"
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          ></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
        <button
          type="button"
          @click="resetForm(); showCreateForm = false"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="submitCustomUpdate"
          :disabled="isSubmitting"
          class="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          {{ isSubmitting ? 'Publishing...' : 'Publish to Squad Feed' }}
        </button>
      </div>
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-4 shadow-lg">
      <!-- TOP ROW: SEARCH + CATEGORY TABS -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
            <Filter class="w-3 h-3" /> Category:
          </span>
          <button
            v-for="tab in categoryTabs"
            :key="tab.id"
            @click="selectedCategory = tab.id"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
              selectedCategory === tab.id
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- SEARCH -->
        <div class="relative w-full lg:w-72">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search patch notes, leaks, skybox..."
            class="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <!-- SOURCE FILTER TABS -->
      <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Source:</span>
        <button
          v-for="src in sourceTabs"
          :key="src"
          @click="selectedSource = src"
          :class="[
            'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border',
            selectedSource === src
              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          ]"
        >
          {{ src === 'all' ? 'All' : src }}
        </button>
      </div>

      <!-- MAP FILTER TABS -->
      <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Map:</span>
        <button
          v-for="m in mapTabs"
          :key="m"
          @click="selectedMap = m"
          :class="[
            'px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase font-mono transition-all cursor-pointer border',
            selectedMap === m
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          ]"
        >
          {{ m === 'all' ? 'All' : m }}
        </button>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <div
      v-if="filteredUpdates.length === 0"
      class="p-10 bg-slate-900/70 border border-slate-800 rounded-2xl text-center flex flex-col items-center gap-3"
    >
      <Newspaper class="w-10 h-10 text-slate-600" />
      <h3 class="text-sm font-bold text-white uppercase tracking-wider">No matching CS2 updates or leaks</h3>
      <p class="text-xs text-slate-400 max-w-md">
        Try clearing your search or switching Category, Source, or Map filter tabs.
      </p>
      <button
        @click="selectedCategory = 'all'; selectedSource = 'all'; selectedMap = 'all'; searchQuery = ''"
        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold cursor-pointer"
      >
        Reset All Filters
      </button>
    </div>

    <!-- UPDATES & LEAKS FEED -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <article
        v-for="item in filteredUpdates"
        :key="item.id"
        class="p-5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-xl flex flex-col justify-between gap-4 transition-all"
      >
        <div class="flex flex-col gap-3">
          <!-- META TOP BAR -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span
                :class="[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border',
                  getSourceBadgeClass(item.source)
                ]"
              >
                <ShieldCheck v-if="item.source === 'Valve Official'" class="w-3.5 h-3.5" />
                <span>{{ item.source }}</span>
              </span>

              <span
                v-if="item.sourceHandle"
                class="text-[11px] font-mono font-bold text-slate-400"
              >
                {{ item.sourceHandle }}
              </span>

              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                  getCategoryBadgeClass(item.category)
                ]"
              >
                {{ getCategoryLabel(item.category) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span
                v-if="item.version"
                class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-mono font-bold"
              >
                v{{ item.version }}
              </span>
              <span class="text-[11px] font-mono text-slate-400">{{ item.date }}</span>
            </div>
          </div>

          <!-- LINEUP IMPACT SEVERITY PILL + TITLE -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border',
                  getImpactBadgeClass(item.lineupImpact)
                ]"
              >
                {{ getImpactLabel(item.lineupImpact) }}
              </span>
            </div>

            <h2 class="text-base font-black text-white leading-snug">
              {{ item.title }}
            </h2>
          </div>

          <!-- SUMMARY -->
          <p class="text-xs text-slate-300 leading-relaxed">
            {{ item.summary }}
          </p>

          <!-- DETAILS BULLET LIST -->
          <ul
            v-if="item.details && item.details.length > 0"
            class="flex flex-col gap-1.5 pl-4 list-disc text-xs text-slate-400"
          >
            <li v-for="(detail, idx) in item.details" :key="idx" class="leading-relaxed">
              {{ detail }}
            </li>
          </ul>
        </div>

        <!-- FOOTER: AFFECTED MAPS, TAGS & EXTERNAL LINK -->
        <div class="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
          <!-- CLICKABLE MAP TAGS -> SWITCH MAP & OPEN RADAR -->
          <div v-if="item.affectedMaps && item.affectedMaps.length > 0" class="flex flex-wrap items-center gap-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-0.5">
              Open Map:
            </span>
            <button
              v-for="mapId in item.affectedMaps"
              :key="mapId"
              @click="openMapOnRadar(mapId)"
              class="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-950 hover:bg-amber-500/15 text-amber-400 border border-slate-800 hover:border-amber-500/50 rounded-lg text-[11px] font-bold uppercase font-mono transition-colors cursor-pointer"
              :title="`Switch radar map to ${MAP_DISPLAY_NAMES[mapId] || mapId}`"
            >
              <MapPin class="w-3 h-3" />
              <span>{{ MAP_DISPLAY_NAMES[mapId] || mapId }}</span>
              <ArrowRight class="w-2.5 h-2.5 opacity-70" />
            </button>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- TAGS -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                v-for="tag in (item.tags || []).slice(0, 5)"
                :key="tag"
                class="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-400"
              >
                #{{ tag }}
              </span>
            </div>

            <!-- VIEW SOURCE EXTERNAL LINK -->
            <a
              v-if="item.sourceUrl"
              :href="item.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-xl text-[11px] font-bold transition-colors shrink-0"
            >
              <span>View Source</span>
              <ExternalLink class="w-3 h-3" />
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
