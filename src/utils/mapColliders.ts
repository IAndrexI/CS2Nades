export interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface VisionResult {
  path: string
  blockedEdges: Array<{ x1: number; y1: number; x2: number; y2: number }>
  hasObstruction: boolean
  centerRayHit: { x: number; y: number; isBlocked: boolean }
}

// Bounding map borders (applied to all maps)
const MAP_BOUNDS: WallSegment[] = [
  { x1: 30, y1: 30, x2: 970, y2: 30 },
  { x1: 970, y1: 30, x2: 970, y2: 970 },
  { x1: 970, y1: 970, x2: 30, y2: 970 },
  { x1: 30, y1: 970, x2: 30, y2: 30 }
]

// Accurate CS2 Map Obstacle & Wall Colliders (0..1000 SVG coordinate space)
export const MAP_WALL_COLLIDERS: Record<string, WallSegment[]> = {
  mirage: [
    // A Site, Palace & Jungle/Connector
    { x1: 680, y1: 200, x2: 900, y2: 200 },
    { x1: 900, y1: 200, x2: 900, y2: 460 },
    { x1: 740, y1: 320, x2: 880, y2: 320 },
    { x1: 680, y1: 420, x2: 840, y2: 420 },
    { x1: 700, y1: 300, x2: 780, y2: 300 },
    { x1: 660, y1: 220, x2: 740, y2: 220 },
    { x1: 600, y1: 180, x2: 740, y2: 180 },
    // Middle, Snipers Nest & Catwalk/Connector
    { x1: 500, y1: 420, x2: 660, y2: 420 },
    { x1: 520, y1: 340, x2: 640, y2: 340 },
    { x1: 420, y1: 360, x2: 520, y2: 360 },
    { x1: 380, y1: 320, x2: 480, y2: 320 },
    { x1: 360, y1: 460, x2: 480, y2: 460 },
    { x1: 320, y1: 500, x2: 440, y2: 500 },
    { x1: 380, y1: 640, x2: 540, y2: 640 },
    // B Site, Apartments, Market & Short
    { x1: 140, y1: 420, x2: 320, y2: 420 },
    { x1: 160, y1: 340, x2: 340, y2: 340 },
    { x1: 200, y1: 240, x2: 360, y2: 240 },
    { x1: 160, y1: 220, x2: 300, y2: 220 },
    { x1: 320, y1: 200, x2: 480, y2: 200 },
    { x1: 400, y1: 240, x2: 500, y2: 240 },
    // T Spawn, T Roof, Palace Entrance & TV/Alley
    { x1: 300, y1: 760, x2: 560, y2: 760 },
    { x1: 560, y1: 600, x2: 700, y2: 600 },
    { x1: 240, y1: 680, x2: 380, y2: 680 },
    { x1: 480, y1: 820, x2: 680, y2: 820 }
  ],

  dust2: [
    // Long A & Pit
    { x1: 700, y1: 620, x2: 880, y2: 620 },
    { x1: 800, y1: 400, x2: 940, y2: 400 },
    { x1: 780, y1: 220, x2: 920, y2: 220 },
    { x1: 720, y1: 260, x2: 840, y2: 260 },
    { x1: 660, y1: 200, x2: 780, y2: 200 },
    // Middle, Xbox, Catwalk & Lower Tunnels
    { x1: 500, y1: 440, x2: 600, y2: 440 },
    { x1: 460, y1: 320, x2: 580, y2: 320 },
    { x1: 520, y1: 220, x2: 700, y2: 220 },
    { x1: 400, y1: 500, x2: 540, y2: 500 },
    // B Site, Upper Tunnels & Doors
    { x1: 160, y1: 420, x2: 340, y2: 420 },
    { x1: 120, y1: 220, x2: 300, y2: 220 },
    { x1: 220, y1: 260, x2: 340, y2: 260 },
    { x1: 260, y1: 200, x2: 380, y2: 200 },
    // T Spawn & CT Mid
    { x1: 320, y1: 760, x2: 640, y2: 760 },
    { x1: 440, y1: 160, x2: 620, y2: 160 }
  ],

  inferno: [
    // Banana & B Site
    { x1: 240, y1: 620, x2: 400, y2: 620 },
    { x1: 300, y1: 460, x2: 440, y2: 460 },
    { x1: 220, y1: 240, x2: 380, y2: 240 },
    { x1: 160, y1: 180, x2: 320, y2: 180 },
    { x1: 300, y1: 160, x2: 460, y2: 160 },
    // Mid, Second Mid & Apartments
    { x1: 420, y1: 540, x2: 580, y2: 540 },
    { x1: 460, y1: 420, x2: 640, y2: 420 },
    { x1: 540, y1: 320, x2: 700, y2: 320 },
    // A Site, Pit, Balcony & Library
    { x1: 640, y1: 240, x2: 800, y2: 240 },
    { x1: 600, y1: 160, x2: 760, y2: 160 },
    { x1: 500, y1: 200, x2: 640, y2: 200 }
  ],

  nuke: [
    // Outside & Garage
    { x1: 660, y1: 420, x2: 840, y2: 420 },
    { x1: 560, y1: 500, x2: 700, y2: 500 },
    { x1: 520, y1: 340, x2: 660, y2: 340 },
    // A Site, Hut, Squeaky & Vent
    { x1: 400, y1: 360, x2: 540, y2: 360 },
    { x1: 340, y1: 300, x2: 480, y2: 300 },
    // Ramp, Radio & Trophy
    { x1: 240, y1: 460, x2: 400, y2: 460 },
    { x1: 260, y1: 340, x2: 420, y2: 340 }
  ],

  anubis: [
    { x1: 400, y1: 500, x2: 600, y2: 500 },
    { x1: 620, y1: 340, x2: 800, y2: 340 },
    { x1: 220, y1: 340, x2: 400, y2: 340 },
    { x1: 460, y1: 300, x2: 620, y2: 300 },
    { x1: 280, y1: 580, x2: 460, y2: 580 },
    { x1: 520, y1: 200, x2: 700, y2: 200 }
  ],

  ancient: [
    { x1: 440, y1: 460, x2: 600, y2: 460 },
    { x1: 660, y1: 320, x2: 840, y2: 320 },
    { x1: 220, y1: 320, x2: 400, y2: 320 },
    { x1: 400, y1: 340, x2: 540, y2: 340 },
    { x1: 300, y1: 620, x2: 480, y2: 620 },
    { x1: 520, y1: 220, x2: 700, y2: 220 }
  ],

  vertigo: [
    // A Ramp & A Site
    { x1: 600, y1: 420, x2: 800, y2: 420 },
    { x1: 660, y1: 300, x2: 860, y2: 300 },
    // Mid & Elevator
    { x1: 420, y1: 440, x2: 580, y2: 440 },
    { x1: 400, y1: 320, x2: 560, y2: 320 },
    // B Stairs & B Site
    { x1: 200, y1: 460, x2: 380, y2: 460 },
    { x1: 220, y1: 300, x2: 400, y2: 300 }
  ],

  overpass: [
    // Monster & B Site
    { x1: 200, y1: 540, x2: 380, y2: 540 },
    { x1: 260, y1: 380, x2: 440, y2: 380 },
    // Restrooms & Fountain
    { x1: 460, y1: 560, x2: 640, y2: 560 },
    { x1: 500, y1: 420, x2: 680, y2: 420 },
    // A Site & Bank
    { x1: 620, y1: 300, x2: 800, y2: 300 },
    { x1: 560, y1: 220, x2: 740, y2: 220 }
  ],

  office: [
    { x1: 320, y1: 460, x2: 680, y2: 460 },
    { x1: 240, y1: 340, x2: 500, y2: 340 },
    { x1: 500, y1: 320, x2: 760, y2: 320 }
  ],

  italy: [
    { x1: 340, y1: 500, x2: 660, y2: 500 },
    { x1: 260, y1: 360, x2: 540, y2: 360 },
    { x1: 460, y1: 260, x2: 740, y2: 260 }
  ]
}

