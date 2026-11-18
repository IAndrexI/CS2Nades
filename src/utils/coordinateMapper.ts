import type { Point2D } from '../types'
import {
  CS2_RADAR_CALIBRATIONS,
  clientToSvgRadarPct,
  computeTrajectoryArc,
  estimateLandingWorldCoords,
  formatSetPosCommand,
  generateLineupPracticeScript,
  parseGetPosCommand,
  radarToWorldCoords as engineRadarToWorld,
  resolveRadarFloor,
  worldToRadarCoords as engineWorldToRadar
} from '../core/radar/coordinateEngine'

export interface MapOverviewConfig {
  pos_x: number
  pos_y: number
  scale: number
}

export const MAP_OVERVIEW_CONFIGS: Record<string, MapOverviewConfig> = {
  ...CS2_RADAR_CALIBRATIONS,
  boulder: { pos_x: -3000, pos_y: 3000, scale: 5.0 },
  fachwerk: { pos_x: -2500, pos_y: 2500, scale: 5.0 },
  shelter: { pos_x: -3000, pos_y: 3000, scale: 5.0 }
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

export function formatSetposCommand(
  x: number,
  y: number,
  z: number,
  pitch?: number,
  yaw?: number,
  roll?: number
): string {
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

export function parseCS2Pos(input: string): ParsedCS2Pos | null {
  if (!input || typeof input !== 'string') return null
  const text = input.trim()
  if (!text) return null

  const setposMatch = text.match(/setpos(?:_exact)?\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i)
  const setangMatch = text.match(/setang(?:_exact)?\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i)

  if (setposMatch) {
    const x = parseFloat(setposMatch[1] ?? '0')
    const y = parseFloat(setposMatch[2] ?? '0')
    const z = parseFloat(setposMatch[3] ?? '0')
    const pitch = setangMatch ? parseFloat(setangMatch[1] ?? '0') : undefined
    const yaw = setangMatch ? parseFloat(setangMatch[2] ?? '0') : undefined
    const roll = setangMatch ? parseFloat(setangMatch[3] ?? '0') : undefined

    return {
      posX: x,
      posY: y,
      posZ: z,
      angPitch: pitch,
      angYaw: yaw,
      angRoll: roll,
      consoleCommand: formatSetposCommand(x, y, z, pitch, yaw, roll),
      valid: true
    }
  }

  const originMatch = text.match(/origin\s*\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\)/i)
  const anglesMatch = text.match(/angles\s*\(\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\)/i)

  if (originMatch) {
    const x = parseFloat(originMatch[1] ?? '0')
    const y = parseFloat(originMatch[2] ?? '0')
    const z = parseFloat(originMatch[3] ?? '0')
    const pitch = anglesMatch ? parseFloat(anglesMatch[1] ?? '0') : undefined
    const yaw = anglesMatch ? parseFloat(anglesMatch[2] ?? '0') : undefined
    const roll = anglesMatch ? parseFloat(anglesMatch[3] ?? '0') : undefined

    return {
      posX: x,
      posY: y,
      posZ: z,
      angPitch: pitch,
      angYaw: yaw,
      angRoll: roll,
      consoleCommand: formatSetposCommand(x, y, z, pitch, yaw, roll),
      valid: true
    }
  }

  const cleanNumbers = text.replace(/[,;]/g, ' ').match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  if (cleanNumbers && cleanNumbers.length >= 3) {
    const x = parseFloat(cleanNumbers[0] ?? '0')
    const y = parseFloat(cleanNumbers[1] ?? '0')
    const z = parseFloat(cleanNumbers[2] ?? '0')
    const pitch = cleanNumbers.length >= 5 ? parseFloat(cleanNumbers[3] ?? '0') : undefined
    const yaw = cleanNumbers.length >= 5 ? parseFloat(cleanNumbers[4] ?? '0') : undefined
    const roll = cleanNumbers.length >= 6 ? parseFloat(cleanNumbers[5] ?? '0') : 0

    return {
      posX: x,
      posY: y,
      posZ: z,
      angPitch: pitch,
      angYaw: yaw,
      angRoll: roll,
      consoleCommand: formatSetposCommand(x, y, z, pitch, yaw, roll),
      valid: true
    }
  }

  return null
}

/**
 * Supports both `(worldX, worldY, mapId)` and `(mapId, worldX, worldY)`.
 */
export function worldToRadarCoords(
  a: number | string,
  b: number,
  c: string | number
): Point2D {
  if (typeof a === 'string') {
    return engineWorldToRadar(a, b, Number(c))
  }
  return engineWorldToRadar(String(c), a, b)
}

/**
 * Supports both `(radarX, radarY, mapId, z)` and `(mapId, radarPoint, defaultZ)`.
 */
export function radarToWorldCoords(
  a: number | string,
  b: number | Point2D,
  c?: string | number,
  d = 0
): { x: number; y: number; z: number } {
  if (typeof a === 'string' && typeof b === 'object') {
    return engineRadarToWorld(a, b, typeof c === 'number' ? c : 0)
  }
  return engineRadarToWorld(String(c || 'mirage'), { x: Number(a), y: Number(b) }, d)
}

export {
  parseGetPosCommand,
  estimateLandingWorldCoords,
  formatSetPosCommand,
  generateLineupPracticeScript,
  resolveRadarFloor,
  clientToSvgRadarPct,
  computeTrajectoryArc
}
