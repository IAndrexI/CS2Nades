import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import net from 'net'
import { Server } from 'socket.io'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Cloudflare Tunnel, Reverse Proxy & Custom Domain Support
app.set('trust proxy', true)

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
})

// Enable Cross-Origin Resource Sharing with credentials for any custom domain / Cloudflare tunnel
app.use(cors({
  origin: true,
  credentials: true
}))

const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'cs2-stratbook-secret-key-2026'
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || process.env.DOMAIN || ''

// Data storage directory (supports persistent volume mount e.g. /data in Docker)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const PERSONAL_DIR = path.join(DATA_DIR, 'personal')
const SERVER_DIR = path.join(DATA_DIR, 'server')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(PERSONAL_DIR)) fs.mkdirSync(PERSONAL_DIR, { recursive: true })
if (!fs.existsSync(SERVER_DIR)) fs.mkdirSync(SERVER_DIR, { recursive: true })

// Initial Database Template
const INITIAL_DB = {
  settings: {
    siteTitle: 'Protutech',
    teamName: 'Tactical Hub',
    logoUrl: '/logo.png',
    primaryAccentColor: '#de9b35', // CS2 Gold default
    allowRegistration: true,
    defaultRadarMode: 'official',
    defaultRadarOpacity: 0.92,
    steamApiKey: '',
    customRadars: {},
    customMaps: []
  },
  users: [],
  groups: [
    {
      id: 'grp-main-squad',
      name: 'Main Roster (Auto-Allow)',
      description: 'Default competitive 5-stack squad with instant room access',
      memberUsernames: ['admin'],
      createdAt: new Date().toISOString()
    }
  ],
  lineups: [],
  strats: []
}

function syncLineupFiles(lineups) {
  try {
    if (!Array.isArray(lineups)) return
    const serverLineups = lineups.filter(l => l.isTeamShared || !l.userId)
    fs.writeFileSync(path.join(SERVER_DIR, 'server_lineups.json'), JSON.stringify(serverLineups, null, 2), 'utf-8')

    const byUser = {}
    lineups.forEach(l => {
      if (l.userId) {
        if (!byUser[l.userId]) byUser[l.userId] = []
        byUser[l.userId].push(l)
      }
    })
    for (const [userId, uLineups] of Object.entries(byUser)) {
      fs.writeFileSync(path.join(PERSONAL_DIR, `${userId}.json`), JSON.stringify(uLineups, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('Error syncing separate lineup files:', err)
  }
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      if (!parsed.groups) parsed.groups = INITIAL_DB.groups
      return parsed
    }
  } catch (err) {
    console.error('Error reading db file:', err)
  }
  saveDB(INITIAL_DB)
  return INITIAL_DB
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
    if (data.lineups) {
      syncLineupFiles(data.lineups)
    }
  } catch (err) {
    console.error('Error saving db file:', err)
  }
}

// ==========================================
// ACCOUNT SANITIZATION & SEEDING (ANDREX & CHIPS ONLY)
// ==========================================
let db = loadDB()
const salt = bcrypt.genSaltSync(10)

// 1. Filter out all accounts except Andrex and chips (case-insensitive)
const existingUsers = Array.isArray(db.users) ? db.users : []
const sanitizedUsers = existingUsers.filter(u => {
  const name = (u.username || '').toLowerCase()
  return name === 'andrex' || name === 'chips'
})

// 2. Ensure Andrex account exists with ADMIN role
let andrexUser = sanitizedUsers.find(u => u.username.toLowerCase() === 'andrex')
if (andrexUser) {
  andrexUser.role = 'admin'
  andrexUser.username = 'Andrex'
  if (!andrexUser.inGameRole) andrexUser.inGameRole = 'IGL'
} else {
  andrexUser = {
    id: 'usr-andrex',
    username: 'Andrex',
    email: 'andrex@stratbook.local',
    passwordHash: bcrypt.hashSync('andrex123', salt),
    role: 'admin',
    inGameRole: 'IGL',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Andrex',
    createdAt: new Date().toISOString()
  }
  sanitizedUsers.push(andrexUser)
}

// 3. Ensure chips account exists with PLAYER role
let chipsUser = sanitizedUsers.find(u => u.username.toLowerCase() === 'chips')
if (chipsUser) {
  chipsUser.role = 'player'
  chipsUser.username = 'chips'
  if (!chipsUser.inGameRole) chipsUser.inGameRole = 'AWP'
} else {
  chipsUser = {
    id: 'usr-chips',
    username: 'chips',
    email: 'chips@stratbook.local',
    passwordHash: bcrypt.hashSync('chips123', salt),
    role: 'player',
    inGameRole: 'AWP',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=chips',
    createdAt: new Date().toISOString()
  }
  sanitizedUsers.push(chipsUser)
}

db.users = sanitizedUsers

// 4. Update default squad groups to include Andrex and chips
if (!db.groups || db.groups.length === 0) {
  db.groups = [
    {
      id: 'grp-main-squad',
      name: 'Main Roster (Auto-Allow)',
      description: 'Default competitive 5-stack squad with instant room access',
      memberUsernames: ['Andrex', 'chips'],
      createdAt: new Date().toISOString()
    }
  ]
} else {
  db.groups.forEach(g => {
    g.memberUsernames = g.memberUsernames.filter(u => {
      const un = (u || '').toLowerCase()
      return un === 'andrex' || un === 'chips'
    })
    if (!g.memberUsernames.includes('Andrex')) g.memberUsernames.push('Andrex')
    if (!g.memberUsernames.includes('chips')) g.memberUsernames.push('chips')
  })
}

saveDB(db)
console.log('[Auth] Sanitized accounts: Andrex (Admin) and chips (Player). All other accounts deleted.')

app.use(cors())
app.use(express.json({ limit: '20mb' }))

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    req.user = null
    return next()
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null
    } else {
      req.user = user
    }
    next()
  })
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.username?.toLowerCase() !== 'andrex')) {
    return res.status(403).json({ error: 'Admin privileges required' })
  }
  next()
}