// Map-Specific Walkable Corridor & See-Through Colors (per user specification)
// Everything outside these floor colors is a solid wall / blocked sight!
export const MAP_PASSABLE_COLORS: Record<string, string[]> = {
  mirage: ['#1c222e'],
  dust2: ['#1c222e'],
  inferno: ['#333a42'],
  cache: ['#485565'],
  ancient: ['#3e4f3d'],
  nuke: ['#3b434d', '#2f333c', '#434c59', '#333a42'],
  anubis: ['#3d434f', '#323941'],
  vertigo: ['#333a42', '#282e38', '#1c222e'],
  overpass: ['#333a42', '#2a323d', '#1c222e'],
  office: ['#3e444f', '#2e343f', '#1c222e'],
  italy: ['#3d444e', '#2d333e', '#1c222e']
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

// In-memory radar pixel image cache
const radarImageCache: Record<string, ImageData | null> = {}

export function setRadarImageData(mapId: string, data: ImageData) {
  const cleanId = (mapId || '').toLowerCase().replace('de_', '').trim()
  radarImageCache[cleanId] = data
}

export function isColorPassable(mapId: string, r: number, g: number, b: number, a: number): boolean {
  if (a < 20) return false // Transparent / void
  // If close to dark background #090c13 / #090d13 (R: 9, G: 12..13, B: 19), it is solid obstacle/void!
  if (r <= 16 && g <= 20 && b <= 26) return false

  const cleanId = (mapId || 'mirage').toLowerCase().replace('de_', '').trim()
  const allowedHexes = MAP_PASSABLE_COLORS[cleanId] || MAP_PASSABLE_COLORS.mirage || ['#1c222e']

  for (const hex of allowedHexes) {
    const target = hexToRgb(hex)
    const dist = Math.hypot(r - target.r, g - target.g, b - target.b)
    if (dist <= 35) return true
  }
  return false
}

function lineIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number; dist: number } | null {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
  if (Math.abs(denom) < 0.0001) return null

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const ix = x1 + ua * (x2 - x1)
    const iy = y1 + ua * (y2 - y1)
    const dist = Math.hypot(ix - x1, iy - y1)
    return { x: ix, y: iy, dist }
  }
  return null
}

