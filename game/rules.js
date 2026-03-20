// ═══════════════════════════════════════════════════════════════════════════════
// game/rules.js — Règles et constantes globales du jeu
// ═══════════════════════════════════════════════════════════════════════════════

const RULES = {
  grid: { cols: 25, rows: 21 },
  players: {
    min: 1,
    max: 6,
    colors: ['#e85d4a', '#4a9eed', '#4aed7a', '#eda84a', '#c04aed', '#ed4aad'],
    startPositions: [
      { q: 0,  r: 0  },
      { q: 12, r: 0  },
      { q: 24, r: 0  },
      { q: 24, r: 20 },
      { q: 12, r: 20 },
      { q: 0,  r: 20 },
    ],
  },
  ship: {
    stats: {
      hull:    { minLevel: 1, maxLevel: 3 },
      sails:   { minLevel: 1, maxLevel: 3 },
      cannons: { minLevel: 1, maxLevel: 3 },
      crew:    { minLevel: 1, maxLevel: 3 },
    },
    statBonuses: {
      hull:    [0, 2, 5],
      sails:   [1, 2, 3],
      cannons: [1, 2, 3],
      crew:    [5, 10, 15],
    },
    cargo:     { maxSlots: 10 },
    equipment: { maxSlots: 6  },
  },
  dice: {
    faces: 6,
    sailsBonus: [0, 1, 2],
  },
  hand: {
    maxCards:    5,
    drawPerTurn: 1,
  },
  resources: {
    startDoublons:   0,
    startReputation: 0,
    startResearch:   0,
  },
  phases: {
    waiting: 'waiting',
    picking: 'picking',
    playing: 'playing',
    ended:   'ended',
  },
  log: { maxEntries: 50 },
};

module.exports = { RULES };
