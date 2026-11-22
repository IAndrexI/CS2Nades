import type { Point2D, RadarFloorId } from '../../types'
import { getPlayableMaskGrid } from './mapBounds'

export interface CalloutZoneSeed {
  id: string
  name: string
  coords: Point2D
  floor?: RadarFloorId
  polygon?: Point2D[]
  box?: { x: number; y: number; width: number; height: number }
}

export interface ComputedCalloutZone {
  id: string
  svgPoints: string
  pctPoints: Point2D[]
  labelX: number
  labelY: number
  fontSize: number
  labelMode: 'inside' | 'outside'
  leaderFrom?: Point2D
  leaderTo?: Point2D
}

const zoneCache = new Map<string, Map<string, ComputedCalloutZone>>()

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function buildFallbackOctagon(cxPct: number, cyPct: number, rx = 3.2, ry = 3.2): Point2D[] {
  const pts: Point2D[] = []
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4
    pts.push({
      x: Number(clamp(cxPct + Math.cos(ang) * rx, 1, 99).toFixed(2)),
      y: Number(clamp(cyPct + Math.sin(ang) * ry, 1, 99).toFixed(2))
    })
  }
  return pts
}

function simplifyCollinearAndRdp(pts: Point2D[], epsilon = 0.45): Point2D[] {
  if (pts.length <= 3) return pts

  // 1. Remove collinear points
  const noCollinear: Point2D[] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n]!
    const curr = pts[i]!
    const next = pts[(i + 1) % n]!
    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y
    const cross = Math.abs(dx1 * dy2 - dy1 * dx2)
    if (cross > 1e-4) {
      noCollinear.push(curr)
    }
  }
  const base = noCollinear.length >= 3 ? noCollinear : pts

  // 2. Closed-loop RDP
  function perpDist(p: Point2D, a: Point2D, b: Point2D): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq, 0, 1)
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
  }

  function rdpSlice(slice: Point2D[]): Point2D[] {
    if (slice.length <= 2) return slice
    let maxD = -1
    let maxIdx = 0
    const first = slice[0]!
    const last = slice[slice.length - 1]!
    for (let i = 1; i < slice.length - 1; i++) {
      const d = perpDist(slice[i]!, first, last)
      if (d > maxD) {
        maxD = d
        maxIdx = i
      }
    }
    if (maxD > epsilon) {
      const left = rdpSlice(slice.slice(0, maxIdx + 1))
      const right = rdpSlice(slice.slice(maxIdx))
      return [...left.slice(0, -1), ...right]
    }
    return [first, last]
  }

  const half = Math.floor(base.length / 2)
  const part1 = rdpSlice([...base.slice(0, half + 1)])
  const part2 = rdpSlice([...base.slice(half), base[0]!])
  const merged = [...part1.slice(0, -1), ...part2.slice(0, -1)]
  return merged.length >= 3 ? merged : base
}

function chaikinSmoothClosed(pts: Point2D[], iterations = 1): Point2D[] {
  let current = pts
  for (let it = 0; it < iterations; it++) {
    if (current.length < 3 || current.length > 120) break
    const next: Point2D[] = []
    const n = current.length
    for (let i = 0; i < n; i++) {
      const a = current[i]!
      const b = current[(i + 1) % n]!
      next.push({
        x: Number((a.x * 0.75 + b.x * 0.25).toFixed(2)),
        y: Number((a.y * 0.75 + b.y * 0.25).toFixed(2))
      })
      next.push({
        x: Number((a.x * 0.25 + b.x * 0.75).toFixed(2)),
        y: Number((a.y * 0.25 + b.y * 0.75).toFixed(2))
      })
    }
    current = next
  }
  return current
}

