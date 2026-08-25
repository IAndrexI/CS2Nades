/**
 * Official CS2 Overview Map Coordinate Calibration Data
 * Maps world coordinates (Hammer units) <-> Radar Percentage (0-100%)
 */
export interface MapOverviewCalibration {
  pos_x: number // Top-left world X
  pos_y: number // Top-left world Y
  scale: number // World units per radar pixel (1024 base)
  defaultZ: number // Average player head height
}

export const CS2_MAP_CALIBRATION: Record<string, MapOverviewCalibration> = {
  mirage: { pos_x: -3230, pos_y: 1713, scale: 5.0, defaultZ: -160 },
  dust2: { pos_x: -2476, pos_y: 3239, scale: 4.4, defaultZ: 0 },
  inferno: { pos_x: -2087, pos_y: 3870, scale: 4.9, defaultZ: 128 },
  cache: { pos_x: -2000, pos_y: 3250, scale: 5.5, defaultZ: 0 },
  ancient: { pos_x: -2953, pos_y: 2164, scale: 5.0, defaultZ: 100 },
  nuke: { pos_x: -3453, pos_y: 2887, scale: 6.2, defaultZ: -380 },
  anubis: { pos_x: -2796, pos_y: 3328, scale: 5.22, defaultZ: 50 },
  overpass: { pos_x: -4831, pos_y: 1781, scale: 5.2, defaultZ: 250 },
  vertigo: { pos_x: -3168, pos_y: 1762, scale: 4.0, defaultZ: 11700 },
  train: { pos_x: -2477, pos_y: 2554, scale: 4.7, defaultZ: 0 },
  office: { pos_x: -1838, pos_y: 1858, scale: 4.1, defaultZ: 0 },
  italy: { pos_x: -2647, pos_y: 2592, scale: 4.6, defaultZ: 0 },
  boulder: { pos_x: -3000, pos_y: 3000, scale: 5.0, defaultZ: 0 },
  fachwerk: { pos_x: -2500, pos_y: 2500, scale: 5.0, defaultZ: 0 },
  shelter: { pos_x: -3000, pos_y: 3000, scale: 5.0, defaultZ: 0 }
}

/**
 * Convert Radar percentage coords (0-100) to CS2 in-game world coordinates
 */
export function pctToWorldCoords(mapId: string, coords: { x: number; y: number }, z?: number) {
  const calib = CS2_MAP_CALIBRATION[mapId] || { pos_x: -3000, pos_y: 3000, scale: 5.0, defaultZ: 0 }
  const totalWorldSpan = 1024 * calib.scale
  
  const worldX = Math.round(calib.pos_x + (coords.x / 100) * totalWorldSpan)
  const worldY = Math.round(calib.pos_y - (coords.y / 100) * totalWorldSpan)
  const worldZ = z !== undefined ? z : calib.defaultZ

  return { x: worldX, y: worldY, z: worldZ }
}

/**
 * Convert CS2 in-game world coordinates (from getpos or GSI) to Radar percentage coords (0-100)
 */
export function worldToPctCoords(mapId: string, world: { x: number; y: number }) {
  const calib = CS2_MAP_CALIBRATION[mapId] || { pos_x: -3000, pos_y: 3000, scale: 5.0, defaultZ: 0 }
  const totalWorldSpan = 1024 * calib.scale

  const pctX = ((world.x - calib.pos_x) / totalWorldSpan) * 100
  const pctY = ((calib.pos_y - world.y) / totalWorldSpan) * 100

  return {
    x: Math.round(Math.min(Math.max(pctX, 0), 100) * 10) / 10,
    y: Math.round(Math.min(Math.max(pctY, 0), 100) * 10) / 10
  }
}

/**
 * Generate in-game CS2 console command to teleport & lineup
 */
export function generateSetposCommand(
  mapId: string,
  originPct: { x: number; y: number },
  pitch = 0,
  yaw = 0
): string {
  const world = pctToWorldCoords(mapId, originPct)
  return `setpos_exact ${world.x} ${world.y} ${world.z}; setang ${pitch} ${yaw} 0`
}

/**
 * Generate Gamestate Integration config content for auto in-game tracking
 */
export function generateGSIConfigFile(serverHost = 'http://localhost:8080'): string {
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
