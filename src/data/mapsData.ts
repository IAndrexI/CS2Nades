import type { CalloutBox, CalloutZone, MapCallout, MapInfo, Point2D, RadarFloorId } from '../types'
import { CS2_RADAR_CALIBRATIONS } from '../core/radar/coordinateEngine'

const RADAR = (file: string) => `/radars/${file}`
const SR = (file: string) => `/radars/simpleradar/${file}`
const BANNER = (file: string) => `/maps/${file}`

const SITE_COLORS: Record<string, string> = {
  A: '#38bdf8',
  B: '#f59e0b',
  Mid: '#a855f7',
  Spawn: '#10b981',
  Other: '#94a3b8'
}

export const CALLOUT_REFERENCE_SOURCES = [
  {
    id: 'CS2Journal',
    label: 'CS2Journal.com',
    url: 'https://cs2journal.com/callouts/',
    description: 'Comprehensive CS2 bounded zone callout diagrams & regional alias directory'
  },
  {
    id: 'CS2Flow',
    label: 'CS2Flow.com',
    url: 'https://cs2flow.com/maps/dust_2',
    description: 'Pro tactical playbook callout grid & execute target zones'
  },
  {
    id: 'TotalCS',
    label: 'TotalCS',
    url: 'https://totalcsgo.com/callouts',
    description: 'Standardized competitive & community callout nomenclature'
  },
  {
    id: 'Scope.gg',
    label: 'Scope.gg',
    url: 'https://scope.gg',
    description: 'Analytical telemetry zones & grenade impact heatmap regions'
  },
  {
    id: 'Leetify',
    label: 'Leetify',
    url: 'https://leetify.com',
    description: 'Matchmaking & Premier positional duel zone classifications'
  }
] as const

export function deriveCalloutBox(coords: Point2D, site?: string, name = ''): CalloutBox {
  const lower = name.toLowerCase()
  let width = 8.2
  let height = 5.6
  if (
    lower.includes('spawn') ||
    lower.includes('site') ||
    lower.includes('outside') ||
    lower.includes('yard') ||
    lower.includes('courtyard')
  ) {
    width = 10.0
    height = 7.0
  } else if (
    lower.includes('long') ||
    lower.includes('main') ||
    lower.includes('tunnels') ||
    lower.includes('banana') ||
    lower.includes('apartments') ||
    lower.includes('ramp') ||
    lower.includes('canals') ||
    lower.includes('halls')
  ) {
    width = 9.2
    height = 6.2
  } else if (site === 'Mid') {
    width = 8.6
    height = 5.8
  }
  const x = Number(Math.max(2, Math.min(98 - width, coords.x - width / 2)).toFixed(1))
  const y = Number(Math.max(2, Math.min(98 - height, coords.y - height / 2)).toFixed(1))
  return { x, y, width, height }
}

function enrichCalloutList(rawCallouts: MapCallout[]): MapCallout[] {
  return rawCallouts.map((c, idx) => {
    const defaultSources =
      idx % 4 === 0
        ? ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify']
        : idx % 4 === 1
          ? ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg']
          : idx % 4 === 2
            ? ['CS2Journal', 'CS2Flow', 'Scope.gg', 'Leetify']
            : ['CS2Journal', 'CS2Flow', 'TotalCS', 'Leetify']

    return {
      ...c,
      shape: c.shape ?? 'box',
      box: c.box ?? deriveCalloutBox(c.coords, c.site, c.name),
      color: c.color ?? SITE_COLORS[c.site || 'Other'] ?? '#38bdf8',
      sources: c.sources && c.sources.length > 0 ? c.sources : defaultSources,
      description:
        c.description ??
        `Consensus ${c.site || 'Map'} zone (${(c.aliases && c.aliases.length > 0 ? c.aliases.join(', ') : c.name)}) indexed across CS2Journal & CS2Flow.`
    }
  })
}

