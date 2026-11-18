import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { io, type Socket } from 'socket.io-client'
import { useLineupStore } from './lineupStore'
import { useMapStore } from './mapStore'
import type {
  CS2IntegrationCapability,
  CS2WorldCoords,
  Lineup,
  Point2D,
  RadarFloorId
} from '../types'
import {
  estimateLandingWorldCoords,
  formatSetPosCommand,
  normalizeMapId,
  parseGetPosCommand,
  resolveRadarFloor,
  worldToRadarCoords
} from '../core/radar/coordinateEngine'

export interface ServerConnectionConfig {
  host: string
  port: number
  password?: string
  lastConnected?: string
}

export interface LiveTelemetryState {
  playerName: string
  mapId: string
  rawMapName: string
  team: 'T' | 'CT' | 'SPEC'
  health: number
  armor: number
  roundPhase: string
  activeWeapon: string
  activeGrenadeType: 'smoke' | 'flash' | 'molotov' | 'he' | null
  worldPos: CS2WorldCoords | null
  radarCoords: Point2D | null
  estimatedLandingCoords: Point2D | null
  radarFloor: RadarFloorId
  positionAvailable: boolean
  source: 'GSI' | 'RCON' | 'CLIPBOARD' | 'SIMULATION'
  updatedAt: string
}

export const CS2_INTEGRATION_CAPABILITIES: CS2IntegrationCapability[] = [
  {
    id: 'console-getpos-sync',
    name: 'Console getpos / setpos Coordinate Sync',
    method: 'CLIPBOARD_GETPOS',
    status: 'completed',
    title: 'Zero-Setup Console Coordinate & Angle Synchronization',
    summary:
      'Binds a key in CS2 (`bind "p" "getpos_exact"`) to capture exact sub-pixel world coordinates (X, Y, Z) and view angles (Pitch, Yaw), mapping them directly to the 1024×1024 radar.',
    technicalDetails:
      'Uses official Valve `resource/overviews/<map>.txt` calibration (`pos_x`, `pos_y`, `scale`, and Z-split thresholds) plus ballistic projection to compute both standing and landing radar pins.',
    supportedEnvironments: [
      'Any CS2 Local Server',
      'Practice Mode',
      'Community Servers',
      'Offline / PWA Mode'
    ],
    limitations: [
      'Requires copying the `setpos` output from the CS2 developer console (`~`) or using RCON Auto-Capture.'
    ]
  },
  {
    id: 'source2-rcon-bridge',
    name: 'Source 2 TCP RCON Live Bridge',
    method: 'RCON',
    status: 'completed',
    title: 'Bidirectional RCON Practice Server Control & 1-Click Capture',
    summary:
      'Connects directly to a CS2 practice server (`-usercon` / Dedicated Server) via Source RCON to query `getpos_exact`, `status`, teleport the player (`setpos`), and spawn utility.',
    technicalDetails:
      'Implemented via pure TCP Source RCON protocol (`SERVERDATA_AUTH` & `SERVERDATA_EXECCOMMAND`) in the backend server with real-time Socket.IO streaming to the radar.',
    supportedEnvironments: [
      'Local CS2 Practice Server (`-usercon`)',
      'Dedicated LAN / Team Practice Server'
    ],
    limitations: [
      'Requires RCON access (`rcon_password`) and `sv_cheats 1` for teleporting (`setpos`). Not usable on Valve official matchmaking servers where players do not have RCON admin rights.'
    ]
  },
  {
    id: 'gsi-telemetry',
    name: 'Valve Game State Integration (GSI)',
    method: 'GSI',
    status: 'completed',
    title: 'Official CS2 HTTP Game State Integration (`gamestate_integration_*.cfg`)',
    summary:
      'CS2 automatically POSTs live JSON telemetry to `/api/cs2/gsi`, syncing active map, round phase, player team, held grenade, and (when permitted by the server) live 3D coordinates.',
    technicalDetails:
      'Uses Valve’s sanctioned `gamestate_integration_cs2nades.cfg` inside `game/csgo/cfg/`. Broadcasts updates over Socket.IO with <50ms latency.',
    supportedEnvironments: [
      'Valve Official Matchmaking (Map, Team, Round & Held Grenade Sync)',
      'Local Practice & GOTV Spectator (Full 3D Position & View-Angle Radar Cone)'
    ],
    limitations: [
      'Valve intentionally disables `player_position` and `player_forward` in GSI payloads for active players during live Competitive/Premier matches to prevent third-party radar hacks. Map & held-weapon auto-detection still work in live matches.'
    ]
  },
  {
    id: 'practice-cfg-generator',
    name: 'CS2 Subtick Practice Config & Bind Generator',
    method: 'PRACTICE_CFG',
    status: 'completed',
    title: 'Automated `practice.cfg` & Lineup Teleport Script Generator',
    summary:
      'Generates ready-to-run CS2 console scripts with picture-in-picture grenade camera (`sv_grenade_trajectory_prac_pipreview 1`), infinite ammo, and lineup `setpos` binds.',
    technicalDetails:
      'Compatible with CS2 Source 2 console commands and subtick jumpthrow mechanics.',
    supportedEnvironments: ['All CS2 Local & Dedicated Practice Servers'],
    limitations: ['Requires `sv_cheats 1` on the server.']
  },
  {
    id: 'memory-injection-restricted',
    name: 'Process Memory Reading / DLL Overlay Hooks',
    method: 'MEMORY_INJECTION',
    status: 'restricted',
    title: 'Unsupported / Restricted: Direct Memory Reading & Client Injection',
    summary:
      'Reading `client.dll` memory or injecting an overlay into `cs2.exe` to extract live competitive coordinates is strictly avoided.',
    technicalDetails:
      'Directly reading process memory (`ReadProcessMemory`) bypasses Valve’s GSI competitive restrictions and triggers Valve Anti-Cheat (VAC) bans.',
    supportedEnvironments: ['None (Intentionally Excluded for Account Safety)'],
    limitations: [
      'Strictly prohibited by Valve Anti-Cheat (VAC) and Fair Play guidelines. Only sanctioned APIs (GSI, RCON, Console `getpos`) are used by this platform.'
    ]
  }
]