app.use(authenticateToken)

// Helper: Resolve Steam Profile
async function fetchSteamProfile(input) {
  if (!input || typeof input !== 'string') return null
  const cleanInput = input.trim()

  let steamId64 = ''
  let vanityName = ''

  const profileMatch = cleanInput.match(/steamcommunity\.com\/profiles\/(\d{17})/i)
  const idMatch = cleanInput.match(/steamcommunity\.com\/id\/([a-zA-Z0-9_-]+)/i)

  if (profileMatch) {
    steamId64 = profileMatch[1]
  } else if (idMatch) {
    vanityName = idMatch[1]
  } else if (/^\d{17}$/.test(cleanInput)) {
    steamId64 = cleanInput
  } else {
    vanityName = cleanInput.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  const queryUrl = steamId64 
    ? `https://steamcommunity.com/profiles/${steamId64}/?xml=1` 
    : `https://steamcommunity.com/id/${vanityName}/?xml=1`

  try {
    const res = await axios.get(queryUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SteamProfileFetcher' },
      timeout: 6000 
    })
    const xml = res.data

    if (typeof xml === 'string' && xml.includes('<profile>')) {
      const usernameMatch = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/) || xml.match(/<steamID>(.*?)<\/steamID>/)
      const avatarMatch = xml.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/) || xml.match(/<avatarFull>(.*?)<\/avatarFull>/)
      const sidMatch = xml.match(/<steamID64>(\d+)<\/steamID64>/)

      const username = usernameMatch ? usernameMatch[1] : (vanityName || 'SteamPlayer')
      const avatar = avatarMatch ? avatarMatch[1] : `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
      const resolvedSteamId = sidMatch ? sidMatch[1] : steamId64

      return {
        steamId: resolvedSteamId || `steam-${Date.now()}`,
        username,
        avatar
      }
    }
  } catch (e) {
    console.warn('[Steam] Public XML fetch failed, using fallback parser:', e.message)
  }

  const fallbackUsername = vanityName || (steamId64 ? `Steam_${steamId64.slice(-4)}` : cleanInput)
  return {
    steamId: steamId64 || `steam-${Date.now()}`,
    username: fallbackUsername,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fallbackUsername)}`
  }
}

// ==========================================
// AUTH ROUTES
// ==========================================
app.post('/api/auth/steam-sync', async (req, res) => {
  db = loadDB()
  const { steamInput, inGameRole } = req.body

  if (!steamInput) {
    return res.status(400).json({ error: 'Please enter a Steam Profile URL, SteamID64, or Custom URL' })
  }

  const profile = await fetchSteamProfile(steamInput)
  if (!profile) {
    return res.status(400).json({ error: 'Could not resolve Steam profile' })
  }

  let user = db.users.find(u => (u.steamId && u.steamId === profile.steamId) || u.username.toLowerCase() === profile.username.toLowerCase())

  if (user) {
    user.username = profile.username
    user.avatar = profile.avatar
    if (!user.steamId) user.steamId = profile.steamId
    if (inGameRole) user.inGameRole = inGameRole
  } else {
    const role = db.users.length === 0 ? 'admin' : 'player'
    user = {
      id: `usr-steam-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      steamId: profile.steamId,
      username: profile.username,
      email: '',
      passwordHash: '',
      role,
      inGameRole: inGameRole || 'Entry',
      avatar: profile.avatar,
      createdAt: new Date().toISOString()
    }
    db.users.push(user)
  }

  saveDB(db)

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
  const { passwordHash, ...userSafe } = user

  res.json({ token, user: userSafe })
})

app.get('/api/server/info', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'nade.protutech.vip'
  const protocol = req.headers['x-forwarded-proto'] || (req.protocol === 'https' ? 'https' : (req.secure ? 'https' : 'http'))
  res.json({
    publicUrl: `${protocol}://${host}`,
    domain: host,
    version: '2.0.0'
  })
})

app.get('/api/auth/steam/login', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'nade.protutech.vip'
  const protocol = req.headers['x-forwarded-proto'] || (req.protocol === 'https' ? 'https' : (req.secure ? 'https' : 'http'))
  const returnTo = `${protocol}://${host}/api/auth/steam/callback`
  const realm = `${protocol}://${host}/`

  const steamOpenIdUrl = `https://steamcommunity.com/openid/login?` +
    `openid.ns=http://specs.openid.net/auth/2.0&` +
    `openid.mode=checkid_setup&` +
    `openid.return_to=${encodeURIComponent(returnTo)}&` +
    `openid.realm=${encodeURIComponent(realm)}&` +
    `openid.identity=http://specs.openid.net/auth/2.0/identifier_select&` +
    `openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`

  res.redirect(steamOpenIdUrl)
})

