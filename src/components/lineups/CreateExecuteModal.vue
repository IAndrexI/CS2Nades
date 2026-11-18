<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { useMapStore } from '../../stores/mapStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import NadeIcon from '../common/NadeIcon.vue'
import type {
  ExecuteStrategyType,
  ExecuteUtilityStep,
  PlayerRole,
  TeamSide
} from '../../types'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Layers,
  Sparkles,
  UserCheck,
  X
} from 'lucide-vue-next'

const lineupStore = useLineupStore()
const mapStore = useMapStore()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const roles: PlayerRole[] = ['IGL', 'Entry', 'Support', 'Lurker', 'AWPer']
const strategyTypes: ExecuteStrategyType[] = [
  'A Execute',
  'B Execute',
  'Mid Control',
  'Split',
  'Fast Rush',
  'Default',
  'Retake',
  'Fake'
]

const formData = reactive({
  title: '',
  mapId: mapStore.currentMapId,
  side: 't' as TeamSide,
  site: 'A' as 'A' | 'B' | 'Mid' | 'Split',
  strategyType: 'A Execute' as ExecuteStrategyType,
  description: '',
  selectedLineupIds: [] as string[],
  stepConfigs: {} as Record<
    string,
    { role: PlayerRole; delaySeconds: number; roundClock: string; notes: string }
  >
})

watch(
  () => lineupStore.isCreateExecuteModalOpen,
  (isOpen) => {
    if (isOpen) {
      formData.mapId = mapStore.currentMapId
      formData.title = ''
      formData.description = ''
      formData.selectedLineupIds = []
      formData.stepConfigs = {}
    }
  }
)

