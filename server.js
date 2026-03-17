const express  = require("express");
const http     = require("http");
const { Server } = require("socket.io");
const path     = require("path");
const fs       = require("fs");

// ─── Game modules ─────────────────────────────────────────────────────────────
const { RULES }        = require("./game/rules");
const { CARD_REGISTRY } = require("./game/cards");

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer);

app.use(express.static(path.join(__dirname, "public")));
app.get("/master", (_, res) => res.sendFile(path.join(__dirname, "public", "master.html")));
app.get("/player", (_, res) => res.sendFile(path.join(__dirname, "public", "player.html")));
app.get("/admin",  (_, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

// ─── Persistance ──────────────────────────────────────────────────────────────
// Toute la config admin est sauvegardée dans data/config.json.
// Ce fichier est créé automatiquement au premier lancement.
const DATA_DIR  = path.join(__dirname, "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log("  → Aucun config.json trouvé, création avec les valeurs par défaut.");
    return null;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const cfg = JSON.parse(raw);
    console.log("  ✓ config.json chargé.");
    return cfg;
  } catch (e) {
    console.error("  ✗ Erreur lecture config.json :", e.message);
    return null;
  }
}

function saveConfig(cfg) {
  ensureDataDir();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
    console.log("  ✓ config.json sauvegardé.");
    return true;
  } catch (e) {
    console.error("  ✗ Erreur écriture config.json :", e.message);
    return false;
  }
}

// ─── Config runtime ───────────────────────────────────────────────────────────
// On charge depuis le fichier si disponible, sinon on part des défauts.
const savedConfig = loadConfig();

let adminConfig = savedConfig || {
  cards: {
    parchemin_ile:     Array.from({ length: 10 }, (_, i) => ({ id: `pi_${i}`, ile: `Île ${i + 1}`, description: "" })),
    parchemin_vierge:  { count: 10 },
    enigme_latitude:   Array.from({ length: 3 },  (_, i) => ({ id: `el_${i}`,  valeur: i + 1 })),
    enigme_longitude:  Array.from({ length: 3 },  (_, i) => ({ id: `elo_${i}`, valeur: i + 1 })),
    enigme_code:       Array.from({ length: 3 },  (_, i) => ({ id: `ec_${i}`,  delta_lat: 0, delta_lon: 0, description: "" })),
    ancien_parchemin:  [
      { id: "ap_poseidon", relique: "Totem de Poséidon", ile_destination: "", description: "" },
      { id: "ap_eole",     relique: "Totem d'Éole",      ile_destination: "", description: "" },
      { id: "ap_zeus",     relique: "Totem de Zeus",      ile_destination: "", description: "" },
    ],
    reliques: {
      poseidon: { event: "Mer d'Huile",  desc: "Contrôle des mers. La carte Mer d'Huile n'a plus d'effet sur vous.",    enabled: true },
      eole:     { event: "Vent Violent", desc: "Contrôle des vents. La carte Vent Violent n'a plus d'effet sur vous.", enabled: true },
      zeus:     { event: "Orage",        desc: "Contrôle de la foudre. La carte Orage n'a plus d'effet sur vous.",     enabled: true },
    },
    equipement:       [
      { id: "eq_0", nom: "Boulet et Poudre",  description: "Ressource de combat. Occupe 1 slot cargaison.",    enabled: true },
      { id: "eq_1", nom: "Planches et Clous", description: "Ressource de réparation. Occupe 1 slot cargaison.", enabled: true },
    ],
    action_offensive: [
      { id: "ao_0", nom: "Boulet de Canon",      description: "Inflige des dégâts à un joueur dans la portée de tes canons.",           enabled: true },
      { id: "ao_1", nom: "À l'Abordage !",       description: "Vole des doublons à un joueur adjacent.",                               enabled: true },
      { id: "ao_2", nom: "Sabotage",             description: "Réduit le déplacement d'un joueur adverse à son prochain tour.",        enabled: true },
      { id: "ao_3", nom: "Vol de Parchemin",     description: "Vole un Parchemin aléatoire à un joueur adjacent.",                     enabled: true },
      { id: "ao_4", nom: "Brouillard de Guerre", description: "Force un joueur adverse à relancer son dé et garder le pire résultat.", enabled: true },
    ],
    action_defensive: [
      { id: "ad_0", nom: "Parade !",          description: "Annule une carte offensive jouée contre toi ce tour.",  enabled: true },
      { id: "ad_1", nom: "Renforts de Coque", description: "Absorbe les prochains dégâts reçus sur la coque.",      enabled: true },
      { id: "ad_2", nom: "Brume Protectrice", description: "Ton navire est insaisissable ce tour.",                  enabled: true },
    ],
    atout: [
      { id: "at_0", nom: "Vent en Poupe",      description: "Ajoute +2 cases à ton déplacement ce tour.",   enabled: true },
      { id: "at_1", nom: "Navigation Étoilée", description: "Relance ton dé et garde le meilleur résultat.", enabled: true },
      { id: "at_2", nom: "Trésor Caché",       description: "Gagne 3 doublons immédiatement.",               enabled: true },
    ],
    evenement: [
      { id: "ev_0", nom: "Mer d'Huile",       description: "Tu ne peux pas te déplacer ce tour.",                          annule_relique: "relique_poseidon", enabled: true },
      { id: "ev_1", nom: "Vent Violent",       description: "Tu te déplaces de 3 cases dans une direction aléatoire.",     annule_relique: "relique_eole",     enabled: true },
      { id: "ev_2", nom: "Orage",              description: "Tu perds 1 point de coque.",                                  annule_relique: "relique_zeus",     enabled: true },
      { id: "ev_3", nom: "Fortune de Mer",     description: "Tu trouves une épave à la dérive. Gagne 2 doublons.",         annule_relique: "",                 enabled: true },
      { id: "ev_4", nom: "Attaque du Kraken",  description: "Passe ton prochain tour et perds 1 point de coque.",          annule_relique: "",                 enabled: true },
      { id: "ev_5", nom: "Chant des Sirènes",  description: "Envoûté par les sirènes. Défausse une carte action au choix.", annule_relique: "",                enabled: true },
    ],
  },
  rules: JSON.parse(JSON.stringify(RULES)),
};

