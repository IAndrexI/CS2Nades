import type { MapInfo } from '../types'

const SR = (file: string) => `/radars/simpleradar/${file}`
const MM = (file: string) => `/minimaps/${file}`
const MI = (file: string) => `/map-icons/${file}`

export const MAPS_DATA: MapInfo[] = [
  // ─────────────────────────────────────────────────────────────
  // ACTIVE PREMIER COMPETITIVE POOL (7 MAPS)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'mirage',
    name: 'Mirage',
    code: 'de_mirage',
    activePool: true,
    radarImage: SR('de_mirage_radar.png'),
    icon: MI('mirage.webp'),
    minimap: MM('mirage.webp'),
    thumbnail: MM('mirage.webp'),
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
    radarImage: SR('de_dust2_radar.png'),
    icon: MI('dust_2.webp'),
    minimap: MM('dust_2.webp'),
    thumbnail: MM('dust_2.webp'),
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
    radarImage: SR('de_inferno_radar.png'),
    icon: MI('inferno.webp'),
    minimap: MM('inferno.webp'),
    thumbnail: MM('inferno.webp'),
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
    radarImage: SR('de_cache_radar.png'),
    icon: MI('cache.webp'),
    minimap: MM('cache.webp'),
    thumbnail: MM('cache.webp'),
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
    radarImage: SR('de_ancient_radar.png'),
    icon: MI('ancient.webp'),
    minimap: MM('ancient.webp'),
    thumbnail: MM('ancient.webp'),
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
    radarImage: SR('de_nuke_radar.png'),
    radarFloors: [
      { id: 'upper', label: 'Upper', image: SR('de_nuke_radar.png') },
      { id: 'lower', label: 'Lower', image: SR('de_nuke_lower_radar.png') }
    ],
    icon: MI('nuke.webp'),
    minimap: MM('nuke.webp'),
    thumbnail: MM('nuke.webp'),
    viewBox: '0 0 2000 1000',
    sites: {
      a: { x: 24.2, y: 47.5 },
      b: { x: 74.2, y: 51.0 }
    },
    callouts: [],
    description: 'Multi-level nuclear facility with vertical soundscapes, strategic Outside smoke walls, and fast Ramp splits.'
  },
  {
    id: 'anubis',
    name: 'Anubis',
    code: 'de_anubis',
    activePool: true,
    radarImage: MM('anubis.webp'),
    icon: MI('anubis.webp'),
    minimap: MM('anubis.webp'),
    thumbnail: MM('anubis.webp'),
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
    radarImage: SR('de_overpass_radar.png'),
    icon: MI('overpass.webp'),
    minimap: MM('overpass.webp'),
    thumbnail: MM('overpass.webp'),
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
    radarImage: SR('de_vertigo_radar.png'),
    radarFloors: [
      { id: 'upper', label: 'Upper', image: SR('de_vertigo_radar.png') },
      { id: 'lower', label: 'Lower', image: SR('de_vertigo_lower_radar.png') }
    ],
    icon: MI('vertigo.webp'),
    minimap: MM('vertigo.webp'),
    thumbnail: MM('vertigo.webp'),
    viewBox: '0 0 2000 1000',
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
    radarImage: SR('de_train_radar.png'),
    icon: MI('train.webp'),
    minimap: MM('train.webp'),
    thumbnail: MM('train.webp'),
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
