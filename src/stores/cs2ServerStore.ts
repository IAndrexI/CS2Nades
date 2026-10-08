import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { useLineupStore } from './lineupStore'
import { useMapStore } from './mapStore'
import { useGameRoomStore } from './gameRoomStore'
import type { Lineup, GrenadeType, TeamSide, ThrowType } from '../types'
import { worldToRadarCoords, parseCS2Pos } from '../utils/coordinateMapper'

export interface ServerConnectionConfig {
  host: string
  port: number
  password?: string
  lastConnected?: string
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
    password: ''
  }

  const serverHost = ref<string>(defaultConfig.host)
  const serverPort = ref<number>(defaultConfig.port)
  const rconPassword = ref<string>(defaultConfig.password || '')

  const isTesting = ref<boolean>(false)
  const isCapturing = ref<boolean>(false)
  const isTeleporting = ref<boolean>(false)
  const isConnected = ref<boolean>(false)
  const connectionMessage = ref<string>('')
  const serverMap = ref<string>('de_mirage')
  const serverPlayers = ref<number>(0)
  const lastCaptureTime = ref<number>(0)
  const lastCapturedLineup = ref<Lineup | null>(null)

  function saveConfig() {
    const cfg: ServerConnectionConfig = {
      host: serverHost.value.trim(),
      port: Number(serverPort.value) || 27015,
      password: rconPassword.value,
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
   * (Queries dedicated CS2 Server via RCON)
   */
  async function autoCaptureLineup(customTitle?: string): Promise<Lineup | null> {
    isCapturing.value = true
    saveConfig()

    try {
      let captured: Lineup | null = null

      // Query server via RCON
      if (serverHost.value && rconPassword.value) {
        const res = await axios.post(getApiUrl('/api/cs2/auto-capture'), {
          host: serverHost.value.trim(),
          port: serverPort.value,
          password: rconPassword.value,
          title: customTitle
        })
        if (res.data && res.data.success && res.data.lineup) {
          captured = res.data.lineup
        }
      }

      if (captured) {
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
        connectionMessage.value = 'Failed to capture: Please ensure CS2 Server RCON is connected.'
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
   * Capture a single high-resolution screenshot frame directly from the user's CS2 game window
   */
  async function captureScreenFrame(): Promise<string | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen capture API is not supported in this browser environment.')
        return null
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          cursor: 'always'
        } as any,
        audio: false
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      await video.play()

      // Allow a moment for frame decoding
      await new Promise((r) => setTimeout(r, 150))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1920
      canvas.height = video.videoHeight || 1080
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      }

      // Stop stream tracks immediately
      stream.getTracks().forEach((track) => track.stop())

      return canvas.toDataURL('image/jpeg', 0.92)
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn('Screen capture cancelled or failed:', err)
      }
      return null
    }
  }

  /**
   * 1-Click Auto-Insert Full Lineup with Optional Live Screen Snap
   */
  async function autoInsertFullLineup(options: {
    captureSnap?: boolean
    snapType?: 'aim' | 'standing' | 'landing'
    customTitle?: string
  } = {}): Promise<Lineup | null> {
    let snapData: string | null = null
    if (options.captureSnap) {
      snapData = await captureScreenFrame()
    }

    const lineup = await autoCaptureLineup(options.customTitle)
    if (lineup && snapData) {
      const type = options.snapType || 'aim'
      await uploadAndAttachScreenshot(snapData, type, lineup.id)
    }
    return lineup
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
   * Auto-Upload and Attach In-Game Video Clip to a Lineup
   */
  async function uploadAndAttachVideo(
    videoSource: string | File,
    lineupId?: string
  ): Promise<string | null> {
    try {
      let base64Data = ''
      if (videoSource instanceof File) {
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(videoSource)
        })
      } else {
        base64Data = videoSource
      }

      const targetId = lineupId || lastCapturedLineup.value?.id || lineupStore.activeLineup?.id
      if (!targetId) {
        throw new Error('No active lineup selected to attach video')
      }

      const res = await axios.post(getApiUrl('/api/cs2/auto-video'), {
        video: base64Data,
        lineupId: targetId
      })

      if (res.data && res.data.success && res.data.videoUrl) {
        const publicUrl = res.data.videoUrl
        
        // Update lineup in local store
        const found = lineupStore.customLineups.find(l => l.id === targetId)
        if (found) {
          found.videoUrl = publicUrl
          lineupStore.updateLineup(found)
        }

        if (lineupStore.activeLineup && lineupStore.activeLineup.id === targetId) {
          lineupStore.activeLineup.videoUrl = publicUrl
        }

        return publicUrl
      }
      return null
    } catch (err: any) {
      console.error('Failed to attach video:', err)
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
    isConnected,
    isTesting,
    isCapturing,
    isTeleporting,
    connectionMessage,
    serverMap,
    serverPlayers,
    lastCaptureTime,
    lastCapturedLineup,
    saveConfig,
    testConnection,
    autoCaptureLineup,
    captureScreenFrame,
    autoInsertFullLineup,
    uploadAndAttachScreenshot,
    uploadAndAttachVideo,
    teleportToServer
  }
})