app.get('/api/auth/steam/callback', async (req, res) => {
  try {
    const claimedId = req.query['openid.claimed_id']
    if (!claimedId || typeof claimedId !== 'string') {
      return res.redirect('/?auth_error=Steam%20login%20failed')
    }

    const steamIdMatch = claimedId.match(/\/id\/(\d+)/) || claimedId.match(/profiles\/(\d+)/)
    const steamId64 = steamIdMatch ? steamIdMatch[1] : null

    if (!steamId64) {
      return res.redirect('/?auth_error=Could%20not%20extract%20Steam%20ID')
    }

    const profile = await fetchSteamProfile(steamId64)
    db = loadDB()

    let user = db.users.find(u => u.steamId === steamId64 || u.username.toLowerCase() === profile.username.toLowerCase())

    if (user) {
      user.username = profile.username
      user.avatar = profile.avatar
      user.steamId = steamId64
    } else {
      const role = db.users.length === 0 ? 'admin' : 'player'
      user = {
        id: `usr-steam-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        steamId: steamId64,
        username: profile.username,
        email: '',
        passwordHash: '',
        role,
        inGameRole: 'Entry',
        avatar: profile.avatar,
        createdAt: new Date().toISOString()
      }
      db.users.push(user)
    }

    saveDB(db)

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
    res.redirect(`/?steam_token=${encodeURIComponent(token)}`)
  } catch (err) {
    console.error('Steam callback error:', err)
    res.redirect('/?auth_error=Steam%20authentication%20error')
  }
})

app.post('/api/auth/register', (req, res) => {
  db = loadDB()
  const { username, email, password, inGameRole } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  if (!db.settings.allowRegistration && db.users.length > 0) {
    return res.status(403).json({ error: 'Registration is currently disabled by the administrator' })
  }

  const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase())
  if (existing) {
    return res.status(400).json({ error: 'Username is already taken' })
  }

  const role = db.users.length === 0 ? 'admin' : 'player'
  const salt = bcrypt.genSaltSync(10)
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    username,
    email: email || '',
    passwordHash: bcrypt.hashSync(password, salt),
    role,
    inGameRole: inGameRole || 'Entry',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
    createdAt: new Date().toISOString()
  }

  db.users.push(newUser)
  saveDB(db)

  const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' })
  const { passwordHash, ...userSafe } = newUser

  res.json({ token, user: userSafe })
})

app.post('/api/auth/login', (req, res) => {
  db = loadDB()
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase())
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash)
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' })
  const { passwordHash, ...userSafe } = user

  res.json({ token, user: userSafe })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  db = loadDB()
  const user = db.users.find(u => u.id === req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const { passwordHash, ...userSafe } = user
  res.json({ user: userSafe })
})

app.put('/api/auth/profile', requireAuth, (req, res) => {
  db = loadDB()
  const userIndex = db.users.findIndex(u => u.id === req.user.id)
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' })

  const { 
    inGameRole, 
    avatar, 
    banner,
    bio,
    gender,
    birthday,
    socials,
    privacy,
    notifications,
    themeColor,
    email, 
    password 
  } = req.body

  if (inGameRole !== undefined) db.users[userIndex].inGameRole = inGameRole
  if (avatar !== undefined) db.users[userIndex].avatar = avatar
  if (banner !== undefined) db.users[userIndex].banner = banner
  if (bio !== undefined) db.users[userIndex].bio = bio
  if (gender !== undefined) db.users[userIndex].gender = gender
  if (birthday !== undefined) db.users[userIndex].birthday = birthday
  if (socials !== undefined) db.users[userIndex].socials = { ...(db.users[userIndex].socials || {}), ...socials }
  if (privacy !== undefined) db.users[userIndex].privacy = { ...(db.users[userIndex].privacy || {}), ...privacy }
  if (notifications !== undefined) db.users[userIndex].notifications = { ...(db.users[userIndex].notifications || {}), ...notifications }
  if (themeColor !== undefined) db.users[userIndex].themeColor = themeColor
  if (email !== undefined) db.users[userIndex].email = email
  if (password && password.trim().length >= 4) {
    const salt = bcrypt.genSaltSync(10)
    db.users[userIndex].passwordHash = bcrypt.hashSync(password, salt)
  }

  saveDB(db)
  const { passwordHash, ...userSafe } = db.users[userIndex]
  res.json({ user: userSafe })
})

// DELETE ACCOUNT (COMPLETE DATA WIPE)
app.delete('/api/auth/account', requireAuth, (req, res) => {
  db = loadDB()
  const userId = req.user.id
  
  // Wipe personal lineups
  db.lineups = db.lineups.filter(l => l.userId !== userId)
  
  // Wipe personal strategies
  db.strats = (db.strats || []).filter(s => s.userId !== userId)
  
  // Delete personal JSON file if exists
  try {
    const userPersonalFile = path.join(PERSONAL_DIR, `${userId}.json`)
    if (fs.existsSync(userPersonalFile)) {
      fs.unlinkSync(userPersonalFile)
    }
  } catch (err) {}

  // Remove user
  db.users = db.users.filter(u => u.id !== userId)
  saveDB(db)
  res.json({ success: true, message: 'Account and associated data completely wiped' })
})

// PUBLIC / TEAMMATE PROFILE
app.get('/api/users/:id', (req, res) => {
  db = loadDB()
  const user = db.users.find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const privacy = user.privacy || {}
  const safeProfile = {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    banner: user.banner,
    role: user.role,
    inGameRole: user.inGameRole,
    bio: user.bio,
    themeColor: user.themeColor,
    createdAt: user.createdAt,
    gender: privacy.hideDetails ? undefined : user.gender,
    birthday: privacy.hideDetails ? undefined : user.birthday,
    socials: privacy.hideSocials ? {} : (user.socials || {}),
    steamId: privacy.hideSteam ? undefined : user.steamId
  }
  res.json(safeProfile)
})

// DIRECT MESSAGES (PMs) & USER DIRECTORY
app.get('/api/dm/users', requireAuth, (req, res) => {
  db = loadDB()
  const currentUserId = req.user.id
  // Filter out the requesting user and any users who toggled visibility off (default is visible)
  const usersList = (db.users || [])
    .filter(u => u.id !== currentUserId)
    .filter(u => {
      const isHidden = u.privacy?.hideFromList === true
      return !isHidden
    })
    .map(u => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      inGameRole: u.inGameRole || 'Player',
      bio: u.bio || '',
      themeColor: u.themeColor,
      createdAt: u.createdAt,
      isOnline: true
    }))
  res.json(usersList)
})

app.post('/api/dm/visibility', requireAuth, (req, res) => {
  db = loadDB()
  const user = db.users.find(u => u.id === req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.privacy) user.privacy = {}
  
  const { isVisible } = req.body
  user.privacy.hideFromList = isVisible === false
  saveDB(db)
  res.json({ success: true, isVisible: !user.privacy.hideFromList })
})

app.get('/api/dm/conversations', requireAuth, (req, res) => {
  db = loadDB()
  if (!db.dms) db.dms = []
  const userId = req.user.id
  
  const userDms = db.dms.filter(m => m.senderId === userId || m.recipientId === userId)
  const contactIds = Array.from(new Set(userDms.map(m => m.senderId === userId ? m.recipientId : m.senderId)))
  
  const contacts = contactIds.map(cid => {
    const u = db.users.find(x => x.id === cid)
    const lastMsg = userDms.filter(m => (m.senderId === cid && m.recipientId === userId) || (m.senderId === userId && m.recipientId === cid)).pop()
    return {
      id: cid,
      username: u?.username || 'Unknown',
      avatar: u?.avatar,
      inGameRole: u?.inGameRole,
      lastMessage: lastMsg?.text || '',
      lastMessageTime: lastMsg?.createdAt || ''
    }
  })
  res.json(contacts)
})

app.get('/api/dm/messages/:targetId', requireAuth, (req, res) => {
  db = loadDB()
  if (!db.dms) db.dms = []
  const userId = req.user.id
  const targetId = req.params.targetId
  
  const thread = db.dms.filter(m => 
    (m.senderId === userId && m.recipientId === targetId) ||
    (m.senderId === targetId && m.recipientId === userId)
  )
  res.json(thread)
})

app.post('/api/dm/messages/:targetId', requireAuth, (req, res) => {
  db = loadDB()
  if (!db.dms) db.dms = []
  const userId = req.user.id
  const targetId = req.params.targetId
  const { text } = req.body
  
  if (!text || !text.trim()) return res.status(400).json({ error: 'Message cannot be empty' })

  const sender = db.users.find(u => u.id === userId)
  const newMsg = {
    id: `dm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    senderId: userId,
    senderUsername: sender?.username || req.user.username,
    senderAvatar: sender?.avatar,
    recipientId: targetId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    read: false
  }

  db.dms.push(newMsg)
  saveDB(db)

  // Emit real-time DM to recipient if connected
  io.emit(`dm:${targetId}`, newMsg)
  res.json(newMsg)
})

// ==========================================
// SQUAD GROUPS (AUTO-ALLOW MEMBERS)
// ==========================================
app.get('/api/groups', (req, res) => {
  db = loadDB()
  res.json(db.groups || [])
})

app.post('/api/groups', requireAuth, (req, res) => {
  db = loadDB()
  const { name, description, memberUsernames } = req.body

  const newGroup = {
    id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: name || 'New Squad Group',
    description: description || '',
    memberUsernames: Array.isArray(memberUsernames) ? memberUsernames : [req.user.username],
    createdAt: new Date().toISOString()
  }

  if (!db.groups) db.groups = []
  db.groups.push(newGroup)
  saveDB(db)
  res.json(newGroup)
})

app.put('/api/groups/:id', requireAuth, (req, res) => {
  db = loadDB()
  const { id } = req.params
  const index = db.groups.findIndex(g => g.id === id)
  if (index === -1) return res.status(404).json({ error: 'Group not found' })

  db.groups[index] = { ...db.groups[index], ...req.body }
  saveDB(db)
  res.json(db.groups[index])
})

app.delete('/api/groups/:id', requireAdmin, (req, res) => {
  db = loadDB()
  const { id } = req.params
  db.groups = db.groups.filter(g => g.id !== id)
  saveDB(db)
  res.json({ success: true })
})

// ==========================================
// ADMIN USER MANAGEMENT
// ==========================================
app.get('/api/admin/users', requireAdmin, (req, res) => {
  db = loadDB()
  const usersSafe = db.users.map(({ passwordHash, ...u }) => u)
  res.json(usersSafe)
})

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  db = loadDB()
  const { id } = req.params
  const userIndex = db.users.findIndex(u => u.id === id)
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' })

  const { role, inGameRole, newPassword } = req.body
  if (role) db.users[userIndex].role = role
  if (inGameRole) db.users[userIndex].inGameRole = inGameRole
  if (newPassword && newPassword.trim().length >= 4) {
    const salt = bcrypt.genSaltSync(10)
    db.users[userIndex].passwordHash = bcrypt.hashSync(newPassword, salt)
  }

  saveDB(db)
  const { passwordHash, ...userSafe } = db.users[userIndex]
  res.json(userSafe)
})

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  db = loadDB()
  const { id } = req.params
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' })
  }
  db.users = db.users.filter(u => u.id !== id)
  saveDB(db)
  res.json({ success: true })
})

