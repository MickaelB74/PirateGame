// ═══════════════════════════════════════════════════════════════════════════════
// server.js — Serveur Express + Socket.IO
//
// Responsabilité unique : routing HTTP + orchestration des events Socket.
// Toute la logique métier est déléguée aux modules game/*.
// ═══════════════════════════════════════════════════════════════════════════════

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const { initConfig, saveConfig } = require('./game/config');
const {
  createInitialState,
  getObstaclesArray,
  addPlayer,
  removePlayer,
  startGame,
  pickStartPosition,
  rollDice,
  movePlayer,
  nextTurn,
  resetState,
  addLog,
} = require('./game/state');

// ─── Init ──────────────────────────────────────────────────────────────────────

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer);

// Config admin (persistée sur disque)
let adminConfig = initConfig();

// Game state (en mémoire, reset sur demande)
let gameState = createInitialState();

// ─── Routes statiques ─────────────────────────────────────────────────────────

// Servir les sous-dossiers directement
app.use('/admin',  express.static(path.join(__dirname, 'public', 'admin')));
app.use('/master', express.static(path.join(__dirname, 'public', 'master')));
app.use('/player', express.static(path.join(__dirname, 'public', 'player')));
app.use('/shared', express.static(path.join(__dirname, 'public', 'shared')));
app.use(express.static(path.join(__dirname, 'public')));

// Routes HTML principales
app.get('/',        (_, res) => res.sendFile(path.join(__dirname, 'public', 'player',  'index.html')));
app.get('/master',  (_, res) => res.sendFile(path.join(__dirname, 'public', 'master',  'index.html')));
app.get('/admin',   (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin',   'index.html')));

// ─── API REST ─────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

app.get('/api/config', (_, res) => res.json(adminConfig));

app.post('/api/config', (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object')
    return res.status(400).json({ ok: false, error: 'Payload invalide' });

  if (incoming.cards) adminConfig.cards = incoming.cards;
  if (incoming.rules) adminConfig.rules = incoming.rules;

  const ok = saveConfig(adminConfig);
  io.to('master').emit('config:updated', adminConfig.cards);
  broadcastState();
  res.json({ ok });
});

// ─── Broadcast ────────────────────────────────────────────────────────────────

function broadcastState() {
  const obstacles = getObstaclesArray(adminConfig);

  // Master reçoit tout
  io.to('master').emit('game:state', { ...gameState, obstacles });

  // Chaque joueur reçoit l'état enrichi de son point de vue
  for (const [id, player] of Object.entries(gameState.players)) {
    io.to(id).emit('game:state', {
      ...gameState,
      obstacles,
      isMyTurn: gameState.currentTurn === id,
      myName:   player.name,
      myId:     id,
    });
  }
}

// ─── Socket handlers ──────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[socket] Connected:    ${socket.id}`);

  // ── Master ──────────────────────────────────────────────────────────────────
  socket.on('master:join', () => {
    socket.join('master');
    addLog(gameState, 'Maître de jeu connecté.');
    socket.emit('config:updated', adminConfig.cards);
    broadcastState();
  });

  socket.on('master:start', () => {
    startGame(gameState, adminConfig);
    broadcastState();
  });

  socket.on('master:nextTurn', () => {
    nextTurn(gameState);
    broadcastState();
  });

  socket.on('master:reset', () => {
    resetState(gameState);
    broadcastState();
  });

  // ── Player ──────────────────────────────────────────────────────────────────
  socket.on('player:join', ({ name } = {}) => {
    if (!name?.trim()) return;
    addPlayer(gameState, socket.id, name.trim(), adminConfig);
    broadcastState();
  });

  socket.on('player:pickStart', ({ q, r } = {}) => {
    pickStartPosition(gameState, socket.id, q, r);
    broadcastState();
  });

  socket.on('player:rollDice', () => {
    rollDice(gameState, socket.id, adminConfig);
    broadcastState();
  });

  socket.on('player:move', ({ q, r } = {}) => {
    movePlayer(gameState, socket.id, q, r);
    broadcastState();
  });

  socket.on('player:endTurn', () => {
    if (gameState.currentTurn !== socket.id) return;
    nextTurn(gameState);
    broadcastState();
  });

  // ── Disconnection ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[socket] Disconnected: ${socket.id}`);
    if (gameState.players[socket.id]) {
      removePlayer(gameState, socket.id);
      broadcastState();
    }
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀  Serveur démarré sur http://localhost:${PORT}`);
  console.log(`    Joueur  → http://localhost:${PORT}/`);
  console.log(`    Master  → http://localhost:${PORT}/master`);
  console.log(`    Admin   → http://localhost:${PORT}/admin\n`);
});
