const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ─── Game modules ─────────────────────────────────────────────────────────────
const { RULES }                   = require("./game/rules");
const { CARD_REGISTRY, CARD_TYPES, getCardById, buildShuffledDeck, drawCards } = require("./game/cards");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, "public")));

app.get("/master", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "master.html"))
);
app.get("/player", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "player.html"))
);
app.get("/admin", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html"))
);

// ─── Hex Grid ─────────────────────────────────────────────────────────────────
const { cols: COLS, rows: ROWS } = RULES.grid;
const START_POSITIONS = RULES.players.startPositions;

function hexNeighbors(q, r) {
  const dirs = (r % 2 === 0)
    ? [[-1,0],[1,0],[0,-1],[-1,-1],[0,1],[-1,1]]
    : [[-1,0],[1,0],[0,-1],[1,-1],[0,1],[1,1]];
  return dirs
    .map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
    .filter(n => n.q >= 0 && n.q < COLS && n.r >= 0 && n.r < ROWS);
}

function hexesInRange(q, r, range) {
  const visited = new Set();
  const result  = [];
  const queue   = [{ q, r, dist: 0 }];
  visited.add(`${q},${r}`);
  while (queue.length) {
    const { q: cq, r: cr, dist } = queue.shift();
    if (dist > 0) result.push({ q: cq, r: cr });
    if (dist < range) {
      for (const n of hexNeighbors(cq, cr)) {
        const key = `${n.q},${n.r}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ ...n, dist: dist + 1 });
        }
      }
    }
  }
  return result;
}

// ─── Runtime config (overridable from admin later) ────────────────────────────
// On garde une copie mutable des règles pour permettre les overrides admin.
let runtimeRules = JSON.parse(JSON.stringify(RULES));

// Registre des cartes mutable (activations / counts configurables depuis admin)
let runtimeCards = CARD_REGISTRY.map(c => ({ ...c }));

// ─── Game State ───────────────────────────────────────────────────────────────
function makePlayer(name, color) {
  return {
    name,
    color,
    position:  null,
    hasMoved:  false,
    // Navire
    ship: {
      hull:    { level: 1 },
      sails:   { level: 1 },
      cannons: { level: 1 },
      crew:    { level: 1 },
      cargo:   [],        // max RULES.ship.cargo.maxSlots items
      equipment: [],      // max RULES.ship.equipment.maxSlots items
    },
    // Ressources
    resources: {
      doublons:   runtimeRules.resources.startDoublons,
      reputation: runtimeRules.resources.startReputation,
      research:   runtimeRules.resources.startResearch,
    },
    // Cartes
    hand:  [],   // ids de cartes en main (max runtimeRules.hand.maxCards)
    deck:  [],   // deck personnel mélangé (ids)
    discard: [], // défausse
    // Effets temporaires (malédictions, bonus tour suivant…)
    pendingEffects: [],
  };
}

let gameState = {
  status:           "waiting",
  players:          {},
  currentTurn:      null,
  turnOrder:        [],
  turnIndex:        0,
  log:              [],
  pendingStartSlots:[],
  diceRoll:         null,
  moveOptions:      [],
};

function broadcastState() {
  io.to("master").emit("game:state", gameState);
  for (const [id, player] of Object.entries(gameState.players)) {
    io.to(id).emit("game:state", {
      ...gameState,
      isMyTurn: gameState.currentTurn === id,
      myName:   player.name,
      myId:     id,
    });
  }
}

function addLog(msg) {
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  gameState.log.unshift(entry);
  if (gameState.log.length > runtimeRules.log.maxEntries) gameState.log.pop();
}

// ─── Socket Handlers ──────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  // ── Master ──
  socket.on("master:join", () => {
    socket.join("master");
    addLog("Maître de jeu connecté.");
    broadcastState();
  });

  // ── Player join ──
  socket.on("player:join", ({ name }) => {
    if (!name || name.trim() === "") return;
    const colorIdx = Object.keys(gameState.players).length % runtimeRules.players.colors.length;
    gameState.players[socket.id] = makePlayer(
      name.trim(),
      runtimeRules.players.colors[colorIdx]
    );
    addLog(`${name.trim()} a rejoint la partie.`);
    broadcastState();
  });

  // ── Start game ──
  socket.on("master:start", () => {
    const playerIds = Object.keys(gameState.players);
    if (playerIds.length < 1) return;

    gameState.status       = "picking";
    gameState.turnOrder    = playerIds;
    gameState.turnIndex    = 0;
    gameState.currentTurn  = gameState.turnOrder[0];
    gameState.pendingStartSlots = [...START_POSITIONS].slice(0, playerIds.length);
    gameState.diceRoll     = null;
    gameState.moveOptions  = [];

    addLog(`Partie démarrée ! ${gameState.players[gameState.currentTurn].name} choisit sa case de départ.`);
    broadcastState();
  });

  // ── Pick start position ──
  socket.on("player:pickStart", ({ q, r }) => {
    if (gameState.status !== "picking")          return;
    if (gameState.currentTurn !== socket.id)     return;
    const slotIdx = gameState.pendingStartSlots.findIndex(s => s.q === q && s.r === r);
    if (slotIdx === -1) return;

    gameState.players[socket.id].position = { q, r };
    gameState.pendingStartSlots.splice(slotIdx, 1);
    addLog(`${gameState.players[socket.id].name} a choisi sa position de départ (${q},${r}).`);

    gameState.turnIndex++;
    if (gameState.turnIndex < gameState.turnOrder.length) {
      gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
      addLog(`${gameState.players[gameState.currentTurn].name} choisit sa case de départ.`);
    } else {
      gameState.status      = "playing";
      gameState.turnIndex   = 0;
      gameState.currentTurn = gameState.turnOrder[0];
      addLog(`Tous prêts ! C'est le tour de ${gameState.players[gameState.currentTurn].name}.`);
    }

    gameState.diceRoll    = null;
    gameState.moveOptions = [];
    broadcastState();
  });

  // ── Roll dice ──
  socket.on("player:rollDice", () => {
    if (gameState.status !== "playing")          return;
    if (gameState.currentTurn !== socket.id)     return;
    if (gameState.diceRoll !== null)             return;

    const value = Math.floor(Math.random() * runtimeRules.dice.faces) + 1;
    gameState.diceRoll = { playerId: socket.id, value };

    const pos = gameState.players[socket.id].position;
    gameState.moveOptions = pos ? hexesInRange(pos.q, pos.r, value) : [];

    addLog(`${gameState.players[socket.id].name} a lancé le dé : ${value} 🎲`);
    broadcastState();
  });

  // ── Move ──
  socket.on("player:move", ({ q, r }) => {
    if (gameState.status !== "playing")          return;
    if (gameState.currentTurn !== socket.id)     return;
    if (!gameState.diceRoll)                     return;
    if (!gameState.moveOptions.some(h => h.q === q && h.r === r)) return;

    gameState.players[socket.id].position = { q, r };
    gameState.players[socket.id].hasMoved = true;
    gameState.moveOptions = [];
    gameState.diceRoll    = null;

    addLog(`${gameState.players[socket.id].name} s'est déplacé en (${q},${r}).`);
    broadcastState();
  });

  // ── End turn ──
  socket.on("player:endTurn", () => {
    if (gameState.currentTurn !== socket.id)     return;
    if (gameState.status !== "playing")          return;

    const currentName = gameState.players[socket.id]?.name;
    gameState.players[socket.id].hasMoved = false;
    gameState.diceRoll    = null;
    gameState.moveOptions = [];

    gameState.turnIndex   = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];

    addLog(`${currentName} a terminé son tour. C'est au tour de ${gameState.players[gameState.currentTurn]?.name}.`);
    broadcastState();
  });

  // ── Admin: save config ──
  socket.on("admin:saveConfig", ({ cards: newCards, rules: newRules }) => {
    // Mettre à jour le registre runtime
    if (newCards) {
      newCards.forEach(nc => {
        const card = runtimeCards.find(c => c.id === nc.id);
        if (card) { card.enabled = nc.enabled; card.count = nc.count; }
      });
    }
    if (newRules) {
      // Merge sélectif — ne pas écraser ce qui n'est pas envoyé
      if (newRules.ship)      Object.assign(runtimeRules.ship,      newRules.ship);
      if (newRules.players)   Object.assign(runtimeRules.players,   newRules.players);
      if (newRules.dice)      Object.assign(runtimeRules.dice,      newRules.dice);
      if (newRules.hand)      Object.assign(runtimeRules.hand,      newRules.hand);
      if (newRules.resources) Object.assign(runtimeRules.resources, newRules.resources);
    }
    console.log("✓ Config admin sauvegardée");
    socket.emit("admin:configSaved", { ok: true });
  });

  // ── Reset ──
  socket.on("master:reset", () => {
    gameState = {
      status: "waiting", players: {}, currentTurn: null,
      turnOrder: [], turnIndex: 0, log: [],
      pendingStartSlots: [], diceRoll: null, moveOptions: [],
    };
    addLog("Partie réinitialisée.");
    broadcastState();
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const player = gameState.players[socket.id];
    if (player) {
      addLog(`${player.name} s'est déconnecté.`);
      delete gameState.players[socket.id];
      gameState.turnOrder = gameState.turnOrder.filter(id => id !== socket.id);
      if (gameState.turnOrder.length > 0) {
        gameState.turnIndex   = gameState.turnIndex % gameState.turnOrder.length;
        gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
      } else {
        gameState.currentTurn = null;
        if (gameState.status === "playing" || gameState.status === "picking") {
          gameState.status = "waiting";
          addLog("Plus aucun joueur. Retour en attente.");
        }
      }
      gameState.diceRoll    = null;
      gameState.moveOptions = [];
      broadcastState();
    }
    console.log(`Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🎲 Serveur lancé sur http://localhost:${PORT}`);
  console.log(`   Maître  : http://localhost:${PORT}/master`);
  console.log(`   Joueur  : http://localhost:${PORT}/player`);
  console.log(`   Admin   : http://localhost:${PORT}/admin\n`);
});