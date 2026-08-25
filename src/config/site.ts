/**
 * ============================================================
 * CS2 STRATBOOK — MASTER SITE CONFIGURATION
 * ============================================================
 * Edit THIS FILE to customize every label, icon name,
 * color, nav tab, and nade type across the entire website.
 * No need to touch any component or store.
 * ============================================================
 */

// ── BRANDING ──────────────────────────────────────────────
export const BRANDING = {
  siteTitle:   'Protutech',
  teamName:    'Tactical Hub',
  tagline:     'CS2 Utility & Strategy Platform',
  version:     'v2.0',
  discordInvite: 'https://discord.gg/XEDqfYEW5h',
  footerLeft:  'Protutech // CS2 Tactical Hub',
  footerItems: [],
}

// ── NAVIGATION TAB LABELS ──────────────────────────────────
export const NAV_LABELS = {
  radar:     'Radar',
  strats:    'Stratbook',
  tactics:   'Tactics Board',
  library:   'Lineup Library',
  myLineups: 'My Lineups',
  callouts:  'Callouts',
  gameRoom:  'Live Room',
  admin:     'Admin',
}

// ── GRENADE TYPE CONFIG ────────────────────────────────────
// Change label, color, SVG icon path, or filter short name here
export const NADE_CONFIG = {
  smoke: {
    label:      'Smokes',
    shortLabel: 'SMOKE',
    color:      '#94a3b8',  // slate-400
    glowColor:  '#94a3b833',
    bgClass:    'bg-slate-500/20',
    textClass:  'text-slate-400',
    borderClass:'border-slate-500/40',
  },
  flash: {
    label:      'Flashes',
    shortLabel: 'FLASH',
    color:      '#eab308',  // yellow-500
    glowColor:  '#eab30833',
    bgClass:    'bg-yellow-500/20',
    textClass:  'text-yellow-400',
    borderClass:'border-yellow-500/40',
  },
  molotov: {
    label:      'Molotovs',
    shortLabel: 'MOLO',
    color:      '#ef4444',  // red-500
    glowColor:  '#ef444433',
    bgClass:    'bg-red-500/20',
    textClass:  'text-red-400',
    borderClass:'border-red-500/40',
  },
  he: {
    label:      'HE Nades',
    shortLabel: 'HE',
    color:      '#22c55e',  // green-500
    glowColor:  '#22c55e33',
    bgClass:    'bg-green-500/20',
    textClass:  'text-green-400',
    borderClass:'border-green-500/40',
  },
  decoy: {
    label:      'Decoys',
    shortLabel: 'DECOY',
    color:      '#a855f7',  // purple-500
    glowColor:  '#a855f733',
    bgClass:    'bg-purple-500/20',
    textClass:  'text-purple-400',
    borderClass:'border-purple-500/40',
  },
} as const

export type NadeType = keyof typeof NADE_CONFIG

// ── TEAM SIDE CONFIG ───────────────────────────────────────
export const SIDE_CONFIG = {
  t: {
    label:     'Terrorist',
    shortLabel:'T',
    color:     '#f97316',   // orange-500
    bgClass:   'bg-amber-500/20',
    textClass: 'text-amber-400',
  },
  ct: {
    label:     'Counter-Terrorist',
    shortLabel:'CT',
    color:     '#38bdf8',   // sky-400
    bgClass:   'bg-sky-500/20',
    textClass: 'text-sky-400',
  },
  all: {
    label:     'Both Sides',
    shortLabel:'ALL',
    color:     '#334155',
    bgClass:   'bg-slate-700/30',
    textClass: 'text-slate-400',
  },
}

// ── THROW TYPE LABELS ──────────────────────────────────────
export const THROW_TYPE_LABELS: Record<string, string> = {
  standing:         'Standing (Left-Click)',
  jumpthrow:        'Jumpthrow',
  runthrow:         'Runthrow',
  crouch_jumpthrow: 'Crouch + Jumpthrow',
  left_right_click: 'Left + Right Click',
  w_jumpthrow:      'W-Key Jumpthrow',
}

// ── IN-GAME PLAYER ROLES ───────────────────────────────────
export const PLAYER_ROLES = ['IGL', 'Entry Fragger', 'Support', 'AWPer', 'Lurker', 'Anchor', 'Flex'] as const
export type PlayerRole = typeof PLAYER_ROLES[number]

// ── USER SYSTEM ROLES ──────────────────────────────────────
export const USER_ROLES = ['admin', 'coach', 'player', 'guest'] as const
export type UserRole = typeof USER_ROLES[number]

// ── DIFFICULTY LABELS ─────────────────────────────────────
export const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   color: '#22c55e', textClass: 'text-green-400' },
  medium: { label: 'Medium', color: '#eab308', textClass: 'text-yellow-400' },
  hard:   { label: 'Hard',   color: '#ef4444', textClass: 'text-red-400' },
}

// ── THEME COLORS ───────────────────────────────────────────
export const THEME = {
  accentColor:       '#de9b35',   // CS2 Gold (primary glow)
  accentHover:       '#f59e0b',
  accentDark:        '#92400e',
  backgroundPrimary: '#0b0e14',
  backgroundCard:    '#0f172a',
  backgroundBorder:  '#1e293b',
  radarDefaultOpacity: 0.92,
  mapContainerHeight:  '720px',
}

// ── PRESET THEME ACCENT COLORS (ADMIN PANEL) ──────────────
export const ACCENT_PRESETS = [
  { name: 'CS2 Gold',         hex: '#de9b35' },
  { name: 'Cyber Cyan',       hex: '#00f0ff' },
  { name: 'Tactical Emerald', hex: '#10b981' },
  { name: 'Crimson Flame',    hex: '#f43f5e' },
  { name: 'Electric Purple',  hex: '#a855f7' },
  { name: 'Amber Glow',       hex: '#f59e0b' },
  { name: 'Ice Blue',         hex: '#38bdf8' },
  { name: 'Neon Lime',        hex: '#84cc16' },
]

// ── RADAR MINIMAP UI TEXT ──────────────────────────────────
export const MINIMAP_TEXT = {
  placementOrigin:  'Step 1: Click where you STAND to throw (Origin)',
  placementLanding: 'Step 2: Click where the grenade LANDS (Target)',
  cancelPlacement:  'Cancel',
  changeRadar:      'Change Radar',
  zoom:             'Zoom',
  addNade:          'Add Nade',
}

// ── GAME ROOM CONFIG ───────────────────────────────────────
export const GAME_ROOM = {
  roomCodeLength:  6,
  maxRoomMembers:  10,
  chatMaxLength:   200,
  syncInterval:    5000,  // ms between auto-sync polls
  drawColors: ['#de9b35', '#ef4444', '#22c55e', '#38bdf8', '#a855f7', '#ffffff'],
}

// ── DEFAULT ADMIN CREDENTIALS (first-run only) ────────────
export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',   // ← Change this after first login!
}
