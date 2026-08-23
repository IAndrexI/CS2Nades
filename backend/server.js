const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Temporary database storage (acts as persistent store until MongoDB is attached)
let savedStrategies = [];
let savedLineups = [
  { id: 1, map: 'Mirage', title: 'A-Site Window Smoke from T-Spawn', type: 'Smoke', description: 'Align with wooden beam, aim at antenna, jumpthrow.', author: 'JH1ller' },
  { id: 2, map: 'Mirage', title: 'Connector Smoke from A-Ramp', type: 'Smoke', description: 'Stand in corner, aim at scaffolding, jumpthrow.', author: 'Stratbook' }
];

// API Routes for Strategies
app.get('/api/strategies', (req, res) => {
  res.json(savedStrategies);
});

app.post('/api/strategies', (req, res) => {
  const strategy = { id: Date.now(), ...req.body };
  savedStrategies.push(strategy);
  res.json({ success: true, strategy });
});

// API Routes for Lineups
app.get('/api/lineups', (req, res) => {
  res.json(savedLineups);
});

app.post('/api/lineups', (req, res) => {
  const lineup = { id: Date.now(), ...req.body };
  savedLineups.push(lineup);
  res.json({ success: true, lineup });
});

// Socket.io Real-Time Connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('strat-update', (data) => {
    socket.broadcast.emit('strat-update', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Stratbook backend running on port ${PORT}`);
});