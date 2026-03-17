// ═══════════════════════════════════════════════════════════════════════════════
// game/cards.js — Registre générique des cartes
//
// ANATOMIE D'UNE CARTE
// ─────────────────────
// Chaque carte est un objet avec :
//
//   id          {string}   — identifiant unique snake_case
//   name        {string}   — nom affiché au joueur
//   type        {string}   — catégorie visuelle/mécanique (voir CARD_TYPES)
//   icon        {string}   — emoji affiché sur la carte
//   cost        {number}   — coût en doublons pour jouer la carte
//   count       {number}   — nombre d'exemplaires dans le deck de base
//   target      {string}   — qui/quoi est ciblé (voir CARD_TARGETS)
//   timing      {string}   — quand la carte peut être jouée (voir CARD_TIMING)
//   tags        {string[]} — mots-clés pour filtrage / synergies futures
//   description {string}   — texte de règle affiché
//   effect      {object}   — effets mécaniques (interprétés par le serveur)
//   enabled     {boolean}  — actif dans le deck (configurable depuis admin)
//
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types de cartes ───────────────────────────────────────────────────────────
const CARD_TYPES = {
  ACTION:    "action",    // Effet immédiat pendant ton tour
  EVENT:     "event",     // Réaction / déclencheur passif
  TREASURE:  "treasure",  // Gain de ressources
  EQUIPMENT: "equipment", // S'installe dans un slot équipement (persistant)
  CREW:      "crew",      // Renforce l'équipage, bonus passif ou actif
  CURSE:     "curse",     // Malus infligé à un adversaire
};

// ── Cibles possibles ─────────────────────────────────────────────────────────
const CARD_TARGETS = {
  SELF:      "self",       // S'applique au joueur qui joue
  PLAYER:    "player",     // Cible un joueur adverse (au choix)
  HEX:       "hex",        // Cible une case de la grille
  ALL:       "all",        // Affecte tous les joueurs
  ADJACENT:  "adjacent",   // Affecte les joueurs sur cases adjacentes
  NONE:      "none",       // Aucune cible (effet automatique)
};

// ── Moment de jeu ─────────────────────────────────────────────────────────────
const CARD_TIMING = {
  MY_TURN:      "my_turn",      // Jouable uniquement pendant son propre tour
  ANY_TURN:     "any_turn",     // Jouable à tout moment (réaction)
  AFTER_MOVE:   "after_move",   // Uniquement après s'être déplacé ce tour
  BEFORE_MOVE:  "before_move",  // Uniquement avant de se déplacer ce tour
  ON_COMBAT:    "on_combat",    // Déclenchée lors d'un combat
  PASSIVE:      "passive",      // S'installe et fonctionne automatiquement
};

// ── Effets disponibles (interprétés par le moteur serveur) ───────────────────
// Chaque effet est une clé + valeur. Le serveur lira effect[key] pour appliquer.
//
// Exemples :
//   { move: 2 }              → déplace de 2 cases supplémentaires
//   { damage: 1 }            → inflige 1 de dégâts à la cible
//   { gainDoublons: 3 }      → gagne 3 doublons
//   { drawCard: 1 }          → pioche 1 carte
//   { upgradeShip: "sails" } → améliore les voiles d'un niveau
//   { skipTurn: true }       → la cible passe son prochain tour
//   { cargoProtect: true }   → protège la cargaison ce tour


// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRE DES CARTES
// Ajouter ici chaque nouvelle carte. Le reste du code s'adapte automatiquement.
// ═══════════════════════════════════════════════════════════════════════════════