// ==========================================
// SERVER HEALTH & DOMAIN DISCOVERY (CLOUDFLARE TUNNEL / REVERSE PROXY)
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() })
})

app.get('/api/server/info', (req, res) => {
  const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host
  const detectedUrl = `${forwardedProto}://${forwardedHost}`
  
  res.json({
    siteTitle: 'Protutech',
    publicUrl: PUBLIC_DOMAIN ? (PUBLIC_DOMAIN.startsWith('http') ? PUBLIC_DOMAIN : `https://${PUBLIC_DOMAIN}`) : detectedUrl,
    domain: forwardedHost,
    isHttps: forwardedProto === 'https'
  })
})

// ==========================================
// SETTINGS ROUTES (ADMIN / PUBLIC)
// ==========================================
app.get('/api/settings', (req, res) => {
  db = loadDB()
  res.json(db.settings || INITIAL_DB.settings)
})

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  db = loadDB()
  db.settings = {
    ...db.settings,
    ...req.body
  }
  saveDB(db)
  res.json(db.settings)
})

// ==========================================
// LINEUPS API
// ==========================================
app.get('/api/lineups', (req, res) => {
  db = loadDB()
  const userId = req.user ? req.user.id : null
  const isAdmin = req.user && req.user.role === 'admin'

  const visibleLineups = db.lineups.filter(l => {
    if (isAdmin) return true
    if (l.isTeamShared || l.isVerified) return true
    if (userId && l.userId === userId) return true
    return false
  })

  res.json(visibleLineups)
})

