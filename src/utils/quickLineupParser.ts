import type { GrenadeType, Point2D, TeamSide, ThrowType, TickrateType } from '../types'
import { MAPS_DATA } from '../data/mapsData'
import { radarToWorldCoords } from '../core/radar/coordinateEngine'

export interface ParsedLineupDraft {
  title: string
  mapId: string
  mapName: string
  grenadeType: GrenadeType
  side: TeamSide
  throwType: ThrowType
  tickrate: TickrateType
  startLocation: string
  endLocation: string
  site: 'A' | 'B' | 'Mid' | 'Spawn' | 'General'
  originCoords: Point2D
  landingCoords: Point2D
  curveOffset: number
  consoleCommand: string
  cs2Pos: { x: number; y: number; z: number; pitch: number; yaw: number; roll: number }
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  description: string
  instructions: string[]
}

export function parseQuickLineupInput(input: string, currentMapId = 'mirage'): ParsedLineupDraft {
  const lower = input.toLowerCase().trim()

  // 1. Detect Map
  let mapId = currentMapId
  for (const m of MAPS_DATA) {
    if (
      lower.includes(m.id) ||
      lower.includes(m.name.toLowerCase()) ||
      lower.includes(m.code.toLowerCase())
    ) {
      mapId = m.id
      break
    }
  }
  if (lower.includes('d2') || lower.includes('dust 2')) mapId = 'dust2'

  const mapObj = MAPS_DATA.find((m) => m.id === mapId) ?? MAPS_DATA[0]!

  // 2. Detect Grenade Type
  let grenadeType: GrenadeType = 'smoke'
  if (lower.includes('flash') || lower.includes('popflash') || lower.includes('blind')) {
    grenadeType = 'flash'
  } else if (
    lower.includes('molly') ||
    lower.includes('molotov') ||
    lower.includes('incendiary') ||
    lower.includes('burn')
  ) {
    grenadeType = 'molotov'
  } else if (lower.includes('he ') || lower.includes('he-grenade') || lower.includes('frag')) {
    grenadeType = 'he'
  } else if (lower.includes('decoy')) {
    grenadeType = 'decoy'
  }

  // 3. Detect Throw Type
  let throwType: ThrowType = 'standing'
  if (lower.includes('w+jump') || lower.includes('w jump') || lower.includes('w_jump')) {
    throwType = 'w_jumpthrow'
  } else if (lower.includes('crouch jump')) {
    throwType = 'crouch_jumpthrow'
  } else if (lower.includes('run jump')) {
    throwType = 'run_jumpthrow'
  } else if (lower.includes('jump')) {
    throwType = 'jumpthrow'
  } else if (lower.includes('run')) {
    throwType = 'runthrow'
  } else if (lower.includes('crouch')) {
    throwType = 'crouch'
  } else if (lower.includes('left right') || lower.includes('middle')) {
    throwType = 'left_right_click'
  }

  // 4. Detect Side
  let side: TeamSide = 't'
  if (/\bct\b/.test(lower) || lower.includes('retake') || lower.includes('counter')) {
    side = 'ct'
  }

  // 5. Match Callouts from MAPS_DATA for origin & landing
  const callouts = mapObj.callouts ?? []
  let originCoords: Point2D = { x: 75, y: 45 }
  let landingCoords: Point2D = mapObj.sites.a ?? { x: 50, y: 50 }
  let startLocation = side === 't' ? 'T Spawn' : 'CT Spawn'
  let endLocation = 'A Site'

  const toSplit = lower.split(/\s+(?:to|into|onto|->)\s+/)
  const findCalloutMatch = (segment: string) => {
    for (const c of callouts) {
      if (segment.includes(c.name.toLowerCase())) return c
      if (c.aliases?.some((a) => segment.includes(a.toLowerCase()))) return c
    }
    return null
  }

  if (toSplit.length >= 2) {
    const startMatch = findCalloutMatch(toSplit[0] ?? '')
    const endMatch = findCalloutMatch(toSplit[1] ?? '')
    if (startMatch) {
      originCoords = { ...startMatch.coords }
      startLocation = startMatch.name
    }
    if (endMatch) {
      landingCoords = { ...endMatch.coords }
      endLocation = endMatch.name
    }
  } else {
    const spawnCallout = callouts.find((c) =>
      side === 't'
        ? c.name.toLowerCase().includes('t spawn') || c.name.toLowerCase().includes('t roof')
        : c.name.toLowerCase().includes('ct spawn')
    )
    if (spawnCallout) {
      originCoords = { ...spawnCallout.coords }
      startLocation = spawnCallout.name
    }
    const targetMatch = callouts.find(
      (c) =>
        c.id !== spawnCallout?.id &&
        (lower.includes(c.name.toLowerCase()) ||
          c.aliases?.some((a) => lower.includes(a.toLowerCase())))
    )
    if (targetMatch) {
      landingCoords = { ...targetMatch.coords }
      endLocation = targetMatch.name
    }
  }

  // 6. Site Detection
  let site: 'A' | 'B' | 'Mid' | 'Spawn' | 'General' = 'A'
  if (
    /\bb\b/.test(lower) ||
    endLocation.toLowerCase().includes('b ') ||
    ['coffins', 'van', 'market', 'cave', 'monster', 'doors'].some((k) =>
      endLocation.toLowerCase().includes(k)
    )
  ) {
    site = 'B'
  } else if (
    lower.includes('mid') ||
    ['window', 'xbox', 'catwalk', 'donut', 'red room', 'connector'].some((k) =>
      endLocation.toLowerCase().includes(k)
    )
  ) {
    site = 'Mid'
  }

  const worldOrigin = radarToWorldCoords(mapId, originCoords, -120)
  const cs2Pos = {
    x: worldOrigin.x,
    y: worldOrigin.y,
    z: worldOrigin.z,
    pitch: -32.0,
    yaw: -115.0,
    roll: 0
  }
  const consoleCommand = `setpos ${cs2Pos.x} ${cs2Pos.y} ${cs2Pos.z}; setang ${cs2Pos.pitch} ${cs2Pos.yaw} 0`

  const nadeLabel =
    grenadeType === 'he'
      ? 'HE Grenade'
      : grenadeType.charAt(0).toUpperCase() + grenadeType.slice(1)
  const title = `${startLocation} to ${endLocation} ${nadeLabel}`

  return {
    title,
    mapId,
    mapName: mapObj.name,
    grenadeType,
    side,
    throwType,
    tickrate: 'cs2_subtick',
    startLocation,
    endLocation,
    site,
    originCoords,
    landingCoords,
    curveOffset: 0,
    consoleCommand,
    cs2Pos,
    difficulty: throwType === 'w_jumpthrow' ? 'medium' : 'easy',
    tags: [site === 'Mid' ? 'Mid Control' : `${site} Execute`, endLocation, throwType],
    description: `${side.toUpperCase()}-side ${nadeLabel.toLowerCase()} lineup from ${startLocation} landing at ${endLocation} using a ${throwType}.`,
    instructions: [
      `Position yourself at ${startLocation}.`,
      `Align your crosshair with the landmark toward ${endLocation}.`,
      `Execute a ${throwType.replace('_', ' ')} throw.`
    ]
  }
}
