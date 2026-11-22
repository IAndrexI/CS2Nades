import type { Point2D, RadarFloorId } from '../../types'
import { getMapCalibration, normalizeMapId } from './coordinateEngine'
import { getPlayableMaskGrid } from './mapBounds'
import { RADAR_FLOOR_MASKS_B64, RADAR_WALL_COVER_MASKS_B64 } from './radarObstacleMasks'

export interface BombShockwaveField {
  mapId: string
  floor?: RadarFloorId
  bombCellX: number
  bombCellY: number
  bombRadius: number
  maxBlastRadius: number
  cellHammer: number
  /** Playable shockwave path distance in Hammer units (-1 = unreachable / solid wall) */
  pathDist: Float64Array
  /** Effective attenuated shockwave distance in Hammer units */
  effectiveDist: Float64Array
  /** Direct straight-line distance in Hammer units */
  directDist: Float64Array
  /** Precomputed CS2 shockwave damage (0% armor mitigation in Season 5 rework) */
  damage: Uint16Array
  /** Whether the cell is occluded behind a solid wall or cover box from the C4 */
  behindWall: Uint8Array
  /** Parent cell index for path reconstruction */
  parentIdx: Int32Array
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function decodeMaskB64(b64: string): Uint8Array {
  let bytes: Uint8Array
  if (typeof globalThis.atob === 'function') {
    const bin = globalThis.atob(b64)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } else {
    const buf = (globalThis as unknown as { Buffer?: { from(s: string, e: string): Uint8Array } }).Buffer
    bytes = buf ? new Uint8Array(buf.from(b64, 'base64')) : new Uint8Array(1250)
  }
  const grid = new Uint8Array(10000)
  for (let i = 0; i < 10000; i++) {
    if (((bytes[i >> 3] ?? 0) & (1 << (i & 7))) !== 0) grid[i] = 1
  }
  return grid
}

const floorCache = new Map<string, Uint8Array>()
const wallCache = new Map<string, Uint8Array>()

function resolveMaskKey(mapId: string, floor?: RadarFloorId): string {
  const norm = normalizeMapId(mapId || 'mirage')
  if (norm === 'nuke' || norm === 'vertigo') {
    return floor === 'lower' ? `${norm}_lower` : `${norm}_upper`
  }
  return norm
}

function getFloorAndWallGrids(
  mapId: string,
  floor?: RadarFloorId
): { floorGrid: Uint8Array; wallGrid: Uint8Array } {
  const key = resolveMaskKey(mapId, floor)
  let fg = floorCache.get(key)
  let wg = wallCache.get(key)
  if (!fg) {
    const fb64 = RADAR_FLOOR_MASKS_B64[key]
    if (fb64) {
      fg = decodeMaskB64(fb64)
      const playable = getPlayableMaskGrid(mapId, floor)
      if (playable) {
        for (let i = 0; i < 10000; i++) {
          if (playable[i] === 1) fg[i] = 1
        }
      }
    } else {
      fg = getPlayableMaskGrid(mapId, floor) ?? new Uint8Array(10000).fill(1)
    }
    floorCache.set(key, fg)
  }
  if (!wg) {
    const wb64 = RADAR_WALL_COVER_MASKS_B64[key]
    wg = wb64 ? decodeMaskB64(wb64) : new Uint8Array(10000)
    wallCache.set(key, wg)
  }
  return { floorGrid: fg, wallGrid: wg }
}

function countRayObstacles(
  floorGrid: Uint8Array,
  wallGrid: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): { voidHits: number; wallHits: number } {
  let cx = x0
  let cy = y0
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let voidHits = 0
  let wallHits = 0
  let step = 0

  while (true) {
    const idx = cy * 100 + cx
    if (step > 1) {
      if (floorGrid[idx] !== 1) voidHits++
      else if (wallGrid[idx] === 1) wallHits++
    }
    if (cx === x1 && cy === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      cx += sx
    }
    if (e2 < dx) {
      err += dx
      cy += sy
    }
    step++
  }
  return { voidHits, wallHits }
}

function computeGaussianDamage(effectiveDist: number, bombRadius: number): number {
  const maxR = bombRadius * 3.5
  if (effectiveDist < 0 || effectiveDist > maxR) return 0
  const sigma = maxR / 3
  return Math.max(
    0,
    Math.round(bombRadius * Math.exp(-(effectiveDist * effectiveDist) / (2 * sigma * sigma)))
  )
}

/**
 * Computes a 100x100 CS2 C4 Shockwave propagation field from the planted bomb,
 * respecting solid map walls, cover boxes, and attenuating blast energy around corners.
 */
export function computeBombShockwaveField(
  mapId: string,
  bombCoords: Point2D,
  bombRadius: number,
  floor?: RadarFloorId
): BombShockwaveField {
  const cal = getMapCalibration(mapId)
  const cellHammer = 10.24 * (cal.scale || 5.0)
  const maxBlastRadius = bombRadius * 3.5
  const { floorGrid, wallGrid } = getFloorAndWallGrids(mapId, floor)

  const pathDist = new Float64Array(10000).fill(-1)
  const effectiveDist = new Float64Array(10000).fill(-1)
  const directDist = new Float64Array(10000)
  const damage = new Uint16Array(10000)
  const behindWall = new Uint8Array(10000)
  const parentIdx = new Int32Array(10000).fill(-1)

  let startX = clamp(Math.floor(bombCoords.x), 0, 99)
  let startY = clamp(Math.floor(bombCoords.y), 0, 99)

  if (floorGrid[startY * 100 + startX] !== 1) {
    let bestD = Infinity
    for (let r = 1; r <= 10; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = startX + dx
          const ny = startY + dy
          if (nx >= 0 && nx < 100 && ny >= 0 && ny < 100 && floorGrid[ny * 100 + nx] === 1) {
            const d = dx * dx + dy * dy
            if (d < bestD) {
              bestD = d
              startX = nx
              startY = ny
            }
          }
        }
      }
      if (bestD < Infinity) break
    }
  }

  const startIdx = startY * 100 + startX
  pathDist[startIdx] = 0

  const heapIdx: number[] = [startIdx]
  const heapDist: number[] = [0]

  const pushHeap = (idx: number, dist: number) => {
    heapIdx.push(idx)
    heapDist.push(dist)
    let i = heapIdx.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heapDist[p]! <= heapDist[i]!) break
      ;[heapIdx[p], heapIdx[i]] = [heapIdx[i]!, heapIdx[p]!]
      ;[heapDist[p], heapDist[i]] = [heapDist[i]!, heapDist[p]!]
      i = p
    }
  }

  const popHeap = (): [number, number] | null => {
    if (heapIdx.length === 0) return null
    const topIdx = heapIdx[0]!
    const topDist = heapDist[0]!
    const lastIdx = heapIdx.pop()!
    const lastDist = heapDist.pop()!
    if (heapIdx.length > 0) {
      heapIdx[0] = lastIdx
      heapDist[0] = lastDist
      let i = 0
      const len = heapIdx.length
      while (true) {
        const l = i * 2 + 1
        const r = i * 2 + 2
        let smallest = i
        if (l < len && heapDist[l]! < heapDist[smallest]!) smallest = l
        if (r < len && heapDist[r]! < heapDist[smallest]!) smallest = r
        if (smallest === i) break
        ;[heapIdx[i], heapIdx[smallest]] = [heapIdx[smallest]!, heapIdx[i]!]
        ;[heapDist[i], heapDist[smallest]] = [heapDist[smallest]!, heapDist[i]!]
        i = smallest
      }
    }
    return [topIdx, topDist]
  }

  const neighbors = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2]
  ]

  while (heapIdx.length > 0) {
    const popped = popHeap()
    if (!popped) break
    const [u, d] = popped
    if (pathDist[u]! >= 0 && d > pathDist[u]! + 1e-4) continue

    const ux = u % 100
    const uy = Math.floor(u / 100)

    for (const [dx, dy, stepMult] of neighbors) {
      const nx = ux + dx!
      const ny = uy + dy!
      if (nx < 0 || nx >= 100 || ny < 0 || ny >= 100) continue
      const v = ny * 100 + nx
      if (floorGrid[v] !== 1) continue

      const coverPenalty = wallGrid[v] === 1 ? cellHammer * 1.45 : 0
      const nextD = d + stepMult! * cellHammer + coverPenalty
      if (nextD > maxBlastRadius * 1.65) continue
      if (pathDist[v]! < 0 || nextD + 1e-4 < pathDist[v]!) {
        pathDist[v] = nextD
        parentIdx[v] = u
        pushHeap(v, nextD)
      }
    }
  }

  for (let cy = 0; cy < 100; cy++) {
    for (let cx = 0; cx < 100; cx++) {
      const idx = cy * 100 + cx
      const rawDirect = Math.hypot(cx - startX, cy - startY) * cellHammer
      directDist[idx] = rawDirect

      const pDist = pathDist[idx]!
      if (pDist < 0) {
        effectiveDist[idx] = -1
        damage[idx] = 0
        continue
      }

      const { voidHits, wallHits } = countRayObstacles(floorGrid, wallGrid, startX, startY, cx, cy)
      const detour = Math.max(0, pDist - rawDirect)

      if (voidHits === 0 && wallHits === 0 && detour < cellHammer * 0.85) {
        behindWall[idx] = 0
        effectiveDist[idx] = rawDirect
      } else {
        behindWall[idx] = 1
        const wallAbsorption = voidHits * (cellHammer * 3.2) + wallHits * (cellHammer * 1.85)
        const cornerAbsorption = detour * 1.65
        effectiveDist[idx] = rawDirect + wallAbsorption + cornerAbsorption
      }

      damage[idx] = computeGaussianDamage(effectiveDist[idx]!, bombRadius)
    }
  }

  return {
    mapId,
    floor,
    bombCellX: startX,
    bombCellY: startY,
    bombRadius,
    maxBlastRadius,
    cellHammer,
    pathDist,
    effectiveDist,
    directDist,
    damage,
    behindWall,
    parentIdx
  }
}