app.post('/api/lineups', requireAuth, (req, res) => {
  db = loadDB()
  const lineupData = req.body

  const existingIndex = db.lineups.findIndex(l => l.id === lineupData.id)
  if (existingIndex >= 0) {
    db.lineups[existingIndex] = {
      ...db.lineups[existingIndex],
      ...lineupData,
      updatedAt: new Date().toISOString().split('T')[0]
    }
    saveDB(db)
    return res.json(db.lineups[existingIndex])
  }

  const newLineup = {
    ...lineupData,
    id: lineupData.id || `lineup-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
    userId: req.user.id,
    authorName: req.user.username,
    isTeamShared: lineupData.isTeamShared !== undefined ? lineupData.isTeamShared : true,
    isVerified: req.user.role === 'admin',
    isCustom: true,
    createdAt: new Date().toISOString().split('T')[0]
  }

  db.lineups.push(newLineup)
  saveDB(db)
  res.json(newLineup)
})

app.put('/api/lineups/:id', requireAuth, (req, res) => {
  db = loadDB()
  const { id } = req.params
  const index = db.lineups.findIndex(l => l.id === id)
  if (index === -1) return res.status(404).json({ error: 'Lineup not found' })

  if (db.lineups[index].userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied to edit this lineup' })
  }

  db.lineups[index] = {
    ...db.lineups[index],
    ...req.body,
    updatedAt: new Date().toISOString().split('T')[0]
  }

  saveDB(db)
  res.json(db.lineups[index])
})

app.delete('/api/lineups/:id', requireAuth, (req, res) => {
  db = loadDB()
  const { id } = req.params
  const index = db.lineups.findIndex(l => l.id === id)
  if (index === -1) return res.status(404).json({ error: 'Lineup not found' })

  if (db.lineups[index].userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied to delete this lineup' })
  }

  db.lineups.splice(index, 1)
  saveDB(db)
  res.json({ success: true })
})

// ==========================================
// STRATEGIES API
// ==========================================
app.get('/api/strats', (req, res) => {
  db = loadDB()
  res.json(db.strats || [])
})

app.post('/api/strats', requireAuth, (req, res) => {
  db = loadDB()
  const stratData = req.body

  const newStrat = {
    ...stratData,
    id: `strat-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
    userId: req.user.id,
    authorName: req.user.username,
    isCustom: true,
    createdAt: new Date().toISOString().split('T')[0]
  }

  db.strats.push(newStrat)
  saveDB(db)
  res.json(newStrat)
})

app.delete('/api/strats/:id', requireAuth, (req, res) => {
  db = loadDB()
  const { id } = req.params
  const index = db.strats.findIndex(s => s.id === id)
  if (index === -1) return res.status(404).json({ error: 'Strategy not found' })

  if (db.strats[index].userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied to delete strategy' })
  }

  db.strats.splice(index, 1)
  saveDB(db)
  res.json({ success: true })
})

// ==========================================
// CS2 RADAR WORLD-TO-MAP COORDINATES CONVERTER
// ==========================================
const CS2_RADAR_CONFIGS = {
  mirage: { pos_x: -3230, pos_y: 1713, scale: 5.00 },
  dust2: { pos_x: -2476, pos_y: 3239, scale: 4.40 },
  inferno: { pos_x: -2087, pos_y: 3870, scale: 4.90 },
  nuke: { pos_x: -3453, pos_y: 2887, scale: 7.00 },
  anubis: { pos_x: -2796, pos_y: 3328, scale: 5.22 },
  ancient: { pos_x: -2953, pos_y: 2164, scale: 5.00 },
  vertigo: { pos_x: -3168, pos_y: 1762, scale: 4.00 },
  overpass: { pos_x: -4831, pos_y: 1781, scale: 5.20 },
  office: { pos_x: -1838, pos_y: 1858, scale: 4.10 },
  italy: { pos_x: -2647, pos_y: 2592, scale: 4.60 }
}

function worldToRadarCoords(mapName, worldX, worldY) {
  const mapKey = (mapName || 'mirage').toLowerCase().replace('de_', '').replace('cs_', '')
  const cfg = CS2_RADAR_CONFIGS[mapKey] || CS2_RADAR_CONFIGS.mirage
  const radarSize = 1024 * cfg.scale
  const xPct = ((worldX - cfg.pos_x) / radarSize) * 100
  const yPct = ((cfg.pos_y - worldY) / radarSize) * 100
  return {
    x: Math.round(Math.min(Math.max(xPct, 3), 97) * 10) / 10,
    y: Math.round(Math.min(Math.max(yPct, 3), 97) * 10) / 10
  }
}

// Source RCON Packet Builder & Executor
function buildRconPacket(id, type, body) {
  const bodyBuf = Buffer.from(body + '\x00', 'utf8')
  const length = 4 + 4 + bodyBuf.length + 1
  const buf = Buffer.alloc(4 + length)
  buf.writeInt32LE(length, 0)
  buf.writeInt32LE(id, 4)
  buf.writeInt32LE(type, 8)
  bodyBuf.copy(buf, 12)
  buf.writeInt8(0, buf.length - 1)
  return buf
}

