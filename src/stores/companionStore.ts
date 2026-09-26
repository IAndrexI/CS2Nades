import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useMapStore } from './mapStore'
import { useLineupStore } from './lineupStore'
import type { GrenadeType, TeamSide } from '../types'

export interface VoiceFeedback {
  transcript: string
  actionText: string
  timestamp: number
  success: boolean
}

export const useCompanionStore = defineStore('companion', () => {
  const mapStore = useMapStore()
  const lineupStore = useLineupStore()

  // Generate / Persist unique 4-digit or 6-character Deck Code
  const defaultCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const savedCode = localStorage.getItem('cs2_companion_code')
  const pairingCode = ref<string>(savedCode || defaultCode())

  const isPaired = ref<boolean>(false)
  const pairedDeviceName = ref<string>('')
  const isPairModalOpen = ref<boolean>(false)
  const isListeningVoice = ref<boolean>(false)
  const lastVoiceFeedback = ref<VoiceFeedback | null>(null)
  const socket = ref<Socket | null>(null)
  const isPhoneMode = ref<boolean>(false)

  function getSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const port = window.location.port
      if (port === '5173' || port === '3000') {
        return `${window.location.protocol}//${window.location.hostname}:5000`
      }
      return window.location.origin
    }
    return 'http://localhost:5000'
  }

  function initSocket() {
    if (socket.value && socket.value.connected) return

    const serverUrl = getSocketUrl()
    socket.value = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    socket.value.on('connect', () => {
      // If desktop, register code
      if (!isPhoneMode.value && pairingCode.value) {
        socket.value?.emit('remote:register_desktop', { code: pairingCode.value })
      }
    })

    socket.value.on('remote:paired', (data: { code: string; phoneInfo?: { device?: string } }) => {
      if (data.code === pairingCode.value) {
        isPaired.value = true
        pairedDeviceName.value = data.phoneInfo?.device || 'Mobile Phone'
      }
    })

    socket.value.on('remote:command_received', (data: { command: string; payload: any }) => {
      handleRemoteCommand(data.command, data.payload)
    })

    socket.value.on('remote:voice_received', (data: { transcript: string; matchedAction: any }) => {
      lastVoiceFeedback.value = {
        transcript: data.transcript,
        actionText: data.matchedAction?.description || 'Command Executed',
        timestamp: Date.now(),
        success: !!data.matchedAction
      }

      if (data.matchedAction) {
        handleRemoteCommand(data.matchedAction.type, data.matchedAction.payload)
      }

      // Clear voice feedback banner after 4 seconds
      setTimeout(() => {
        if (lastVoiceFeedback.value && Date.now() - lastVoiceFeedback.value.timestamp >= 3800) {
          lastVoiceFeedback.value = null
        }
      }, 4000)
    })
  }

  // Register desktop listener
  function registerDesktop(customCode?: string) {
    if (customCode) {
      pairingCode.value = customCode.toUpperCase().trim()
      localStorage.setItem('cs2_companion_code', pairingCode.value)
    }
    isPhoneMode.value = false
    initSocket()
    if (socket.value?.connected) {
      socket.value.emit('remote:register_desktop', { code: pairingCode.value })
    }
  }

  // Connect as mobile phone
  function connectAsPhone(codeToJoin: string, deviceName = 'Mobile Browser') {
    isPhoneMode.value = true
    pairingCode.value = codeToJoin.toUpperCase().trim()
    localStorage.setItem('cs2_companion_code', pairingCode.value)
    initSocket()
    if (socket.value?.connected) {
      socket.value.emit('remote:pair_phone', { 
        code: pairingCode.value, 
        phoneInfo: { device: deviceName } 
      })
    } else {
      socket.value?.once('connect', () => {
        socket.value?.emit('remote:pair_phone', { 
          code: pairingCode.value, 
          phoneInfo: { device: deviceName } 
        })
      })
    }
  }

  // Send action from phone to desktop
  function sendCommand(command: string, payload?: any) {
    if (!socket.value) initSocket()
    socket.value?.emit('remote:command', {
      code: pairingCode.value,
      command,
      payload
    })
  }

  // Send voice command from phone to desktop
  function sendVoiceCommand(transcript: string, matchedAction: any) {
    if (!socket.value) initSocket()
    socket.value?.emit('remote:voice_command', {
      code: pairingCode.value,
      transcript,
      matchedAction
    })
  }

  // Handle incoming remote command on desktop
  function handleRemoteCommand(command: string, payload: any) {
    switch (command) {
      case 'switch_map':
        if (payload?.mapId) {
          mapStore.currentMapId = payload.mapId
        }
        break

      case 'select_lineup':
        if (payload?.lineupId) {
          const lineup = lineupStore.allLineups.find(l => l.id === payload.lineupId)
          if (lineup) {
            lineupStore.openLineup(lineup)
            if (lineup.mapId && lineup.mapId !== mapStore.currentMapId) {
              mapStore.currentMapId = lineup.mapId
            }
          }
        }
        break

      case 'close_lineup':
        lineupStore.closeLineup()
        break

      case 'filter_nade':
        if (payload?.nadeType) {
          const nade = payload.nadeType as GrenadeType
          if (mapStore.selectedNadeTypes.includes(nade)) {
            if (mapStore.selectedNadeTypes.length > 1) {
              mapStore.selectedNadeTypes = mapStore.selectedNadeTypes.filter(t => t !== nade)
            }
          } else {
            mapStore.selectedNadeTypes.push(nade)
          }
        }
        break

      case 'set_all_nades':
        mapStore.selectedNadeTypes = ['smoke', 'flash', 'molotov', 'he']
        break

      case 'filter_side':
        if (payload?.side) {
          mapStore.selectedSide = payload.side as TeamSide
        }
        break

      case 'quick_search':
        if (payload?.query !== undefined) {
          mapStore.searchQuery = payload.query
        }
        break
    }
  }

  // Regenerate pairing code
  function regenerateCode() {
    pairingCode.value = defaultCode()
    localStorage.setItem('cs2_companion_code', pairingCode.value)
    isPaired.value = false
    if (socket.value && socket.value.connected) {
      socket.value.emit('remote:register_desktop', { code: pairingCode.value })
    }
  }

  return {
    pairingCode,
    isPaired,
    pairedDeviceName,
    isPairModalOpen,
    isListeningVoice,
    lastVoiceFeedback,
    isPhoneMode,
    initSocket,
    registerDesktop,
    connectAsPhone,
    sendCommand,
    sendVoiceCommand,
    regenerateCode
  }
})
