import type { CS2WorldCoords, Point2D } from '../types'
import {
  CS2_RADAR_CALIBRATIONS,
  estimateLandingWorldCoords,
  normalizeMapId,
  parseGetPosCommand,
  radarToWorldCoords,
  worldToRadarCoords
} from '../core/radar/coordinateEngine'

export interface MapOverviewCalibration {
  pos_x: number
  pos_y: number
  scale: number
  defaultZ: number
}

export const CS2_MAP_CALIBRATION: Record<string, MapOverviewCalibration> = {
  mirage: { pos_x: -3230, pos_y: 1713, scale: 5.0, defaultZ: -160 },
  dust2: { pos_x: -2476, pos_y: 3239, scale: 4.4, defaultZ: 0 },
  inferno: { pos_x: -2087, pos_y: 3870, scale: 4.9, defaultZ: 128 },
  cache: { pos_x: -2000, pos_y: 3250, scale: 5.5, defaultZ: 0 },
  ancient: { pos_x: -2953, pos_y: 2164, scale: 5.0, defaultZ: 100 },
  nuke: { pos_x: -3453, pos_y: 2887, scale: 7.0, defaultZ: -380 },
  anubis: { pos_x: -2796, pos_y: 3328, scale: 5.22, defaultZ: 50 },
  overpass: { pos_x: -4831, pos_y: 1781, scale: 5.2, defaultZ: 250 },
  vertigo: { pos_x: -3168, pos_y: 1762, scale: 4.0, defaultZ: 11700 },
  train: { pos_x: -2477, pos_y: 2392, scale: 4.7, defaultZ: 0 },
  cobblestone: { pos_x: -3840, pos_y: 3072, scale: 6.0, defaultZ: 0 },
  cbble: { pos_x: -3840, pos_y: 3072, scale: 6.0, defaultZ: 0 },
  office: { pos_x: -1838, pos_y: 1858, scale: 4.1, defaultZ: 0 },
  italy: { pos_x: -2647, pos_y: 2592, scale: 4.6, defaultZ: 0 },
  boulder: { pos_x: -3000, pos_y: 3000, scale: 5.0, defaultZ: 0 },
  fachwerk: { pos_x: -2500, pos_y: 2500, scale: 5.0, defaultZ: 0 },
  shelter: { pos_x: -3000, pos_y: 3000, scale: 5.0, defaultZ: 0 }
}

export const CS2_MAP_CALIBRATIONS = CS2_RADAR_CALIBRATIONS
export const parseCS2ConsoleCommand = parseGetPosCommand
export const worldToRadarPercent = worldToRadarCoords
export const radarPercentToWorld = radarToWorldCoords
export type CS2ParsedCoords = CS2WorldCoords

export function pctToWorldCoords(
  mapId: string,
  coords: { x: number; y: number },
  z?: number
) {
  const cleanMap = normalizeMapId(mapId || 'mirage')
  const calib = CS2_MAP_CALIBRATION[cleanMap] ?? CS2_MAP_CALIBRATION.mirage!
  return radarToWorldCoords(cleanMap, coords, z !== undefined ? z : calib.defaultZ)
}

export function worldToPctCoords(mapId: string, world: { x: number; y: number }) {
  return worldToRadarCoords(mapId, world.x, world.y)
}

export function generateSetposCommand(
  mapId: string,
  originPct: { x: number; y: number },
  pitch = 0,
  yaw = 0
): string {
  const world = pctToWorldCoords(mapId, originPct)
  return `setpos_exact ${world.x} ${world.y} ${world.z}; setang ${pitch} ${yaw} 0`
}

export function generateGSIConfigFile(serverHost = 'http://localhost:5000'): string {
  return `"Protutech GSI v2.0"
{
 "uri" "${serverHost}/api/cs2/gsi"
 "timeout" "5.0"
 "buffer"  "0.1"
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
}`
}

export function estimateLandingRadarPercent(
  mapId: string,
  originWorld: CS2WorldCoords,
  throwType = 'standing'
): Point2D {
  const landingWorld = estimateLandingWorldCoords(originWorld, throwType)
  return worldToRadarCoords(mapId, landingWorld.x, landingWorld.y)
}
