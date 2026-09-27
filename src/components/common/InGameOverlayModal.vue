<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
  Laptop,
  Smartphone,
  Star,
  GitBranch,
  Code2,
  BookOpen,
  Gamepad2
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-practice'): void
}>()

const router = useRouter()
const activeTab = ref<'overlay' | 'practice' | 'phone' | 'github'>('overlay')
const copiedBat = ref(false)
const copiedDockerCmd = ref(false)
const copiedQuickCfg = ref(false)

function handleOpenFullPractice() {
  emit('close')
  emit('open-practice')
}

async function copyQuickPracticeCfg() {
  const cfg = `// Protutech CS2 Quick Practice
sv_cheats 1
bot_kick
mp_warmup_end
mp_freezetime 0
mp_roundtime_defuse 60
mp_buytime 60000
mp_buy_anywhere 1
sv_infinite_ammo 1
ammo_grenade_limit_total 6
sv_grenade_trajectory_prac_pipreview 1
sv_grenade_trajectory_prac_trailtime 15
cl_grenadepreview 1
sv_showimpacts 1
sv_regeneration_force_on 1
bind "alt" "noclip"
bind "h" "sv_rethrow_last_grenade"
bind "c" "ent_fire smokegrenade_projectile kill; ent_fire molotov_projectile kill; ent_fire flashbang_projectile kill; ent_fire hegrenade_projectile kill"
mp_restartgame 1`
  try {
    await navigator.clipboard.writeText(cfg)
    copiedQuickCfg.value = true
    setTimeout(() => (copiedQuickCfg.value = false), 2000)
  } catch (e) {}
}

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

function openMobileCompanion() {
  emit('close')
  router.push('/remote')
}

async function copyBatScript() {
  const serverUrl = window.location.origin
  const script = `@echo off
title CS2 Nades In-Game Overlay
color 0E
echo Launching In-Game HUD...
set "TARGET_URL=${serverUrl}/overlay"
set "APP_ARGS=--new-window --app="%TARGET_URL%" --window-size=480,720 --window-position=50,50"

:: 1. Vivaldi
if exist "%LocalAppData%\\Vivaldi\\Application\\vivaldi.exe" ( start "" "%LocalAppData%\\Vivaldi\\Application\\vivaldi.exe" %APP_ARGS% & exit )
if exist "%ProgramFiles%\\Vivaldi\\Application\\vivaldi.exe" ( start "" "%ProgramFiles%\\Vivaldi\\Application\\vivaldi.exe" %APP_ARGS% & exit )
if exist "%ProgramFiles(x86)%\\Vivaldi\\Application\\vivaldi.exe" ( start "" "%ProgramFiles(x86)%\\Vivaldi\\Application\\vivaldi.exe" %APP_ARGS% & exit )

:: 2. Opera GX
if exist "%LocalAppData%\\Programs\\Opera GX\\launcher.exe" ( start "" "%LocalAppData%\\Programs\\Opera GX\\launcher.exe" %APP_ARGS% & exit )

:: 3. Opera Stable
if exist "%LocalAppData%\\Programs\\Opera\\launcher.exe" ( start "" "%LocalAppData%\\Programs\\Opera\\launcher.exe" %APP_ARGS% & exit )
if exist "%ProgramFiles%\\Opera\\launcher.exe" ( start "" "%ProgramFiles%\\Opera\\launcher.exe" %APP_ARGS% & exit )
if exist "%ProgramFiles(x86)%\\Opera\\launcher.exe" ( start "" "%ProgramFiles(x86)%\\Opera\\launcher.exe" %APP_ARGS% & exit )

:: 4. Brave
if exist "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" ( start "" "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" %APP_ARGS% & exit )
if exist "%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" ( start "" "%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" %APP_ARGS% & exit )

:: 5. Google Chrome
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" ( start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" %APP_ARGS% & exit )
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" ( start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" %APP_ARGS% & exit )
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" ( start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" %APP_ARGS% & exit )

:: 6. Microsoft Edge
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" ( start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" %APP_ARGS% & exit )
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" ( start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" %APP_ARGS% & exit )

:: 7. Firefox / Universal fallback
if exist "%ProgramFiles%\\Mozilla Firefox\\firefox.exe" ( start "" "%ProgramFiles%\\Mozilla Firefox\\firefox.exe" -new-window "%TARGET_URL%" & exit )
if exist "%ProgramFiles(x86)%\\Mozilla Firefox\\firefox.exe" ( start "" "%ProgramFiles(x86)%\\Mozilla Firefox\\firefox.exe" -new-window "%TARGET_URL%" & exit )
start "" "%TARGET_URL%"
exit`

  try {
    await navigator.clipboard.writeText(script)
    copiedBat.value = true
    setTimeout(() => (copiedBat.value = false), 2000)
  } catch (e) {}
}