export function calculateVisionMesh(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  mapId = 'mirage'
): VisionResult {
  const x1 = p1.x * 10
  const y1 = p1.y * 10
  const x2 = p2.x * 10
  const y2 = p2.y * 10

  const dx = x2 - x1
  const dy = y2 - y1
  const maxDistance = Math.hypot(dx, dy)
  if (maxDistance < 2) {
    return {
      path: '',
      blockedEdges: [],
      hasObstruction: false,
      centerRayHit: { x: x2, y: y2, isBlocked: false }
    }
  }

  const centerAngle = Math.atan2(dy, dx)
  const spread = Math.PI / 4 // 90 deg field of view
  const numRays = 65

  const cleanMapId = (mapId || 'mirage').toLowerCase().replace('de_', '').trim()
  const colliders: WallSegment[] = [
    ...(MAP_WALL_COLLIDERS[cleanMapId] || MAP_WALL_COLLIDERS.mirage || []),
    ...MAP_BOUNDS
  ]
  const imgData = radarImageCache[cleanMapId]

  const hitPoints: Array<{ x: number; y: number; isBlocked: boolean; wallIndex: number }> = []
  const blockedEdges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  let hasObstruction = false

  for (let i = 0; i < numRays; i++) {
    const rayAngle = centerAngle - spread + (i / (numRays - 1)) * (spread * 2)
    const rayTargetX = x1 + Math.cos(rayAngle) * maxDistance
    const rayTargetY = y1 + Math.sin(rayAngle) * maxDistance

    let closestHit: { x: number; y: number; dist: number; wallIndex: number } | null = null

    // 1. Check geometric colliders
    for (let wIdx = 0; wIdx < colliders.length; wIdx++) {
      const wall = colliders[wIdx]
      const hit = lineIntersection(x1, y1, rayTargetX, rayTargetY, wall.x1, wall.y1, wall.x2, wall.y2)
      if (hit) {
        if (!closestHit || hit.dist < closestHit.dist) {
          closestHit = { ...hit, wallIndex: wIdx }
        }
      }
    }

    // 2. Check pixel radar colors if available
    if (imgData) {
      const stepDist = 5
      const steps = Math.floor(maxDistance / stepDist)
      const cosA = Math.cos(rayAngle)
      const sinA = Math.sin(rayAngle)

      // Start testing past origin
      for (let s = 3; s <= steps; s++) {
        const curDist = s * stepDist
        if (closestHit && curDist >= closestHit.dist) break

        const curX = x1 + cosA * curDist
        const curY = y1 + sinA * curDist

        // Map 0..1000 SVG coordinates to image data coordinates
        const imgX = Math.floor((curX / 1000) * imgData.width)
        const imgY = Math.floor((curY / 1000) * imgData.height)

        if (imgX >= 0 && imgX < imgData.width && imgY >= 0 && imgY < imgData.height) {
          const pixelIdx = (imgY * imgData.width + imgX) * 4
          const r = imgData.data[pixelIdx]
          const g = imgData.data[pixelIdx + 1]
          const b = imgData.data[pixelIdx + 2]
          const a = imgData.data[pixelIdx + 3]

          if (!isColorPassable(cleanMapId, r, g, b, a)) {
            closestHit = { x: curX, y: curY, dist: curDist, wallIndex: 9999 }
            break
          }
        }
      }
    }

    if (closestHit && closestHit.dist < maxDistance - 1) {
      hitPoints.push({ x: closestHit.x, y: closestHit.y, isBlocked: true, wallIndex: closestHit.wallIndex })
      hasObstruction = true
    } else {
      hitPoints.push({ x: rayTargetX, y: rayTargetY, isBlocked: false, wallIndex: -1 })
    }
  }

  for (let i = 0; i < hitPoints.length - 1; i++) {
    const h1 = hitPoints[i]
    const h2 = hitPoints[i + 1]
    if (h1.isBlocked && h2.isBlocked && (h1.wallIndex === h2.wallIndex || Math.hypot(h1.x - h2.x, h1.y - h2.y) < 65)) {
      blockedEdges.push({
        x1: h1.x,
        y1: h1.y,
        x2: h2.x,
        y2: h2.y
      })
    }
  }

  const pathParts: string[] = [`M ${x1} ${y1}`]
  for (const pt of hitPoints) {
    pathParts.push(`L ${pt.x} ${pt.y}`)
  }
  pathParts.push('Z')

  const centerIndex = Math.floor(numRays / 2)
  const centerRayHit = hitPoints[centerIndex] || { x: x2, y: y2, isBlocked: false }

  return {
    path: pathParts.join(' '),
    blockedEdges,
    hasObstruction,
    centerRayHit
  }
}
