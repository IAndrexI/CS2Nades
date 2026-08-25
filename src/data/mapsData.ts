import type { MapInfo } from '../types'

const MAP = (file: string) => `/maps/${file}`
const ICON = (file: string) => `/map-icons/${file}`

export const MAPS_DATA: MapInfo[] = [
  // ─────────────────────────────────────────────────────────────
  // ACTIVE PREMIER COMPETITIVE POOL (7 MAPS)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'mirage',
    name: 'Mirage',
    code: 'de_mirage',
    activePool: true,
    radarImage: MAP('mirage.webp'),
    icon: ICON('mirage.webp'),
    minimap: MAP('mirage.webp'),
    thumbnail: MAP('mirage.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 38 },
      b: { x: 28, y: 30 }
    },
    callouts: [],
    description: 'Iconic tactical desert map featuring fast-paced Mid control battles, explosive A site executes, and tight B apartment pushes.'
  },
  {
    id: 'dust2',
    name: 'Dust II',
    code: 'de_dust2',
    activePool: true,
    radarImage: MAP('dust_2.webp'),
    icon: ICON('dust_2.webp'),
    minimap: MAP('dust_2.webp'),
    thumbnail: MAP('dust_2.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 78, y: 28 },
      b: { x: 18, y: 24 }
    },
    callouts: [],
    description: 'The legendary four-square layout built on crisp long-range aim duels, Mid control, and timed A-splits.'
  },
  {
    id: 'inferno',
    name: 'Inferno',
    code: 'de_inferno',
    activePool: true,
    radarImage: MAP('inferno.webp'),
    icon: ICON('inferno.webp'),
    minimap: MAP('inferno.webp'),
    thumbnail: MAP('inferno.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 68, y: 32 },
      b: { x: 28, y: 22 }
    },
    callouts: [],
    description: 'Choke-point heavy Italian village map demanding precise utility usage down Banana and complex Arch/Library executes.'
  },
  {
    id: 'cache',
    name: 'Cache',
    code: 'de_cache',
    activePool: true,
    radarImage: MAP('cache.webp'),
    icon: ICON('cache.webp'),
    minimap: MAP('cache.webp'),
    thumbnail: MAP('cache.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 72, y: 32 },
      b: { x: 26, y: 34 }
    },
    callouts: [],
    description: 'Chernobyl industrial facility with clear 3-lane structure, explosive site retakes, and tactical mid boosts.'
  },
  {
    id: 'ancient',
    name: 'Ancient',
    code: 'de_ancient',
    activePool: true,
    radarImage: MAP('ancient.webp'),
    icon: ICON('ancient.webp'),
    minimap: MAP('ancient.webp'),
    thumbnail: MAP('ancient.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 35 },
      b: { x: 26, y: 35 }
    },
    callouts: [],
    description: 'Mesoamerican jungle ruin emphasizing mid donut control, cave utility, and synchronized site breaches.'
  },
  {
    id: 'nuke',
    name: 'Nuke',
    code: 'de_nuke',
    activePool: true,
    radarImage: MAP('nuke.webp'),
    icon: ICON('nuke.webp'),
    minimap: MAP('nuke.webp'),
    thumbnail: MAP('nuke.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 48, y: 48 },
      b: { x: 52, y: 52 }
    },
    callouts: [],
    description: 'Multi-level nuclear facility with vertical soundscapes, strategic Outside smoke walls, and fast Ramp splits.'
  },
  {
    id: 'anubis',
    name: 'Anubis',
    code: 'de_anubis',
    activePool: true,
    radarImage: MAP('anubis.webp'),
    icon: ICON('anubis.webp'),
    minimap: MAP('anubis.webp'),
    thumbnail: MAP('anubis.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 32 },
      b: { x: 24, y: 38 }
    },
    callouts: [],
    description: 'Vibrant Egyptian archaeological site with dynamic waterway routes, split mid control, and technical grenade lineups.'
  },

  // ─────────────────────────────────────────────────────────────
  // RESERVE & CASUAL MAPS (NOT IN ACTIVE PREMIER POOL)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'overpass',
    name: 'Overpass',
    code: 'de_overpass',
    activePool: false,
    radarImage: MAP('overpass.webp'),
    icon: ICON('overpass.webp'),
    minimap: MAP('overpass.webp'),
    thumbnail: MAP('overpass.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 65, y: 35 },
      b: { x: 35, y: 55 }
    },
    callouts: [],
    description: 'Sprawling Berlin park and canal map with rich tactical depth and deep vertical monster pushes.'
  },
  {
    id: 'vertigo',
    name: 'Vertigo',
    code: 'de_vertigo',
    activePool: false,
    radarImage: MAP('vertigo.webp'),
    icon: ICON('vertigo.webp'),
    minimap: MAP('vertigo.webp'),
    thumbnail: MAP('vertigo.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 36, y: 38 },
      b: { x: 65, y: 42 }
    },
    callouts: [],
    description: 'High-altitude skyscraper construction site with intense ramp duels and close-quarters combat.'
  },
  {
    id: 'train',
    name: 'Train',
    code: 'de_train',
    activePool: false,
    radarImage: MAP('train.webp'),
    icon: ICON('train.webp'),
    minimap: MAP('train.webp'),
    thumbnail: MAP('train.webp'),
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 48, y: 38 },
      b: { x: 48, y: 68 }
    },
    callouts: [],
    description: 'Updated CS2 trainyard featuring tight rail car angles, long cross-map smokes, and rapid popdog executes.'
  },
  {
    id: 'office',
    name: 'Office',
    code: 'cs_office',
    activePool: false,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/cs_office_radar_psd.png',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 30, y: 40 },
      b: { x: 70, y: 40 }
    },
    callouts: [],
    description: 'Classic snowy corporate office hostage rescue map with long hallway sightlines and tight room-clearing.'
  },
  {
    id: 'italy',
    name: 'Italy',
    code: 'cs_italy',
    activePool: false,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/cs_italy_radar_psd.png',
    thumbnail: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&auto=format&fit=crop&q=80',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 35, y: 30 },
      b: { x: 65, y: 70 }
    },
    callouts: [],
    description: 'Historic sunlit Italian marketplace hostage map featuring tight alleyways and apartment corridors.'
  },
  {
    id: 'boulder',
    name: 'Boulder',
    code: 'de_boulder',
    activePool: false,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_overpass_radar_psd.png',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 70, y: 35 },
      b: { x: 30, y: 55 }
    },
    callouts: [],
    description: 'Rugged mountainous tactical bomb defusal environment with rock formations and elevated firing positions.'
  },
  {
    id: 'fachwerk',
    name: 'Fachwerk',
    code: 'de_fachwerk',
    activePool: false,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_inferno_radar_psd.png',
    thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 68, y: 35 },
      b: { x: 32, y: 35 }
    },
    callouts: [],
    description: 'Traditional European timber-framed architecture setting featuring multilevel combat and tight alley angles.'
  },
  {
    id: 'shelter',
    name: 'Shelter',
    code: 'de_shelter',
    activePool: false,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_nuke_radar_psd.png',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 60, y: 40 },
      b: { x: 40, y: 60 }
    },
    callouts: [],
    description: 'Subterranean bunker facility with reinforced doors, vent passages, and intense CQC grenade choke points.'
  }
]
