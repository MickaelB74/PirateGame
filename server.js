const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

// ─── Serve static files ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

app.get("/master", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "master.html"))
);
app.get("/player", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "player.html"))
);

// ─── Game State ───────────────────────────────────────────────────────────────
let gameState = {
  status: "waiting", // waiting | playing | ended
  players: {},       // { socketId: { name, ready } }
  currentTurn: null, // socketId of active player
  turnOrder: [],     // ordered list of socketIds
  turnIndex: 0,
  log: [],
};

function broadcastState() {
  // Send full state to master
  io.to("master").emit("game:state", gameState);

  // Send filtered state to each player (they only see their own data)
  for (const [id, player] of Object.entries(gameState.players)) {
    io.to(id).emit("game:state", {
      ...gameState,
      isMyTurn: gameState.currentTurn === id,
      myName: player.name,
    });
  }
}

function addLog(msg) {
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  gameState.log.unshift(entry);
  if (gameState.log.length > 20) gameState.log.pop();
}

// ─── Socket Handlers ──────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  // ── Master connects ──
  socket.on("master:join", () => {
    socket.join("master");
    addLog("Maître de jeu connecté.");
    broadcastState();
    console.log("Master joined");
  });

  // ── Player connects ──
  socket.on("player:join", ({ name }) => {
    if (!name || name.trim() === "") return;

    gameState.players[socket.id] = { name: name.trim(), ready: false };
    addLog(`${name.trim()} a rejoint la partie.`);
    broadcastState();
    console.log(`Player joined: ${name}`);
  });

  // ── Master starts the game ──
  socket.on("master:start", () => {
    const playerIds = Object.keys(gameState.players);
    if (playerIds.length < 1) return;

    gameState.status = "playing";
    gameState.turnOrder = playerIds;
    gameState.turnIndex = 0;
    gameState.currentTurn = gameState.turnOrder[0];

    const firstName = gameState.players[gameState.currentTurn].name;
    addLog(`Partie démarrée ! C'est le tour de ${firstName}.`);
    broadcastState();
  });

  // ── Player ends their turn ──
  socket.on("player:endTurn", () => {
    if (gameState.currentTurn !== socket.id) return;

    const currentName = gameState.players[socket.id]?.name;
    gameState.turnIndex =
      (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
    const nextName = gameState.players[gameState.currentTurn]?.name;

    addLog(`${currentName} a terminé son tour. C'est au tour de ${nextName}.`);
    broadcastState();
  });

  // ── Master resets the game ──
  socket.on("master:reset", () => {
    gameState = {
      status: "waiting",
      players: {},
      currentTurn: null,
      turnOrder: [],
      turnIndex: 0,
      log: [],
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

      // Remove from turn order if game is running
      gameState.turnOrder = gameState.turnOrder.filter(
        (id) => id !== socket.id
      );

      // Fix turn index if needed
      if (gameState.turnOrder.length > 0) {
        gameState.turnIndex =
          gameState.turnIndex % gameState.turnOrder.length;
        gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
      } else {
        gameState.currentTurn = null;
        if (gameState.status === "playing") {
          gameState.status = "waiting";
          addLog("Plus aucun joueur. Retour en attente.");
        }
      }

      broadcastState();
    }
    console.log(`Disconnected: ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🎲 Serveur de jeu lancé sur http://localhost:${PORT}`);
  console.log(`   Maître : http://localhost:${PORT}/master`);
  console.log(`   Joueur : http://localhost:${PORT}/player\n`);
});
