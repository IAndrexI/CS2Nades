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
    callouts: enrichCalloutList([
      { id: 'mir-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 88, y: 36 }, aliases: ['spawn', 't roof', 't base'], commonNades: ['Window Smoke', 'Ticket Smoke', 'Stairs Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 30, y: 70 }, aliases: ['ct', 'ticket cross', 'ct base'], commonNades: ['Ticket Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-ticket', name: 'Ticket Booth', site: 'A', coords: { x: 45, y: 78 }, aliases: ['ticket', 'ct booth', 'ct box'], commonNades: ['Ticket Smoke', 'Ticket Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-a-site', name: 'A Site (Default)', site: 'A', coords: { x: 56, y: 76 }, aliases: ['a site', 'default a', 'open plant'], commonNades: ['Default Molotov', 'Triple Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-triple', name: 'Triple / Firebox', site: 'A', coords: { x: 53, y: 70 }, aliases: ['triple', 'firebox', 'danger'], commonNades: ['Firebox Molotov', 'Triple Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-ninja', name: 'Under Palace / Shadow', site: 'A', coords: { x: 65, y: 77 }, aliases: ['under balcony', 'dark', 'shadow', 'under palace'], commonNades: ['Under Palace Molotov'], sources: ['CS2Journal', 'CS2Flow', 'Scope.gg', 'Leetify'] },
      { id: 'mir-stairs', name: 'Stairs', site: 'A', coords: { x: 56, y: 63 }, aliases: ['a stairs', 'cat stairs'], commonNades: ['Stairs Smoke', 'Stairs Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-jungle', name: 'Jungle', site: 'A', coords: { x: 47, y: 61 }, aliases: ['jungle', 'window cross'], commonNades: ['Jungle Smoke', 'Jungle Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-connector', name: 'Connector', site: 'Mid', coords: { x: 50, y: 54 }, aliases: ['con', 'a con', 'connector stairs'], commonNades: ['Connector Smoke', 'Connector Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-palace', name: 'Palace', site: 'A', coords: { x: 74, y: 77 }, aliases: ['a palace', 'pillars', 'balcony'], commonNades: ['Palace Smoke', 'Palace Pop Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-a-ramp', name: 'A Ramp', site: 'A', coords: { x: 73, y: 65 }, aliases: ['ramp', 'a main', 't ramp'], commonNades: ['Ramp Smoke', 'Ramp Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-tetris', name: 'Tetris', site: 'A', coords: { x: 64, y: 65 }, aliases: ['tetris', 'sandwich'], commonNades: ['Tetris Molotov', 'Tetris HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-window', name: 'Mid Window (Sniper Nest)', site: 'Mid', coords: { x: 39, y: 47 }, aliases: ['window', 'sniper', 'nest', 'murder hole'], commonNades: ['Instant Window Smoke', 'Window Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-top-mid', name: 'Top Mid', site: 'Mid', coords: { x: 69, y: 43 }, aliases: ['mid', 't mid', 'cart'], commonNades: ['Top Mid Cross Smoke', 'Mid Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-mid-boxes', name: 'Mid Boxes / Chair', site: 'Mid', coords: { x: 56, y: 47 }, aliases: ['boxes', 'chair', 'delpan'], commonNades: ['Mid Cross Smoke', 'Mid Pop Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg'] },
      { id: 'mir-catwalk', name: 'Catwalk / Short', site: 'Mid', coords: { x: 50, y: 39 }, aliases: ['cat', 'short', 'ladder room'], commonNades: ['Catwalk Smoke', 'Short Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-underpass', name: 'Underpass', site: 'Mid', coords: { x: 44, y: 48 }, aliases: ['under', 'underground'], commonNades: ['Underpass Molotov', 'Underpass HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-b-apps', name: 'B Apartments', site: 'B', coords: { x: 35, y: 18 }, aliases: ['apps', 'apartments', 'balcony', 'kitchen apps'], commonNades: ['B Apps Smoke', 'Deep Apps Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-b-site', name: 'B Site (Default / Pillar)', site: 'B', coords: { x: 23, y: 28 }, aliases: ['b default', 'empty', 'pillar'], commonNades: ['Bench Molotov', 'Site Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-bench', name: 'Bench / Forest', site: 'B', coords: { x: 16, y: 33 }, aliases: ['bench', 'forest', 'b wall'], commonNades: ['Bench Molotov', 'Bench HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Leetify'] },
      { id: 'mir-van', name: 'Van / Car', site: 'B', coords: { x: 18, y: 21 }, aliases: ['van', 'car', 'jail'], commonNades: ['Van Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-market-window', name: 'Market Window', site: 'B', coords: { x: 22, y: 41 }, aliases: ['market', 'kitchen window', 'shop'], commonNades: ['Market Window Smoke', 'Market Door Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'mir-market-door', name: 'Market Door', site: 'B', coords: { x: 28, y: 38 }, aliases: ['kitchen door', 'market exit'], commonNades: ['Market Door Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg'] },
      { id: 'mir-b-short', name: 'B Short / Arches', site: 'B', coords: { x: 36, y: 29 }, aliases: ['arches', 'get right', 'edward', 'cat b'], commonNades: ['B Short Smoke', 'Arches Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'd2-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 38, y: 90 }, aliases: ['spawn', 't base', 't ramp'], commonNades: ['Xbox Smoke', 'Outside Long Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 60, y: 22 }, aliases: ['ct', 'elevator', 'ct base'], commonNades: ['CT Cross Smoke', 'CT Mid Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-suicide', name: 'Suicide / T Mid', site: 'Mid', coords: { x: 46, y: 73 }, aliases: ['suicide', 't mid', 'alley'], commonNades: ['Xbox Smoke', 'Mid Doors Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-top-mid', name: 'Top Mid / Palm', site: 'Mid', coords: { x: 48, y: 57 }, aliases: ['top mid', 'palm tree', 'green box'], commonNades: ['Xbox Smoke', 'Short Boost Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-xbox', name: 'Mid Xbox', site: 'Mid', coords: { x: 48, y: 43 }, aliases: ['xbox', 'mid box', 'double stack'], commonNades: ['Xbox Smoke', 'Mid Doors Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-mid-doors', name: 'Mid Doors', site: 'Mid', coords: { x: 47, y: 34 }, aliases: ['mid doors', 'b split', 'double doors mid'], commonNades: ['Mid Doors Smoke', 'CT Mid Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-ct-mid', name: 'CT Mid', site: 'Mid', coords: { x: 48, y: 24 }, aliases: ['ct mid', 'mushroom', 'mid to b'], commonNades: ['CT Mid Smoke', 'B Retake Flash'], sources: ['CS2Journal', 'CS2Flow', 'Scope.gg', 'Leetify'] },
      { id: 'd2-catwalk', name: 'Catwalk / Short A', site: 'A', coords: { x: 61, y: 40 }, aliases: ['cat', 'short', 'catwalk'], commonNades: ['Short A Pop Flash', 'Goose Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-a-short-stairs', name: 'A Short Boost / Stairs', site: 'A', coords: { x: 64, y: 26 }, aliases: ['short boost', 'a stairs', 'little box'], commonNades: ['A Site Smoke', 'Short Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-a-ninja', name: 'A Ninja / Quad', site: 'A', coords: { x: 70, y: 21 }, aliases: ['ninja', 'gandalf', 'quad box'], commonNades: ['Ninja Molotov', 'A Plat Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Leetify'] },
      { id: 'd2-outside-long', name: 'Outside Long', site: 'A', coords: { x: 65, y: 74 }, aliases: ['outside long', 't plat', 'long house'], commonNades: ['Long Corner Smoke', 'Long Doors Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-long-doors', name: 'Long Doors', site: 'A', coords: { x: 77, y: 64 }, aliases: ['bedroom', 'double doors', 'long house'], commonNades: ['Long Corner Smoke', 'Long Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-long-corner', name: 'Long Corner / Blue', site: 'A', coords: { x: 88, y: 50 }, aliases: ['long', 'blue container', 'blue dump'], commonNades: ['Long Corner Smoke', 'Car Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-pit', name: 'A Long Pit', site: 'A', coords: { x: 90, y: 41 }, aliases: ['pit', 'long pit', 'side pit'], commonNades: ['Pit Molotov', 'Pit Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-a-car', name: 'A Car', site: 'A', coords: { x: 89, y: 28 }, aliases: ['car', 'long car'], commonNades: ['Car Molotov', 'A Cross Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-long-cross', name: 'Long Cross (CT Ramp)', site: 'A', coords: { x: 76, y: 27 }, aliases: ['cross', 'ct ramp', 'elevator ramp'], commonNades: ['Long Cross Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-a-site', name: 'A Site / Goose', site: 'A', coords: { x: 80, y: 16 }, aliases: ['a site', 'goose', 'plat', 'barrels'], commonNades: ['A Site Smoke', 'Goose Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-lower-tunnels', name: 'Lower B Tunnels', site: 'B', coords: { x: 36, y: 42 }, aliases: ['lower tuns', 'lower', 'tunnel stairs'], commonNades: ['Mid Doors Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-b-tunnels', name: 'Upper B Tunnels', site: 'B', coords: { x: 18, y: 50 }, aliases: ['tunnels', 'upper tuns', 'b tuns'], commonNades: ['B Doors Smoke', 'B Window Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-b-doors', name: 'B Site Doors', site: 'B', coords: { x: 26, y: 24 }, aliases: ['b doors', 'double doors b'], commonNades: ['B Doors Smoke', 'B Doors Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-b-window', name: 'B Window', site: 'B', coords: { x: 27, y: 15 }, aliases: ['window', 'scaffolding', 'breach'], commonNades: ['B Window Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-b-site', name: 'B Site / Back Plat', site: 'B', coords: { x: 20, y: 13 }, aliases: ['b site', 'back plat', 'big box', 'double stack'], commonNades: ['Back Plat Molotov', 'Car Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'd2-b-car', name: 'B Car / Closet', site: 'B', coords: { x: 11, y: 25 }, aliases: ['b car', 'closet', 'fence'], commonNades: ['B Car Molotov', 'Closet HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'inf-t-spawn', name: 'T Spawn / T Ramp', site: 'Spawn', coords: { x: 10, y: 67 }, aliases: ['spawn', 't ramp'], commonNades: ['Top Mid Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 89, y: 35 }, aliases: ['ct', 'well', 'truck ct'], commonNades: ['CT Boost Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-bot-banana', name: 'Bottom Banana', site: 'B', coords: { x: 43, y: 54 }, aliases: ['t ramp banana', 'bottom banana', 'logs'], commonNades: ['Deep Banana HE', 'Half Wall Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-banana', name: 'Banana (Logs / Half Wall)', site: 'B', coords: { x: 44, y: 44 }, aliases: ['banana', 'logs', 'sandbags', 'half wall'], commonNades: ['Deep Banana HE', 'Car Molotov', 'Coffins Smoke', 'CT Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-top-banana', name: 'Top Banana / Car', site: 'B', coords: { x: 49, y: 35 }, aliases: ['car', 'top banana', 'broom'], commonNades: ['Car Molotov', 'CT Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-b-site', name: 'B Site (New Box / First Oranges)', site: 'B', coords: { x: 49, y: 22 }, aliases: ['b site', 'new box', 'oranges', 'dark', 'fountain'], commonNades: ['New Box Molotov', 'Oranges Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-coffins', name: 'B Site Coffins', site: 'B', coords: { x: 49, y: 12 }, aliases: ['coffins', 'construction'], commonNades: ['Coffins Smoke', 'Dark Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-ct-arch', name: 'B Site CT / Spools', site: 'B', coords: { x: 58, y: 24 }, aliases: ['ct b', 'spools', 'garden', 'grill'], commonNades: ['CT Boost Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-church', name: 'Church / Ruins', site: 'B', coords: { x: 66, y: 15 }, aliases: ['church', 'ruins', 'construction'], commonNades: ['Church Retake Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg'] },
      { id: 'inf-second-mid', name: 'Second Mid', site: 'Mid', coords: { x: 50, y: 82 }, aliases: ['second mid', 'alt mid'], commonNades: ['Top Mid Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-t-apps', name: 'T Apartments', site: 'Mid', coords: { x: 35, y: 77 }, aliases: ['t apps', 'bridge'], commonNades: ['Boiler Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Leetify'] },
      { id: 'inf-mid', name: 'Mid / Haystack', site: 'Mid', coords: { x: 44, y: 68 }, aliases: ['mid', 'haystack', 'underpass'], commonNades: ['Mid Smoke', 'Banana Support Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-top-mid', name: 'Top Mid / Boiler', site: 'Mid', coords: { x: 57, y: 69 }, aliases: ['top mid', 'boiler', 'stairs'], commonNades: ['Long Corner Smoke', 'Short Smoke', 'Arch Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-a-apps', name: 'A Apartments / Balcony', site: 'A', coords: { x: 71, y: 83 }, aliases: ['a apps', 'balcony', 'dark room', 'halls'], commonNades: ['Pit Molotov', 'Balcony Pop Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-short-a', name: 'A Short / Quad / Lane', site: 'A', coords: { x: 70, y: 73 }, aliases: ['short', 'quad', 'lane', 'truck'], commonNades: ['Moto Smoke', 'Boiler Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-arch', name: 'A Long / Arch', site: 'A', coords: { x: 74, y: 45 }, aliases: ['arch', 'long a', 'cubby'], commonNades: ['Arch Smoke', 'Library Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-library', name: 'Library', site: 'A', coords: { x: 89, y: 53 }, aliases: ['library', 'books'], commonNades: ['Library Smoke', 'Library Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-a-site', name: 'A Site / Moto', site: 'A', coords: { x: 81, y: 70 }, aliases: ['a site', 'moto', 'default a', 'graveyard cross'], commonNades: ['Moto Smoke', 'Default Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'inf-pit', name: 'A Pit / Graveyard', site: 'A', coords: { x: 91, y: 78 }, aliases: ['pit', 'graveyard', 'mini pit', 'big pit'], commonNades: ['Pit Molotov', 'Pit Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'nuke-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 20, y: 54 }, floor: 'upper', aliases: ['t spawn', 'trucks'], commonNades: ['Outside Smoke Wall', 'Garage Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-t-roof', name: 'T Roof / Silo', site: 'A', coords: { x: 43, y: 56 }, floor: 'upper', aliases: ['roof', 'silo', 'marshmallow'], commonNades: ['Outside Smoke Wall 1', 'Heaven Smoke', 'Skylight Molly'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-lobby', name: 'T Lobby', site: 'A', coords: { x: 47, y: 52 }, floor: 'upper', aliases: ['lobby', 'radio', 'trophy'], commonNades: ['Hut Molotov', 'Door Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-squeaky', name: 'Squeaky / Trophy', site: 'A', coords: { x: 51, y: 46 }, floor: 'upper', aliases: ['squeaky', 'trophy', 'door'], commonNades: ['Squeaky Door HE', 'A Site Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-a-site', name: 'A Site (Hut / Mustache)', site: 'A', coords: { x: 58, y: 50 }, floor: 'upper', aliases: ['a site', 'hut', 'vents', 'tetris'], commonNades: ['Hut Molotov', 'Door Smoke', 'Vent Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-a-main', name: 'A Main / Mini', site: 'A', coords: { x: 59, y: 59 }, floor: 'upper', aliases: ['mini', 'main', 'blue'], commonNades: ['Main Smoke', 'Mini Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-heaven', name: 'A Heaven / Rafters', site: 'A', coords: { x: 63, y: 50 }, floor: 'upper', aliases: ['heaven', 'rafters', 'catwalk'], commonNades: ['Heaven Glass Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-ramp', name: 'Ramp Room', site: 'A', coords: { x: 57, y: 36 }, floor: 'upper', aliases: ['ramp', 'headshot box', 'hell ramp'], commonNades: ['Ramp Smoke', 'Headshot Box Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-outside', name: 'Outside / Red Box', site: 'Mid', coords: { x: 56, y: 72 }, floor: 'upper', aliases: ['outside', 'red box', 'yard'], commonNades: ['Outside Cross Smoke', 'Garage Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-secret-upper', name: 'Secret Stairs (Upper)', site: 'Mid', coords: { x: 69, y: 69 }, floor: 'upper', aliases: ['secret', 'secret stairs'], commonNades: ['Secret Cross Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-garage', name: 'Garage', site: 'Mid', coords: { x: 74, y: 66 }, floor: 'upper', aliases: ['garage', 'blue box'], commonNades: ['Garage Smoke', 'Garage Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-hell', name: 'Hell / Locker', site: 'A', coords: { x: 69, y: 55 }, floor: 'upper', aliases: ['hell', 'locker', 'under heaven'], commonNades: ['Outside Support Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 82, y: 46 }, floor: 'upper', aliases: ['ct', 'ct spawn'], commonNades: ['Outside Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-b-site', name: 'B Site (Lower)', site: 'B', coords: { x: 57, y: 54 }, floor: 'lower', aliases: ['b site', 'toxic', 'default b'], commonNades: ['Bottom Ramp Smoke', 'Dark Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-b-ramp', name: 'B Ramp (Lower)', site: 'B', coords: { x: 57, y: 38 }, floor: 'lower', aliases: ['lower ramp', 'b ramp'], commonNades: ['B Ramp Smoke', 'B Ramp Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-decon', name: 'Decon / Double Doors (Lower)', site: 'B', coords: { x: 64, y: 64 }, floor: 'lower', aliases: ['decon', 'double doors'], commonNades: ['Decon Door Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-secret-lower', name: 'Secret Hallway (Lower)', site: 'B', coords: { x: 69, y: 69 }, floor: 'lower', aliases: ['secret lower', 'single door', 'tunnels'], commonNades: ['Single Door Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-b-vents', name: 'B Vents / Control', site: 'B', coords: { x: 51, y: 62 }, floor: 'lower', aliases: ['vents', 'control room'], commonNades: ['Control Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'nuke-b-window', name: 'B Window / Dark', site: 'B', coords: { x: 63, y: 49 }, floor: 'lower', aliases: ['b window', 'dark', 'observation'], commonNades: ['Window Smoke', 'Dark Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'anc-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 49, y: 86 }, aliases: ['spawn', 'ruins spawn'], commonNades: ['Red Room Smoke', 'Donut Smoke', 'Cave Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 51, y: 17 }, aliases: ['ct', 'ct spawn'], commonNades: ['Mid Rush Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-a-yard', name: 'A Yard / Ruins', site: 'A', coords: { x: 22, y: 65 }, aliases: ['a yard', 'ruins', 'tunnels'], commonNades: ['A Main Smoke', 'Donut Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-a-main', name: 'A Main', site: 'A', coords: { x: 18, y: 48 }, aliases: ['a main', 'a halls'], commonNades: ['CT A Smoke', 'Temple Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-a-plat', name: 'A Plat / Boost', site: 'A', coords: { x: 20, y: 23 }, aliases: ['a plat', 'big box', 'boost'], commonNades: ['A Plat Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-a-site', name: 'A Site / Triple', site: 'A', coords: { x: 30, y: 26 }, aliases: ['a site', 'triple', 'default a'], commonNades: ['Temple Smoke', 'CT Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-temple', name: 'Temple / CT A', site: 'A', coords: { x: 31, y: 19 }, aliases: ['temple', 'ct a'], commonNades: ['Temple Smoke', 'Temple Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-donut', name: 'Donut', site: 'Mid', coords: { x: 31, y: 43 }, aliases: ['donut', 'square', 'a connector'], commonNades: ['Donut Smoke', 'Donut Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-elbow', name: 'Elbow', site: 'Mid', coords: { x: 48, y: 58 }, aliases: ['elbow', 't mid'], commonNades: ['Mid Instant Smoke', 'Elbow Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-mid', name: 'Mid / Red Room', site: 'Mid', coords: { x: 49, y: 43 }, aliases: ['mid', 'red room', 'cubby'], commonNades: ['Red Room Smoke', 'Mid HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-top-mid', name: 'Top Mid / House', site: 'Mid', coords: { x: 49, y: 29 }, aliases: ['top mid', 'house', 'ct mid'], commonNades: ['Top Mid Smoke', 'House Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-water', name: 'Water / T Alley', site: 'B', coords: { x: 59, y: 60 }, aliases: ['water', 'b alley', 'canal'], commonNades: ['Cave Smoke', 'B Ramp HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-b-ramp', name: 'B Ramp / Doors', site: 'B', coords: { x: 77, y: 60 }, aliases: ['b ramp', 'doors', 'outside b'], commonNades: ['Cave Smoke', 'Long B Smoke', 'Short B Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-cave', name: 'Cave / Cheetah', site: 'B', coords: { x: 66, y: 47 }, aliases: ['cave', 'house', 'jaguar', 'cheetah'], commonNades: ['Cave Smoke', 'Cave Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-b-short', name: 'B Short / Lane', site: 'B', coords: { x: 67, y: 38 }, aliases: ['short b', 'lane', 'cubby'], commonNades: ['Short Smoke', 'Ninja Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-b-site', name: 'B Site (Pillar)', site: 'B', coords: { x: 75, y: 41 }, aliases: ['b site', 'pillar', 'ninja', 'totem'], commonNades: ['Long Smoke', 'Short Smoke', 'Ninja Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-b-long', name: 'B Long', site: 'B', coords: { x: 82, y: 36 }, aliases: ['long b', 'back b', 'slant'], commonNades: ['Long B Smoke', 'Long Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anc-ct-b', name: 'B Alley / CT B', site: 'B', coords: { x: 67, y: 26 }, aliases: ['ct b', 'alley', 'construction'], commonNades: ['CT B Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'anu-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 48, y: 90 }, aliases: ['spawn'], commonNades: ['Mid House Smoke', 'B Connector Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 42, y: 20 }, aliases: ['ct', 'ct spawn', 'beach'], commonNades: ['Mid Retake Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-ruins', name: 'Ruins / T Alley', site: 'B', coords: { x: 28, y: 72 }, aliases: ['ruins', 't alley', 'upper b'], commonNades: ['B Long Smoke', 'B Main HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-b-main', name: 'B Main', site: 'B', coords: { x: 24, y: 58 }, aliases: ['b main', 'b gate'], commonNades: ['Palace Smoke', 'CT Street Smoke', 'Pillar Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-b-long', name: 'B Long / Street', site: 'B', coords: { x: 28, y: 34 }, aliases: ['b long', 'street', 'sniper'], commonNades: ['CT Street Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-b-site', name: 'B Site (Obelisk / Pillar)', site: 'B', coords: { x: 33, y: 49 }, aliases: ['b site', 'pillar', 'default b', 'obelisk'], commonNades: ['B Connector Smoke', 'Palace Smoke', 'Back Site Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-palace', name: 'Palace / Temple', site: 'B', coords: { x: 39, y: 32 }, aliases: ['palace', 'temple', 'ct b'], commonNades: ['Palace Smoke', 'Temple Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-ebox', name: 'B Connector (E-Box)', site: 'B', coords: { x: 41, y: 58 }, aliases: ['e-box', 'connector', 'dark', 'water con'], commonNades: ['E-Box Smoke', 'E-Box Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-mid', name: 'Mid Bridge', site: 'Mid', coords: { x: 52, y: 54 }, aliases: ['mid', 'bridge', 'walkway'], commonNades: ['Mid House Smoke', 'Bridge Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-mid-doors', name: 'Mid Doors / House', site: 'Mid', coords: { x: 55, y: 45 }, aliases: ['house', 'double doors', 'window'], commonNades: ['Mid House Smoke', 'House Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-top-mid', name: 'Top Mid / Alley', site: 'Mid', coords: { x: 55, y: 35 }, aliases: ['top mid', 'ct mid'], commonNades: ['Top Mid Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-canals', name: 'Canals / Water', site: 'Mid', coords: { x: 60, y: 58 }, aliases: ['canals', 'water', 'river'], commonNades: ['E-Box Smoke', 'Mid Window Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-boat', name: 'Boat / Sewer', site: 'Mid', coords: { x: 71, y: 54 }, aliases: ['boat', 'sewer', 'stairs'], commonNades: ['Boat Flash', 'Canals HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-a-main', name: 'A Main / Rug', site: 'A', coords: { x: 79, y: 48 }, aliases: ['a main', 'rug', 'carpet'], commonNades: ['Heaven Smoke', 'Camera Smoke', 'Fountain Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-fountain', name: 'A Fountain', site: 'A', coords: { x: 75, y: 35 }, aliases: ['fountain', 'plat', 'waters'], commonNades: ['Fountain Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-a-site', name: 'A Site (Plateau)', site: 'A', coords: { x: 74, y: 27 }, aliases: ['a site', 'plateau', 'pillar'], commonNades: ['Heaven Smoke', 'Camera Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-heaven', name: 'A Heaven / Walkway', site: 'A', coords: { x: 65, y: 25 }, aliases: ['heaven', 'walkway', 'broky'], commonNades: ['Heaven Smoke', 'Heaven Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'anu-camera', name: 'A Camera / Connector', site: 'A', coords: { x: 63, y: 37 }, aliases: ['camera', 'a con', 'elbow a'], commonNades: ['Camera Smoke', 'Camera Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'cch-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 88, y: 58 }, aliases: ['spawn', 't truck'], commonNades: ['Mid Z Smoke', 'White Box Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 9, y: 47 }, aliases: ['ct', 'ct spawn', 'truck'], commonNades: ['A Retake Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-a-main', name: 'A Main', site: 'A', coords: { x: 50, y: 27 }, aliases: ['a main', 'warehouse'], commonNades: ['A Cross Smoke', 'Quad Molotov', 'NBK Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-squeaky', name: 'Squeaky', site: 'A', coords: { x: 44, y: 32 }, aliases: ['squeaky', 'door', 'blue door'], commonNades: ['Squeaky Flash', 'Forklift Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-a-site', name: 'A Site (Default / Red)', site: 'A', coords: { x: 31, y: 27 }, aliases: ['a site', 'red box', 'default a', 'container'], commonNades: ['Truck Smoke', 'Highway Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-forklift', name: 'Forklift', site: 'A', coords: { x: 25, y: 32 }, aliases: ['forklift', 'fork', 'yellow'], commonNades: ['Forklift Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-quad', name: 'Quad', site: 'A', coords: { x: 28, y: 18 }, aliases: ['quad', 'back site'], commonNades: ['Quad Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-nbk', name: 'NBK / Fence', site: 'A', coords: { x: 20, y: 34 }, aliases: ['nbk', 'fence', 'corner'], commonNades: ['NBK Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-highway', name: 'Truck / Highway', site: 'A', coords: { x: 18, y: 43 }, aliases: ['highway', 'truck', 'car', 'speedway'], commonNades: ['Highway Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-mid', name: 'Mid / Boost', site: 'Mid', coords: { x: 51, y: 50 }, aliases: ['mid', 'boost', 'garage'], commonNades: ['Mid Z Smoke', 'Boost Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-whitebox', name: 'White Box', site: 'Mid', coords: { x: 45, y: 49 }, aliases: ['white box', 'sandbags'], commonNades: ['White Box Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-z-con', name: 'Z Connector', site: 'Mid', coords: { x: 30, y: 49 }, aliases: ['z connector', 'connector', 'z'], commonNades: ['Mid Z Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-vents', name: 'Vents', site: 'Mid', coords: { x: 35, y: 60 }, aliases: ['vents', 'vent room'], commonNades: ['Vent Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-b-main', name: 'B Main / Garage', site: 'B', coords: { x: 56, y: 75 }, aliases: ['b main', 'garage', 'b halls'], commonNades: ['CT B Smoke', 'Heaven Smoke', 'Headshot Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-sunroom', name: 'Sun Room', site: 'B', coords: { x: 50, y: 80 }, aliases: ['sun room', 'window', 'toxic'], commonNades: ['Heaven Smoke', 'Checkers Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-checkers', name: 'Checkers', site: 'B', coords: { x: 34, y: 68 }, aliases: ['checkers', 'vent exit'], commonNades: ['Checkers Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-b-site', name: 'B Site / Headshot', site: 'B', coords: { x: 35, y: 79 }, aliases: ['b site', 'headshot', 'triple', 'generator'], commonNades: ['Heaven Smoke', 'Tree Room Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cch-tree', name: 'B Heaven / Tree Room', site: 'B', coords: { x: 19, y: 72 }, aliases: ['heaven', 'tree room', 'ct b', 'rafters'], commonNades: ['Tree Room Smoke', 'Heaven Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'trn-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 14, y: 23 }, aliases: ['spawn'], commonNades: ['Connector Smoke', 'Sandwich Smoke', 'Olof Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 87, y: 76 }, aliases: ['ct', 'ct spawn'], commonNades: ['A Retake Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-a-main', name: 'A Main / Outside', site: 'A', coords: { x: 38, y: 47 }, aliases: ['a main', 't main'], commonNades: ['Z Connector Smoke', 'Popdog Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-popdog', name: 'Popdog / Ladder', site: 'A', coords: { x: 44, y: 55 }, aliases: ['popdog', 'ladder', 'drop'], commonNades: ['Popdog Molotov', 'Popdog HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-ivy', name: 'Ivy', site: 'A', coords: { x: 53, y: 21 }, aliases: ['ivy', 'tunnels'], commonNades: ['Ivy Smoke', 'Old Bomb Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-old-bomb', name: 'Old Bomb / Alley', site: 'A', coords: { x: 78, y: 26 }, aliases: ['old bomb', 'alley', 'back ivy'], commonNades: ['Old Bomb Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-a-site', name: 'A Site (Default)', site: 'A', coords: { x: 63, y: 50 }, aliases: ['a site', 'olof', 'default a'], commonNades: ['Z Connector Smoke', 'Sandwich Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-red', name: 'Red Train (A1)', site: 'A', coords: { x: 49, y: 40 }, aliases: ['red', 'red train', 'olof'], commonNades: ['Red Train Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-green', name: 'Green Train (A2)', site: 'A', coords: { x: 62, y: 39 }, aliases: ['green', 'green train', 'pop'], commonNades: ['Green Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-sandwich', name: 'Sandwich / Hell', site: 'A', coords: { x: 76, y: 41 }, aliases: ['sandwich', 'hell', 'e-box'], commonNades: ['Sandwich Molotov', 'Hell Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-z-con', name: 'Z Connector', site: 'Mid', coords: { x: 64, y: 61 }, aliases: ['z connector', 'connector', 'z'], commonNades: ['Z Connector Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-b-halls', name: 'Brown Halls / Upper B', site: 'B', coords: { x: 35, y: 55 }, aliases: ['brown halls', 'upper b', 'showers'], commonNades: ['Upper B Smoke', 'Connector B Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-b-ramp', name: 'B Ramp', site: 'B', coords: { x: 33, y: 73 }, aliases: ['b ramp', 'b halls'], commonNades: ['Oil Train Molotov', 'B Execute Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-lower-b', name: 'Lower B', site: 'B', coords: { x: 40, y: 84 }, aliases: ['lower b', 'tunnels b'], commonNades: ['Lower B Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-b-site', name: 'B Site (Inner)', site: 'B', coords: { x: 53, y: 76 }, aliases: ['b site', 'inner', 'default b'], commonNades: ['Z Smoke', 'Back Site Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-oil', name: 'Oil Train (B1)', site: 'B', coords: { x: 66, y: 76 }, aliases: ['oil', 'oil train', 'black'], commonNades: ['Oil Train Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'trn-headshot', name: 'Headshot / Back B', site: 'B', coords: { x: 63, y: 85 }, aliases: ['headshot', 'back b', 'heaven b'], commonNades: ['Back B Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'vert-a-ramp', name: 'A Ramp / Sandbags', site: 'A', coords: { x: 63, y: 76 }, floor: 'upper', aliases: ['a ramp', 'sandbags', 'scaffold'], commonNades: ['Left Side Smoke', 'Right Side Elevator Smoke', 'Sandbags Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-yellow', name: 'Yellow / Side', site: 'A', coords: { x: 56, y: 70 }, floor: 'upper', aliases: ['yellow', 'side', 'crane'], commonNades: ['Yellow Molotov', 'Side Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-a-site', name: 'A Site (Default)', site: 'A', coords: { x: 69, y: 60 }, floor: 'upper', aliases: ['a site', 'headshot', 'default a'], commonNades: ['Elevator Smoke', 'Heaven Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-heaven', name: 'A Heaven', site: 'A', coords: { x: 71, y: 52 }, floor: 'upper', aliases: ['heaven', 'catwalk'], commonNades: ['Heaven Smoke', 'Heaven Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-elevator', name: 'A Elevator', site: 'A', coords: { x: 58, y: 58 }, floor: 'upper', aliases: ['elevator', 'connector'], commonNades: ['Elevator Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-a-short', name: 'A Short / Catwalk', site: 'A', coords: { x: 73, y: 69 }, floor: 'upper', aliases: ['a short', 'catwalk', 'lane'], commonNades: ['Short Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-mid', name: 'Mid / Connector', site: 'Mid', coords: { x: 52, y: 48 }, floor: 'upper', aliases: ['mid', 'elevator mid'], commonNades: ['CT Mid Smoke', 'Generator Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-ct-mid', name: 'CT Mid / Boost', site: 'Mid', coords: { x: 40, y: 35 }, floor: 'upper', aliases: ['ct mid', 'boost', 'window'], commonNades: ['CT Mid Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 54, y: 24 }, floor: 'upper', aliases: ['ct', 'ct spawn'], commonNades: ['Mid Retake Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-b-stairs', name: 'B Stairs', site: 'B', coords: { x: 21, y: 45 }, floor: 'upper', aliases: ['b stairs'], commonNades: ['Generator Smoke', 'CT Spawn Smoke', 'Quad Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-b-site', name: 'B Site / Default', site: 'B', coords: { x: 23, y: 24 }, floor: 'upper', aliases: ['b site', 'default b', 'white box'], commonNades: ['Generator Left/Right Smokes'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-b-gen', name: 'B Generator / Quad', site: 'B', coords: { x: 30, y: 22 }, floor: 'upper', aliases: ['generator', 'gen', 'quad'], commonNades: ['Generator Smoke', 'Quad Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-b-back', name: 'B Back / Electric', site: 'B', coords: { x: 16, y: 22 }, floor: 'upper', aliases: ['electric', 'back b'], commonNades: ['Electric Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-t-spawn', name: 'T Spawn (50F Lower)', site: 'Spawn', coords: { x: 42, y: 74 }, floor: 'lower', aliases: ['t spawn', 'lower'], commonNades: ['A Ramp Early Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-t-mid-lower', name: 'T Mid (50F Lower)', site: 'Mid', coords: { x: 45, y: 54 }, floor: 'lower', aliases: ['t mid', 'lower mid'], commonNades: ['Mid Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-under-b', name: 'Under B / Ladder (50F)', site: 'B', coords: { x: 25, y: 62 }, floor: 'lower', aliases: ['under b', 'ladder room'], commonNades: ['B Stairs Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-b-lower-stairs', name: 'B Lower Stairs (50F)', site: 'B', coords: { x: 21, y: 44 }, floor: 'lower', aliases: ['b lower'], commonNades: ['B Execute Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'vert-a-lower-ramp', name: 'A Lower Ramp (50F)', site: 'A', coords: { x: 64, y: 74 }, floor: 'lower', aliases: ['lower ramp'], commonNades: ['A Ramp HE'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'ovp-t-spawn', name: 'T Spawn / Tracks', site: 'Spawn', coords: { x: 64, y: 92 }, aliases: ['spawn', 'tracks'], commonNades: ['Monster Smoke', 'Heaven Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 48, y: 17 }, aliases: ['ct', 'ct spawn'], commonNades: ['Bank Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-fountain', name: 'Fountain', site: 'Mid', coords: { x: 41, y: 72 }, aliases: ['fountain', 'park'], commonNades: ['Toilets Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-playground', name: 'Playground', site: 'A', coords: { x: 27, y: 71 }, aliases: ['playground', 'slide'], commonNades: ['A Long Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-a-long', name: 'A Long', site: 'A', coords: { x: 20, y: 46 }, aliases: ['long a', 'rock', 'park'], commonNades: ['Bank Smoke', 'Dumpster Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-party', name: 'Party / Balloons', site: 'Mid', coords: { x: 31, y: 48 }, aliases: ['party', 'balloons', 'picnic'], commonNades: ['Toilets Smoke', 'Divider Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-toilets', name: 'Toilets / Bathrooms', site: 'Mid', coords: { x: 43, y: 44 }, aliases: ['toilets', 'bathrooms', 'banana'], commonNades: ['Bank Smoke', 'Dumpster Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-connector', name: 'Connector', site: 'Mid', coords: { x: 54, y: 53 }, aliases: ['connector', 'stairs', 'squeaky'], commonNades: ['Connector Molotov', 'Connector Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-a-short', name: 'A Short', site: 'A', coords: { x: 33, y: 30 }, aliases: ['short a', 'stairs a'], commonNades: ['Dice Molotov', 'Truck Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-a-site', name: 'A Site (Dice / Truck)', site: 'A', coords: { x: 52, y: 20 }, aliases: ['a site', 'dice', 'truck', 'default a'], commonNades: ['Bank Smoke', 'Dumpster Smoke', 'Truck Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-bank', name: 'Bank', site: 'A', coords: { x: 45, y: 10 }, aliases: ['bank', 'back a'], commonNades: ['Bank Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-dumpster', name: 'Dumpster / Back A', site: 'A', coords: { x: 46, y: 14 }, aliases: ['dumpster', 'trash', 'stairs'], commonNades: ['Dumpster Smoke', 'Dumpster Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-canal', name: 'Canal / Sewers', site: 'B', coords: { x: 73, y: 62 }, aliases: ['canal', 'sewers', 'tunnels'], commonNades: ['Monster Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-short-b', name: 'Water / B Short', site: 'B', coords: { x: 60, y: 50 }, aliases: ['water', 'short b', 'sandbags'], commonNades: ['Pillar Molotov', 'B Site Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-construction', name: 'Construction / Sandbags', site: 'B', coords: { x: 62, y: 41 }, aliases: ['construction', 'sandbags', 'barrel'], commonNades: ['Construction HE', 'Heaven Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-monster', name: 'Monster', site: 'B', coords: { x: 82, y: 54 }, aliases: ['monster', 'tunnel', 'pipe'], commonNades: ['B Heaven Smoke', 'Bridge Smoke', 'Barrels Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-b-site', name: 'B Site (Pillar / Toxic)', site: 'B', coords: { x: 70, y: 33 }, aliases: ['b site', 'pillar', 'toxic', 'barrels'], commonNades: ['Heaven Smoke', 'Bridge Smoke', 'Toxic Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'ovp-heaven-b', name: 'B Heaven / Bridge', site: 'B', coords: { x: 60, y: 29 }, aliases: ['heaven b', 'bridge', 'graffiti', 'pit'], commonNades: ['Heaven Smoke', 'Heaven Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
    callouts: enrichCalloutList([
      { id: 'cbl-t-spawn', name: 'T Spawn', site: 'Spawn', coords: { x: 18, y: 24 }, aliases: ['spawn', 't yard'], commonNades: ['Mid Courtyard Smoke', 'B Halls Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-ct-spawn', name: 'CT Spawn', site: 'Spawn', coords: { x: 48, y: 82 }, aliases: ['ct', 'connector'], commonNades: ['A Retake Smoke', 'Chicken Coop Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-mid', name: 'Mid / Courtyard', site: 'Mid', coords: { x: 42, y: 48 }, aliases: ['mid', 'courtyard'], commonNades: ['Mid Connector Smoke', 'Drop Window Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-dragonlore', name: 'Dragonlore / Arch', site: 'Mid', coords: { x: 38, y: 38 }, aliases: ['dragonlore', 'arch', 'under'], commonNades: ['Courtyard Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-a-ramp', name: 'A Ramp / Connector', site: 'A', coords: { x: 37, y: 56 }, aliases: ['a ramp', 'a mid'], commonNades: ['A Ramp Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-a-balcony', name: 'A Balcony / Doors', site: 'A', coords: { x: 23, y: 44 }, aliases: ['balcony', 'a doors'], commonNades: ['A Long Doors Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-a-long', name: 'A Long', site: 'A', coords: { x: 24, y: 58 }, aliases: ['a long', 'long a'], commonNades: ['A Long Doors Smoke', 'A Site Statue Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-a-site', name: 'A Site (Statue / Truck)', site: 'A', coords: { x: 34, y: 74 }, aliases: ['a site', 'statue', 'truck', 'default a'], commonNades: ['CT A Smoke', 'Truck Molotov', 'Connector Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-a-pit', name: 'A Connector / Pit', site: 'A', coords: { x: 44, y: 78 }, aliases: ['a pit', 'ct ramp'], commonNades: ['Connector Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-rock', name: 'Rock / Danger', site: 'B', coords: { x: 74, y: 32 }, aliases: ['rock', 'danger', 'upper halls'], commonNades: ['B Halls Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-b-long', name: 'B Long / Halls', site: 'B', coords: { x: 72, y: 42 }, aliases: ['b long', 'b halls'], commonNades: ['B Plat Smoke', 'Fountain Smoke', 'B Halls Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-drop', name: 'Drop Room', site: 'B', coords: { x: 58, y: 54 }, aliases: ['drop', 'dropper', 'window'], commonNades: ['Drop Exit Smoke', 'Drop Molotov', 'B Connector Flash'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-b-con', name: 'B Connector', site: 'B', coords: { x: 60, y: 65 }, aliases: ['b connector', 'broken wall'], commonNades: ['Broken Wall Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-b-plat', name: 'B Plat', site: 'B', coords: { x: 78, y: 56 }, aliases: ['b plat', 'platform', 'rock'], commonNades: ['B Plat Molotov', 'Rock Smoke'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-b-site', name: 'B Site (Fountain / Broken Wall)', site: 'B', coords: { x: 68, y: 66 }, aliases: ['b site', 'fountain', 'statue b'], commonNades: ['Chicken Coop Smoke', 'Broken Wall Smoke', 'Rock Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] },
      { id: 'cbl-coop', name: 'Chicken Coop', site: 'B', coords: { x: 64, y: 76 }, aliases: ['coop', 'chicken', 'ct b'], commonNades: ['Chicken Coop Smoke', 'Coop Molotov'], sources: ['CS2Journal', 'CS2Flow', 'TotalCS', 'Scope.gg', 'Leetify'] }
    ]),
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