export function traceShockwavePath(
  field: BombShockwaveField,
  targetCoords: Point2D
): Point2D[] {
  const tx = clamp(Math.floor(targetCoords.x), 0, 99)
  const ty = clamp(Math.floor(targetCoords.y), 0, 99)
  let curr = ty * 100 + tx
  if (field.pathDist[curr]! < 0) return []

  const pts: Point2D[] = []
  let guard = 0
  while (curr >= 0 && guard < 400) {
    guard++
    const cx = (curr % 100) + 0.5
    const cy = Math.floor(curr / 100) + 0.5
    pts.push({ x: cx, y: cy })
    if (curr === field.bombCellY * 100 + field.bombCellX) break
    curr = field.parentIdx[curr]!
  }
  return pts.reverse()
}

/**
 * Renders the shockwave damage field into a smooth 256x256 bilinearly-interpolated
 * color-coded heatmap data URL.
 */
export function renderShockwaveHeatmapDataUrl(
  field: BombShockwaveField,
  playerHp: number
): string {
  if (typeof document === 'undefined') return ''
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const img = ctx.createImageData(size, size)
  const data = img.data

  for (let py = 0; py < size; py++) {
    const gy = (py / size) * 99
    const y0 = Math.floor(gy)
    const y1 = Math.min(99, y0 + 1)
    const ty = gy - y0

    for (let px = 0; px < size; px++) {
      const gx = (px / size) * 99
      const x0 = Math.floor(gx)
      const x1 = Math.min(99, x0 + 1)
      const tx = gx - x0

      const i00 = y0 * 100 + x0
      const i10 = y0 * 100 + x1
      const i01 = y1 * 100 + x0
      const i11 = y1 * 100 + x1

      if (field.pathDist[i00]! < 0 && field.pathDist[i11]! < 0) continue

      const d00 = field.damage[i00]!
      const d10 = field.damage[i10]!
      const d01 = field.damage[i01]!
      const d11 = field.damage[i11]!

      const dmg =
        d00 * (1 - tx) * (1 - ty) +
        d10 * tx * (1 - ty) +
        d01 * (1 - tx) * ty +
        d11 * tx * ty

      if (dmg < 1) continue

      const off = (py * size + px) * 4
      if (dmg >= playerHp) {
        data[off] = 239
        data[off + 1] = 68
        data[off + 2] = 68
        data[off + 3] = 152
      } else if (dmg >= 75) {
        data[off] = 249
        data[off + 1] = 115
        data[off + 2] = 22
        data[off + 3] = 132
      } else if (dmg >= 50) {
        data[off] = 245
        data[off + 1] = 158
        data[off + 2] = 11
        data[off + 3] = 115
      } else if (dmg >= 25) {
        data[off] = 234
        data[off + 1] = 179
        data[off + 2] = 8
        data[off + 3] = 96
      } else {
        data[off] = 16
        data[off + 1] = 185
        data[off + 2] = 129
        data[off + 3] = 88
      }
    }
  }

  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}
