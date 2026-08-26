<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameRoomStore } from '../stores/gameRoomStore'
import { useAuthStore } from '../stores/authStore'
import { useMapStore } from '../stores/mapStore'
import { useLineupStore } from '../stores/lineupStore'
import VectorMapBlueprint from '../components/map/VectorMapBlueprint.vue'
import NadeIcon from '../components/common/NadeIcon.vue'
import LineupModal from '../components/lineups/LineupModal.vue'
import type { Lineup } from '../types'
import { 
  Users, 
  Radio, 
  Share2, 
  Copy, 
  Check, 
  Send, 
  PenTool, 
  Trash2, 
  Layers, 
  LogOut, 
  ShieldCheck, 
  MessageSquare,
  Sparkles,
  MapPin,
  Volume2,
  ExternalLink
} from 'lucide-vue-next'

const gameRoomStore = useGameRoomStore()
const authStore = useAuthStore()
const mapStore = useMapStore()
const lineupStore = useLineupStore()

const joinRoomCode = ref('')
const selectedGroup = ref<string>('')
const chatInput = ref('')
const copied = ref(false)

// Drawing State
const activeColor = ref('#de9b35')
const activeWidth = ref(3)
const isDrawing = ref(false)
const currentStrokePoints = ref<Array<{ x: number; y: number }>>([])
const svgBoard = ref<SVGSVGElement | null>(null)

// Drawing colors
const palette = ['#de9b35', '#ef4444', '#22c55e', '#38bdf8', '#a855f7', '#ffffff']

onMounted(async () => {
  await gameRoomStore.fetchGroups()
  // Check URL params for room invite code
  const urlParams = new URLSearchParams(window.location.search)
  const roomParam = urlParams.get('room')
  if (roomParam) {
    joinRoomCode.value = roomParam.toUpperCase()
  }
})

