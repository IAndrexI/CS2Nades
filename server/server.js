import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
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
    customRadars: {},
    customMaps: []
  },
  users: [],
  lineups: [],
  strats: []
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8')
      return JSON.parse(data)
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

// ==========================================
// AUTH ROUTES
// ==========================================
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

  // First user ever created gets admin role automatically
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
  // Also clean up or unassign user lineups if needed
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
// LINEUPS API (MULTI-USER & TEAM SHARING)
// ==========================================
app.get('/api/lineups', (req, res) => {
  db = loadDB()
  const userId = req.user ? req.user.id : null
  const isAdmin = req.user && req.user.role === 'admin'

  // Return public lineups + user's own private lineups
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

  const newLineup = {
    ...lineupData,
    id: `lineup-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
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

  // Only author or admin can edit
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

// SERVE PRODUCTION STATIC SPA (IF BUILT)
const DIST_DIR = path.join(__dirname, '../dist')
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CS2 Stratbook Server] Running on http://0.0.0.0:${PORT}`)
})
