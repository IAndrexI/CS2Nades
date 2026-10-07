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
  autoSyncGsi: boolean
  autoSyncMapWithGsi?: boolean
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
  health?: number
  armor?: number
  hasHelmet?: boolean
  money?: number
  activity?: string
  radarCoords?: { x: number; y: number }
  timestamp: number
}

const STORAGE_KEY = 'cs2_server_sync_config'

export const useCs2ServerStore = defineStore('cs2Server', () => {
  const lineupStore = useLineupStore()
  const mapStore = useMapStore()
  const gameRoomStore = useGameRoomStore()

  // Saved Server Connection Details
  const savedConfig = localStorage.getItem(STORAGE_KEY)
  const defaultConfig: ServerConnectionConfig = savedConfig ? JSON.parse(savedConfig) : {
    host: typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1',
    port: 27015,
    password: '',
    autoSyncGsi: true,
    autoSyncMapWithGsi: true
  }

  const serverHost = ref<string>(defaultConfig.host)
  const serverPort = ref<number>(defaultConfig.port)
  const rconPassword = ref<string>(defaultConfig.password || '')
  const autoSyncGsi = ref<boolean>(defaultConfig.autoSyncGsi)
  const autoSyncMapWithGsi = ref<boolean>(defaultConfig.autoSyncMapWithGsi ?? true)

  const isTesting = ref<boolean>(false)
  const isCapturing = ref<boolean>(false)
  const isTeleporting = ref<boolean>(false)
  const isConnected = ref<boolean>(false)
  const connectionMessage = ref<string>('')
  const serverMap = ref<string>('de_mirage')
  const serverPlayers = ref<number>(0)
  const lastCaptureTime = ref<number>(0)
  const lastCapturedLineup = ref<Lineup | null>(null)

  // Live GSI state & telemetry from server
  const livePlayer = ref<LivePlayerState | null>(null)
  const gsiTelemetry = ref<any | null>(null)
  const lastGsiPacketTime = ref<number>(0)

  const isGsiActive = computed(() => {
    return lastGsiPacketTime.value > 0 && (Date.now() - lastGsiPacketTime.value < 35000)
  })

  function saveConfig() {
    const cfg: ServerConnectionConfig = {
      host: serverHost.value.trim(),
      port: Number(serverPort.value) || 27015,
      password: rconPassword.value,
      autoSyncGsi: autoSyncGsi.value,
      autoSyncMapWithGsi: autoSyncMapWithGsi.value,
      lastConnected: isConnected.value ? new Date().toISOString() : undefined
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  }

  function getApiUrl(path: string): string {
    return path
  }

  function normalizePlayerState(rawPlayer: any, mapName = 'mirage'): LivePlayerState {
    const x = rawPlayer.x !== undefined ? Number(rawPlayer.x) : (rawPlayer.position?.x !== undefined ? Number(rawPlayer.position.x) : 0)
    const y = rawPlayer.y !== undefined ? Number(rawPlayer.y) : (rawPlayer.position?.y !== undefined ? Number(rawPlayer.position.y) : 0)
    const z = rawPlayer.z !== undefined ? Number(rawPlayer.z) : (rawPlayer.position?.z !== undefined ? Number(rawPlayer.position.z) : 0)
    const pitch = rawPlayer.pitch !== undefined ? Number(rawPlayer.pitch) : (rawPlayer.angles?.pitch !== undefined ? Number(rawPlayer.angles.pitch) : 0)
    const yaw = rawPlayer.yaw !== undefined ? Number(rawPlayer.yaw) : (rawPlayer.angles?.yaw !== undefined ? Number(rawPlayer.angles.yaw) : 0)
    const roll = rawPlayer.roll !== undefined ? Number(rawPlayer.roll) : (rawPlayer.angles?.roll !== undefined ? Number(rawPlayer.angles.roll) : 0)

    const cleanMap = (mapName || 'mirage').toLowerCase().replace('de_', '').replace('cs_', '')
    const radar = (x !== 0 || y !== 0) ? worldToRadarCoords(x, y, cleanMap) : (rawPlayer.radarCoords || { x: 50, y: 50 })

    return {
      ...rawPlayer,
      playerName: rawPlayer.playerName || rawPlayer.name || 'CS2 Player',
      team: rawPlayer.team || 'T',
      weapon: rawPlayer.weapon || 'weapon_knife',
      x,
      y,
      z,
      pitch,
      yaw,
      roll,
      mapName: cleanMap,
      radarCoords: radar,
      timestamp: Date.now()
    }
  }

  /**
   * Listen to real-time GSI telemetry via Socket.IO
   */
  function initGsiListeners() {
    const socket = gameRoomStore.getSocket()
    if (!socket) return

    socket.off('cs2:gsi-update')
    socket.off('cs2:live-pos')

    socket.on('cs2:gsi-update', (data: any) => {
      lastGsiPacketTime.value = Date.now()
      gsiTelemetry.value = data
      if (data && data.player) {
        livePlayer.value = normalizePlayerState(data.player, data.map?.name || 'mirage')
      }

      // Auto-sync map with active CS2 match if enabled
      if (autoSyncMapWithGsi.value && data?.map?.name) {
        const clean = data.map.name.replace('de_', '').replace('cs_', '').toLowerCase()
        if (clean && clean !== mapStore.currentMapId) {
          const exists = mapStore.availableMaps.some(m => m.id === clean)
          if (exists) {
            mapStore.currentMapId = clean
          }
        }
      }
    })

    socket.on('cs2:live-pos', (playerData: any) => {
      lastGsiPacketTime.value = Date.now()
      livePlayer.value = normalizePlayerState(playerData, playerData?.mapName || 'mirage')
    })
  }

  /**
   * Check latest GSI status from server
   */
  async function fetchGsiStatus() {
    try {
      const res = await axios.get(getApiUrl('/api/cs2/gsi/status'))
      if (res.data) {
        if (res.data.lastPacketTime) {
          lastGsiPacketTime.value = res.data.lastPacketTime
        }
        if (res.data.telemetry) {
          gsiTelemetry.value = res.data.telemetry
          if (res.data.telemetry.player) {
            livePlayer.value = normalizePlayerState(res.data.telemetry.player, res.data.telemetry.map?.name || 'mirage')
          }
        }
      }
    } catch (err) {}
  }

  /**
   * Send test GSI ping to verify integration
   */
  async function sendTestGsiPing(mapId = mapStore.currentMapId || 'mirage'): Promise<boolean> {
    try {
      const res = await axios.post(getApiUrl('/api/cs2/gsi/test-ping'), {
        mapId,
        playerName: 'Practice Player'
      })
      if (res.data && res.data.telemetry) {
        lastGsiPacketTime.value = Date.now()
        gsiTelemetry.value = res.data.telemetry
        if (res.data.telemetry.player) {
          livePlayer.value = normalizePlayerState(res.data.telemetry.player, res.data.telemetry.map?.name || mapId)
        }
        return true
      }
    } catch (err) {
      console.error('Failed to send test GSI ping', err)
    }
    return false
  }

  // Initialize listeners & status check on store instantiation
  if (typeof window !== 'undefined') {
    initGsiListeners()
    fetchGsiStatus()
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
   * (Supports RCON query and GSI live coordinate stream fallback)
   */
  async function autoCaptureLineup(customTitle?: string): Promise<Lineup | null> {
    isCapturing.value = true
    saveConfig()

    try {
      let captured: Lineup | null = null

      // Attempt 1: Query server via RCON
      if (serverHost.value && rconPassword.value) {
        try {
          const res = await axios.post(getApiUrl('/api/cs2/auto-capture'), {
            host: serverHost.value.trim(),
            port: serverPort.value,
            password: rconPassword.value,
            title: customTitle
          })
          if (res.data && res.data.success && res.data.lineup) {
            captured = res.data.lineup
          }
        } catch (e) {
          // Fall through to GSI fallback
        }
      }

      // Attempt 2: If RCON didn't return a lineup, use Live GSI Coordinates
      if (!captured && livePlayer.value && livePlayer.value.x !== undefined) {
        const p = livePlayer.value
        const mapId = (p.mapName || mapStore.currentMapId || 'mirage').toLowerCase().replace('de_', '')
        const radar = p.radarCoords || worldToRadarCoords(p.x, p.y, mapId)

        // Determine grenade type from active weapon
        let grenadeType: GrenadeType = 'smoke'
        if (p.weapon?.includes('flash')) grenadeType = 'flash'
        else if (p.weapon?.includes('molotov') || p.weapon?.includes('incgrenade')) grenadeType = 'molotov'
        else if (p.weapon?.includes('hegrenade')) grenadeType = 'he'
        else if (p.weapon?.includes('decoy')) grenadeType = 'decoy'

        // Calculate forward landing point estimate
        const yawRad = ((p.yaw || 0) * Math.PI) / 180
        const pitchRad = ((p.pitch || 0) * Math.PI) / 180
        const targetWorldX = p.x + Math.cos(pitchRad) * Math.cos(yawRad) * 1200
        const targetWorldY = p.y + Math.cos(pitchRad) * Math.sin(yawRad) * 1200
        const landingRadar = worldToRadarCoords(targetWorldX, targetWorldY, mapId)

        const title = customTitle || `${mapId.toUpperCase()} ${grenadeType.toUpperCase()} (Live GSI Capture)`
        const consoleCmd = `setpos_exact ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}; setang ${(p.pitch || 0).toFixed(2)} ${(p.yaw || 0).toFixed(2)} 0.00`

        captured = {
          id: `gsi-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title,
          mapId,
          grenadeType,
          side: (p.team?.toLowerCase() === 'ct' ? 'ct' : 't') as TeamSide,
          throwType: 'jumpthrow',
          tickrate: 'cs2_subtick',
          originCoords: radar,
          landingCoords: landingRadar,
          startLocation: `${p.playerName || 'Player'} Spot`,
          endLocation: 'Target Area',
          tags: ['gsi-capture', mapId, grenadeType],
          instructions: [
            `Auto-captured via CS2 GameState Integration.`,
            `Angle: pitch ${p.pitch?.toFixed(1)}°, yaw ${p.yaw?.toFixed(1)}°.`
          ],
          consoleCommand: consoleCmd,
          difficulty: 'medium',
          cs2Pos: {
            x: p.x,
            y: p.y,
            z: p.z,
            pitch: p.pitch,
            yaw: p.yaw
          },
          isCustom: true,
          inLibrary: true,
          isTeamShared: true,
          createdAt: new Date().toISOString()
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
        connectionMessage.value = 'Failed to capture: Please ensure CS2 GSI file is installed or CS2 Server RCON is connected.'
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
   * 1-Click Auto-Insert Full Lineup from CS2 with Optional Live Screen Snap
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
    autoSyncGsi,
    autoSyncMapWithGsi,
    isGsiActive,
    lastGsiPacketTime,
    gsiTelemetry,
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
    captureScreenFrame,
    autoInsertFullLineup,
    uploadAndAttachScreenshot,
    uploadAndAttachVideo,
    teleportToServer,
    initGsiListeners,
    fetchGsiStatus,
    sendTestGsiPing
  }
})

