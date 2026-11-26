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
  maxCorridorReach: number
  cellHammer: number
  /** Physical corridor path distance traveled around walls (Hammer units; -1 = solid wall/unreachable) */
  pathDist: Float64Array
  /** Effective attenuated shockwave distance after hallway channeling & corner diffraction */
  effectiveDist: Float64Array
  /** Direct straight-line distance in Hammer units */
  directDist: Float64Array
  /** Precomputed CS2 shockwave damage (0% armor mitigation in Season 5 rework) */
  damage: Uint16Array
  /** Whether the cell is occluded behind a solid wall/corner from the C4 */
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
const opennessCache = new Map<string, Float32Array>()

function resolveMaskKey(mapId: string, floor?: RadarFloorId): string {
  const norm = normalizeMapId(mapId || 'mirage')
  if (norm === 'nuke' || norm === 'vertigo') {
    return floor === 'lower' ? `${norm}_lower` : `${norm}_upper`
  }
  return norm
}

function getFloorWallAndOpennessGrids(
  mapId: string,
  floor?: RadarFloorId
): { floorGrid: Uint8Array; wallGrid: Uint8Array; openness: Float32Array } {
  const key = resolveMaskKey(mapId, floor)
  let fg = floorCache.get(key)
  let wg = wallCache.get(key)
  let op = opennessCache.get(key)

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

  if (!op) {
    op = new Float32Array(10000)
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        if (fg[y * 100 + x] !== 1) continue
        let walkable = 0
        let total = 0
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx
            const ny = y + dy
            total++
            if (nx >= 0 && nx < 100 && ny >= 0 && ny < 100 && fg[ny * 100 + nx] === 1) {
              walkable++
            }
          }
        }
        op[y * 100 + x] = walkable / total
      }
    }
    opennessCache.set(key, op)
  }

  return { floorGrid: fg, wallGrid: wg, openness: op }
}

function countRayVoidCells(
  floorGrid: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  let cx = x0
  let cy = y0
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let voidHits = 0
  let step = 0

  while (true) {
    const idx = cy * 100 + cx
    if (step > 1 && floorGrid[idx] !== 1) {
      voidHits++
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
  return voidHits
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
 * Computes a 100x100 CS2 Season 5 C4 Shockwave field:
 * - Solid walls block direct shockwaves and force travel around corridors.
 * - Confined hallways/corridors channel blast pressure ~30-45% further than open-air Legacy Sphere.
 * - Tucked pockets behind solid walls near site suffer corner-wrap diffraction attenuation, allowing cover survival.
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
  const { floorGrid, openness } = getFloorWallAndOpennessGrids(mapId, floor)

  const pathDist = new Float64Array(10000).fill(-1)
  const channeledDist = new Float64Array(10000).fill(-1)
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
  channeledDist[startIdx] = 0

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
    if (channeledDist[u]! >= 0 && d > channeledDist[u]! + 1e-4) continue

    const ux = u % 100
    const uy = Math.floor(u / 100)

    for (const [dx, dy, stepMult] of neighbors) {
      const nx = ux + dx!
      const ny = uy + dy!
      if (nx < 0 || nx >= 100 || ny < 0 || ny >= 100) continue
      const v = ny * 100 + nx
      if (floorGrid[v] !== 1) continue

      const stepPhys = stepMult! * cellHammer
      // Confined hallways channel the blast pressure further (~0.64-0.76x distance decay vs open areas)
      const open = openness[v]!
      const channelFactor = open < 0.48 ? 0.62 : open < 0.72 ? 0.74 : 0.90
      const nextChanneled = d + stepPhys * channelFactor
      if (nextChanneled > maxBlastRadius * 1.15) continue

      if (channeledDist[v]! < 0 || nextChanneled + 1e-4 < channeledDist[v]!) {
        channeledDist[v] = nextChanneled
        pathDist[v] = pathDist[u]! + stepPhys
        parentIdx[v] = u
        pushHeap(v, nextChanneled)
      }
    }
  }

  let maxCorridorReach = maxBlastRadius

  for (let cy = 0; cy < 100; cy++) {
    for (let cx = 0; cx < 100; cx++) {
      const idx = cy * 100 + cx
      const rawDirect = Math.hypot(cx - startX, cy - startY) * cellHammer
      directDist[idx] = rawDirect

      const pDist = pathDist[idx]!
      const cDist = channeledDist[idx]!
      if (pDist < 0 || cDist < 0) {
        effectiveDist[idx] = -1
        damage[idx] = 0
        continue
      }

      const voidHits = countRayVoidCells(floorGrid, startX, startY, cx, cy)
      const wrapRatio = rawDirect > cellHammer ? pDist / rawDirect : 1
      const isOccluded = voidHits > 0 || wrapRatio > 1.25

      if (!isOccluded) {
        behindWall[idx] = 0
        effectiveDist[idx] = cDist
      } else {
        behindWall[idx] = 1
        // Sharp corner wrap around solid walls (high wrapRatio near site) saps blast energy;
        // long straight hallways further out retain their channeled corridor reach.
        const bendAttenuation = Math.max(0, wrapRatio - 1.18) * 760
        const wallShield = Math.min(cellHammer * 4.5, voidHits * cellHammer * 0.55)
        effectiveDist[idx] = cDist + bendAttenuation + wallShield
      }

      const dmg = computeGaussianDamage(effectiveDist[idx]!, bombRadius)
      damage[idx] = dmg
      if (dmg > 0 && pDist > maxCorridorReach) {
        maxCorridorReach = pDist
      }
    }
  }

  return {
    mapId,
    floor,
    bombCellX: startX,
    bombCellY: startY,
    bombRadius,
    maxBlastRadius,
    maxCorridorReach: Math.round(maxCorridorReach),
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
