<script setup lang="ts">
import { computed } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import NadeIcon from '../common/NadeIcon.vue'
import { 
  AlertTriangle, 
  X, 
  ArrowRight, 
  Check, 
  Copy, 
  Layers, 
  HelpCircle 
} from 'lucide-vue-next'

const lineupStore = useLineupStore()

const currentConflict = computed(() => {
  return lineupStore.pendingConflicts.length > 0 ? lineupStore.pendingConflicts[0] : null
})

const remainingCount = computed(() => lineupStore.pendingConflicts.length)
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="lineupStore.isConflictModalOpen && currentConflict"
      class="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 backdrop-blur-md flex min-h-full items-center justify-center p-4 text-center animate-fade-in"
      @click.self="lineupStore.isConflictModalOpen = false"
    >
      <div class="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto text-left flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl">
            <AlertTriangle class="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-black tracking-tight text-white uppercase">
                Lineup Sync Conflict
              </h2>
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                {{ remainingCount }} conflict{{ remainingCount > 1 ? 's' : '' }} remaining
              </span>
            </div>
            <p class="text-xs text-slate-400">
              The server version differs from your local device version. Please choose how to resolve:
            </p>
          </div>
        </div>

        <button 
          @click="lineupStore.isConflictModalOpen = false"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- SIDE BY SIDE DIFF -->
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <!-- LOCAL VERSION -->
        <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-400 uppercase tracking-wide text-[11px]">Your Local Version</span>
            <span class="text-[10px] text-slate-500">Local Device</span>
          </div>

          <div class="font-bold text-white text-sm flex items-center gap-2">
            <NadeIcon :type="currentConflict.local.grenadeType" :size="16" />
            <span>{{ currentConflict.local.title }}</span>
          </div>

          <div class="flex flex-col gap-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <div><span class="text-slate-500">From:</span> {{ currentConflict.local.startLocation }}</div>
            <div><span class="text-slate-500">To:</span> {{ currentConflict.local.endLocation }}</div>
            <div><span class="text-slate-500">Throw:</span> {{ currentConflict.local.throwType }}</div>
            <div><span class="text-slate-500">Origin:</span> {{ currentConflict.local.originCoords.x }}%, {{ currentConflict.local.originCoords.y }}%</div>
            <div><span class="text-slate-500">Target:</span> {{ currentConflict.local.landingCoords.x }}%, {{ currentConflict.local.landingCoords.y }}%</div>
          </div>

          <button
            @click="lineupStore.resolveConflict(0, 'local')"
            class="mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check class="w-4 h-4 text-amber-400" />
            <span>Keep My Local Version</span>
          </button>
        </div>

        <!-- SERVER VERSION -->
        <div class="p-4 bg-slate-950/80 border border-cyan-500/30 rounded-2xl flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-cyan-400 uppercase tracking-wide text-[11px]">Server Team Version</span>
            <span class="text-[10px] text-slate-500">Cloud Sync</span>
          </div>

          <div class="font-bold text-white text-sm flex items-center gap-2">
            <NadeIcon :type="currentConflict.server.grenadeType" :size="16" />
            <span>{{ currentConflict.server.title }}</span>
          </div>

          <div class="flex flex-col gap-1 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <div><span class="text-slate-500">From:</span> {{ currentConflict.server.startLocation }}</div>
            <div><span class="text-slate-500">To:</span> {{ currentConflict.server.endLocation }}</div>
            <div><span class="text-slate-500">Throw:</span> {{ currentConflict.server.throwType }}</div>
            <div><span class="text-slate-500">Origin:</span> {{ currentConflict.server.originCoords.x }}%, {{ currentConflict.server.originCoords.y }}%</div>
            <div><span class="text-slate-500">Target:</span> {{ currentConflict.server.landingCoords.x }}%, {{ currentConflict.server.landingCoords.y }}%</div>
          </div>

          <button
            @click="lineupStore.resolveConflict(0, 'server')"
            class="mt-2 py-2 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowRight class="w-4 h-4 text-cyan-400" />
            <span>Overwrite with Server</span>
          </button>
        </div>
      </div>

      <!-- FOOTER: KEEP BOTH -->
      <div class="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
        <span class="text-slate-400 text-xs flex items-center gap-1.5">
          <HelpCircle class="w-4 h-4 text-slate-500" />
          <span>Can't decide? Save both as separate lineups.</span>
        </span>

        <button
          @click="lineupStore.resolveConflict(0, 'both')"
          class="py-2 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Copy class="w-4 h-4 stroke-[2.5]" />
          <span>Keep Both (Create Duplicate)</span>
        </button>
      </div>
    </div>
  </div>
</Teleport>
</template>
