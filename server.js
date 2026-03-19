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
const DATA_DIR    = path.join(__dirname, "data");
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

// ─── Defaults ─────────────────────────────────────────────────────────────────
// FIX: nb_objets=6 pour toutes les îles + coordonnées cases[] pré-remplies
const DEFAULT_ILES = [
  { id: "ile_0", nom: "Île aux Squelettes", biome: "Jungle maudite",      icon: "💀", nb_objets: 6, cases: [{q:11,r:1},{q:12,r:2}] },
  { id: "ile_1", nom: "Île des Tempêtes",   biome: "Récifs balayés",      icon: "⛈",  nb_objets: 6, cases: [{q:21,r:4},{q:22,r:4}] },
  { id: "ile_2", nom: "Île Dorée",          biome: "Plages de sable fin", icon: "💰", nb_objets: 6, cases: [{q:5,r:7}] },
  { id: "ile_3", nom: "Île des Brumes",     biome: "Marais mystérieux",   icon: "🌫", nb_objets: 6, cases: [{q:17,r:8}] },
  { id: "ile_4", nom: "Île du Kraken",      biome: "Abysses redoutés",    icon: "🦑", nb_objets: 6, cases: [{q:2,r:14}] },
  { id: "ile_5", nom: "Île Volcanique",     biome: "Terres ardentes",     icon: "🌋", nb_objets: 6, cases: [{q:8,r:13},{q:9,r:13},{q:9,r:14}] },
  { id: "ile_6", nom: "Île des Naufragés",  biome: "Épaves et ruines",    icon: "⚓", nb_objets: 6, cases: [{q:16,r:15}] },
  { id: "ile_7", nom: "Île des Épices",     biome: "Forêts aromatiques",  icon: "🌿", nb_objets: 6, cases: [{q:22,r:14}] },
  { id: "ile_8", nom: "Île des Coraux",     biome: "Lagon turquoise",     icon: "🪸", nb_objets: 6, cases: [{q:5,r:20},{q:5,r:21}] },
  { id: "ile_9", nom: "Île Fantôme",        biome: "Brume perpétuelle",   icon: "👻", nb_objets: 6, cases: [{q:20,r:21}] },
];

const DEFAULT_PORTS = [
  { id: "port_0", nom: "Port de la Tortue",     coord_q: 4,  coord_r: 3  },
  { id: "port_1", nom: "Port du Roi des Mers",  coord_q: 12, coord_r: 5  },
  { id: "port_2", nom: "Port de l'Orient",      coord_q: 23, coord_r: 10 },
  { id: "port_3", nom: "Port des Caraïbes",     coord_q: 16, coord_r: 18 },
  { id: "port_4", nom: "Port du Couchant",      coord_q: 4,  coord_r: 13 },
];

const DEFAULT_REPAIRES = [
  { id: "rep_0", nom: "Repaire de la Grotte Noire",  coord_q: 1,  coord_r: 6  },
  { id: "rep_1", nom: "Repaire du Cap des Traîtres", coord_q: 23, coord_r: 2  },
  { id: "rep_2", nom: "Repaire de la Baie Maudite",  coord_q: 7,  coord_r: 20 },
  { id: "rep_3", nom: "Repaire du Rocher du Diable", coord_q: 23, coord_r: 18 },
];

const DEFAULT_EPAVES = [
  { id: "ep_0", nom: "Épave du Santa Fortuna",   coord_q: 1,  coord_r: 1  },
  { id: "ep_1", nom: "Épave du Corsaire Noir",   coord_q: 18, coord_r: 2  },
  { id: "ep_2", nom: "Épave du Brise-Lame",      coord_q: 8,  coord_r: 9  },
  { id: "ep_3", nom: "Épave du Pélican d'Or",    coord_q: 20, coord_r: 12 },
  { id: "ep_4", nom: "Épave du Sanctuaire",      coord_q: 2,  coord_r: 19 },
  { id: "ep_5", nom: "Épave du Dragon des Mers", coord_q: 11, coord_r: 17 },
  { id: "ep_6", nom: "Épave du Vieux Jacques",   coord_q: 22, coord_r: 21 },
];

