import type { CS2UpdateItem } from '../types'

export type { CS2UpdateItem }

/**
 * Curated CS2 Official Patch Notes, Lineup-Breaking Geometry Changes,
 * and Community Leaks / Datamines (Gabe Follower, ThourCS, Aquarius).
 * Merged dynamically at runtime with live Valve Steam News via /api/cs2/updates.
 */
export const DEFAULT_CS2_UPDATES: CS2UpdateItem[] = [
  {
    id: 'leak-gf-cobble-winter-s2',
    title: 'Cobblestone (de_cbble) Winter / Source 2 Remake Strings & Props Spotted in CS2 Manifest',
    date: '2026-11-15',
    category: 'leak',
    source: 'Gabe Follower',
    sourceHandle: '@gabefollower',
    sourceUrl: 'https://x.com/gabefollower',
    summary:
      'Updated CS2 depot manifests and asset strings reference a modernized Source 2 winter pass of Cobblestone (de_cbble) with reworked Drop Room and B Plat geometry.',
    details: [
      'New material paths referencing cbble_winter_stone, courtyard snow overlays, and Source 2 PBR cobblestone shaders detected in recent branch diff.',
      'Entity prefabs show adjusted Drop Room skylight and B Plat pillar clip brushes compared to the legacy CS:GO build.',
      'Calibration remains aligned to Valve overview origin (-3840, 3072, scale 6.0) for pre-release radar scrim planning.'
    ],
    affectedMaps: ['cobblestone'],
    lineupImpact: 'high',
    tags: ['cobblestone', 'de_cbble', 'source2', 'leak', 'datamine', 'winter']
  },
  {
    id: 'valve-patch-train-inferno-geom',
    title: 'Counter-Strike 2 Release Notes — Train Active Duty Pool Update, Inferno Clipping & Subtick Grenade Consistency',
    date: '2026-11-12',
    category: 'patch_note',
    source: 'Valve Official',
    sourceHandle: '@CounterStrike',
    sourceUrl: 'https://store.steampowered.com/news/app/730',
    version: '1.40.6.2',
    summary:
      'Official Valve patch confirming Train (de_train) in the Active Duty 7-map Premier pool (replacing Vertigo, which moved to the Reserve Pool alongside Overpass), plus skybox collision updates on Inferno Banana and Train Popdog/A-site.',
    details: [
      'Active Duty 7-Map Pool officially features Mirage, Dust II, Inferno, Nuke, Ancient, Anubis, and Train (Vertigo moved to Reserve Pool).',
      'Adjusted Inferno Banana overhanging roof clip brushes to prevent unintended pixel-bounces on deep Coffins and CT smokes.',
      'Cleaned up Train A-site railcar roof geometry and Ivy archway trims affecting cross-map T-spawn smoke walls.',
      'Improved determinism of simultaneous +jump and -attack release events across variable framerates.'
    ],
    affectedMaps: ['train', 'vertigo', 'inferno'],
    lineupImpact: 'high',
    tags: ['valve', 'patch-notes', 'active-duty', 'subtick', 'train', 'vertigo', 'inferno', 'clipping']
  },
  {
    id: 'thour-subtick-jumpthrow-analysis',
    title: 'ThourCS Test: Subtick Jumpthrow Timing Window & Smoke Voxel Carve Behavior',
    date: '2026-11-10',
    category: 'lineup_impact',
    source: 'ThourCS',
    sourceHandle: '@ThourCS2',
    sourceUrl: 'https://x.com/ThourCS2',
    summary:
      'Frame-by-frame subtick testing reveals how manual jumpthrows vs. two-key binds behave over long throws on Mirage Window and Nuke Outside.',
    details: [
      'Release timing within a 200ms apex window preserves trajectory parity on standard jumpthrows, while W-jumpthrows remain sensitive to subtick press order.',
      'HE grenade detonation clears volumetric smoke voxels for ~0.85s, temporarily opening lower pixel-gaps in Mirage Mid Window and Dust2 Xbox smokes.',
      'Verify any pre-patch W-jumpthrow lineups from T-Spawn to Mirage Window before official matches.'
    ],
    affectedMaps: ['mirage', 'nuke', 'dust2'],
    lineupImpact: 'high',
    tags: ['thourcs', 'jumpthrow', 'subtick', 'smoke-voxels', 'he-carve']
  },
  {
    id: 'aquarius-map-pool-skybox-diff',
    title: 'Aquarius Datamine: Active Duty Map Pool Rotation Clues & Skybox Ceiling Edits',
    date: '2026-11-08',
    category: 'leak',
    source: 'Aquarius',
    sourceHandle: '@aquaismissing',
    sourceUrl: 'https://x.com/aquaismissing',
    summary:
      'Map compilation timestamps and localization keys point to Classic Competitive testing for Cache and Cobblestone alongside Reserve Pool skybox tweaks on Overpass and Vertigo.',
    details: [
      'Server staging playlists updated with Classic Competitive slots matching de_cache and de_cbble identifiers.',
      'Raised skybox ceiling clip on Anubis Canals (Active Duty) and Overpass Water (Reserve Pool) to eliminate high-arc flashbang ceiling hits.',
      'Vertigo (Reserve Pool after Train joined Active Duty) A-Ramp scaffolding collision simplified for cleaner Molotov bounce predictability.'
    ],
    affectedMaps: ['cobblestone', 'cache', 'anubis', 'overpass', 'vertigo'],
    lineupImpact: 'high',
    tags: ['aquarius', 'map-pool', 'skybox', 'cache', 'cobblestone', 'anubis']
  },
  {
    id: 'valve-patch-mirage-dust2-skybox',
    title: 'Counter-Strike 2 Update — Mirage Mid Window Ledge & Dust2 Short Skybox Fixes',
    date: '2026-11-03',
    category: 'lineup_impact',
    source: 'Valve Official',
    sourceHandle: '@CounterStrike',
    sourceUrl: 'https://store.steampowered.com/news/app/730',
    version: '1.40.5.8',
    summary:
      'Geometry pass smoothing Mirage Sniper Nest sill trim and Dust2 Catwalk roof ledges where pop-flashes and Window smokes previously snagged.',
    details: [
      'Mirage Mid Window inner sill normalized so deep bench-side instant smokes bloom cleanly without leaving a left-side one-way gap.',
      'Dust2 A-Short / Catwalk roof collision smoothed to standardize T-spawn and Xbox support flashes.',
      'Minor molotov spread tuning around Mirage Ticket Booth and Dust2 Goose boxes.'
    ],
    affectedMaps: ['mirage', 'dust2'],
    lineupImpact: 'medium',
    tags: ['valve', 'mirage', 'dust2', 'window-smoke', 'geometry']
  },
  {
    id: 'gf-vacnet-cache-train-strings',
    title: 'Gabe Follower: Cache & Train Localization Strings + VacNet 3.0 Telemetry Hooks',
    date: '2026-10-29',
    category: 'leak',
    source: 'Gabe Follower',
    sourceHandle: '@gabefollower',
    sourceUrl: 'https://x.com/gabefollower',
    summary:
      'Client binary strings uncover expanded VacNet 3.0 behavioral detection modules alongside updated callout localization tokens for Cache and Train.',
    details: [
      'New callout tokens for de_cache (Sun Room, Checkers, Forklift, Z Connector) found inside panorama resource dictionaries.',
      'VacNet 3.0 server flags track anomalous input automation and subtick null-bind patterns in Premier queues.',
      'Additional particle shader hooks for dynamic smoke interaction with incendiary fire light.'
    ],
    affectedMaps: ['cache', 'train'],
    lineupImpact: 'low',
    tags: ['gabefollower', 'cache', 'train', 'vacnet', 'localization']
  },
  {
    id: 'valve-patch-ancient-anubis-water',
    title: 'Counter-Strike 2 Patch — Ancient Temple & Anubis Canals Water Bounce Physics',
    date: '2026-10-22',
    category: 'patch_note',
    source: 'Valve Official',
    sourceHandle: '@CounterStrike',
    sourceUrl: 'https://store.steampowered.com/news/app/730',
    version: '1.40.4.1',
    summary:
      'Shallow water surface restitution and splash audio updated on Ancient B-Ramp and Anubis Canals, subtly altering low-angle HE and Molotov skips.',
    details: [
      'Molotovs thrown directly into deep Canals water now extinguish with clearer audio cues and reduced edge splash.',
      'Ancient B-Ramp water edge clip adjusted so Cave and Long B smokes no longer bounce unpredictably off curb bevels.',
      'Fixed minor visibility artifact through smoke edges near Ancient Donut doorway.'
    ],
    affectedMaps: ['ancient', 'anubis'],
    lineupImpact: 'medium',
    tags: ['valve', 'ancient', 'anubis', 'water-physics', 'molotov']
  },
  {
    id: 'thour-smoke-voxel-expansion',
    title: 'ThourCS Deep Dive: Smoke Voxel Volume Filling Around Nuke Vents & Overpass Monster',
    date: '2026-10-18',
    category: 'lineup_impact',
    source: 'ThourCS',
    sourceHandle: '@ThourCS2',
    sourceUrl: 'https://x.com/ThourCS2',
    summary:
      'Detailed voxel grid measurements demonstrate how CS2 smoke volumes expand downward through Nuke grates and seal Overpass Monster pipe.',
    details: [
      'Smokes landing on Nuke A-Site Hut roof bleed down ~96 units, partially obscuring Vent drop angles.',
      'Overpass Monster smokes thrown from Canal stairs expand into Water tunnel only when detonating slightly past the grate lip.',
      'Incendiary particle spread radius matches CS2 post-nerf duration (5.5s) with narrower doorway coverage.'
    ],
    affectedMaps: ['nuke', 'overpass'],
    lineupImpact: 'medium',
    tags: ['thourcs', 'smoke-voxels', 'nuke', 'overpass', 'mechanics']
  },
  {
    id: 'aquarius-nuke-glass-inferno-coffins',
    title: 'Aquarius: Nuke Skylight Glass Break & Inferno Coffins Clip Brush Audit',
    date: '2026-10-11',
    category: 'lineup_impact',
    source: 'Aquarius',
    sourceHandle: '@aquaismissing',
    sourceUrl: 'https://x.com/aquaismissing',
    summary:
      'Updated Hammer entity diffs show Nuke Lobby skylight glass panel adjustments and Inferno B-site Coffins/Spools player clip refinements.',
    details: [
      'Nuke A-Site skylight glass panes break consistently on first impact without deflecting light-arc molotovs.',
      'Inferno Coffins top trim clip flattened to make B-execute smokes from Banana logs easier to land deep.',
      'Updated radar overview metadata timestamps verified against official 1024x1024 PNG textures.'
    ],
    affectedMaps: ['nuke', 'inferno'],
    lineupImpact: 'medium',
    tags: ['aquarius', 'nuke', 'inferno', 'skylight', 'coffins']
  },
  {
    id: 'datamine-practice-replay-pip',
    title: 'Community Datamine: Dedicated Practice Trajectory PiP & Server Replay Cvars',
    date: '2026-10-04',
    category: 'leak',
    source: 'Community Datamine',
    sourceHandle: '@CS2Datamine',
    summary:
      'Server VPK inspection reveals extended sv_grenade_trajectory_prac_pipreview camera options and demo tick bookmarking hooks.',
    details: [
      'Practice camera PiP supports longer trail persistence (`sv_grenade_trajectory_prac_trailtime 10`) for multi-nade execute timing checks.',
      'Telemetry strings indicate future coach-slot grenade cam export compatibility in private practice servers.',
      'No impact on existing matchmade throw trajectories.'
    ],
    affectedMaps: ['mirage', 'dust2', 'inferno', 'nuke', 'ancient', 'anubis', 'train'],
    lineupImpact: 'none',
    tags: ['datamine', 'practice-mode', 'cvars', 'grenade-cam']
  }
]
