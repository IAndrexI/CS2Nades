import type { Strategy, Coordinates, TacticsElement } from '../types'
import { snapPointToMapBounds } from '../core/radar/mapBounds'

function pt(mapId: string, x: number, y: number, floor?: 'upper' | 'lower'): Coordinates {
  const snapped = snapPointToMapBounds(mapId, { x, y }, floor)
  return { x: snapped.x, y: snapped.y }
}

function makeDrawings(
  mapId: string,
  prefix: string,
  items: Array<{
    type: TacticsElement['type']
    color: string
    points: Array<[number, number]>
    text?: string
  }>
): TacticsElement[] {
  return items.map((item, idx) => ({
    id: `${prefix}-draw-${idx + 1}`,
    type: item.type,
    color: item.color,
    points: item.points.map(([x, y]) => pt(mapId, x, y)),
    text: item.text,
    strokeWidth: 3
  }))
}

export const DEFAULT_STRATS: Strategy[] = [
  // ============================================================================
  // 1. DUST II (de_dust2) — Active Duty (CS2Flow & Pro Meta)
  // ============================================================================
  {
    id: 'dust2-cs2flow-long-a-split',
    title: 'Dust II Long A 3-1-1 Split & Cross Smoke Execute',
    mapId: 'dust2',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'CS2Flow flagship Dust II A-Site execute. 3 players overwhelm Long Doors with Corner smoke and double high flashes while 1 player lurks Catwalk/Short and 1 holds Mid/Lower Tunnels cutoff.',
    tags: ['CS2Flow', 'Execute', 'Long A', 'Pro Meta', 'A Site'],
    isCustom: false,
    createdAt: '2026-02-01',
    tacticsDrawings: makeDrawings('dust2', 'd2-long-split', [
      { type: 'arrow', color: '#f59e0b', points: [[77, 64], [88, 50], [88, 28], [80, 16]] },
      { type: 'arrow', color: '#38bdf8', points: [[48, 43], [61, 40], [64, 26], [80, 16]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[88, 50]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[76, 27]] },
      { type: 'molotov_fire', color: '#f97316', points: [[89, 28]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Long Doors Take & Xbox Smoke (1:55 - 1:30)',
        description:
          'Throw instant Long Corner smoke and Xbox smoke off spawn. 3 players burst out Long Doors with two high pop-flashes over the roof while Short player takes Catwalk control.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Long First Contact)',
            instructions:
              'Take best Long spawn, hug right wall through Long Doors, swing Blue Container as flash #1 pops, and dive into Long Pit.',
            lineupIds: [],
            position: pt('dust2', 88, 50)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Long Flash & Trade)',
            instructions:
              'Bounce right-click flash over Long Doors roof, trade Entry around Blue Container, and molotov A Car.',
            lineupIds: [],
            position: pt('dust2', 77, 64)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'Player 3 (Long Pit AWPer)',
            instructions:
              'Hold Long Doors exit for early CT aggression, then post up at Pit lip to isolate A Site and Goose rifles.',
            lineupIds: [],
            position: pt('dust2', 90, 41)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Catwalk Split Caller)',
            instructions:
              'Smoke Xbox from T Spawn, walk up Catwalk quietly, and prep Short A flash + Goose molotov on Long Cross smoke bloom.',
            lineupIds: [],
            position: pt('dust2', 61, 40)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Lower Tunnels / Mid Cutoff)',
            instructions:
              'Hold Outside Long / Top Mid for flank, then pressure Mid Doors to freeze CT B-site rotators.',
            lineupIds: [],
            position: pt('dust2', 46, 73)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Cross Smoke, Pinch & Bomb Plant (1:30 - 0:55)',
        description:
          'Deploy Long Cross smoke, molotov Car and Goose simultaneously, and pinch A Site from Long Ramp and Short Stairs.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Long Ramp Entry)',
            instructions:
              'Clear A Car with molotov, cross behind Long Cross smoke, and clear Default and Ramp.',
            lineupIds: [],
            position: pt('dust2', 89, 28)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Carrier)',
            instructions:
              'Throw Long Cross smoke, follow Entry up Long Ramp, and plant bomb open for Long Pit and Catwalk.',
            lineupIds: [],
            position: pt('dust2', 80, 16)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'Player 3 (Pit Post-Plant Anchor)',
            instructions:
              'Lock down Long Pit angle watching CT Ramp cross and Short retake.',
            lineupIds: [],
            position: pt('dust2', 90, 41)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Short Stairs Crunch)',
            instructions:
              'Swing A Short Stairs simultaneously with Long scaling, molotov Goose, and trade onto A Plat.',
            lineupIds: [],
            position: pt('dust2', 64, 26)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (CT Spawn Lurk)',
            instructions:
              'Drop through Mid Doors to cut off CT rotators coming from B through CT Spawn.',
            lineupIds: [],
            position: pt('dust2', 47, 34)
          }
        ]
      }
    ]
  },
  {
    id: 'dust2-cs2flow-xbox-fast-cat',
    title: 'Dust II Xbox Smoke to Fast Catwalk / Short A Take',
    mapId: 'dust2',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'CS2Flow fast Short A overwhelm. Instant spawn Xbox smoke allows 4 players to scale Catwalk rapidly with a Lower Tunnels boost, smoking CT Spawn and A Site for a fast plant.',
    tags: ['CS2Flow', 'Short A', 'Catwalk', 'Fast Execute', 'A Site'],
    isCustom: false,
    createdAt: '2026-02-02',
    tacticsDrawings: makeDrawings('dust2', 'd2-fast-cat', [
      { type: 'arrow', color: '#f59e0b', points: [[46, 73], [48, 43], [61, 40], [64, 26], [80, 16]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[48, 43]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[76, 27]] },
      { type: 'flash_burst', color: '#fde047', points: [[64, 26]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Instant Xbox Smoke & Catwalk Flood (1:55 - 1:35)',
        description:
          'Spawn-throw Xbox smoke, flash over Mid Doors, and push 4 players onto Catwalk via Top Mid and Lower Tunnels.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Catwalk Point Entry)',
            instructions:
              'Boost over Xbox or run from Lower Tunnels onto Catwalk first, clearing close Short Stairs with a pop-flash.',
            lineupIds: [],
            position: pt('dust2', 61, 40)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Second Entry)',
            instructions:
              'Follow Point Entry tightly up Catwalk, ready to trade any aggressive CT holding Short Stairs.',
            lineupIds: [],
            position: pt('dust2', 48, 43)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Catwalk Utility)',
            instructions:
              'Throw instant Xbox smoke from T Spawn, then throw high right-click flash over Short brick wall.',
            lineupIds: [],
            position: pt('dust2', 46, 73)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (CT Cross Smoker)',
            instructions:
              'From Catwalk cubby, line up A Site / CT Cross smoke and Goose molotov.',
            lineupIds: [],
            position: pt('dust2', 36, 42)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Outside Long Fake)',
            instructions:
              'Throw Long Doors flash and jiggle Blue Container to hold the CT Long anchor in place.',
            lineupIds: [],
            position: pt('dust2', 65, 74)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Short A Burst & Goose Clearance (1:35 - 1:05)',
        description:
          'Smoke A Cross/Site, burn Goose and Car, and plant Default for Short and Catwalk post-plant control.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Site Entry)',
            instructions:
              'Swing out of Short Stairs behind flash, clear Goose and Default, and push toward Ramp edge.',
            lineupIds: [],
            position: pt('dust2', 80, 16)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Car Clearing & Plant)',
            instructions:
              'Molotov A Car from Short, then plant bomb safe for Catwalk.',
            lineupIds: [],
            position: pt('dust2', 76, 27)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (CT Spawn Watcher)',
            instructions:
              'Hold Short boost box watching CT Spawn and Elevator jump-ups.',
            lineupIds: [],
            position: pt('dust2', 64, 26)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Catwalk Anchor)',
            instructions:
              'Stay Catwalk stairs to prevent Mid-to-Cat flank and assist post-plant spam.',
            lineupIds: [],
            position: pt('dust2', 61, 40)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Long Doors Flank)',
            instructions:
              'Push through Long Doors late to backstab CTs rotating toward Car/Long Cross.',
            lineupIds: [],
            position: pt('dust2', 88, 50)
          }
        ]
      }
    ]
  },
  {
    id: 'dust2-cs2flow-mid-to-b-split',
    title: 'Dust II Mid-to-B Double Doors Split',
    mapId: 'dust2',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'CS2Flow classic Dust II Mid-to-B split. Combine Xbox control with a CT Spawn deep smoke, sending 3 players through Mid Doors while 2 burst out of Upper B Tunnels.',
    tags: ['CS2Flow', 'Split', 'Mid Control', 'B Site', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-02-03',
    tacticsDrawings: makeDrawings('dust2', 'd2-mid-b', [
      { type: 'arrow', color: '#f59e0b', points: [[48, 43], [47, 34], [27, 15], [20, 13]] },
      { type: 'arrow', color: '#38bdf8', points: [[18, 50], [26, 24], [20, 13]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[60, 22]] },
      { type: 'flash_burst', color: '#fde047', points: [[47, 34]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Lower Tunnels & Mid Doors Setup (1:55 - 1:25)',
        description:
          'Secure Lower Tunnels and Xbox, smoke Mid Doors and deep CT Spawn, while 2 players stage silently in Upper B Tunnels.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Lower Tunnels Caller)',
            instructions:
              'Take Lower Tunnels, smoke CT Spawn cross at Mid Doors, and coordinate the B Tunnels pop timing.',
            lineupIds: [],
            position: pt('dust2', 36, 42)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Mid Doors Entry)',
            instructions:
              'Stage at Xbox behind Mid Doors smoke, ready to swing left toward B Window and Doors.',
            lineupIds: [],
            position: pt('dust2', 48, 43)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Mid Flash Support)',
            instructions:
              'Throw double high flash over Mid Doors blinding B Window and Outside B Doors CTs.',
            lineupIds: [],
            position: pt('dust2', 46, 73)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (B Tunnels Entry)',
            instructions:
              'Wait in Upper B Tunnels; when Mid players breach Mid Doors, molotov B Car and swing Back Plat.',
            lineupIds: [],
            position: pt('dust2', 18, 50)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (B Tunnels Bomb & Trade)',
            instructions:
              'Flash over B Tunnels roof on exit and trade Tunnels Entry onto B Site.',
            lineupIds: [],
            position: pt('dust2', 26, 24)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: B Window + B Doors Pincer Breach (1:25 - 0:50)',
        description:
          'Mid group clears B Window and Doors from outside while Tunnels group clears Car and Back Plat.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (CT Spawn Cutoff)',
            instructions:
              'Hold Mid-to-CT smoke edge so A-Site CTs cannot rotate through CT Spawn.',
            lineupIds: [],
            position: pt('dust2', 47, 34)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Window Breacher)',
            instructions:
              'Climb B Window or push B Doors to sandwich the anchor behind Big Box.',
            lineupIds: [],
            position: pt('dust2', 27, 15)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (B Doors Anchor)',
            instructions:
              'Take Outside B Doors control and hold retake utility.',
            lineupIds: [],
            position: pt('dust2', 26, 24)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Car & Closet Clear)',
            instructions:
              'Clear B Car and Closet, then hold Tunnels flank in post-plant.',
            lineupIds: [],
            position: pt('dust2', 11, 25)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Bomb Planter)',
            instructions:
              'Plant bomb on B Site open for B Doors and Window crossfire.',
            lineupIds: [],
            position: pt('dust2', 20, 13)
          }
        ]
      }
    ]
  },
  {
    id: 'dust2-ct-212-long-contest',
    title: 'Dust II 2-1-2 Default & Long Corner Early Contest',
    mapId: 'dust2',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Default',
    summary:
      'Tier-1 Pro Meta CT setup on Dust II. 2 players fight for early Long A corner with double incendiary + HE stack, 1 AWPer locks Mid Doors, and 1 player anchors B while 1 flexes Short/CT.',
    tags: ['Pro Meta', 'CT Default', 'Long Control', 'CS2Journal'],
    isCustom: false,
    createdAt: '2026-02-04',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Early Long Doors Incendiary & Flash Fight (1:55 - 1:35)',
        description:
          'Closest Long spawns throw Long Doors incendiary + deep HE while high flash lets CT corner player lock Blue Container.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (Long Corner Fighter)',
            instructions:
              'Run with best Long spawn, molotov Long Doors immediately, and post on Blue Container behind teammate flash.',
            lineupIds: [],
            position: pt('dust2', 88, 50)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Long Pit / Flash Support)',
            instructions:
              'Throw high Long flash off Car wall at 1:49, drop corner smoke if pressured, and anchor Long Pit.',
            lineupIds: [],
            position: pt('dust2', 90, 41)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Mid Doors / Short Rotator)',
            instructions:
              'Spot Mid cross, hold Lower Tunnels to Xbox with AWP, then shift to A Short Stairs.',
            lineupIds: [],
            position: pt('dust2', 64, 26)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (Mid Doors / B Window Flex)',
            instructions:
              'Jiggle Mid Doors for Xbox presence and assist either Catwalk or B Doors.',
            lineupIds: [],
            position: pt('dust2', 47, 34)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Site Anchor)',
            instructions:
              'Molotov Upper B Tunnels at 1:50, hold from Back Plat / Big Box with smoke saved for re-smoke.',
            lineupIds: [],
            position: pt('dust2', 20, 13)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Mid-Round 1-1-2-1 Crossfire Lock (1:35 - 0:40)',
        description:
          'Once Long A is secured, one CT rotates back to A Site/Short leaving a solo Pit anchor with AWP coverage.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (Long Pit Solo Anchor)',
            instructions:
              'Stay tucked in Long Pit; play for multi-frag or info if T side re-hits Long.',
            lineupIds: [],
            position: pt('dust2', 90, 41)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (A Site / Goose Anchor)',
            instructions:
              'Rotate to A Site plat to crossfire Short A with the AWPer.',
            lineupIds: [],
            position: pt('dust2', 80, 16)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (CT Ramp / Short AWP)',
            instructions:
              'Hold Catwalk angle from A Ramp / Car with quick fallback to CT Spawn.',
            lineupIds: [],
            position: pt('dust2', 76, 27)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (CT Mid / B Doors Rotator)',
            instructions:
              'Anchor Mid Doors to prevent silent Mid-to-B splits.',
            lineupIds: [],
            position: pt('dust2', 60, 22)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Closet / Car Anchor)',
            instructions:
              'Shift to B Car or Window depending on Mid utility usage.',
            lineupIds: [],
            position: pt('dust2', 27, 15)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 2. MIRAGE (de_mirage) — Active Duty
  // ============================================================================
  {
    id: 'mirage-a-full-execute',
    title: 'Mirage A Site 3-Smoke Full Execute',
    mapId: 'mirage',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'Standard Tier-1 competitive A execute. Combines Stairs, Jungle/Connector, and Ticket Booth smokes with synchronized A-Ramp and Palace pop-flashes.',
    tags: ['Pro Meta', 'Execute', 'Standard', 'A Site', 'CS2Flow'],
    isCustom: false,
    createdAt: '2026-01-15',
    tacticsDrawings: makeDrawings('mirage', 'mir-a-exec', [
      { type: 'arrow', color: '#f59e0b', points: [[73, 65], [64, 65], [56, 76]] },
      { type: 'arrow', color: '#38bdf8', points: [[74, 77], [56, 76]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[56, 63]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[47, 61]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[45, 78]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Setup & Palace Control (1:55 - 1:25)',
        description:
          'Take Palace presence quietly without giving away the execute. 3 players stack A Ramp utility lineups.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (IGL - Stairs Smoke)',
            instructions: 'Call lineup countdown and throw Stairs smoke at 1:35.',
            lineupIds: ['mirage-smoke-stairs-tspawn'],
            position: pt('mirage', 73, 65)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Jungle / Con Smoke)',
            instructions: 'Line up Jungle & Connector deep smoke and throw simultaneously with IGL.',
            lineupIds: ['mirage-smoke-jungle-connector'],
            position: pt('mirage', 75, 62)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Ticket Smoke & Flash)',
            instructions: 'Throw CT Ticket Booth smoke and double pop-flash over A Ramp on execute call.',
            lineupIds: ['mirage-smoke-ct-ticket', 'mirage-flash-a-high-pop'],
            position: pt('mirage', 78, 58)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (A Ramp Point Entry)',
            instructions: 'Hold close A Ramp, molotov Under Palace, and scale Tetris on flash pop.',
            lineupIds: ['mirage-molotov-under-palace'],
            position: pt('mirage', 64, 65)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Palace Anchor)',
            instructions: 'Clear deep Palace pillars, molotov Under Balcony, and swing out on smoke bloom.',
            lineupIds: [],
            position: pt('mirage', 74, 77)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Site Breach & Bomb Plant (1:25 - 0:50)',
        description:
          'Entry fragger clears Tetris and Triple while Palace wraps Default for a safe plant.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Tetris Hold)',
            instructions: 'Take Tetris and watch Stairs / Jungle smoke pushes.',
            lineupIds: [],
            position: pt('mirage', 64, 65)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Connector Cutoff)',
            instructions: 'Push up to Sandwich/Stairs gap and deny Connector flashes.',
            lineupIds: [],
            position: pt('mirage', 56, 63)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Bomb Planter)',
            instructions: 'Plant bomb Default or for Triple depending on Ticket control.',
            lineupIds: [],
            position: pt('mirage', 56, 76)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Triple & CT Clear)',
            instructions: 'Clear Triple/Firebox and hold Ticket smoke perimeter.',
            lineupIds: [],
            position: pt('mirage', 53, 70)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Palace Post-Plant)',
            instructions: 'Hold post-plant crossfire from Palace Balcony.',
            lineupIds: [],
            position: pt('mirage', 74, 77)
          }
        ]
      }
    ]
  },
  {
    id: 'mirage-fast-mid-split',
    title: 'Mirage Instant Window Smoke & Fast Mid-to-B Split',
    mapId: 'mirage',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'Mid',
    summary:
      'CS2Flow Mirage Mid control playbook. Instant T-Spawn window smoke + Connector smoke allows 3 players to rush Catwalk into B Short while 2 pressure B Apartments.',
    tags: ['CS2Flow', 'Mid Control', 'Split', 'Fast Execute', 'B Site'],
    isCustom: false,
    createdAt: '2026-01-16',
    tacticsDrawings: makeDrawings('mirage', 'mir-mid-b', [
      { type: 'arrow', color: '#f59e0b', points: [[69, 43], [56, 47], [50, 39], [36, 29], [23, 28]] },
      { type: 'arrow', color: '#38bdf8', points: [[35, 18], [23, 28]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[39, 47]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[50, 54]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Instant Window Smoke & Catwalk Sprint (1:55 - 1:30)',
        description:
          'Instant Window smoke from spawn, Top Mid connector smoke, and 3-player Catwalk push.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'Player 1 (Spawn Window Smoker)',
            instructions: 'Throw instant Window smoke off spawn, then hold Top Mid / Connector cross.',
            lineupIds: ['mirage-smoke-window-tspawn'],
            position: pt('mirage', 69, 43)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Catwalk Point Entry)',
            instructions: 'Sprint Mid Boxes to Catwalk, clear Ladder Room, and molotov B Short.',
            lineupIds: [],
            position: pt('mirage', 50, 39)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Connector Smoker)',
            instructions: 'Smoke Connector from Top Mid, follow Entry up Catwalk, and smoke Market Window.',
            lineupIds: ['mirage-smoke-b-market-door'],
            position: pt('mirage', 56, 47)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (B Apartments Entry)',
            instructions: 'Stage in B Apartments kitchen, molotov B Van when Catwalk players reach Arches.',
            lineupIds: ['mirage-molotov-b-van'],
            position: pt('mirage', 35, 18)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Underpass Control)',
            instructions: 'Drop Underpass to deny Ladder jump-down and pinch Connector/Window.',
            lineupIds: [],
            position: pt('mirage', 44, 48)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: B Short + Apartments Pincer (1:30 - 0:55)',
        description:
          'Collapse onto B Site simultaneously from B Short Arches and Apartments Balcony.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'Player 1 (Catwalk Cutoff)',
            instructions: 'Hold Mid Window and Connector pushes from Catwalk.',
            lineupIds: [],
            position: pt('mirage', 50, 39)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Short Arches Entry)',
            instructions: 'Clear Get_Right pillar and Bench, trading with B Apartments entry.',
            lineupIds: [],
            position: pt('mirage', 36, 29)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Bomb Planter)',
            instructions: 'Drop onto B Site and plant Default for Short and Apps.',
            lineupIds: [],
            position: pt('mirage', 23, 28)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Balcony Entry)',
            instructions: 'Jump out Balcony to clear Van and Market Door.',
            lineupIds: [],
            position: pt('mirage', 18, 21)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Market Door Watcher)',
            instructions: 'Lock down Market Door / Window against CT retake.',
            lineupIds: [],
            position: pt('mirage', 28, 38)
          }
        ]
      }
    ]
  },
  {
    id: 'mirage-ct-131-mid-pinch',
    title: 'Mirage 1-3-1 Mid Connector & Underpass Pinch',
    mapId: 'mirage',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Mid',
    summary:
      'Pro Meta CT 1-3-1 Mid dominance setup. Window AWPer, Connector rifler, and Short/Ladder rifler coordinate an early Underpass + Mid Boxes pinch.',
    tags: ['Pro Meta', 'Mid Control', 'CT Aggression', 'Pracc.com'],
    isCustom: false,
    createdAt: '2026-01-20',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: 1-3-1 Mid Presence & Window Molly Counter (1:55 - 1:30)',
        description:
          'Extinguish or counter Window smoke while Ladder Room player drops Underpass and Connector player flashes Mid.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'CT 1 (Window AWPer)',
            instructions: 'Post Top Mid from Sniper Nest; if Window is smoked, jump out to Catwalk behind Ladder flash.',
            lineupIds: [],
            position: pt('mirage', 39, 47)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Connector Rifler)',
            instructions: 'Smoke Bottom Connector or molotov Top Mid boxes, ready to swing Chair.',
            lineupIds: [],
            position: pt('mirage', 50, 54)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'CT 3 (Short / Ladder Aggressor)',
            instructions: 'Take Ladder Room early and clear Underpass with an HE + flash combo.',
            lineupIds: [],
            position: pt('mirage', 44, 48)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (A Anchor - Ticket / CT)',
            instructions: 'Anchor A Ramp passive from Ticket/Triple with A-Ramp smoke ready.',
            lineupIds: [],
            position: pt('mirage', 56, 76)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Anchor - Van / Site)',
            instructions: 'Deep molotov B Apartments at 1:48 and hold from Van/Bench.',
            lineupIds: [],
            position: pt('mirage', 23, 28)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Mid Boxes Lockdown & Late Rotation (1:30 - 0:45)',
        description:
          'With Mid Boxes and Underpass clear, CT side collapses back into a 2-1-2 information lock.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'CT 1 (Jungle / Window AWP)',
            instructions: 'Hold Top Mid or rotate Jungle to cover Palace.',
            lineupIds: [],
            position: pt('mirage', 47, 61)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Stairs / Connector)',
            instructions: 'Hold A Stairs and assist A Anchor against Ramp hits.',
            lineupIds: [],
            position: pt('mirage', 56, 63)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'CT 3 (B Short / Catwalk)',
            instructions: 'Hold Catwalk from B Short Arches.',
            lineupIds: [],
            position: pt('mirage', 36, 29)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (Ticket Booth)',
            instructions: 'Lock down A Site from Ticket.',
            lineupIds: [],
            position: pt('mirage', 45, 78)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Apartments Anchor)',
            instructions: 'Hold B Apps from Default/Van.',
            lineupIds: [],
            position: pt('mirage', 18, 21)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 3. INFERNO (de_inferno) — Active Duty
  // ============================================================================
  {
    id: 'inferno-b-banana-execute',
    title: 'Inferno B Site Banana Control & Coffins/CT Execute',
    mapId: 'inferno',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'CS2Flow Inferno B-Site playbook. Clear Banana with Car/Sandbags molotovs, establish Half-Wall control, then drop Coffins + CT cross smokes with New Box & Dark molotovs.',
    tags: ['CS2Flow', 'Banana', 'B Site', 'Execute', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-01-17',
    tacticsDrawings: makeDrawings('inferno', 'inf-b-exec', [
      { type: 'arrow', color: '#f59e0b', points: [[43, 54], [44, 44], [49, 35], [49, 22]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[49, 12]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[58, 24]] },
      { type: 'molotov_fire', color: '#f97316', points: [[49, 22]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Banana Take & Car Clearance (1:55 - 1:25)',
        description:
          'Wait out early CT Banana HE stack, throw Half-Wall to Car molotov + pop-flash, and secure Top Banana.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Banana Point Entry)',
            instructions: 'Take Logs early, swing Car behind Sandbags molotov and God flash.',
            lineupIds: [],
            position: pt('inferno', 49, 35)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Coffins Smoke & Car Molly)',
            instructions: 'Throw Car molotov from Bottom Banana, then line up Coffins smoke at Logs.',
            lineupIds: ['inferno-molotov-car-sandbags', 'inferno-smoke-coffins'],
            position: pt('inferno', 44, 44)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (CT Smoke & Pop-Flashes)',
            instructions: 'Line up CT Boost/Arch smoke and throw two high Church roof flashes on go call.',
            lineupIds: ['inferno-smoke-ct-banana'],
            position: pt('inferno', 43, 54)
          },
          {
            slot: 4,
            role: 'Support',
            playerName: 'Player 4 (New Box & Dark Molotovs)',
            instructions: 'From Half-Wall, prep New Box and Dark/Quad molotovs.',
            lineupIds: [],
            position: pt('inferno', 44, 44)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Top Mid / Boiler Lurk)',
            instructions: 'Hold Top Mid / Second Mid to freeze A-Site CTs and cut off Arch rotations.',
            lineupIds: [],
            position: pt('inferno', 57, 69)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Site Flood & Post-Plant Banana Lock (1:25 - 0:50)',
        description:
          'Entry pair clears First/Second Oranges and Fountain while bomb is planted for Banana.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Oranges & Fountain Clear)',
            instructions: 'Push past Pillar, clear First/Second Oranges, and tuck Coffins edge.',
            lineupIds: [],
            position: pt('inferno', 49, 12)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb front B Site exposed to Banana.',
            lineupIds: [],
            position: pt('inferno', 49, 22)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (CT Smoke Holder)',
            instructions: 'Hold CT Arch / Church retake smoke from Car.',
            lineupIds: [],
            position: pt('inferno', 49, 35)
          },
          {
            slot: 4,
            role: 'Support',
            playerName: 'Player 4 (Church Re-Smoke)',
            instructions: 'Save late smoke to re-smoke CT or Church at 0:25 post-plant.',
            lineupIds: [],
            position: pt('inferno', 58, 24)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Arch / CT Spawn Cutoff)',
            instructions: 'Creep up Arch to catch CTs rotating with knives out toward Church.',
            lineupIds: [],
            position: pt('inferno', 74, 45)
          }
        ]
      }
    ]
  },
  {
    id: 'inferno-a-apps-arch-wrap',
    title: 'Inferno A Site Apartments + Arch Wrap Split',
    mapId: 'inferno',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'CS2Flow coordinated A-Site split. Smoke Long Corner, Moto, and Pit/Library while 2 players pop out of Balcony/Apartments and 3 wrap Short & Arch.',
    tags: ['CS2Flow', 'Split', 'A Site', 'Arch Control', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-01-19',
    tacticsDrawings: makeDrawings('inferno', 'inf-a-split', [
      { type: 'arrow', color: '#f59e0b', points: [[57, 69], [70, 73], [81, 70]] },
      { type: 'arrow', color: '#38bdf8', points: [[71, 83], [81, 70]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[81, 70]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[89, 53]] },
      { type: 'molotov_fire', color: '#f97316', points: [[91, 78]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Apartments & Boiler Control (1:55 - 1:25)',
        description:
          'Clear T Apartments through Long Hall/Balcony room while Mid players smoke Moto and Library.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Balcony Entry)',
            instructions: 'Take A Apartments control, molotov Big Pit from Balcony window, and jump to Pit roof.',
            lineupIds: [],
            position: pt('inferno', 71, 83)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Apps Flash & Trade)',
            instructions: 'Pop-flash Balcony exit and trade Balcony Entry onto Pit / Graveyard.',
            lineupIds: [],
            position: pt('inferno', 35, 77)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Short / Quad Entry)',
            instructions: 'Scale Top Mid past Boiler to A Short/Truck as Balcony jumps out.',
            lineupIds: [],
            position: pt('inferno', 70, 73)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Moto & Library Smokes)',
            instructions: 'From Second Mid / Haystack, throw Moto smoke and Library smoke.',
            lineupIds: [],
            position: pt('inferno', 57, 69)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Arch Wrap Lurker)',
            instructions: 'Push up Long A toward Arch side to cut off CT rotations from B.',
            lineupIds: [],
            position: pt('inferno', 74, 45)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Pit + Short Pincer & Default Plant (1:25 - 0:50)',
        description:
          'Crush Pit and Site simultaneously from Balcony and Short Lane, planting open for Pit and Apartments.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Big Pit Anchor)',
            instructions: 'Secure Big Pit and Graveyard, locking down post-plant crossfire.',
            lineupIds: [],
            position: pt('inferno', 91, 78)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant A Site Default open for Pit and Short.',
            lineupIds: [],
            position: pt('inferno', 81, 70)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Site / Moto Hold)',
            instructions: 'Watch Moto and Library smoke pushes.',
            lineupIds: [],
            position: pt('inferno', 70, 73)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Boiler / Short Watcher)',
            instructions: 'Hold Boiler and Short flank against late Mid push.',
            lineupIds: [],
            position: pt('inferno', 57, 69)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Library Cutoff)',
            instructions: 'Hold Arch/Library hallway against B rotators.',
            lineupIds: [],
            position: pt('inferno', 89, 53)
          }
        ]
      }
    ]
  },
  {
    id: 'inferno-ct-deep-banana-stack',
    title: 'Inferno Deep Banana Double Utility Stack & Late B Hold',
    mapId: 'inferno',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'Pro Meta CT Banana denial. Double deep HE + Bottom Banana incendiary at 1:50 strips T health and utility, followed by a disciplined Coffins/Spools crossfire.',
    tags: ['Pro Meta', 'Banana Denial', 'CT Setup', 'Refrag.gg'],
    isCustom: false,
    createdAt: '2026-01-22',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Deep HE + Molly Stack & Early Half-Wall Info (1:55 - 1:30)',
        description:
          '2 B players throw synchronized deep Banana HEs and Bottom Banana smoke/molotov, then fall back to Sandbags/Site.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'CT 1 (B Anchor - Coffins / Oranges)',
            instructions: 'Throw deep Logs HE + Bottom Banana molotov, then drop smoke at Top Banana at 1:25.',
            lineupIds: [],
            position: pt('inferno', 49, 22)
          },
          {
            slot: 2,
            role: 'IGL',
            playerName: 'CT 2 (B Rotator - CT / Spools)',
            instructions: 'Pair deep HE with CT 1, hold pop-flash behind Half-Wall, then fall to CT Arch with re-smoke.',
            lineupIds: [],
            position: pt('inferno', 58, 24)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Arch / Top Mid AWPer)',
            instructions: 'Hold Top Mid from Arch side; rotate to CT B if T side takes Car control.',
            lineupIds: [],
            position: pt('inferno', 74, 45)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'CT 4 (Short / Boiler Rifler)',
            instructions: 'Contest A Apartments / Boiler early, then hold Short A crossfire.',
            lineupIds: [],
            position: pt('inferno', 70, 73)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (Big Pit Anchor)',
            instructions: 'Anchor Big Pit watching Balcony and Short Lane.',
            lineupIds: [],
            position: pt('inferno', 91, 78)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Late Round B Crossfire & Retake Prep (1:30 - 0:35)',
        description:
          'Chain Top Banana smokes down to 0:35 while Arch AWPer posts on CT Spawn / Church.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'CT 1 (First Oranges / New Box)',
            instructions: 'Play crossfire with Coffins; use incendiary on Pillar at 0:40.',
            lineupIds: [],
            position: pt('inferno', 49, 22)
          },
          {
            slot: 2,
            role: 'IGL',
            playerName: 'CT 2 (Coffins Anchor)',
            instructions: 'Hold from Coffins with counter-flash ready for CT 1 contact.',
            lineupIds: [],
            position: pt('inferno', 49, 12)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (CT Arch / Well)',
            instructions: 'Post on CT Arch or Library to support either site instantly.',
            lineupIds: [],
            position: pt('inferno', 89, 35)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'CT 4 (A Site Moto)',
            instructions: 'Hold A Site Default and Moto.',
            lineupIds: [],
            position: pt('inferno', 81, 70)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (Pit Anchor)',
            instructions: 'Maintain unbreakable Big Pit anchor.',
            lineupIds: [],
            position: pt('inferno', 91, 78)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 4. NUKE (de_nuke) — Active Duty
  // ============================================================================
  {
    id: 'nuke-outside-secret-wall',
    title: 'Nuke Outside 3-Smoke Secret Wall & Lower B Rush',
    mapId: 'nuke',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'CS2Flow Nuke signature play. Deploy the 3-smoke Outside wall (Garage + Secret Cross 1 & 2) from T Spawn/Roof to blind Garage and Mini, flooding Secret into Lower B.',
    tags: ['CS2Flow', 'Outside Wall', 'Secret Split', 'Pro Meta', 'B Site'],
    isCustom: false,
    createdAt: '2026-01-18',
    tacticsDrawings: makeDrawings('nuke', 'nuke-secret-wall', [
      { type: 'arrow', color: '#f59e0b', points: [[20, 54], [56, 72], [69, 69], [64, 64], [57, 54]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[74, 66]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[64, 66]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[59, 65]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Outside 3-Smoke Wall & Secret Sprint (1:55 - 1:30)',
        description:
          'All three Outside wall smokes bloom together at 1:42; 4 players sprint behind Red Box down Secret stairs.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'Player 1 (Garage Wall Smoker)',
            instructions: 'Throw Garage Cross Smoke #1 from T Spawn truck, then follow down Secret.',
            lineupIds: ['nuke-smoke-outside-garage'],
            position: pt('nuke', 20, 54)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Secret Wall Smoker)',
            instructions: 'Throw Secret Cross Smokes #2 & #3 from T Roof/Spawn, then drop Outside.',
            lineupIds: ['nuke-smoke-outside-secret'],
            position: pt('nuke', 43, 56)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Secret First Entry)',
            instructions: 'Sprint past Red Box as smoke wall blooms, clear Secret stairs, and breach Decon.',
            lineupIds: [],
            position: pt('nuke', 56, 72)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Secret Trade & Vents)',
            instructions: 'Follow First Entry down Secret, clear Single Door and Vents.',
            lineupIds: [],
            position: pt('nuke', 69, 69)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Lobby / Squeaky Fake)',
            instructions: 'Break Squeaky door and molotov Hut roof to freeze Upper A CTs.',
            lineupIds: ['nuke-smoke-heaven'],
            position: pt('nuke', 47, 52)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Decon + Single Door B Breach (1:30 - 0:55)',
        description:
          'Split Lower B through Decon Double Doors and Single Door, molotoving Dark and smoking B Ramp.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'Player 1 (B Ramp Smoker)',
            instructions: 'Smoke Bottom B Ramp from Decon hallway and hold Ramp push.',
            lineupIds: [],
            position: pt('nuke', 57, 38)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb Default B safe from Ramp and Vents.',
            lineupIds: [],
            position: pt('nuke', 57, 54)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Dark & Window Clear)',
            instructions: 'Molotov Dark corner and secure Observation Window.',
            lineupIds: [],
            position: pt('nuke', 63, 49)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Vents Control)',
            instructions: 'Lock down B Vents and Control Room against Upper drop-downs.',
            lineupIds: [],
            position: pt('nuke', 51, 62)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Secret Backstab Anchor)',
            instructions: 'Hold Secret Lower hallway for CTs flanking from Outside.',
            lineupIds: [],
            position: pt('nuke', 64, 64)
          }
        ]
      }
    ]
  },
  {
    id: 'nuke-fast-a-roof-hut-burst',
    title: 'Nuke Fast A Roof Skylight & Hut Burst',
    mapId: 'nuke',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'Explosive Upper A execute. Roof support player shatters Skylight to smoke Heaven and molotov Top Hut while 4 players burst out of Hut and Squeaky simultaneously.',
    tags: ['Pro Meta', 'Fast Execute', 'A Site', 'Skylight'],
    isCustom: false,
    createdAt: '2026-01-24',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Skylight Heaven Smoke & Top Hut Molly (1:55 - 1:35)',
        description:
          'Roof utility player throws Heaven smoke and Mustache/Top Hut molotov through Skylight while Lobby team stages at Hut and Squeaky.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'Player 1 (Roof Skylight Utility)',
            instructions: 'Climb T Roof ladder, throw Heaven smoke + Top Hut molotov + A Site flash through Skylight.',
            lineupIds: [],
            position: pt('nuke', 43, 56)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Squeaky Entry)',
            instructions: 'Open Squeaky door on Skylight flash pop, smoke Mini/Main, and dive Vents/Back Site.',
            lineupIds: [],
            position: pt('nuke', 51, 46)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Hut Point Entry)',
            instructions: 'Swing out of Hut window/door to clear Tetris and Rafters.',
            lineupIds: [],
            position: pt('nuke', 47, 52)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Hut Trade & Bomb)',
            instructions: 'Follow Hut Entry with bomb and plant Default behind silos.',
            lineupIds: [],
            position: pt('nuke', 58, 50)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Ramp Room Cutoff)',
            instructions: 'Hold Trophy/Radio hallway to prevent Ramp CT flank into Lobby.',
            lineupIds: [],
            position: pt('nuke', 57, 36)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: A Site Plant & Heaven/Mini Lockdown (1:35 - 1:00)',
        description:
          'Plant between silos and lock down Heaven, Mini, and Vents for post-plant.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'Player 1 (Skylight Overwatch)',
            instructions: 'Stay on T Roof Skylight looking down onto Heaven and Site defuse.',
            lineupIds: [],
            position: pt('nuke', 43, 56)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Mini / Main Holder)',
            instructions: 'Hold A Main / Mini door smoke push.',
            lineupIds: [],
            position: pt('nuke', 59, 59)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Heaven / Rafters Watcher)',
            instructions: 'Tuck below Heaven rafters to catch CTs dropping out of Heaven smoke.',
            lineupIds: [],
            position: pt('nuke', 63, 50)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Hut Post-Plant)',
            instructions: 'Play inside Hut watching bomb cross.',
            lineupIds: [],
            position: pt('nuke', 58, 50)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Squeaky / Vent Anchor)',
            instructions: 'Guard Vents and Squeaky door.',
            lineupIds: [],
            position: pt('nuke', 51, 46)
          }
        ]
      }
    ]
  },
  {
    id: 'nuke-ct-ramp-outside-info',
    title: 'Nuke Ramp + Outside Aggressive Info Default',
    mapId: 'nuke',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Default',
    summary:
      'Pro Meta CT Nuke setup: 2 Ramp players contest Trophy early with an incendiary while Garage AWPer + Mini rifler deny free Outside Secret crosses.',
    tags: ['Pro Meta', 'CT Default', 'Outside Control'],
    isCustom: false,
    createdAt: '2026-01-25',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Trophy Molly & Outside Garage AWP Post (1:55 - 1:30)',
        description:
          'Deny early Lobby and Outside control while keeping instant Vent rotation available.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'CT 1 (Garage AWPer)',
            instructions: 'Post at Garage blue box watching Red Box and Secret cross.',
            lineupIds: [],
            position: pt('nuke', 74, 66)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Mini / Outside Rotator)',
            instructions: 'Play A Main / Mini to counter-molly Secret stairs if Outside wall is thrown.',
            lineupIds: [],
            position: pt('nuke', 59, 59)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'CT 3 (Heaven / A Anchor)',
            instructions: 'Throw Hut incendiary at 1:48 and anchor Upper A from Heaven/Rafters.',
            lineupIds: [],
            position: pt('nuke', 63, 50)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'CT 4 (Ramp Forward)',
            instructions: 'Molotov Trophy doorway and play Headshot Box crossfire.',
            lineupIds: [],
            position: pt('nuke', 57, 36)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (Ramp / B Drop Flex)',
            instructions: 'Support Ramp Forward; drop down B Ramp immediately if Outside smoke wall lands.',
            lineupIds: [],
            position: pt('nuke', 57, 38)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Secret Rotation & Lower B Defense (1:30 - 0:45)',
        description:
          'When T side smokes Outside, CT 2 and CT 5 rotate to Decon and B Ramp to lock down Lower B.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'CT 1 (Hell / Outside AWP)',
            instructions: 'Fall back to Hell/Locker watching Outside and Heaven.',
            lineupIds: [],
            position: pt('nuke', 69, 55)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Decon / Vents Rotator)',
            instructions: 'Drop Vents to hold Decon Double Doors.',
            lineupIds: [],
            position: pt('nuke', 64, 64)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'CT 3 (A Site Anchor)',
            instructions: 'Hold A Site solo until bomb is spotted Lower.',
            lineupIds: [],
            position: pt('nuke', 58, 50)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'CT 4 (Upper Ramp Anchor)',
            instructions: 'Keep Upper Ramp locked.',
            lineupIds: [],
            position: pt('nuke', 57, 36)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (Lower B Site / Dark)',
            instructions: 'Anchor Lower B Site watching Single Door and Decon.',
            lineupIds: [],
            position: pt('nuke', 57, 54)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 5. ANCIENT (de_ancient) — Active Duty
  // ============================================================================
  {
    id: 'ancient-red-room-donut-a-split',
    title: 'Ancient Instant Red Room + Donut Mid-to-A Split',
    mapId: 'ancient',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'CS2Flow Ancient Mid-to-A takeover. Instant T-Spawn Red Room smoke + Cave smoke enables 3 players to seize Mid and Donut while 2 players pressure A Main with Temple & CT smokes.',
    tags: ['CS2Flow', 'Mid Control', 'Donut Split', 'A Site', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-01-26',
    tacticsDrawings: makeDrawings('ancient', 'anc-mid-a', [
      { type: 'arrow', color: '#f59e0b', points: [[48, 58], [49, 43], [31, 43], [30, 26]] },
      { type: 'arrow', color: '#38bdf8', points: [[18, 48], [30, 26]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[49, 29]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[31, 19]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Instant Red Room Smoke & Elbow Take (1:55 - 1:30)',
        description:
          'Spawn-smoke Top Mid / Red Room, molotov Cave, and push 3 players through Elbow into Donut.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Spawn Red Room Smoker)',
            instructions: 'Throw instant Top Mid / Red Room smoke from T Spawn, then support Elbow.',
            lineupIds: [],
            position: pt('ancient', 49, 86)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Mid / Donut Point Entry)',
            instructions: 'Run Elbow, clear close Mid cubby, and breach Donut behind pop-flash.',
            lineupIds: [],
            position: pt('ancient', 49, 43)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Donut Flash & Trade)',
            instructions: 'Flash over Donut wall from Mid and trade Entry inside Donut square.',
            lineupIds: [],
            position: pt('ancient', 48, 58)
          },
          {
            slot: 4,
            role: 'Support',
            playerName: 'Player 4 (A Main Utility)',
            instructions: 'Stage in A Yard, line up Temple smoke and CT A Lane smoke.',
            lineupIds: [],
            position: pt('ancient', 22, 65)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (B Ramp / Cave Freeze)',
            instructions: 'Throw Cave smoke from Water to keep B CTs anchored on B.',
            lineupIds: [],
            position: pt('ancient', 59, 60)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Donut + A Main Pincer Breach (1:30 - 0:55)',
        description:
          'Drop Temple and CT smokes; Donut pair and A Main pair collapse on A Site Triple and Plat.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Donut Anchor)',
            instructions: 'Hold Donut rear exit against CT Mid flank.',
            lineupIds: [],
            position: pt('ancient', 31, 43)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Donut-to-A Entry)',
            instructions: 'Swing out of Donut onto A Site Triple and clear Temple corner.',
            lineupIds: [],
            position: pt('ancient', 30, 26)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Bomb Planter)',
            instructions: 'Plant bomb Default Triple open for Donut and A Main.',
            lineupIds: [],
            position: pt('ancient', 30, 26)
          },
          {
            slot: 4,
            role: 'Support',
            playerName: 'Player 4 (A Main Entry & Plat Clear)',
            instructions: 'Molotov A Plat / Big Box and swing out of A Main.',
            lineupIds: [],
            position: pt('ancient', 20, 23)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Mid / House Cutoff)',
            instructions: 'Lurk Top Mid to shoot CTs rotating through CT Spawn to Temple.',
            lineupIds: [],
            position: pt('ancient', 49, 29)
          }
        ]
      }
    ]
  },
  {
    id: 'ancient-b-ramp-cave-execute',
    title: 'Ancient B Ramp Cave & Long/Short Triple Smoke Execute',
    mapId: 'ancient',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'Tier-1 Ancient B-Site standard execute. Lock down Cave/Cheetah early, then drop Long B, Short B, and Cave smokes from Water/Ruins with a Pillar & Ninja molotov barrage.',
    tags: ['Pro Meta', 'Execute', 'B Site', 'Cave Control'],
    isCustom: false,
    createdAt: '2026-01-27',
    tacticsDrawings: makeDrawings('ancient', 'anc-b-exec', [
      { type: 'arrow', color: '#f59e0b', points: [[77, 60], [75, 41]] },
      { type: 'arrow', color: '#38bdf8', points: [[66, 47], [75, 41]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[82, 36]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[67, 38]] },
      { type: 'molotov_fire', color: '#f97316', points: [[75, 41]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: B Ramp & Cave Take (1:55 - 1:30)',
        description:
          'Extinguish B Doors incendiary, flash into Cave/Cheetah, and line up Long/Short B smokes in Water.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Cave Breacher)',
            instructions: 'Clear Cave / Jaguar room behind Water flash and hold Cave exit to B.',
            lineupIds: [],
            position: pt('ancient', 66, 47)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (B Ramp Point)',
            instructions: 'Extinguish B Ramp molotov and stage at B Doors for execute pop.',
            lineupIds: [],
            position: pt('ancient', 77, 60)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Long B Smoker)',
            instructions: 'From Water alley, line up Long B smoke and Ninja molotov.',
            lineupIds: [],
            position: pt('ancient', 59, 60)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Short B Smoker & Flashes)',
            instructions: 'Throw Short B / Lane smoke and double high flash over B Ramp wall.',
            lineupIds: [],
            position: pt('ancient', 59, 60)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Mid Elbow Lurker)',
            instructions: 'Hold Elbow/Mid so CTs cannot flank through Water.',
            lineupIds: [],
            position: pt('ancient', 48, 58)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Pillar Clear & Post-Plant Ramp Lock (1:30 - 0:50)',
        description:
          'Breach B Site from Cave and Ramp together, planting front Pillar for B Ramp.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Cave-to-Lane Pusher)',
            instructions: 'Exit Cave to clear First/Second Cubby and hold Short B smoke.',
            lineupIds: [],
            position: pt('ancient', 67, 38)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Pillar & Back Site)',
            instructions: 'Clear Pillar and push up to Long B smoke edge.',
            lineupIds: [],
            position: pt('ancient', 82, 36)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Bomb Planter)',
            instructions: 'Plant bomb front B Pillar open to B Ramp and Cave.',
            lineupIds: [],
            position: pt('ancient', 75, 41)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (B Ramp Post-Plant)',
            instructions: 'Fall back to B Ramp with molotov saved for defuse denial.',
            lineupIds: [],
            position: pt('ancient', 77, 60)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Cave Anchor)',
            instructions: 'Anchor inside Cave watching Red Room / Mid retake.',
            lineupIds: [],
            position: pt('ancient', 66, 47)
          }
        ]
      }
    ]
  },
  {
    id: 'ancient-ct-elbow-cave-denial',
    title: 'Ancient Mid Elbow & Cave Early Denial',
    mapId: 'ancient',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Mid',
    summary:
      'Pro Meta CT Ancient setup. Instant T-Elbow smoke + double Red Room HEs deny Mid control while 2 B players take Cave and B Ramp superiority.',
    tags: ['Pro Meta', 'Mid Denial', 'Cave Push', 'CS2Journal'],
    isCustom: false,
    createdAt: '2026-01-28',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Instant Elbow Smoke & Cave Take (1:55 - 1:30)',
        description:
          'Spawn-smoke Elbow, throw Red Room HEs, and push 1 player into Cave while B Anchor molotovs B Ramp.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'CT 1 (Spawn Elbow Smoker)',
            instructions: 'Throw instant Elbow smoke from CT Spawn, then rotate toward B Alley/Short.',
            lineupIds: [],
            position: pt('ancient', 51, 17)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'CT 2 (Red Room Fighter)',
            instructions: 'Run Top Mid into Red Room, throw deep Elbow HE, and fight behind Elbow smoke.',
            lineupIds: [],
            position: pt('ancient', 49, 43)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'CT 3 (Donut Connector)',
            instructions: 'Support Red Room from Donut doorway with counter-flash.',
            lineupIds: [],
            position: pt('ancient', 31, 43)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'CT 4 (Cave Controller)',
            instructions: 'Molotov Cave entrance at 1:49 and post inside Cheetah.',
            lineupIds: [],
            position: pt('ancient', 66, 47)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (A Site Anchor)',
            instructions: 'Anchor A Site from Temple/Plat with A Main smoke ready.',
            lineupIds: [],
            position: pt('ancient', 30, 26)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: 1-1-3 B-Heavy Mid-Round Lock (1:30 - 0:45)',
        description:
          'With Mid clear, CT 2 falls back to Top Mid/House while B side holds a strong 3-man crossfire.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'CT 1 (B Long Anchor)',
            instructions: 'Hold B Ramp from B Long corner.',
            lineupIds: [],
            position: pt('ancient', 82, 36)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'CT 2 (Top Mid / House)',
            instructions: 'Hold Mid from Top Mid house with quick rotate to A or B.',
            lineupIds: [],
            position: pt('ancient', 49, 29)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'CT 3 (Donut / A Rotator)',
            instructions: 'Hold Donut and assist A Anchor on A Main noise.',
            lineupIds: [],
            position: pt('ancient', 31, 43)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'CT 4 (B Short / Pillar)',
            instructions: 'Play B Short / Pillar crossfire with B Long.',
            lineupIds: [],
            position: pt('ancient', 67, 38)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (Temple A Anchor)',
            instructions: 'Hold A Main from Temple.',
            lineupIds: [],
            position: pt('ancient', 31, 19)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 6. ANUBIS (de_anubis) — Active Duty
  // ============================================================================
  {
    id: 'anubis-b-palace-con-street',
    title: 'Anubis B Site Palace + Connector + Street Execute',
    mapId: 'anubis',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'CS2Flow Anubis B-Site triple-smoke execute. Drop Left Street, Palace, and E-Box Connector smokes from Ruins while 1 player lurks Canals/E-Box to pinch the site anchor.',
    tags: ['CS2Flow', 'Execute', 'B Site', 'Triple Smoke', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-01-29',
    tacticsDrawings: makeDrawings('anubis', 'anu-b-exec', [
      { type: 'arrow', color: '#f59e0b', points: [[28, 72], [24, 58], [33, 49]] },
      { type: 'arrow', color: '#38bdf8', points: [[60, 58], [41, 58], [33, 49]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[39, 32]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[28, 34]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[41, 58]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Canals Control & Ruins Lineup Stack (1:55 - 1:30)',
        description:
          'Take Water/Canals control first to threaten E-Box, then stage 4 players in Ruins/B Main.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Palace Smoker)',
            instructions: 'From Ruins pillar, line up B Palace smoke and call execute timing.',
            lineupIds: [],
            position: pt('anubis', 28, 72)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (CT Street Smoker)',
            instructions: 'Line up Left Side / Street smoke and throw Pillar molotov.',
            lineupIds: [],
            position: pt('anubis', 28, 72)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (E-Box Smoker & Flashes)',
            instructions: 'Throw Connector / E-Box smoke and double pop-flash over B Main gate.',
            lineupIds: [],
            position: pt('anubis', 24, 58)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (B Main Point Entry)',
            instructions: 'Stage close B Main arch; swing out on flash #1 to clear Back Site and Obelisk.',
            lineupIds: [],
            position: pt('anubis', 24, 58)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Canals / E-Box Pinch)',
            instructions: 'Wait in Water outside E-Box; push through E-Box smoke as B Main breaches.',
            lineupIds: [],
            position: pt('anubis', 60, 58)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Obelisk Breach & Post-Plant Crossfire (1:30 - 0:50)',
        description:
          'Clear Obelisk and Back Site, plant Default B for B Main and E-Box.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (B Main Post-Plant)',
            instructions: 'Hold B Main choke and save molotov for bomb plant.',
            lineupIds: [],
            position: pt('anubis', 24, 58)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb front Obelisk open to B Main and Connector.',
            lineupIds: [],
            position: pt('anubis', 33, 49)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Street Watcher)',
            instructions: 'Push up to B Long / Street smoke edge to catch CTs pushing.',
            lineupIds: [],
            position: pt('anubis', 28, 34)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Palace Guard)',
            instructions: 'Tuck close Palace stairs to kill CTs exiting Palace smoke.',
            lineupIds: [],
            position: pt('anubis', 39, 32)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (E-Box Anchor)',
            instructions: 'Lock down E-Box Connector against Mid/Water retakes.',
            lineupIds: [],
            position: pt('anubis', 41, 58)
          }
        ]
      }
    ]
  },
  {
    id: 'anubis-mid-bridge-camera-a-split',
    title: 'Anubis Mid Bridge to Camera A-Site Split',
    mapId: 'anubis',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'Pro Meta Anubis A-Site split. Smoke Mid House, breach Double Doors into Top Mid/Camera while 2 players execute from A Main with Heaven smoke and Fountain molotov.',
    tags: ['Pro Meta', 'Split', 'Mid Bridge', 'A Site'],
    isCustom: false,
    createdAt: '2026-01-30',
    tacticsDrawings: makeDrawings('anubis', 'anu-a-split', [
      { type: 'arrow', color: '#f59e0b', points: [[52, 54], [55, 45], [63, 37], [74, 27]] },
      { type: 'arrow', color: '#38bdf8', points: [[79, 48], [75, 35], [74, 27]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[65, 25]] },
      { type: 'molotov_fire', color: '#f97316', points: [[75, 35]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Mid Bridge & Boat Take (1:55 - 1:30)',
        description:
          'Smoke Mid House off spawn, flash Mid Bridge, and take Boat/A Main staging.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Mid Doors Entry)',
            instructions: 'Cross Mid Bridge behind House smoke, molotov Window corner, and push through Mid Doors.',
            lineupIds: [],
            position: pt('anubis', 55, 45)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Mid Flash & Trade)',
            instructions: 'Flash Mid House for Entry and follow into Top Mid toward Camera.',
            lineupIds: [],
            position: pt('anubis', 52, 54)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (A Main Heaven Smoker)',
            instructions: 'From Boat/A Main, line up A Heaven smoke and Fountain molotov.',
            lineupIds: [],
            position: pt('anubis', 71, 54)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (A Main Point Entry)',
            instructions: 'Stage at A Main Carpet; swing Fountain when Mid players breach Camera.',
            lineupIds: [],
            position: pt('anubis', 79, 48)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Canals Cutoff)',
            instructions: 'Hold Water/Canals against E-Box CT flank.',
            lineupIds: [],
            position: pt('anubis', 60, 58)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Camera + A Main Crunch (1:30 - 0:55)',
        description:
          'Pinch A Site Plateau from Camera and A Main while Heaven is smoked off.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Camera Breacher)',
            instructions: 'Clear Camera hallway and swing onto A Site Pillar.',
            lineupIds: [],
            position: pt('anubis', 63, 37)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (CT Mid Cutoff)',
            instructions: 'Hold Top Mid / Alley to deny CT Spawn rotations.',
            lineupIds: [],
            position: pt('anubis', 55, 35)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (Bomb Planter)',
            instructions: 'Plant bomb Default A Plateau open for A Main and Camera.',
            lineupIds: [],
            position: pt('anubis', 74, 27)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Heaven Smoke Guard)',
            instructions: 'Hold Fountain and watch Heaven Walkway smoke.',
            lineupIds: [],
            position: pt('anubis', 75, 35)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (A Main Flank Watcher)',
            instructions: 'Watch Boat and A Main behind the execute.',
            lineupIds: [],
            position: pt('anubis', 79, 48)
          }
        ]
      }
    ]
  },
  {
    id: 'anubis-ct-canals-water-pinch',
    title: 'Anubis Canals & Water Aggressive Pinch',
    mapId: 'anubis',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Mid',
    summary:
      'Pro Meta CT Anubis counter-strategy. Reclaim Water/Canals early by combining a Boat drop-down with an E-Box Connector swing and Mid Bridge overwatch.',
    tags: ['Pro Meta', 'Water Control', 'CT Aggression'],
    isCustom: false,
    createdAt: '2026-01-31',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: E-Box + Boat Water Pinch (1:55 - 1:30)',
        description:
          'Drop a Boat incendiary + flash while E-Box player swings Water simultaneously.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (E-Box Aggressor)',
            instructions: 'Hold E-Box; when Boat teammate flashes Water at 1:44, swing out to clear Canals.',
            lineupIds: [],
            position: pt('anubis', 41, 58)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Boat Dropper)',
            instructions: 'Push through A Main to Boat, throw Canals flash, and pinch Water with CT 1.',
            lineupIds: [],
            position: pt('anubis', 71, 54)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Mid House AWPer)',
            instructions: 'Lock down Mid Bridge from Double Doors so T players cannot jump into Water from Bridge.',
            lineupIds: [],
            position: pt('anubis', 55, 45)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Site Anchor)',
            instructions: 'Smoke B Main at 1:50 and hold Obelisk.',
            lineupIds: [],
            position: pt('anubis', 33, 49)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (A Site Camera Anchor)',
            instructions: 'Anchor A Site from Camera/Fountain watching A Main.',
            lineupIds: [],
            position: pt('anubis', 75, 35)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Water Lockdown & Fast Rotate Setup (1:30 - 0:45)',
        description:
          'Keep 1 player posted in Canals/E-Box with complete information on T rotations.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (Canals Controller)',
            instructions: 'Hold Canals stairs to spot any B Ruins or A Boat rotation.',
            lineupIds: [],
            position: pt('anubis', 60, 58)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (A Main / Fountain)',
            instructions: 'Fall back to A Fountain to create a 2-man A defense.',
            lineupIds: [],
            position: pt('anubis', 75, 35)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Palace / Mid Flex AWP)',
            instructions: 'Shift between Mid Doors and B Palace.',
            lineupIds: [],
            position: pt('anubis', 39, 32)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Street / Site)',
            instructions: 'Hold B Site crossfire with Palace AWP.',
            lineupIds: [],
            position: pt('anubis', 28, 34)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (A Heaven Anchor)',
            instructions: 'Hold A Plateau and Heaven.',
            lineupIds: [],
            position: pt('anubis', 65, 25)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 7. CACHE (de_cache) — Active Duty Premier
  // ============================================================================
  {
    id: 'cache-a-main-squeaky-wall',
    title: 'Cache A Main + Squeaky Forklift & Highway Wall Execute',
    mapId: 'cache',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'CS2Flow Active Duty Cache A-Site execute. Combine an A-Cross + Truck/Highway smoke wall with NBK, Forklift, and Quad molotovs while Squeaky bursts out to trade A Main.',
    tags: ['CS2Flow', 'Execute', 'A Site', 'Active Duty', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-02-05',
    tacticsDrawings: makeDrawings('cache', 'cch-a-exec', [
      { type: 'arrow', color: '#f59e0b', points: [[50, 27], [31, 27]] },
      { type: 'arrow', color: '#38bdf8', points: [[44, 32], [25, 32], [31, 27]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[18, 43]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[25, 37]] },
      { type: 'molotov_fire', color: '#f97316', points: [[28, 18]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Squeaky Control & A Main Utility Lineups (1:55 - 1:30)',
        description:
          'Take Squeaky room quietly while 3 players line up Highway/Truck smoke, A-Cross smoke, and Quad/NBK molotovs from A Main.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Squeaky Door Breacher)',
            instructions: 'Take Squeaky control, molotov Forklift through door gap, and burst out on A Main flash.',
            lineupIds: [],
            position: pt('cache', 44, 32)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (A Main Point Entry)',
            instructions: 'Molotov NBK corner from A Main and swing Red Box behind the smoke wall.',
            lineupIds: [],
            position: pt('cache', 50, 27)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Highway & Truck Smoker)',
            instructions: 'Throw Highway/Truck smoke and high A Main pop-flash.',
            lineupIds: [],
            position: pt('cache', 50, 27)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (A Cross Smoker & Quad Molly)',
            instructions: 'Throw A Site Cross smoke, then bounce Quad molotov off back wall.',
            lineupIds: [],
            position: pt('cache', 50, 27)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Mid Garage Lurker)',
            instructions: 'Hold Mid Garage / Boost to stop CTs flanking A Main or fast-rotating Highway.',
            lineupIds: [],
            position: pt('cache', 51, 50)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Red Box Plant & Forklift/Quad Lockdown (1:30 - 0:50)',
        description:
          'Clear Quad and Balcony rafters, plant Default Red Box open for A Main and Squeaky.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Forklift & Highway Hold)',
            instructions: 'Take Forklift control and watch Highway smoke fade.',
            lineupIds: [],
            position: pt('cache', 25, 32)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Quad Clear & Anchor)',
            instructions: 'Clear Quad behind molotov and tuck Quad for post-plant.',
            lineupIds: [],
            position: pt('cache', 28, 18)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Bomb Planter)',
            instructions: 'Plant bomb front Red Box exposed to A Main and Squeaky.',
            lineupIds: [],
            position: pt('cache', 31, 27)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (A Main Post-Plant)',
            instructions: 'Play A Main with utility saved to delay CT defuse.',
            lineupIds: [],
            position: pt('cache', 50, 27)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Squeaky / Mid Flank)',
            instructions: 'Watch Mid-to-Squeaky flank.',
            lineupIds: [],
            position: pt('cache', 44, 32)
          }
        ]
      }
    ]
  },
  {
    id: 'cache-mid-boost-z-split',
    title: 'Cache Mid Boost + White Box to Z Connector Split',
    mapId: 'cache',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'Mid',
    summary:
      'Active Duty Cache Mid takeover. Smoke Z Connector and White Box from T Spawn, boost 1 player over Mid Roof to isolate Sandbags, then split either A via Highway or B via Vents.',
    tags: ['Pro Meta', 'Mid Control', 'Z Split', 'Active Duty'],
    isCustom: false,
    createdAt: '2026-02-05',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Z Smoke, White Box Smoke & Mid Boost (1:55 - 1:30)',
        description:
          'Throw Z Connector + White Box smokes from T Spawn, molotov Sandbags, and flood Mid.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'Player 1 (Mid Boost AWPer)',
            instructions: 'Boost onto Mid Roof box to pick CTs crossing Highway or playing White Box.',
            lineupIds: [],
            position: pt('cache', 51, 50)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Mid Garage Entry)',
            instructions: 'Run out Mid Garage behind flash, molotov Sandbags, and take White Box.',
            lineupIds: [],
            position: pt('cache', 45, 49)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Z & White Box Smoker)',
            instructions: 'Throw Z Connector smoke from T Spawn, then flash over Mid Garage.',
            lineupIds: [],
            position: pt('cache', 88, 58)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Vents Breacher)',
            instructions: 'Break Mid Vents cover and clear Checkers from Vent drop.',
            lineupIds: [],
            position: pt('cache', 35, 60)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (A Main Pressure)',
            instructions: 'Stage in A Main ready to pinch A Site when Highway players arrive.',
            lineupIds: [],
            position: pt('cache', 50, 27)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Highway-to-A & Z Connector Crunch (1:30 - 0:55)',
        description:
          'Push 3 players up Highway toward Truck/Forklift while A Main lurker pinches Red Box.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'Player 1 (Z Connector Holder)',
            instructions: 'Post AWP on Z Connector to deny CT Spawn rotations.',
            lineupIds: [],
            position: pt('cache', 30, 49)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Highway Point Entry)',
            instructions: 'Scale Highway to Truck and clear Forklift from behind.',
            lineupIds: [],
            position: pt('cache', 18, 43)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Highway Trade)',
            instructions: 'Follow Entry up Highway and smoke CT Truck cross.',
            lineupIds: [],
            position: pt('cache', 25, 32)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Vents Fake / Flank)',
            instructions: 'Make noise in Vents, then wrap Z Connector.',
            lineupIds: [],
            position: pt('cache', 30, 49)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (A Main Bomb Planter)',
            instructions: 'Enter A Site from A Main and plant Default.',
            lineupIds: [],
            position: pt('cache', 31, 27)
          }
        ]
      }
    ]
  },
  {
    id: 'cache-b-sunroom-checkers',
    title: 'Cache B Main Sun Room + Checkers Molotov Execute',
    mapId: 'cache',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'CS2Flow Cache B-Site execute. From Sun Room, smoke Heaven and CT Tree Room while molotoving Checkers and Headshot, flooding B Main and Checkers together.',
    tags: ['CS2Flow', 'Execute', 'B Site', 'Checkers', 'Active Duty'],
    isCustom: false,
    createdAt: '2026-02-06',
    tacticsDrawings: makeDrawings('cache', 'cch-b-exec', [
      { type: 'arrow', color: '#f59e0b', points: [[56, 75], [34, 68], [35, 79]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[19, 72]] },
      { type: 'molotov_fire', color: '#f97316', points: [[34, 68]] },
      { type: 'molotov_fire', color: '#f97316', points: [[35, 79]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Sun Room Control & Checkers Burn (1:55 - 1:30)',
        description:
          'Clear B Halls into Sun Room, molotov Checkers and Vents, and drop Heaven + CT Tree smokes.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'Player 1 (Sun Room Heaven Smoker)',
            instructions: 'Take Sun Room window, throw B Heaven smoke and Headshot molotov.',
            lineupIds: [],
            position: pt('cache', 50, 80)
          },
          {
            slot: 2,
            role: 'IGL',
            playerName: 'Player 2 (Sun Room CT Smoker)',
            instructions: 'Throw CT Tree Room smoke and double flash through Sun Room window.',
            lineupIds: [],
            position: pt('cache', 50, 80)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Checkers Entry)',
            instructions: 'Molotov back Checkers from B Main, then clear Checkers and Vents.',
            lineupIds: [],
            position: pt('cache', 34, 68)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (B Main Point Entry)',
            instructions: 'Swing B Main onto Site Triple behind Sun Room flashes.',
            lineupIds: [],
            position: pt('cache', 56, 75)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Mid Vents Cutoff)',
            instructions: 'Hold Mid Garage to shoot CTs trying to drop Vents.',
            lineupIds: [],
            position: pt('cache', 51, 50)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Site Plant & Checkers/Sun Room Crossfire (1:30 - 0:50)',
        description:
          'Plant Default B exposed to Checkers and Sun Room window.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            playerName: 'Player 1 (Sun Room Post-Plant)',
            instructions: 'Hold post-plant angle from Sun Room window and throw late molotov.',
            lineupIds: [],
            position: pt('cache', 50, 80)
          },
          {
            slot: 2,
            role: 'IGL',
            playerName: 'Player 2 (B Main Anchor)',
            instructions: 'Hold B Main watching Heaven smoke push.',
            lineupIds: [],
            position: pt('cache', 56, 75)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Checkers Anchor)',
            instructions: 'Lock down Checkers watching Vents and B Site cross.',
            lineupIds: [],
            position: pt('cache', 34, 68)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Bomb Planter & Headshot)',
            instructions: 'Plant bomb open for Checkers/B Main, then tuck Headshot.',
            lineupIds: [],
            position: pt('cache', 35, 79)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Vents Lurker)',
            instructions: 'Drop into Vents to cut off Highway/Z rotators.',
            lineupIds: [],
            position: pt('cache', 35, 60)
          }
        ]
      }
    ]
  },
  {
    id: 'cache-ct-212-mid-checkers',
    title: 'Cache 2-1-2 Mid Garage & Checkers Crossfire',
    mapId: 'cache',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Default',
    summary:
      'Pro Meta CT Cache default. 2 players anchor A (Forklift + Quad/Truck), 1 AWPer holds Mid Garage from Z/White Box, and 2 players set up a Checkers + Heaven B crossfire.',
    tags: ['Pro Meta', 'CT Default', 'Crossfire', 'Active Duty'],
    isCustom: false,
    createdAt: '2026-02-06',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Mid Garage Smoke & Checkers Setup (1:55 - 1:30)',
        description:
          'Smoke Mid Garage early, molotov B Main from Checkers, and hold Squeaky/A Main.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (A Anchor - Forklift / NBK)',
            instructions: 'Smoke A Main at 1:48 and play Forklift / NBK crossfire.',
            lineupIds: [],
            position: pt('cache', 25, 32)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Highway / Quad Rotator)',
            instructions: 'Hold Squeaky from Quad; ready to support Mid from Highway.',
            lineupIds: [],
            position: pt('cache', 28, 18)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Z Connector AWPer)',
            instructions: 'Smoke Mid Garage at 1:52 and hold Boost/Garage with AWP from Z.',
            lineupIds: [],
            position: pt('cache', 30, 49)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (Checkers Rifler)',
            instructions: 'Enter Checkers via Vents, molotov B Main entrance, and hold close Checkers.',
            lineupIds: [],
            position: pt('cache', 34, 68)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Heaven / Site Anchor)',
            instructions: 'Play B Heaven or Headshot supporting Checkers with counter-flashes.',
            lineupIds: [],
            position: pt('cache', 19, 72)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Late Round Retake & Highway Flex (1:30 - 0:40)',
        description:
          'Adapt to T Mid pressure by collapsing Z Connector and Highway into a crossfire.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (A Site Red Box)',
            instructions: 'Hold A Main and Squeaky.',
            lineupIds: [],
            position: pt('cache', 31, 27)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Highway Hold)',
            instructions: 'Watch Mid White Box from Highway.',
            lineupIds: [],
            position: pt('cache', 18, 43)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (CT Spawn / Z AWP)',
            instructions: 'Hold Z Connector deep angle.',
            lineupIds: [],
            position: pt('cache', 9, 47)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Site Default)',
            instructions: 'Fall back from Checkers to B Site Default on heavy utility.',
            lineupIds: [],
            position: pt('cache', 35, 79)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Heaven)',
            instructions: 'Anchor B Heaven with retake smoke.',
            lineupIds: [],
            position: pt('cache', 19, 72)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 8. TRAIN (de_train) — Reserve Pool
  // ============================================================================
  {
    id: 'train-a-yard-smoke-wall',
    title: 'Train A Yard Smoke Wall (Z Connector + Sandwich + Ivy)',
    mapId: 'train',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'CS2Flow Train A-Yard execute. Throw cross-map T-Spawn smokes landing on Z Connector, Sandwich/Hell, and Green Train while Popdog + A Main pinch A Site.',
    tags: ['CS2Flow', 'Execute', 'Smoke Wall', 'A Site', 'Reserve Pool'],
    isCustom: false,
    createdAt: '2026-02-07',
    tacticsDrawings: makeDrawings('train', 'trn-a-wall', [
      { type: 'arrow', color: '#f59e0b', points: [[38, 47], [49, 40], [63, 50]] },
      { type: 'arrow', color: '#38bdf8', points: [[44, 55], [63, 50]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[64, 61]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[76, 41]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: T-Spawn Smoke Wall & Popdog Drop (1:55 - 1:30)',
        description:
          '2 players throw Z Connector and Sandwich smokes from T Spawn while Popdog and Ivy are contested.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Z Connector Smoker)',
            instructions: 'Throw Z Connector smoke from T Spawn fence, then scale A Main.',
            lineupIds: [],
            position: pt('train', 14, 23)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Sandwich & Green Smoker)',
            instructions: 'Throw Sandwich/Hell smoke and Olof molotov, then flash over A Main.',
            lineupIds: [],
            position: pt('train', 38, 47)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (A Main Point Entry)',
            instructions: 'Exit A Main behind flash, clear Olof and Red Train, and push Default.',
            lineupIds: [],
            position: pt('train', 49, 40)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Popdog Ladder Entry)',
            instructions: 'Drop Popdog ladder and swing out onto A Site as A Main breaches.',
            lineupIds: [],
            position: pt('train', 44, 55)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Ivy Holder)',
            instructions: 'Clear Ivy hallway and smoke Old Bomb to cut off CT flank.',
            lineupIds: [],
            position: pt('train', 53, 21)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Default A Plant & Ivy/A-Main Post-Plant (1:30 - 0:50)',
        description:
          'Plant Default A open for A Main and Popdog.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (A Main Post-Plant)',
            instructions: 'Hold post-plant line from A Main.',
            lineupIds: [],
            position: pt('train', 38, 47)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb on Default A Site.',
            lineupIds: [],
            position: pt('train', 63, 50)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Green Train Guard)',
            instructions: 'Hold Sandwich and Old Bomb around Green Train.',
            lineupIds: [],
            position: pt('train', 62, 39)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Z Connector Cutoff)',
            instructions: 'Hold Z Connector smoke edge.',
            lineupIds: [],
            position: pt('train', 64, 61)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Ivy Flank Anchor)',
            instructions: 'Lock down Ivy.',
            lineupIds: [],
            position: pt('train', 53, 21)
          }
        ]
      }
    ]
  },
  {
    id: 'train-brown-halls-b-ramp-split',
    title: 'Train Brown Halls Upper/Lower B Ramp Split',
    mapId: 'train',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'Coordinated Inner B execute on Train. Take Brown Halls control, smoke Z Connector and Back B, molotov Oil Train, and split Upper Catwalk + Lower B Ramp.',
    tags: ['Pro Meta', 'Split', 'B Site', 'Popdog'],
    isCustom: false,
    createdAt: '2026-02-07',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Brown Halls Clearance & Upper B Utility (1:55 - 1:30)',
        description:
          'Secure Brown Halls, smoke Z Connector from Upper B, and molotov Oil/Summit.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Lower B Ramp Entry)',
            instructions: 'Slide down B Ramp behind Upper flash and clear close left and Oil Train.',
            lineupIds: [],
            position: pt('train', 33, 73)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Lower B Trade & Bomb)',
            instructions: 'Follow Ramp Entry into Lower B and plant Default Inner.',
            lineupIds: [],
            position: pt('train', 40, 84)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (Upper B Z Smoker)',
            instructions: 'From Brown Halls, throw Z Connector smoke and Oil molotov.',
            lineupIds: [],
            position: pt('train', 35, 55)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Upper B Catwalk Entry)',
            instructions: 'Push Upper B Heaven rail to clear Headshot and Back B.',
            lineupIds: [],
            position: pt('train', 35, 55)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Popdog Cutoff)',
            instructions: 'Hold Popdog ladder room to prevent CT Popdog flank.',
            lineupIds: [],
            position: pt('train', 44, 55)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Inner B Plant & Oil/Ramp Hold (1:30 - 0:50)',
        description:
          'Plant Inner B Site and establish crossfire between Upper Heaven, Lower Ramp, and Oil Train.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Oil Train Anchor)',
            instructions: 'Take Oil Train and watch CT Spawn retake.',
            lineupIds: [],
            position: pt('train', 66, 76)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb Default B open to Ramp.',
            lineupIds: [],
            position: pt('train', 53, 76)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (B Ramp Post-Plant)',
            instructions: 'Hold post-plant from B Ramp.',
            lineupIds: [],
            position: pt('train', 33, 73)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Headshot / Back B)',
            instructions: 'Hold Headshot angle watching Z Connector and CT.',
            lineupIds: [],
            position: pt('train', 63, 85)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Z Connector Lurk)',
            instructions: 'Creep out Popdog to watch Z Connector.',
            lineupIds: [],
            position: pt('train', 64, 61)
          }
        ]
      }
    ]
  },
  {
    id: 'train-ct-ivy-popdog-lockdown',
    title: 'Train Ivy + Popdog Lockdown Setup',
    mapId: 'train',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Default',
    summary:
      'Pro Meta CT Train setup. Lock down Ivy and Popdog early with incendiaries while Z Connector AWPer pivots between Outer A Yard and Inner B.',
    tags: ['Pro Meta', 'CT Default', 'Ivy Control'],
    isCustom: false,
    createdAt: '2026-02-07',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Ivy Smoke & Popdog Incendiary (1:55 - 1:30)',
        description:
          'Deny Ivy and Popdog early while AWP posts at Z Connector / Green Train.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (Ivy Anchor)',
            instructions: 'Smoke deep Ivy at 1:50 and hold from Old Bomb / Alley.',
            lineupIds: [],
            position: pt('train', 78, 26)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Popdog / Olof Rifler)',
            instructions: 'Molotov Popdog ladder room and hold A Main from Default/Green.',
            lineupIds: [],
            position: pt('train', 62, 39)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Z Connector AWPer)',
            instructions: 'Hold A Main from Z Connector; instant rotate to B if Brown Halls is loud.',
            lineupIds: [],
            position: pt('train', 64, 61)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Site Oil / Ramp)',
            instructions: 'Smoke Upper B / Brown Halls and hold Lower Ramp from Oil.',
            lineupIds: [],
            position: pt('train', 66, 76)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Headshot Anchor)',
            instructions: 'Hold Upper B Catwalk from Headshot / Back B.',
            lineupIds: [],
            position: pt('train', 63, 85)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Mid-Round A Yard Crossfire (1:30 - 0:40)',
        description:
          'Maintain crossfire between Sandwich, Z Connector, and Old Bomb.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (Old Bomb)',
            instructions: 'Hold Ivy.',
            lineupIds: [],
            position: pt('train', 78, 26)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Sandwich / Hell)',
            instructions: 'Play Sandwich crossfire with Z Connector.',
            lineupIds: [],
            position: pt('train', 76, 41)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (A Site Default AWP)',
            instructions: 'Hold A Main and Popdog.',
            lineupIds: [],
            position: pt('train', 63, 50)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Inner Site)',
            instructions: 'Hold B Ramp.',
            lineupIds: [],
            position: pt('train', 53, 76)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (Back B)',
            instructions: 'Anchor Inner B.',
            lineupIds: [],
            position: pt('train', 63, 85)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 9. VERTIGO (de_vertigo) — Reserve Pool
  // ============================================================================
  {
    id: 'vertigo-a-ramp-elevator-wall',
    title: 'Vertigo A Ramp Elevator & Left/Right Side Smoke Wall',
    mapId: 'vertigo',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'CS2Flow Vertigo A-Ramp signature execute. Clear Sandbags and Yellow, deploy the Left Side + Right Elevator smoke wall with a Heaven molotov, and plant Default A.',
    tags: ['CS2Flow', 'Execute', 'A Ramp', 'Smoke Wall', 'Reserve Pool'],
    isCustom: false,
    createdAt: '2026-02-08',
    tacticsDrawings: makeDrawings('vertigo', 'vert-a-wall', [
      { type: 'arrow', color: '#f59e0b', points: [[63, 76], [69, 60]] },
      { type: 'arrow', color: '#38bdf8', points: [[56, 70], [69, 60]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[58, 58]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[71, 52]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Sandbags Molotov & Smoke Wall Deployment (1:55 - 1:30)',
        description:
          'Burn Sandbags and Short Lane, take Yellow control, and throw Left/Right A Site smoke wall.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Yellow / Crane Entry)',
            instructions: 'Clear Yellow behind flash and hold Left Side elevator angle.',
            lineupIds: [],
            position: pt('vertigo', 56, 70, 'upper')
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Sandbags Entry)',
            instructions: 'Molotov Sandbags, clear A Short catwalk, and scale A Ramp.',
            lineupIds: [],
            position: pt('vertigo', 63, 76, 'upper')
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Left Side Elevator Smoker)',
            instructions: 'From A Ramp scaffold, throw Left Side Elevator smoke.',
            lineupIds: [],
            position: pt('vertigo', 64, 74, 'upper')
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Right Side Heaven Smoker)',
            instructions: 'Throw Right Side smoke + Heaven molotov and call the plant.',
            lineupIds: [],
            position: pt('vertigo', 73, 69, 'upper')
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Mid Connector Lurker)',
            instructions: 'Hold Mid 51F to cut off B-to-A rotations through Elevator.',
            lineupIds: [],
            position: pt('vertigo', 52, 48, 'upper')
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Default A Plant & Ramp Post-Plant (1:30 - 0:50)',
        description:
          'Plant front A boxes behind the smoke wall and fall back to Ramp/Yellow/Short.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Yellow Post-Plant)',
            instructions: 'Hold bomb cross from Yellow scaffold.',
            lineupIds: [],
            position: pt('vertigo', 56, 70, 'upper')
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb Default A boxes and fall to Sandbags.',
            lineupIds: [],
            position: pt('vertigo', 69, 60, 'upper')
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (A Short Holder)',
            instructions: 'Hold A Short catwalk watching Heaven drop.',
            lineupIds: [],
            position: pt('vertigo', 73, 69, 'upper')
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (A Ramp Spam & Utility)',
            instructions: 'Save molotov and HE for post-plant defuse denial.',
            lineupIds: [],
            position: pt('vertigo', 63, 76, 'upper')
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Elevator Flank)',
            instructions: 'Creep into Elevator room as smokes fade.',
            lineupIds: [],
            position: pt('vertigo', 58, 58, 'upper')
          }
        ]
      }
    ]
  },
  {
    id: 'vertigo-b-stairs-gen-quad',
    title: 'Vertigo B Stairs Generator & Quad Execute',
    mapId: 'vertigo',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'Coordinated Vertigo B-Stairs execute. Smoke Left & Right Generator / CT Spawn from Under B, molotov Quad and Electric, and burst up B Stairs.',
    tags: ['Pro Meta', 'Execute', 'B Stairs', 'Reserve Pool'],
    isCustom: false,
    createdAt: '2026-02-08',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Generator Smokes & Quad Molotov (1:55 - 1:30)',
        description:
          'Stage at B Lower Stairs, throw Left/Right Generator smokes and Quad molotov.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (B Stairs Point Entry)',
            instructions: 'Scale B Stairs behind high pop-flash, clear White Box and Electric.',
            lineupIds: [],
            position: pt('vertigo', 21, 45, 'upper')
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Stairs Trade)',
            instructions: 'Follow Entry up B Stairs and clear Quad / Pillar.',
            lineupIds: [],
            position: pt('vertigo', 25, 62, 'upper')
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Generator Left Smoker)',
            instructions: 'Throw Left Generator smoke and Quad molotov.',
            lineupIds: [],
            position: pt('vertigo', 21, 45, 'upper')
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (CT Spawn Right Smoker)',
            instructions: 'Throw Right Generator / CT Spawn smoke and flash over B Site.',
            lineupIds: [],
            position: pt('vertigo', 25, 62, 'upper')
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Mid-to-B Connector Split)',
            instructions: 'Push through T Mid to CT Mid to pinch B from CT Spawn.',
            lineupIds: [],
            position: pt('vertigo', 45, 54, 'upper')
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Default B Plant & Electric/Stairs Hold (1:30 - 0:50)',
        description:
          'Plant Default B open to Stairs and Electric.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Electric Anchor)',
            instructions: 'Hold post-plant from B Back / Electric.',
            lineupIds: [],
            position: pt('vertigo', 16, 22, 'upper')
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Generator Watcher)',
            instructions: 'Watch Generator smokes for CT pushes.',
            lineupIds: [],
            position: pt('vertigo', 30, 22, 'upper')
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Bomb Planter)',
            instructions: 'Plant bomb Default B.',
            lineupIds: [],
            position: pt('vertigo', 23, 24, 'upper')
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (B Stairs Post-Plant)',
            instructions: 'Hold from B Stairs head-glitch.',
            lineupIds: [],
            position: pt('vertigo', 21, 45, 'upper')
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (CT Mid Cutoff)',
            instructions: 'Hold CT Mid / Boost.',
            lineupIds: [],
            position: pt('vertigo', 40, 35, 'upper')
          }
        ]
      }
    ]
  },
  {
    id: 'vertigo-ct-51f-ramp-mid-boost',
    title: 'Vertigo 51F A-Ramp & Mid Boost Default',
    mapId: 'vertigo',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Default',
    summary:
      'Pro Meta CT Vertigo 2-1-2 setup. Chain A-Ramp smokes and incendiaries while Mid player boosts CT Window to watch T Mid.',
    tags: ['Pro Meta', 'CT Default', '51F Hold'],
    isCustom: false,
    createdAt: '2026-02-08',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Early A-Ramp Denial & Mid Boost (1:55 - 1:30)',
        description:
          'Drop early A Ramp molotov + HE and establish Mid Boost vision.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (A Ramp / Sandbags Fighter)',
            instructions: 'Molotov Bottom A Ramp at 1:51 and hold Yellow/Ramp from Default.',
            lineupIds: [],
            position: pt('vertigo', 69, 60, 'upper')
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (A Heaven / Elevator)',
            instructions: 'Support CT 1 with counter-smoke on A Ramp and flash from Heaven.',
            lineupIds: [],
            position: pt('vertigo', 71, 52, 'upper')
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Mid Boost AWPer)',
            instructions: 'Smoke T Mid entrance and hold Mid from CT Boost.',
            lineupIds: [],
            position: pt('vertigo', 40, 35, 'upper')
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Generator / Quad)',
            instructions: 'Molotov B Stairs at 1:49 and play Generator.',
            lineupIds: [],
            position: pt('vertigo', 30, 22, 'upper')
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Site / Electric Anchor)',
            instructions: 'Play B Site crossfire with CT 4.',
            lineupIds: [],
            position: pt('vertigo', 16, 22, 'upper')
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Late-Round Elevator & Generator Lock (1:30 - 0:40)',
        description:
          'Save 1 smoke per site for the final 35 seconds.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (A Site Default)',
            instructions: 'Hold A Site behind boxes.',
            lineupIds: [],
            position: pt('vertigo', 69, 60, 'upper')
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Elevator Anchor)',
            instructions: 'Hold Elevator crossfire.',
            lineupIds: [],
            position: pt('vertigo', 58, 58, 'upper')
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (CT Spawn Flex)',
            instructions: 'Ready to rotate A Heaven or B Generator in 3 seconds.',
            lineupIds: [],
            position: pt('vertigo', 54, 24, 'upper')
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Generator)',
            instructions: 'Re-smoke B Stairs late.',
            lineupIds: [],
            position: pt('vertigo', 30, 22, 'upper')
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Default)',
            instructions: 'Hold B Stairs.',
            lineupIds: [],
            position: pt('vertigo', 23, 24, 'upper')
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 10. OVERPASS (de_overpass) — Reserve Pool
  // ============================================================================
  {
    id: 'overpass-monster-water-b-execute',
    title: 'Overpass Monster + Water B-Site Heaven/Bridge Execute',
    mapId: 'overpass',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'CS2Flow Overpass B-Site execute. Secure Water/Short B, throw Heaven, Bridge, and Site smokes from Water/Tracks, burn Barrels/Toxic, and pinch B from Short and Monster.',
    tags: ['CS2Flow', 'Execute', 'B Site', 'Water Control', 'Reserve Pool'],
    isCustom: false,
    createdAt: '2026-02-09',
    tacticsDrawings: makeDrawings('overpass', 'ovp-b-exec', [
      { type: 'arrow', color: '#f59e0b', points: [[60, 50], [62, 41], [70, 33]] },
      { type: 'arrow', color: '#38bdf8', points: [[82, 54], [70, 33]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[60, 29]] },
      { type: 'molotov_fire', color: '#f97316', points: [[70, 33]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Water Take & Heaven/Bridge Smokes (1:55 - 1:30)',
        description:
          'Clear Water and Construction, then line up B Heaven smoke, Bridge smoke, and Barrels molotov.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Water / Construction Entry)',
            instructions: 'Clear Water behind Connector door molotov and take Construction sandbags.',
            lineupIds: [],
            position: pt('overpass', 62, 41)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Water Heaven Smoker)',
            instructions: 'From Water, throw B Heaven smoke and Toxic/Barrels molotov.',
            lineupIds: [],
            position: pt('overpass', 60, 50)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (Bridge Smoker & Flashes)',
            instructions: 'Throw Bridge/ABC smoke and double high flash over Construction wall.',
            lineupIds: [],
            position: pt('overpass', 73, 62)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Monster Tunnel Entry)',
            instructions: 'Stage at Monster pipe; burst out of Monster as Water team scales Sandbags.',
            lineupIds: [],
            position: pt('overpass', 82, 54)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Connector / Toilets Lurker)',
            instructions: 'Hold Connector stairs to deny CT Mid-to-Water flank.',
            lineupIds: [],
            position: pt('overpass', 54, 53)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Pillar Plant & Water/Monster Lock (1:30 - 0:50)',
        description:
          'Pinch B Site Pillar, plant Default B for Monster and Water.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Short B / Sandbags)',
            instructions: 'Clear Pit/Water below site and hold Bridge smoke.',
            lineupIds: [],
            position: pt('overpass', 62, 41)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb front Pillar exposed to Monster and Short.',
            lineupIds: [],
            position: pt('overpass', 70, 33)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (Construction Post-Plant)',
            instructions: 'Hold post-plant from Construction.',
            lineupIds: [],
            position: pt('overpass', 60, 50)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Monster Anchor)',
            instructions: 'Fall back to Monster tunnel watching bomb plant.',
            lineupIds: [],
            position: pt('overpass', 82, 54)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Heaven Flank Cut)',
            instructions: 'Creep up Connector toward A/Heaven to backstab CT rotators.',
            lineupIds: [],
            position: pt('overpass', 43, 44)
          }
        ]
      }
    ]
  },
  {
    id: 'overpass-toilets-a-short-split',
    title: 'Overpass Toilets to A-Short Bank/Dumpster Split',
    mapId: 'overpass',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'Pro Meta Overpass A-Site execute. Take Fountain and Toilets control, smoke Bank and Dumpster, molotov Truck/Dice, and split A from Short and A Long.',
    tags: ['Pro Meta', 'Split', 'Toilets Control', 'A Site'],
    isCustom: false,
    createdAt: '2026-02-09',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Toilets & Party Take (1:55 - 1:25)',
        description:
          'Clear Fountain and Party, flash into Toilets, and push 2 players up A Long.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Toilets Breacher)',
            instructions: 'Clear Party and Toilets divider behind Fountain flash.',
            lineupIds: [],
            position: pt('overpass', 43, 44)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bank Smoker)',
            instructions: 'From Toilets, line up Bank smoke and Dice molotov.',
            lineupIds: [],
            position: pt('overpass', 31, 48)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (Dumpster Smoker)',
            instructions: 'Line up Dumpster / Back A smoke and pop-flash A Short.',
            lineupIds: [],
            position: pt('overpass', 41, 72)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (A Long Pusher)',
            instructions: 'Scale A Long past Rock to pinch A Site with Short.',
            lineupIds: [],
            position: pt('overpass', 20, 46)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Connector Watcher)',
            instructions: 'Hold Connector doorway so B CTs cannot flank Toilets.',
            lineupIds: [],
            position: pt('overpass', 54, 53)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: A Short + A Long Site Breach (1:25 - 0:50)',
        description:
          'Breach A Site Dice/Truck and plant open for A Long and Bathrooms.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (A Short Entry)',
            instructions: 'Swing A Short to clear Truck and Bank stairs.',
            lineupIds: [],
            position: pt('overpass', 33, 30)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb front Dice open to Bathrooms and Long.',
            lineupIds: [],
            position: pt('overpass', 52, 20)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (Bathrooms Post-Plant)',
            instructions: 'Hold post-plant from Toilets.',
            lineupIds: [],
            position: pt('overpass', 43, 44)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (A Long Post-Plant)',
            instructions: 'Hold long-range angle from A Long.',
            lineupIds: [],
            position: pt('overpass', 20, 46)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Bank / Dumpster Guard)',
            instructions: 'Hold Bank smoke push.',
            lineupIds: [],
            position: pt('overpass', 46, 14)
          }
        ]
      }
    ]
  },
  {
    id: 'overpass-ct-fountain-playground',
    title: 'Overpass Fountain & Playground Early Map Control',
    mapId: 'overpass',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'Default',
    summary:
      'Pro Meta CT Overpass aggressive opening. 2 A players push Party/Toilets to peek Fountain while 3 B players deny Monster and Water.',
    tags: ['Pro Meta', 'Early Aggression', 'CT Map Control'],
    isCustom: false,
    createdAt: '2026-02-09',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Toilets Push & Water Molotov (1:55 - 1:30)',
        description:
          'Take Party/Toilets vision early while B side smokes Monster and molotovs Water.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'CT 1 (Party / Fountain AWPer)',
            instructions: 'Peek Fountain steps off spawn with AWP, then fall back to Toilets.',
            lineupIds: [],
            position: pt('overpass', 31, 48)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (A Long / Toilets Support)',
            instructions: 'Flash Fountain for AWPer and watch Playground / A Long.',
            lineupIds: [],
            position: pt('overpass', 20, 46)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'CT 3 (Connector / Water Denial)',
            instructions: 'Molotov Water / Short B tunnel and hold Connector.',
            lineupIds: [],
            position: pt('overpass', 54, 53)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Heaven Rotator)',
            instructions: 'Throw spawn Monster smoke from Heaven and support Water/A.',
            lineupIds: [],
            position: pt('overpass', 60, 29)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Site Pillar Anchor)',
            instructions: 'Anchor B Site Pillar/Barrels with second Monster smoke.',
            lineupIds: [],
            position: pt('overpass', 70, 33)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Disciplined Toilets + B Crossfire (1:30 - 0:40)',
        description:
          'Fall back to A Site / Toilets and B Site crossfires with full map info.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            playerName: 'CT 1 (A Site Bank AWP)',
            instructions: 'Hold A Short and Long from Bank/Truck.',
            lineupIds: [],
            position: pt('overpass', 45, 10)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (A Site Dice)',
            instructions: 'Play Dice crossfire with Bank AWP.',
            lineupIds: [],
            position: pt('overpass', 52, 20)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'CT 3 (B Short / Construction)',
            instructions: 'Hold Water from Construction.',
            lineupIds: [],
            position: pt('overpass', 62, 41)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Heaven)',
            instructions: 'Overwatch B Site and Water from Heaven.',
            lineupIds: [],
            position: pt('overpass', 60, 29)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (B Site Anchor)',
            instructions: 'Hold Monster tunnel.',
            lineupIds: [],
            position: pt('overpass', 70, 33)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // 11. COBBLESTONE (de_cbble) — Classic Competitive
  // ============================================================================
  {
    id: 'cobblestone-b-long-drop-split',
    title: 'Cobblestone B Long Plat + Drop Room Split Execute',
    mapId: 'cobblestone',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'CS2Flow classic Cobblestone B-Site execute. Smoke Broken Wall, Fountain, and Chicken Coop while 3 players rush B Plat and 2 drop into Dropper to clear B Connector.',
    tags: ['CS2Flow', 'Split', 'B Plat', 'Drop Room', 'Classic Competitive'],
    isCustom: false,
    createdAt: '2026-02-10',
    tacticsDrawings: makeDrawings('cobblestone', 'cbl-b-split', [
      { type: 'arrow', color: '#f59e0b', points: [[72, 42], [78, 56], [68, 66]] },
      { type: 'arrow', color: '#38bdf8', points: [[58, 54], [60, 65], [68, 66]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[60, 65]] },
      { type: 'smoke_cloud', color: '#94a3b8', points: [[64, 76]] }
    ]),
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Upper Halls & Drop Room Staging (1:55 - 1:30)',
        description:
          'Take Rock/Upper B Halls and Drop Room top, then throw Broken Wall and Chicken Coop smokes.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (B Plat Point Entry)',
            instructions: 'Swing out B Long Halls behind flash, clear Rock on B Plat, and push site edge.',
            lineupIds: [],
            position: pt('cobblestone', 78, 56)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (B Halls Flash & Trade)',
            instructions: 'Throw high B Plat flash and trade Entry across B Platform.',
            lineupIds: [],
            position: pt('cobblestone', 72, 42)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (Broken Wall & Coop Smoker)',
            instructions: 'From Rock/Halls, throw Broken Wall smoke and Chicken Coop molotov.',
            lineupIds: [],
            position: pt('cobblestone', 74, 32)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Drop Room Breacher)',
            instructions: 'Molotov Drop Window, drop down with flash, and clear B Connector.',
            lineupIds: [],
            position: pt('cobblestone', 58, 54)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Drop Trade & Flank Guard)',
            instructions: 'Follow Drop Breacher and hold B Connector door.',
            lineupIds: [],
            position: pt('cobblestone', 60, 65)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Fountain Plant & B-Plat Lockdown (1:30 - 0:50)',
        description:
          'Pinch B Site Fountain/Statue and plant open for B Plat.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Chicken Coop Clear)',
            instructions: 'Clear Chicken Coop and Back B corner.',
            lineupIds: [],
            position: pt('cobblestone', 64, 76)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Bomb Planter)',
            instructions: 'Plant bomb front Fountain open to B Plat.',
            lineupIds: [],
            position: pt('cobblestone', 68, 66)
          },
          {
            slot: 3,
            role: 'IGL',
            playerName: 'Player 3 (B Plat Anchor)',
            instructions: 'Hold post-plant from B Plat Rock.',
            lineupIds: [],
            position: pt('cobblestone', 78, 56)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Broken Wall Holder)',
            instructions: 'Watch Broken Wall and Connector doors.',
            lineupIds: [],
            position: pt('cobblestone', 60, 65)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Drop Room Anchor)',
            instructions: 'Hold Drop Room against A-to-B CT flank.',
            lineupIds: [],
            position: pt('cobblestone', 58, 54)
          }
        ]
      }
    ]
  },
  {
    id: 'cobblestone-a-long-courtyard',
    title: 'Cobblestone A Long + Courtyard Statue Execute',
    mapId: 'cobblestone',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary:
      'Classic Cobblestone A-Site split. Push Mid Courtyard and A Long simultaneously, smoking CT Connector Ramp and molotoving Truck & Statue.',
    tags: ['Pro Meta', 'Execute', 'A Site', 'Courtyard'],
    isCustom: false,
    createdAt: '2026-02-10',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Courtyard & A Long Take (1:55 - 1:30)',
        description:
          'Cross Dragonlore arch into Courtyard while 2 players take A Balcony and A Long.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Courtyard / A Ramp Entry)',
            instructions: 'Clear Mid Courtyard behind Dragonlore flash and scale A Ramp.',
            lineupIds: [],
            position: pt('cobblestone', 42, 48)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Courtyard Smoker)',
            instructions: 'Throw CT Connector / Pit smoke from Courtyard.',
            lineupIds: [],
            position: pt('cobblestone', 38, 38)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (A Long Entry)',
            instructions: 'Clear A Balcony and push down A Long hallway.',
            lineupIds: [],
            position: pt('cobblestone', 24, 58)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (A Long Support & Bomb)',
            instructions: 'Flash A Long exit and carry bomb toward A Site Statue.',
            lineupIds: [],
            position: pt('cobblestone', 23, 44)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Drop Room Fake)',
            instructions: 'Throw utility into Drop Room to hold B CTs on B Site.',
            lineupIds: [],
            position: pt('cobblestone', 58, 54)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Statue Plant & A-Ramp Hold (1:30 - 0:50)',
        description:
          'Breach A Site Statue and plant open for A Long and A Ramp.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (CT Connector Cutoff)',
            instructions: 'Push up to A Pit / CT Ramp smoke edge.',
            lineupIds: [],
            position: pt('cobblestone', 44, 78)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (A Ramp Watcher)',
            instructions: 'Hold A Ramp overlooking Site.',
            lineupIds: [],
            position: pt('cobblestone', 37, 56)
          },
          {
            slot: 3,
            role: 'Entry',
            playerName: 'Player 3 (Statue & Truck Clear)',
            instructions: 'Clear behind A Site Truck and Statue.',
            lineupIds: [],
            position: pt('cobblestone', 34, 74)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Bomb Planter)',
            instructions: 'Plant bomb Default A Statue.',
            lineupIds: [],
            position: pt('cobblestone', 34, 74)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (A Long Anchor)',
            instructions: 'Hold post-plant from A Long.',
            lineupIds: [],
            position: pt('cobblestone', 24, 58)
          }
        ]
      }
    ]
  },
  {
    id: 'cobblestone-ct-drop-b-plat-hold',
    title: 'Cobblestone Drop Room & B-Plat Crossfire Hold',
    mapId: 'cobblestone',
    side: 'ct',
    buyType: 'full_buy',
    targetSite: 'B',
    summary:
      'Pro Meta CT Cobblestone 1-1-3 B-heavy setup. Close shotgun/rifle anchor in Drop Room supported by B Connector flash, B Plat AWPer, and Fountain anchor.',
    tags: ['Pro Meta', 'CT Hold', 'Crossfire', 'Classic Competitive'],
    isCustom: false,
    createdAt: '2026-02-10',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Drop Incendiary & B-Plat AWP Post (1:55 - 1:30)',
        description:
          'Molotov Drop Room landing and B Halls entrance while A Anchor plays passive.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (Drop Room Anchor)',
            instructions: 'Molotov Drop landing at 1:50 and hold close Drop angle.',
            lineupIds: [],
            position: pt('cobblestone', 58, 54)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (B Connector / Broken Wall)',
            instructions: 'Hold counter-flash for Drop Room and smoke Drop exit if overwhelmed.',
            lineupIds: [],
            position: pt('cobblestone', 60, 65)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (B Plat Rock AWPer)',
            instructions: 'Post AWP on B Plat Rock watching B Long Halls entrance.',
            lineupIds: [],
            position: pt('cobblestone', 78, 56)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (B Site Fountain / Coop)',
            instructions: 'Anchor B Site Fountain ready to trade B Plat.',
            lineupIds: [],
            position: pt('cobblestone', 68, 66)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (A Site Solo Anchor)',
            instructions: 'Play passive A Pit / Connector for info and retake.',
            lineupIds: [],
            position: pt('cobblestone', 44, 78)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: B Site Crossfire Collapse (1:30 - 0:40)',
        description:
          'Fall back from Drop and Plat into an unbreakable 3-way B Site crossfire.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'CT 1 (B Connector Door)',
            instructions: 'Fall back to B Connector doorway.',
            lineupIds: [],
            position: pt('cobblestone', 60, 65)
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'CT 2 (Broken Wall)',
            instructions: 'Hold B Plat cross from Broken Wall.',
            lineupIds: [],
            position: pt('cobblestone', 68, 66)
          },
          {
            slot: 3,
            role: 'AWP',
            playerName: 'CT 3 (Chicken Coop AWP)',
            instructions: 'Hold B Plat from Chicken Coop.',
            lineupIds: [],
            position: pt('cobblestone', 64, 76)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'CT 4 (Fountain)',
            instructions: 'Anchor Fountain with late smoke.',
            lineupIds: [],
            position: pt('cobblestone', 68, 66)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'CT 5 (A Site Statue)',
            instructions: 'Watch Courtyard and A Long.',
            lineupIds: [],
            position: pt('cobblestone', 34, 74)
          }
        ]
      }
    ]
  },

  // ============================================================================
  // BONUS PISTOL & FORCE-BUY META STRATEGIES (Dust II, Mirage, Inferno)
  // ============================================================================
  {
    id: 'dust2-pistol-b-tunnel-mid-pinch',
    title: 'Dust II Pistol Round B-Tunnels & Mid Xbox Pinch',
    mapId: 'dust2',
    side: 't',
    buyType: 'pistol',
    targetSite: 'B',
    summary:
      'CS2Flow high-winrate Dust II T-Pistol round. 1 support player buys Xbox smoke + 2 flashes for a 3-man Mid-to-B split while 2 Glocks burst Upper B Tunnels.',
    tags: ['CS2Flow', 'Pistol', 'B Split', 'B Site'],
    isCustom: false,
    createdAt: '2026-02-11',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Xbox Smoke & Mid Doors Double Flash (1:55 - 1:35)',
        description:
          'Smoke Xbox, flash Mid Doors, and sprint 3 players through Mid Doors toward B Window.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Mid Utility Caller)',
            instructions: 'Buy Smoke + 2 Flashes; smoke Xbox and flash Mid Doors twice.',
            lineupIds: [],
            position: pt('dust2', 48, 43)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Mid Doors Point)',
            instructions: 'Kevlar Glock rush through Mid Doors to B Window.',
            lineupIds: [],
            position: pt('dust2', 47, 34)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Mid Doors Trade)',
            instructions: 'Follow Point player through Mid Doors to B Doors.',
            lineupIds: [],
            position: pt('dust2', 36, 42)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (B Tunnels Entry)',
            instructions: 'Wait in Upper B Tunnels; burst out onto Back Plat when Mid flashes pop.',
            lineupIds: [],
            position: pt('dust2', 18, 50)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (B Tunnels Bomb Carrier)',
            instructions: 'Follow Tunnels Entry and plant B Default.',
            lineupIds: [],
            position: pt('dust2', 26, 24)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: B Site Swarm & Post-Plant Lock (1:35 - 1:00)',
        description:
          'Overwhelm the solo B CT from Window, Doors, and Tunnels.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Outside B Doors)',
            instructions: 'Hold CT Spawn retake.',
            lineupIds: [],
            position: pt('dust2', 26, 24)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (B Window)',
            instructions: 'Hold B Window position.',
            lineupIds: [],
            position: pt('dust2', 27, 15)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Big Box)',
            instructions: 'Crossfire Doors and Window.',
            lineupIds: [],
            position: pt('dust2', 20, 13)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (B Car)',
            instructions: 'Lock down B Car and Tunnels.',
            lineupIds: [],
            position: pt('dust2', 11, 25)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Back Plat Planter)',
            instructions: 'Plant and hold Back Plat.',
            lineupIds: [],
            position: pt('dust2', 20, 13)
          }
        ]
      }
    ]
  },
  {
    id: 'mirage-pistol-palace-contact-a',
    title: 'Mirage Pistol Palace Contact & Ramp Pop-Flash Burst',
    mapId: 'mirage',
    side: 't',
    buyType: 'pistol',
    targetSite: 'A',
    summary:
      'CS2Flow Mirage T-Pistol execute. 2 players creep through Palace while 3 wait at A Ramp with Stairs + Jungle smokes and double pop-flashes.',
    tags: ['CS2Flow', 'Pistol', 'A Site', 'Execute'],
    isCustom: false,
    createdAt: '2026-02-11',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Silent Palace Walk & Ramp Smokes (1:55 - 1:35)',
        description:
          'Walk Palace up to pillars; on contact, throw Stairs smoke and Ramp flashes.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Ramp Utility)',
            instructions: 'Throw Stairs smoke and high Ramp flash when Palace takes contact.',
            lineupIds: [],
            position: pt('mirage', 73, 65)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (A Ramp Entry)',
            instructions: 'Scale Tetris and jump to Triple.',
            lineupIds: [],
            position: pt('mirage', 64, 65)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Ramp Bomb Carrier)',
            instructions: 'Smoke Jungle/Con and carry bomb to Default.',
            lineupIds: [],
            position: pt('mirage', 56, 76)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Palace Point)',
            instructions: 'Walk out Balcony to clear Under Palace and Stairs.',
            lineupIds: [],
            position: pt('mirage', 74, 77)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Palace Trade)',
            instructions: 'Trade Palace Point and wrap CT Ticket.',
            lineupIds: [],
            position: pt('mirage', 74, 77)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: CT Ticket Pinch & Plant (1:35 - 1:00)',
        description:
          'Plant for Palace and Ramp while swarming Ticket Booth.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (Tetris)',
            instructions: 'Watch Connector and Stairs.',
            lineupIds: [],
            position: pt('mirage', 64, 65)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Triple)',
            instructions: 'Hold CT Spawn from Triple.',
            lineupIds: [],
            position: pt('mirage', 53, 70)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Default Planter)',
            instructions: 'Plant Default A.',
            lineupIds: [],
            position: pt('mirage', 56, 76)
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Ticket Push)',
            instructions: 'Clear Ticket Booth.',
            lineupIds: [],
            position: pt('mirage', 45, 78)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Balcony)',
            instructions: 'Hold Balcony post-plant.',
            lineupIds: [],
            position: pt('mirage', 74, 77)
          }
        ]
      }
    ]
  },
  {
    id: 'inferno-force-second-mid-boiler',
    title: 'Inferno Second Mid to Boiler & Moto Fast Crunch',
    mapId: 'inferno',
    side: 't',
    buyType: 'force_buy',
    targetSite: 'A',
    summary:
      'High-tempo Force-Buy / Half-Buy A rush on Inferno. Sprint Second Mid through Apartments and Boiler with Mac-10s/Galils, smoking Moto and flashing Short.',
    tags: ['Pro Meta', 'Force Buy', 'Short A', 'Fast Execute'],
    isCustom: false,
    createdAt: '2026-02-11',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Second Mid Sprint & Moto Smoke (1:55 - 1:35)',
        description:
          'Smoke Long Corner and Moto on the move while 2 players rush Balcony and 3 rush Boiler/Short.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (Short Point Entry)',
            instructions: 'Sprint out Boiler behind Top Mid flash and wrap Truck to Site.',
            lineupIds: [],
            position: pt('inferno', 70, 73)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Balcony Jumper)',
            instructions: 'Rush A Apartments and jump out Balcony onto Pit roof.',
            lineupIds: [],
            position: pt('inferno', 71, 83)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Moto Smoker)',
            instructions: 'Throw Moto smoke from Second Mid and flash over Boiler roof.',
            lineupIds: [],
            position: pt('inferno', 57, 69)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Arch Cutoff)',
            instructions: 'Smoke Long Corner and hold Arch pinch.',
            lineupIds: [],
            position: pt('inferno', 74, 45)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Banana Noise)',
            instructions: 'Throw Bottom Banana utility to keep 2 CTs on B.',
            lineupIds: [],
            position: pt('inferno', 43, 54)
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Close-Range Site Take (1:35 - 1:00)',
        description:
          'Plant A Site Default and play close angles in Pit and Short.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Entry',
            playerName: 'Player 1 (A Site Default)',
            instructions: 'Plant and tuck Default.',
            lineupIds: [],
            position: pt('inferno', 81, 70)
          },
          {
            slot: 2,
            role: 'Entry',
            playerName: 'Player 2 (Big Pit)',
            instructions: 'Hold close Pit.',
            lineupIds: [],
            position: pt('inferno', 91, 78)
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Short Quad)',
            instructions: 'Hold Quad corner.',
            lineupIds: [],
            position: pt('inferno', 70, 73)
          },
          {
            slot: 4,
            role: 'IGL',
            playerName: 'Player 4 (Boiler)',
            instructions: 'Hold Boiler crossfire.',
            lineupIds: [],
            position: pt('inferno', 57, 69)
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Mid Flank)',
            instructions: 'Lurk Top Mid.',
            lineupIds: [],
            position: pt('inferno', 44, 68)
          }
        ]
      }
    ]
  }
]
