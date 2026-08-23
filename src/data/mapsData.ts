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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 38, y: 88 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 62, y: 22 } },
      { id: 'a_site', name: 'A Site', site: 'A', coords: { x: 74, y: 38 } },
      { id: 'a_palace', name: 'Palace', site: 'A', coords: { x: 88, y: 55 } },
      { id: 'a_ramp', name: 'A Ramp', site: 'A', coords: { x: 68, y: 64 } },
      { id: 'tetris', name: 'Tetris', site: 'A', coords: { x: 67, y: 46 } },
      { id: 'stairs', name: 'Stairs', site: 'A', coords: { x: 64, y: 36 } },
      { id: 'jungle', name: 'Jungle', site: 'A', coords: { x: 64, y: 28 } },
      { id: 'ticket', name: 'Ticket Booth', site: 'A', coords: { x: 72, y: 24 } },
      { id: 'connector', name: 'Connector', site: 'Mid', coords: { x: 55, y: 44 } },
      { id: 'mid_window', name: 'Window', site: 'Mid', coords: { x: 49, y: 37 } },
      { id: 'top_mid', name: 'Top Mid', site: 'Mid', coords: { x: 44, y: 66 } },
      { id: 'catwalk', name: 'Catwalk / Short', site: 'Mid', coords: { x: 38, y: 45 } },
      { id: 'underpass', name: 'Underpass', site: 'Mid', coords: { x: 50, y: 55 } },
      { id: 'b_apartments', name: 'B Apps', site: 'B', coords: { x: 20, y: 58 } },
      { id: 'b_site', name: 'B Site', site: 'B', coords: { x: 28, y: 30 } },
      { id: 'market', name: 'Market', site: 'B', coords: { x: 42, y: 24 } },
      { id: 'b_short', name: 'B Short', site: 'B', coords: { x: 32, y: 42 } },
      { id: 'van', name: 'Van', site: 'B', coords: { x: 19, y: 36 } },
      { id: 'bench', name: 'Bench', site: 'B', coords: { x: 32, y: 23 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 42, y: 88 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 50, y: 15 } },
      { id: 'banana', name: 'Banana', site: 'B', coords: { x: 30, y: 48 } },
      { id: 'car', name: 'Car / Logs', site: 'B', coords: { x: 26, y: 40 } },
      { id: 'b_site', name: 'B Site', site: 'B', coords: { x: 28, y: 22 } },
      { id: 'coffins', name: 'Coffins', site: 'B', coords: { x: 35, y: 20 } },
      { id: 'church', name: 'Ruins / Church', site: 'B', coords: { x: 40, y: 24 } },
      { id: 'mid', name: 'Mid', site: 'Mid', coords: { x: 48, y: 60 } },
      { id: 'second_mid', name: 'Second Mid', site: 'Mid', coords: { x: 60, y: 68 } },
      { id: 'apartments', name: 'A Apps / Boiler', site: 'A', coords: { x: 65, y: 50 } },
      { id: 'short_a', name: 'Short A', site: 'A', coords: { x: 58, y: 38 } },
      { id: 'long_a', name: 'Long A / Arch', site: 'A', coords: { x: 74, y: 42 } },
      { id: 'a_site', name: 'A Site / Pit', site: 'A', coords: { x: 68, y: 32 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 48, y: 88 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 52, y: 36 } },
      { id: 'long_doors', name: 'Long Doors', site: 'A', coords: { x: 80, y: 68 } },
      { id: 'long_a', name: 'Long A / Pit', site: 'A', coords: { x: 82, y: 45 } },
      { id: 'a_site', name: 'A Site (Goose)', site: 'A', coords: { x: 78, y: 28 } },
      { id: 'catwalk', name: 'Catwalk / Short A', site: 'A', coords: { x: 60, y: 42 } },
      { id: 'mid_doors', name: 'Mid Doors', site: 'Mid', coords: { x: 50, y: 52 } },
      { id: 'xbox', name: 'Xbox', site: 'Mid', coords: { x: 48, y: 60 } },
      { id: 'lower_tunnels', name: 'Lower Tunnels', site: 'B', coords: { x: 36, y: 56 } },
      { id: 'upper_tunnels', name: 'Upper Tunnels', site: 'B', coords: { x: 24, y: 48 } },
      { id: 'b_doors', name: 'B Doors / Window', site: 'B', coords: { x: 26, y: 30 } },
      { id: 'b_site', name: 'B Site / Plat', site: 'B', coords: { x: 18, y: 24 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 15, y: 50 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 85, y: 50 } },
      { id: 'outside', name: 'Outside / Yard', site: 'Mid', coords: { x: 35, y: 25 } },
      { id: 'secret', name: 'Secret / B Stairs', site: 'B', coords: { x: 55, y: 20 } },
      { id: 'garage', name: 'Garage / Red Box', site: 'Mid', coords: { x: 40, y: 15 } },
      { id: 'hut', name: 'Hut', site: 'A', coords: { x: 42, y: 45 } },
      { id: 'squeaky', name: 'Squeaky', site: 'A', coords: { x: 38, y: 52 } },
      { id: 'a_site', name: 'A Site / Main', site: 'A', coords: { x: 50, y: 45 } },
      { id: 'heaven', name: 'Heaven', site: 'A', coords: { x: 58, y: 42 } },
      { id: 'ramp', name: 'Ramp / Radio', site: 'B', coords: { x: 45, y: 70 } },
      { id: 'b_site', name: 'B Site / Lower', site: 'B', coords: { x: 50, y: 62 } },
      { id: 'vents', name: 'Vents', site: 'Mid', coords: { x: 52, y: 52 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 50, y: 88 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 50, y: 18 } },
      { id: 'mid', name: 'Mid / Donut', site: 'Mid', coords: { x: 50, y: 48 } },
      { id: 'donut', name: 'Donut / Room', site: 'Mid', coords: { x: 62, y: 42 } },
      { id: 'a_main', name: 'A Main', site: 'A', coords: { x: 72, y: 58 } },
      { id: 'a_site', name: 'A Site / Temple', site: 'A', coords: { x: 74, y: 35 } },
      { id: 'b_ramp', name: 'B Ramp / Alley', site: 'B', coords: { x: 28, y: 62 } },
      { id: 'b_cave', name: 'Cave / Cheetah', site: 'B', coords: { x: 36, y: 45 } },
      { id: 'b_site', name: 'B Site / Pillar', site: 'B', coords: { x: 26, y: 35 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 50, y: 88 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 50, y: 18 } },
      { id: 'canal', name: 'Canal / Water', site: 'Mid', coords: { x: 42, y: 60 } },
      { id: 'mid', name: 'Mid / Bridge', site: 'Mid', coords: { x: 52, y: 48 } },
      { id: 'a_main', name: 'A Main / Walkway', site: 'A', coords: { x: 70, y: 55 } },
      { id: 'a_site', name: 'A Site / Heaven', site: 'A', coords: { x: 74, y: 32 } },
      { id: 'b_main', name: 'B Main / Palace', site: 'B', coords: { x: 22, y: 58 } },
      { id: 'b_site', name: 'B Site / Pillar', site: 'B', coords: { x: 24, y: 38 } },
      { id: 'connector', name: 'Connector / Camera', site: 'Mid', coords: { x: 38, y: 40 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn (50th Fl)', site: 'Spawn', coords: { x: 48, y: 85 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 50, y: 20 } },
      { id: 'a_ramp', name: 'A Ramp', site: 'A', coords: { x: 68, y: 62 } },
      { id: 'a_site', name: 'A Site (Crane)', site: 'A', coords: { x: 72, y: 38 } },
      { id: 'mid', name: 'Mid / Connector', site: 'Mid', coords: { x: 50, y: 48 } },
      { id: 'b_stairs', name: 'B Stairs / Catwalk', site: 'B', coords: { x: 28, y: 65 } },
      { id: 'b_site', name: 'B Site', site: 'B', coords: { x: 30, y: 42 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 20, y: 85 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 75, y: 25 } },
      { id: 'monster', name: 'Monster / Pipe', site: 'B', coords: { x: 25, y: 60 } },
      { id: 'b_site', name: 'B Site / Pillar', site: 'B', coords: { x: 35, y: 55 } },
      { id: 'water', name: 'Water / Construction', site: 'Mid', coords: { x: 35, y: 72 } },
      { id: 'toilets', name: 'Toilets / Restrooms', site: 'A', coords: { x: 55, y: 50 } },
      { id: 'a_site', name: 'A Site (Van)', site: 'A', coords: { x: 65, y: 35 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 18, y: 50 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 82, y: 50 } },
      { id: 'a_site', name: 'A Site / Main Train', site: 'A', coords: { x: 48, y: 38 } },
      { id: 'ivy', name: 'Ivy / Alley', site: 'A', coords: { x: 60, y: 22 } },
      { id: 'popdog', name: 'Popdog / Ladder', site: 'Mid', coords: { x: 42, y: 48 } },
      { id: 'b_site', name: 'B Site / Upper B', site: 'B', coords: { x: 48, y: 68 } }
    ],
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
    callouts: [
      { id: 't_spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 50, y: 88 } },
      { id: 'ct_spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 50, y: 15 } },
      { id: 'mid_garage', name: 'Mid Garage', site: 'Mid', coords: { x: 48, y: 62 } },
      { id: 'mid_boost', name: 'Boost / Vents', site: 'Mid', coords: { x: 42, y: 46 } },
      { id: 'a_main', name: 'A Main', site: 'A', coords: { x: 68, y: 56 } },
      { id: 'a_site', name: 'A Site / Squeaky', site: 'A', coords: { x: 72, y: 32 } },
      { id: 'b_main', name: 'B Main / Sun Room', site: 'B', coords: { x: 25, y: 55 } },
      { id: 'b_site', name: 'B Site / Checkers', site: 'B', coords: { x: 26, y: 34 } }
    ],
    description: 'Chernobyl industrial facility with clear 3-lane structure and explosive site retakes.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
  }
]