function traceLargestBoundaryLoop(cellSet: Set<number>): Point2D[] {
  if (cellSet.size === 0) return []

  // Directed boundary edges on 100x100 grid (clockwise around filled cells)
  const edges = new Map<number, number[]>()
  const pack = (x: number, y: number) => y * 101 + x

  const addEdge = (x1: number, y1: number, x2: number, y2: number) => {
    const k1 = pack(x1, y1)
    const k2 = pack(x2, y2)
    const arr = edges.get(k1)
    if (arr) arr.push(k2)
    else edges.set(k1, [k2])
  }

  for (const idx of cellSet) {
    const cx = idx % 100
    const cy = Math.floor(idx / 100)
    if (!cellSet.has((cy - 1) * 100 + cx)) addEdge(cx, cy, cx + 1, cy)
    if (!cellSet.has(cy * 100 + (cx + 1))) addEdge(cx + 1, cy, cx + 1, cy + 1)
    if (!cellSet.has((cy + 1) * 100 + cx)) addEdge(cx + 1, cy + 1, cx, cy + 1)
    if (!cellSet.has(cy * 100 + (cx - 1))) addEdge(cx, cy + 1, cx, cy)
  }

  let bestLoop: Point2D[] = []
  let bestArea = -1

  while (edges.size > 0) {
    const startKey = edges.keys().next().value as number | undefined
    if (startKey === undefined) break

    const loop: Point2D[] = []
    let curr = startKey
    let guard = 0
    while (guard < 4000) {
      guard++
      const vx = curr % 101
      const vy = Math.floor(curr / 101)
      loop.push({ x: vx, y: vy })

      const nextList = edges.get(curr)
      if (!nextList || nextList.length === 0) {
        edges.delete(curr)
        break
      }
      const next = nextList.pop()!
      if (nextList.length === 0) edges.delete(curr)
      curr = next
      if (curr === startKey) break
    }

    if (loop.length >= 3) {
      let area = 0
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i]!
        const b = loop[(i + 1) % loop.length]!
        area += a.x * b.y - b.x * a.y
      }
      area = Math.abs(area) * 0.5
      if (area > bestArea) {
        bestArea = area
        bestLoop = loop
      }
    }
  }

  if (bestLoop.length < 3) return []
  const simplified = simplifyCollinearAndRdp(bestLoop, 0.45)
  const smoothed = chaikinSmoothClosed(simplified, 1)
  return simplifyCollinearAndRdp(smoothed, 0.3)
}

function buildZoneStats(
  id: string,
  name: string,
  pctPoints: Point2D[],
  fallbackCoords: Point2D
): ComputedCalloutZone {
  const safePts = pctPoints.length >= 3 ? pctPoints : buildFallbackOctagon(fallbackCoords.x, fallbackCoords.y)
  const svgPoints = safePts
    .map((p) => `${(p.x * 10).toFixed(1)},${(p.y * 10).toFixed(1)}`)
    .join(' ')

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let sumX = 0
  let sumY = 0
  for (const p of safePts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
    sumX += p.x
    sumY += p.y
  }

  const widthPct = maxX - minX
  const heightPct = maxY - minY
  const cxPct = sumX / safePts.length
  const cyPct = sumY / safePts.length

  const labelX = Number((cxPct * 10).toFixed(1))
  const labelY = Number((cyPct * 10).toFixed(1))

  const isNarrow = widthPct < 5.5 || heightPct < 4.5
  const fontSize = Math.round(clamp(Math.min(widthPct * 1.45, 13), 8.5, 12.5))

  if (isNarrow) {
    const offsetY = cyPct > 14 ? -42 : 42
    return {
      id,
      svgPoints,
      pctPoints: safePts,
      labelX,
      labelY: Number(clamp(labelY + offsetY, 24, 976).toFixed(1)),
      fontSize: 9.5,
      labelMode: 'outside',
      leaderFrom: { x: labelX, y: Number(clamp(labelY + offsetY * 0.72, 24, 976).toFixed(1)) },
      leaderTo: { x: labelX, y: labelY }
    }
  }

  // Slightly scale down font for long names
  const lenPenalty = name.length > 14 ? 1.5 : name.length > 10 ? 0.8 : 0
  return {
    id,
    svgPoints,
    pctPoints: safePts,
    labelX,
    labelY,
    fontSize: Number(Math.max(8.5, fontSize - lenPenalty).toFixed(1)),
    labelMode: 'inside'
  }
}

/**
 * Computes map-shape-conforming SVG polygons for all callouts on a map/floor
 * using multi-source Geodesic BFS over the 100x100 playable radar mask.
 */
