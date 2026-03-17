// ═══════════════════════════════════════════════════════════════════════════════
// game/cards.js — Définition des types de cartes
//
// Ce fichier définit UNIQUEMENT la structure et le registre des cartes.
// Aucune logique de pioche, de deck ou de distribution ici.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types principaux ──────────────────────────────────────────────────────────
const CARD_TYPES = {
  PARCHEMIN:        "parchemin",
  ENIGME:           "enigme",
  ANCIEN_PARCHEMIN: "ancien_parchemin",
  RELIQUE:          "relique",
  EQUIPEMENT:       "equipement",
  ACTION:           "action",
  ATOUT:            "atout",
  EVENEMENT:        "evenement",
};

// ── Sous-types ────────────────────────────────────────────────────────────────
const CARD_SUBTYPES = {
  // Parchemin
  ILE:    "ile",    // conduit à une île précise
  VIERGE: "vierge", // vierge, sans destination

  // Énigme
  LATITUDE:  "latitude",
  LONGITUDE: "longitude",
  CODE:      "code",

  // Action
  OFFENSIVE: "offensive",
  DEFENSIVE: "defensive",
};

// ── Registre des cartes ───────────────────────────────────────────────────────
// Chaque carte est un objet avec :
//   id          {string}       — identifiant unique snake_case
//   name        {string}       — nom affiché
//   type        {string}       — type principal (CARD_TYPES)
//   subtype     {string|null}  — sous-type (CARD_SUBTYPES), null si absent
//   icon        {string}       — emoji
//   description {string}       — texte de règle
//   enabled     {boolean}      — actif ou non (configurable depuis /admin)

