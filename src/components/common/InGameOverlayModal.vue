<script setup lang="ts">
import { ref } from 'vue'
import { 
  X, 
  Monitor, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Sliders, 
  Terminal, 
  Layers, 
  Radio, 
  Check, 
  Copy,
  ChevronRight,
  Info,
  Laptop
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const copiedBat = ref(false)

function openWebOverlayPopup() {
  const overlayUrl = `${window.location.origin}/overlay`
  const w = 480
  const h = 720
  const left = window.screen.width - w - 40
  const top = 60

  window.open(
    overlayUrl,
    'CS2_Nades_Overlay',
    `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=no,status=no,toolbar=no`
  )
  emit('close')
}

function downloadOverlayLauncher() {
  window.open('/api/download/overlay-launcher', '_blank')
}

function downloadFullAppZip() {
  window.open('/api/download/overlay-app', '_blank')
}

async function copyBatScript() {
  const serverUrl = window.location.origin
  const script = `@echo off\ntitle CS2 Nades In-Game Overlay\necho Starting CS2 Nades Overlay HUD...\nstart msedge.exe --app="${serverUrl}/overlay" --window-size=480,720 --window-position=50,50\nexit`
  try {
    await navigator.clipboard.writeText(script)
    copiedBat.value = true
    setTimeout(() => (copiedBat.value = false), 2000)
  } catch (e) {}
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      @click.self="emit('close')"
    >
      <div class="relative w-full max-w-2xl max-h-[92vh] my-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        <!-- HEADER -->
        <div class="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shadow">
              <Monitor class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>CS2 In-Game Overlay App</span>
                <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono rounded-full font-bold">
                  100% VAC Safe
                </span>
              </h2>
              <p class="text-xs text-slate-400">
                Display live radar trajectories, lineup crosshairs, and squad calls over CS2 while playing
              </p>
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
        <div class="flex-grow overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 text-xs text-slate-300">
          
          <!-- OPTION CARDS: 1-CLICK WEB POPUP VS WINDOWS DOWNLOAD -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <!-- CARD 1: ZERO-INSTALL WEB POPUP OVERLAY -->
            <div class="p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl flex flex-col justify-between gap-3 shadow-lg transition-all group">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div class="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Zap class="w-5 h-5" />
                  </div>
                  <span class="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px] rounded-full">
                    Zero Install
                  </span>
                </div>
                <h3 class="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                  Web-Based HUD Popout
                </h3>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  Opens a dedicated ultra-compact popup window with transparency control that floats on your 2nd monitor or alongside your game.
                </p>
              </div>

              <button 
                @click="openWebOverlayPopup"
                class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-95"
              >
                <ExternalLink class="w-4 h-4" />
                <span>Launch Web Overlay</span>
              </button>
            </div>

            <!-- CARD 2: DOWNLOAD WINDOWS OVERLAY LAUNCHER -->
            <div class="p-4 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-2xl flex flex-col justify-between gap-3 shadow-lg transition-all group">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div class="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <Laptop class="w-5 h-5" />
                  </div>
                  <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] rounded-full font-bold">
                    Windows Desktop App
                  </span>
                </div>
                <h3 class="font-black text-sm text-white group-hover:text-emerald-400 transition-colors">
                  Windows Overlay Launcher
                </h3>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  Download the 1-click Windows desktop runner (<code class="text-emerald-400 font-mono">.bat</code> / <code class="text-emerald-400 font-mono">.zip</code>) to launch an always-on-top borderless CS2 HUD.
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button 
                  @click="downloadOverlayLauncher"
                  class="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                >
                  <Download class="w-4 h-4" />
                  <span>Download .bat</span>
                </button>
                <button 
                  @click="downloadFullAppZip"
                  class="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  title="Download Complete Package (.zip)"
                >
                  <Layers class="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          <!-- HIGHLIGHTED FEATURES -->
          <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col gap-2.5">
            <span class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders class="w-4 h-4 text-amber-400" />
              <span>Key In-Game Overlay Features</span>
            </span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div class="flex items-start gap-2">
                <Check class="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 stroke-[3]" />
                <span><strong>Live Minimap & Radar:</strong> Real-time grenade trajectories and smoke landing markers.</span>
              </div>
              <div class="flex items-start gap-2">
                <Check class="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 stroke-[3]" />
                <span><strong>1-Click Console Binds:</strong> Copy exact <code class="text-amber-300 font-mono">setpos</code> teleport commands in 1 click.</span>
              </div>
              <div class="flex items-start gap-2">
                <Check class="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 stroke-[3]" />
                <span><strong>Squad Real-Time Sync:</strong> Teammate lineup callouts pop up directly on your screen.</span>
              </div>
              <div class="flex items-start gap-2">
                <Check class="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0 stroke-[3]" />
                <span><strong>Custom Opacity:</strong> Slide between 30% and 100% transparency to avoid blocking crosshair vision.</span>
              </div>
            </div>
          </div>

          <!-- VAC & ANTICHEAT SAFETY NOTICE -->
          <div class="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
            <ShieldCheck class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div class="flex flex-col gap-1">
              <span class="font-bold text-xs text-emerald-300">100% VAC & Matchmaking Safe</span>
              <p class="text-[11px] text-slate-300 leading-relaxed">
                The CS2 Nades overlay is a standalone external window (similar to Discord Overlay or OBS). It <strong>never touches CS2 game memory, DLLs, or hooks into the graphics pipeline</strong>, making it completely compliant with Valve Anti-Cheat (VAC) and Premier Matchmaking.
              </p>
            </div>
          </div>

          <!-- CS2 DISPLAY SETTINGS TIP -->
          <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <div class="flex items-center gap-2">
              <Info class="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>Game Setup:</strong> In CS2 Video Settings, set <em>Display Mode</em> to <strong>"Fullscreen Windowed" (Borderless)</strong> for seamless overlay rendering.</span>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button 
            @click="copyBatScript"
            class="text-[11px] text-slate-400 hover:text-amber-400 font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>{{ copiedBat ? 'Copied Launch Script!' : 'Copy Raw Batch Script' }}</span>
          </button>

          <button 
            @click="emit('close')"
            class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