export function computeMapCalloutZones(
  mapId: string,
  callouts: CalloutZoneSeed[],
  floor?: RadarFloorId
): Map<string, ComputedCalloutZone> {
  const cacheKey = `${mapId}:${floor || 'default'}:${callouts.map((c) => `${c.id}:${c.coords.x},${c.coords.y}`).join('|')}`
  const cached = zoneCache.get(cacheKey)
  if (cached) return cached

  const result = new Map<string, ComputedCalloutZone>()
  if (callouts.length === 0) return result

  const grid = getPlayableMaskGrid(mapId, floor)
  if (!grid) {
    for (const c of callouts) {
      const pts = c.polygon && c.polygon.length >= 3 ? c.polygon : buildFallbackOctagon(c.coords.x, c.coords.y)
      result.set(c.id, buildZoneStats(c.id, c.name, pts, c.coords))
    }
    zoneCache.set(cacheKey, result)
    return result
  }

  // Multi-source Geodesic BFS: owner[cell] = index of callout in `callouts`
  const owner = new Int16Array(10000).fill(-1)
  const dist = new Int16Array(10000).fill(32767)
  const queueX = new Uint8Array(10000)
  const queueY = new Uint8Array(10000)
  let head = 0
  let tail = 0

  const findNearestPlayable = (sx: number, sy: number): number => {
    const cx = clamp(Math.floor(sx), 0, 99)
    const cy = clamp(Math.floor(sy), 0, 99)
    if (grid[cy * 100 + cx] === 1) return cy * 100 + cx
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx >= 0 && nx < 100 && ny >= 0 && ny < 100 && grid[ny * 100 + nx] === 1) {
            return ny * 100 + nx
          }
        }
      }
    }
    return cy * 100 + cx
  }

  for (let i = 0; i < callouts.length; i++) {
    const c = callouts[i]!
    if (c.polygon && c.polygon.length >= 3) continue
    const startIdx = findNearestPlayable(c.coords.x, c.coords.y)
    if (owner[startIdx] === -1) {
      owner[startIdx] = i
      dist[startIdx] = 0
      queueX[tail] = startIdx % 100
      queueY[tail] = Math.floor(startIdx / 100)
      tail++
    }
  }

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ]

  while (head < tail) {
    const x = queueX[head]!
    const y = queueY[head]!
    head++
    const idx = y * 100 + x
    const nextDist = dist[idx]! + 1
    if (nextDist > 16) continue // Cap region radius so zones stay tight around each callout

    for (const [dx, dy] of dirs) {
      const nx = x + dx!
      const ny = y + dy!
      if (nx < 0 || nx >= 100 || ny < 0 || ny >= 100) continue
      const nIdx = ny * 100 + nx
      if (grid[nIdx] !== 1) continue
      if (nextDist < dist[nIdx]!) {
        dist[nIdx] = nextDist
        owner[nIdx] = owner[idx]!
        queueX[tail] = nx
        queueY[tail] = ny
        tail++
      }
    }
  }

  const cellsByCallout = new Map<number, Set<number>>()
  for (let idx = 0; idx < 10000; idx++) {
    const o = owner[idx]!
    if (o >= 0) {
      let set = cellsByCallout.get(o)
      if (!set) {
        set = new Set<number>()
        cellsByCallout.set(o, set)
      }
      set.add(idx)
    }
  }

  for (let i = 0; i < callouts.length; i++) {
    const c = callouts[i]!
    if (c.polygon && c.polygon.length >= 3) {
      result.set(c.id, buildZoneStats(c.id, c.name, c.polygon, c.coords))
      continue
    }
    const cellSet = cellsByCallout.get(i)
    const loop = cellSet && cellSet.size >= 2 ? traceLargestBoundaryLoop(cellSet) : []
    const pts = loop.length >= 3 ? loop : buildFallbackOctagon(c.coords.x, c.coords.y)
    result.set(c.id, buildZoneStats(c.id, c.name, pts, c.coords))
  }

  if (zoneCache.size > 40) zoneCache.clear()
  zoneCache.set(cacheKey, result)
  return result
}

/**
 * Clips a user-dragged rectangular box to the map's playable 100x100 mask
 * so custom Personal Callout boxes conform cleanly to the map's walls.
 */
export function clipBoxToMapPolygon(
  mapId: string,
  box: { x: number; y: number; width: number; height: number },
  floor?: RadarFloorId
): Point2D[] {
  const grid = getPlayableMaskGrid(mapId, floor)
  const x0 = clamp(Math.floor(box.x), 0, 99)
  const y0 = clamp(Math.floor(box.y), 0, 99)
  const x1 = clamp(Math.ceil(box.x + box.width), 0, 99)
  const y1 = clamp(Math.ceil(box.y + box.height), 0, 99)

  if (grid) {
    const cellSet = new Set<number>()
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (grid[cy * 100 + cx] === 1) {
          cellSet.add(cy * 100 + cx)
        }
      }
    }
    if (cellSet.size >= 3) {
      const loop = traceLargestBoundaryLoop(cellSet)
      if (loop.length >= 3) return loop
    }
  }

  return [
    { x: Number(box.x.toFixed(2)), y: Number(box.y.toFixed(2)) },
    { x: Number((box.x + box.width).toFixed(2)), y: Number(box.y.toFixed(2)) },
    { x: Number((box.x + box.width).toFixed(2)), y: Number((box.y + box.height).toFixed(2)) },
    { x: Number(box.x.toFixed(2)), y: Number((box.y + box.height).toFixed(2)) }
  ]
}
