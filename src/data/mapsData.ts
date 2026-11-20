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
    callouts: [
      { id: 'mir-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 88, y: 36 }, aliases: ['spawn', 't roof'], commonNades: ['Window Smoke', 'Ticket Smoke', 'Stairs Smoke'] },
      { id: 'mir-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 30, y: 70 }, aliases: ['ct', 'ticket cross'], commonNades: ['Ticket Smoke'] },
      { id: 'mir-ticket', name: 'Ticket Booth', site: 'A', coords: { x: 45, y: 78 }, aliases: ['ticket', 'ct booth'], commonNades: ['Ticket Smoke', 'Ticket Molotov'] },
      { id: 'mir-a-site', name: 'A Site (Default)', site: 'A', coords: { x: 56, y: 76 }, aliases: ['a site', 'default a', 'triple box'], commonNades: ['Default Molotov', 'Triple Molotov'] },
      { id: 'mir-triple', name: 'Triple / Firebox', site: 'A', coords: { x: 53, y: 70 }, aliases: ['triple', 'firebox', 'sandwich'], commonNades: ['Firebox Molotov', 'Triple Smoke'] },
      { id: 'mir-stairs', name: 'Stairs', site: 'A', coords: { x: 56, y: 63 }, aliases: ['a stairs'], commonNades: ['Stairs Smoke', 'Stairs Molotov'] },
      { id: 'mir-jungle', name: 'Jungle', site: 'A', coords: { x: 47, y: 61 }, aliases: ['jungle'], commonNades: ['Jungle Smoke', 'Jungle Molotov'] },
      { id: 'mir-connector', name: 'Connector', site: 'Mid', coords: { x: 50, y: 54 }, aliases: ['con', 'a con'], commonNades: ['Connector Smoke', 'Connector Molotov'] },
      { id: 'mir-palace', name: 'Palace', site: 'A', coords: { x: 74, y: 77 }, aliases: ['a palace', 'pillars'], commonNades: ['Palace Smoke', 'Palace Pop Flash'] },
      { id: 'mir-a-ramp', name: 'A Ramp', site: 'A', coords: { x: 73, y: 65 }, aliases: ['ramp', 'a main'], commonNades: ['Ramp Smoke', 'Ramp Molotov'] },
      { id: 'mir-tetris', name: 'Tetris', site: 'A', coords: { x: 64, y: 65 }, aliases: ['tetris', 'sandwich'], commonNades: ['Tetris Molotov', 'Tetris HE'] },
      { id: 'mir-window', name: 'Mid Window (Sniper Nest)', site: 'Mid', coords: { x: 39, y: 47 }, aliases: ['window', 'sniper', 'nest'], commonNades: ['Instant Window Smoke', 'Window Molotov'] },
      { id: 'mir-top-mid', name: 'Top Mid', site: 'Mid', coords: { x: 69, y: 43 }, aliases: ['mid', 't mid'], commonNades: ['Top Mid Cross Smoke', 'Mid Flash'] },
      { id: 'mir-mid-boxes', name: 'Mid Boxes', site: 'Mid', coords: { x: 56, y: 47 }, aliases: ['boxes', 'chair'], commonNades: ['Mid Cross Smoke', 'Mid Pop Flash'] },
      { id: 'mir-catwalk', name: 'Catwalk / Short', site: 'Mid', coords: { x: 50, y: 39 }, aliases: ['cat', 'short', 'ladder room'], commonNades: ['Catwalk Smoke', 'Short Molotov'] },
      { id: 'mir-underpass', name: 'Underpass', site: 'Mid', coords: { x: 44, y: 48 }, aliases: ['under'], commonNades: ['Underpass Molotov', 'Underpass HE'] },
      { id: 'mir-b-apps', name: 'B Apartments', site: 'B', coords: { x: 35, y: 18 }, aliases: ['apps', 'apartments', 'balcony'], commonNades: ['B Apps Smoke', 'Deep Apps Molotov'] },
      { id: 'mir-b-site', name: 'B Site', site: 'B', coords: { x: 23, y: 28 }, aliases: ['b default', 'bench'], commonNades: ['Bench Molotov', 'Site Smoke'] },
      { id: 'mir-van', name: 'Van / Car', site: 'B', coords: { x: 18, y: 21 }, aliases: ['van', 'car'], commonNades: ['Van Molotov'] },
      { id: 'mir-market-window', name: 'Market Window', site: 'B', coords: { x: 22, y: 41 }, aliases: ['market', 'kitchen window'], commonNades: ['Market Window Smoke', 'Market Door Smoke'] },
      { id: 'mir-market-door', name: 'Market Door', site: 'B', coords: { x: 28, y: 38 }, aliases: ['kitchen door', 'market exit'], commonNades: ['Market Door Smoke'] },
      { id: 'mir-b-short', name: 'B Short / Arches', site: 'B', coords: { x: 36, y: 29 }, aliases: ['arches', 'get right'], commonNades: ['B Short Smoke', 'Arches Smoke'] }
    ],
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
    callouts: [
      { id: 'd2-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 38, y: 90 }, aliases: ['spawn'], commonNades: ['Xbox Smoke', 'Outside Long Smoke'] },
      { id: 'd2-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 60, y: 22 }, aliases: ['ct', 'elevator'], commonNades: ['CT Cross Smoke', 'CT Mid Smoke'] },
      { id: 'd2-suicide', name: 'Suicide / T Mid', site: 'Mid', coords: { x: 46, y: 73 }, aliases: ['suicide', 'top mid'], commonNades: ['Xbox Smoke', 'Mid Doors Flash'] },
      { id: 'd2-xbox', name: 'Mid Xbox', site: 'Mid', coords: { x: 48, y: 43 }, aliases: ['xbox', 'palm'], commonNades: ['Xbox Smoke', 'Mid Doors Smoke'] },
      { id: 'd2-mid-doors', name: 'Mid Doors', site: 'Mid', coords: { x: 47, y: 34 }, aliases: ['mid doors', 'b split'], commonNades: ['Mid Doors Smoke', 'CT Mid Flash'] },
      { id: 'd2-catwalk', name: 'Catwalk / Short A', site: 'A', coords: { x: 61, y: 40 }, aliases: ['cat', 'short', 'stairs'], commonNades: ['Short A Pop Flash', 'Goose Molotov'] },
      { id: 'd2-a-short-stairs', name: 'A Short Boost / Stairs', site: 'A', coords: { x: 64, y: 26 }, aliases: ['short boost', 'a ninja'], commonNades: ['A Site Smoke', 'Short Flash'] },
      { id: 'd2-outside-long', name: 'Outside Long', site: 'A', coords: { x: 65, y: 74 }, aliases: ['outside long', 't plat'], commonNades: ['Long Corner Smoke', 'Long Doors Flash'] },
      { id: 'd2-long-doors', name: 'Long Doors', site: 'A', coords: { x: 77, y: 64 }, aliases: ['bedroom', 'double doors'], commonNades: ['Long Corner Smoke', 'Long Flash'] },
      { id: 'd2-long-corner', name: 'Long Corner / Blue', site: 'A', coords: { x: 88, y: 50 }, aliases: ['long', 'blue container'], commonNades: ['Long Corner Smoke', 'Car Molotov'] },
      { id: 'd2-pit', name: 'A Long Pit', site: 'A', coords: { x: 90, y: 41 }, aliases: ['pit', 'long pit'], commonNades: ['Pit Molotov', 'Pit Flash'] },
      { id: 'd2-a-car', name: 'A Car', site: 'A', coords: { x: 89, y: 28 }, aliases: ['car', 'barrels'], commonNades: ['Car Molotov', 'A Cross Smoke'] },
      { id: 'd2-long-cross', name: 'Long Cross (CT Ramp)', site: 'A', coords: { x: 76, y: 27 }, aliases: ['cross', 'ct ramp'], commonNades: ['Long Cross Smoke'] },
      { id: 'd2-a-site', name: 'A Site / Goose', site: 'A', coords: { x: 80, y: 16 }, aliases: ['a site', 'goose', 'plat'], commonNades: ['A Site Smoke', 'Goose Molotov'] },
      { id: 'd2-lower-tunnels', name: 'Lower B Tunnels', site: 'B', coords: { x: 36, y: 42 }, aliases: ['lower tuns', 'lower'], commonNades: ['Mid Doors Smoke'] },
      { id: 'd2-b-tunnels', name: 'Upper B Tunnels', site: 'B', coords: { x: 18, y: 50 }, aliases: ['tunnels', 'upper tuns'], commonNades: ['B Doors Smoke', 'B Window Smoke'] },
      { id: 'd2-b-doors', name: 'B Site Doors', site: 'B', coords: { x: 26, y: 24 }, aliases: ['b doors'], commonNades: ['B Doors Smoke', 'B Doors Flash'] },
      { id: 'd2-b-window', name: 'B Window', site: 'B', coords: { x: 27, y: 15 }, aliases: ['window'], commonNades: ['B Window Smoke'] },
      { id: 'd2-b-site', name: 'B Site / Back Plat', site: 'B', coords: { x: 20, y: 13 }, aliases: ['b site', 'back plat', 'big box'], commonNades: ['Back Plat Molotov', 'Car Molotov'] },
      { id: 'd2-b-car', name: 'B Car / Closet', site: 'B', coords: { x: 11, y: 25 }, aliases: ['b car', 'closet', 'fence'], commonNades: ['B Car Molotov', 'Closet HE'] }
    ],
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
    callouts: [
      { id: 'inf-t-spawn', name: 'T Spawn / T Ramp', site: 'Spawn', coords: { x: 10, y: 67 }, aliases: ['spawn', 't ramp'], commonNades: ['Top Mid Smoke'] },
      { id: 'inf-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 89, y: 35 }, aliases: ['ct', 'well'], commonNades: ['CT Boost Smoke'] },
      { id: 'inf-bot-banana', name: 'Bottom Banana', site: 'B', coords: { x: 43, y: 54 }, aliases: ['t ramp banana', 'bottom banana'], commonNades: ['Deep Banana HE', 'Half Wall Molotov'] },
      { id: 'inf-banana', name: 'Banana (Logs / Half Wall)', site: 'B', coords: { x: 44, y: 44 }, aliases: ['banana', 'logs', 'sandbags'], commonNades: ['Deep Banana HE', 'Car Molotov', 'Coffins Smoke', 'CT Smoke'] },
      { id: 'inf-top-banana', name: 'Top Banana / Car', site: 'B', coords: { x: 49, y: 35 }, aliases: ['car', 'top banana', 'broom'], commonNades: ['Car Molotov', 'CT Smoke'] },
      { id: 'inf-b-site', name: 'B Site (New Box / First Oranges)', site: 'B', coords: { x: 49, y: 22 }, aliases: ['b site', 'new box', 'oranges', 'dark'], commonNades: ['New Box Molotov', 'Oranges Molotov'] },
      { id: 'inf-coffins', name: 'B Site Coffins', site: 'B', coords: { x: 49, y: 12 }, aliases: ['coffins', 'construction'], commonNades: ['Coffins Smoke', 'Dark Molotov'] },
      { id: 'inf-ct-arch', name: 'B Site CT / Spools', site: 'B', coords: { x: 58, y: 24 }, aliases: ['ct b', 'spools', 'garden'], commonNades: ['CT Boost Smoke'] },
      { id: 'inf-church', name: 'Church / Ruins', site: 'B', coords: { x: 66, y: 15 }, aliases: ['church', 'ruins'], commonNades: ['Church Retake Smoke'] },
      { id: 'inf-second-mid', name: 'Second Mid', site: 'Mid', coords: { x: 50, y: 82 }, aliases: ['second mid', 'alt mid'], commonNades: ['Top Mid Flash'] },
      { id: 'inf-t-apps', name: 'T Apartments', site: 'Mid', coords: { x: 35, y: 77 }, aliases: ['t apps', 'bridge'], commonNades: ['Boiler Flash'] },
      { id: 'inf-mid', name: 'Mid / Haystack', site: 'Mid', coords: { x: 44, y: 68 }, aliases: ['mid', 'haystack'], commonNades: ['Mid Smoke', 'Banana Support Flash'] },
      { id: 'inf-top-mid', name: 'Top Mid / Boiler', site: 'Mid', coords: { x: 57, y: 69 }, aliases: ['top mid', 'boiler'], commonNades: ['Long Corner Smoke', 'Short Smoke', 'Arch Smoke'] },
      { id: 'inf-a-apps', name: 'A Apartments / Balcony', site: 'A', coords: { x: 71, y: 83 }, aliases: ['a apps', 'balcony', 'dark room'], commonNades: ['Pit Molotov', 'Balcony Pop Flash'] },
      { id: 'inf-short-a', name: 'A Short / Quad / Lane', site: 'A', coords: { x: 70, y: 73 }, aliases: ['short', 'quad', 'lane', 'truck'], commonNades: ['Moto Smoke', 'Boiler Flash'] },
      { id: 'inf-arch', name: 'A Long / Arch', site: 'A', coords: { x: 74, y: 45 }, aliases: ['arch', 'long a', 'cubby'], commonNades: ['Arch Smoke', 'Library Smoke'] },
      { id: 'inf-library', name: 'Library', site: 'A', coords: { x: 89, y: 53 }, aliases: ['library', 'books'], commonNades: ['Library Smoke', 'Library Molotov'] },
      { id: 'inf-a-site', name: 'A Site / Moto', site: 'A', coords: { x: 81, y: 70 }, aliases: ['a site', 'moto', 'default a'], commonNades: ['Moto Smoke', 'Default Molotov'] },
      { id: 'inf-pit', name: 'A Pit / Graveyard', site: 'A', coords: { x: 91, y: 78 }, aliases: ['pit', 'graveyard', 'mini pit'], commonNades: ['Pit Molotov', 'Pit Smoke'] }
    ],
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
    callouts: [
      { id: 'nuke-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 20, y: 54 }, floor: 'upper', aliases: ['t spawn', 'trucks'], commonNades: ['Outside Smoke Wall', 'Garage Smoke'] },
      { id: 'nuke-t-roof', name: 'T Roof / Silo', site: 'A', coords: { x: 43, y: 56 }, floor: 'upper', aliases: ['roof', 'silo', 'marshmallow'], commonNades: ['Outside Smoke Wall 1', 'Heaven Smoke', 'Skylight Molly'] },
      { id: 'nuke-lobby', name: 'T Lobby', site: 'A', coords: { x: 47, y: 52 }, floor: 'upper', aliases: ['lobby', 'radio'], commonNades: ['Hut Molotov', 'Door Smoke'] },
      { id: 'nuke-squeaky', name: 'Squeaky / Trophy', site: 'A', coords: { x: 51, y: 46 }, floor: 'upper', aliases: ['squeaky', 'trophy'], commonNades: ['Squeaky Door HE', 'A Site Flash'] },
      { id: 'nuke-a-site', name: 'A Site (Hut / Mustache)', site: 'A', coords: { x: 58, y: 50 }, floor: 'upper', aliases: ['a site', 'hut', 'vents'], commonNades: ['Hut Molotov', 'Door Smoke', 'Vent Molotov'] },
      { id: 'nuke-a-main', name: 'A Main / Mini', site: 'A', coords: { x: 59, y: 59 }, floor: 'upper', aliases: ['mini', 'main', 'blue'], commonNades: ['Main Smoke', 'Mini Flash'] },
      { id: 'nuke-heaven', name: 'A Heaven / Rafters', site: 'A', coords: { x: 63, y: 50 }, floor: 'upper', aliases: ['heaven', 'rafters'], commonNades: ['Heaven Glass Smoke'] },
      { id: 'nuke-ramp', name: 'Ramp Room', site: 'A', coords: { x: 57, y: 36 }, floor: 'upper', aliases: ['ramp', 'headshot box'], commonNades: ['Ramp Smoke', 'Headshot Box Molotov'] },
      { id: 'nuke-outside', name: 'Outside / Red Box', site: 'Mid', coords: { x: 56, y: 72 }, floor: 'upper', aliases: ['outside', 'red box'], commonNades: ['Outside Cross Smoke', 'Garage Smoke'] },
      { id: 'nuke-secret-upper', name: 'Secret Stairs (Upper)', site: 'Mid', coords: { x: 69, y: 69 }, floor: 'upper', aliases: ['secret', 'secret stairs'], commonNades: ['Secret Cross Smoke'] },
      { id: 'nuke-garage', name: 'Garage', site: 'Mid', coords: { x: 74, y: 66 }, floor: 'upper', aliases: ['garage', 'blue box'], commonNades: ['Garage Smoke', 'Garage Molotov'] },
      { id: 'nuke-hell', name: 'Hell / Locker', site: 'A', coords: { x: 69, y: 55 }, floor: 'upper', aliases: ['hell', 'locker'], commonNades: ['Outside Support Flash'] },
      { id: 'nuke-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 82, y: 46 }, floor: 'upper', aliases: ['ct', 'ct spawn'], commonNades: ['Outside Smoke'] },
      { id: 'nuke-b-site', name: 'B Site (Lower)', site: 'B', coords: { x: 57, y: 54 }, floor: 'lower', aliases: ['b site', 'toxic', 'default b'], commonNades: ['Bottom Ramp Smoke', 'Dark Molotov'] },
      { id: 'nuke-b-ramp', name: 'B Ramp (Lower)', site: 'B', coords: { x: 57, y: 38 }, floor: 'lower', aliases: ['lower ramp', 'b ramp'], commonNades: ['B Ramp Smoke', 'B Ramp Molotov'] },
      { id: 'nuke-decon', name: 'Decon / Double Doors (Lower)', site: 'B', coords: { x: 64, y: 64 }, floor: 'lower', aliases: ['decon', 'double doors'], commonNades: ['Decon Door Molotov'] },
      { id: 'nuke-secret-lower', name: 'Secret Hallway (Lower)', site: 'B', coords: { x: 69, y: 69 }, floor: 'lower', aliases: ['secret lower', 'single door'], commonNades: ['Single Door Smoke'] },
      { id: 'nuke-b-vents', name: 'B Vents / Control', site: 'B', coords: { x: 51, y: 62 }, floor: 'lower', aliases: ['vents', 'control room'], commonNades: ['Control Molotov'] },
      { id: 'nuke-b-window', name: 'B Window / Dark', site: 'B', coords: { x: 63, y: 49 }, floor: 'lower', aliases: ['b window', 'dark', 'observation'], commonNades: ['Window Smoke', 'Dark Molotov'] }
    ],
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
    callouts: [
      { id: 'anc-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 49, y: 86 }, aliases: ['spawn'], commonNades: ['Red Room Smoke', 'Donut Smoke', 'Cave Smoke'] },
      { id: 'anc-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 51, y: 17 }, aliases: ['ct', 'ct spawn'], commonNades: ['Mid Rush Molotov'] },
      { id: 'anc-a-yard', name: 'A Yard / Ruins', site: 'A', coords: { x: 22, y: 65 }, aliases: ['a yard', 'ruins', 'tunnels'], commonNades: ['A Main Smoke', 'Donut Smoke'] },
      { id: 'anc-a-main', name: 'A Main', site: 'A', coords: { x: 18, y: 48 }, aliases: ['a main', 'a halls'], commonNades: ['CT A Smoke', 'Temple Smoke'] },
      { id: 'anc-a-plat', name: 'A Plat / Boost', site: 'A', coords: { x: 20, y: 23 }, aliases: ['a plat', 'big box'], commonNades: ['A Plat Molotov'] },
      { id: 'anc-a-site', name: 'A Site / Triple', site: 'A', coords: { x: 30, y: 26 }, aliases: ['a site', 'triple', 'default a'], commonNades: ['Temple Smoke', 'CT Smoke'] },
      { id: 'anc-temple', name: 'Temple / CT A', site: 'A', coords: { x: 31, y: 19 }, aliases: ['temple', 'ct a'], commonNades: ['Temple Smoke', 'Temple Molotov'] },
      { id: 'anc-donut', name: 'Donut', site: 'Mid', coords: { x: 31, y: 43 }, aliases: ['donut', 'square'], commonNades: ['Donut Smoke', 'Donut Flash'] },
      { id: 'anc-elbow', name: 'Elbow', site: 'Mid', coords: { x: 48, y: 58 }, aliases: ['elbow', 't mid'], commonNades: ['Mid Instant Smoke', 'Elbow Molotov'] },
      { id: 'anc-mid', name: 'Mid / Red Room', site: 'Mid', coords: { x: 49, y: 43 }, aliases: ['mid', 'red room', 'cubby'], commonNades: ['Red Room Smoke', 'Mid HE'] },
      { id: 'anc-top-mid', name: 'Top Mid', site: 'Mid', coords: { x: 49, y: 29 }, aliases: ['top mid', 'house'], commonNades: ['Top Mid Smoke', 'House Molotov'] },
      { id: 'anc-water', name: 'Water / T Alley', site: 'B', coords: { x: 59, y: 60 }, aliases: ['water', 'b alley'], commonNades: ['Cave Smoke', 'B Ramp HE'] },
      { id: 'anc-b-ramp', name: 'B Ramp / Doors', site: 'B', coords: { x: 77, y: 60 }, aliases: ['b ramp', 'doors'], commonNades: ['Cave Smoke', 'Long B Smoke', 'Short B Smoke'] },
      { id: 'anc-cave', name: 'Cave / Cheetah', site: 'B', coords: { x: 66, y: 47 }, aliases: ['cave', 'house', 'jaguar'], commonNades: ['Cave Smoke', 'Cave Molotov'] },
      { id: 'anc-b-short', name: 'B Short / Lane', site: 'B', coords: { x: 67, y: 38 }, aliases: ['short b', 'lane', 'cubby'], commonNades: ['Short Smoke', 'Ninja Molotov'] },
      { id: 'anc-b-site', name: 'B Site (Pillar)', site: 'B', coords: { x: 75, y: 41 }, aliases: ['b site', 'pillar', 'ninja'], commonNades: ['Long Smoke', 'Short Smoke', 'Ninja Molotov'] },
      { id: 'anc-b-long', name: 'B Long', site: 'B', coords: { x: 82, y: 36 }, aliases: ['long b', 'back b'], commonNades: ['Long B Smoke', 'Long Molotov'] },
      { id: 'anc-ct-b', name: 'B Alley / CT B', site: 'B', coords: { x: 67, y: 26 }, aliases: ['ct b', 'alley', 'construction'], commonNades: ['CT B Smoke'] }
    ],
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
    callouts: [
      { id: 'anu-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 48, y: 90 }, aliases: ['spawn'], commonNades: ['Mid House Smoke', 'B Connector Smoke'] },
      { id: 'anu-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 42, y: 20 }, aliases: ['ct', 'ct spawn'], commonNades: ['Mid Retake Flash'] },
      { id: 'anu-ruins', name: 'Ruins / T Alley', site: 'B', coords: { x: 28, y: 72 }, aliases: ['ruins', 't alley'], commonNades: ['B Long Smoke', 'B Main HE'] },
      { id: 'anu-b-main', name: 'B Main', site: 'B', coords: { x: 24, y: 58 }, aliases: ['b main'], commonNades: ['Palace Smoke', 'CT Street Smoke', 'Pillar Molotov'] },
      { id: 'anu-b-long', name: 'B Long / Street', site: 'B', coords: { x: 28, y: 34 }, aliases: ['b long', 'street'], commonNades: ['CT Street Smoke'] },
      { id: 'anu-b-site', name: 'B Site (Obelisk / Pillar)', site: 'B', coords: { x: 33, y: 49 }, aliases: ['b site', 'pillar', 'default b'], commonNades: ['B Connector Smoke', 'Palace Smoke', 'Back Site Molotov'] },
      { id: 'anu-palace', name: 'Palace / Temple', site: 'B', coords: { x: 39, y: 32 }, aliases: ['palace', 'temple'], commonNades: ['Palace Smoke', 'Temple Molotov'] },
      { id: 'anu-ebox', name: 'B Connector (E-Box)', site: 'B', coords: { x: 41, y: 58 }, aliases: ['e-box', 'connector', 'dark'], commonNades: ['E-Box Smoke', 'E-Box Molotov'] },
      { id: 'anu-mid', name: 'Mid Bridge', site: 'Mid', coords: { x: 52, y: 54 }, aliases: ['mid', 'bridge'], commonNades: ['Mid House Smoke', 'Bridge Flash'] },
      { id: 'anu-mid-doors', name: 'Mid Doors / House', site: 'Mid', coords: { x: 55, y: 45 }, aliases: ['house', 'double doors', 'window'], commonNades: ['Mid House Smoke', 'House Molotov'] },
      { id: 'anu-top-mid', name: 'Top Mid / Alley', site: 'Mid', coords: { x: 55, y: 35 }, aliases: ['top mid', 'ct mid'], commonNades: ['Top Mid Smoke'] },
      { id: 'anu-canals', name: 'Canals / Water', site: 'Mid', coords: { x: 60, y: 58 }, aliases: ['canals', 'water'], commonNades: ['E-Box Smoke', 'Mid Window Smoke'] },
      { id: 'anu-boat', name: 'Boat / Sewer', site: 'Mid', coords: { x: 71, y: 54 }, aliases: ['boat', 'sewer'], commonNades: ['Boat Flash', 'Canals HE'] },
      { id: 'anu-a-main', name: 'A Main / Rug', site: 'A', coords: { x: 79, y: 48 }, aliases: ['a main', 'rug', 'carpet'], commonNades: ['Heaven Smoke', 'Camera Smoke', 'Fountain Molotov'] },
      { id: 'anu-fountain', name: 'A Fountain', site: 'A', coords: { x: 75, y: 35 }, aliases: ['fountain', 'plat'], commonNades: ['Fountain Molotov'] },
      { id: 'anu-a-site', name: 'A Site (Plateau)', site: 'A', coords: { x: 74, y: 27 }, aliases: ['a site', 'plateau', 'pillar'], commonNades: ['Heaven Smoke', 'Camera Smoke'] },
      { id: 'anu-heaven', name: 'A Heaven / Walkway', site: 'A', coords: { x: 65, y: 25 }, aliases: ['heaven', 'walkway'], commonNades: ['Heaven Smoke', 'Heaven Molotov'] },
      { id: 'anu-camera', name: 'A Camera / Connector', site: 'A', coords: { x: 63, y: 37 }, aliases: ['camera', 'a con'], commonNades: ['Camera Smoke', 'Camera Molotov'] }
    ],
    description: 'Egyptian archaeological complex with waterway Canals control, Mid Bridge crossfires, and B-site triple smoke executes.',
    thumbnail: BANNER('anubis.webp')
  },
  {
    id: 'train',
    name: 'Train',
    code: 'de_train',
    activePool: true,
    poolCategory: 'Active Duty',
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
      { id: 'trn-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 14, y: 23 }, aliases: ['spawn'], commonNades: ['Connector Smoke', 'Sandwich Smoke', 'Olof Smoke'] },
      { id: 'trn-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 87, y: 76 }, aliases: ['ct', 'ct spawn'], commonNades: ['A Retake Smoke'] },
      { id: 'trn-a-main', name: 'A Main / Outside', site: 'A', coords: { x: 38, y: 47 }, aliases: ['a main', 't main'], commonNades: ['Z Connector Smoke', 'Popdog Molotov'] },
      { id: 'trn-popdog', name: 'Popdog / Ladder', site: 'A', coords: { x: 44, y: 55 }, aliases: ['popdog', 'ladder'], commonNades: ['Popdog Molotov', 'Popdog HE'] },
      { id: 'trn-ivy', name: 'Ivy', site: 'A', coords: { x: 53, y: 21 }, aliases: ['ivy'], commonNades: ['Ivy Smoke', 'Old Bomb Smoke'] },
      { id: 'trn-old-bomb', name: 'Old Bomb / Alley', site: 'A', coords: { x: 78, y: 26 }, aliases: ['old bomb', 'alley', 'back ivy'], commonNades: ['Old Bomb Molotov'] },
      { id: 'trn-a-site', name: 'A Site (Default)', site: 'A', coords: { x: 63, y: 50 }, aliases: ['a site', 'olof', 'default a'], commonNades: ['Z Connector Smoke', 'Sandwich Molotov'] },
      { id: 'trn-red', name: 'Red Train (A1)', site: 'A', coords: { x: 49, y: 40 }, aliases: ['red', 'red train'], commonNades: ['Red Train Molotov'] },
      { id: 'trn-green', name: 'Green Train (A2)', site: 'A', coords: { x: 62, y: 39 }, aliases: ['green', 'green train'], commonNades: ['Green Smoke'] },
      { id: 'trn-sandwich', name: 'Sandwich / Hell', site: 'A', coords: { x: 76, y: 41 }, aliases: ['sandwich', 'hell', 'e-box'], commonNades: ['Sandwich Molotov', 'Hell Smoke'] },
      { id: 'trn-z-con', name: 'Z Connector', site: 'Mid', coords: { x: 64, y: 61 }, aliases: ['z connector', 'connector'], commonNades: ['Z Connector Smoke'] },
      { id: 'trn-b-halls', name: 'Brown Halls / Upper B', site: 'B', coords: { x: 35, y: 55 }, aliases: ['brown halls', 'upper b'], commonNades: ['Upper B Smoke', 'Connector B Smoke'] },
      { id: 'trn-b-ramp', name: 'B Ramp', site: 'B', coords: { x: 33, y: 73 }, aliases: ['b ramp', 'b halls'], commonNades: ['Oil Train Molotov', 'B Execute Flash'] },
      { id: 'trn-lower-b', name: 'Lower B', site: 'B', coords: { x: 40, y: 84 }, aliases: ['lower b', 'tunnels b'], commonNades: ['Lower B Smoke'] },
      { id: 'trn-b-site', name: 'B Site (Inner)', site: 'B', coords: { x: 53, y: 76 }, aliases: ['b site', 'inner'], commonNades: ['Z Smoke', 'Back Site Molotov'] },
      { id: 'trn-oil', name: 'Oil Train (B1)', site: 'B', coords: { x: 66, y: 76 }, aliases: ['oil', 'oil train'], commonNades: ['Oil Train Molotov'] },
      { id: 'trn-headshot', name: 'Headshot / Back B', site: 'B', coords: { x: 63, y: 85 }, aliases: ['headshot', 'back b', 'heaven b'], commonNades: ['Back B Smoke'] }
    ],
    description: 'Updated CS2 industrial rail yard in the Active Duty map pool (replaced Vertigo), featuring cross-map T-Spawn smoke walls, Ivy control, and Upper/Lower B-Halls executes.',
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
    callouts: [
      { id: 'vert-a-ramp', name: 'A Ramp / Sandbags', site: 'A', coords: { x: 63, y: 76 }, floor: 'upper', aliases: ['a ramp', 'sandbags', 'scaffold'], commonNades: ['Left Side Smoke', 'Right Side Elevator Smoke', 'Sandbags Molotov'] },
      { id: 'vert-yellow', name: 'Yellow / Side', site: 'A', coords: { x: 56, y: 70 }, floor: 'upper', aliases: ['yellow', 'side', 'crane'], commonNades: ['Yellow Molotov', 'Side Smoke'] },
      { id: 'vert-a-site', name: 'A Site (Default)', site: 'A', coords: { x: 69, y: 60 }, floor: 'upper', aliases: ['a site', 'headshot', 'default a'], commonNades: ['Elevator Smoke', 'Heaven Molotov'] },
      { id: 'vert-heaven', name: 'A Heaven', site: 'A', coords: { x: 71, y: 52 }, floor: 'upper', aliases: ['heaven', 'catwalk'], commonNades: ['Heaven Smoke', 'Heaven Molotov'] },
      { id: 'vert-elevator', name: 'A Elevator', site: 'A', coords: { x: 58, y: 58 }, floor: 'upper', aliases: ['elevator', 'connector'], commonNades: ['Elevator Smoke'] },
      { id: 'vert-a-short', name: 'A Short / Catwalk', site: 'A', coords: { x: 73, y: 69 }, floor: 'upper', aliases: ['a short', 'catwalk', 'lane'], commonNades: ['Short Molotov'] },
      { id: 'vert-mid', name: 'Mid / Connector', site: 'Mid', coords: { x: 52, y: 48 }, floor: 'upper', aliases: ['mid', 'elevator mid'], commonNades: ['CT Mid Smoke', 'Generator Smoke'] },
      { id: 'vert-ct-mid', name: 'CT Mid / Boost', site: 'Mid', coords: { x: 40, y: 35 }, floor: 'upper', aliases: ['ct mid', 'boost', 'window'], commonNades: ['CT Mid Smoke'] },
      { id: 'vert-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 54, y: 24 }, floor: 'upper', aliases: ['ct', 'ct spawn'], commonNades: ['Mid Retake Smoke'] },
      { id: 'vert-b-stairs', name: 'B Stairs', site: 'B', coords: { x: 21, y: 45 }, floor: 'upper', aliases: ['b stairs'], commonNades: ['Generator Smoke', 'CT Spawn Smoke', 'Quad Molotov'] },
      { id: 'vert-b-site', name: 'B Site / Default', site: 'B', coords: { x: 23, y: 24 }, floor: 'upper', aliases: ['b site', 'default b', 'white box'], commonNades: ['Generator Left/Right Smokes'] },
      { id: 'vert-b-gen', name: 'B Generator / Quad', site: 'B', coords: { x: 30, y: 22 }, floor: 'upper', aliases: ['generator', 'gen', 'quad'], commonNades: ['Generator Smoke', 'Quad Molotov'] },
      { id: 'vert-b-back', name: 'B Back / Electric', site: 'B', coords: { x: 16, y: 22 }, floor: 'upper', aliases: ['electric', 'back b'], commonNades: ['Electric Molotov'] },
      { id: 'vert-t-spawn', name: 'T Spawn (50F Lower)', site: 'Spawn', coords: { x: 42, y: 74 }, floor: 'lower', aliases: ['t spawn', 'lower'], commonNades: ['A Ramp Early Smoke'] },
      { id: 'vert-t-mid-lower', name: 'T Mid (50F Lower)', site: 'Mid', coords: { x: 45, y: 54 }, floor: 'lower', aliases: ['t mid', 'lower mid'], commonNades: ['Mid Flash'] },
      { id: 'vert-under-b', name: 'Under B / Ladder (50F)', site: 'B', coords: { x: 25, y: 62 }, floor: 'lower', aliases: ['under b', 'ladder room'], commonNades: ['B Stairs Flash'] },
      { id: 'vert-b-lower-stairs', name: 'B Lower Stairs (50F)', site: 'B', coords: { x: 21, y: 44 }, floor: 'lower', aliases: ['b lower'], commonNades: ['B Execute Flash'] },
      { id: 'vert-a-lower-ramp', name: 'A Lower Ramp (50F)', site: 'A', coords: { x: 64, y: 74 }, floor: 'lower', aliases: ['lower ramp'], commonNades: ['A Ramp HE'] }
    ],
    description: 'High-altitude skyscraper construction site in the CS2 Reserve Pool (replaced by Train in Active Duty) with dual-floor 50F/51F radar layers, intense A-Ramp smoke walls, and B-Stairs executes.',
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
    callouts: [
      { id: 'ovp-t-spawn', name: 'T Spawn / Tracks', site: 'Spawn', coords: { x: 64, y: 92 }, aliases: ['spawn'], commonNades: ['Monster Smoke', 'Heaven Smoke'] },
      { id: 'ovp-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 48, y: 17 }, aliases: ['ct', 'ct spawn'], commonNades: ['Bank Smoke'] },
      { id: 'ovp-fountain', name: 'Fountain', site: 'Mid', coords: { x: 41, y: 72 }, aliases: ['fountain', 'park'], commonNades: ['Toilets Flash'] },
      { id: 'ovp-playground', name: 'Playground', site: 'A', coords: { x: 27, y: 71 }, aliases: ['playground', 'slide'], commonNades: ['A Long Smoke'] },
      { id: 'ovp-a-long', name: 'A Long', site: 'A', coords: { x: 20, y: 46 }, aliases: ['long a', 'rock'], commonNades: ['Bank Smoke', 'Dumpster Smoke'] },
      { id: 'ovp-party', name: 'Party / Balloons', site: 'Mid', coords: { x: 31, y: 48 }, aliases: ['party', 'balloons', 'picnic'], commonNades: ['Toilets Smoke', 'Divider Flash'] },
      { id: 'ovp-toilets', name: 'Toilets / Bathrooms', site: 'Mid', coords: { x: 43, y: 44 }, aliases: ['toilets', 'bathrooms'], commonNades: ['Bank Smoke', 'Dumpster Smoke'] },
      { id: 'ovp-connector', name: 'Connector', site: 'Mid', coords: { x: 54, y: 53 }, aliases: ['connector', 'stairs'], commonNades: ['Connector Molotov', 'Connector Smoke'] },
      { id: 'ovp-a-short', name: 'A Short', site: 'A', coords: { x: 33, y: 30 }, aliases: ['short a', 'stairs a'], commonNades: ['Dice Molotov', 'Truck Smoke'] },
      { id: 'ovp-a-site', name: 'A Site (Dice / Truck)', site: 'A', coords: { x: 52, y: 20 }, aliases: ['a site', 'dice', 'truck'], commonNades: ['Bank Smoke', 'Dumpster Smoke', 'Truck Molotov'] },
      { id: 'ovp-bank', name: 'Bank', site: 'A', coords: { x: 45, y: 10 }, aliases: ['bank'], commonNades: ['Bank Smoke'] },
      { id: 'ovp-dumpster', name: 'Dumpster / Back A', site: 'A', coords: { x: 46, y: 14 }, aliases: ['dumpster', 'trash'], commonNades: ['Dumpster Smoke', 'Dumpster Molotov'] },
      { id: 'ovp-canal', name: 'Canal / Sewers', site: 'B', coords: { x: 73, y: 62 }, aliases: ['canal', 'sewers'], commonNades: ['Monster Flash'] },
      { id: 'ovp-short-b', name: 'Water / B Short', site: 'B', coords: { x: 60, y: 50 }, aliases: ['water', 'short b'], commonNades: ['Pillar Molotov', 'B Site Flash'] },
      { id: 'ovp-construction', name: 'Construction / Sandbags', site: 'B', coords: { x: 62, y: 41 }, aliases: ['construction', 'sandbags', 'barrel'], commonNades: ['Construction HE', 'Heaven Smoke'] },
      { id: 'ovp-monster', name: 'Monster', site: 'B', coords: { x: 82, y: 54 }, aliases: ['monster', 'tunnel'], commonNades: ['B Heaven Smoke', 'Bridge Smoke', 'Barrels Molotov'] },
      { id: 'ovp-b-site', name: 'B Site (Pillar / Toxic)', site: 'B', coords: { x: 70, y: 33 }, aliases: ['b site', 'pillar', 'toxic', 'barrels'], commonNades: ['Heaven Smoke', 'Bridge Smoke', 'Toxic Molotov'] },
      { id: 'ovp-heaven-b', name: 'B Heaven / Bridge', site: 'B', coords: { x: 60, y: 29 }, aliases: ['heaven b', 'bridge', 'graffiti'], commonNades: ['Heaven Smoke', 'Heaven Molotov'] }
    ],
    description: 'Sprawling canal and park map in the CS2 Reserve Pool featuring deep B-site Heaven/Bridge executes from Water and long-range A-site Bank/Dumpster setups.',
    thumbnail: BANNER('overpass.webp')
  },
  {
    id: 'cache',
    name: 'Cache',
    code: 'de_cache',
    activePool: false,
    poolCategory: 'Classic Competitive',
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
      { id: 'cch-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 88, y: 58 }, aliases: ['spawn'], commonNades: ['Mid Z Smoke', 'White Box Smoke'] },
      { id: 'cch-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 9, y: 47 }, aliases: ['ct', 'ct spawn'], commonNades: ['A Retake Smoke'] },
      { id: 'cch-a-main', name: 'A Main', site: 'A', coords: { x: 50, y: 27 }, aliases: ['a main'], commonNades: ['A Cross Smoke', 'Quad Molotov', 'NBK Molotov'] },
      { id: 'cch-squeaky', name: 'Squeaky', site: 'A', coords: { x: 44, y: 32 }, aliases: ['squeaky', 'door'], commonNades: ['Squeaky Flash', 'Forklift Molotov'] },
      { id: 'cch-a-site', name: 'A Site (Default / Red)', site: 'A', coords: { x: 31, y: 27 }, aliases: ['a site', 'red box', 'default a'], commonNades: ['Truck Smoke', 'Highway Smoke'] },
      { id: 'cch-forklift', name: 'Forklift', site: 'A', coords: { x: 25, y: 32 }, aliases: ['forklift', 'fork'], commonNades: ['Forklift Molotov'] },
      { id: 'cch-quad', name: 'Quad', site: 'A', coords: { x: 28, y: 18 }, aliases: ['quad'], commonNades: ['Quad Molotov'] },
      { id: 'cch-nbk', name: 'NBK / Fence', site: 'A', coords: { x: 20, y: 34 }, aliases: ['nbk', 'fence'], commonNades: ['NBK Molotov'] },
      { id: 'cch-highway', name: 'Truck / Highway', site: 'A', coords: { x: 18, y: 43 }, aliases: ['highway', 'truck'], commonNades: ['Highway Smoke'] },
      { id: 'cch-mid', name: 'Mid / Boost', site: 'Mid', coords: { x: 51, y: 50 }, aliases: ['mid', 'boost'], commonNades: ['Mid Z Smoke', 'Boost Flash'] },
      { id: 'cch-whitebox', name: 'White Box', site: 'Mid', coords: { x: 45, y: 49 }, aliases: ['white box', 'sandbags'], commonNades: ['White Box Smoke'] },
      { id: 'cch-z-con', name: 'Z Connector', site: 'Mid', coords: { x: 30, y: 49 }, aliases: ['z connector', 'connector'], commonNades: ['Mid Z Smoke'] },
      { id: 'cch-vents', name: 'Vents', site: 'Mid', coords: { x: 35, y: 60 }, aliases: ['vents'], commonNades: ['Vent Molotov'] },
      { id: 'cch-b-main', name: 'B Main / Garage', site: 'B', coords: { x: 56, y: 75 }, aliases: ['b main', 'garage'], commonNades: ['CT B Smoke', 'Heaven Smoke', 'Headshot Molotov'] },
      { id: 'cch-sunroom', name: 'Sun Room', site: 'B', coords: { x: 50, y: 80 }, aliases: ['sun room', 'window'], commonNades: ['Heaven Smoke', 'Checkers Flash'] },
      { id: 'cch-checkers', name: 'Checkers', site: 'B', coords: { x: 34, y: 68 }, aliases: ['checkers'], commonNades: ['Checkers Molotov'] },
      { id: 'cch-b-site', name: 'B Site / Headshot', site: 'B', coords: { x: 35, y: 79 }, aliases: ['b site', 'headshot', 'triple'], commonNades: ['Heaven Smoke', 'Tree Room Smoke'] },
      { id: 'cch-tree', name: 'B Heaven / Tree Room', site: 'B', coords: { x: 19, y: 72 }, aliases: ['heaven', 'tree room', 'ct b'], commonNades: ['Tree Room Smoke', 'Heaven Molotov'] }
    ],
    description: 'Classic three-lane industrial facility (Classic Competitive Pool) with explosive A-Main executes, Mid Z control, and Sun Room utility.',
    thumbnail: BANNER('cache.webp')
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
    callouts: [
      { id: 'cbl-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 18, y: 24 }, aliases: ['spawn', 't yard'], commonNades: ['Mid Courtyard Smoke', 'B Halls Smoke'] },
      { id: 'cbl-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 48, y: 82 }, aliases: ['ct', 'connector'], commonNades: ['A Retake Smoke', 'Chicken Coop Smoke'] },
      { id: 'cbl-mid', name: 'Mid / Courtyard', site: 'Mid', coords: { x: 42, y: 48 }, aliases: ['mid', 'courtyard'], commonNades: ['Mid Connector Smoke', 'Drop Window Flash'] },
      { id: 'cbl-dragonlore', name: 'Dragonlore / Arch', site: 'Mid', coords: { x: 38, y: 38 }, aliases: ['dragonlore', 'arch', 'under'], commonNades: ['Courtyard Smoke'] },
      { id: 'cbl-a-ramp', name: 'A Ramp / Connector', site: 'A', coords: { x: 37, y: 56 }, aliases: ['a ramp', 'a mid'], commonNades: ['A Ramp Molotov'] },
      { id: 'cbl-a-balcony', name: 'A Balcony / Doors', site: 'A', coords: { x: 23, y: 44 }, aliases: ['balcony', 'a doors'], commonNades: ['A Long Doors Smoke'] },
      { id: 'cbl-a-long', name: 'A Long', site: 'A', coords: { x: 24, y: 58 }, aliases: ['a long', 'long a'], commonNades: ['A Long Doors Smoke', 'A Site Statue Molotov'] },
      { id: 'cbl-a-site', name: 'A Site (Statue / Truck)', site: 'A', coords: { x: 34, y: 74 }, aliases: ['a site', 'statue', 'truck', 'default a'], commonNades: ['CT A Smoke', 'Truck Molotov', 'Connector Smoke'] },
      { id: 'cbl-a-pit', name: 'A Connector / Pit', site: 'A', coords: { x: 44, y: 78 }, aliases: ['a pit', 'ct ramp'], commonNades: ['Connector Smoke'] },
      { id: 'cbl-rock', name: 'Rock / Danger', site: 'B', coords: { x: 74, y: 32 }, aliases: ['rock', 'danger', 'upper halls'], commonNades: ['B Halls Flash'] },
      { id: 'cbl-b-long', name: 'B Long / Halls', site: 'B', coords: { x: 72, y: 42 }, aliases: ['b long', 'b halls'], commonNades: ['B Plat Smoke', 'Fountain Smoke', 'B Halls Flash'] },
      { id: 'cbl-drop', name: 'Drop Room', site: 'B', coords: { x: 58, y: 54 }, aliases: ['drop', 'dropper', 'window'], commonNades: ['Drop Exit Smoke', 'Drop Molotov', 'B Connector Flash'] },
      { id: 'cbl-b-con', name: 'B Connector', site: 'B', coords: { x: 60, y: 65 }, aliases: ['b connector', 'broken wall'], commonNades: ['Broken Wall Smoke'] },
      { id: 'cbl-b-plat', name: 'B Plat', site: 'B', coords: { x: 78, y: 56 }, aliases: ['b plat', 'platform', 'rock'], commonNades: ['B Plat Molotov', 'Rock Smoke'] },
      { id: 'cbl-b-site', name: 'B Site (Fountain / Broken Wall)', site: 'B', coords: { x: 68, y: 66 }, aliases: ['b site', 'fountain', 'statue b'], commonNades: ['Chicken Coop Smoke', 'Broken Wall Smoke', 'Rock Molotov'] },
      { id: 'cbl-coop', name: 'Chicken Coop', site: 'B', coords: { x: 64, y: 76 }, aliases: ['coop', 'chicken', 'ct b'], commonNades: ['Chicken Coop Smoke', 'Coop Molotov'] }
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
