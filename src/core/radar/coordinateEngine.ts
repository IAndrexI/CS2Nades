import type {
  CS2WorldCoords,
  MapRadarCalibration,
  Point2D,
  RadarFloorId,
  ThrowType
} from '../../types'

export const RADAR_TEXTURE_SIZE = 1024
export const RADAR_SVG_VIEWBOX_SIZE = 1000

/**
 * Official Valve CS2 Radar Overview Calibrations (resource/overviews/*.txt)
 * Every active duty & reserve map calibrated to its 1024x1024 radar texture.
 */
export const CS2_RADAR_CALIBRATIONS: Record<string, MapRadarCalibration> = {
  mirage: { pos_x: -3230, pos_y: 1713, scale: 5.0 },
  dust2: { pos_x: -2476, pos_y: 3239, scale: 4.4 },
  inferno: { pos_x: -2087, pos_y: 3870, scale: 4.9 },
  nuke: { pos_x: -3453, pos_y: 2887, scale: 7.0, zSplitThreshold: -495 },
  ancient: { pos_x: -2953, pos_y: 2164, scale: 5.0 },
  anubis: { pos_x: -2796, pos_y: 3328, scale: 5.22 },
  vertigo: { pos_x: -3168, pos_y: 1762, scale: 4.0, zSplitThreshold: 11700 },
  overpass: { pos_x: -4831, pos_y: 1781, scale: 5.2 },
  train: { pos_x: -2477, pos_y: 2392, scale: 4.7 },
  cache: { pos_x: -2000, pos_y: 3250, scale: 5.5 },
  cobblestone: { pos_x: -3840, pos_y: 3072, scale: 6.0 },
  cbble: { pos_x: -3840, pos_y: 3072, scale: 6.0 },
  office: { pos_x: -1838, pos_y: 1858, scale: 4.1 },
  italy: { pos_x: -2647, pos_y: 2592, scale: 4.6 }
}

/**
 * Normalizes a map identifier (e.g. "de_mirage", "Mirage", "dust_2", "de_cbble") to canonical mapId.
 */
export function normalizeMapId(rawMapId: string): string {
  const clean = rawMapId.trim().toLowerCase().replace(/^de_/, '').replace(/^cs_/, '')
  if (clean === 'dust_2' || clean === 'dust ii' || clean === 'd2') return 'dust2'
  if (clean === 'cbble' || clean === 'cobble' || clean === 'cobblestone') return 'cobblestone'
  return clean
}

/**
 * Retrieves the radar calibration config for a given map.
 */
export function getMapCalibration(mapId: string): MapRadarCalibration {
  const normalized = normalizeMapId(mapId)
  return CS2_RADAR_CALIBRATIONS[normalized] ?? { pos_x: -3000, pos_y: 2000, scale: 5.0 }
}

/**
 * Determines whether a world Z coordinate belongs on the 'upper' or 'lower' radar floor
 * for multi-elevation maps like Nuke and Vertigo.
 */
export function resolveRadarFloor(mapId: string, worldZ?: number): RadarFloorId {
  if (worldZ === undefined || Number.isNaN(worldZ)) return 'upper'
  const cal = getMapCalibration(mapId)
  if (cal.zSplitThreshold !== undefined && worldZ < cal.zSplitThreshold) {
    return 'lower'
  }
  return 'upper'
}

/**
 * Converts CS2 in-game world coordinates (X, Y) into 1024x1024 radar pixel coordinates.
 */
export function worldToRadarPixels(
  mapId: string,
  worldX: number,
  worldY: number
): { pixelX: number; pixelY: number } {
  const cal = getMapCalibration(mapId)
  const pixelX = (worldX - cal.pos_x) / cal.scale
  const pixelY = (cal.pos_y - worldY) / cal.scale
  return {
    pixelX: Number(pixelX.toFixed(2)),
    pixelY: Number(pixelY.toFixed(2))
  }
}

/**
 * Converts CS2 in-game world coordinates (X, Y) into 0-100% normalized radar coordinates.
 */
export function worldToRadarCoords(
  mapId: string,
  worldX: number,
  worldY: number,
  clamp = true
): Point2D {
  const { pixelX, pixelY } = worldToRadarPixels(mapId, worldX, worldY)
  const rawPctX = (pixelX / RADAR_TEXTURE_SIZE) * 100
  const rawPctY = (pixelY / RADAR_TEXTURE_SIZE) * 100

  const x = clamp ? Math.max(0, Math.min(100, rawPctX)) : rawPctX
  const y = clamp ? Math.max(0, Math.min(100, rawPctY)) : rawPctY

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2))
  }
}

/**
 * Inverse transformation: converts 0-100% radar coordinates back into exact CS2 in-game World (X, Y).
 */
