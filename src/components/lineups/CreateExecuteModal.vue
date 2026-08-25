<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useAuthStore } from '../../stores/authStore'
import NadeIcon from '../common/NadeIcon.vue'
import type { TeamSide } from '../../types'
import { 
  X, 
  Layers, 
  Plus, 
  Check, 
  Trash2,
  Sparkles,
  Users
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const authStore = useAuthStore()

const formData = reactive({
  title: '',
  mapId: mapStore.currentMapId,
  side: 't' as TeamSide,
  description: '',
  selectedLineupIds: [] as string[]
})

watch(() => lineupStore.isCreateExecuteModalOpen, (isOpen) => {
  if (isOpen) {
    formData.mapId = mapStore.currentMapId
    formData.title = ''
    formData.description = ''
    formData.selectedLineupIds = []
  }
})

// Lineups available for the selected map & side
const availableLineups = computed(() => {
  return lineupStore.currentMapLineups.filter(l => {
    if (formData.side !== 'all' && l.side !== 'all' && l.side !== formData.side) {
      return false
    }
    return true
  })
})

function toggleLineup(id: string) {
  const idx = formData.selectedLineupIds.indexOf(id)
  if (idx >= 0) {
    formData.selectedLineupIds.splice(idx, 1)
  } else {
    formData.selectedLineupIds.push(id)
  }
}

function handleSave() {
  if (!formData.title.trim()) {
    alert('Please enter an execute title.')
    return
  }
  if (formData.selectedLineupIds.length === 0) {
    alert('Please select at least one grenade for this execute.')
    return
  }

  const created = lineupStore.createExecute({
    title: formData.title.trim(),
    mapId: formData.mapId,
    side: formData.side,
    description: formData.description.trim(),
    lineupIds: [...formData.selectedLineupIds],
    author: authStore.currentUser?.username || 'Team'
  })

  lineupStore.setActiveExecute(created.id)
  lineupStore.isCreateExecuteModalOpen = false
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="lineupStore.isCreateExecuteModalOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="lineupStore.isCreateExecuteModalOpen = false"
    >
      <div class="relative w-full max-w-2xl my-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Layers class="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 class="text-base font-black text-white uppercase tracking-wide">
              Create Synchronized Execute Group
            </h2>
            <p class="text-xs text-slate-400">
              Bundle multiple smokes, flashes, and molotovs into a 1-click team execute
            </p>
          </div>
        </div>

        <button 
          @click="lineupStore.isCreateExecuteModalOpen = false"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- BODY FORM -->
      <div class="p-5 overflow-y-auto flex flex-col gap-4">
        <!-- TITLE -->
        <div>
          <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Execute Name *
          </label>
          <input 
            v-model="formData.title"
            type="text" 
            placeholder="e.g., Mirage A-Site Fast Execute, Inferno B-Site Retake"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-slate-600"
          />
        </div>

        <!-- SIDE & MAP ROW -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Team Side
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="formData.side = 't'"
                :class="[
                  'py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer',
                  formData.side === 't'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                ]"
              >
                T Side
              </button>
              <button
                type="button"
                @click="formData.side = 'ct'"
                :class="[
                  'py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer',
                  formData.side === 'ct'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                ]"
              >
                CT Side
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Map
            </label>
            <div class="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 uppercase">
              {{ mapStore.currentMap.name }}
            </div>
          </div>
        </div>

        <!-- DESCRIPTION -->
        <div>
          <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Execute Description / Callout Order (Optional)
          </label>
          <input 
            v-model="formData.description"
            type="text" 
            placeholder="e.g. Throw CT + Stairs smokes at 1:45, flash palace, entry tetris"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-slate-600"
          />
        </div>

        <!-- SELECT LINEUPS CHECKLIST -->
        <div class="flex flex-col gap-2 pt-2 border-t border-slate-800">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Select Lineups to Include ({{ formData.selectedLineupIds.length }} Selected)
            </label>
            <span class="text-[10px] text-slate-500 font-mono">
              {{ availableLineups.length }} available on this map
            </span>
          </div>

          <div v-if="availableLineups.length === 0" class="p-6 bg-slate-950/80 rounded-xl text-center text-slate-500 text-xs">
            No saved lineups found on {{ mapStore.currentMap.name }}. Create lineups first using "Add Nade".
          </div>

          <div v-else class="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1">
            <div 
              v-for="lineup in availableLineups" 
              :key="lineup.id"
              @click="toggleLineup(lineup.id)"
              :class="[
                'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                formData.selectedLineupIds.includes(lineup.id)
                  ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
              ]"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div 
                  :class="[
                    'w-5 h-5 rounded-md flex items-center justify-center border transition-colors',
                    formData.selectedLineupIds.includes(lineup.id)
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'border-slate-700 bg-slate-900'
                  ]"
                >
                  <Check v-if="formData.selectedLineupIds.includes(lineup.id)" class="w-3.5 h-3.5 stroke-[3]" />
                </div>

                <NadeIcon :type="lineup.grenadeType" :size="16" :filled="true" />

                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-bold truncate text-white">{{ lineup.title }}</span>
                  <span class="text-[10px] text-slate-500 truncate">From {{ lineup.startLocation }} → To {{ lineup.endLocation }}</span>
                </div>
              </div>

              <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-[10px] font-mono font-bold uppercase">
                {{ lineup.throwType.replace('_', ' ') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER ACTIONS -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
        <button
          @click="lineupStore.isCreateExecuteModalOpen = false"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          @click="handleSave"
          class="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <Sparkles class="w-4 h-4" />
          <span>Save &amp; View Execute</span>
        </button>
      </div>
    </div>
  </div>
</Teleport>
</template>
