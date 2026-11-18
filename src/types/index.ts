export type GrenadeType = 'smoke' | 'flash' | 'molotov' | 'he' | 'decoy'

export type TeamSide = 'all' | 't' | 'ct'
export type SideType = 't' | 'ct' | 'any' | 'all'

export type ThrowType =
  | 'standing'
  | 'jumpthrow'
  | 'runthrow'
  | 'run_jumpthrow'
  | 'walkthrow'
  | 'crouch'
  | 'crouchthrow'
  | 'crouch_jumpthrow'
  | 'left_right_click'
  | 'rightclick'
  | 'middleclick'
  | 'w_jumpthrow'

export type MovementType =
  | 'stationary'
  | 'walking'
  | 'running'
  | 'crouched'
  | 'walk'
  | 'run'
  | 'crouch'
  | 'crouch_walk'

export type MouseClickType = 'left' | 'right' | 'both'

export type TickrateType = 'cs2_subtick' | '64_tick' | '128_tick' | 'all' | '128' | '64' | 'any'

export type RadarFloorId = 'upper' | 'lower'
export type LayoutMode = 'auto' | 'desktop' | 'mobile'
export type PlayerRole = 'IGL' | 'Entry' | 'Support' | 'Lurker' | 'AWPer' | 'AWP' | 'Flex'
export type ExecuteStrategyType =
  | 'A Execute'
  | 'B Execute'
  | 'Mid Control'
  | 'Split'
  | 'Fast Rush'
  | 'Default'
  | 'Retake'
  | 'Fake'

export interface Coordinates {
  x: number // percentage 0-100 across map viewBox
  y: number // percentage 0-100 down map viewBox
}

export type Point2D = Coordinates

export interface CS2WorldCoords {
  x: number
  y: number
  z: number
  pitch: number
  yaw: number
  roll?: number
}

export interface MapCallout {
  id: string
  name: string
  site?: 'A' | 'B' | 'Mid' | 'Spawn' | 'Other'
  coords: Coordinates
  floor?: RadarFloorId
  description?: string
  commonNades?: string[]
  aliases?: string[]
}

export type CalloutZone = MapCallout

export interface RadarFloor {
  id: RadarFloorId
  label: string
  image: string
  simpleRadarImage?: string
  zMin?: number
  zMax?: number
}

export interface MapRadarCalibration {
  pos_x: number
  pos_y: number
  scale: number
  rotate?: number
  zSplitThreshold?: number
}

export interface MapInfo {
  id: string
  name: string
  code: string // e.g. de_mirage
  activePool: boolean
  radarImage: string // Official 1024x1024 radar image
  simpleRadarImage?: string // SimpleRadar high-contrast 1024x1024 radar image
  bannerImage?: string // Scenic map banner image
  customRadarImage?: string // User uploaded custom radar image
  radarFloors?: RadarFloor[]
  calibration?: MapRadarCalibration
  viewBox: string
  sites: {
    a: Coordinates
    b: Coordinates
  }
  callouts: MapCallout[]
  description: string
  thumbnail: string
  icon?: string
  minimap?: string
  isCustom?: boolean
}

export interface LineupInstructionStep {
  id: string
  stepNumber: number
  phase: 'position' | 'aim' | 'movement' | 'throw' | 'result'
  title: string
  description: string
  imageUrl?: string
  keybindHint?: string
  crosshairNote?: string
}

export interface Lineup {
  id: string
  title: string
  mapId: string
  grenadeType: GrenadeType
  side: TeamSide
  throwType: ThrowType
  movementType?: MovementType
  clickType?: MouseClickType
  tickrate: TickrateType

  // Map positioning
  originCoords: Coordinates
  landingCoords: Coordinates
  radarFloor?: RadarFloorId
  curveOffset?: number

  // Locations & Tags
  startLocation: string
  endLocation: string
  site?: 'A' | 'B' | 'Mid' | 'Spawn' | 'General'
  tags: string[]

  // Multi-Format Media & Guides
  videoUrl?: string
  imageUrl?: string
  standingScreenshot?: string
  aimScreenshot?: string
  landingScreenshot?: string
  screenshots?: string[]
  extraImages?: string[]
  instructionSteps?: LineupInstructionStep[]
  cs2Pos?: { x: number; y: number; z: number; pitch?: number; yaw?: number; roll?: number }
  landingWorldCoords?: { x: number; y: number; z: number }
  airTimeSeconds?: number

  // Instructions & Scripts
  description?: string
  instructions: string[]
  consoleCommand?: string
  practiceConfig?: string
  practiceScript?: string

  // Metadata & Community Sources
  playerRole?: PlayerRole
  proPlayer?: string
  proTeam?: string
  tournament?: string
  externalId?: string
  viewsCount?: number
  difficulty: 'easy' | 'medium' | 'hard'
  author?: string
  authorName?: string
  userId?: string
  sourceWebsite?: string
  sourceUrl?: string
  isCustom?: boolean
  inLibrary?: boolean
  isTeamShared?: boolean
  isFavorite?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ExecuteUtilityStep {
  order: number
  lineupId: string
  playerRole: PlayerRole
  playerName?: string
  delaySeconds: number
  roundClock?: string
  notes?: string
}

export interface NadeExecute {
  id: string
  title: string
  mapId: string
  side: TeamSide
  site?: string
  strategyType?: ExecuteStrategyType
  description?: string
  lineupIds: string[]
  steps?: ExecuteUtilityStep[]
  tags?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
  isShared?: boolean
  author?: string
  createdAt?: string
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
  executeId?: string
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

export interface RadarTargetCluster {
  id: string
  coords: Point2D
  endLocation: string
  grenadeType: GrenadeType
  lineups: Lineup[]
  primaryLineup: Lineup
}

export type IntegrationStatusLevel = 'completed' | 'practice_only' | 'restricted'

export interface CS2IntegrationCapability {
  id: string
  name: string
  method:
    | 'GSI'
    | 'RCON'
    | 'CLIPBOARD_GETPOS'
    | 'PRACTICE_CFG'
    | 'DEMO_PARSER'
    | 'MEMORY_INJECTION'
  status: IntegrationStatusLevel
  title: string
  summary: string
  technicalDetails: string
  supportedEnvironments: string[]
  limitations: string[]
}

export interface CS2UpdateItem {
  id: string
  title: string
  date: string
  category: 'patch_note' | 'leak' | 'lineup_impact'
  source: 'Valve Official' | 'Gabe Follower' | 'ThourCS' | 'Aquarius' | 'Community Datamine'
  sourceHandle?: string
  sourceUrl?: string
  version?: string
  summary: string
  details: string[]
  affectedMaps?: string[]
  lineupImpact?: 'none' | 'low' | 'medium' | 'high'
  tags: string[]
}