export function radarToWorldCoords(
  mapId: string,
  radarPoint: Point2D,
  defaultZ = 0
): { x: number; y: number; z: number } {
  const cal = getMapCalibration(mapId)
  const pixelX = (radarPoint.x / 100) * RADAR_TEXTURE_SIZE
  const pixelY = (radarPoint.y / 100) * RADAR_TEXTURE_SIZE

  const worldX = cal.pos_x + pixelX * cal.scale
  const worldY = cal.pos_y - pixelY * cal.scale

  return {
    x: Math.round(worldX),
    y: Math.round(worldY),
    z: Math.round(defaultZ)
  }
}

/**
 * Converts CS2 Yaw angle (-180 to 180, where 0 = East/+X, 90 = North/+Y)
 * into SVG screen rotation degrees (where 0 = East/+X, 90 = South/+Y).
 */
export function cs2YawToRadarDegrees(yaw: number): number {
  return -yaw
}

/**
 * Computes unit look vector on the radar (in percentage space) from CS2 yaw angle.
 */
export function cs2YawToRadarVector(yaw: number, lengthPct = 8): Point2D {
  const rad = (yaw * Math.PI) / 180
  return {
    x: Number((Math.cos(rad) * lengthPct).toFixed(2)),
    y: Number((-Math.sin(rad) * lengthPct).toFixed(2))
  }
}

/**
 * Parses a CS2 `getpos` / `getpos_exact` / `setpos` console string into structured CS2WorldCoords.
 * Supports:
 * - `setpos 1285.00 -342.00 -160.00; setang -34.80 -124.60 0.00`
 * - `setpos_exact 1285.00 -342.00 -160.00; setang_exact -34.80 -124.60 0.00`
 * - Raw coordinate tuples `1285 -342 -160 -34.8 -124.6`
 */
export function parseGetPosCommand(rawText: string): CS2WorldCoords | null {
  if (!rawText || typeof rawText !== 'string') return null

  const setposMatch = rawText.match(
    /setpos(?:_exact)?\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)(?:[\s;]+setang(?:_exact)?\s+([-\d.]+)\s+([-\d.]+))?/i
  )
  if (setposMatch) {
    const x = parseFloat(setposMatch[1] ?? '0')
    const y = parseFloat(setposMatch[2] ?? '0')
    const z = parseFloat(setposMatch[3] ?? '0')
    const pitch = setposMatch[4] !== undefined ? parseFloat(setposMatch[4]) : 0
    const yaw = setposMatch[5] !== undefined ? parseFloat(setposMatch[5]) : 0

    if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) {
      return { x, y, z, pitch, yaw }
    }
  }

  // Fallback for GSI / comma-separated position strings: "1285.00, -342.00, -160.00"
  const csvMatch = rawText
    .trim()
    .match(/^([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)(?:\s*,\s*([-\d.]+)\s*,\s*([-\d.]+))?$/)
  if (csvMatch) {
    return {
      x: parseFloat(csvMatch[1] ?? '0'),
      y: parseFloat(csvMatch[2] ?? '0'),
      z: parseFloat(csvMatch[3] ?? '0'),
      pitch: csvMatch[4] !== undefined ? parseFloat(csvMatch[4]) : 0,
      yaw: csvMatch[5] !== undefined ? parseFloat(csvMatch[5]) : 0
    }
  }

  return null
}

/**
 * Formats CS2WorldCoords into a ready-to-paste CS2 console command.
 */
export function formatSetPosCommand(coords: CS2WorldCoords): string {
  return `setpos ${coords.x.toFixed(1)} ${coords.y.toFixed(1)} ${coords.z.toFixed(1)}; setang ${coords.pitch.toFixed(2)} ${coords.yaw.toFixed(2)} 0`
}

/**
 * Generates an in-game CS2 practice config & keybind script for a specific lineup.
 */