function handleCreateOrJoin() {
  const code = joinRoomCode.value.trim() || `PIC-${Math.floor(1000 + Math.random() * 9000)}`
  const user = authStore.currentUser || {
    username: `Player_${Math.floor(1000 + Math.random() * 9000)}`,
    inGameRole: 'Entry',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`
  }

  gameRoomStore.joinRoom(code, user, selectedGroup.value || undefined)
}

function handleCopyRoomLink() {
  const url = `${window.location.origin}/game-room?room=${gameRoomStore.currentRoomCode}`
  navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2500)
}

function handleSendChat() {
  if (!chatInput.value.trim()) return
  gameRoomStore.sendChatMessage(chatInput.value.trim())
  chatInput.value = ''
}

// Live Tactics Board Mouse Events
function getSvgCoords(e: MouseEvent) {
  if (!svgBoard.value) return null
  const pt = svgBoard.value.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = svgBoard.value.getScreenCTM()
  if (!ctm) return null
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: Math.round(transformed.x), y: Math.round(transformed.y) }
}

function startDrawing(e: MouseEvent) {
  const pt = getSvgCoords(e)
  if (!pt) return
  isDrawing.value = true
  currentStrokePoints.value = [pt]
}

function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  const pt = getSvgCoords(e)
  if (!pt) return
  currentStrokePoints.value.push(pt)
}

function endDrawing() {
  if (!isDrawing.value || currentStrokePoints.value.length < 2) {
    isDrawing.value = false
    currentStrokePoints.value = []
    return
  }

  const stroke = {
    id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    tool: 'pen' as const,
    color: activeColor.value,
    width: activeWidth.value,
    points: [...currentStrokePoints.value]
  }

  gameRoomStore.sendStroke(stroke)
  isDrawing.value = false
  currentStrokePoints.value = []
}

function getPointsPath(points: Array<{ x: number; y: number }>) {
  if (!points || points.length === 0) return ''
  return points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
  }, '')
}

function getTrajectoryPath(origin: { x: number; y: number }, landing: { x: number; y: number }) {
  const ox = origin.x * 10
  const oy = origin.y * 10
  const lx = landing.x * 10
  const ly = landing.y * 10
  const mx = (ox + lx) / 2
  const my = (oy + ly) / 2
  const dx = lx - ox
  const dy = ly - oy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const archHeight = Math.min(Math.max(dist * 0.25, 20), 80)
  const perpX = -dy / (dist || 1)
  const perpY = dx / (dist || 1)
  const cx = mx + perpX * archHeight
  const cy = my + perpY * archHeight
  return `M ${ox} ${oy} Q ${cx} ${cy} ${lx} ${ly}`
}

function handleBroadcastLineup(lineup: Lineup) {
  gameRoomStore.pushLineup(lineup)
}

const activeMap = computed(() => {
  return mapStore.availableMaps.find(m => m.id === gameRoomStore.currentMapId) || mapStore.availableMaps[0]
})

const availableLineupsForMap = computed(() => {
  return lineupStore.allLineups.filter(l => l.mapId === gameRoomStore.currentMapId)
})
</script>

<template>
  <div class="game-room-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 animate-fade-in">
    <!-- 1. LOBBY SCREEN (WHEN NOT IN ROOM) -->
    <div 
      v-if="!gameRoomStore.currentRoomCode"
      class="max-w-xl mx-auto w-full p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col gap-6 text-center"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="p-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl text-slate-950 shadow-xl shadow-amber-500/20">
          <Radio class="w-8 h-8 stroke-[2.5] animate-pulse" />
        </div>
        <h1 class="text-2xl font-black uppercase text-white tracking-wide">Live Tactical Game Room</h1>
        <p class="text-xs text-slate-400 max-w-md">
          Collaborate live with your 5-stack squad. Synchronize map calls, share live animated utility executes, and draw real-time tactics simultaneously.
        </p>
      </div>

      <div class="flex flex-col gap-4 text-left text-xs">
        <!-- ROOM CODE INPUT -->
        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300">Room Code</label>
          <input 
            v-model="joinRoomCode"
            type="text" 
            placeholder="e.g. SQUAD-ALPHA or MIRAGE-5"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono font-bold text-sm tracking-wider uppercase focus:outline-none focus:border-amber-500"
          />
        </div>

        <!-- AUTO-ALLOW SQUAD GROUP SELECTOR -->
        <div class="flex flex-col gap-1.5">
          <label class="font-bold text-slate-300 flex items-center justify-between">
            <span>Squad Group (Auto-Allow Access)</span>
            <span class="text-[10px] text-amber-400 font-normal">Optional</span>
          </label>
          <select 
            v-model="selectedGroup"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">Public Room (Join by Code / Login)</option>
            <option v-for="grp in gameRoomStore.squadGroups" :key="grp.id" :value="grp.id">
              🛡️ {{ grp.name }} (Auto-allows members: {{ grp.memberUsernames.join(', ') }})
            </option>
          </select>
        </div>

        <!-- ENTER BUTTON -->
        <button
          @click="handleCreateOrJoin"
          class="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
        >
          <Sparkles class="w-4 h-4 stroke-[3]" />
          <span>Enter Live Tactical Room</span>
        </button>
      </div>
    </div>

    <!-- 2. ACTIVE LIVE GAME ROOM HUD -->
    <template v-else>
      <!-- ROOM HEADER BAR -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
        <!-- ROOM IDENTITY -->
        <div class="flex items-center gap-4">
          <div class="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-2">
            <Radio class="w-4 h-4 animate-ping" />
            <span class="font-mono font-black text-xs">LIVE</span>
          </div>

          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400 font-bold uppercase">Room Code:</span>
              <span class="text-base font-black font-mono text-amber-400 tracking-wider bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                {{ gameRoomStore.currentRoomCode }}
              </span>
              <button
                @click="handleCopyRoomLink"
                class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                title="Copy Invite Link"
              >
                <Check v-if="copied" class="w-3.5 h-3.5 text-emerald-400" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- MAP SELECTOR (HOST / SQUAD CONTROL) -->
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-400 font-bold hidden sm:inline">Active Map:</span>
          <select 
            :value="gameRoomStore.currentMapId"
            @change="gameRoomStore.switchMap(($event.target as HTMLSelectElement).value)"
            class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 font-bold text-xs focus:outline-none focus:border-amber-500 cursor-pointer uppercase font-mono"
          >
            <option v-for="map in mapStore.availableMaps" :key="map.id" :value="map.id">
              {{ map.name }}
            </option>
          </select>

          <!-- LEAVE ROOM BUTTON -->
          <button
            @click="gameRoomStore.leaveRoom()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      <!-- MAIN GRID: RADAR + TACTICS BOARD (LEFT) | ROSTER & CHAT (RIGHT) -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- LEFT 3 COLS: RADAR TACTICS BOARD -->
        <div class="lg:col-span-3 flex flex-col gap-4">
          <!-- DRAWING TOOLS BAR -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <!-- COLORS -->
            <div class="flex items-center gap-2">
              <span class="text-slate-400 font-bold text-[11px]">Color:</span>
              <div class="flex items-center gap-1.5">
                <button
                  v-for="c in palette"
                  :key="c"
                  @click="activeColor = c"
                  :class="[
                    'w-5 h-5 rounded-full border transition-transform cursor-pointer',
                    activeColor === c ? 'scale-125 border-white shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  ]"
                  :style="{ backgroundColor: c }"
                />
              </div>
            </div>

            <!-- WIDTH -->
            <div class="flex items-center gap-2">
              <span class="text-slate-400 font-bold text-[11px]">Brush:</span>
              <button 
                @click="activeWidth = 2" 
                :class="['px-2 py-0.5 rounded text-[10px] font-mono', activeWidth === 2 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400']"
              >
                Fine
              </button>
              <button 
                @click="activeWidth = 4" 
                :class="['px-2 py-0.5 rounded text-[10px] font-mono', activeWidth === 4 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400']"
              >
                Medium
              </button>
              <button 
                @click="activeWidth = 7" 
                :class="['px-2 py-0.5 rounded text-[10px] font-mono', activeWidth === 7 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400']"
              >
                Thick
              </button>
            </div>

            <!-- CLEAR ALL -->
            <button
              @click="gameRoomStore.clearDrawings()"
              class="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 rounded-lg transition-colors cursor-pointer text-xs"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Clear Drawings</span>
            </button>
          </div>

          <!-- RADAR CANVAS WITH LIVE DRAWING LAYER & UTILITY TRAJECTORIES -->
          <div class="relative w-full h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            <svg
              ref="svgBoard"
              viewBox="0 0 1000 1000"
              class="w-full h-full max-w-[960px] max-h-[960px] cursor-crosshair select-none"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="endDrawing"
              @mouseleave="endDrawing"
            >
              <!-- LAYER 1: BASE MAP -->
              <VectorMapBlueprint 
                :map-info="activeMap" 
                :show-callouts="true" 
              />

              <!-- LAYER 2: BROADCASTED LINEUP TRAJECTORIES -->
              <g class="broadcast-lineups-layer">
                <g 
                  v-for="(lineup, idx) in gameRoomStore.activeBroadcastLineups"
                  :key="`bcast-${lineup.id}-${idx}`"
                >
                  <!-- Outer Trajectory Glow -->
                  <path 
                    :d="getTrajectoryPath(lineup.originCoords, lineup.landingCoords)"
                    fill="none" 
                    stroke="#de9b35"
                    stroke-width="5"
                    stroke-opacity="0.4"
                  />
                  <!-- Inner Animated Dashed Line -->
                  <path 
                    :d="getTrajectoryPath(lineup.originCoords, lineup.landingCoords)"
                    fill="none" 
                    stroke="#de9b35"
                    stroke-width="2.5"
                    stroke-dasharray="8 6"
                    class="animate-trajectory"
                  />
                  <!-- Origin Point -->
                  <circle :cx="lineup.originCoords.x * 10" :cy="lineup.originCoords.y * 10" r="10" fill="#f97316" stroke="#0f172a" stroke-width="2" />
                  <!-- Landing Burst -->
                  <circle :cx="lineup.landingCoords.x * 10" :cy="lineup.landingCoords.y * 10" r="18" fill="#ef4444" fill-opacity="0.35" stroke="#ef4444" stroke-width="2" class="animate-pulse" />
                  <circle :cx="lineup.landingCoords.x * 10" :cy="lineup.landingCoords.y * 10" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
                </g>
              </g>

              <!-- LAYER 3: LIVE TACTICS DRAWINGS (SYNCED) -->
              <g class="drawings-layer">
                <path
                  v-for="stroke in gameRoomStore.liveDrawings"
                  :key="stroke.id"
                  :d="getPointsPath(stroke.points)"
                  fill="none"
                  :stroke="stroke.color"
                  :stroke-width="stroke.width"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <!-- CURRENT ACTIVE LOCAL STROKE -->
                <path
                  v-if="isDrawing && currentStrokePoints.length > 1"
                  :d="getPointsPath(currentStrokePoints)"
                  fill="none"
                  :stroke="activeColor"
                  :stroke-width="activeWidth"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
          </div>

          <!-- QUICK BROADCAST LINEUPS DRAWER -->
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wider text-white">
                Push Utility Execute to Squad
              </span>
              <span class="text-[10px] text-slate-400 font-mono">{{ availableLineupsForMap.length }} indexed lineups</span>
            </div>

            <div class="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                v-for="l in availableLineupsForMap.slice(0, 10)"
                :key="l.id"
                @click="handleBroadcastLineup(l)"
                class="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 rounded-xl text-xs transition-all cursor-pointer group text-left"
              >
                <NadeIcon :type="l.grenadeType" :size="16" />
                <div class="flex flex-col">
                  <span class="font-bold text-white group-hover:text-amber-400 truncate max-w-[140px]">{{ l.title }}</span>
                  <span class="text-[10px] text-slate-500">{{ l.startLocation }} → {{ l.endLocation }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT 1 COL: SQUAD ROSTER & LIVE CHAT -->
        <div class="flex flex-col gap-4">
          <!-- SQUAD MEMBERS ROSTER -->
          <div class="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-xl">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Users class="w-3.5 h-3.5 text-amber-400" />
                <span>Squad Members ({{ gameRoomStore.members.length }})</span>
              </span>
            </div>

            <div class="flex flex-col gap-2 max-h-48 overflow-y-auto">
              <div 
                v-for="member in gameRoomStore.members" 
                :key="member.socketId"
                class="flex items-center justify-between p-2 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs"
              >
                <div class="flex items-center gap-2.5">
                  <img :src="member.avatar" class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800" />
                  <div class="flex flex-col">
                    <span class="font-bold text-white flex items-center gap-1">
                      {{ member.username }}
                      <span v-if="member.isHost" class="text-[9px] text-amber-400 font-mono">👑</span>
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">{{ member.inGameRole || 'Entry' }}</span>
                  </div>
                </div>

                <span 
                  v-if="member.isAutoAllowed" 
                  class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold font-mono"
                  title="Auto-Allowed Squad Member"
                >
                  AUTO
                </span>
              </div>
            </div>
          </div>

          <!-- SQUAD LIVE CHAT -->
          <div class="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-xl flex-grow h-[420px]">
            <span class="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <MessageSquare class="w-3.5 h-3.5 text-amber-400" />
              <span>Squad Comm Channel</span>
            </span>

            <!-- MESSAGES FEED -->
            <div class="flex-grow overflow-y-auto flex flex-col gap-2 p-1 text-xs">
              <!-- ANNOUNCEMENTS -->
              <div 
                v-for="(ann, idx) in gameRoomStore.announcements" 
                :key="`ann-${idx}`"
                class="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-[11px] font-medium"
              >
                {{ ann.text }}
              </div>

              <!-- CHAT -->
              <div 
                v-for="(msg, idx) in gameRoomStore.chatMessages" 
                :key="`chat-${idx}`"
                class="flex flex-col gap-0.5 p-2 bg-slate-950/70 border border-slate-800 rounded-xl"
              >
                <div class="flex items-center justify-between text-[10px]">
                  <span class="font-bold text-amber-400">{{ msg.username }} ({{ msg.inGameRole }})</span>
                  <span class="text-slate-500">{{ msg.time }}</span>
                </div>
                <span class="text-slate-200 text-[11px]">{{ msg.text }}</span>
              </div>
            </div>

            <!-- CHAT INPUT -->
            <form @submit.prevent="handleSendChat" class="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input 
                v-model="chatInput" 
                type="text" 
                placeholder="Callout or tactic note..."
                class="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
              />
              <button 
                type="submit"
                class="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors cursor-pointer"
              >
                <Send class="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </template>

    <LineupModal />
  </div>
</template>