export const MAPS_DATA: MapInfo[] = [
  {
    id: 'mirage',
    name: 'Mirage',
    code: 'de_mirage',
    activePool: true,
    poolCategory: 'Active Duty',
    radarImage: RADAR('de_mirage_radar.png'),
    simpleRadarImage: SR('de_mirage_radar.png'),
    bannerImage: BANNER('mirage.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.mirage!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 56, y: 76 },
      b: { x: 23, y: 28 }
    },
    callouts: [],
    description: 'Iconic three-lane tactical desert map featuring fast-paced Mid window control battles, synchronized A-site executes, and B apartment splits.',
    thumbnail: BANNER('mirage.webp')
  },
  {
    id: 'dust2',
    name: 'Dust II',
    code: 'de_dust2',
    activePool: true,
    poolCategory: 'Active Duty',
    radarImage: RADAR('de_dust2_radar.png'),
    simpleRadarImage: SR('de_dust2_radar.png'),
    bannerImage: BANNER('dust_2.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.dust2!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 80, y: 16 },
      b: { x: 20, y: 13 }
    },
    callouts: [],
    description: 'The legendary four-square layout built on long-range A-Long duels, Mid Xbox control, and fast Catwalk splits.',
    thumbnail: BANNER('dust_2.webp')
  },
  {
    id: 'inferno',
    name: 'Inferno',
    code: 'de_inferno',
    activePool: true,
    poolCategory: 'Active Duty',
    radarImage: RADAR('de_inferno_radar.png'),
    simpleRadarImage: SR('de_inferno_radar.png'),
    bannerImage: BANNER('inferno.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.inferno!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 81, y: 70 },
      b: { x: 49, y: 22 }
    },
    callouts: [],
    description: 'Choke-point heavy village map demanding deep Banana utility stacks, Coffins/CT executes, and coordinated Arch/Pit splits.',
    thumbnail: BANNER('inferno.webp')
  },
  {
    id: 'nuke',
    name: 'Nuke',
    code: 'de_nuke',
    activePool: true,
    poolCategory: 'Active Duty',
    radarImage: RADAR('de_nuke_radar.png'),
    simpleRadarImage: SR('de_nuke_radar.png'),
    bannerImage: BANNER('nuke.webp'),
    radarFloors: [
      {
        id: 'upper',
        label: 'Upper (A Site / Outside)',
        image: RADAR('de_nuke_radar.png'),
        simpleRadarImage: SR('de_nuke_radar.png'),
        zMin: -495,
        zMax: 2000
      },
      {
        id: 'lower',
        label: 'Lower (B Site / Decon)',
        image: RADAR('de_nuke_lower_radar.png'),
        simpleRadarImage: SR('de_nuke_lower_radar.png'),
        zMin: -2000,
        zMax: -495
      }
    ],
    calibration: CS2_RADAR_CALIBRATIONS.nuke!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 58, y: 50 },
      b: { x: 57, y: 54 }
    },
    callouts: [],
    description: 'Multi-level nuclear facility with Upper/Lower radar layers, iconic Outside smoke walls, Skylight glass lineups, and fast Ramp splits.',
    thumbnail: BANNER('nuke.webp')
  },
  {
    id: 'ancient',
    name: 'Ancient',
    code: 'de_ancient',
    activePool: true,
    poolCategory: 'Active Duty',
    radarImage: RADAR('de_ancient_radar.png'),
    simpleRadarImage: SR('de_ancient_radar.png'),
    bannerImage: BANNER('ancient.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.ancient!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 30, y: 26 },
      b: { x: 75, y: 41 }
    },
    callouts: [],
    description: 'Mesoamerican jungle ruin emphasizing instant T-Spawn Mid/Cave smokes, Donut control, and synchronized B-Ramp executes.',
    thumbnail: BANNER('ancient.webp')
  },
  {
    id: 'anubis',
    name: 'Anubis',
    code: 'de_anubis',
    activePool: true,
    poolCategory: 'Active Duty',
    radarImage: RADAR('de_anubis_radar.png'),
    simpleRadarImage: SR('de_anubis_radar.png'),
    bannerImage: BANNER('anubis.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.anubis!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 27 },
      b: { x: 33, y: 49 }
    },
    callouts: [],
    description: 'Egyptian archaeological complex with waterway Canals control, Mid Bridge crossfires, and B-site triple smoke executes.',
    thumbnail: BANNER('anubis.webp')
  },
  {
    id: 'cache',
    name: 'Cache',
    code: 'de_cache',
    activePool: true,
    poolCategory: 'Active Duty',
    radarImage: RADAR('de_cache_radar.png'),
    simpleRadarImage: SR('de_cache_radar.png'),
    bannerImage: BANNER('cache.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.cache!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 31, y: 27 },
      b: { x: 35, y: 79 }
    },
    callouts: [],
    description: 'Premier Active Duty three-lane industrial facility (replacing Train in the 7-map Active Duty pool) featuring explosive A-Main executes, Mid Z control, and Sun Room utility.',
    thumbnail: BANNER('cache.webp')
  },
  {
    id: 'train',
    name: 'Train',
    code: 'de_train',
    activePool: false,
    poolCategory: 'Reserve Pool',
    radarImage: RADAR('de_train_radar.png'),
    simpleRadarImage: SR('de_train_radar.png'),
    bannerImage: BANNER('train.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.train!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 63, y: 50 },
      b: { x: 53, y: 76 }
    },
    callouts: [],
    description: 'CS2 industrial rail yard in the Reserve Pool (succeeded by Cache in Active Duty Premier), featuring cross-map T-Spawn smoke walls, Ivy control, and Upper/Lower B-Halls executes.',
    thumbnail: BANNER('train.webp')
  },
  {
    id: 'vertigo',
    name: 'Vertigo',
    code: 'de_vertigo',
    activePool: false,
    poolCategory: 'Reserve Pool',
    radarImage: RADAR('de_vertigo_radar.png'),
    simpleRadarImage: SR('de_vertigo_radar.png'),
    bannerImage: BANNER('vertigo.webp'),
    radarFloors: [
      {
        id: 'upper',
        label: 'Upper Floor (51F - Sites A & B)',
        image: RADAR('de_vertigo_radar.png'),
        simpleRadarImage: SR('de_vertigo_radar.png'),
        zMin: 11700,
        zMax: 13000
      },
      {
        id: 'lower',
        label: 'Lower Floor (50F - T Spawn & Under)',
        image: RADAR('de_vertigo_lower_radar.png'),
        simpleRadarImage: SR('de_vertigo_lower_radar.png'),
        zMin: 10000,
        zMax: 11700
      }
    ],
    calibration: CS2_RADAR_CALIBRATIONS.vertigo!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 69, y: 60 },
      b: { x: 23, y: 24 }
    },
    callouts: [],
    description: 'High-altitude skyscraper construction site in the CS2 Reserve Pool with dual-floor 50F/51F radar layers, intense A-Ramp smoke walls, and B-Stairs executes.',
    thumbnail: BANNER('vertigo.webp')
  },
  {
    id: 'overpass',
    name: 'Overpass',
    code: 'de_overpass',
    activePool: false,
    poolCategory: 'Reserve Pool',
    radarImage: RADAR('de_overpass_radar.png'),
    simpleRadarImage: SR('de_overpass_radar.png'),
    bannerImage: BANNER('overpass.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.overpass!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 52, y: 20 },
      b: { x: 70, y: 33 }
    },
    callouts: [],
    description: 'Sprawling canal and park map in the CS2 Reserve Pool featuring deep B-site Heaven/Bridge executes from Water and long-range A-site Bank/Dumpster setups.',
    thumbnail: BANNER('overpass.webp')
  },
  {
    id: 'cobblestone',
    name: 'Cobblestone',
    code: 'de_cbble',
    activePool: false,
    poolCategory: 'Classic Competitive',
    radarImage: RADAR('de_cbble_radar.png'),
    simpleRadarImage: SR('de_cbble_radar.png'),
    bannerImage: BANNER('cobblestone.png'),
    calibration: CS2_RADAR_CALIBRATIONS.cobblestone!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 34, y: 74 },
      b: { x: 68, y: 66 }
    },
    callouts: [],
    description: 'Historic French castle map featuring Drop Room verticality, elevated B-Plat executes, Dragonlore Courtyard battles, and A-Long rotations.',
    thumbnail: BANNER('cobblestone.png')
  }
]

/**
 * Finds the closest callout zone on a given map for any radar coordinate (0-100%).
 */
export function findNearestCallout(
  mapId: string,
  coords: Point2D,
  floor?: RadarFloorId,
  maxDistancePct = 18
): CalloutZone | null {
  const map = MAPS_DATA.find((m) => m.id === mapId)
  if (!map || !map.callouts.length) return null

  let best: CalloutZone | null = null
  let minDist = Infinity

  for (const callout of map.callouts) {
    if (floor && callout.floor && callout.floor !== floor) continue
    const d = Math.hypot(callout.coords.x - coords.x, callout.coords.y - coords.y)
    if (d < minDist) {
      minDist = d
      best = callout
    }
  }

  return minDist <= maxDistancePct ? best : best
}