const STORAGE_KEY = 'cs2_server_sync_config'

export const useCs2ServerStore = defineStore('cs2Server', () => {
  const lineupStore = useLineupStore()
  const mapStore = useMapStore()

  const savedConfig = localStorage.getItem(STORAGE_KEY)
  const defaultConfig: ServerConnectionConfig = savedConfig
    ? JSON.parse(savedConfig)
    : {
        host: typeof window !== 'undefined' ? window.location.hostname || '127.0.0.1' : '127.0.0.1',
        port: 27015,
        password: ''
      }

  const serverHost = ref<string>(defaultConfig.host || '127.0.0.1')
  const serverIp = serverHost
  const serverPort = ref<number>(defaultConfig.port || 27015)
  const rconPassword = ref<string>(defaultConfig.password || '')

  const isTesting = ref<boolean>(false)
  const isConnecting = isTesting
  const isCapturing = ref<boolean>(false)
  const isTeleporting = ref<boolean>(false)
  const isConnected = ref<boolean>(false)
  const connectionMessage = ref<string>('')
  const connectionError = ref<string | null>(null)
  const serverMap = ref<string>('de_mirage')
  const activeMap = serverMap
  const serverPlayers = ref<number>(0)
  const playerCount = serverPlayers
  const lastCaptureTime = ref<number>(0)
  const lastCapturedLineup = ref<Lineup | null>(null)

  const gsiConnected = ref<boolean>(false)
  const autoFollowMap = ref<boolean>(true)
  const showPlayerOnRadar = ref<boolean>(true)

  const lastPosition = ref<{
    x: number
    y: number
    z: number
    pitch: number
    yaw: number
    radarCoords: { x: number; y: number }
    estimatedLandingCoords?: { x: number; y: number }
    consoleString: string
  } | null>(null)

  const liveTelemetry = ref<LiveTelemetryState>({
    playerName: 'Local Player',
    mapId: 'mirage',
    rawMapName: 'de_mirage',
    team: 'T',
    health: 100,
    armor: 100,
    roundPhase: 'live',
    activeWeapon: 'weapon_smokegrenade',
    activeGrenadeType: 'smoke',
    worldPos: null,
    radarCoords: null,
    estimatedLandingCoords: null,
    radarFloor: 'upper',
    positionAvailable: false,
    source: 'CLIPBOARD',
    updatedAt: new Date().toISOString()
  })

  let socket: Socket | null = null

  function initSocket() {
    if (socket || typeof window === 'undefined') return
    socket = io(window.location.origin, {
      reconnectionAttempts: 5,
      timeout: 4000
    })

    socket.on('cs2:live-pos', (payload: any) => {
      if (!payload) return
      const mapId = normalizeMapId(payload.mapName || serverMap.value || 'mirage')
      const worldPos: CS2WorldCoords = {
        x: Number(payload.x ?? 0),
        y: Number(payload.y ?? 0),
        z: Number(payload.z ?? 0),
        pitch: Number(payload.pitch ?? 0),
        yaw: Number(payload.yaw ?? 0)
      }
      const radarCoords = payload.radarCoords || worldToRadarCoords(mapId, worldPos.x, worldPos.y)
      const landingWorld = estimateLandingWorldCoords(worldPos, 'standing')
      const estimatedLandingCoords = worldToRadarCoords(mapId, landingWorld.x, landingWorld.y)

      lastPosition.value = {
        ...worldPos,
        radarCoords,
        estimatedLandingCoords,
        consoleString: formatSetPosCommand(worldPos)
      }

      liveTelemetry.value = {
        ...liveTelemetry.value,
        mapId,
        rawMapName: payload.mapName || `de_${mapId}`,
        worldPos,
        radarCoords,
        estimatedLandingCoords,
        radarFloor: resolveRadarFloor(mapId, worldPos.z),
        positionAvailable: true,
        source: payload.source || 'RCON',
        updatedAt: new Date().toISOString()
      }
    })

    socket.on('cs2:gsi-update', (payload: any) => {
      if (!payload) return
      gsiConnected.value = true
      const mapId = normalizeMapId(payload.mapName || 'mirage')
      serverMap.value = payload.mapName || `de_${mapId}`

      if (autoFollowMap.value && mapId && mapId !== mapStore.currentMapId) {
        mapStore.setMap(mapId)
      }

      let worldPos: CS2WorldCoords | null = null
      let radarCoords: Point2D | null = null
      let estimatedLandingCoords: Point2D | null = null
      let radarFloor: RadarFloorId = 'upper'

      if (payload.worldPos && typeof payload.worldPos.x === 'number') {
        worldPos = {
          x: payload.worldPos.x,
          y: payload.worldPos.y,
          z: payload.worldPos.z ?? 0,
          pitch: payload.worldPos.pitch ?? 0,
          yaw: payload.worldPos.yaw ?? 0
        }
        const computedRadar =
          payload.radarCoords || worldToRadarCoords(mapId, worldPos.x, worldPos.y)
        radarCoords = computedRadar
        const landingW = estimateLandingWorldCoords(worldPos, 'standing')
        estimatedLandingCoords = worldToRadarCoords(mapId, landingW.x, landingW.y)
        radarFloor = resolveRadarFloor(mapId, worldPos.z)

        lastPosition.value = {
          ...worldPos,
          radarCoords: computedRadar,
          estimatedLandingCoords,
          consoleString: formatSetPosCommand(worldPos)
        }
      }

      liveTelemetry.value = {
        playerName: payload.playerName || 'CS2 Player',
        mapId,
        rawMapName: payload.mapName || `de_${mapId}`,
        team: payload.team || 'T',
        health: payload.health ?? 100,
        armor: payload.armor ?? 100,
        roundPhase: payload.roundPhase || 'live',
        activeWeapon: payload.activeWeapon || '',
        activeGrenadeType: payload.activeGrenadeType || null,
        worldPos,
        radarCoords,
        estimatedLandingCoords,
        radarFloor,
        positionAvailable: Boolean(worldPos),
        source: 'GSI',
        updatedAt: new Date().toISOString()
      }
    })
  }

  initSocket()

  function saveConfig() {
    const cfg: ServerConnectionConfig = {
      host: serverHost.value.trim(),
      port: Number(serverPort.value) || 27015,
      password: rconPassword.value,
      lastConnected: isConnected.value ? new Date().toISOString() : undefined
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  }

  function syncFromConsoleString(
    rawConsoleString: string,
    mapId = mapStore.currentMapId,
    throwType = 'standing'
  ) {
    const parsed = parseGetPosCommand(rawConsoleString)
    if (!parsed) return null

    const cleanMapId = normalizeMapId(mapId)
    const radarCoords = worldToRadarCoords(cleanMapId, parsed.x, parsed.y)
    const landingWorld = estimateLandingWorldCoords(parsed, throwType)
    const estimatedLandingCoords = worldToRadarCoords(cleanMapId, landingWorld.x, landingWorld.y)
    const consoleString = formatSetPosCommand(parsed)

    lastPosition.value = {
      ...parsed,
      radarCoords,
      estimatedLandingCoords,
      consoleString
    }

    liveTelemetry.value = {
      ...liveTelemetry.value,
      mapId: cleanMapId,
      rawMapName: `de_${cleanMapId}`,
      worldPos: parsed,
      radarCoords,
      estimatedLandingCoords,
      radarFloor: resolveRadarFloor(cleanMapId, parsed.z),
      positionAvailable: true,
      source: 'CLIPBOARD',
      updatedAt: new Date().toISOString()
    }

    return lastPosition.value
  }

  function simulateRadarPosition(mapId: string, radarPoint: Point2D, yaw = -125, pitch = -32) {
    const cleanMapId = normalizeMapId(mapId)
    const cal = {
      mirage: { pos_x: -3230, pos_y: 1713, scale: 5.0 },
      dust2: { pos_x: -2476, pos_y: 3239, scale: 4.4 },
      inferno: { pos_x: -2087, pos_y: 3870, scale: 4.9 },
      nuke: { pos_x: -3453, pos_y: 2887, scale: 7.0 },
      ancient: { pos_x: -2953, pos_y: 2164, scale: 5.0 },
      anubis: { pos_x: -2796, pos_y: 3328, scale: 5.22 }
    }[cleanMapId] || { pos_x: -3230, pos_y: 1713, scale: 5.0 }

    const worldX = Math.round(cal.pos_x + (radarPoint.x / 100) * 1024 * cal.scale)
    const worldY = Math.round(cal.pos_y - (radarPoint.y / 100) * 1024 * cal.scale)
    const worldPos: CS2WorldCoords = { x: worldX, y: worldY, z: -120, pitch, yaw }
    return syncFromConsoleString(formatSetPosCommand(worldPos), cleanMapId)
  }

  async function testConnection(): Promise<boolean> {
    isTesting.value = true
    connectionError.value = null
    connectionMessage.value = 'Connecting to CS2 Server via RCON...'
    saveConfig()

    try {
      const res = await axios.post('/api/cs2/server-status', {
        host: serverHost.value.trim(),
        ip: serverHost.value.trim(),
        port: serverPort.value,
        password: rconPassword.value,
        rconPassword: rconPassword.value
      })

      if (res.data && (res.data.success || res.data.online)) {
        isConnected.value = true
        serverMap.value = res.data.mapName || res.data.map || 'de_mirage'
        serverPlayers.value = res.data.playerCount || res.data.players || 1
        connectionMessage.value = `Connected: ${res.data.serverName || 'CS2 Server'} (${serverMap.value})`
        return true
      } else {
        isConnected.value = false
        connectionMessage.value =
          res.data.error || 'Could not connect to CS2 server. Check IP & RCON password.'
        connectionError.value = connectionMessage.value
        return false
      }
    } catch (err: any) {
      isConnected.value = false
      connectionMessage.value = err.response?.data?.error || err.message || 'Connection failed'
      connectionError.value = connectionMessage.value
      return false
    } finally {
      isTesting.value = false
    }
  }

  async function fetchPlayerPosition(rawGetPosText?: string, currentMapId = mapStore.currentMapId) {
    if (rawGetPosText) {
      const localResult = syncFromConsoleString(rawGetPosText, currentMapId)
      if (localResult) return localResult
    }

    try {
      const res = await axios.post('/api/cs2/fetch-pos', {
        host: serverHost.value.trim(),
        ip: serverHost.value.trim(),
        port: Number(serverPort.value),
        password: rconPassword.value,
        rconPassword: rconPassword.value,
        rawGetPos: rawGetPosText,
        mapId: currentMapId
      })
      if (res.data?.success && res.data.position) {
        lastPosition.value = res.data.position
        return res.data.position
      }
      return null
    } catch {
      return null
    }
  }

  async function autoCaptureLineup(customTitleOrPayload?: any): Promise<Lineup | null> {
    isCapturing.value = true
    saveConfig()

    const customTitle =
      typeof customTitleOrPayload === 'string'
        ? customTitleOrPayload
        : customTitleOrPayload?.title

    try {
      let captured: Lineup | null = null

      if (serverHost.value && rconPassword.value) {
        const res = await axios.post('/api/cs2/auto-capture', {
          host: serverHost.value.trim(),
          ip: serverHost.value.trim(),
          port: serverPort.value,
          password: rconPassword.value,
          rconPassword: rconPassword.value,
          title: customTitle
        })
        if (res.data && res.data.success && (res.data.lineup || res.data.capture)) {
          captured = res.data.lineup || res.data.capture
        }
      }

      if (captured) {
        if (captured.consoleCommand) {
          syncFromConsoleString(captured.consoleCommand, captured.mapId || mapStore.currentMapId)
        }
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
      connectionMessage.value = err.response?.data?.error || err.message || 'Auto capture error'
      return null
    } finally {
      isCapturing.value = false
    }
  }

  async function captureScreenFrame(): Promise<string | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return null
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' } as any,
        audio: false
      })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 1920
      canvas.height = video.videoHeight || 1080
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

      stream.getTracks().forEach((t) => t.stop())
      return canvas.toDataURL('image/jpeg', 0.88)
    } catch {
      return null
    }
  }

  async function autoInsertFullLineup(
    options: {
      title?: string
      captureScreen?: boolean
      snapType?: 'aim' | 'standing' | 'landing'
    } = {}
  ): Promise<Lineup | null> {
    let snapData: string | null = null
    if (options.captureScreen) {
      snapData = await captureScreenFrame()
    }
    const lineup = await autoCaptureLineup(options.title)
    if (lineup && snapData) {
      const type = options.snapType || 'aim'
      await uploadAndAttachScreenshot(snapData, type, lineup.id)
    }
    return lineup
  }

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
      if (!targetId) return null

      const res = await axios.post('/api/cs2/auto-screenshot', {
        image: base64Data,
        type,
        lineupId: targetId
      })

      if (res.data && res.data.success && res.data.imageUrl) {
        const publicUrl = res.data.imageUrl
        const found = lineupStore.customLineups.find((l) => l.id === targetId)
        if (found) {
          if (type === 'aim') found.aimScreenshot = publicUrl
          else if (type === 'standing') found.standingScreenshot = publicUrl
          else if (type === 'landing') found.landingScreenshot = publicUrl
          found.imageUrl =
            found.aimScreenshot || found.standingScreenshot || found.landingScreenshot || publicUrl
          lineupStore.updateLineup(found)
        }
        return publicUrl
      }
      return null
    } catch {
      return null
    }
  }

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
      if (!targetId) return null

      const res = await axios.post('/api/cs2/auto-video', {
        video: base64Data,
        lineupId: targetId
      })

      if (res.data && res.data.success && res.data.videoUrl) {
        const publicUrl = res.data.videoUrl
        const found = lineupStore.customLineups.find((l) => l.id === targetId)
        if (found) {
          found.videoUrl = publicUrl
          lineupStore.updateLineup(found)
        }
        return publicUrl
      }
      return null
    } catch {
      return null
    }
  }

  async function teleportToServer(lineup: Lineup): Promise<boolean> {
    if (!lineup) return false
    isTeleporting.value = true
    saveConfig()

    try {
      const res = await axios.post('/api/cs2/push-lineup', {
        host: serverHost.value.trim(),
        ip: serverHost.value.trim(),
        port: serverPort.value,
        password: rconPassword.value,
        rconPassword: rconPassword.value,
        consoleCommand: lineup.consoleCommand,
        nadeType: lineup.grenadeType,
        mapName: lineup.mapId,
        lineup
      })
      return res.data?.success === true
    } catch {
      return false
    } finally {
      isTeleporting.value = false
    }
  }

  async function pushLineupToGame(lineup: Lineup) {
    const ok = await teleportToServer(lineup)
    return {
      success: ok,
      error: ok ? undefined : connectionMessage.value || 'RCON server unreachable'
    }
  }

  function generateGsiConfigFileContent(serverUrl = 'http://127.0.0.1:5000'): string {
    return `"CS2Nades Live Telemetry v2.0"
{
  "uri" "${serverUrl}/api/cs2/gsi"
  "timeout" "5.0"
  "buffer"  "0.05"
  "throttle" "0.1"
  "heartbeat" "15.0"
  "data"
  {
    "provider"            "1"
    "map"                 "1"
    "round"               "1"
    "player_id"           "1"
    "player_state"        "1"
    "player_weapons"      "1"
    "player_match_stats"  "1"
    "player_position"     "1"
  }
}
`
  }

  return {
    serverHost,
    serverIp,
    serverPort,
    rconPassword,
    isConnected,
    isConnecting,
    isTesting,
    isCapturing,
    isTeleporting,
    connectionMessage,
    connectionError,
    serverMap,
    activeMap,
    serverPlayers,
    playerCount,
    lastCaptureTime,
    lastCapturedLineup,
    gsiConnected,
    autoFollowMap,
    showPlayerOnRadar,
    lastPosition,
    liveTelemetry,
    capabilities: CS2_INTEGRATION_CAPABILITIES,
    saveConfig,
    testConnection,
    fetchPlayerPosition,
    syncFromConsoleString,
    simulateRadarPosition,
    autoCaptureLineup,
    captureScreenFrame,
    autoInsertFullLineup,
    uploadAndAttachScreenshot,
    uploadAndAttachVideo,
    teleportToServer,
    pushLineupToGame,
    generateGsiConfigFileContent
  }
})

export const useCS2ServerStore = useCs2ServerStore