async function copyDockerCommand() {
  const cmd = `cd /opt/CS2Nades && git pull origin main && docker compose up -d --build`
  try {
    await navigator.clipboard.writeText(cmd)
    copiedDockerCmd.value = true
    setTimeout(() => (copiedDockerCmd.value = false), 2000)
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
        <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shadow">
              <Monitor class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Apps & Open Source Hub</span>
                <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono rounded-full font-bold">
                  v2.0 Released
                </span>
              </h2>
              <p class="text-xs text-slate-400">
                In-Game CS2 Overlay App, Mobile Touch Deck & Official GitHub Repository
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

        <!-- TABS -->
        <!-- TABS -->
        <div class="flex items-center gap-1 px-5 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            @click="activeTab = 'overlay'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
              activeTab === 'overlay' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            <Monitor class="w-3.5 h-3.5" />
            <span>In-Game Overlay App</span>
          </button>

          <button
            @click="activeTab = 'practice'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
              activeTab === 'practice' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            <Gamepad2 class="w-3.5 h-3.5" />
            <span>Practice & CFG Studio</span>
          </button>

          <button
            @click="activeTab = 'phone'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
              activeTab === 'phone' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            <Smartphone class="w-3.5 h-3.5" />
            <span>Mobile Companion</span>
          </button>

          <button
            @click="activeTab = 'github'"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
              activeTab === 'github' ? 'bg-slate-800 text-white border border-slate-700 shadow font-black' : 'text-slate-400 hover:text-slate-200'
            ]"
          >
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        <!-- BODY -->
        <div class="flex-grow overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 text-xs text-slate-300">
          
          <!-- TAB 1: IN-GAME OVERLAY -->
          <div v-show="activeTab === 'overlay'" class="flex flex-col gap-4 animate-fade-in">
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

              <!-- CARD 2: DOWNLOAD WINDOWS OVERLAY LAUNCHER (MULTI-BROWSER) -->
              <div class="p-4 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-2xl flex flex-col justify-between gap-3 shadow-lg transition-all group">
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <div class="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                      <Laptop class="w-5 h-5" />
                    </div>
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] rounded-full font-bold">
                      Default Browser Ready
                    </span>
                  </div>
                  <h3 class="font-black text-sm text-white group-hover:text-emerald-400 transition-colors">
                    Windows Overlay Launcher
                  </h3>
                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    Auto-detects and launches with your default browser (<strong>Vivaldi, Opera GX, Edge, Chrome, Brave, Firefox</strong>) in borderless HUD app mode.
                  </p>

                  <!-- BROWSER BADGES -->
                  <div class="flex flex-wrap gap-1 pt-1">
                    <span class="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[9px] font-mono text-slate-300 font-bold">Vivaldi</span>
                    <span class="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[9px] font-mono text-slate-300 font-bold">Opera / GX</span>
                    <span class="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[9px] font-mono text-slate-300 font-bold">MS Edge</span>
                    <span class="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[9px] font-mono text-slate-300 font-bold">Chrome</span>
                    <span class="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[9px] font-mono text-slate-300 font-bold">Brave</span>
                    <span class="px-1.5 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-[9px] font-mono text-slate-300 font-bold">Firefox</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <button 
                    @click="downloadOverlayLauncher"
                    class="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                  >
                    <Download class="w-4 h-4" />
                    <span>Download .bat</span>
                  </button>
                  <button 
                    @click="copyBatScript"
                    class="px-3 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy Multi-Browser Batch Script"
                  >
                    <Check v-if="copiedBat" class="w-4 h-4 text-emerald-400 stroke-[3]" />
                    <Copy v-else class="w-4 h-4" />
                    <span class="hidden xs:inline">{{ copiedBat ? 'Copied!' : 'Copy Script' }}</span>
                  </button>
                  <button 
                    @click="downloadFullAppZip"
                    class="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    title="Download Complete Package (.ps1)"
                  >
                    <Layers class="w-4 h-4" />
                  </button>
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
          </div>

          <!-- TAB: PRACTICE & CFG STUDIO -->
          <div v-show="activeTab === 'practice'" class="flex flex-col gap-4 animate-fade-in">
            <!-- PRACTICE OVERVIEW & LAUNCH -->
            <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                  <Gamepad2 class="w-8 h-8" />
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">CS2 Practice Config & Server Studio</h3>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    Generate custom <code class="text-amber-400 font-mono">practice.cfg</code>, export teleport binds, and deploy 128-tick practice servers.
                  </p>
                </div>
              </div>

              <button
                @click="handleOpenFullPractice"
                class="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl shadow cursor-pointer transition-all shrink-0 flex items-center gap-2"
              >
                <Sliders class="w-4 h-4" />
                <span>Open Practice Studio</span>
              </button>
            </div>

            <!-- QUICK CFG SCRIPT BOX -->
            <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <Terminal class="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quick Practice CFG Commands (Subtick & Trajectory):</span>
                </span>
                <button
                  @click="copyQuickPracticeCfg"
                  class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Check v-if="copiedQuickCfg" class="w-3 h-3 text-emerald-400 stroke-[3]" />
                  <Copy v-else class="w-3 h-3" />
                  <span>{{ copiedQuickCfg ? 'Copied CFG!' : 'Copy Quick CFG' }}</span>
                </button>
              </div>

              <code class="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl font-mono text-[10px] text-slate-300 overflow-x-auto leading-relaxed">
                sv_cheats 1; bot_kick; mp_warmup_end; mp_roundtime_defuse 60; sv_infinite_ammo 1; sv_grenade_trajectory_prac_pipreview 1; sv_showimpacts 1; bind "alt" "noclip"; bind "h" "sv_rethrow_last_grenade"; mp_restartgame 1
              </code>
            </div>
          </div>

          <!-- TAB 2: MOBILE COMPANION APP -->
          <div v-show="activeTab === 'phone'" class="flex flex-col gap-4 animate-fade-in">
            <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl">
                  <Smartphone class="w-8 h-8" />
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">Mobile Touch StreamDeck & Voice Remote</h3>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    Use your phone as a second-screen stream deck with live voice recognition (<kbd class="px-1 bg-slate-900 border border-slate-700 rounded text-amber-300">"Mirage window smoke"</kbd>).
                  </p>
                </div>
              </div>

              <button
                @click="openMobileCompanion"
                class="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase rounded-xl shadow cursor-pointer transition-all shrink-0"
              >
                Open Mobile Deck
              </button>
            </div>

            <!-- PWA INSTALL INSTRUCTIONS -->
            <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col gap-2">
              <span class="font-bold text-xs text-white">📱 Install as App on iOS & Android (PWA):</span>
              <ul class="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                <li><strong>iPhone (Safari):</strong> Tap Share (<svg class="inline w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>) and tap <em>"Add to Home Screen"</em>.</li>
                <li><strong>Android (Chrome):</strong> Tap the 3 dots menu and tap <em>"Install App"</em> or <em>"Add to Home screen"</em>.</li>
              </ul>
            </div>
          </div>

          <!-- TAB 3: GITHUB REPOSITORY & OPEN SOURCE -->
          <div v-show="activeTab === 'github'" class="flex flex-col gap-4 animate-fade-in">
            <!-- GITHUB BANNER CARD -->
            <div class="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-white/10 text-white rounded-2xl">
                  <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-black text-sm text-white">IAndrexI / CS2Nades</h3>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    Open Source CS2 Tactical Stratbook, Live Minimap, Lineup Indexer & In-Game Overlay.
                  </p>
                </div>
              </div>

              <a
                href="https://github.com/IAndrexI/CS2Nades"
                target="_blank"
                rel="noopener noreferrer"
                class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-slate-700 shadow shrink-0"
              >
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Star on GitHub</span>
                <ExternalLink class="w-3.5 h-3.5 ml-1 text-slate-400" />
              </a>
            </div>

            <!-- PROXMOX / DOCKER DEPLOYMENT COMMAND -->
            <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                  <Terminal class="w-3.5 h-3.5 text-amber-400" />
                  <span>Proxmox LXC / Docker 1-Click Update Command:</span>
                </span>
                <button
                  @click="copyDockerCommand"
                  class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Check v-if="copiedDockerCmd" class="w-3 h-3 text-emerald-400 stroke-[3]" />
                  <Copy v-else class="w-3 h-3" />
                  <span>{{ copiedDockerCmd ? 'Copied!' : 'Copy Command' }}</span>
                </button>
              </div>

              <code class="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-300 select-all overflow-x-auto">
                cd /opt/CS2Nades &amp;&amp; git pull origin main &amp;&amp; docker compose up -d --build
              </code>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a
              href="https://github.com/IAndrexI/CS2Nades"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[11px] text-slate-400 hover:text-white font-mono flex items-center gap-1.5 transition-colors"
            >
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub: IAndrexI/CS2Nades</span>
            </a>
          </div>

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
