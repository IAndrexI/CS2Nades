<script setup lang="ts">
import { ref } from 'vue'
import { usePwaStore } from '../../stores/pwaStore'
import { useThemeStore } from '../../stores/themeStore'
import { 
  X, 
  Smartphone, 
  Monitor, 
  Download, 
  Check, 
  Sparkles, 
  Server, 
  Zap, 
  Layers, 
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink,
  Laptop,
  Apple,
  Share,
  PlusSquare,
  ArrowRight
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const pwaStore = usePwaStore()
const themeStore = useThemeStore()

const activePlatform = ref<'windows' | 'browser' | 'ios' | 'android'>('windows')
const copiedOrigin = ref(false)
const installFeedback = ref<string | null>(null)

async function handleInstallClick() {
  if (pwaStore.isInstallable) {
    const success = await pwaStore.promptInstall()
    if (success) {
      installFeedback.value = '🎉 CS2 Stratbook App installed successfully!'
      setTimeout(() => {
        installFeedback.value = null
        emit('close')
      }, 3000)
    }
  } else {
    // If prompt is not available, provide instructions or launcher download
    pwaStore.downloadWindowsAppLauncher()
    installFeedback.value = '✓ Downloaded Windows Desktop App Launcher (Launch_CS2_Stratbook.bat)!'
    setTimeout(() => (installFeedback.value = null), 4000)
  }
}

function handleDownloadLauncher() {
  pwaStore.downloadWindowsAppLauncher()
  installFeedback.value = '✓ Downloaded Launch_CS2_Stratbook.bat! Double click it to run.'
  setTimeout(() => (installFeedback.value = null), 4000)
}

function handleDownloadShortcut() {
  pwaStore.downloadWindowsShortcut()
  installFeedback.value = '✓ Downloaded Desktop Shortcut file!'
  setTimeout(() => (installFeedback.value = null), 4000)
}

async function copyServerUrl() {
  try {
    await navigator.clipboard.writeText(pwaStore.currentOrigin)
    copiedOrigin.value = true
    setTimeout(() => (copiedOrigin.value = false), 2500)
  } catch (e) {}
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex items-center justify-center animate-fade-in"
      style="z-index: 9999999 !important;"
      @click.self="emit('close')"
    >
      <div 
        class="relative w-full max-w-3xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] sm:max-h-[88vh]"
        :style="{ backgroundColor: themeStore.customModalBgColor }"
      >
        <!-- HEADER -->
        <div class="p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <div 
              class="p-2.5 rounded-2xl border shadow-inner flex items-center justify-center"
              :style="{ backgroundColor: themeStore.customAccentColor + '22', borderColor: themeStore.customAccentColor + '66', color: themeStore.customAccentColor }"
            >
              <Monitor class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black uppercase text-white tracking-wide">
                  Install CS2 Stratbook App
                </h2>
                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1">
                  <Server class="w-3 h-3" />
                  100% Server Synced
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Run the lineup & stratbook platform as a dedicated desktop or mobile app with zero latency.
              </p>
            </div>
          </div>

          <button 
            @click="emit('close')" 
            class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- BODY -->
        <div class="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 text-xs scrollbar-thin">
          
          <!-- LIVE SERVER SYNC GUARANTEE CARD -->
          <div class="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl shrink-0 flex items-center justify-center">
                <Zap class="w-5 h-5 fill-current" />
              </div>
              <div class="flex flex-col">
                <span class="font-black text-white text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <span>Connected Server Host:</span>
                  <span class="text-emerald-400 font-mono lowercase font-bold">{{ pwaStore.currentOrigin }}</span>
                </span>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  The installed app communicates directly with your live server. All lineups, tactical drawings, and database edits are instantly synchronized in real-time across all your PCs, laptops, and phones!
                </p>
              </div>
            </div>

            <button
              @click="copyServerUrl"
              class="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-[11px] font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow"
            >
              <Check v-if="copiedOrigin" class="w-3.5 h-3.5 text-emerald-400" />
              <Server v-else class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ copiedOrigin ? 'Copied Server URL!' : 'Copy Server URL' }}</span>
            </button>
          </div>

          <!-- STATUS FEEDBACK TOAST -->
          <div v-if="installFeedback" class="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-2 animate-bounce">
            <CheckCircle2 class="w-4 h-4 shrink-0" />
            <span>{{ installFeedback }}</span>
          </div>

          <!-- PRIMARY INSTALLATION METHODS -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- CARD 1: 1-CLICK BROWSER PWA INSTALL -->
            <div class="p-4 bg-slate-950/90 border-2 border-amber-500/40 rounded-2xl flex flex-col justify-between gap-4 shadow-xl relative overflow-hidden group">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                    Recommended (Edge / Chrome)
                  </span>
                  <span v-if="pwaStore.isStandaloneMode" class="text-[10px] text-emerald-400 font-bold font-mono">
                    ✓ Running in App Mode
                  </span>
                </div>

                <div class="flex items-center gap-2.5 pt-1">
                  <Laptop class="w-5 h-5 text-amber-400" />
                  <h3 class="font-black text-sm text-white uppercase tracking-wide">
                    Install as Web App
                  </h3>
                </div>

                <p class="text-[11px] text-slate-400 leading-relaxed">
                  Installs a borderless desktop application to your Windows Start Menu, Taskbar, or macOS Dock. Opens in a dedicated ultra-clean window without URL bars.
                </p>

                <ul class="text-[10px] text-slate-300 space-y-1 pt-1 font-medium">
                  <li class="flex items-center gap-1.5">
                    <Check class="w-3 h-3 text-emerald-400" />
                    <span>Dedicated desktop icon & taskbar pinned</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <Check class="w-3 h-3 text-emerald-400" />
                    <span>Fastest startup speed & zero browser clutter</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <Check class="w-3 h-3 text-emerald-400" />
                    <span>Real-time server sync on every lineup edit</span>
                  </li>
                </ul>
              </div>

              <button
                @click="handleInstallClick"
                class="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Download class="w-4 h-4 stroke-[3]" />
                <span>{{ pwaStore.isInstallable ? 'Install PWA App Now' : '1-Click Desktop Installer' }}</span>
              </button>
            </div>

            <!-- CARD 2: WINDOWS DEDICATED LAUNCHER SCRIPT -->
            <div class="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-col justify-between gap-4 shadow-xl">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold text-[10px] uppercase tracking-wider">
                    Windows Launcher
                  </span>
                  <span class="text-[10px] text-slate-500 font-mono">No Browser Prompts</span>
                </div>

                <div class="flex items-center gap-2.5 pt-1">
                  <Monitor class="w-5 h-5 text-sky-400" />
                  <h3 class="font-black text-sm text-white uppercase tracking-wide">
                    Desktop Launcher (.bat)
                  </h3>
                </div>

                <p class="text-[11px] text-slate-400 leading-relaxed">
                  Download a lightweight Windows script that launches CS2 Stratbook in native borderless App Mode (<kbd class="text-sky-300 font-mono">--app</kbd>) anytime with a double-click!
                </p>

                <div class="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl font-mono text-[10px] text-slate-300">
                  <span class="text-slate-500">Command:</span><br />
                  <span class="text-sky-300">msedge.exe --app="{{ pwaStore.currentOrigin }}"</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="handleDownloadLauncher"
                  class="flex-1 py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-95"
                >
                  <Download class="w-4 h-4" />
                  <span>Download .bat</span>
                </button>

                <button
                  @click="handleDownloadShortcut"
                  class="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Download Windows Desktop Shortcut (.url)"
                >
                  <span>.url</span>
                </button>
              </div>
            </div>

          </div>

          <!-- PLATFORM SPECIFIC INSTRUCTIONS TABS -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between pb-2 border-b border-slate-800">
              <span class="font-bold text-white text-xs uppercase tracking-wider">
                📱 Manual Install Guides
              </span>

              <div class="flex items-center gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-[10px] font-bold">
                <button
                  @click="activePlatform = 'windows'"
                  :class="[
                    'px-2 py-1 rounded transition-colors cursor-pointer',
                    activePlatform === 'windows' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  ]"
                >
                  Windows (Chrome/Edge)
                </button>
                <button
                  @click="activePlatform = 'android'"
                  :class="[
                    'px-2 py-1 rounded transition-colors cursor-pointer',
                    activePlatform === 'android' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  ]"
                >
                  Android
                </button>
                <button
                  @click="activePlatform = 'ios'"
                  :class="[
                    'px-2 py-1 rounded transition-colors cursor-pointer',
                    activePlatform === 'ios' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  ]"
                >
                  iPhone / iPad (iOS)
                </button>
              </div>
            </div>

            <!-- WINDOWS GUIDE -->
            <div v-if="activePlatform === 'windows'" class="text-[11px] text-slate-300 space-y-1.5 leading-relaxed animate-fade-in">
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>In Google Chrome or Microsoft Edge, look at the right side of the address bar for the <strong>Install App icon (⊕ or 💻)</strong>.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Click <strong>Install Protutech CS2 Tactical Stratbook</strong>.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Check <strong>"Pin to taskbar"</strong> and <strong>"Pin to Start"</strong> for instant 1-click access while playing CS2!</span>
              </div>
            </div>

            <!-- ANDROID GUIDE -->
            <div v-if="activePlatform === 'android'" class="text-[11px] text-slate-300 space-y-1.5 leading-relaxed animate-fade-in">
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Open this website in <strong>Chrome</strong> on your Android phone or tablet.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Tap the <strong>three dots (⋮)</strong> menu in the top right corner.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
              </div>
            </div>

            <!-- IOS GUIDE -->
            <div v-if="activePlatform === 'ios'" class="text-[11px] text-slate-300 space-y-1.5 leading-relaxed animate-fade-in">
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Open this website in <strong>Safari</strong> on your iPhone or iPad.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Tap the <strong>Share button</strong> (<Share class="w-3 h-3 inline text-sky-400" /> square with arrow).</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="w-4 h-4 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong> (<PlusSquare class="w-3 h-3 inline text-amber-400" />).</span>
              </div>
            </div>

          </div>

        </div>

        <!-- FOOTER -->
        <div class="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-[11px] text-slate-400 shrink-0">
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-emerald-400" />
            <span>Continuous background synchronization with server database.</span>
          </div>

          <button
            @click="emit('close')"
            class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
