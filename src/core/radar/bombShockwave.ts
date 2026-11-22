import type { Point2D, RadarFloorId } from '../../types'
import { getMapCalibration } from './coordinateEngine'
import { getPlayableMaskGrid } from './mapBounds'

export interface BombShockwaveField {
  mapId: string
  floor?: RadarFloorId
  bombCellX: number
  bombCellY: number
  bombRadius: number
  maxBlastRadius: number
  cellHammer: number
  /** Playable shockwave path distance in Hammer units (-1 = unreachable / solid wall) */
  pathDist: Float32Array
  /** Effective attenuated shockwave distance in Hammer units */
  effectiveDist: Float32Array
  /** Direct straight-line distance in Hammer units */
  directDist: Float32Array
  /** Precomputed CS2 shockwave damage (0% armor mitigation in Season 5 rework) */
  damage: Uint16Array
  /** Whether the cell is occluded behind a solid wall from the C4 */
  behindWall: Uint8Array
  /** Parent cell index for path reconstruction */
  parentIdx: Int32Array
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function hasGridLineOfSight(
  grid: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  let cx = x0
  let cy = y0
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    if (grid[cy * 100 + cx] !== 1) return false
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
  }
  return true
}

function computeGaussianDamage(effectiveDist: number, bombRadius: number): number {
  const maxR = bombRadius * 3.5
  if (effectiveDist > maxR) return 0
  const sigma = maxR / 3
  return Math.max(0, Math.round(bombRadius * Math.exp(-(effectiveDist * effectiveDist) / (2 * sigma * sigma))))
}

/**
 * Computes a 100x100 CS2 C4 Shockwave propagation field from the planted bomb,
 * respecting solid map walls and attenuating blast energy around corners.
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
  const grid = getPlayableMaskGrid(mapId, floor)

  const pathDist = new Float32Array(10000).fill(-1)
  const effectiveDist = new Float32Array(10000).fill(-1)
  const directDist = new Float32Array(10000)
  const damage = new Uint16Array(10000)
  const behindWall = new Uint8Array(10000)
  const parentIdx = new Int32Array(10000).fill(-1)

  let startX = clamp(Math.floor(bombCoords.x), 0, 99)
  let startY = clamp(Math.floor(bombCoords.y), 0, 99)

  // Snap start cell to nearest playable cell if bomb is on a wall edge
  if (grid && grid[startY * 100 + startX] !== 1) {
    let bestD = Infinity
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = startX + dx
          const ny = startY + dy
          if (nx >= 0 && nx < 100 && ny >= 0 && ny < 100 && grid[ny * 100 + nx] === 1) {
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

  // Min-heap priority queue for 8-connected Dijkstra
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
    if (d > pathDist[u]! && pathDist[u]! >= 0) continue

    const ux = u % 100
    const uy = Math.floor(u / 100)

    for (const [dx, dy, stepMult] of neighbors) {
      const nx = ux + dx!
      const ny = uy + dy!
      if (nx < 0 || nx >= 100 || ny < 0 || ny >= 100) continue
      const v = ny * 100 + nx
      if (grid && grid[v] !== 1) continue

      const nextD = d + stepMult! * cellHammer
      if (nextD > maxBlastRadius * 1.35) continue
      if (pathDist[v]! < 0 || nextD < pathDist[v]!) {
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

      const los = grid ? hasGridLineOfSight(grid, startX, startY, cx, cy) : true
      if (los) {
        behindWall[idx] = 0
        effectiveDist[idx] = pDist
      } else {
        behindWall[idx] = 1
        // Corner & wall diffraction sap shockwave energy
        effectiveDist[idx] = pDist * 1.38
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

/**
 * Reconstructs the shortest corridor path the shockwave travels around walls
 * from the C4 to the target coordinate (in 0-100% radar coordinates).
 */
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
 * Renders the 100x100 shockwave damage field into a smooth color-coded heatmap data URL.
 */
export function renderShockwaveHeatmapDataUrl(
  field: BombShockwaveField,
  playerHp: number
): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const img = ctx.createImageData(100, 100)
  const data = img.data

  for (let i = 0; i < 10000; i++) {
    const dmg = field.damage[i]!
    const off = i * 4
    if (dmg <= 0) {
      data[off + 3] = 0
      continue
    }

    let r = 16
    let g = 185
    let b = 129
    let a = 78

    if (dmg >= playerHp) {
      // Lethal blast
      r = 239
      g = 68
      b = 68
      a = 138
    } else if (dmg >= 75) {
      r = 249
      g = 115
      b = 22
      a = 118
    } else if (dmg >= 50) {
      r = 245
      g = 158
      b = 11
      a = 102
    } else if (dmg >= 25) {
      r = 234
      g = 179
      b = 8
      a = 86
    }

    data[off] = r
    data[off + 1] = g
    data[off + 2] = b
    data[off + 3] = a
  }

  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}