// ─── Route REST : GET /api/config ─────────────────────────────────────────────
// L'admin charge la config au démarrage via fetch (pas socket), plus fiable.
app.get("/api/config", (_, res) => res.json(adminConfig));

// ─── Route REST : POST /api/config ────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.post("/api/config", (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ ok: false, error: "Payload invalide" });
  }
  // Merge
  if (incoming.cards) adminConfig.cards = incoming.cards;
  if (incoming.rules) adminConfig.rules = incoming.rules;

  const ok = saveConfig(adminConfig);
  res.json({ ok });
});

// ─── Hex Grid ─────────────────────────────────────────────────────────────────
const COLS = RULES.grid.cols;
const ROWS = RULES.grid.rows;
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

// ─── Game State ───────────────────────────────────────────────────────────────
function makePlayer(name, color) {
  const r = adminConfig.rules.resources || {};
  return {
    name, color,
    position: null, hasMoved: false,
    ship: {
      hull:      { level: 1 },
      sails:     { level: 1 },
      cannons:   { level: 1 },
      crew:      { level: 1 },
      cargo:     [],
      equipment: [],
    },
    resources: {
      doublons:   r.startDoublons   || 0,
      reputation: r.startReputation || 0,
      research:   r.startResearch   || 0,
    },
    hand: [], deck: [], discard: [],
    pendingEffects: [],
  };
}

let gameState = {
  status: "waiting", players: {}, currentTurn: null,
  turnOrder: [], turnIndex: 0, log: [],
  pendingStartSlots: [], diceRoll: null, moveOptions: [],
};

function broadcastState() {
  io.to("master").emit("game:state", gameState);
  for (const [id, player] of Object.entries(gameState.players)) {
    io.to(id).emit("game:state", {
      ...gameState, isMyTurn: gameState.currentTurn === id,
      myName: player.name, myId: id,
    });
  }
}

function addLog(msg) {
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  gameState.log.unshift(entry);
  if (gameState.log.length > 50) gameState.log.pop();
}