const CARD_REGISTRY = [

  // ═══════════════════════════════════════════════════════════════════════════
  // PARCHEMINS — 20 cartes : 10 île + 10 vierges
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"parchemin_ile_1",      name:"Parchemin de l'Île aux Squelettes", type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île aux Squelettes.",       enabled:true },
  { id:"parchemin_ile_2",      name:"Parchemin de l'Île des Tempêtes",   type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île des Tempêtes.",         enabled:true },
  { id:"parchemin_ile_3",      name:"Parchemin de l'Île Dorée",          type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île Dorée.",                 enabled:true },
  { id:"parchemin_ile_4",      name:"Parchemin de l'Île des Brumes",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île des Brumes.",            enabled:true },
  { id:"parchemin_ile_5",      name:"Parchemin de l'Île du Kraken",      type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île du Kraken.",             enabled:true },
  { id:"parchemin_ile_6",      name:"Parchemin de l'Île Volcanique",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île Volcanique.",            enabled:true },
  { id:"parchemin_ile_7",      name:"Parchemin de l'Île des Naufragés",  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île des Naufragés.",         enabled:true },
  { id:"parchemin_ile_8",      name:"Parchemin de l'Île des Épices",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île des Épices.",            enabled:true },
  { id:"parchemin_ile_9",      name:"Parchemin de l'Île des Coraux",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île des Coraux.",            enabled:true },
  { id:"parchemin_ile_10",     name:"Parchemin de l'Île Fantôme",        type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:"📜", description:"Révèle la route vers l'Île Fantôme.",               enabled:true },

  { id:"parchemin_vierge_1",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_2",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_3",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_4",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_5",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_6",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_7",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_8",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_9",   name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },
  { id:"parchemin_vierge_10",  name:"Parchemin Vierge",                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:"📄", description:"Aucune destination. À compléter avec des Énigmes.", enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉNIGMES — 9 cartes : 3 Latitude + 3 Longitude + 3 Code
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"enigme_latitude_1",  name:"Énigme — Latitude I",    type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LATITUDE,  icon:"🔍", description:"Révèle une coordonnée sur l'axe des abscisses.",       enabled:true },
  { id:"enigme_latitude_2",  name:"Énigme — Latitude II",   type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LATITUDE,  icon:"🔍", description:"Révèle une coordonnée sur l'axe des abscisses.",       enabled:true },
  { id:"enigme_latitude_3",  name:"Énigme — Latitude III",  type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LATITUDE,  icon:"🔍", description:"Révèle une coordonnée sur l'axe des abscisses.",       enabled:true },

  { id:"enigme_longitude_1", name:"Énigme — Longitude I",   type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LONGITUDE, icon:"🔍", description:"Révèle une coordonnée sur l'axe des ordonnées.",       enabled:true },
  { id:"enigme_longitude_2", name:"Énigme — Longitude II",  type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LONGITUDE, icon:"🔍", description:"Révèle une coordonnée sur l'axe des ordonnées.",       enabled:true },
  { id:"enigme_longitude_3", name:"Énigme — Longitude III", type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LONGITUDE, icon:"🔍", description:"Révèle une coordonnée sur l'axe des ordonnées.",       enabled:true },

  { id:"enigme_code_1",      name:"Énigme — Code I",        type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.CODE,      icon:"🔐", description:"Combinaison de déchiffrement des coordonnées.",         enabled:true },
  { id:"enigme_code_2",      name:"Énigme — Code II",       type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.CODE,      icon:"🔐", description:"Combinaison de déchiffrement des coordonnées.",         enabled:true },
  { id:"enigme_code_3",      name:"Énigme — Code III",      type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.CODE,      icon:"🔐", description:"Combinaison de déchiffrement des coordonnées.",         enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANCIENS PARCHEMINS — 3 cartes
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"ancien_parchemin_poseidon", name:"Ancien Parchemin — Route de Poséidon", type:CARD_TYPES.ANCIEN_PARCHEMIN, subtype:null, icon:"🗺", description:"Route secrète menant à l'île où repose le Totem de Poséidon.", enabled:true },
  { id:"ancien_parchemin_eole",     name:"Ancien Parchemin — Route d'Éole",      type:CARD_TYPES.ANCIEN_PARCHEMIN, subtype:null, icon:"🗺", description:"Route secrète menant à l'île où repose le Totem d'Éole.",      enabled:true },
  { id:"ancien_parchemin_zeus",     name:"Ancien Parchemin — Route de Zeus",      type:CARD_TYPES.ANCIEN_PARCHEMIN, subtype:null, icon:"🗺", description:"Route secrète menant à l'île où repose le Totem de Zeus.",      enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // RELIQUES — 3 cartes
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"relique_poseidon", name:"Totem de Poséidon", type:CARD_TYPES.RELIQUE, subtype:null, icon:"🔱", description:"Contrôle des mers. La carte Mer d'Huile n'a plus d'effet sur vous.",    enabled:true },
  { id:"relique_eole",     name:"Totem d'Éole",      type:CARD_TYPES.RELIQUE, subtype:null, icon:"💨", description:"Contrôle des vents. La carte Vent Violent n'a plus d'effet sur vous.", enabled:true },
  { id:"relique_zeus",     name:"Totem de Zeus",      type:CARD_TYPES.RELIQUE, subtype:null, icon:"⚡", description:"Contrôle de la foudre. La carte Orage n'a plus d'effet sur vous.",     enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉQUIPEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"equipement_boulet_poudre",   name:"Boulet et Poudre",   type:CARD_TYPES.EQUIPEMENT, subtype:null, icon:"💥", description:"Ressource de combat. Occupe 1 slot cargaison.",    enabled:true },
  { id:"equipement_planches_clous",  name:"Planches et Clous",  type:CARD_TYPES.EQUIPEMENT, subtype:null, icon:"🪵", description:"Ressource de réparation. Occupe 1 slot cargaison.", enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS — OFFENSIVES
  // Perturbent un joueur adverse à distance.
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"action_off_boulet",    name:"Boulet de Canon",     type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.OFFENSIVE, icon:"💣", description:"Inflige des dégâts à un joueur dans la portée de tes canons.",             enabled:true },
  { id:"action_off_abordage",  name:"À l'Abordage !",      type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.OFFENSIVE, icon:"⚔",  description:"Vole des doublons à un joueur adjacent.",                                 enabled:true },
  { id:"action_off_sabotage",  name:"Sabotage",             type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.OFFENSIVE, icon:"🔧", description:"Réduit le déplacement d'un joueur adverse à son prochain tour.",           enabled:true },
  { id:"action_off_vol",       name:"Vol de Parchemin",     type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.OFFENSIVE, icon:"📜", description:"Vole un Parchemin aléatoire à un joueur adjacent.",                        enabled:true },
  { id:"action_off_brouillard",name:"Brouillard de Guerre", type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.OFFENSIVE, icon:"🌫", description:"Force un joueur adverse à relancer son dé et garder le pire résultat.",   enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS — DÉFENSIVES
  // Contrent une attaque reçue.
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"action_def_parade",   name:"Parade !",           type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.DEFENSIVE, icon:"🛡", description:"Annule une carte offensive jouée contre toi ce tour.",           enabled:true },
  { id:"action_def_renforts", name:"Renforts de Coque",  type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.DEFENSIVE, icon:"🪵", description:"Absorbe les prochains dégâts reçus sur la coque.",               enabled:true },
  { id:"action_def_brume",    name:"Brume Protectrice",  type:CARD_TYPES.ACTION, subtype:CARD_SUBTYPES.DEFENSIVE, icon:"🌁", description:"Ton navire est insaisissable ce tour. Immunisé aux attaques.",   enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATOUTS
  // Cartes utilisables par le joueur pour lui-même.
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"atout_vent",       name:"Vent en Poupe",       type:CARD_TYPES.ATOUT, subtype:null, icon:"💨", description:"Ajoute +2 cases à ton déplacement ce tour.",                enabled:true },
  { id:"atout_navigation", name:"Navigation Étoilée",  type:CARD_TYPES.ATOUT, subtype:null, icon:"⭐", description:"Relance ton dé et garde le meilleur résultat.",             enabled:true },
  { id:"atout_tresor",     name:"Trésor Caché",        type:CARD_TYPES.ATOUT, subtype:null, icon:"💰", description:"Gagne 3 doublons immédiatement.",                           enabled:true },

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // Piochés en arrivant sur une case ⚡. Concernent uniquement ce joueur.
  // Certains sont contrecarrés par les Reliques.
  // ═══════════════════════════════════════════════════════════════════════════

  { id:"evenement_mer_huile",    name:"Mer d'Huile",        type:CARD_TYPES.EVENEMENT, subtype:null, icon:"🌊", description:"La mer est étale. Tu ne peux pas te déplacer ce tour. Annulé par le Totem de Poséidon.",              enabled:true },
  { id:"evenement_vent_violent", name:"Vent Violent",        type:CARD_TYPES.EVENEMENT, subtype:null, icon:"🌬", description:"La tempête te pousse. Tu te déplaces de 3 cases dans une direction aléatoire. Annulé par le Totem d'Éole.", enabled:true },
  { id:"evenement_orage",        name:"Orage",               type:CARD_TYPES.EVENEMENT, subtype:null, icon:"⛈", description:"La foudre frappe ton navire. Tu perds 1 point de coque. Annulé par le Totem de Zeus.",               enabled:true },
  { id:"evenement_fortune",      name:"Fortune de Mer",      type:CARD_TYPES.EVENEMENT, subtype:null, icon:"🪙", description:"Tu trouves une épave à la dérive. Gagne 2 doublons.",                                                enabled:true },
  { id:"evenement_kraken",       name:"Attaque du Kraken",   type:CARD_TYPES.EVENEMENT, subtype:null, icon:"🐙", description:"Le Kraken surgit ! Passe ton prochain tour et perds 1 point de coque.",                             enabled:true },
  { id:"evenement_sirenes",      name:"Chant des Sirènes",   type:CARD_TYPES.EVENEMENT, subtype:null, icon:"🧜", description:"Envoûté par les sirènes. Défausse une carte action au choix.",                                       enabled:true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCardById(id) {
  return CARD_REGISTRY.find(c => c.id === id) || null;
}

function getCardsByType(type) {
  return CARD_REGISTRY.filter(c => c.type === type);
}

function getCardsBySubtype(subtype) {
  return CARD_REGISTRY.filter(c => c.subtype === subtype);
}

function getEnabledCards() {
  return CARD_REGISTRY.filter(c => c.enabled);
}

module.exports = {
  CARD_TYPES,
  CARD_SUBTYPES,
  CARD_REGISTRY,
  getCardById,
  getCardsByType,
  getCardsBySubtype,
  getEnabledCards,
};