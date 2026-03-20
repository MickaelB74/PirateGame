// ═══════════════════════════════════════════════════════════════════════════════
// game/state.js — Création et mutations du gameState
//
// Toute modification du gameState passe par les fonctions de ce module.
// Le serveur importe ces fonctions et les appelle depuis les handlers Socket.
// ═══════════════════════════════════════════════════════════════════════════════

const { RULES }          = require('./rules');
const { START_POSITIONS, hexesInRange, STORM_CELLS } = require('./grid');
const { buildSetup }     = require('./setup');

// ─── Constantes ───────────────────────────────────────────────────────────────

const LOG_MAX = 50;

// ─── Helpers privés ───────────────────────────────────────────────────────────

function addLog(state, msg) {
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  state.log.unshift(entry);
  if (state.log.length > LOG_MAX) state.log.pop();
}

/**
 * Crée un joueur vide avec ses valeurs initiales.
 * @param {string} name
 * @param {string} color
 * @param {object} adminConfig
 * @returns {object}
 */
function makePlayer(name, color, adminConfig) {
  const r = adminConfig?.rules?.resources || {};
  return {
    name,
    color,
    position:   null,
    hasMoved:   false,
    ship: {
      hull:      { level: 1 },
      sails:     { level: 1 },
      cannons:   { level: 1 },
      crew:      { level: 1 },
      cargo:     [],
      equipment: [],
    },
    resources: {
      doublons:   r.startDoublons   ?? 0,
      reputation: r.startReputation ?? 0,
      research:   r.startResearch   ?? 0,
    },
    hand:           [],
    deck:           [],
    discard:        [],
    pendingEffects: [],
  };
}

/**
 * Construit le Set des cases bloquées depuis la config admin.
 * @param {object} adminConfig
 * @returns {Set<string>}
 */
function getBlockedCells(adminConfig) {
  const blocked = new Set();
  const cards   = adminConfig.cards;

  for (const ile of (cards.iles || [])) {
    const cases = (ile.cases || []).filter(c => c.q != null && c.r != null);
    if (!cases.length && ile.coord_q != null)
      cases.push({ q: ile.coord_q, r: ile.coord_r });
    for (const c of cases) blocked.add(`${c.q},${c.r}`);
  }
  for (const port of (cards.ports || []))
    if (port.coord_q != null) blocked.add(`${port.coord_q},${port.coord_r}`);
  for (const rep of (cards.repaires || []))
    if (rep.coord_q != null) blocked.add(`${rep.coord_q},${rep.coord_r}`);
  for (const ep of (cards.epaves || []))
    if (ep.coord_q != null) blocked.add(`${ep.coord_q},${ep.coord_r}`);

  return blocked;
}

/**
 * Retourne le tableau des obstacles (îles, ports, repaires, épaves) à envoyer
 * aux clients pour affichage dans la minimap.
 * @param {object} adminConfig
 * @returns {Array}
 */
function getObstaclesArray(adminConfig) {
  const obs   = [];
  const cards = adminConfig.cards;

  for (const ile of (cards.iles || [])) {
    const cases = (ile.cases || []).filter(c => c.q != null && c.r != null);
    if (!cases.length && ile.coord_q != null)
      cases.push({ q: ile.coord_q, r: ile.coord_r });
    for (const c of cases)
      obs.push({ q: c.q, r: c.r, type: 'ile', icon: ile.icon || '🏝' });
  }
  for (const port of (cards.ports || []))
    if (port.coord_q != null)
      obs.push({ q: port.coord_q, r: port.coord_r, type: 'port', icon: '⚓' });
  for (const rep of (cards.repaires || []))
    if (rep.coord_q != null)
      obs.push({ q: rep.coord_q, r: rep.coord_r, type: 'repaire', icon: '💀' });
  for (const ep of (cards.epaves || []))
    if (ep.coord_q != null)
      obs.push({ q: ep.coord_q, r: ep.coord_r, type: 'epave', icon: '🚢' });

  return obs;
}

// ─── État initial ──────────────────────────────────────────────────────────────

/**
 * Crée un gameState vide.
 * @returns {object}
 */
