// ═══════════════════════════════════════════════════════════════════════════════
// game/rules.js — Règles et constantes globales du jeu
// Toutes les valeurs configurables passent par ici.
// ═══════════════════════════════════════════════════════════════════════════════

const RULES = {

  // ── Grille ────────────────────────────────────────────────────────────────────
  grid: {
    cols: 25,
    rows: 21,
  },

  // ── Joueurs ───────────────────────────────────────────────────────────────────
  players: {
    min: 1,
    max: 6,
    colors: ["#e85d4a", "#4a9eed", "#4aed7a", "#eda84a", "#c04aed", "#ed4aad"],
    startPositions: [
      { q: 0,  r: 0  },
      { q: 12, r: 0  },
      { q: 24, r: 0  },
      { q: 24, r: 20 },
      { q: 12, r: 20 },
      { q: 0,  r: 20 },
    ],
  },

  // ── Navire ────────────────────────────────────────────────────────────────────
  ship: {
    stats: {
      hull:    { minLevel: 1, maxLevel: 3 },
      sails:   { minLevel: 1, maxLevel: 3 },
      cannons: { minLevel: 1, maxLevel: 3 },
      crew:    { minLevel: 1, maxLevel: 3 },
    },
    // Bonus par niveau (référence pour le moteur de jeu)
    statBonuses: {
      hull:    [0, 2, 5],      // PV bonus par niveau 1/2/3
      sails:   [1, 2, 3],      // cases de déplacement bonus
      cannons: [1, 2, 3],      // portée de tir
      crew:    [5, 10, 15],    // nombre de matelots
    },
    cargo: {
      maxSlots: 10,
    },
    equipment: {
      maxSlots: 6,
    },
  },

  // ── Dé ───────────────────────────────────────────────────────────────────────
  dice: {
    faces: 6,
    // bonus de déplacement selon niveau voiles (index = niveau-1)
    sailsBonus: [0, 1, 2],
  },

  // ── Main du joueur ────────────────────────────────────────────────────────────
  hand: {
    maxCards: 5,
    drawPerTurn: 1,       // cartes piochées en début de tour (à implémenter)
  },

  // ── Ressources ────────────────────────────────────────────────────────────────
  resources: {
    startDoublons:   0,
    startReputation: 0,
    startResearch:   0,
  },

  // ── Phases du jeu ─────────────────────────────────────────────────────────────
  // waiting → picking → playing → ended
  phases: {
    waiting: "waiting",
    picking: "picking",
    playing: "playing",
    ended:   "ended",
  },

  // ── Journal ───────────────────────────────────────────────────────────────────
  log: {
    maxEntries: 50,
  },
};

module.exports = { RULES };