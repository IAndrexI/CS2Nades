import type { MapRadarCalibration, Point2D } from '../types'
import {
  CS2_RADAR_CALIBRATIONS,
  clientToSvgRadarPct,
  parseGetPosCommand,
  radarToWorldCoords,
  worldToRadarCoords
} from '../core/radar/coordinateEngine'

export type RadarCalibration = MapRadarCalibration
export const MAP_CALIBRATIONS = CS2_RADAR_CALIBRATIONS
export const worldToRadarPercent = worldToRadarCoords
export const radarPercentToWorld = radarToWorldCoords
export const parseCS2Setpos = parseGetPosCommand

export function parseViewBox(viewBox = '0 0 1000 1000') {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number)
  return {
    minX: parts[0] || 0,
    minY: parts[1] || 0,
    width: parts[2] || 1000,
    height: parts[3] || 1000
  }
}

export function pctToSvg(
  coords: { x: number; y: number },
  viewBox = '0 0 1000 1000'
) {
  const vb = parseViewBox(viewBox)
  return {
    x: vb.minX + (coords.x / 100) * vb.width,
    y: vb.minY + (coords.y / 100) * vb.height
  }
}

export function clientToPct(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  return clientToSvgRadarPct(svg, clientX, clientY, true)
}

export function trajectoryPath(
  origin: { x: number; y: number },
  landing: { x: number; y: number },
  viewBox = '0 0 1000 1000',
  curveOffset = 0
): string {
  const o = pctToSvg(origin, viewBox)
  const l = pctToSvg(landing, viewBox)
  const mx = (o.x + l.x) / 2
  const my = (o.y + l.y) / 2
  const dx = l.x - o.x
  const dy = l.y - o.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const vb = parseViewBox(viewBox)
  const scale = vb.height / 1000
  const archHeight =
    Math.min(Math.max(dist * 0.25, 20 * scale), 80 * scale) + curveOffset * 2 * scale
  const cx = mx + (-dy / dist) * archHeight
  const cy = my + (dx / dist) * archHeight
  return `M ${o.x} ${o.y} Q ${cx} ${cy} ${l.x} ${l.y}`
}

export function estimateThrowDirection(
  mapId: string,
  originWorld: { x: number; y: number },
  yawDegrees: number,
  distanceUnits = 950
): Point2D {
  const rad = (yawDegrees * Math.PI) / 180
  const targetX = originWorld.x + Math.cos(rad) * distanceUnits
  const targetY = originWorld.y + Math.sin(rad) * distanceUnits
  return worldToRadarCoords(mapId, targetX, targetY)
}
