/**
 * CS2 Radar & In-Game World Coordinate Mapper Utility
 * Provides conversion between CS2 in-game world units (setpos / getpos) and radar minimap percentage (0-100%).
 */

export interface MapOverviewConfig {
  pos_x: number
  pos_y: number
  scale: number
}

// Valve CS2 Official Map Overview Calibration Parameters
export const MAP_OVERVIEW_CONFIGS: Record<string, MapOverviewConfig> = {
  mirage: { pos_x: -3230, pos_y: 1713, scale: 5.00 },
  dust2: { pos_x: -2476, pos_y: 3239, scale: 4.40 },
  inferno: { pos_x: -2087, pos_y: 3870, scale: 4.90 },
  nuke: { pos_x: -3453, pos_y: 2887, scale: 7.00 },
  ancient: { pos_x: -2953, pos_y: 2164, scale: 5.00 },
  anubis: { pos_x: -2796, pos_y: 3328, scale: 5.22 },
  vertigo: { pos_x: -3168, pos_y: 1762, scale: 4.00 },
  overpass: { pos_x: -4831, pos_y: 1781, scale: 5.20 },
  train: { pos_x: -2477, pos_y: 2554, scale: 4.70 },
  office: { pos_x: -1838, pos_y: 1858, scale: 4.10 },
  italy: { pos_x: -2647, pos_y: 2592, scale: 4.60 },
  cache: { pos_x: -2000, pos_y: 3250, scale: 5.50 },
  boulder: { pos_x: -3000, pos_y: 3000, scale: 5.00 },
  fachwerk: { pos_x: -2500, pos_y: 2500, scale: 5.00 },
  shelter: { pos_x: -3000, pos_y: 3000, scale: 5.00 }
}

export interface ParsedCS2Pos {
  posX: number
  posY: number
  posZ: number
  angPitch?: number
  angYaw?: number
  angRoll?: number
  consoleCommand: string
  valid: boolean
}

/**
 * Parses CS2 console positioning strings such as:
 * - `setpos 1234.56 -567.89 -160.00; setang 12.34 -89.01 0.00`
 * - `setpos_exact -1234.56 567.89 123.45; setang_exact 12.34 -56.78 0.00`
 * - `Player: origin(-1234.56 -567.89 -160.03) angles(12.34 -89.01 0.00)`
 * - `-1234.56 -567.89 -160.03`
 */
export function parseCS2Pos(input: string): ParsedCS2Pos | null {
  if (!input || typeof input !== 'string') return null
  const text = input.trim()
  if (!text) return null

  // 1. Standard setpos / setpos_exact pattern
  const setposMatch = text.match(/setpos(?:_exact)?\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i)
  const setangMatch = text.match(/setang(?:_exact)?\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i)

  if (setposMatch) {
    const x = parseFloat(setposMatch[1])
    const y = parseFloat(setposMatch[2])
    const z = parseFloat(setposMatch[3])

    let pitch: number | undefined
    let yaw: number | undefined
    let roll: number | undefined

    if (setangMatch) {
      pitch = parseFloat(setangMatch[1])
      yaw = parseFloat(setangMatch[2])
      roll = parseFloat(setangMatch[3])
    }

    const command = formatSetposCommand(x, y, z, pitch, yaw, roll)

    return {
      posX: x,
      posY: y,
      posZ: z,
      angPitch: pitch,
      angYaw: yaw,
      angRoll: roll,
      consoleCommand: command,
      valid: true
    }
  }

  // 2. Player origin(...) angles(...) output format from status / developer console
  const originMatch = text.match(/origin\s*\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\)/i)
  const anglesMatch = text.match(/angles\s*\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\)/i)

  if (originMatch) {
    const x = parseFloat(originMatch[1])
    const y = parseFloat(originMatch[2])
    const z = parseFloat(originMatch[3])

    let pitch: number | undefined
    let yaw: number | undefined
    let roll: number | undefined

    if (anglesMatch) {
      pitch = parseFloat(anglesMatch[1])
      yaw = parseFloat(anglesMatch[2])
      roll = parseFloat(anglesMatch[3])
    }

    const command = formatSetposCommand(x, y, z, pitch, yaw, roll)

    return {
      posX: x,
      posY: y,
      posZ: z,
      angPitch: pitch,
      angYaw: yaw,
      angRoll: roll,
      consoleCommand: command,
      valid: true
    }
  }

  // 3. Raw numbers format: X Y Z [P Y R]
  const cleanNumbers = text.replace(/[,;]/g, ' ').match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  if (cleanNumbers && cleanNumbers.length >= 3) {
    const x = parseFloat(cleanNumbers[0])
    const y = parseFloat(cleanNumbers[1])
    const z = parseFloat(cleanNumbers[2])

    let pitch: number | undefined
    let yaw: number | undefined
    let roll: number | undefined

    if (cleanNumbers.length >= 5) {
      pitch = parseFloat(cleanNumbers[3])
      yaw = parseFloat(cleanNumbers[4])
      roll = cleanNumbers.length >= 6 ? parseFloat(cleanNumbers[5]) : 0
    }

    const command = formatSetposCommand(x, y, z, pitch, yaw, roll)

    return {
      posX: x,
      posY: y,
      posZ: z,
      angPitch: pitch,
      angYaw: yaw,
      angRoll: roll,
      consoleCommand: command,
      valid: true
    }
  }

  return null
}