export function generateLineupPracticeScript(
  title: string,
  consoleCommand?: string,
  throwType?: ThrowType
): string {
  const safeTitle = title.replace(/"/g, "'")
  const teleportCmd = consoleCommand?.trim() || 'echo "No setpos recorded for this lineup"'
  const lines = [
    `// CS2Nades Practice Script: ${safeTitle}`,
    `sv_cheats 1`,
    `mp_roundtime_defuse 60`,
    `mp_buy_anywhere 1`,
    `mp_buytime 99999`,
    `sv_infinite_ammo 1`,
    `sv_grenade_trajectory_prac_pipreview 1`,
    `sv_grenade_trajectory_prac_trailtime 10`,
    `mp_warmup_end`,
    `// Teleport to exact throw position & view angle:`,
    teleportCmd
  ]
  if (throwType === 'jumpthrow' || throwType === 'w_jumpthrow') {
    lines.push(
      `// CS2 Subtick Jumpthrow Bind (optional):`,
      `alias "+jt" "+jump"`,
      `alias "-jt" "-attack; -attack2; -jump"`,
      `bind "v" "+jt"`
    )
  }
  return lines.join('\n')
}

/**
 * Estimates where a thrown grenade will land in CS2 World coordinates based on
 * origin (x, y, z), view angles (pitch, yaw), and throw mechanics.
 */
export function estimateLandingWorldCoords(
  coords: CS2WorldCoords,
  throwType: ThrowType | string = 'standing'
): { x: number; y: number; z: number } {
  const yawRad = (coords.yaw * Math.PI) / 180
  // In Source 2, negative pitch is looking UP into the sky (-89 = straight up)
  const elevationDeg = Math.max(-45, Math.min(85, -coords.pitch))
  const elevRad = (elevationDeg * Math.PI) / 180

  let baseRange = 1350
  switch (throwType) {
    case 'jumpthrow':
      baseRange = 1950
      break
    case 'w_jumpthrow':
      baseRange = 2300
      break
    case 'runthrow':
      baseRange = 1850
      break
    case 'walkthrow':
      baseRange = 1550
      break
    case 'crouchthrow':
      baseRange = 950
      break
    case 'rightclick':
      baseRange = 420
      break
    case 'middleclick':
      baseRange = 850
      break
    default:
      baseRange = 1350
  }

  // Ballistic horizontal projection factor
  const pitchFactor = Math.max(0.3, Math.cos(elevRad * 0.7) + Math.sin(elevRad) * 0.45)
  const horizontalDist = baseRange * pitchFactor

  return {
    x: Math.round(coords.x + Math.cos(yawRad) * horizontalDist),
    y: Math.round(coords.y + Math.sin(yawRad) * horizontalDist),
    z: Math.round(coords.z)
  }
}

/**
 * Converts a DOM mouse/touch event (clientX, clientY) into exact 0-100% radar coordinates
 * using the SVG element's inverse Screen CTM (`getScreenCTM().inverse()`).
 * Works across all screen resolutions, aspect ratios, CSS transforms, and pan/zoom states.
 */
export function clientToSvgRadarPct(
  svgEl: SVGSVGElement,
  clientX: number,
  clientY: number,
  clamp = true
): Point2D | null {
  const ctm = svgEl.getScreenCTM()
  if (!ctm) return null

  const pt = svgEl.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const transformed = pt.matrixTransform(ctm.inverse())

  const viewBox = svgEl.viewBox.baseVal
  const vbWidth = viewBox && viewBox.width > 0 ? viewBox.width : RADAR_SVG_VIEWBOX_SIZE
  const vbHeight = viewBox && viewBox.height > 0 ? viewBox.height : RADAR_SVG_VIEWBOX_SIZE

  const rawX = (transformed.x / vbWidth) * 100
  const rawY = (transformed.y / vbHeight) * 100

  const x = clamp ? Math.max(0, Math.min(100, rawX)) : rawX
  const y = clamp ? Math.max(0, Math.min(100, rawY)) : rawY

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2))
  }
}

/**
 * Computes a smooth quadratic Bezier flight arc in SVG viewBox coordinates (0-1000)
 * between an origin radar percentage and a landing radar percentage.
 */
export function computeTrajectoryArc(
  origin: Point2D,
  landing: Point2D,
  curvature = 0.16
): {
  x1: number
  y1: number
  x2: number
  y2: number
  cx: number
  cy: number
  midX: number
  midY: number
  pathData: string
  distancePct: number
} {
  const x1 = origin.x * 10
  const y1 = origin.y * 10
  const x2 = landing.x * 10
  const y2 = landing.y * 10

  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy)
  const distancePct = Number((dist / 10).toFixed(1))

  // Perpendicular control point lift for clean ballistic visualization
  const nx = dist > 0.01 ? -dy / dist : 0
  const ny = dist > 0.01 ? dx / dist : 0
  const offset = Math.min(90, dist * curvature)

  const cx = (x1 + x2) / 2 + nx * offset
  const cy = (y1 + y2) / 2 - Math.abs(ny * offset * 0.65) - offset * 0.35

  // Midpoint on quadratic Bezier at t = 0.5: B(0.5) = 0.25*P0 + 0.5*C + 0.25*P1
  const midX = 0.25 * x1 + 0.5 * cx + 0.25 * x2
  const midY = 0.25 * y1 + 0.5 * cy + 0.25 * y2

  return {
    x1,
    y1,
    x2,
    y2,
    cx,
    cy,
    midX,
    midY,
    pathData: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    distancePct
  }
}
