import type { CalloutZone, MapInfo, Point2D, RadarFloorId } from '../types'
import { CS2_RADAR_CALIBRATIONS } from '../core/radar/coordinateEngine'

const RADAR = (file: string) => `/radars/${file}`
const SR = (file: string) => `/radars/simpleradar/${file}`
const BANNER = (file: string) => `/maps/${file}`

export const MAPS_DATA: MapInfo[] = [
  {
    id: 'mirage',
    name: 'Mirage',
    code: 'de_mirage',
    activePool: true,
    radarImage: RADAR('de_mirage_radar.png'),
    simpleRadarImage: SR('de_mirage_radar.png'),
    bannerImage: BANNER('mirage.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.mirage!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 54, y: 76 },
      b: { x: 23, y: 28 }
    },
    callouts: [
      { id: 'mir-t-spawn', name: 'T Spawn', coords: { x: 88, y: 36 }, aliases: ['spawn', 't roof'], commonNades: ['Window Smoke', 'Ticket Smoke', 'Stairs Smoke'] },
      { id: 'mir-ct-spawn', name: 'CT Spawn', coords: { x: 30, y: 70 }, aliases: ['ct', 'ticket cross'], commonNades: ['Ticket Smoke'] },
      { id: 'mir-ticket', name: 'Ticket Booth', coords: { x: 45, y: 78 }, aliases: ['ticket', 'ct booth'], commonNades: ['Ticket Smoke', 'Ticket Molotov'] },
      { id: 'mir-a-site', name: 'A Site (Default)', coords: { x: 54, y: 76 }, aliases: ['a site', 'default a', 'triple box'], commonNades: ['Default Molotov', 'Triple Molotov'] },
      { id: 'mir-stairs', name: 'Stairs', coords: { x: 55, y: 63 }, aliases: ['a stairs'], commonNades: ['Stairs Smoke', 'Stairs Molotov'] },
      { id: 'mir-jungle', name: 'Jungle', coords: { x: 46, y: 61 }, aliases: ['jungle'], commonNades: ['Jungle Smoke', 'Jungle Molotov'] },
      { id: 'mir-connector', name: 'Connector', coords: { x: 50, y: 55 }, aliases: ['con', 'a con'], commonNades: ['Connector Smoke', 'Connector Molotov'] },
      { id: 'mir-palace', name: 'Palace', coords: { x: 74, y: 77 }, aliases: ['a palace', 'pillars'], commonNades: ['Palace Smoke', 'Palace Pop Flash'] },
      { id: 'mir-a-ramp', name: 'A Ramp', coords: { x: 74, y: 65 }, aliases: ['ramp', 'tetris'], commonNades: ['Ramp Smoke', 'Tetris Molotov'] },
      { id: 'mir-window', name: 'Mid Window (Sniper Nest)', coords: { x: 39, y: 46 }, aliases: ['window', 'sniper', 'nest'], commonNades: ['Instant Window Smoke', 'Window Molotov'] },
      { id: 'mir-top-mid', name: 'Top Mid', coords: { x: 69, y: 43 }, aliases: ['mid', 'boxes'], commonNades: ['Top Mid Cross Smoke', 'Mid Flash'] },
      { id: 'mir-catwalk', name: 'Catwalk / Short', coords: { x: 49, y: 38 }, aliases: ['cat', 'short', 'ladder room'], commonNades: ['Catwalk Smoke', 'Short Molotov'] },
      { id: 'mir-underpass', name: 'Underpass', coords: { x: 45, y: 49 }, aliases: ['under'], commonNades: ['Underpass Molotov', 'Underpass HE'] },
      { id: 'mir-b-apps', name: 'B Apartments', coords: { x: 46, y: 17 }, aliases: ['apps', 'apartments', 'balcony'], commonNades: ['B Apps Smoke', 'Deep Apps Molotov'] },
      { id: 'mir-b-site', name: 'B Site', coords: { x: 23, y: 28 }, aliases: ['b default', 'bench'], commonNades: ['Bench Molotov', 'Site Smoke'] },
      { id: 'mir-van', name: 'Van / Car', coords: { x: 18, y: 18 }, aliases: ['van', 'car'], commonNades: ['Van Molotov'] },
      { id: 'mir-market-window', name: 'Market Window', coords: { x: 22, y: 41 }, aliases: ['market', 'kitchen window'], commonNades: ['Market Window Smoke', 'Market Door Smoke'] },
      { id: 'mir-b-short', name: 'B Short / Arches', coords: { x: 36, y: 29 }, aliases: ['arches', 'get right'], commonNades: ['B Short Smoke', 'Arches Smoke'] }
    ],
    description: 'Iconic three-lane tactical desert map featuring fast-paced Mid window control battles, synchronized A-site executes, and B apartment splits.',
    thumbnail: BANNER('mirage.webp')
  },
  {
    id: 'dust2',
    name: 'Dust II',
    code: 'de_dust2',
    activePool: true,
    radarImage: RADAR('de_dust2_radar.png'),
    simpleRadarImage: SR('de_dust2_radar.png'),
    bannerImage: BANNER('dust_2.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.dust2!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 79, y: 17 },
      b: { x: 20, y: 13 }
    },
    callouts: [
      { id: 'd2-t-spawn', name: 'T Spawn', coords: { x: 41, y: 90 }, aliases: ['spawn'], commonNades: ['Xbox Smoke', 'Outside Long Smoke'] },
      { id: 'd2-ct-spawn', name: 'CT Spawn', coords: { x: 60, y: 21 }, aliases: ['ct', 'elevator'], commonNades: ['CT Cross Smoke', 'CT Mid Smoke'] },
      { id: 'd2-xbox', name: 'Mid Xbox', coords: { x: 48, y: 41 }, aliases: ['xbox', 'mid doors'], commonNades: ['Xbox Smoke', 'Mid Doors Smoke'] },
      { id: 'd2-catwalk', name: 'Catwalk / Short A', coords: { x: 61, y: 43 }, aliases: ['cat', 'short', 'stairs'], commonNades: ['Short A Pop Flash', 'Goose Molotov'] },
      { id: 'd2-long-doors', name: 'Long Doors', coords: { x: 78, y: 64 }, aliases: ['bedroom', 'double doors'], commonNades: ['Long Corner Smoke', 'Long Flash'] },
      { id: 'd2-long-corner', name: 'Long Corner / Blue', coords: { x: 89, y: 50 }, aliases: ['long', 'blue container', 'pit'], commonNades: ['Long Corner Smoke', 'Car Molotov'] },
      { id: 'd2-long-cross', name: 'Long Cross (CT Ramp)', coords: { x: 76, y: 27 }, aliases: ['cross', 'ct ramp'], commonNades: ['Long Cross Smoke'] },
      { id: 'd2-a-site', name: 'A Site / Goose', coords: { x: 79, y: 17 }, aliases: ['a site', 'goose', 'plat'], commonNades: ['A Site Smoke', 'Goose Molotov'] },
      { id: 'd2-b-tunnels', name: 'Upper B Tunnels', coords: { x: 18, y: 54 }, aliases: ['tunnels', 'upper tuns'], commonNades: ['B Doors Smoke', 'B Window Smoke'] },
      { id: 'd2-b-doors', name: 'B Site Doors', coords: { x: 26, y: 24 }, aliases: ['b doors'], commonNades: ['B Doors Smoke', 'B Doors Flash'] },
      { id: 'd2-b-window', name: 'B Window', coords: { x: 26, y: 15 }, aliases: ['window'], commonNades: ['B Window Smoke'] },
      { id: 'd2-b-site', name: 'B Site / Back Plat', coords: { x: 20, y: 13 }, aliases: ['b site', 'back plat', 'big box'], commonNades: ['Back Plat Molotov', 'Car Molotov'] }
    ],
    description: 'The legendary four-square layout built on long-range A-Long duels, Mid Xbox control, and fast Catwalk splits.',
    thumbnail: BANNER('dust_2.webp')
  },
  {
    id: 'inferno',
    name: 'Inferno',
    code: 'de_inferno',
    activePool: true,
    radarImage: RADAR('de_inferno_radar.png'),
    simpleRadarImage: SR('de_inferno_radar.png'),
    bannerImage: BANNER('inferno.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.inferno!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 81, y: 68 },
      b: { x: 49, y: 22 }
    },
    callouts: [
      { id: 'inf-t-spawn', name: 'T Spawn / T Ramp', coords: { x: 11, y: 67 }, aliases: ['spawn', 't ramp'], commonNades: ['Top Mid Smoke'] },
      { id: 'inf-banana', name: 'Banana (Logs / Half Wall)', coords: { x: 45, y: 45 }, aliases: ['banana', 'logs', 'car', 'sandbags'], commonNades: ['Deep Banana HE', 'Car Molotov', 'Coffins Smoke', 'CT Smoke'] },
      { id: 'inf-coffins', name: 'B Site Coffins', coords: { x: 47, y: 14 }, aliases: ['coffins', 'construction'], commonNades: ['Coffins Smoke', 'Dark Molotov'] },
      { id: 'inf-ct-arch', name: 'B Site CT / Spools', coords: { x: 56, y: 24 }, aliases: ['ct b', 'spools', 'garden'], commonNades: ['CT Boost Smoke'] },
      { id: 'inf-b-site', name: 'B Site (New Box / First Oranges)', coords: { x: 49, y: 22 }, aliases: ['b site', 'new box', 'oranges', 'dark'], commonNades: ['New Box Molotov', 'Oranges Molotov'] },
      { id: 'inf-top-mid', name: 'Top Mid / Boiler', coords: { x: 56, y: 69 }, aliases: ['mid', 'second mid', 'boiler'], commonNades: ['Long Corner Smoke', 'Short Smoke', 'Arch Smoke'] },
      { id: 'inf-arch', name: 'A Long / Arch', coords: { x: 70, y: 48 }, aliases: ['arch', 'long a', 'library'], commonNades: ['Arch Smoke', 'Library Smoke'] },
      { id: 'inf-short-a', name: 'A Short / Quad / Lane', coords: { x: 70, y: 74 }, aliases: ['short', 'quad', 'lane', 'truck'], commonNades: ['Moto Smoke', 'Boiler Flash'] },
      { id: 'inf-pit', name: 'A Pit / Mini Pit', coords: { x: 90, y: 81 }, aliases: ['pit', 'graveyard'], commonNades: ['Pit Molotov', 'Pit Smoke'] },
      { id: 'inf-a-site', name: 'A Site / Moto', coords: { x: 81, y: 68 }, aliases: ['a site', 'moto', 'default a'], commonNades: ['Moto Smoke', 'Default Molotov'] }
    ],
    description: 'Choke-point heavy village map demanding deep Banana utility stacks, Coffins/CT executes, and coordinated Arch/Pit splits.',
    thumbnail: BANNER('inferno.webp')
  },
  {
    id: 'nuke',
    name: 'Nuke',
    code: 'de_nuke',
    activePool: true,
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
    callouts: [
      { id: 'nuke-t-roof', name: 'T Roof / Silo', coords: { x: 43, y: 58 }, floor: 'upper', aliases: ['roof', 'silo', 't spawn'], commonNades: ['Outside Smoke Wall 1', 'Outside Smoke Wall 2', 'Heaven Smoke'] },
      { id: 'nuke-outside', name: 'Outside / Red Box', coords: { x: 56, y: 74 }, floor: 'upper', aliases: ['outside', 'red box', 'mini'], commonNades: ['Outside Cross Smoke', 'Garage Smoke'] },
      { id: 'nuke-garage', name: 'Garage / Secret Cross', coords: { x: 70, y: 71 }, floor: 'upper', aliases: ['garage', 'secret'], commonNades: ['Garage Smoke', 'Secret Cross Smoke'] },
      { id: 'nuke-a-site', name: 'A Site (Hut / Mustache)', coords: { x: 58, y: 50 }, floor: 'upper', aliases: ['a site', 'hut', 'silo', 'vents'], commonNades: ['Hut Molotov', 'Door Smoke', 'Vent Molotov'] },
      { id: 'nuke-heaven', name: 'A Heaven / Rafters', coords: { x: 64, y: 50 }, floor: 'upper', aliases: ['heaven', 'rafters'], commonNades: ['Heaven Glass Smoke'] },
      { id: 'nuke-ramp', name: 'Ramp Room', coords: { x: 57, y: 36 }, floor: 'upper', aliases: ['ramp', 'trophy', 'radio'], commonNades: ['Ramp Smoke', 'Headshot Box Molotov'] },
      { id: 'nuke-b-site', name: 'B Site (Lower)', coords: { x: 57, y: 54 }, floor: 'lower', aliases: ['b site', 'toxic', 'dark'], commonNades: ['Bottom Ramp Smoke', 'Dark Molotov'] },
      { id: 'nuke-decon', name: 'Decon / Double Doors (Lower)', coords: { x: 65, y: 66 }, floor: 'lower', aliases: ['decon', 'secret lower', 'doors'], commonNades: ['Decon Door Molotov'] }
    ],
    description: 'Multi-level nuclear facility with Upper/Lower radar layers, iconic Outside smoke walls, Skylight glass lineups, and fast Ramp splits.',
    thumbnail: BANNER('nuke.webp')
  },
  {
    id: 'ancient',
    name: 'Ancient',
    code: 'de_ancient',
    activePool: true,
    radarImage: RADAR('de_ancient_radar.png'),
    simpleRadarImage: SR('de_ancient_radar.png'),
    bannerImage: BANNER('ancient.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.ancient!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 30, y: 26 },
      b: { x: 75, y: 41 }
    },
    callouts: [
      { id: 'anc-t-spawn', name: 'T Spawn', coords: { x: 49, y: 86 }, aliases: ['spawn'], commonNades: ['Red Room Smoke', 'Donut Smoke', 'Cave Smoke'] },
      { id: 'anc-mid', name: 'Mid / Red Room', coords: { x: 50, y: 42 }, aliases: ['mid', 'elbow', 'red room'], commonNades: ['Red Room Smoke', 'Elbow Molotov'] },
      { id: 'anc-donut', name: 'Donut', coords: { x: 38, y: 46 }, aliases: ['donut'], commonNades: ['Donut Smoke', 'Donut Flash'] },
      { id: 'anc-a-site', name: 'A Site / Triple', coords: { x: 30, y: 26 }, aliases: ['a site', 'a main'], commonNades: ['Temple Smoke', 'CT Smoke'] },
      { id: 'anc-temple', name: 'Temple / CT A', coords: { x: 31, y: 20 }, aliases: ['temple'], commonNades: ['Temple Smoke', 'Temple Molotov'] },
      { id: 'anc-b-ramp', name: 'B Ramp / Ruins', coords: { x: 76, y: 58 }, aliases: ['b ramp', 'doors', 'water'], commonNades: ['Cave Smoke', 'Long B Smoke', 'Short B Smoke'] },
      { id: 'anc-cave', name: 'Cave / Cheetah', coords: { x: 64, y: 42 }, aliases: ['cave', 'house', 'jaguar'], commonNades: ['Cave Smoke', 'Cave Molotov'] },
      { id: 'anc-b-site', name: 'B Site (Pillar / Long / Short)', coords: { x: 75, y: 41 }, aliases: ['b site', 'pillar', 'ninja'], commonNades: ['Long Smoke', 'Short Smoke', 'Ninja Molotov'] }
    ],
    description: 'Mesoamerican jungle ruin emphasizing instant T-Spawn Mid/Cave smokes, Donut control, and synchronized B-Ramp executes.',
    thumbnail: BANNER('ancient.webp')
  },
  {
    id: 'anubis',
    name: 'Anubis',
    code: 'de_anubis',
    activePool: true,
    radarImage: RADAR('de_anubis_radar.png'),
    simpleRadarImage: SR('de_anubis_radar.png'),
    bannerImage: BANNER('anubis.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.anubis!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 74, y: 29 },
      b: { x: 33, y: 49 }
    },
    callouts: [
      { id: 'anu-t-spawn', name: 'T Spawn', coords: { x: 49, y: 90 }, aliases: ['spawn'], commonNades: ['Mid House Smoke', 'B Connector Smoke'] },
      { id: 'anu-canals', name: 'Canals / Water', coords: { x: 56, y: 58 }, aliases: ['canals', 'water', 'boat', 'e-box'], commonNades: ['E-Box Smoke', 'Mid Window Smoke'] },
      { id: 'anu-mid', name: 'Mid Bridge / Doors', coords: { x: 52, y: 49 }, aliases: ['mid', 'bridge', 'house', 'window'], commonNades: ['Mid House Smoke', 'Bridge Flash'] },
      { id: 'anu-b-main', name: 'B Main', coords: { x: 26, y: 58 }, aliases: ['b main'], commonNades: ['Palace Smoke', 'CT Street Smoke', 'Pillar Molotov'] },
      { id: 'anu-b-site', name: 'B Site (Obelisk / Palace / Connector)', coords: { x: 33, y: 49 }, aliases: ['b site', 'palace', 'e-box'], commonNades: ['B Connector Smoke', 'Palace Smoke', 'Back Site Molotov'] },
      { id: 'anu-a-main', name: 'A Main / Carpet', coords: { x: 76, y: 48 }, aliases: ['a main', 'rug'], commonNades: ['Heaven Smoke', 'Camera Smoke', 'Fountain Molotov'] },
      { id: 'anu-a-site', name: 'A Site (Heaven / Pillar / Camera)', coords: { x: 74, y: 29 }, aliases: ['a site', 'heaven', 'camera'], commonNades: ['Heaven Smoke', 'Camera Smoke'] }
    ],
    description: 'Egyptian archaeological complex with waterway Canals control, Mid Bridge crossfires, and B-site triple smoke executes.',
    thumbnail: BANNER('anubis.webp')
  },
  {
    id: 'vertigo',
    name: 'Vertigo',
    code: 'de_vertigo',
    activePool: true,
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
    callouts: [
      { id: 'vert-a-ramp', name: 'A Ramp / Sandbags', coords: { x: 64, y: 76 }, floor: 'upper', aliases: ['a ramp', 'sandbags', 'scaffold'], commonNades: ['Left Side Smoke', 'Right Side Elevator Smoke', 'Sandbags Molotov'] },
      { id: 'vert-a-site', name: 'A Site / Elevator / Heaven', coords: { x: 69, y: 60 }, floor: 'upper', aliases: ['a site', 'elevator', 'headshot', 'catwalk'], commonNades: ['Elevator Smoke', 'Heaven Molotov'] },
      { id: 'vert-mid', name: 'Mid / Connector', coords: { x: 52, y: 50 }, floor: 'upper', aliases: ['mid', 't mid'], commonNades: ['CT Mid Smoke', 'Generator Smoke'] },
      { id: 'vert-b-stairs', name: 'B Stairs', coords: { x: 21, y: 45 }, floor: 'upper', aliases: ['b stairs'], commonNades: ['Generator Smoke', 'CT Spawn Smoke', 'Quad Molotov'] },
      { id: 'vert-b-site', name: 'B Site / Generator / Default', coords: { x: 23, y: 24 }, floor: 'upper', aliases: ['b site', 'gen', 'generator'], commonNades: ['Generator Left/Right Smokes'] },
      { id: 'vert-t-spawn', name: 'T Spawn (50F Lower)', coords: { x: 42, y: 74 }, floor: 'lower', aliases: ['t spawn', 'lower'], commonNades: ['A Ramp Early Smoke'] }
    ],
    description: 'High-altitude skyscraper construction site with dual-floor 50F/51F radar layers, intense A-Ramp smoke walls, and B-Stairs executes.',
    thumbnail: BANNER('vertigo.webp')
  },
  {
    id: 'overpass',
    name: 'Overpass',
    code: 'de_overpass',
    activePool: false,
    radarImage: RADAR('de_overpass_radar.png'),
    simpleRadarImage: SR('de_overpass_radar.png'),
    bannerImage: BANNER('overpass.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.overpass!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 53, y: 21 },
      b: { x: 70, y: 33 }
    },
    callouts: [
      { id: 'ovp-t-spawn', name: 'T Spawn / Tracks', coords: { x: 64, y: 93 }, aliases: ['spawn'], commonNades: ['Monster Smoke', 'Heaven Smoke'] },
      { id: 'ovp-monster', name: 'Monster / Canal', coords: { x: 78, y: 55 }, aliases: ['monster', 'sewers'], commonNades: ['B Heaven Smoke', 'Bridge Smoke', 'Barrels Molotov'] },
      { id: 'ovp-short-b', name: 'B Short / Water / Construction', coords: { x: 64, y: 56 }, aliases: ['water', 'short b', 'sandbags'], commonNades: ['Pillar Molotov', 'B Site Flash'] },
      { id: 'ovp-b-site', name: 'B Site (Pillar / Heaven / Barrels)', coords: { x: 70, y: 33 }, aliases: ['b site', 'heaven b', 'toxic'], commonNades: ['Heaven Smoke', 'Bridge Smoke', 'Toxic Molotov'] },
      { id: 'ovp-toilets', name: 'Toilets / Mid / Party', coords: { x: 46, y: 48 }, aliases: ['toilets', 'bathrooms', 'party'], commonNades: ['Bank Smoke', 'Dumpster Smoke'] },
      { id: 'ovp-a-site', name: 'A Site (Bank / Dumpster / Truck)', coords: { x: 53, y: 21 }, aliases: ['a site', 'bank', 'dumpster', 'truck'], commonNades: ['Bank Smoke', 'Dumpster Smoke', 'Truck Molotov'] }
    ],
    description: 'Sprawling canal and park map featuring deep B-site Heaven/Bridge executes from Water and long-range A-site Bank/Dumpster setups.',
    thumbnail: BANNER('overpass.webp')
  },
  {
    id: 'train',
    name: 'Train',
    code: 'de_train',
    activePool: true,
    radarImage: RADAR('de_train_radar.png'),
    simpleRadarImage: SR('de_train_radar.png'),
    bannerImage: BANNER('train.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.train!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 63, y: 50 },
      b: { x: 53, y: 76 }
    },
    callouts: [
      { id: 'trn-t-spawn', name: 'T Spawn', coords: { x: 13, y: 23 }, aliases: ['spawn'], commonNades: ['Connector Smoke', 'Sandwich Smoke', 'Olof Smoke'] },
      { id: 'trn-a-main', name: 'A Main / Outside', coords: { x: 40, y: 46 }, aliases: ['a main', 't main'], commonNades: ['Z Connector Smoke', 'Popdog Molotov'] },
      { id: 'trn-ivy', name: 'Ivy', coords: { x: 52, y: 22 }, aliases: ['ivy'], commonNades: ['Ivy Smoke', 'Old Bomb Smoke'] },
      { id: 'trn-a-site', name: 'A Site (Red / Green / Olof / Z)', coords: { x: 63, y: 50 }, aliases: ['a site', 'z connector', 'olof', 'popdog'], commonNades: ['Z Connector Smoke', 'Sandwich Molotov'] },
      { id: 'trn-b-halls', name: 'B Halls / Brown Halls', coords: { x: 34, y: 74 }, aliases: ['b halls', 'upper b', 'lower b'], commonNades: ['Upper B Smoke', 'Connector B Smoke', 'Oil Train Molotov'] },
      { id: 'trn-b-site', name: 'B Site (Inner)', coords: { x: 53, y: 76 }, aliases: ['b site', 'inner'], commonNades: ['Z Smoke', 'Back Site Molotov'] }
    ],
    description: 'Updated CS2 industrial rail yard featuring cross-map T-Spawn smoke walls, Ivy control, and Upper/Lower B-Halls executes.',
    thumbnail: BANNER('train.webp')
  },
  {
    id: 'cache',
    name: 'Cache',
    code: 'de_cache',
    activePool: false,
    radarImage: RADAR('de_cache_radar.png'),
    simpleRadarImage: SR('de_cache_radar.png'),
    bannerImage: BANNER('cache.webp'),
    calibration: CS2_RADAR_CALIBRATIONS.cache!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 31, y: 27 },
      b: { x: 35, y: 79 }
    },
    callouts: [
      { id: 'cch-t-spawn', name: 'T Spawn', coords: { x: 88, y: 58 }, aliases: ['spawn'], commonNades: ['Mid Z Smoke', 'White Box Smoke'] },
      { id: 'cch-mid', name: 'Mid / Boost / White Box', coords: { x: 50, y: 50 }, aliases: ['mid', 'z connector', 'white box', 'vents'], commonNades: ['Mid Z Smoke', 'Vent Molotov'] },
      { id: 'cch-a-main', name: 'A Main / Squeaky', coords: { x: 52, y: 26 }, aliases: ['a main', 'squeaky'], commonNades: ['A Cross Smoke', 'Quad Molotov', 'NBK Molotov'] },
      { id: 'cch-a-site', name: 'A Site (Forklift / Quad / Truck)', coords: { x: 31, y: 27 }, aliases: ['a site', 'forklift', 'quad', 'highway'], commonNades: ['Truck Smoke', 'Highway Smoke'] },
      { id: 'cch-b-main', name: 'B Main / Sun Room', coords: { x: 54, y: 76 }, aliases: ['b main', 'sun room', 'checkers'], commonNades: ['CT B Smoke', 'Heaven Smoke', 'Headshot Molotov'] },
      { id: 'cch-b-site', name: 'B Site (Heaven / Tree / Checkers)', coords: { x: 35, y: 79 }, aliases: ['b site', 'heaven', 'checkers'], commonNades: ['Heaven Smoke', 'Tree Room Smoke'] }
    ],
    description: 'Classic three-lane industrial facility with explosive A-Main executes, Mid Z control, and Sun Room utility.',
    thumbnail: BANNER('cache.webp')
  },
  {
    id: 'cobblestone',
    name: 'Cobblestone',
    code: 'de_cbble',
    activePool: false,
    radarImage: RADAR('de_cbble_radar.png'),
    simpleRadarImage: SR('de_cbble_radar.png'),
    bannerImage: BANNER('cobblestone.png'),
    calibration: CS2_RADAR_CALIBRATIONS.cobblestone!,
    viewBox: '0 0 1000 1000',
    sites: {
      a: { x: 34, y: 74 },
      b: { x: 68, y: 66 }
    },
    callouts: [
      { id: 'cbl-t-spawn', name: 'T Spawn', coords: { x: 18, y: 24 }, aliases: ['spawn', 't yard'], commonNades: ['Mid Courtyard Smoke', 'B Halls Smoke'] },
      { id: 'cbl-ct-spawn', name: 'CT Spawn', coords: { x: 48, y: 82 }, aliases: ['ct', 'connector'], commonNades: ['A Retake Smoke', 'Chicken Coop Smoke'] },
      { id: 'cbl-mid', name: 'Mid / Courtyard', coords: { x: 42, y: 48 }, aliases: ['mid', 'courtyard', 'dragonlore'], commonNades: ['Mid Connector Smoke', 'Drop Window Flash'] },
      { id: 'cbl-a-long', name: 'A Long', coords: { x: 24, y: 58 }, aliases: ['a long', 'long a', 'balcony'], commonNades: ['A Long Doors Smoke', 'A Site Statue Molotov'] },
      { id: 'cbl-a-site', name: 'A Site (Statue / Truck)', coords: { x: 34, y: 74 }, aliases: ['a site', 'statue', 'truck', 'default a'], commonNades: ['CT A Smoke', 'Truck Molotov', 'Connector Smoke'] },
      { id: 'cbl-b-long', name: 'B Long / Halls', coords: { x: 72, y: 42 }, aliases: ['b long', 'b halls', 'danger'], commonNades: ['B Plat Smoke', 'Fountain Smoke', 'B Halls Flash'] },
      { id: 'cbl-drop', name: 'Drop Room', coords: { x: 58, y: 54 }, aliases: ['drop', 'dropper', 'window'], commonNades: ['Drop Exit Smoke', 'Drop Molotov', 'B Connector Flash'] },
      { id: 'cbl-b-plat', name: 'B Plat', coords: { x: 78, y: 56 }, aliases: ['b plat', 'platform', 'rock'], commonNades: ['B Plat Molotov', 'Rock Smoke'] },
      { id: 'cbl-b-site', name: 'B Site (Fountain / Broken Wall)', coords: { x: 68, y: 66 }, aliases: ['b site', 'fountain', 'statue b'], commonNades: ['Chicken Coop Smoke', 'Broken Wall Smoke', 'Rock Molotov'] },
      { id: 'cbl-coop', name: 'Chicken Coop', coords: { x: 64, y: 76 }, aliases: ['coop', 'chicken', 'broken wall'], commonNades: ['Chicken Coop Smoke', 'Coop Molotov'] }
    ],
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