// ─── Config runtime ───────────────────────────────────────────────────────────
const savedConfig = loadConfig();

let adminConfig = savedConfig || {
  cards: {
    parchemin_ile:    Array.from({ length: 10 }, (_, i) => ({ id: `pi_${i}`, ile: DEFAULT_ILES[i]?.nom || `Île ${i + 1}`, description: "" })),
    parchemin_vierge: { count: 10 },
    enigme_latitude:  Array.from({ length: 3 },  (_, i) => ({ id: `el_${i}`,  valeur: i + 1 })),
    enigme_longitude: Array.from({ length: 3 },  (_, i) => ({ id: `elo_${i}`, valeur: i + 1 })),
    enigme_code:      Array.from({ length: 3 },  (_, i) => ({ id: `ec_${i}`,  delta_lat: 0, delta_lon: 0, description: "" })),
    ancien_parchemin: [
      { id: "ap_poseidon", relique: "Totem de Poséidon", ile_destination: "", description: "" },
      { id: "ap_eole",     relique: "Totem d'Éole",      ile_destination: "", description: "" },
      { id: "ap_zeus",     relique: "Totem de Zeus",     ile_destination: "", description: "" },
    ],
    reliques: {
      poseidon: { event: "Mer d'Huile",  desc: "Contrôle des mers. La carte Mer d'Huile n'a plus d'effet sur vous.",    enabled: true },
      eole:     { event: "Vent Violent", desc: "Contrôle des vents. La carte Vent Violent n'a plus d'effet sur vous.", enabled: true },
      zeus:     { event: "Orage",        desc: "Contrôle de la foudre. La carte Orage n'a plus d'effet sur vous.",     enabled: true },
    },
    equipement: [
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
      { id: "ev_0", nom: "Mer d'Huile",      description: "Tu ne peux pas te déplacer ce tour.",                           annule_relique: "relique_poseidon", enabled: true },
      { id: "ev_1", nom: "Vent Violent",      description: "Tu te déplaces de 3 cases dans une direction aléatoire.",      annule_relique: "relique_eole",     enabled: true },
      { id: "ev_2", nom: "Orage",             description: "Tu perds 1 point de coque.",                                   annule_relique: "relique_zeus",     enabled: true },
      { id: "ev_3", nom: "Fortune de Mer",    description: "Tu trouves une épave à la dérive. Gagne 2 doublons.",          annule_relique: "",                 enabled: true },
      { id: "ev_4", nom: "Attaque du Kraken", description: "Passe ton prochain tour et perds 1 point de coque.",           annule_relique: "",                 enabled: true },
      { id: "ev_5", nom: "Chant des Sirènes", description: "Envoûté par les sirènes. Défausse une carte action au choix.", annule_relique: "",                 enabled: true },
    ],
    iles:      JSON.parse(JSON.stringify(DEFAULT_ILES)),
    ports:     JSON.parse(JSON.stringify(DEFAULT_PORTS)),
    repaires:  JSON.parse(JSON.stringify(DEFAULT_REPAIRES)),
    epaves:    JSON.parse(JSON.stringify(DEFAULT_EPAVES)),
    avancement: { nb_cartes_temps: 6 },
  },
  rules: JSON.parse(JSON.stringify(RULES)),
};

// ─── Migration / garanties sur config existante ───────────────────────────────
// S'assurer que toutes les clés existent, même sur un ancien config.json

if (!adminConfig.cards.iles || !adminConfig.cards.iles.length) {
  adminConfig.cards.iles = JSON.parse(JSON.stringify(DEFAULT_ILES));
  console.log("  ✓ Clé 'iles' initialisée.");
}
if (!adminConfig.cards.avancement) {
  adminConfig.cards.avancement = { nb_cartes_temps: 6 };
  console.log("  ✓ Clé 'avancement' ajoutée.");
}
if (!adminConfig.cards.ports    || !adminConfig.cards.ports.length)    { adminConfig.cards.ports    = JSON.parse(JSON.stringify(DEFAULT_PORTS));    console.log("  ✓ Clé 'ports' initialisée."); }
if (!adminConfig.cards.repaires || !adminConfig.cards.repaires.length) { adminConfig.cards.repaires = JSON.parse(JSON.stringify(DEFAULT_REPAIRES)); console.log("  ✓ Clé 'repaires' initialisée."); }
if (!adminConfig.cards.epaves   || !adminConfig.cards.epaves.length)   { adminConfig.cards.epaves   = JSON.parse(JSON.stringify(DEFAULT_EPAVES));   console.log("  ✓ Clé 'epaves' initialisée."); }

