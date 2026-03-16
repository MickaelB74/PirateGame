const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

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

// ─── Hex Grid Config ──────────────────────────────────────────────────────────
const COLS = 18;
const ROWS = 12;

// 6 starting positions on the borders (evenly spread)
const START_POSITIONS = [
  { q: 0,  r: 0  },  // top-left
  { q: 9,  r: 0  },  // top-center
  { q: 17, r: 0  },  // top-right
  { q: 17, r: 11 },  // bottom-right
  { q: 9,  r: 11 },  // bottom-center
  { q: 0,  r: 11 },  // bottom-left
];

function hexNeighbors(q, r) {
  // Flat-top, odd-q offset DOWN
  const dirs = (q % 2 === 0)
    ? [[1,0],[-1,0],[1,-1],[-1,-1],[0,-1],[0,1]]
    : [[1,0],[-1,0],[1,1],[-1,1],[0,-1],[0,1]];
  return dirs
    .map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
    .filter(n => n.q >= 0 && n.q < COLS && n.r >= 0 && n.r < ROWS);
}

function hexesInRange(q, r, range) {
  const visited = new Set();
  const result = [];
  const queue = [{ q, r, dist: 0 }];
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

// ─── Game State ───────────────────────────────────────────────────────────────
let gameState = {
  status: "waiting",     // waiting | picking | playing | ended
  players: {},           // { socketId: { name, color, position, hasMoved } }
  currentTurn: null,
  turnOrder: [],
  turnIndex: 0,
  log: [],
  pendingStartSlots: [], // remaining start slots
  diceRoll: null,        // { playerId, value }
  moveOptions: [],       // reachable hexes for current player
};

const PLAYER_COLORS = ["#e85d4a","#4a9eed","#4aed7a","#eda84a","#c04aed","#ed4aad"];

function broadcastState() {
  io.to("master").emit("game:state", gameState);
  for (const [id, player] of Object.entries(gameState.players)) {
    io.to(id).emit("game:state", {
      ...gameState,
      isMyTurn: gameState.currentTurn === id,
      myName: player.name,
      myId: id,
    });
  }
}

function addLog(msg) {
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  gameState.log.unshift(entry);
  if (gameState.log.length > 30) gameState.log.pop();
}

// ─── Socket Handlers ──────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on("master:join", () => {
    socket.join("master");
    addLog("Maître de jeu connecté.");
    broadcastState();
  });

  socket.on("player:join", ({ name }) => {
    if (!name || name.trim() === "") return;
    const colorIdx = Object.keys(gameState.players).length % PLAYER_COLORS.length;
    gameState.players[socket.id] = {
      name: name.trim(),
      color: PLAYER_COLORS[colorIdx],
      position: null,
      hasMoved: false,
    };
    addLog(`${name.trim()} a rejoint la partie.`);
    broadcastState();
  });

  socket.on("master:start", () => {
    const playerIds = Object.keys(gameState.players);
    if (playerIds.length < 1) return;

    gameState.status = "picking";
    gameState.turnOrder = playerIds;
    gameState.turnIndex = 0;
    gameState.currentTurn = gameState.turnOrder[0];
    gameState.pendingStartSlots = [...START_POSITIONS].slice(0, playerIds.length);
    gameState.diceRoll = null;
    gameState.moveOptions = [];

    const firstName = gameState.players[gameState.currentTurn].name;
    addLog(`Partie démarrée ! ${firstName} choisit sa case de départ.`);
    broadcastState();
  });

  // Player picks starting position
  socket.on("player:pickStart", ({ q, r }) => {
    if (gameState.status !== "picking") return;
    if (gameState.currentTurn !== socket.id) return;

    // Validate it's one of the pending slots
    const slotIdx = gameState.pendingStartSlots.findIndex(s => s.q === q && s.r === r);
    if (slotIdx === -1) return;

    gameState.players[socket.id].position = { q, r };
    gameState.pendingStartSlots.splice(slotIdx, 1);

    const name = gameState.players[socket.id].name;
    addLog(`${name} a choisi sa position de départ (${q},${r}).`);

    // Advance to next player for picking, or start game
    gameState.turnIndex++;
    if (gameState.turnIndex < gameState.turnOrder.length) {
      gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
      const nextName = gameState.players[gameState.currentTurn].name;
      addLog(`${nextName} choisit sa case de départ.`);
    } else {
      // All picked, start actual game
      gameState.status = "playing";
      gameState.turnIndex = 0;
      gameState.currentTurn = gameState.turnOrder[0];
      const firstName = gameState.players[gameState.currentTurn].name;
      addLog(`Tous prêts ! C'est le tour de ${firstName}.`);
    }

    gameState.diceRoll = null;
    gameState.moveOptions = [];
    broadcastState();
  });

  // Player rolls dice
  socket.on("player:rollDice", () => {
    if (gameState.status !== "playing") return;
    if (gameState.currentTurn !== socket.id) return;
    if (gameState.diceRoll !== null) return; // already rolled

    const value = Math.floor(Math.random() * 6) + 1;
    gameState.diceRoll = { playerId: socket.id, value };

    const pos = gameState.players[socket.id].position;
    gameState.moveOptions = pos
      ? hexesInRange(pos.q, pos.r, value)
      : [];

    const name = gameState.players[socket.id].name;
    addLog(`${name} a lancé le dé : ${value} 🎲`);
    broadcastState();
  });

  // Player moves
  socket.on("player:move", ({ q, r }) => {
    if (gameState.status !== "playing") return;
    if (gameState.currentTurn !== socket.id) return;
    if (!gameState.diceRoll) return;

    // Validate target is in moveOptions
    const valid = gameState.moveOptions.some(h => h.q === q && h.r === r);
    if (!valid) return;

    gameState.players[socket.id].position = { q, r };
    gameState.players[socket.id].hasMoved = true;
    gameState.moveOptions = [];
    gameState.diceRoll = null;

    const name = gameState.players[socket.id].name;
    addLog(`${name} s'est déplacé en (${q},${r}).`);
    broadcastState();
  });

  // Player ends their turn
  socket.on("player:endTurn", () => {
    if (gameState.currentTurn !== socket.id) return;
    if (gameState.status !== "playing") return;

    const currentName = gameState.players[socket.id]?.name;
    gameState.players[socket.id].hasMoved = false;
    gameState.diceRoll = null;
    gameState.moveOptions = [];

    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
    const nextName = gameState.players[gameState.currentTurn]?.name;

    addLog(`${currentName} a terminé son tour. C'est au tour de ${nextName}.`);
    broadcastState();
  });

  socket.on("master:reset", () => {
    gameState = {
      status: "waiting",
      players: {},
      currentTurn: null,
      turnOrder: [],
      turnIndex: 0,
      log: [],
      pendingStartSlots: [],
      diceRoll: null,
      moveOptions: [],
    };
    addLog("Partie réinitialisée.");
    broadcastState();
  });

  socket.on("disconnect", () => {
    const player = gameState.players[socket.id];
    if (player) {
      addLog(`${player.name} s'est déconnecté.`);
      delete gameState.players[socket.id];
      gameState.turnOrder = gameState.turnOrder.filter(id => id !== socket.id);
      if (gameState.turnOrder.length > 0) {
        gameState.turnIndex = gameState.turnIndex % gameState.turnOrder.length;
        gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
      } else {
        gameState.currentTurn = null;
        if (gameState.status === "playing" || gameState.status === "picking") {
          gameState.status = "waiting";
          addLog("Plus aucun joueur. Retour en attente.");
        }
      }
      gameState.diceRoll = null;
      gameState.moveOptions = [];
      broadcastState();
    }
    console.log(`Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🎲 Serveur lancé sur http://localhost:${PORT}`);
  console.log(`   Maître : http://localhost:${PORT}/master`);
  console.log(`   Joueur : http://localhost:${PORT}/player\n`);
});