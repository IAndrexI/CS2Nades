<script setup lang="ts">
import { ref } from 'vue'
import { useLineupStore } from '../../stores/lineupStore'
import { 
  X, 
  Download, 
  Upload, 
  Server, 
  HardDrive, 
  Check, 
  AlertCircle,
  Database
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const lineupStore = useLineupStore()
const importStatus = ref<{ message: string; success: boolean } | null>(null)
const jsonInput = ref('')

function handleExport() {
  const json = lineupStore.exportJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cs2-stratbook-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const text = event.target?.result as string
    const res = lineupStore.importJSON(text)
    if (res.success) {
      importStatus.value = { message: `Successfully imported ${res.count} custom lineups!`, success: true }
    } else {
      importStatus.value = { message: `Import failed: ${res.error}`, success: false }
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <!-- HEADER -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Database class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-black tracking-tight text-white">Data Storage & Self-Host Sync</h2>
            <p class="text-xs text-slate-400">Export, import, or manage your custom lineups and team playbooks</p>
          </div>
        </div>

        <button 
          @click="emit('close')"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- BODY -->
      <div class="p-6 flex flex-col gap-5 text-xs text-slate-300">
        <!-- SELF-HOST INFO -->
        <div class="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3.5">
          <div class="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Server class="w-4 h-4" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="font-bold text-white text-xs">Self-Hosted Container Mode</span>
            <p class="text-slate-400 leading-relaxed text-[11px]">
              Running standalone in your Proxmox LXC container. Custom lineups and team strategies are persisted locally in browser storage and volume mounts.
            </p>
          </div>
        </div>

        <!-- EXPORT / BACKUP -->
        <div class="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
          <div class="flex flex-col gap-0.5">
            <span class="font-bold text-white">Export Stratbook Backup</span>
            <span class="text-slate-400 text-[11px]">Download all custom lineups and favorites as a single JSON file.</span>
          </div>
          <button
            @click="handleExport"
            class="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>

        <!-- IMPORT / RESTORE -->
        <div class="flex flex-col gap-2 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <span class="font-bold text-white">Import Stratbook Backup</span>
              <span class="text-slate-400 text-[11px]">Upload a previously exported JSON backup.</span>
            </div>
            <label class="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs rounded-xl transition-colors cursor-pointer">
              <Upload class="w-3.5 h-3.5" />
              <span>Select File</span>
              <input type="file" accept=".json" @change="handleImportFile" class="hidden" />
            </label>
          </div>

          <!-- IMPORT STATUS FEEDBACK -->
          <div 
            v-if="importStatus" 
            :class="[
              'p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-2 mt-2',
              importStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            ]"
          >
            <Check v-if="importStatus.success" class="w-3.5 h-3.5" />
            <AlertCircle v-else class="w-3.5 h-3.5" />
            <span>{{ importStatus.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