// FIX: Migration îles — ancien format coord_q/coord_r → cases[] + nb_objets manquant
adminConfig.cards.iles = adminConfig.cards.iles.map((ile, i) => {
  // Migration format ancien → cases[]
  if (!ile.cases) {
    const cases = [];
    if (ile.coord_q != null && ile.coord_r != null)
      cases.push({ q: ile.coord_q, r: ile.coord_r });
    const { coord_q, coord_r, ...rest } = ile;
    ile = { ...rest, cases };
  }
  // FIX: Si nb_objets est manquant ou < 6, forcer à 6
  if (!ile.nb_objets || ile.nb_objets < 6) {
    ile.nb_objets = 6;
  }
  // Si cases vides, appliquer les coordonnées par défaut
  const defaut = DEFAULT_ILES[i];
  if (defaut && (!ile.cases.length || ile.cases.every(c => c.q == null && c.r == null))) {
    ile.cases = JSON.parse(JSON.stringify(defaut.cases));
  }
  return ile;
});

// ─── Route REST : GET /api/config ─────────────────────────────────────────────
app.get("/api/config", (_, res) => res.json(adminConfig));

// ─── Route REST : POST /api/config ────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.post("/api/config", (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object") {
    return res.status(400).json({ ok: false, error: "Payload invalide" });
  }
  if (incoming.cards) adminConfig.cards = incoming.cards;
  if (incoming.rules) adminConfig.rules = incoming.rules;

  const ok = saveConfig(adminConfig);

  io.to("master").emit("config:updated", adminConfig.cards);
  broadcastState();

  res.json({ ok });
});

// ─── Hex Grid ─────────────────────────────────────────────────────────────────
const ROWS = 22;
function colsForRow(r) { return r % 2 === 0 ? 25 : 24; }

// Points de départ — tous toujours disponibles simultanément
const START_POSITIONS = [
  { q:  0, r:  0 },
  { q: 24, r:  0 },
  { q:  0, r: 10 },
  { q: 24, r: 10 },
  { q:  0, r: 21 },
  { q: 24, r: 21 },
];

function hexNeighbors(q, r) {
  const dirs = (r % 2 === 0)
    ? [[-1,0],[1,0],[0,-1],[-1,-1],[0,1],[-1,1]]
    : [[-1,0],[1,0],[0,-1],[1,-1],[0,1],[1,1]];
  return dirs
    .map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
    .filter(n => n.r >= 0 && n.r < ROWS && n.q >= 0 && n.q < colsForRow(n.r));
}

// ─── Obstacles pour broadcast ────────────────────────────────────────────────
function getObstaclesArray() {
  const obs = [];
  const cards = adminConfig.cards;
  for (const ile of (cards.iles || [])) {
    const cases = (ile.cases||[]).filter(c=>c.q!=null&&c.r!=null);
    if (!cases.length && ile.coord_q!=null) cases.push({q:ile.coord_q,r:ile.coord_r});
    for (const c of cases) obs.push({ q:c.q, r:c.r, type:'ile', icon:ile.icon||'🏝' });
  }
  for (const port of (cards.ports||[])) {
    if (port.coord_q!=null&&port.coord_r!=null)
      obs.push({ q:port.coord_q, r:port.coord_r, type:'port', icon:'⚓' });
  }
  for (const rep of (cards.repaires||[])) {
    if (rep.coord_q!=null&&rep.coord_r!=null)
      obs.push({ q:rep.coord_q, r:rep.coord_r, type:'repaire', icon:'💀' });
  }
  for (const ep of (cards.epaves||[])) {
    if (ep.coord_q!=null&&ep.coord_r!=null)
      obs.push({ q:ep.coord_q, r:ep.coord_r, type:'epave', icon:'🚢' });
  }
  return obs;
}