const availableLineups = computed(() => {
  return lineupStore.currentMapLineups.filter((l) => {
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
    delete formData.stepConfigs[id]
  } else {
    const orderIdx = formData.selectedLineupIds.length
    const lineup = lineupStore.getLineupById(id)
    formData.selectedLineupIds.push(id)
    formData.stepConfigs[id] = {
      role: (lineup?.playerRole as PlayerRole) || roles[orderIdx % roles.length] || 'Support',
      delaySeconds: Number((orderIdx * 0.5).toFixed(1)),
      roundClock: '1:30',
      notes: `${lineup?.startLocation || ''} → ${lineup?.endLocation || ''}`
    }
  }
}

function moveStep(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= formData.selectedLineupIds.length) return
  const arr = formData.selectedLineupIds
  const temp = arr[index]!
  arr[index] = arr[target]!
  arr[target] = temp
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

  const steps: ExecuteUtilityStep[] = formData.selectedLineupIds.map((lid, idx) => {
    const cfg = formData.stepConfigs[lid]
    return {
      order: idx + 1,
      lineupId: lid,
      playerRole: cfg?.role || 'Support',
      playerName: `Player ${idx + 1} (${cfg?.role || 'Support'})`,
      delaySeconds: Number(cfg?.delaySeconds ?? idx * 0.5),
      roundClock: cfg?.roundClock || '1:30',
      notes: cfg?.notes || ''
    }
  })

  const created = lineupStore.createExecute({
    title: formData.title.trim(),
    mapId: formData.mapId,
    side: formData.side,
    site: formData.site,
    strategyType: formData.strategyType,
    description:
      formData.description.trim() ||
      `Coordinated ${formData.strategyType} with ${steps.length} utility lineups.`,
    lineupIds: [...formData.selectedLineupIds],
    steps,
    tags: [formData.strategyType, `${formData.site} Site`, `${steps.length} Utility`],
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
      class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="lineupStore.isCreateExecuteModalOpen = false"
    >
      <div
        class="relative w-full max-w-3xl my-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        <!-- HEADER -->
        <div
          class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80"
        >
          <div class="flex items-center gap-3">
            <div
              class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl"
            >
              <Layers class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 class="text-base font-black text-white uppercase tracking-wide">
                Create Coordinated Team Execute
              </h2>
              <p class="text-xs text-slate-400">
                Organize lineups by map, strategy, player role (IGL / Entry / Support / AWPer), and execution sequence
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
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Execute Title *
              </label>
              <input
                v-model="formData.title"
                type="text"
                placeholder="e.g., Mirage A-Site Full Wall Execute"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-slate-600"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Strategy Category
              </label>
              <select
                v-model="formData.strategyType"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option v-for="st in strategyTypes" :key="st" :value="st">
                  {{ st }}
                </option>
              </select>
            </div>
          </div>

          <!-- SIDE, SITE & MAP ROW -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                Target Site
              </label>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="s in ['A', 'B', 'Mid', 'Split'] as const"
                  :key="s"
                  type="button"
                  @click="formData.site = s"
                  :class="[
                    'py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer',
                    formData.site === s
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  ]"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Map
              </label>
              <div
                class="py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 uppercase"
              >
                {{ mapStore.currentMap.name }} ({{ mapStore.currentMap.code }})
              </div>
            </div>
          </div>

          <!-- DESCRIPTION -->
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Tactical Briefing & Execution Notes
            </label>
            <input
              v-model="formData.description"
              type="text"
              placeholder="e.g., Support & IGL throw Ticket + Stairs at 1:25, Entry flashes over lamp at +4.5s"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-slate-600"
            />
          </div>

          <!-- ORDERED UTILITY SEQUENCE CONFIGURATOR (ACTIVE WHEN LINEUPS SELECTED) -->
          <div
            v-if="formData.selectedLineupIds.length > 0"
            class="bg-slate-950/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Execution Order, Player Roles & Timing ({{ formData.selectedLineupIds.length }} Steps)
              </span>
              <span class="text-[10px] text-slate-400">
                Rendered as #1 → #{{ formData.selectedLineupIds.length }} on Radar
              </span>
            </div>

            <div class="space-y-2 max-h-44 overflow-y-auto pr-1">
              <div
                v-for="(lid, idx) in formData.selectedLineupIds"
                :key="'step-' + lid"
                class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0"
                  >
                    #{{ idx + 1 }}
                  </span>
                  <NadeIcon
                    v-if="lineupStore.getLineupById(lid)"
                    :type="lineupStore.getLineupById(lid)!.grenadeType"
                    :size="15"
                    :filled="true"
                  />
                  <span class="font-bold text-white truncate max-w-[180px]">
                    {{ lineupStore.getLineupById(lid)?.title || lid }}
                  </span>
                </div>

                <!-- Role, Delay & Reorder Controls -->
                <div v-if="formData.stepConfigs[lid]" class="flex items-center gap-2">
                  <div class="flex items-center gap-1">
                    <UserCheck class="w-3.5 h-3.5 text-purple-400" />
                    <select
                      v-model="formData.stepConfigs[lid]!.role"
                      class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-purple-300"
                    >
                      <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                    </select>
                  </div>

                  <div class="flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5 text-emerald-400" />
                    <input
                      v-model.number="formData.stepConfigs[lid]!.delaySeconds"
                      type="number"
                      step="0.5"
                      min="0"
                      max="60"
                      class="w-14 bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-1 text-[11px] font-mono text-emerald-300 text-center"
                      title="Delay in seconds from Execute start"
                    />
                    <span class="text-[10px] text-slate-500">s</span>
                  </div>

                  <div class="flex items-center gap-0.5">
                    <button
                      type="button"
                      @click="moveStep(idx, -1)"
                      :disabled="idx === 0"
                      class="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                    >
                      <ArrowUp class="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      @click="moveStep(idx, 1)"
                      :disabled="idx === formData.selectedLineupIds.length - 1"
                      class="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 cursor-pointer"
                    >
                      <ArrowDown class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SELECT LINEUPS CHECKLIST -->
          <div class="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Lineups on {{ mapStore.currentMap.name }} ({{ formData.selectedLineupIds.length }} Selected)
              </label>
              <span class="text-[10px] text-slate-500 font-mono">
                {{ availableLineups.length }} available
              </span>
            </div>

            <div
              v-if="availableLineups.length === 0"
              class="p-6 bg-slate-950/80 rounded-xl text-center text-slate-500 text-xs"
            >
              No lineups found on {{ mapStore.currentMap.name }}. Enable preset lineups or add a custom lineup first.
            </div>

            <div v-else class="max-h-52 overflow-y-auto flex flex-col gap-1.5 pr-1">
              <div
                v-for="lineup in availableLineups"
                :key="lineup.id"
                @click="toggleLineup(lineup.id)"
                :class="[
                  'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none',
                  formData.selectedLineupIds.includes(lineup.id)
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
                ]"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    :class="[
                      'w-5 h-5 rounded-md flex items-center justify-center border transition-colors text-[10px] font-black',
                      formData.selectedLineupIds.includes(lineup.id)
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    ]"
                  >
                    <span v-if="formData.selectedLineupIds.includes(lineup.id)">
                      {{ formData.selectedLineupIds.indexOf(lineup.id) + 1 }}
                    </span>
                  </div>

                  <NadeIcon :type="lineup.grenadeType" :size="16" :filled="true" />

                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold truncate text-white">{{ lineup.title }}</span>
                    <span class="text-[10px] text-slate-500 truncate">
                      From {{ lineup.startLocation }} → To {{ lineup.endLocation }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  <span
                    v-if="lineup.playerRole"
                    class="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-bold"
                  >
                    {{ lineup.playerRole }}
                  </span>
                  <span
                    class="px-2 py-0.5 rounded bg-slate-800 text-amber-400 text-[10px] font-mono font-bold uppercase"
                  >
                    {{ lineup.throwType.replace('_', ' ') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTER ACTIONS -->
        <div
          class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3"
        >
          <button
            @click="lineupStore.isCreateExecuteModalOpen = false"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            @click="handleSave"
            class="px-5 py-2.5 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 hover:opacity-90"
            :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
          >
            <Sparkles class="w-4 h-4" />
            <span>Save &amp; Launch Execute on Radar</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
