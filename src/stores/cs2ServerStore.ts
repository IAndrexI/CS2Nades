import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useLineupStore } from './lineupStore'
import { useMapStore } from './mapStore'
import type { Lineup, GrenadeType, TeamSide, ThrowType } from '../types'
import { worldToRadarCoords, parseCS2Pos } from '../utils/coordinateMapper'

export interface ServerConnectionConfig {
  host: string
  port: number
  password?: string
  autoSyncGsi: boolean
  lastConnected?: string
}

export interface LivePlayerState {
  x: number
  y: number
  z: number
  pitch: number
  yaw: number
  mapName: string
  playerName?: string
  team?: string
  weapon?: string
  radarCoords?: { x: number; y: number }
  timestamp: number
}

const STORAGE_KEY = 'cs2_server_sync_config'

export const useCs2ServerStore = defineStore('cs2Server', () => {
  const lineupStore = useLineupStore()
  const mapStore = useMapStore()

  // Saved Server Connection Details
  const savedConfig = localStorage.getItem(STORAGE_KEY)
  const defaultConfig: ServerConnectionConfig = savedConfig ? JSON.parse(savedConfig) : {
    host: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
    port: 27015,
    password: '',
    autoSyncGsi: true
  }

  const serverHost = ref<string>(defaultConfig.host)
  const serverPort = ref<number>(defaultConfig.port)
  const rconPassword = ref<string>(defaultConfig.password || '')
  const autoSyncGsi = ref<boolean>(defaultConfig.autoSyncGsi)

  const isTesting = ref<boolean>(false)
  const isCapturing = ref<boolean>(false)
  const isTeleporting = ref<boolean>(false)
  const isConnected = ref<boolean>(false)
  const connectionMessage = ref<string>('')
  const serverMap = ref<string>('de_mirage')
  const serverPlayers = ref<number>(0)
  const lastCaptureTime = ref<number>(0)
  const lastCapturedLineup = ref<Lineup | null>(null)

  // Live GSI position from server
  const livePlayer = ref<LivePlayerState | null>(null)

  function saveConfig() {
    const cfg: ServerConnectionConfig = {
      host: serverHost.value.trim(),
      port: Number(serverPort.value) || 27015,
      password: rconPassword.value,
      autoSyncGsi: autoSyncGsi.value,
      lastConnected: isConnected.value ? new Date().toISOString() : undefined
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  }

  function getApiUrl(path: string): string {
    return path
  }

  /**
   * Test RCON & Server Connectivity
   */
  async function testConnection(): Promise<boolean> {
    isTesting.value = true
    connectionMessage.value = 'Connecting to CS2 Server via RCON...'
    saveConfig()

    try {
      const res = await axios.post(getApiUrl('/api/cs2/server-status'), {
        host: serverHost.value.trim(),
        port: serverPort.value,
        password: rconPassword.value
      })

      if (res.data && res.data.success) {
        isConnected.value = true
        serverMap.value = res.data.mapName || 'de_mirage'
        serverPlayers.value = res.data.playerCount || 1
        connectionMessage.value = `Connected: ${res.data.serverName || 'CS2 Server'} (${res.data.mapName || 'de_mirage'})`
        return true
      } else {
        isConnected.value = false
        connectionMessage.value = res.data.error || 'Could not connect to CS2 server. Check IP & RCON password.'
        return false
      }
    } catch (err: any) {
      isConnected.value = false
      connectionMessage.value = err.response?.data?.error || err.message || 'Connection failed'
      return false
    } finally {
      isTesting.value = false
    }
  }

  /**
   * 1-Click: Auto-Capture current player in-game position & crosshair to create a Lineup
   */
  async function autoCaptureLineup(customTitle?: string): Promise<Lineup | null> {
    isCapturing.value = true
    saveConfig()

    try {
      const res = await axios.post(getApiUrl('/api/cs2/auto-capture'), {
        host: serverHost.value.trim(),
        port: serverPort.value,
        password: rconPassword.value,
        title: customTitle
      })

      if (res.data && res.data.success && res.data.lineup) {
        const captured: Lineup = res.data.lineup
        lineupStore.addLineup(captured)
        lineupStore.openLineup(captured)
        
        if (captured.mapId && captured.mapId !== mapStore.currentMapId) {
          mapStore.currentMapId = captured.mapId
        }

        lastCapturedLineup.value = captured
        lastCaptureTime.value = Date.now()
        isConnected.value = true
        return captured
      } else {
        connectionMessage.value = res.data?.error || 'Failed to capture position from server'
        return null
      }
    } catch (err: any) {
      console.error('Auto capture failed:', err)
      connectionMessage.value = err.response?.data?.error || err.message || 'Auto capture error'
      return null
    } finally {
      isCapturing.value = false
    }
  }

  /**
   * Auto-Upload and Attach In-Game Screenshot to a Lineup
   */
  async function uploadAndAttachScreenshot(
    imageSource: string | File,
    type: 'aim' | 'standing' | 'landing',
    lineupId?: string
  ): Promise<string | null> {
    try {
      let base64Data = ''
      if (imageSource instanceof File) {
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(imageSource)
        })
      } else {
        base64Data = imageSource
      }

      const targetId = lineupId || lastCapturedLineup.value?.id || lineupStore.activeLineup?.id
      if (!targetId) {
        throw new Error('No active lineup selected to attach screenshot')
      }

      const res = await axios.post(getApiUrl('/api/cs2/auto-screenshot'), {
        image: base64Data,
        type,
        lineupId: targetId
      })

      if (res.data && res.data.success && res.data.imageUrl) {
        const publicUrl = res.data.imageUrl
        
        // Update lineup in local store
        const found = lineupStore.customLineups.find(l => l.id === targetId)
        if (found) {
          if (type === 'aim') found.aimScreenshot = publicUrl
          else if (type === 'standing') found.standingScreenshot = publicUrl
          else if (type === 'landing') found.landingScreenshot = publicUrl
          found.imageUrl = found.aimScreenshot || found.standingScreenshot || found.landingScreenshot || publicUrl
          lineupStore.updateLineup(found)
        }

        if (lineupStore.activeLineup && lineupStore.activeLineup.id === targetId) {
          if (type === 'aim') lineupStore.activeLineup.aimScreenshot = publicUrl
          else if (type === 'standing') lineupStore.activeLineup.standingScreenshot = publicUrl
          else if (type === 'landing') lineupStore.activeLineup.landingScreenshot = publicUrl
        }

        return publicUrl
      }
      return null
    } catch (err: any) {
      console.error('Failed to attach screenshot:', err)
      return null
    }
  }

  /**
   * Teleport player in-game on the CS2 server to lineup coords
   */
  async function teleportToServer(lineup: Lineup): Promise<boolean> {
    if (!lineup) return false
    isTeleporting.value = true
    saveConfig()

    try {
      const res = await axios.post(getApiUrl('/api/cs2/push-lineup'), {
        host: serverHost.value.trim(),
        port: serverPort.value,
        password: rconPassword.value,
        consoleCommand: lineup.consoleCommand,
        nadeType: lineup.grenadeType,
        mapName: lineup.mapId
      })

      return res.data?.success === true
    } catch (err) {
      console.error('Failed to teleport on server:', err)
      return false
    } finally {
      isTeleporting.value = false
    }
  }

  return {
    serverHost,
    serverPort,
    rconPassword,
    autoSyncGsi,
    isConnected,
    isTesting,
    isCapturing,
    isTeleporting,
    connectionMessage,
    serverMap,
    serverPlayers,
    lastCaptureTime,
    lastCapturedLineup,
    livePlayer,
    saveConfig,
    testConnection,
    autoCaptureLineup,
    uploadAndAttachScreenshot,
    teleportToServer
  }
})