// ─── Obstacles bloquants ─────────────────────────────────────────────────────
const TEMPETE_CELLS = new Set([
  '11,9','12,9','13,9',
  '11,10','12,10','13,10','14,10',
  '11,11','12,11','13,11',
  '12,12','13,12'
]);

function getBlockedCells() {
  const blocked = new Set();
  const cards = adminConfig.cards;
  for (const ile of (cards.iles || [])) {
    if (ile.cases && ile.cases.length) {
      for (const c of ile.cases) {
        if (c.q != null && c.r != null) blocked.add(`${c.q},${c.r}`);
      }
    } else if (ile.coord_q != null && ile.coord_r != null) {
      blocked.add(`${ile.coord_q},${ile.coord_r}`);
    }
  }
  for (const port of (cards.ports || [])) {
    if (port.coord_q != null && port.coord_r != null)
      blocked.add(`${port.coord_q},${port.coord_r}`);
  }
  for (const rep of (cards.repaires || [])) {
    if (rep.coord_q != null && rep.coord_r != null)
      blocked.add(`${rep.coord_q},${rep.coord_r}`);
  }
  for (const ep of (cards.epaves || [])) {
    if (ep.coord_q != null && ep.coord_r != null)
      blocked.add(`${ep.coord_q},${ep.coord_r}`);
  }
  return blocked;
}