const CARD_REGISTRY = [

  // ── ACTIONS ─────────────────────────────────────────────────────────────────

  {
    id:          "broadside",
    name:        "Bordée de Canons",
    type:        CARD_TYPES.ACTION,
    icon:        "💥",
    cost:        2,
    count:       2,
    target:      CARD_TARGETS.ADJACENT,
    timing:      CARD_TIMING.MY_TURN,
    tags:        ["combat", "canons"],
    description: "Inflige 1 dégât à tous les navires sur les cases adjacentes.",
    effect:      { damage: 1, targetScope: "adjacent" },
    enabled:     true,
  },

  {
    id:          "abordage",
    name:        "À l'Abordage !",
    type:        CARD_TYPES.ACTION,
    icon:        "⚔",
    cost:        3,
    count:       2,
    target:      CARD_TARGETS.PLAYER,
    timing:      CARD_TIMING.MY_TURN,
    tags:        ["combat", "équipage"],
    description: "Vole jusqu'à 2 doublons à un joueur adjacent.",
    effect:      { stealDoublons: 2 },
    enabled:     true,
  },

  {
    id:          "manoeuvre",
    name:        "Manœuvre Audacieuse",
    type:        CARD_TYPES.ACTION,
    icon:        "🌀",
    cost:        1,
    count:       3,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.BEFORE_MOVE,
    tags:        ["déplacement"],
    description: "Ajoute +2 cases à ton déplacement ce tour.",
    effect:      { bonusMove: 2 },
    enabled:     true,
  },

  // ── ÉVÉNEMENTS ──────────────────────────────────────────────────────────────

  {
    id:          "vent_favorable",
    name:        "Vent Favorable",
    type:        CARD_TYPES.EVENT,
    icon:        "🌊",
    cost:        0,
    count:       3,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.BEFORE_MOVE,
    tags:        ["déplacement", "voiles"],
    description: "Relance le dé et garde le meilleur résultat.",
    effect:      { rerollDice: true, keepBest: true },
    enabled:     true,
  },

  {
    id:          "tempete",
    name:        "Tempête Soudaine",
    type:        CARD_TYPES.EVENT,
    icon:        "⛈",
    cost:        0,
    count:       2,
    target:      CARD_TARGETS.ALL,
    timing:      CARD_TIMING.ANY_TURN,
    tags:        ["météo", "perturbation"],
    description: "Tous les joueurs relancent leur dé. Effet immédiat.",
    effect:      { forceReroll: "all" },
    enabled:     true,
  },

  // ── TRÉSORS ─────────────────────────────────────────────────────────────────

  {
    id:          "coffre_englouti",
    name:        "Coffre Englouti",
    type:        CARD_TYPES.TREASURE,
    icon:        "💰",
    cost:        1,
    count:       4,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.MY_TURN,
    tags:        ["richesse", "doublons"],
    description: "Gagne 3 doublons immédiatement.",
    effect:      { gainDoublons: 3 },
    enabled:     true,
  },

  {
    id:          "epave",
    name:        "Épave Découverte",
    type:        CARD_TYPES.TREASURE,
    icon:        "🪝",
    cost:        0,
    count:       3,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.AFTER_MOVE,
    tags:        ["richesse", "cargaison"],
    description: "Ajoute 1 cargaison aléatoire à ta cale.",
    effect:      { gainCargo: 1, cargoType: "random" },
    enabled:     true,
  },

  {
    id:          "cartes_anciennes",
    name:        "Cartes Anciennes",
    type:        CARD_TYPES.TREASURE,
    icon:        "🗺",
    cost:        2,
    count:       2,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.MY_TURN,
    tags:        ["recherche"],
    description: "Gagne 2 points de recherche.",
    effect:      { gainResearch: 2 },
    enabled:     true,
  },

  // ── ÉQUIPEMENTS ──────────────────────────────────────────────────────────────

  {
    id:          "canon_long",
    name:        "Canon Long",
    type:        CARD_TYPES.EQUIPMENT,
    icon:        "🔫",
    cost:        3,
    count:       2,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.PASSIVE,
    tags:        ["canons", "passif"],
    description: "Occupe 1 slot équipement. +1 portée de canon en permanence.",
    effect:      { passive: true, bonusCannons: 1 },
    enabled:     true,
  },

  {
    id:          "voile_renforcee",
    name:        "Voile Renforcée",
    type:        CARD_TYPES.EQUIPMENT,
    icon:        "⛵",
    cost:        2,
    count:       2,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.PASSIVE,
    tags:        ["voiles", "passif"],
    description: "Occupe 1 slot équipement. +1 déplacement par tour.",
    effect:      { passive: true, bonusMove: 1 },
    enabled:     true,
  },

  // ── ÉQUIPAGE ────────────────────────────────────────────────────────────────

  {
    id:          "recrue_corsaire",
    name:        "Recrue Corsaire",
    type:        CARD_TYPES.CREW,
    icon:        "🦜",
    cost:        1,
    count:       3,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.MY_TURN,
    tags:        ["équipage"],
    description: "Gagne +1 réputation. Pioche 1 carte supplémentaire.",
    effect:      { gainReputation: 1, drawCard: 1 },
    enabled:     true,
  },

  {
    id:          "maitre_canonnier",
    name:        "Maître Canonnier",
    type:        CARD_TYPES.CREW,
    icon:        "💂",
    cost:        2,
    count:       2,
    target:      CARD_TARGETS.SELF,
    timing:      CARD_TIMING.ON_COMBAT,
    tags:        ["équipage", "combat"],
    description: "Durant ce combat, +1 dégât sur chaque tir.",
    effect:      { combatBonusDamage: 1 },
    enabled:     true,
  },

  // ── MALÉDICTIONS ─────────────────────────────────────────────────────────────

  {
    id:          "oeil_kraken",
    name:        "Œil du Kraken",
    type:        CARD_TYPES.CURSE,
    icon:        "💀",
    cost:        3,
    count:       2,
    target:      CARD_TARGETS.PLAYER,
    timing:      CARD_TIMING.MY_TURN,
    tags:        ["malédiction", "perturbation"],
    description: "La cible passe son prochain tour.",
    effect:      { skipTurn: 1 },
    enabled:     true,
  },

  {
    id:          "sirenes",
    name:        "Chant des Sirènes",
    type:        CARD_TYPES.CURSE,
    icon:        "🧜",
    cost:        2,
    count:       2,
    target:      CARD_TARGETS.PLAYER,
    timing:      CARD_TIMING.ANY_TURN,
    tags:        ["malédiction", "déplacement"],
    description: "Réduit de 2 le déplacement de la cible à son prochain tour.",
    effect:      { penaltyMove: 2, duration: 1 },
    enabled:     true,
  },

];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retourne toutes les cartes activées */
function getEnabledCards() {
  return CARD_REGISTRY.filter(c => c.enabled);
}

/** Retourne une carte par son id */
function getCardById(id) {
  return CARD_REGISTRY.find(c => c.id === id) || null;
}

/** Retourne toutes les cartes d'un type */
function getCardsByType(type) {
  return CARD_REGISTRY.filter(c => c.type === type && c.enabled);
}

/**
 * Génère un deck mélangé selon le `count` de chaque carte activée.
 * @returns {string[]} tableau d'ids de cartes mélangé
 */
function buildShuffledDeck() {
  const deck = [];
  for (const card of getEnabledCards()) {
    for (let i = 0; i < card.count; i++) {
      deck.push(card.id);
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Pioche n cartes depuis un deck (modifie le tableau en place, retourne les ids) */
function drawCards(deck, n = 1) {
  return deck.splice(0, n);
}

module.exports = {
  CARD_TYPES,
  CARD_TARGETS,
  CARD_TIMING,
  CARD_REGISTRY,
  getEnabledCards,
  getCardById,
  getCardsByType,
  buildShuffledDeck,
  drawCards,
};
