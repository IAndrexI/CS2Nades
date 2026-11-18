<script setup lang="ts">
import { ref } from 'vue'
import { useVoiceStore } from '../../stores/voiceStore'
import { useLineupStore } from '../../stores/lineupStore'
import {
  CheckCircle2,
  Headphones,
  Mic,
  MicOff,
  Play,
  Radio,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X
} from 'lucide-vue-next'

const voiceStore = useVoiceStore()
const lineupStore = useLineupStore()
const manualInput = ref('')

const quickCommands = [
  'Mirage Window Smoke',
  'Mirage Ticket Smoke',
  'Mirage Stairs Smoke',
  'Execute Mirage A',
  'Inferno Coffins Smoke',
  'Dust 2 Xbox Smoke',
  'Nuke Outside Smoke',
  'Ancient Donut Smoke',
  'Next step',
  'Show video',
  'Copy command',
  'Reset filters'
]

function submitManualCommand() {
  if (!manualInput.value.trim()) return
  voiceStore.processVoiceCommand(manualInput.value.trim())
  manualInput.value = ''
}

function runChip(cmd: string) {
  voiceStore.liveTranscript = cmd
  voiceStore.processVoiceCommand(cmd)
}
</script>

<template>
  <!-- Floating Hands-Free Voice Mic Pill (Always Accessible on Mobile & Desktop) -->
  <div class="fixed bottom-5 left-4 z-[9990] flex items-center gap-2">
    <button
      @click="voiceStore.isPanelOpen = !voiceStore.isPanelOpen"
      :class="[
        'flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs shadow-2xl border transition-all cursor-pointer backdrop-blur-xl',
        voiceStore.isListening
          ? 'bg-rose-600/95 text-white border-rose-400 shadow-rose-500/30 animate-pulse'
          : 'bg-slate-900/95 hover:bg-slate-800 text-slate-100 border-amber-500/40 shadow-black/60'
      ]"
      title="Open Voice Navigation & Hands-Free Control"
    >
      <Mic v-if="!voiceStore.isListening" class="w-4 h-4 text-amber-400" />
      <Radio v-else class="w-4 h-4 text-white animate-spin" />
      <span>
        {{
          voiceStore.handsFreeMode
            ? 'Hands-Free Mic ON'
            : voiceStore.isListening
              ? 'Listening...'
              : 'Voice Nav'
        }}
      </span>
    </button>

    <!-- Quick 1-Tap Mic Trigger -->
    <button
      v-if="!voiceStore.isPanelOpen"
      @click="voiceStore.startListening(false)"
      :class="[
        'p-2.5 rounded-2xl border shadow-xl transition-all cursor-pointer backdrop-blur-xl',
        voiceStore.isListening
          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
          : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-amber-400'
      ]"
      title="Tap to Speak a Command Immediately"
    >
      <Mic class="w-4 h-4" />
    </button>
  </div>

  <!-- Voice Navigation Command Center Modal / Drawer -->
  <div
    v-if="voiceStore.isPanelOpen"
    class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
    @click.self="voiceStore.isPanelOpen = false"
  >
    <div
      class="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-4 bg-slate-950/90 border-b border-slate-800"
      >
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Mic class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider">
              CS2 Voice Navigation & Hands-Free Control
            </h3>
            <p class="text-[11px] text-slate-400">
              Speak map names, grenade types, callouts, team executes, or step commands
            </p>
          </div>
        </div>
        <button
          @click="voiceStore.isPanelOpen = false"
          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-4 overflow-y-auto">
        <!-- Main Mic & Hands-Free Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            @click="voiceStore.startListening(false)"
            :class="[
              'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs border transition-all cursor-pointer',
              voiceStore.isListening && !voiceStore.handsFreeMode
                ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/15'
            ]"
          >
            <Mic v-if="!voiceStore.isListening" class="w-4 h-4" />
            <MicOff v-else class="w-4 h-4" />
            <span>
              {{ voiceStore.isListening ? 'Stop Listening' : 'Push to Speak Command' }}
            </span>
          </button>

          <button
            @click="voiceStore.toggleHandsFreeMode()"
            :class="[
              'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs border transition-all cursor-pointer',
              voiceStore.handsFreeMode
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-700'
            ]"
          >
            <Headphones class="w-4 h-4" />
            <span>
              {{
                voiceStore.handsFreeMode
                  ? 'Hands-Free Continuous: ON'
                  : 'Enable Mobile Hands-Free Mode'
              }}
            </span>
          </button>
        </div>

        <!-- Live Transcript & Last Action Status Box -->
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Live Voice / Command Status
            </span>
            <button
              @click="voiceStore.audioFeedback = !voiceStore.audioFeedback"
              :class="[
                'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer',
                voiceStore.audioFeedback
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              ]"
            >
              <Volume2 v-if="voiceStore.audioFeedback" class="w-3 h-3" />
              <VolumeX v-else class="w-3 h-3" />
              <span>TTS Audio: {{ voiceStore.audioFeedback ? 'ON' : 'OFF' }}</span>
            </button>
          </div>

          <div v-if="voiceStore.liveTranscript" class="text-xs font-mono text-amber-300">
            "{{ voiceStore.liveTranscript }}"
          </div>
          <div class="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 class="w-3.5 h-3.5 shrink-0" />
            <span>{{ voiceStore.lastActionSummary }}</span>
          </div>
          <div v-if="voiceStore.errorMessage" class="text-[11px] text-rose-400">
            {{ voiceStore.errorMessage }}
          </div>
        </div>

        <!-- Text / Keyword Fallback Input (Works in any browser or silent environment) -->
        <form @submit.prevent="submitManualCommand" class="flex items-center gap-2">
          <input
            v-model="manualInput"
            type="text"
            placeholder="Or type a voice command (e.g. 'Mirage window smoke', 'Execute Inferno B', 'Next step')..."
            class="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send class="w-3.5 h-3.5" />
            <span>Run</span>
          </button>
        </form>

        <!-- 1-Tap Voice Command Presets -->
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Instant Voice Command Examples (Click or Speak)
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="cmd in quickCommands"
              :key="cmd"
              @click="runChip(cmd)"
              class="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 text-[11px] text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
            >
              "{{ cmd }}"
            </button>
          </div>
        </div>

        <!-- Recent Command Log -->
        <div v-if="voiceStore.history.length > 0" class="space-y-1.5 pt-2 border-t border-slate-800">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recent Voice Actions
          </div>
          <div class="max-h-32 overflow-y-auto space-y-1">
            <div
              v-for="item in voiceStore.history"
              :key="item.id"
              class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/70 text-[11px]"
            >
              <div class="truncate">
                <span class="text-amber-400 font-mono">"{{ item.transcript }}"</span>
                <span class="text-slate-500 mx-1.5">→</span>
                <span class="text-slate-200">{{ item.actionTaken }}</span>
              </div>
              <span class="text-[10px] font-mono text-slate-500 shrink-0">
                {{ item.timestamp }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