// ─── BFS avec obstacles ────────────────────────────────────────────────────────
function hexesInRange(q, r, range) {
  const blocked  = getBlockedCells();
  const visited  = new Set();
  const result   = [];
  const queue    = [{ q, r, dist: 0, blockedHere: false }];
  visited.add(`${q},${r}`);

  while (queue.length) {
    const { q: cq, r: cr, dist, blockedHere } = queue.shift();
    if (dist > 0) result.push({ q: cq, r: cr });
    if (dist >= range || blockedHere) continue;
    for (const n of hexNeighbors(cq, cr)) {
      const key = `${n.q},${n.r}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const occupiedByOther = Object.values(gameState.players).some(
        p => p.position && p.position.q === n.q && p.position.r === n.r
      );
      if (occupiedByOther) continue;
      const isBlocked = blocked.has(key);
      const isTempete = TEMPETE_CELLS.has(key);
      if (isTempete) continue;
      queue.push({ ...n, dist: dist + 1, blockedHere: isBlocked });
    }
  }
  return result;
}

// ─── Mise en place : tirage des cartes au démarrage ───────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSetup() {
  const cards = adminConfig.cards;
  const iles  = (cards.iles || []).filter(ile =>
    (ile.cases||[]).some(c => c.q != null && c.r != null) ||
    (ile.coord_q != null && ile.coord_r != null)
  );
  const nbIles = iles.length;

  // ── 1. Deck parchemins : 3 île (aléatoires parmi ceux configurés) + reste vierge ──
  const parcheminIlePool = shuffleArray(cards.parchemin_ile || []);
  // On prend exactement 3 parchemins île (ou moins s'il y en a moins)
  const nbIleCards = Math.min(3, parcheminIlePool.length);
  const selectedIle = parcheminIlePool.slice(0, nbIleCards);

  // Compléter jusqu'à nbIles avec des parchemins vierges
  const nbVierge = Math.max(0, nbIles - nbIleCards);
  const viergeCards = Array.from({ length: nbVierge }, (_, i) => ({
    id: `vierge_setup_${i}`, type: 'vierge', nom: 'Parchemin Vierge', icon: '📄',
  }));

  // Deck de nbIles cartes mélangées
  const deckParchemins = shuffleArray([
    ...selectedIle.map(c => ({ ...c, type: 'ile' })),
    ...viergeCards,
  ]);

  // Attribution : 1 carte par île (face cachée)
  const parcheminsParIle = {};
  iles.forEach((ile, i) => {
    parcheminsParIle[ile.id] = {
      card:    deckParchemins[i] || null,
      visible: false, // face cachée
    };
  });

  // ── 2. Énigmes : 1 latitude + 1 longitude + 1 code (tirés aléatoirement) ──
  const latPool  = shuffleArray(cards.enigme_latitude  || []);
  const lonPool  = shuffleArray(cards.enigme_longitude || []);
  const codePool = shuffleArray(cards.enigme_code      || []);

  const enigmes = {
    latitude:  latPool[0]  ? { ...latPool[0],  type: 'latitude',  visible: false } : null,
    longitude: lonPool[0]  ? { ...lonPool[0],  type: 'longitude', visible: false } : null,
    code:      codePool[0] ? { ...codePool[0], type: 'code',      visible: false } : null,
  };

  // ── 3. Cartes Temps : autant que d'emplacements ──
  const nbTemps = cards.avancement?.nb_cartes_temps || 6;
  const cardsTemps = Array.from({ length: nbTemps }, (_, i) => ({
    id: `temps_${i}`, index: i + 1, visible: false,
  }));

  return { parcheminsParIle, enigmes, cardsTemps, ileOrder: iles.map(ile => ile.id) };
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
  setup: null, // résultat de buildSetup() au démarrage
};

function broadcastState() {
  const obstacles = getObstaclesArray();
  io.to("master").emit("game:state", { ...gameState, obstacles });
  for (const [id, player] of Object.entries(gameState.players)) {
    io.to(id).emit("game:state", {
      ...gameState, obstacles,
      isMyTurn: gameState.currentTurn === id,
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
    // FIX: envoyer la config immédiatement au master pour que les îles soient visibles sans sauvegarder
    socket.emit("config:updated", adminConfig.cards);
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
    gameState.pendingStartSlots = [...START_POSITIONS];
    gameState.diceRoll = null;
    gameState.moveOptions = [];
    // ── Mise en place : tirage des cartes ──
    gameState.setup = buildSetup();
    addLog(`Partie démarrée ! Mise en place effectuée. ${gameState.players[playerIds[0]].name} choisit sa case de départ.`);
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
    addLog(`${gameState.players[socket.id].name} lance le dé : ${value}.`);
    broadcastState();
  });

  socket.on("player:move", ({ q, r }) => {
    if (gameState.status !== "playing" || gameState.currentTurn !== socket.id) return;
    if (!gameState.diceRoll) return;
    const valid = gameState.moveOptions.some(o => o.q === q && o.r === r);
    if (!valid) return;
    gameState.players[socket.id].position = { q, r };
    gameState.players[socket.id].hasMoved = true;
    gameState.diceRoll = null;
    gameState.moveOptions = [];
    addLog(`${gameState.players[socket.id].name} se déplace en (${q},${r}).`);
    broadcastState();
  });

  socket.on("player:endTurn", () => {
    if (gameState.status !== "playing" || gameState.currentTurn !== socket.id) return;
    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
    for (const p of Object.values(gameState.players)) p.hasMoved = false;
    gameState.diceRoll = null; gameState.moveOptions = [];
    addLog(`Tour suivant : ${gameState.players[gameState.currentTurn].name}.`);
    broadcastState();
  });

  socket.on("master:nextTurn", () => {
    if (gameState.status !== "playing") return;
    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    gameState.currentTurn = gameState.turnOrder[gameState.turnIndex];
    for (const p of Object.values(gameState.players)) p.hasMoved = false;
    gameState.diceRoll = null;
    gameState.moveOptions = [];
    addLog(`Tour suivant : ${gameState.players[gameState.currentTurn].name}.`);
    broadcastState();
  });

  socket.on("master:reset", () => {
    gameState = {
      status: "waiting", players: {}, currentTurn: null,
      turnOrder: [], turnIndex: 0, log: [],
      pendingStartSlots: [], diceRoll: null, moveOptions: [],
      setup: null,
    };
    addLog("Partie réinitialisée.");
    broadcastState();
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
    if (gameState.players[socket.id]) {
      addLog(`${gameState.players[socket.id].name} s'est déconnecté.`);
      delete gameState.players[socket.id];
      const idx = gameState.turnOrder.indexOf(socket.id);
      if (idx !== -1) gameState.turnOrder.splice(idx, 1);
      if (gameState.currentTurn === socket.id) {
        gameState.turnIndex = gameState.turnIndex % Math.max(gameState.turnOrder.length, 1);
        gameState.currentTurn = gameState.turnOrder[gameState.turnIndex] || null;
      }
      broadcastState();
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}\n`));