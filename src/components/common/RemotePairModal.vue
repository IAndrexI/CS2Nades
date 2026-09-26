<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import QRCode from 'qrcode'
import { useCompanionStore } from '../../stores/companionStore'
import { useThemeStore } from '../../stores/themeStore'
import { 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  RotateCcw, 
  Mic, 
  Sparkles, 
  Radio, 
  Wifi, 
  ExternalLink,
  ShieldCheck,
  Gamepad2
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const companionStore = useCompanionStore()
const themeStore = useThemeStore()

const qrDataUrl = ref<string>('')
const copiedLink = ref<boolean>(false)
const copiedCode = ref<boolean>(false)

const companionUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/remote?code=${companionStore.pairingCode}`
})

async function generateQr() {
  if (!companionUrl.value) return
  try {
    qrDataUrl.value = await QRCode.toDataURL(companionUrl.value, {
      width: 280,
      margin: 2,
      color: {
        dark: '#020617',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('Failed to generate pairing QR code', err)
  }
}

watch(() => [props.isOpen, companionStore.pairingCode], () => {
  if (props.isOpen) {
    companionStore.registerDesktop()
    generateQr()
  }
}, { immediate: true })

onMounted(() => {
  if (props.isOpen) {
    companionStore.registerDesktop()
    generateQr()
  }
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(companionUrl.value)
    copiedLink.value = true
    setTimeout(() => (copiedLink.value = false), 2000)
  } catch (e) {}
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(companionStore.pairingCode)
    copiedCode.value = true
    setTimeout(() => (copiedCode.value = false), 2000)
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
        class="relative w-full max-w-lg border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
        :style="{ backgroundColor: themeStore.customModalBgColor }"
      >
        <!-- HEADER -->
        <div class="p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <div 
              class="p-2.5 rounded-2xl border shadow-inner flex items-center justify-center"
              :style="{ backgroundColor: themeStore.customAccentColor + '22', borderColor: themeStore.customAccentColor + '66', color: themeStore.customAccentColor }"
            >
              <Smartphone class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black uppercase text-white tracking-wide">
                  Phone StreamDeck & Voice Remote
                </h2>
                <span 
                  :class="[
                    'px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1',
                    companionStore.isPaired ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  ]"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="companionStore.isPaired ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'"></span>
                  {{ companionStore.isPaired ? 'Phone Connected' : 'Ready to Pair' }}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Scan with your phone to use it as a touch controller & voice assistant for lineups.
              </p>
            </div>
          </div>

          <button 
            @click="emit('close')" 
            class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- BODY -->
        <div class="p-6 flex flex-col items-center gap-6 text-center text-xs">
          
          <!-- QR CODE CONTAINER -->
          <div class="relative p-4 bg-white rounded-3xl shadow-2xl border-4 border-slate-800 group">
            <img 
              v-if="qrDataUrl" 
              :src="qrDataUrl" 
              alt="Scan to pair mobile phone" 
              class="w-56 h-56 object-contain rounded-xl"
            />
            <div v-else class="w-56 h-56 flex items-center justify-center text-slate-800 font-mono font-bold">
              Generating QR Code...
            </div>

            <div 
              v-if="companionStore.isPaired" 
              class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 text-white animate-fade-in p-4"
            >
              <div class="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                <Wifi class="w-6 h-6 animate-pulse" />
              </div>
              <span class="font-black text-sm text-white">📱 Phone Paired & Live!</span>
              <span class="text-xs text-slate-300">Tap buttons or speak into your phone to control this screen in real-time.</span>
            </div>
          </div>

          <!-- PAIRING CODE & MANUAL LINK -->
          <div class="w-full flex flex-col gap-3">
            <div class="flex items-center justify-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
              <span class="text-slate-400 font-medium text-xs">Deck Pairing Code:</span>
              <span class="text-xl font-mono font-black text-amber-400 tracking-widest">{{ companionStore.pairingCode }}</span>
              
              <button
                @click="companionStore.regenerateCode(); generateQr()"
                class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Regenerate Pairing Code"
              >
                <RotateCcw class="w-4 h-4" />
              </button>
            </div>

            <div class="flex items-center gap-2">
              <input
                type="text"
                readonly
                :value="companionUrl"
                class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all truncate"
              />
              <button
                @click="copyUrl"
                class="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Check v-if="copiedLink" class="w-3.5 h-3.5 text-emerald-400" />
                <Copy v-else class="w-3.5 h-3.5" />
                <span>{{ copiedLink ? 'Copied!' : 'Copy Link' }}</span>
              </button>
            </div>
          </div>

          <!-- FEATURES & VOICE GUIDE -->
          <div class="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5">
              <div class="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <Gamepad2 class="w-4 h-4" />
              </div>
              <div>
                <span class="font-bold text-white block text-xs">Touch Controller</span>
                <span class="text-[11px] text-slate-400 leading-tight">Switch maps, filter utility, and click lineups instantly from your phone while in-game.</span>
              </div>
            </div>

            <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5">
              <div class="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                <Mic class="w-4 h-4" />
              </div>
              <div>
                <span class="font-bold text-white block text-xs">Voice Commands</span>
                <span class="text-[11px] text-slate-400 leading-tight">Speak: <em>"Mirage window smoke"</em> or <em>"Inferno B flashes"</em> to instantly display on desktop.</span>
              </div>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <span class="text-slate-400 text-xs flex items-center gap-1.5">
            <ShieldCheck class="w-4 h-4 text-emerald-400" />
            <span>Encrypted local WebSockets link</span>
          </span>
          <button
            @click="emit('close')"
            class="px-5 py-2 font-black rounded-xl text-xs transition-all shadow cursor-pointer hover:opacity-90"
            :style="{ backgroundColor: themeStore.customAccentColor, color: '#020617' }"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
