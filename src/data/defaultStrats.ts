import type { Strategy } from '../types'

export const DEFAULT_STRATS: Strategy[] = [
  {
    id: 'mirage-a-full-execute',
    title: 'Mirage A Site 3-Smoke Full Execute',
    mapId: 'mirage',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'A',
    summary: 'Standard tier-1 competitive A execute. Combines Stairs, Jungle/Con, and Ticket smokes with synchronized A-Ramp and Palace flashes.',
    tags: ['Execute', 'Standard', 'A Site', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-01-15',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Setup & Palace Control (0:00 - 0:25)',
        description: 'Take Palace presence quietly without giving away the execute. 3 players stack A Ramp utility spots.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            playerName: 'Player 1 (IGL)',
            instructions: 'Call lineup timing. Throw Stairs smoke on 1:45 mark.',
            lineupIds: ['mirage-smoke-stairs-tspawn'],
            position: { x: 67.8, y: 64.2 }
          },
          {
            slot: 2,
            role: 'Support',
            playerName: 'Player 2 (Support)',
            instructions: 'Line up Jungle / Con smoke and throw simultaneously with IGL.',
            lineupIds: ['mirage-smoke-jungle-connector'],
            position: { x: 68.2, y: 65.5 }
          },
          {
            slot: 3,
            role: 'Support',
            playerName: 'Player 3 (Support)',
            instructions: 'Line up CT Ticket smoke and popflash over A ramp on execute call.',
            lineupIds: ['mirage-smoke-ct-ticket', 'mirage-flash-a-high-pop'],
            position: { x: 66.5, y: 66.8 }
          },
          {
            slot: 4,
            role: 'Entry',
            playerName: 'Player 4 (Entry Fragger)',
            instructions: 'Wait at A ramp edge behind Tetris smoke wall, peek Default on flash pop.',
            lineupIds: ['mirage-molotov-under-palace'],
            position: { x: 67.2, y: 47.0 }
          },
          {
            slot: 5,
            role: 'Lurker',
            playerName: 'Player 5 (Palace Anchor)',
            instructions: 'Hold deep Palace, molotov under palace and jump out Balcony on smoke bloom.',
            lineupIds: [],
            position: { x: 88.0, y: 55.0 }
          }
        ]
      },
      {
        id: 'p2',
        name: 'Phase 2: Site Breach & Bomb Plant (0:25 - 0:45)',
        description: 'Entry fragger slides to Default, clears Close Tetris, plants standard Default while Palace player locks down CT rotate.',
        playerAssignments: [
          {
            slot: 1,
            role: 'IGL',
            instructions: 'Move to Tetris, cover CT Ticket smoke push.',
            lineupIds: [],
            position: { x: 67.0, y: 46.0 }
          },
          {
            slot: 2,
            role: 'Support',
            instructions: 'Hold stairs smoke push and connector cross.',
            lineupIds: [],
            position: { x: 64.0, y: 38.0 }
          },
          {
            slot: 3,
            role: 'Support',
            instructions: 'Plant bomb safely for A Ramp / Palace.',
            lineupIds: [],
            position: { x: 74.0, y: 38.0 }
          },
          {
            slot: 4,
            role: 'Entry',
            instructions: 'Clear Ninja and Shadow, secure site perimeter.',
            lineupIds: [],
            position: { x: 76.0, y: 42.0 }
          },
          {
            slot: 5,
            role: 'Lurker',
            instructions: 'Post-plant palace hold.',
            lineupIds: [],
            position: { x: 86.0, y: 52.0 }
          }
        ]
      }
    ]
  },
  {
    id: 'mirage-fast-mid-split',
    title: 'Mirage Fast Mid Control & B Split',
    mapId: 'mirage',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'Mid',
    summary: 'Instant window smoke into fast Catwalk / Connector pressure, splitting B through Market and Short.',
    tags: ['Mid Control', 'Split', 'Fast Execute'],
    isCustom: false,
    createdAt: '2026-01-16',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Window Smoke & Top Mid Take',
        description: 'Instant window smoke off spawn, flash over Top Mid, fast boost / walk to Catwalk.',
        playerAssignments: [
          {
            slot: 1,
            role: 'AWP',
            instructions: 'Throw instant window smoke, then peek Connector / Underpass.',
            lineupIds: ['mirage-smoke-window-tspawn'],
            position: { x: 38.5, y: 86.2 }
          },
          {
            slot: 2,
            role: 'Entry',
            instructions: 'Rush Top Mid to Catwalk, molotov B Short.',
            lineupIds: [],
            position: { x: 44.0, y: 66.0 }
          },
          {
            slot: 3,
            role: 'Support',
            instructions: 'Follow entry onto Catwalk, smoke Market door from Short.',
            lineupIds: ['mirage-smoke-b-market-door'],
            position: { x: 38.0, y: 45.0 }
          },
          {
            slot: 4,
            role: 'Support',
            instructions: 'Push B Apartments simultaneously on Short contact call.',
            lineupIds: ['mirage-smoke-b-short-cat', 'mirage-molotov-b-van'],
            position: { x: 20.0, y: 58.0 }
          },
          {
            slot: 5,
            role: 'Lurker',
            instructions: 'Hold Underpass / TV room against CT flank.',
            lineupIds: [],
            position: { x: 50.0, y: 55.0 }
          }
        ]
      }
    ]
  },
  {
    id: 'inferno-b-banana-execute',
    title: 'Inferno B Site Banana Take & Coffins Execute',
    mapId: 'inferno',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary: 'Clear Banana with aggressive car/sandbags molotovs, establish half-wall control, then drop Coffins + CT cross smokes.',
    tags: ['Banana', 'B Site', 'Standard'],
    isCustom: false,
    createdAt: '2026-01-17',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Banana Clearance & Utility Dump',
        description: 'Burn car, pop flash top banana, and claim half-wall.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            instructions: 'Throw Car molotov from bottom banana, then prepare Coffins smoke.',
            lineupIds: ['inferno-molotov-car-sandbags', 'inferno-smoke-coffins'],
            position: { x: 30.2, y: 47.8 }
          },
          {
            slot: 2,
            role: 'Support',
            instructions: 'Throw CT cross smoke and popflash over church roof.',
            lineupIds: ['inferno-smoke-ct-banana'],
            position: { x: 29.5, y: 48.2 }
          },
          {
            slot: 3,
            role: 'Entry',
            instructions: 'Run up banana behind popflash, clear new box and fountain.',
            lineupIds: [],
            position: { x: 28.0, y: 35.0 }
          },
          {
            slot: 4,
            role: 'Entry',
            instructions: 'Second man in, trade entry, plant 1st or 2nd oranges.',
            lineupIds: [],
            position: { x: 28.0, y: 22.0 }
          },
          {
            slot: 5,
            role: 'Lurker',
            instructions: 'Hold 2nd Mid / Apps for early CT aggression.',
            lineupIds: [],
            position: { x: 60.0, y: 68.0 }
          }
        ]
      }
    ]
  },
  {
    id: 'nuke-outside-secret-wall',
    title: 'Nuke Outside 3-Smoke Secret Wall & Lower Rush',
    mapId: 'nuke',
    side: 't',
    buyType: 'full_buy',
    targetSite: 'B',
    summary: 'Deploy cross smokes outside to completely blind Garage and Mini, flooding Secret into B site for an uncontested plant.',
    tags: ['Outside Wall', 'Secret Split', 'Pro Meta'],
    isCustom: false,
    createdAt: '2026-01-18',
    phases: [
      {
        id: 'p1',
        name: 'Phase 1: Wall of Smokes & Secret Sprint',
        description: 'All three outside smokes bloom together at 1:40, 4 players sprint Secret.',
        playerAssignments: [
          {
            slot: 1,
            role: 'Support',
            instructions: 'Throw Garage Cross Smoke #1.',
            lineupIds: ['nuke-smoke-outside-garage'],
            position: { x: 18.0, y: 48.0 }
          },
          {
            slot: 2,
            role: 'Support',
            instructions: 'Throw Secret Cross Smoke #2.',
            lineupIds: ['nuke-smoke-outside-secret'],
            position: { x: 18.0, y: 48.0 }
          },
          {
            slot: 3,
            role: 'Entry',
            instructions: 'Sprint down Secret stairs, clear B doors and plant lower.',
            lineupIds: [],
            position: { x: 50.0, y: 62.0 }
          },
          {
            slot: 4,
            role: 'Entry',
            instructions: 'Follow entry down Secret, clear Vents / Dark.',
            lineupIds: [],
            position: { x: 52.0, y: 60.0 }
          },
          {
            slot: 5,
            role: 'Lurker',
            instructions: 'Throw Squeaky / Hut noise utility on A site to delay rotates.',
            lineupIds: ['nuke-smoke-heaven'],
            position: { x: 22.0, y: 46.0 }
          }
        ]
      }
    ]
  }
]