/**
 * Format standard CS2 console teleport and aim command
 */
export function formatSetposCommand(x: number, y: number, z: number, pitch?: number, yaw?: number, roll?: number): string {
  const cleanX = Number(x.toFixed(2))
  const cleanY = Number(y.toFixed(2))
  const cleanZ = Number(z.toFixed(2))

  if (pitch !== undefined && yaw !== undefined) {
    const cleanP = Number(pitch.toFixed(2))
    const cleanYw = Number(yaw.toFixed(2))
    const cleanR = Number((roll || 0).toFixed(2))
    return `setpos ${cleanX} ${cleanY} ${cleanZ}; setang ${cleanP} ${cleanYw} ${cleanR}`
  }

  return `setpos ${cleanX} ${cleanY} ${cleanZ}`
}

/**
 * Converts CS2 in-game world coordinates to radar percentage (0% - 100%)
 */
export function worldToRadarCoords(worldX: number, worldY: number, mapId: string): { x: number; y: number } {
  const cleanMap = mapId.toLowerCase().replace('de_', '')
  const config = MAP_OVERVIEW_CONFIGS[cleanMap] || MAP_OVERVIEW_CONFIGS.mirage

  // Source Engine standard radar canvas: 1024x1024
  const pixelX = (worldX - config.pos_x) / config.scale
  const pixelY = (config.pos_y - worldY) / config.scale

  const pctX = Math.max(0, Math.min(100, Number(((pixelX / 1024) * 100).toFixed(2))))
  const pctY = Math.max(0, Math.min(100, Number(((pixelY / 1024) * 100).toFixed(2))))

  return { x: pctX, y: pctY }
}

/**
 * Converts radar percentage (0% - 100%) to CS2 in-game world coordinates
 */
export function radarToWorldCoords(radarX: number, radarY: number, mapId: string, z = 0): { x: number; y: number; z: number } {
  const cleanMap = mapId.toLowerCase().replace('de_', '')
  const config = MAP_OVERVIEW_CONFIGS[cleanMap] || MAP_OVERVIEW_CONFIGS.mirage

  const pixelX = (radarX / 100) * 1024
  const pixelY = (radarY / 100) * 1024

  const worldX = Number((config.pos_x + (pixelX * config.scale)).toFixed(2))
  const worldY = Number((config.pos_y - (pixelY * config.scale)).toFixed(2))

  return { x: worldX, y: worldY, z }
}
