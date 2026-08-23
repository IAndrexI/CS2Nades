import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import { Server } from 'socket.io'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'cs2-stratbook-secret-key-2026'

// Data storage directory (supports persistent volume mount e.g. /data in Docker)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Initial Database Template
const INITIAL_DB = {
  settings: {
    siteTitle: 'CS2 STRATBOOK',
    teamName: 'PRO TACTICS',
    logoUrl: '',
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
  } catch (err) {
    console.error('Error saving db file:', err)
  }
}

// Ensure default admin account exists if no users
let db = loadDB()
if (db.users.length === 0) {
  const salt = bcrypt.genSaltSync(10)
  const defaultAdmin = {
    id: 'usr-admin-initial',
    username: 'admin',
    email: 'admin@stratbook.local',
    passwordHash: bcrypt.hashSync('admin123', salt),
    role: 'admin',
    inGameRole: 'IGL',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString()
  }
  db.users.push(defaultAdmin)
  saveDB(db)
  console.log('[Auth] Default admin initialized: admin / admin123')
}

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
  if (!req.user || req.user.role !== 'admin') {
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

app.get('/api/auth/steam/login', (req, res) => {
  const host = req.get('host')
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
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

  const { inGameRole, avatar, email, password } = req.body
  if (inGameRole) db.users[userIndex].inGameRole = inGameRole
  if (avatar) db.users[userIndex].avatar = avatar
  if (email !== undefined) db.users[userIndex].email = email
  if (password && password.trim().length >= 4) {
    const salt = bcrypt.genSaltSync(10)
    db.users[userIndex].passwordHash = bcrypt.hashSync(password, salt)
  }

  saveDB(db)
  const { passwordHash, ...userSafe } = db.users[userIndex]
  res.json({ user: userSafe })
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
// SOCKET.IO REAL-TIME GAME ROOM RELAY
// ==========================================
const gameRooms = new Map() // roomId -> { code, host, mapId, members: [], drawings: [], activeLineups: [] }

io.on('connection', (socket) => {
  let currentRoomId = null
  let currentUserInfo = null

  socket.on('room:join', ({ roomCode, user, groupId }) => {
    db = loadDB()
    const cleanCode = (roomCode || 'SQUAD').toUpperCase().trim()
    currentRoomId = cleanCode
    currentUserInfo = user || { username: `Player_${socket.id.slice(0, 4)}`, inGameRole: 'Entry' }

    // Check if user is in an auto-allow squad group
    let isAutoAllowed = false
    if (db.groups && currentUserInfo.username) {
      isAutoAllowed = db.groups.some(g => 
        (groupId ? g.id === groupId : true) && 
        g.memberUsernames.some(u => u.toLowerCase() === currentUserInfo.username.toLowerCase())
      )
    }

    if (!gameRooms.has(cleanCode)) {
      gameRooms.set(cleanCode, {
        code: cleanCode,
        host: currentUserInfo.username,
        mapId: 'mirage',
        members: [],
        drawings: [],
        activeLineups: []
      })
    }

    const room = gameRooms.get(cleanCode)
    
    // Add member if not already present
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

    socket.join(cleanCode)

    // Send initial room state to joining member
    socket.emit('room:state', {
      roomCode: room.code,
      host: room.host,
      mapId: room.mapId,
      members: room.members,
      drawings: room.drawings,
      activeLineups: room.activeLineups
    })

    // Broadcast member update to all teammates in room
    io.to(cleanCode).emit('room:members', room.members)
    io.to(cleanCode).emit('room:announcement', {
      text: `${currentUserInfo.username} joined the Game Room ${isAutoAllowed ? '(Squad Auto-Allowed)' : ''}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

  socket.on('room:clear_drawings', () => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    room.drawings = []
    io.to(currentRoomId).emit('room:drawings_cleared')
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

  // Map Change by Host
  socket.on('room:switch_map', (mapId) => {
    if (!currentRoomId || !gameRooms.has(currentRoomId)) return
    const room = gameRooms.get(currentRoomId)
    room.mapId = mapId
    room.drawings = [] // reset drawings on new map
    io.to(currentRoomId).emit('room:map_changed', mapId)
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
    if (currentRoomId && gameRooms.has(currentRoomId)) {
      const room = gameRooms.get(currentRoomId)
      room.members = room.members.filter(m => m.socketId !== socket.id)
      io.to(currentRoomId).emit('room:members', room.members)
      if (room.members.length === 0) {
        // Clean up empty room after 10 mins
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
