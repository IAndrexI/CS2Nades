export type GrenadeType = 'smoke' | 'flash' | 'molotov' | 'he' | 'decoy'

export type TeamSide = 'all' | 't' | 'ct'

export type ThrowType = 
  | 'standing' 
  | 'jumpthrow' 
  | 'runthrow' 
  | 'run_jumpthrow' 
  | 'crouch' 
  | 'crouch_jumpthrow' 
  | 'left_right_click' 
  | 'w_jumpthrow'

export type MovementType = 'stationary' | 'walking' | 'running' | 'crouched'

export type TickrateType = 'cs2_subtick' | '64_tick' | '128_tick' | 'all'

export interface Coordinates {
  x: number // percentage 0-100 across map viewBox
  y: number // percentage 0-100 down map viewBox
}

export interface MapCallout {
  id: string
  name: string
  site?: 'A' | 'B' | 'Mid' | 'Spawn' | 'Other'
  coords: Coordinates
  floor?: 'upper' | 'lower'
}

export interface RadarFloor {
  id: 'upper' | 'lower'
  label: string
  image: string
}

export interface MapInfo {
  id: string
  name: string
  code: string // e.g. de_mirage
  activePool: boolean
  radarImage?: string // Official / Default radar image URL or local path
  customRadarImage?: string // User uploaded custom radar image
  radarFloors?: RadarFloor[]
  viewBox: string
  sites: {
    a: Coordinates
    b: Coordinates
  }
  callouts: MapCallout[]
  description: string
  thumbnail: string
  icon?: string // Map logo icon from /map-icons/
  minimap?: string // Map overview texture from /minimaps/
  isCustom?: boolean
}

export interface Lineup {
  id: string
  title: string
  mapId: string
  grenadeType: GrenadeType
  side: TeamSide
  throwType: ThrowType
  movementType?: MovementType
  tickrate: TickrateType
  
  // Map positioning
  originCoords: Coordinates // Where the player stands
  landingCoords: Coordinates // Where the grenade detonates
  curveOffset?: number // Trajectory curve control
  
  // Locations & Tags
  startLocation: string // e.g. "T Spawn", "Palace", "Banana"
  endLocation: string // e.g. "A Site Stairs", "Window", "Coffins"
  site?: 'A' | 'B' | 'Mid' | 'Spawn' | 'General'
  tags: string[]
  
  // Media & Guides
  videoUrl?: string // YouTube, Streamable, or direct MP4
  imageUrl?: string // Main lineup preview image / gif
  standingScreenshot?: string // Where to stand
  aimScreenshot?: string // Where crosshair aligns
  
  // Instructions
  description?: string
  instructions: string[]
  consoleCommand?: string // setpos / setang command
  
  // Metadata
  difficulty: 'easy' | 'medium' | 'hard'
  author?: string
  authorName?: string
  userId?: string
  isCustom?: boolean
  inLibrary?: boolean
  isTeamShared?: boolean
  createdAt: string
  updatedAt?: string
}

export interface StratPlayerAssignment {
  slot: 1 | 2 | 3 | 4 | 5
  role: 'IGL' | 'Entry' | 'Support' | 'Lurker' | 'AWP' | 'Flex'
  playerName?: string
  lineupIds: string[]
  instructions: string
  position: Coordinates
}

export interface StratPhase {
  id: string
  name: string
  description: string
  durationSeconds?: number
  playerAssignments: StratPlayerAssignment[]
}

export interface Strategy {
  id: string
  title: string
  mapId: string
  side: 't' | 'ct'
  buyType: 'full_buy' | 'semi_buy' | 'force_buy' | 'eco' | 'pistol'
  targetSite?: 'A' | 'B' | 'Mid' | 'Default' | 'Fast' | 'Fake'
  summary: string
  phases: StratPhase[]
  tacticsDrawings?: TacticsElement[]
  tags: string[]
  isCustom?: boolean
  createdAt: string
  updatedAt?: string
}

export type TacticsElementType = 
  | 'line' 
  | 'arrow' 
  | 'pen'
  | 'circle' 
  | 'text' 
  | 'player_t' 
  | 'player_ct' 
  | 'player_icon' 
  | 'smoke_cloud' 
  | 'flash_burst' 
  | 'molotov_fire'
  | 'he_blast'
  | 'c4_bomb'
  | 'plant_a'
  | 'plant_b'

export interface TacticsElement {
  id: string
  type: TacticsElementType
  color: string
  points: Coordinates[]
  text?: string
  playerRole?: string
  playerNum?: number | string
  radius?: number
  strokeWidth?: number
  authorId?: string
  authorUsername?: string
  authorAvatar?: string
}

export interface NadeExecute {
  id: string
  title: string
  mapId: string
  side: TeamSide
  site?: string
  description?: string
  lineupIds: string[]
  author?: string
  createdAt?: string
}

export interface UserSocials {
  steamUrl?: string
  steamId?: string
  discordTag?: string
  discordWebhook?: string
  reddit?: string
  youtube?: string
  twitter?: string
  twitch?: string
}

export interface UserPrivacy {
  hideSteam?: boolean
  hideSocials?: boolean
  hideDetails?: boolean
  hideLineups?: boolean
  hideFromList?: boolean
}

export interface UserNotifications {
  emailLineups?: boolean
  emailStrats?: boolean
  discordAlerts?: boolean
  highlightColor?: string
}

export interface UserProfile {
  id: string
  steamId?: string
  username: string
  email?: string
  emailVerified?: boolean
  isGuest?: boolean
  hasFullAccess?: boolean
  role: 'admin' | 'coach' | 'player' | 'guest'
  inGameRole?: string
  avatar?: string
  banner?: string
  bio?: string
  gender?: string
  birthday?: string
  socials?: UserSocials
  privacy?: UserPrivacy
  notifications?: UserNotifications
  themeColor?: string
  following?: string[]
  createdAt?: string
}

export interface DirectMessage {
  id: string
  senderId: string
  senderUsername: string
  senderAvatar?: string
  recipientId: string
  text: string
  createdAt: string
  read?: boolean
}