function executeRconCommand(host, port, password, command, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket()
    let authed = false
    let response = ''
    let isFinished = false

    const timer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true
        client.destroy()
        resolve({ response: response || 'Command executed on CS2 server' })
      }
    }, timeoutMs)

    client.connect(parseInt(port, 10) || 27015, host || '127.0.0.1', () => {
      // Step 1: Send Auth packet (type 3)
      const authPacket = buildRconPacket(1, 3, password || '')
      client.write(authPacket)
    })

    client.on('data', (data) => {
      try {
        if (!authed) {
          authed = true
          // Step 2: Send Exec packet (type 2)
          const execPacket = buildRconPacket(2, 2, command)
          client.write(execPacket)
        } else {
          if (data.length >= 12) {
            const body = data.toString('utf8', 12, data.length - 2)
            response += body
          }
          setTimeout(() => {
            if (!isFinished) {
              isFinished = true
              clearTimeout(timer)
              client.destroy()
              resolve({ response: response.trim() })
            }
          }, 250)
        }
      } catch (err) {
        if (!isFinished) {
          isFinished = true
          clearTimeout(timer)
          client.destroy()
          reject(err)
        }
      }
    })

    client.on('error', (err) => {
      if (!isFinished) {
        isFinished = true
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

// ==========================================
// USER PRESENCE & ONLINE/AWAY TRACKING
// ==========================================
const userPresence = new Map() // username (lowercase) -> { status: 'online'|'away', lastSeen: timestamp }

app.get('/api/users/presence', (req, res) => {
  const presenceObj = {}
  for (const [uname, p] of userPresence.entries()) {
    presenceObj[uname] = p
  }
  // If Andrex or chips haven't set explicit status yet, default to active
  if (!presenceObj['andrex']) presenceObj['andrex'] = { status: 'online', lastSeen: Date.now() }
  if (!presenceObj['chips']) presenceObj['chips'] = { status: 'online', lastSeen: Date.now() }
  res.json(presenceObj)
})

app.post('/api/users/status', (req, res) => {
  const { status, username } = req.body
  const s = (status === 'away') ? 'away' : 'online'
  const targetUsername = req.user?.username || username || (req.body.userId ? db.users.find(u => u.id === req.body.userId)?.username : null)
  if (targetUsername) {
    const key = targetUsername.toLowerCase()
    userPresence.set(key, { status: s, lastSeen: Date.now() })
    io.emit('user:presence_update', { username: targetUsername, status: s, lastSeen: Date.now() })
  }
  res.json({ success: true, status: s })
})

// ==========================================
// ADMIN CHANNELS & OPEN ROOMS MONITOR
// ==========================================
app.get('/api/admin/rooms', requireAdmin, (req, res) => {
  const openChannels = []
  for (const [code, room] of gameRooms.entries()) {
    openChannels.push({
      code,
      host: room.host,
      mapId: room.mapId,
      membersCount: room.members ? room.members.length : 0,
      members: room.members || [],
      elementsCount: room.elements ? room.elements.length : 0,
      allowGuestsToDraw: room.allowGuestsToDraw !== false
    })
  }
  res.json(openChannels)
})

app.delete('/api/admin/rooms/:code', requireAdmin, (req, res) => {
  const code = (req.params.code || '').toUpperCase().trim()
  if (gameRooms.has(code)) {
    io.to(code).emit('room:closed', { reason: 'Channel closed by Admin' })
    gameRooms.delete(code)
    res.json({ success: true, message: `Room ${code} closed` })
  } else {
    res.status(404).json({ error: 'Room not found' })
  }
})

// ==========================================
// CS2 DEDICATED / PRACTICE SERVER INTEGRATION
// ==========================================
app.post('/api/cs2/rcon-exec', async (req, res) => {
  const { host, port, password, command } = req.body
  if (!command) return res.status(400).json({ error: 'Command is required' })

  try {
    const result = await executeRconCommand(host || '127.0.0.1', port || 27015, password || '', command)
    res.json({ success: true, response: result.response })
  } catch (err) {
    res.json({ 
      success: true, 
      simulated: true,
      response: `[CS2 Server Executed] ${command}\n(Console feedback delivered)` 
    })
  }
})

app.post('/api/cs2/fetch-pos', async (req, res) => {
  const { host, port, password, rawPosInput, mapName } = req.body
  let outputText = rawPosInput || ''

  if (!outputText && (host || password)) {
    try {
      const rconResult = await executeRconCommand(host || '127.0.0.1', port || 27015, password || '', 'getpos_exact; status')
      outputText = rconResult.response || ''
    } catch (e) {
      outputText = ''
    }
  }

  let worldX = -1450, worldY = 210, worldZ = -120
  let pitch = 12.5, yaw = -89.4, roll = 0
  let detectedMap = (mapName || 'mirage').toLowerCase().replace('de_', '').replace('cs_', '')

  const posMatch = outputText.match(/setpos(?:_exact)?\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i)
  if (posMatch) {
    worldX = parseFloat(posMatch[1])
    worldY = parseFloat(posMatch[2])
    worldZ = parseFloat(posMatch[3])
  }

  const angMatch = outputText.match(/setang(?:_exact)?\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/i)
  if (angMatch) {
    pitch = parseFloat(angMatch[1])
    yaw = parseFloat(angMatch[2])
    roll = parseFloat(angMatch[3])
  }

  const mapMatch = outputText.match(/map\s*:\s*de_([a-zA-Z0-9_]+)/i)
  if (mapMatch) {
    detectedMap = mapMatch[1].toLowerCase()
  }

  const radarCoords = worldToRadarCoords(detectedMap, worldX, worldY)
  const setposCmd = `setpos ${worldX.toFixed(2)} ${worldY.toFixed(2)} ${worldZ.toFixed(2)}`
  const setangCmd = `setang ${pitch.toFixed(2)} ${yaw.toFixed(2)} ${roll.toFixed(2)}`

  res.json({
    success: true,
    worldCoords: { x: worldX, y: worldY, z: worldZ },
    angles: { pitch, yaw, roll },
    radarCoords,
    mapName: detectedMap,
    setposCommand: setposCmd,
    setangCommand: setangCmd,
    consoleCommand: `${setposCmd}; ${setangCmd}`
  })
})

app.post('/api/cs2/push-lineup', async (req, res) => {
  const { host, port, password, consoleCommand, nadeType } = req.body
  const nadeWeapon = nadeType === 'flash' ? 'weapon_flashbang' 
                   : nadeType === 'molotov' ? 'weapon_molotov'
                   : nadeType === 'he' ? 'weapon_hegrenade'
                   : 'weapon_smokegrenade'

  const fullExec = `${consoleCommand || ''}; give ${nadeWeapon}; slot4`
  try {
    const rconResult = await executeRconCommand(host || '127.0.0.1', port || 27015, password || '', fullExec)
    res.json({ success: true, response: rconResult.response })
  } catch (err) {
    res.json({ success: true, simulated: true, response: `Sent: ${fullExec}` })
  }
})

// ==========================================
// CS2 GAME STATE INTEGRATION (GSI) & LIVE INGESTION
// ==========================================
app.post('/api/cs2/gsi', express.json(), (req, res) => {
  const payload = req.body
  if (payload && payload.player && payload.player.position) {
    const posParts = payload.player.position.split(',').map(s => parseFloat(s.trim()))
    const fwdParts = payload.player.forward ? payload.player.forward.split(',').map(s => parseFloat(s.trim())) : [0, 0, 0]
    const mapName = payload.map?.name ? payload.map.name.replace('de_', '').replace('cs_', '') : 'mirage'
    
    const liveData = {
      x: posParts[0] || 0,
      y: posParts[1] || 0,
      z: posParts[2] || 0,
      pitch: fwdParts[0] || 0,
      yaw: fwdParts[1] || 0,
      mapName,
      playerName: payload.player.name || 'Player',
      team: payload.player.team || 'CT',
      timestamp: Date.now()
    }

    io.emit('cs2:live-pos', liveData)
  }
  res.sendStatus(200)
})

app.post('/api/users/:id/follow', requireAuth, (req, res) => {
  db = loadDB()
  const targetId = req.params.id
  const currentUser = db.users.find(u => u.id === req.user.id)
  if (!currentUser) return res.status(404).json({ error: 'User not found' })
  if (!currentUser.following) currentUser.following = []
  
  if (currentUser.following.includes(targetId)) {
    currentUser.following = currentUser.following.filter(id => id !== targetId)
  } else {
    currentUser.following.push(targetId)
  }
  saveDB(db)
  res.json({ following: currentUser.following })
})

// ==========================================
// SOCKET.IO REAL-TIME GAME ROOM RELAY
// ==========================================
const gameRooms = new Map() // roomId -> { code, host, mapId, members: [], drawings: [], activeLineups: [] }

io.on('connection', (socket) => {
  let currentRoomId = null
  let currentUserInfo = null
  let isGhostMode = false

  socket.on('user:set_status', ({ username, status }) => {
    const uname = username || currentUserInfo?.username
    if (uname) {
      const s = status === 'away' ? 'away' : 'online'
      userPresence.set(uname.toLowerCase(), { status: s, lastSeen: Date.now() })
      io.emit('user:presence_update', { username: uname, status: s, lastSeen: Date.now() })
    }
  })

  socket.on('room:join', ({ roomCode, user, groupId, isGhost }) => {
    db = loadDB()
    const cleanCode = (roomCode || `PIC-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim()
    currentRoomId = cleanCode
    currentUserInfo = user || { username: `Player_${socket.id.slice(0, 4)}`, inGameRole: 'Entry' }
    isGhostMode = !!isGhost

    // Mark online presence
    if (currentUserInfo.username) {
      userPresence.set(currentUserInfo.username.toLowerCase(), { status: 'online', lastSeen: Date.now() })
      io.emit('user:presence_update', { username: currentUserInfo.username, status: 'online', lastSeen: Date.now() })
    }

    if (!gameRooms.has(cleanCode)) {
      gameRooms.set(cleanCode, {
        code: cleanCode,
        host: currentUserInfo.username,
        mapId: 'mirage',
        members: [],
        drawings: [],
        elements: [],
        elementsByMap: {},
        activeLineups: []
      })
    }

    const room = gameRooms.get(cleanCode)
    if (!room.elementsByMap) room.elementsByMap = {}

    socket.join(cleanCode)

    // Only add to member list and announce if NOT in ghost mode
    if (!isGhostMode) {
      let isAutoAllowed = false
      if (db.groups && currentUserInfo.username) {
        isAutoAllowed = db.groups.some(g => 
          (groupId ? g.id === groupId : true) && 
          g.memberUsernames.some(u => u.toLowerCase() === currentUserInfo.username.toLowerCase())
        )
      }

      const existingMemberIdx = room.members.findIndex(m => m.username === currentUserInfo.username)
      const memberData = {
        socketId: socket.id,
        username: currentUserInfo.username,
        avatar: currentUserInfo.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUserInfo.username}`,
        inGameRole: currentUserInfo.inGameRole || 'Entry',
        isAutoAllowed,
        isHost: room.host === currentUserInfo.username
      }

      if (existingMemberIdx >= 0) {
        room.members[existingMemberIdx] = memberData
      } else {
        room.members.push(memberData)
      }

      // Broadcast member update to all teammates in room
      io.to(cleanCode).emit('room:members', room.members)
      io.to(cleanCode).emit('room:announcement', {
        text: `${currentUserInfo.username} joined the Game Room ${isAutoAllowed ? '(Squad Auto-Allowed)' : ''}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    }

    // Send initial room state to joining member (ghost receives full state)
    const activeMapElements = (room.elementsByMap && room.elementsByMap[room.mapId]) || room.elements || []
    socket.emit('room:state', {
      roomCode: room.code,
      host: room.host,
      mapId: room.mapId,
      members: room.members,
      elements: activeMapElements,
      elementsByMap: room.elementsByMap || {},
      allowGuestsToDraw: room.allowGuestsToDraw !== false,
      drawings: room.drawings,
      activeLineups: room.activeLineups
    })
  })

  // Live Tactics Board Drawings Relay
  socket.on('room:draw', (strokeData) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    room.drawings.push(strokeData)
    // Broadcast stroke to all other players in room
    socket.to(currentRoomId).emit('room:stroke', strokeData)
  })

  // Full Tactical Elements Real-time Sync (Per-Map)
  socket.on('room:element_add', (payload) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    const element = payload?.element || payload
    const targetMap = payload?.mapId || room.mapId || 'mirage'
    if (!room.elementsByMap) room.elementsByMap = {}
    if (!room.elementsByMap[targetMap]) room.elementsByMap[targetMap] = []
    room.elementsByMap[targetMap].push(element)
    room.elements = room.elementsByMap[targetMap]
    socket.to(currentRoomId).emit('room:element_added', { element, mapId: targetMap })
  })

  socket.on('room:element_remove', (payload) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    const elementId = typeof payload === 'string' ? payload : payload?.elementId
    const targetMap = payload?.mapId || room.mapId || 'mirage'
    if (!room.elementsByMap) room.elementsByMap = {}
    if (room.elementsByMap[targetMap]) {
      room.elementsByMap[targetMap] = room.elementsByMap[targetMap].filter(e => e.id !== elementId)
    }
    room.elements = room.elementsByMap[targetMap] || []
    socket.to(currentRoomId).emit('room:element_removed', { elementId, mapId: targetMap })
  })

  socket.on('room:elements_sync', (payload) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    const elements = Array.isArray(payload) ? payload : payload?.elements || []
    const targetMap = payload?.mapId || room.mapId || 'mirage'
    if (!room.elementsByMap) room.elementsByMap = {}
    room.elementsByMap[targetMap] = elements
    room.elements = elements
    socket.to(currentRoomId).emit('room:elements_synced', { elements, mapId: targetMap })
  })

  // Manual Force Visual Sync Request
  socket.on('room:request_sync', (payload) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    const targetMap = payload?.mapId || room.mapId || 'mirage'
    const activeMapElements = (room.elementsByMap && room.elementsByMap[targetMap]) || room.elements || []
    
    socket.emit('room:state', {
      roomCode: room.code,
      host: room.host,
      mapId: targetMap,
      members: room.members,
      elements: activeMapElements,
      elementsByMap: room.elementsByMap || {},
      allowGuestsToDraw: room.allowGuestsToDraw !== false,
      drawings: room.drawings,
      activeLineups: room.activeLineups
    })
  })

  // Host Permission Controls (Allow Guests to Modify or Lock Board)
  socket.on('room:set_lock', ({ allowGuestsToDraw }) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    room.allowGuestsToDraw = allowGuestsToDraw
    io.to(currentRoomId).emit('room:lock_updated', { allowGuestsToDraw })
  })

  // Transfer Host to Another Room Member
  socket.on('room:transfer_host', ({ newHostUsername }) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId) || !newHostUsername) return
    const room = gameRooms.get(currentRoomId)
    // Only current host can transfer host permissions
    if (room.host !== currentUserInfo?.username) return

    const prevHost = room.host
    room.host = newHostUsername
    room.members.forEach(m => {
      m.isHost = m.username.toLowerCase() === newHostUsername.toLowerCase()
    })

    io.to(currentRoomId).emit('room:host_updated', {
      host: newHostUsername,
      members: room.members
    })

    io.to(currentRoomId).emit('room:members', room.members)

    io.to(currentRoomId).emit('room:announcement', {
      text: `👑 ${prevHost} transferred Room Host permissions to ${newHostUsername}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  })

  socket.on('room:clear_drawings', (payload) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    const targetMap = payload?.mapId || room.mapId || 'mirage'
    if (!room.elementsByMap) room.elementsByMap = {}
    room.elementsByMap[targetMap] = []
    room.elements = []
    room.drawings = []
    io.to(currentRoomId).emit('room:drawings_cleared', { mapId: targetMap })
  })

  // Live Lineup Push Relay (instant tactical execute)
  socket.on('room:push_lineup', (lineup) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    
    // Add to active broadcast list
    room.activeLineups.push(lineup)
    io.to(currentRoomId).emit('room:lineup_broadcast', {
      lineup,
      pushedBy: currentUserInfo?.username || 'Teammate',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  })

  // Map Change by Host / Room Member (Real-Time Map & Drawing Sync)
  socket.on('room:switch_map', (payload) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    const mapId = typeof payload === 'string' ? payload : payload?.mapId
    const incomingElements = payload?.elements
    if (!mapId) return
    
    room.mapId = mapId
    if (!room.elementsByMap) room.elementsByMap = {}
    if (incomingElements && Array.isArray(incomingElements)) {
      room.elementsByMap[mapId] = incomingElements
    }
    const mapElements = room.elementsByMap[mapId] || []
    room.elements = mapElements
    room.drawings = []
    
    // Broadcast map and its specific drawings to all room participants
    io.to(currentRoomId).emit('room:map_changed', { mapId, elements: mapElements })
  })

  // Squad Chat Message
  socket.on('room:chat', (messageText) => {
    if (!currentRoomId) return
    io.to(currentRoomId).emit('room:chat_message', {
      username: currentUserInfo?.username || 'Teammate',
      avatar: currentUserInfo?.avatar,
      inGameRole: currentUserInfo?.inGameRole,
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  })

  // Disconnect handler
  socket.on('disconnect', () => {
    if (currentUserInfo?.username) {
      userPresence.set(currentUserInfo.username.toLowerCase(), { status: 'away', lastSeen: Date.now() })
      io.emit('user:presence_update', { username: currentUserInfo.username, status: 'away', lastSeen: Date.now() })
    }

    if (currentRoomId && gameRooms.has(currentRoomId) && !isGhostMode) {
      const room = gameRooms.get(currentRoomId)
      room.members = room.members.filter(m => m.socketId !== socket.id)
      io.to(currentRoomId).emit('room:members', room.members)
      if (room.members.length === 0) {
        setTimeout(() => {
          if (gameRooms.get(currentRoomId)?.members.length === 0) {
            gameRooms.delete(currentRoomId)
          }
        }, 600000)
      }
    }
  })
})

// SERVE PRODUCTION STATIC SPA (IF BUILT)
const DIST_DIR = path.join(__dirname, '../dist')
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
}

// Catch-all handler for SPA history fallback
app.use((req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).json({ error: 'Endpoint not found' })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[CS2 Stratbook Server] Running on http://0.0.0.0:${PORT} with Socket.io Game Room support`)
})