// ─── Socket ───────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on("master:join", () => {
    socket.join("master");
    addLog("Maître de jeu connecté.");
    broadcastState();
  });

  socket.on("player:join", ({ name }) => {
    if (!name?.trim()) return;
    const colorIdx = Object.keys(gameState.players).length % RULES.players.colors.length;
    gameState.players[socket.id] = makePlayer(name.trim(), RULES.players.colors[colorIdx]);
    addLog(`${name.trim()} a rejoint la partie.`);
    broadcastState();
  });

  socket.on("master:start", () => {
    const playerIds = Object.keys(gameState.players);
    if (!playerIds.length) return;
    gameState.status = "picking";
    gameState.turnOrder = playerIds;
    gameState.turnIndex = 0;
    gameState.currentTurn = playerIds[0];
    gameState.pendingStartSlots = [...START_POSITIONS].slice(0, playerIds.length);
    gameState.diceRoll = null;
    gameState.moveOptions = [];
    addLog(`Partie démarrée ! ${gameState.players[playerIds[0]].name} choisit sa case de départ.`);
    broadcastState();
  });

  socket.on("player:pickStart", ({ q, r }) => {
    if (gameState.status !== "picking" || gameState.currentTurn !== socket.id) return;
    const slotIdx = gameState.pendingStartSlots.findIndex(s => s.q === q && s.r === r);
    if (slotIdx === -1) return;
    gameState.players[socket.id].position = { q, r };
    gameState.pendingStartSlots.splice(slotIdx, 1);
    addLog(`${gameState.players[socket.id].name} a choisi sa position (${q},${r}).`);
    gameState.turnIndex++;
    if (gameState.turnIndex < gameState.turnOrder.length) {
      gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
      addLog(`${gameState.players[gameState.currentTurn].name} choisit sa case de départ.`);
    } else {
      gameState.status = "playing";
      gameState.turnIndex = 0;
      gameState.currentTurn = gameState.turnOrder[0];
      addLog(`Tous prêts ! C'est le tour de ${gameState.players[gameState.currentTurn].name}.`);
    }
    gameState.diceRoll = null; gameState.moveOptions = [];
    broadcastState();
  });

  socket.on("player:rollDice", () => {
    if (gameState.status !== "playing" || gameState.currentTurn !== socket.id || gameState.diceRoll) return;
    const faces = adminConfig.rules?.dice?.faces || 6;
    const value = Math.floor(Math.random() * faces) + 1;
    gameState.diceRoll = { playerId: socket.id, value };
    const pos = gameState.players[socket.id].position;
    gameState.moveOptions = pos ? hexesInRange(pos.q, pos.r, value) : [];
    addLog(`${gameState.players[socket.id].name} a lancé le dé : ${value} 🎲`);
    broadcastState();
  });

  socket.on("player:move", ({ q, r }) => {
    if (gameState.status !== "playing" || gameState.currentTurn !== socket.id || !gameState.diceRoll) return;
    if (!gameState.moveOptions.some(h => h.q === q && h.r === r)) return;
    gameState.players[socket.id].position = { q, r };
    gameState.players[socket.id].hasMoved = true;
    gameState.moveOptions = []; gameState.diceRoll = null;
    addLog(`${gameState.players[socket.id].name} s'est déplacé en (${q},${r}).`);
    broadcastState();
  });

  socket.on("player:endTurn", () => {
    if (gameState.currentTurn !== socket.id || gameState.status !== "playing") return;
    const name = gameState.players[socket.id]?.name;
    gameState.players[socket.id].hasMoved = false;
    gameState.diceRoll = null; gameState.moveOptions = [];
    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
    addLog(`${name} a terminé son tour. C'est au tour de ${gameState.players[gameState.currentTurn]?.name}.`);
    broadcastState();
  });

  socket.on("master:reset", () => {
    gameState = {
      status: "waiting", players: {}, currentTurn: null,
      turnOrder: [], turnIndex: 0, log: [],
      pendingStartSlots: [], diceRoll: null, moveOptions: [],
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
        if (["playing","picking"].includes(gameState.status)) {
          gameState.status = "waiting";
          addLog("Plus aucun joueur. Retour en attente.");
        }
      }
      gameState.diceRoll = null; gameState.moveOptions = [];
      broadcastState();
    }
    console.log(`Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🎲 Serveur sur http://localhost:${PORT}`);
  console.log(`   Master : http://localhost:${PORT}/master`);
  console.log(`   Joueur : http://localhost:${PORT}/player`);
  console.log(`   Admin  : http://localhost:${PORT}/admin\n`);
});