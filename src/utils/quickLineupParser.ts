import type { Lineup, GrenadeType, TeamSide, ThrowType, TickrateType, Coordinates } from '../types'
import { parseCS2Pos, worldToRadarCoords } from './coordinateMapper'
import { MAPS_DATA } from '../data/mapsData'

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
  site?: 'A' | 'B' | 'Mid' | 'Spawn' | 'General'
  originCoords: Coordinates
  landingCoords: Coordinates
  curveOffset: number
  instructions: string[]
  consoleCommand?: string
  difficulty: 'easy' | 'medium' | 'hard'
  cs2Pos?: { x: number; y: number; z: number; pitch?: number; yaw?: number; roll?: number }
  tags: string[]
  confidence: number // 0-100 score of how complete the parse was
}

// Map approximate callout coordinates (0-100 scale) for instant accurate placement
const CALLOUT_COORDS: Record<string, Record<string, Coordinates>> = {
  mirage: {
    'window': { x: 44.5, y: 44.0 },
    'stairs': { x: 57.5, y: 39.0 },
    'jungle': { x: 52.0, y: 38.0 },
    'connector': { x: 51.0, y: 47.0 },
    'top mid': { x: 38.0, y: 55.0 },
    'mid': { x: 41.0, y: 50.0 },
    't spawn': { x: 22.0, y: 78.0 },
    't roof': { x: 28.0, y: 68.0 },
    'a site': { x: 67.0, y: 36.0 },
    'palace': { x: 74.0, y: 52.0 },
    'b site': { x: 28.0, y: 30.0 },
    'b aps': { x: 18.0, y: 44.0 },
    'apartments': { x: 18.0, y: 44.0 },
    'market': { x: 39.0, y: 28.0 },
    'kitchen': { x: 39.0, y: 28.0 },
    'catwalk': { x: 33.0, y: 44.0 },
    'short': { x: 33.0, y: 44.0 },
    'underpass': { x: 44.0, y: 58.0 },
    'ct spawn': { x: 58.0, y: 24.0 },
    'bench': { x: 24.0, y: 26.0 },
    'van': { x: 31.0, y: 23.0 },
    'ticket': { x: 68.0, y: 29.0 },
    'ramp': { x: 62.0, y: 55.0 }
  },
  dust2: {
    'xbox': { x: 48.0, y: 48.0 },
    'long': { x: 78.0, y: 52.0 },
    'long a': { x: 78.0, y: 32.0 },
    'long doors': { x: 72.0, y: 64.0 },
    'a site': { x: 78.0, y: 26.0 },
    'a car': { x: 84.0, y: 42.0 },
    'cross': { x: 73.0, y: 28.0 },
    'short': { x: 58.0, y: 36.0 },
    'catwalk': { x: 54.0, y: 42.0 },
    'mid doors': { x: 49.0, y: 38.0 },
    'b site': { x: 18.0, y: 24.0 },
    'b doors': { x: 24.0, y: 28.0 },
    'b window': { x: 22.0, y: 22.0 },
    't spawn': { x: 44.0, y: 84.0 },
    'outside long': { x: 62.0, y: 78.0 },
    'ct spawn': { x: 54.0, y: 22.0 },
    'tunnels': { x: 24.0, y: 46.0 }
  },
  inferno: {
    'banana': { x: 42.0, y: 62.0 },
    'coffins': { x: 26.0, y: 28.0 },
    'b site': { x: 28.0, y: 22.0 },
    'ruins': { x: 24.0, y: 26.0 },
    'church': { x: 24.0, y: 26.0 },
    'car': { x: 40.0, y: 52.0 },
    'a site': { x: 68.0, y: 32.0 },
    'pit': { x: 78.0, y: 34.0 },
    'apartments': { x: 62.0, y: 48.0 },
    'boiler': { x: 58.0, y: 42.0 },
    'long': { x: 62.0, y: 30.0 },
    'arch': { x: 54.0, y: 26.0 },
    'library': { x: 62.0, y: 24.0 },
    'mid': { x: 52.0, y: 56.0 },
    'second mid': { x: 46.0, y: 58.0 },
    't spawn': { x: 38.0, y: 84.0 },
    'ct spawn': { x: 48.0, y: 16.0 }
  },
  nuke: {
    'outside': { x: 46.0, y: 56.0 },
    'garage': { x: 52.0, y: 46.0 },
    'secret': { x: 42.0, y: 42.0 },
    'main': { x: 34.0, y: 52.0 },
    'hut': { x: 32.0, y: 46.0 },
    'a site': { x: 36.0, y: 42.0 },
    'heaven': { x: 38.0, y: 36.0 },
    'ramp': { x: 26.0, y: 48.0 },
    'b site': { x: 36.0, y: 42.0 },
    't spawn': { x: 48.0, y: 86.0 }
  },
  ancient: {
    'donut': { x: 54.0, y: 42.0 },
    'mid': { x: 50.0, y: 50.0 },
    'red': { x: 46.0, y: 46.0 },
    'a site': { x: 74.0, y: 35.0 },
    'a main': { x: 68.0, y: 52.0 },
    'cave': { x: 32.0, y: 48.0 },
    'b site': { x: 26.0, y: 35.0 },
    'b main': { x: 28.0, y: 56.0 },
    't spawn': { x: 48.0, y: 82.0 },
    'ct spawn': { x: 52.0, y: 22.0 }
  },
  anubis: {
    'connector': { x: 52.0, y: 44.0 },
    'mid': { x: 48.0, y: 52.0 },
    'bridge': { x: 44.0, y: 46.0 },
    'canal': { x: 36.0, y: 58.0 },
    'a site': { x: 72.0, y: 34.0 },
    'a main': { x: 66.0, y: 52.0 },
    'camera': { x: 74.0, y: 42.0 },
    'b site': { x: 24.0, y: 36.0 },
    'b main': { x: 28.0, y: 54.0 },
    't spawn': { x: 48.0, y: 84.0 },
    'ct spawn': { x: 52.0, y: 20.0 }
  }
}

