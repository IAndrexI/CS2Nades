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
    // A Site & Palace
    { x1: 700, y1: 220, x2: 880, y2: 220 },
    { x1: 880, y1: 220, x2: 880, y2: 440 },
    { x1: 760, y1: 340, x2: 860, y2: 340 },
    { x1: 700, y1: 440, x2: 820, y2: 440 },
    { x1: 720, y1: 320, x2: 780, y2: 320 },
    { x1: 680, y1: 240, x2: 740, y2: 240 },
    { x1: 620, y1: 200, x2: 740, y2: 200 },
    // Middle & Connector
    { x1: 520, y1: 440, x2: 640, y2: 440 },
    { x1: 540, y1: 360, x2: 620, y2: 360 },
    { x1: 440, y1: 380, x2: 500, y2: 380 },
    { x1: 400, y1: 340, x2: 480, y2: 340 },
    { x1: 380, y1: 480, x2: 480, y2: 480 },
    { x1: 340, y1: 520, x2: 420, y2: 520 },
    { x1: 400, y1: 660, x2: 520, y2: 660 },
    // B Site & Apartments
    { x1: 160, y1: 440, x2: 300, y2: 440 },
    { x1: 180, y1: 360, x2: 320, y2: 360 },
    { x1: 220, y1: 260, x2: 340, y2: 260 },
    { x1: 180, y1: 240, x2: 280, y2: 240 },
    { x1: 340, y1: 220, x2: 460, y2: 220 },
    { x1: 420, y1: 260, x2: 480, y2: 260 },
    // T Spawn & T Ramp
    { x1: 320, y1: 780, x2: 540, y2: 780 },
    { x1: 580, y1: 620, x2: 680, y2: 620 }
  ],

  dust2: [
    // Long A
    { x1: 720, y1: 640, x2: 860, y2: 640 },
    { x1: 820, y1: 420, x2: 920, y2: 420 },
    { x1: 800, y1: 240, x2: 900, y2: 240 },
    { x1: 740, y1: 280, x2: 820, y2: 280 },
    { x1: 680, y1: 220, x2: 760, y2: 220 },
    // Middle & Catwalk
    { x1: 520, y1: 460, x2: 580, y2: 460 },
    { x1: 480, y1: 340, x2: 560, y2: 340 },
    { x1: 540, y1: 240, x2: 680, y2: 240 },
    { x1: 420, y1: 520, x2: 520, y2: 520 },
    // B Site & Upper Tunnels
    { x1: 180, y1: 440, x2: 320, y2: 440 },
    { x1: 140, y1: 240, x2: 280, y2: 240 },
    { x1: 240, y1: 280, x2: 320, y2: 280 },
    { x1: 280, y1: 220, x2: 360, y2: 220 },
    // T Spawn & CT Spawn
    { x1: 340, y1: 780, x2: 620, y2: 780 },
    { x1: 460, y1: 180, x2: 600, y2: 180 }
  ],

  inferno: [
    // Banana & B Site
    { x1: 260, y1: 640, x2: 380, y2: 640 },
    { x1: 320, y1: 480, x2: 420, y2: 480 },
    { x1: 240, y1: 260, x2: 360, y2: 260 },
    { x1: 180, y1: 200, x2: 300, y2: 200 },
    { x1: 320, y1: 180, x2: 440, y2: 180 },
    // Mid & Apartments
    { x1: 440, y1: 560, x2: 560, y2: 560 },
    { x1: 480, y1: 440, x2: 620, y2: 440 },
    { x1: 560, y1: 340, x2: 680, y2: 340 },
    // A Site & Library
    { x1: 660, y1: 260, x2: 780, y2: 260 },
    { x1: 620, y1: 180, x2: 740, y2: 180 },
    { x1: 520, y1: 220, x2: 620, y2: 220 }
  ],

  nuke: [
    // Outside & Garage
    { x1: 680, y1: 440, x2: 820, y2: 440 },
    { x1: 580, y1: 520, x2: 680, y2: 520 },
    { x1: 540, y1: 360, x2: 640, y2: 360 },
    // A Site & Hut
    { x1: 420, y1: 380, x2: 520, y2: 380 },
    { x1: 360, y1: 320, x2: 460, y2: 320 },
    // Ramp & Radio
    { x1: 260, y1: 480, x2: 380, y2: 480 },
    { x1: 280, y1: 360, x2: 400, y2: 360 }
  ],

  anubis: [
    { x1: 420, y1: 520, x2: 580, y2: 520 },
    { x1: 640, y1: 360, x2: 780, y2: 360 },
    { x1: 240, y1: 360, x2: 380, y2: 360 },
    { x1: 480, y1: 320, x2: 600, y2: 320 }
  ],

  ancient: [
    { x1: 460, y1: 480, x2: 580, y2: 480 },
    { x1: 680, y1: 340, x2: 820, y2: 340 },
    { x1: 240, y1: 340, x2: 380, y2: 340 },
    { x1: 420, y1: 360, x2: 520, y2: 360 }
  ]
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
  const numRays = 33

  const colliders: WallSegment[] = [
    ...(MAP_WALL_COLLIDERS[mapId] || MAP_WALL_COLLIDERS.mirage || []),
    ...MAP_BOUNDS
  ]

  const hitPoints: Array<{ x: number; y: number; isBlocked: boolean }> = []
  const blockedEdges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  let hasObstruction = false

  for (let i = 0; i < numRays; i++) {
    const rayAngle = centerAngle - spread + (i / (numRays - 1)) * (spread * 2)
    const rayTargetX = x1 + Math.cos(rayAngle) * maxDistance
    const rayTargetY = y1 + Math.sin(rayAngle) * maxDistance

    let closestHit: { x: number; y: number; dist: number } | null = null

    for (const wall of colliders) {
      const hit = lineIntersection(x1, y1, rayTargetX, rayTargetY, wall.x1, wall.y1, wall.x2, wall.y2)
      if (hit) {
        if (!closestHit || hit.dist < closestHit.dist) {
          closestHit = hit
        }
      }
    }

    if (closestHit && closestHit.dist < maxDistance - 1) {
      hitPoints.push({ x: closestHit.x, y: closestHit.y, isBlocked: true })
      hasObstruction = true
    } else {
      hitPoints.push({ x: rayTargetX, y: rayTargetY, isBlocked: false })
    }
  }

  for (let i = 0; i < hitPoints.length - 1; i++) {
    if (hitPoints[i].isBlocked && hitPoints[i + 1].isBlocked) {
      blockedEdges.push({
        x1: hitPoints[i].x,
        y1: hitPoints[i].y,
        x2: hitPoints[i + 1].x,
        y2: hitPoints[i + 1].y
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