function createInitialState() {
  return {
    status:            'waiting',
    players:           {},
    currentTurn:       null,
    turnOrder:         [],
    turnIndex:         0,
    log:               [],
    pendingStartSlots: [],
    diceRoll:          null,
    moveOptions:       [],
    setup:             null,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Ajoute un joueur au gameState.
 * @param {object} state
 * @param {string} socketId
 * @param {string} name
 * @param {object} adminConfig
 */
function addPlayer(state, socketId, name, adminConfig) {
  const colorIdx = Object.keys(state.players).length % RULES.players.colors.length;
  state.players[socketId] = makePlayer(name, RULES.players.colors[colorIdx], adminConfig);
  addLog(state, `${name} a rejoint la partie.`);
}

/**
 * Supprime un joueur et ajuste le tour en cours.
 * @param {object} state
 * @param {string} socketId
 */
function removePlayer(state, socketId) {
  const player = state.players[socketId];
  if (!player) return;
  addLog(state, `${player.name} s'est déconnecté.`);
  delete state.players[socketId];
  const idx = state.turnOrder.indexOf(socketId);
  if (idx !== -1) state.turnOrder.splice(idx, 1);
  if (state.currentTurn === socketId) {
    state.turnIndex   = state.turnIndex % Math.max(state.turnOrder.length, 1);
    state.currentTurn = state.turnOrder[state.turnIndex] || null;
  }
}

/**
 * Démarre la phase de placement (picking).
 * @param {object} state
 * @param {object} adminConfig
 */
function startGame(state, adminConfig) {
  const playerIds = Object.keys(state.players);
  if (!playerIds.length) return false;

  state.status            = 'picking';
  state.turnOrder         = [...playerIds];
  state.turnIndex         = 0;
  state.currentTurn       = playerIds[0];
  state.pendingStartSlots = [...START_POSITIONS];
  state.diceRoll          = null;
  state.moveOptions       = [];
  state.setup             = buildSetup(adminConfig);

  addLog(state, `Partie démarrée ! ${state.players[playerIds[0]].name} choisit sa case de départ.`);
  return true;
}

/**
 * Enregistre le choix de position de départ d'un joueur.
 * @param {object} state
 * @param {string} socketId
 * @param {number} q
 * @param {number} r
 * @returns {boolean}
 */
function pickStartPosition(state, socketId, q, r) {
  if (state.status !== 'picking' || state.currentTurn !== socketId) return false;
  const slotIdx = state.pendingStartSlots.findIndex(s => s.q === q && s.r === r);
  if (slotIdx === -1) return false;

  state.players[socketId].position = { q, r };
  state.pendingStartSlots.splice(slotIdx, 1);
  addLog(state, `${state.players[socketId].name} a choisi sa position (${q},${r}).`);

  state.turnIndex++;
  if (state.turnIndex < state.turnOrder.length) {
    state.currentTurn = state.turnOrder[state.turnIndex];
    addLog(state, `${state.players[state.currentTurn].name} choisit sa case de départ.`);
  } else {
    state.status      = 'playing';
    state.turnIndex   = 0;
    state.currentTurn = state.turnOrder[0];
    addLog(state, `Tous prêts ! C'est le tour de ${state.players[state.currentTurn].name}.`);
  }

  state.diceRoll    = null;
  state.moveOptions = [];
  return true;
}

/**
 * Lance le dé pour le joueur actif.
 * @param {object} state
 * @param {string} socketId
 * @param {object} adminConfig
 * @returns {boolean}
 */
function rollDice(state, socketId, adminConfig) {
  if (state.status !== 'playing' || state.currentTurn !== socketId || state.diceRoll) return false;

  const faces = adminConfig?.rules?.dice?.faces || 6;
  const value = Math.floor(Math.random() * faces) + 1;
  state.diceRoll = { playerId: socketId, value };

  const pos     = state.players[socketId].position;
  const blocked = getBlockedCells(adminConfig);
  const occupied = Object.values(state.players)
    .filter(p => p.position && p !== state.players[socketId])
    .map(p => p.position);

  state.moveOptions = pos
    ? hexesInRange(pos.q, pos.r, value, blocked, STORM_CELLS, occupied)
    : [];

  addLog(state, `${state.players[socketId].name} lance le dé : ${value}.`);
  return true;
}

/**
 * Déplace un joueur vers une case.
 * @param {object} state
 * @param {string} socketId
 * @param {number} q
 * @param {number} r
 * @returns {boolean}
 */
function movePlayer(state, socketId, q, r) {
  if (state.status !== 'playing' || state.currentTurn !== socketId || !state.diceRoll) return false;
  const valid = state.moveOptions.some(o => o.q === q && o.r === r);
  if (!valid) return false;

  state.players[socketId].position = { q, r };
  state.players[socketId].hasMoved  = true;
  state.diceRoll    = null;
  state.moveOptions = [];
  addLog(state, `${state.players[socketId].name} se déplace en (${q},${r}).`);
  return true;
}

/**
 * Passe au tour suivant.
 * @param {object} state
 */
function nextTurn(state) {
  if (state.status !== 'playing') return;
  state.turnIndex   = (state.turnIndex + 1) % state.turnOrder.length;
  state.currentTurn = state.turnOrder[state.turnIndex];
  for (const p of Object.values(state.players)) p.hasMoved = false;
  state.diceRoll    = null;
  state.moveOptions = [];
  addLog(state, `Tour suivant : ${state.players[state.currentTurn].name}.`);
}

/**
 * Réinitialise le gameState complètement.
 * @param {object} state — modifié in-place
 */
function resetState(state) {
  const fresh = createInitialState();
  Object.assign(state, fresh);
  addLog(state, 'Partie réinitialisée.');
}

module.exports = {
  createInitialState,
  getBlockedCells,
  getObstaclesArray,
  makePlayer,
  addPlayer,
  removePlayer,
  startGame,
  pickStartPosition,
  rollDice,
  movePlayer,
  nextTurn,
  resetState,
  addLog,
};