/**
 * Parses user typed input or pasted string into a complete Lineup draft
 */
export function parseQuickLineupInput(rawText: string, defaultMapId = 'mirage'): ParsedLineupDraft {
  const text = rawText.trim()
  const lower = text.toLowerCase()
  let confidence = 20

  // 1. Detect Map
  const mapAliases: Record<string, string> = {
    'mirage': 'mirage',
    'dust2': 'dust2',
    'dust 2': 'dust2',
    'dust': 'dust2',
    'inferno': 'inferno',
    'nuke': 'nuke',
    'ancient': 'ancient',
    'anubis': 'anubis',
    'vertigo': 'vertigo',
    'cache': 'cache',
    'train': 'train',
    'overpass': 'overpass'
  }

  let selectedMapId = defaultMapId
  for (const [alias, mId] of Object.entries(mapAliases)) {
    if (lower.includes(alias)) {
      selectedMapId = mId
      confidence += 20
      break
    }
  }

  const mapInfo = MAPS_DATA.find(m => m.id === selectedMapId) || MAPS_DATA[0]

  // 2. Detect Grenade Type
  let grenadeType: GrenadeType = 'smoke'
  if (lower.includes('flash') || lower.includes('blind')) {
    grenadeType = 'flash'
    confidence += 15
  } else if (lower.includes('molotov') || lower.includes('molo') || lower.includes('fire') || lower.includes('incendiary')) {
    grenadeType = 'molotov'
    confidence += 15
  } else if (lower.includes('he') || lower.includes('grenade') || lower.includes('frag') || lower.includes('bomb')) {
    grenadeType = 'he'
    confidence += 15
  } else if (lower.includes('decoy')) {
    grenadeType = 'decoy'
    confidence += 15
  } else if (lower.includes('smoke')) {
    grenadeType = 'smoke'
    confidence += 15
  }

  // 3. Detect Team Side
  let side: TeamSide = 't'
  if (lower.includes(' ct') || lower.includes('counter') || lower.startsWith('ct ') || lower.includes('ct side')) {
    side = 'ct'
  } else if (lower.includes('both side') || lower.includes('all side')) {
    side = 'all'
  } else {
    side = 't'
  }

  // 4. Detect Throw Technique
  let throwType: ThrowType = grenadeType === 'flash' ? 'standing' : 'jumpthrow'
  if (lower.includes('run jumpthrow') || lower.includes('running jumpthrow') || lower.includes('run_jumpthrow')) {
    throwType = 'run_jumpthrow'
    confidence += 10
  } else if (lower.includes('w jumpthrow') || lower.includes('w_jumpthrow')) {
    throwType = 'w_jumpthrow'
    confidence += 10
  } else if (lower.includes('crouch jumpthrow') || lower.includes('crouch_jumpthrow')) {
    throwType = 'crouch_jumpthrow'
    confidence += 10
  } else if (lower.includes('jumpthrow') || lower.includes('jump throw') || lower.includes('jump')) {
    throwType = 'jumpthrow'
    confidence += 10
  } else if (lower.includes('runthrow') || lower.includes('run throw') || lower.includes('running')) {
    throwType = 'runthrow'
    confidence += 10
  } else if (lower.includes('crouch') || lower.includes('crouched')) {
    throwType = 'crouch'
    confidence += 10
  } else if (lower.includes('left right') || lower.includes('both click')) {
    throwType = 'left_right_click'
    confidence += 10
  } else if (lower.includes('standing') || lower.includes('stand') || lower.includes('left click')) {
    throwType = 'standing'
    confidence += 10
  }

  // 5. Parse CS2 Console setpos Coordinates if provided
  let cs2PosParsed: any = undefined
  let parsedConsoleCmd = ''
  let originPos: Coordinates = { x: 30, y: 70 }
  let landingPos: Coordinates = { x: 50, y: 40 }

  const posMatch = parseCS2Pos(text)
  if (posMatch && posMatch.valid) {
    const radar = worldToRadarCoords(posMatch.posX, posMatch.posY, selectedMapId)
    originPos = { x: radar.x, y: radar.y }
    parsedConsoleCmd = posMatch.consoleCommand
    cs2PosParsed = {
      x: posMatch.posX,
      y: posMatch.posY,
      z: posMatch.posZ,
      pitch: posMatch.angPitch,
      yaw: posMatch.angYaw,
      roll: posMatch.angRoll
    }
    confidence += 30
  }

  // 6. Detect Callout Targets & Start Location
  const mapCoords = CALLOUT_COORDS[selectedMapId] || CALLOUT_COORDS['mirage']
  let startLocation = side === 't' ? 'T Spawn' : 'CT Spawn'
  let endLocation = ''
  let detectedSite: 'A' | 'B' | 'Mid' | 'Spawn' | 'General' = 'General'

  // Match known callouts in text
  for (const [spotName, coords] of Object.entries(mapCoords)) {
    if (lower.includes(spotName)) {
      // Check if spot is prefixed with "from "
      if (lower.includes(`from ${spotName}`)) {
        startLocation = capitalizeWords(spotName)
        if (!posMatch?.valid) originPos = { ...coords }
      } else {
        if (!endLocation) {
          endLocation = capitalizeWords(spotName)
          landingPos = { ...coords }
          confidence += 20
        }
      }
    }
  }

  // Detect Bomb Site
  if (lower.includes(' a ') || lower.includes('a site') || lower.includes('site a') || lower.includes(' a-') || lower.endsWith(' a')) {
    detectedSite = 'A'
  } else if (lower.includes(' b ') || lower.includes('b site') || lower.includes('site b') || lower.includes(' b-') || lower.endsWith(' b')) {
    detectedSite = 'B'
  } else if (lower.includes('mid') || lower.includes('middle')) {
    detectedSite = 'Mid'
  }

  // Fallback defaults if no target was named
  if (!endLocation) {
    if (detectedSite === 'A') {
      endLocation = 'A Site'
      landingPos = mapInfo.sites.a || { x: 70, y: 35 }
    } else if (detectedSite === 'B') {
      endLocation = 'B Site'
      landingPos = mapInfo.sites.b || { x: 30, y: 30 }
    } else if (detectedSite === 'Mid') {
      endLocation = 'Mid'
      landingPos = { x: 50, y: 50 }
    } else {
      endLocation = 'Target Zone'
      landingPos = { x: originPos.x + 15, y: Math.max(originPos.y - 25, 20) }
    }
  }

  // 7. Auto-Generate Title
  const nadeLabel = capitalizeWords(grenadeType)
  const autoTitle = `${endLocation} ${nadeLabel}${startLocation ? ` from ${startLocation}` : ''}`

  // 8. Generate Default Instructions
  const throwLabel = throwType === 'jumpthrow' ? 'Jumpthrow' : throwType === 'runthrow' ? 'Runthrow' : throwType === 'standing' ? 'Left-click standard throw' : capitalizeWords(throwType.replace('_', ' '))
  const instructions = [
    `Position player at ${startLocation}. Align feet with reference corner.`,
    `Aim crosshair directly at the reference mark for ${endLocation}.`,
    `Execute ${throwLabel}. Grenade will bloom directly at ${endLocation}.`
  ]

  return {
    title: autoTitle,
    mapId: selectedMapId,
    mapName: mapInfo.name,
    grenadeType,
    side,
    throwType,
    tickrate: 'cs2_subtick',
    startLocation,
    endLocation,
    site: detectedSite,
    originCoords: originPos,
    landingCoords: landingPos,
    curveOffset: 0,
    instructions,
    consoleCommand: parsedConsoleCmd,
    difficulty: 'easy',
    cs2Pos: cs2PosParsed,
    tags: [selectedMapId, grenadeType, side, throwType, endLocation.toLowerCase()],
    confidence: Math.min(confidence, 100)
  }
}

function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
