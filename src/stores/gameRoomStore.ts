import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import type { Lineup } from '../types'
import { useMapStore } from './mapStore'
import { useStratStore } from './stratStore'

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

  const currentUsername = ref<string>('')

  const isHost = computed(() => {
    if (!hostUsername.value) return false
    const username = currentUsername.value || (localStorage.getItem('cs2_stratbook_user') ? JSON.parse(localStorage.getItem('cs2_stratbook_user') || '{}')?.username : '')
    if (!username) return false
    return hostUsername.value.toLowerCase() === username.toLowerCase()
  })

  const allowSignedUsersToDraw = ref<boolean>(true)
  const allowGuestsToDraw = ref<boolean>(false)
  const onlyHostCanChangeMap = ref<boolean>(true)

  function updateRoomPermissions(signedUsers: boolean, guests: boolean, onlyHostMap = true) {
    allowSignedUsersToDraw.value = signedUsers
    allowGuestsToDraw.value = guests
    onlyHostCanChangeMap.value = onlyHostMap
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:update_permissions', {
        allowSignedUsersToDraw: signedUsers,
        allowGuestsToDraw: guests,
        onlyHostCanChangeMap: onlyHostMap
      })
    }
  }

  function getSocket(): Socket {
    if (!socket.value) {
      socket.value = io({
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      })

      socket.value.on('connect', () => {
        isConnected.value = true
        if (currentRoomCode.value) {
          const u = localStorage.getItem('cs2_stratbook_user') ? JSON.parse(localStorage.getItem('cs2_stratbook_user') || '{}') : null
          socket.value.emit('room:join', { roomCode: currentRoomCode.value, user: u })
        }
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
        if (state.allowSignedUsersToDraw !== undefined) allowSignedUsersToDraw.value = state.allowSignedUsersToDraw
        if (state.allowGuestsToDraw !== undefined) allowGuestsToDraw.value = state.allowGuestsToDraw
        if (state.onlyHostCanChangeMap !== undefined) onlyHostCanChangeMap.value = state.onlyHostCanChangeMap
      })

      socket.value.on('room:host_updated', (data: { host: string; members: RoomMember[] }) => {
        hostUsername.value = data.host
        members.value = data.members
      })

      socket.value.on('room:permissions_updated', (data: { allowSignedUsersToDraw: boolean; allowGuestsToDraw: boolean; onlyHostCanChangeMap?: boolean }) => {
        if (data.allowSignedUsersToDraw !== undefined) allowSignedUsersToDraw.value = data.allowSignedUsersToDraw
        if (data.allowGuestsToDraw !== undefined) allowGuestsToDraw.value = data.allowGuestsToDraw
        if (data.onlyHostCanChangeMap !== undefined) onlyHostCanChangeMap.value = data.onlyHostCanChangeMap
        announcements.value.push({
          text: `🔒 Host updated permissions: Signed Users (${data.allowSignedUsersToDraw ? 'Allowed' : 'Locked'}), Guests (${data.allowGuestsToDraw ? 'Allowed' : 'Locked'}), Map Switch (${data.onlyHostCanChangeMap !== false ? 'Host Only' : 'Everyone'})`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      })

      socket.value.on('room:action_denied', (data: { message: string }) => {
        announcements.value.push({
          text: `⚠️ ${data.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
        alert(data.message)
      })

      socket.value.on('room:lock_updated', (data: { allowGuestsToDraw: boolean }) => {
        allowGuestsToDraw.value = data.allowGuestsToDraw
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

      socket.value.on('room:map_changed', (data: any) => {
        const mapId = typeof data === 'string' ? data : data.mapId
        currentMapId.value = mapId
        liveDrawings.value = []
        announcements.value.push({
          text: `Tactical map changed to ${mapId.toUpperCase()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })

        // CRITICAL: Synchronize mapStore and stratStore across all clients
        try {
          const mapStore = useMapStore()
          const stratStore = useStratStore()
          if (mapStore.currentMapId !== mapId) {
            mapStore.setMap(mapId)
          }
          if (data.elements && Array.isArray(data.elements)) {
            stratStore.boardElements = data.elements
            stratStore.mapElements[mapId] = data.elements
          } else {
            stratStore.loadMapElements(mapId)
          }
        } catch (err) {
          console.error('Error synchronizing map in gameRoomStore', err)
        }
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

  const isGhostMode = ref<boolean>(false)

  function toggleGhostMode() {
    isGhostMode.value = !isGhostMode.value
  }

  function joinRoom(roomCode: string, user: any, groupId?: string, isGhost?: boolean) {
    const s = getSocket()
    if (!s.connected) s.connect()
    selectedGroupId.value = groupId || null
    currentUsername.value = user?.username || ''
    const ghost = isGhost !== undefined ? isGhost : isGhostMode.value
    s.emit('room:join', { roomCode: roomCode.trim().toUpperCase(), user, groupId, isGhost: ghost })
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

  function switchMap(mapId: string, elements?: any[]) {
    currentMapId.value = mapId
    liveDrawings.value = []
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:switch_map', { mapId, elements })
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

  function transferHost(newHostUsername: string) {
    if (socket.value && socket.value.connected) {
      socket.value.emit('room:transfer_host', { newHostUsername })
    }
  }

  return {
    socket,
    getSocket,
    isConnected,
    currentRoomCode,
    hostUsername,
    isHost,
    allowSignedUsersToDraw,
    allowGuestsToDraw,
    onlyHostCanChangeMap,
    updateRoomPermissions,
    currentMapId,
    members,
    liveDrawings,
    activeBroadcastLineups,
    chatMessages,
    announcements,
    squadGroups,
    selectedGroupId,
    isGhostMode,
    toggleGhostMode,
    joinRoom,
    leaveRoom,
    sendStroke,
    clearDrawings,
    pushLineup,
    switchMap,
    sendChatMessage,
    setRoomLock,
    transferHost,
    fetchGroups,
    createGroup
  }
})
