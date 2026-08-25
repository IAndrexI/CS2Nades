import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import type { Lineup } from '../types'

export interface RoomMember {
  socketId: string
  username: string
  avatar?: string
  inGameRole?: string
  isAutoAllowed?: boolean
  isHost?: boolean
}

export interface ChatMessage {
  username: string
  avatar?: string
  inGameRole?: string
  text: string
  time: string
}

export interface SquadGroup {
  id: string
  name: string
  description?: string
  memberUsernames: string[]
  createdAt?: string
}

export interface DrawingStroke {
  id: string
  tool: 'pen' | 'arrow' | 'line'
  color: string
  width: number
  points: Array<{ x: number; y: number }>
}

export const useGameRoomStore = defineStore('gameRoom', () => {
  const socket = ref<any>(null)
  const isConnected = ref<boolean>(false)
  const currentRoomCode = ref<string | null>(null)
  const hostUsername = ref<string | null>(null)
  const currentMapId = ref<string>('mirage')
  const members = ref<RoomMember[]>([])
  const liveDrawings = ref<DrawingStroke[]>([])
  const activeBroadcastLineups = ref<Lineup[]>([])
  const chatMessages = ref<ChatMessage[]>([])
  const announcements = ref<Array<{ text: string; time: string }>>([])
  
  // Squad Groups State (Auto-Allow)
  const squadGroups = ref<SquadGroup[]>([])
  const selectedGroupId = ref<string | null>(null)

  const isHost = computed(() => {
    return hostUsername.value !== null && members.value.some(m => m.isHost && m.username === hostUsername.value)
  })

  const allowGuestsToDraw = ref<boolean>(true)

  function getSocket(): Socket {
    if (!socket.value) {
      socket.value = io({
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5
      })

      socket.value.on('connect', () => {
        isConnected.value = true
      })

      socket.value.on('disconnect', () => {
        isConnected.value = false
      })

      socket.value.on('room:state', (state: any) => {
        currentRoomCode.value = state.roomCode
        hostUsername.value = state.host
        currentMapId.value = state.mapId
        members.value = state.members
        liveDrawings.value = state.drawings || []
        activeBroadcastLineups.value = state.activeLineups || []
        if (state.allowGuestsToDraw !== undefined) allowGuestsToDraw.value = state.allowGuestsToDraw
      })

      socket.value.on('room:lock_updated', (data: { allowGuestsToDraw: boolean }) => {
        allowGuestsToDraw.value = data.allowGuestsToDraw
        announcements.value.push({
          text: data.allowGuestsToDraw ? '🔓 Host unlocked tactical drawing for all guests' : '🔒 Host locked tactical drawing (Read-Only Mode)',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      })

      socket.value.on('room:members', (updatedMembers: RoomMember[]) => {
        members.value = updatedMembers
      })

      socket.value.on('room:stroke', (stroke: DrawingStroke) => {
        liveDrawings.value.push(stroke)
      })

      socket.value.on('room:drawings_cleared', () => {
        liveDrawings.value = []
      })

      socket.value.on('room:lineup_broadcast', (data: { lineup: Lineup; pushedBy: string; time: string }) => {
        activeBroadcastLineups.value.push(data.lineup)
        announcements.value.push({
          text: `[TACTICAL EXECUTE] ${data.pushedBy} broadcasted "${data.lineup.title}" to the live radar!`,
          time: data.time
        })
      })

      socket.value.on('room:map_changed', (mapId: string) => {
        currentMapId.value = mapId
        liveDrawings.value = []
        announcements.value.push({
          text: `Map changed to ${mapId.toUpperCase()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      })

      socket.value.on('room:chat_message', (msg: ChatMessage) => {
        chatMessages.value.push(msg)
      })

      socket.value.on('room:announcement', (ann: { text: string; time: string }) => {
        announcements.value.push(ann)
      })
    }
    return socket.value
  }

  function joinRoom(roomCode: string, user: any, groupId?: string) {
    const s = getSocket()
    if (!s.connected) s.connect()
    selectedGroupId.value = groupId || null
    s.emit('room:join', { roomCode: roomCode.trim().toUpperCase(), user, groupId })
    currentRoomCode.value = roomCode.trim().toUpperCase()
  }

  function leaveRoom() {
    if (socket.value && socket.value.connected) {
      socket.value.disconnect()
    }
    currentRoomCode.value = null
    members.value = []
    liveDrawings.value = []
    activeBroadcastLineups.value = []
    chatMessages.value = []
  }

  function sendStroke(stroke: DrawingStroke) {
    liveDrawings.value.push(stroke)
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:draw', stroke)
    }
  }

  function clearDrawings() {
    liveDrawings.value = []
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:clear_drawings')
    }
  }

  function pushLineup(lineup: Lineup) {
    activeBroadcastLineups.value.push(lineup)
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:push_lineup', lineup)
    }
  }

  function switchMap(mapId: string) {
    currentMapId.value = mapId
    liveDrawings.value = []
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:switch_map', mapId)
    }
  }

  function sendChatMessage(text: string) {
    if (!text.trim()) return
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:chat', text.trim())
    }
  }

  async function fetchGroups() {
    try {
      const res = await axios.get('/api/groups')
      squadGroups.value = res.data
    } catch (e) {
      // Fallback
      squadGroups.value = [
        {
          id: 'grp-main-squad',
          name: 'Main Roster (Auto-Allow)',
          description: 'Default competitive 5-stack squad with instant room access',
          memberUsernames: ['admin']
        }
      ]
    }
  }

  async function createGroup(name: string, description: string, memberUsernames: string[]) {
    try {
      const res = await axios.post('/api/groups', { name, description, memberUsernames })
      squadGroups.value.push(res.data)
      return res.data
    } catch (e) {
      console.error('Error creating squad group:', e)
    }
  }

  function setRoomLock(allowGuests: boolean) {
    allowGuestsToDraw.value = allowGuests
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:set_lock', { allowGuestsToDraw: allowGuests })
    }
  }

  return {
    socket,
    isConnected,
    currentRoomCode,
    hostUsername,
    isHost,
    allowGuestsToDraw,
    currentMapId,
    members,
    liveDrawings,
    activeBroadcastLineups,
    chatMessages,
    announcements,
    squadGroups,
    selectedGroupId,
    joinRoom,
    leaveRoom,
    sendStroke,
    clearDrawings,
    pushLineup,
    switchMap,
    sendChatMessage,
    setRoomLock,
    fetchGroups,
    createGroup
  }
})
