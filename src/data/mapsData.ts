import type { MapInfo } from '../types'

export const MAPS_DATA: MapInfo[] = [
  {
    id: 'mirage',
    name: 'Mirage',
    code: 'de_mirage',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_mirage_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 38 },
      b: { x: 28, y: 30 }
    },
    callouts: [],
    description: 'Iconic tactical desert map featuring fast-paced Mid control battles, explosive A site executes, and tight B apartment pushes.',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'inferno',
    name: 'Inferno',
    code: 'de_inferno',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_inferno_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 68, y: 32 },
      b: { x: 28, y: 22 }
    },
    callouts: [],
    description: 'Choke-point heavy Italian village map demanding precise utility usage down Banana and complex Arch/Library executes.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'dust2',
    name: 'Dust II',
    code: 'de_dust2',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_dust2_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 78, y: 28 },
      b: { x: 18, y: 24 }
    },
    callouts: [],
    description: 'The legendary four-square layout built on crisp long-range aim duels, Mid control, and timed A-splits.',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'nuke',
    name: 'Nuke',
    code: 'de_nuke',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_nuke_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 50, y: 45 },
      b: { x: 50, y: 62 }
    },
    callouts: [],
    description: 'Multi-level nuclear facility with vertical soundscapes, strategic Outside smoke walls, and fast Ramp splits.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'ancient',
    name: 'Ancient',
    code: 'de_ancient',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_ancient_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 35 },
      b: { x: 26, y: 35 }
    },
    callouts: [],
    description: 'Mesoamerican jungle ruin emphasizing mid donut control, cave utility, and synchronized site breaches.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'anubis',
    name: 'Anubis',
    code: 'de_anubis',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_anubis_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 32 },
      b: { x: 24, y: 38 }
    },
    callouts: [],
    description: 'Vibrant Egyptian archaeological site with dynamic waterway routes, split mid control, and technical grenade lineups.',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'vertigo',
    name: 'Vertigo',
    code: 'de_vertigo',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_vertigo_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 72, y: 38 },
      b: { x: 30, y: 42 }
    },
    callouts: [],
    description: 'High-altitude skyscraper construction site with intense ramp duels and close-quarters combat.',
    thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'overpass',
    name: 'Overpass',
    code: 'de_overpass',
    activePool: false,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_overpass_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 65, y: 35 },
      b: { x: 35, y: 55 }
    },
    callouts: [],
    description: 'Sprawling Berlin park and canal map with rich tactical depth and deep vertical monster pushes.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'train',
    name: 'Train',
    code: 'de_train',
    activePool: true,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_train_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 48, y: 38 },
      b: { x: 48, y: 68 }
    },
    callouts: [],
    description: 'Updated CS2 trainyard featuring tight rail car angles, long cross-map smokes, and rapid popdog executes.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'cache',
    name: 'Cache',
    code: 'de_cache',
    activePool: false,
    radarImage: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/radars/de_cache_radar_psd.png',
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 72, y: 32 },
      b: { x: 26, y: 34 }
    },
    callouts: [],
    description: 'Chernobyl industrial facility with clear 3-lane structure and explosive site retakes.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
  }
]
