// ═══════════════════════════════════════════════════════════════════════════════
// game/cards.js — Définition des types de cartes
//
// NOTE : ACTION, ATOUT et EVENEMENT sont intentionnellement absents.
// Leur mécanique sera conçue dans une prochaine itération.
// ═══════════════════════════════════════════════════════════════════════════════

const CARD_TYPES = {
  PARCHEMIN:        'parchemin',
  ENIGME:           'enigme',
  ANCIEN_PARCHEMIN: 'ancien_parchemin',
  RELIQUE:          'relique',
  EQUIPEMENT:       'equipement',
};

const CARD_SUBTYPES = {
  ILE:       'ile',
  VIERGE:    'vierge',
  LATITUDE:  'latitude',
  LONGITUDE: 'longitude',
  CODE:      'code',
};

const CARD_REGISTRY = [
  // ── PARCHEMINS ────────────────────────────────────────────────────────────
  { id:'parchemin_ile_1',      name:"Parchemin de l'Île aux Squelettes", type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île aux Squelettes.",       enabled:true },
  { id:'parchemin_ile_2',      name:"Parchemin de l'Île des Tempêtes",   type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île des Tempêtes.",         enabled:true },
  { id:'parchemin_ile_3',      name:"Parchemin de l'Île Dorée",          type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île Dorée.",                 enabled:true },
  { id:'parchemin_ile_4',      name:"Parchemin de l'Île des Brumes",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île des Brumes.",            enabled:true },
  { id:'parchemin_ile_5',      name:"Parchemin de l'Île du Kraken",      type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île du Kraken.",             enabled:true },
  { id:'parchemin_ile_6',      name:"Parchemin de l'Île Volcanique",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île Volcanique.",            enabled:true },
  { id:'parchemin_ile_7',      name:"Parchemin de l'Île des Naufragés",  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île des Naufragés.",         enabled:true },
  { id:'parchemin_ile_8',      name:"Parchemin de l'Île des Épices",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île des Épices.",            enabled:true },
  { id:'parchemin_ile_9',      name:"Parchemin de l'Île des Coraux",     type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île des Coraux.",            enabled:true },
  { id:'parchemin_ile_10',     name:"Parchemin de l'Île Fantôme",        type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.ILE,    icon:'📜', description:"Révèle la route vers l'Île Fantôme.",               enabled:true },
  { id:'parchemin_vierge_1',   name:'Parchemin Vierge',                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:'📄', description:'Aucune destination. À compléter avec des Énigmes.', enabled:true },
  { id:'parchemin_vierge_2',   name:'Parchemin Vierge',                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:'📄', description:'Aucune destination. À compléter avec des Énigmes.', enabled:true },
  { id:'parchemin_vierge_3',   name:'Parchemin Vierge',                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:'📄', description:'Aucune destination. À compléter avec des Énigmes.', enabled:true },
  { id:'parchemin_vierge_4',   name:'Parchemin Vierge',                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:'📄', description:'Aucune destination. À compléter avec des Énigmes.', enabled:true },
  { id:'parchemin_vierge_5',   name:'Parchemin Vierge',                  type:CARD_TYPES.PARCHEMIN, subtype:CARD_SUBTYPES.VIERGE, icon:'📄', description:'Aucune destination. À compléter avec des Énigmes.', enabled:true },

  // ── ÉNIGMES ───────────────────────────────────────────────────────────────
  { id:'enigme_latitude_1',  name:'Énigme — Latitude I',    type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LATITUDE,  icon:'🔍', description:"Révèle une coordonnée sur l'axe des abscisses.", enabled:true },
  { id:'enigme_latitude_2',  name:'Énigme — Latitude II',   type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LATITUDE,  icon:'🔍', description:"Révèle une coordonnée sur l'axe des abscisses.", enabled:true },
  { id:'enigme_latitude_3',  name:'Énigme — Latitude III',  type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LATITUDE,  icon:'🔍', description:"Révèle une coordonnée sur l'axe des abscisses.", enabled:true },
  { id:'enigme_longitude_1', name:'Énigme — Longitude I',   type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LONGITUDE, icon:'🔍', description:"Révèle une coordonnée sur l'axe des ordonnées.", enabled:true },
  { id:'enigme_longitude_2', name:'Énigme — Longitude II',  type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LONGITUDE, icon:'🔍', description:"Révèle une coordonnée sur l'axe des ordonnées.", enabled:true },
  { id:'enigme_longitude_3', name:'Énigme — Longitude III', type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.LONGITUDE, icon:'🔍', description:"Révèle une coordonnée sur l'axe des ordonnées.", enabled:true },
  { id:'enigme_code_1',      name:'Énigme — Code I',        type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.CODE,      icon:'🔐', description:'Combinaison de déchiffrement des coordonnées.',  enabled:true },
  { id:'enigme_code_2',      name:'Énigme — Code II',       type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.CODE,      icon:'🔐', description:'Combinaison de déchiffrement des coordonnées.',  enabled:true },
  { id:'enigme_code_3',      name:'Énigme — Code III',      type:CARD_TYPES.ENIGME, subtype:CARD_SUBTYPES.CODE,      icon:'🔐', description:'Combinaison de déchiffrement des coordonnées.',  enabled:true },

  // ── ANCIENS PARCHEMINS ────────────────────────────────────────────────────
  // 3 cartes rares, une par relique (Poséidon / Éole / Zeus)
  // L'île de destination est configurable par l'admin.
  { id:'ancien_parchemin_poseidon', name:'Ancien Parchemin — Totem de Poséidon', type:CARD_TYPES.ANCIEN_PARCHEMIN, subtype:null, icon:'🗺', description:"Route secrète menant à l'île gardant le Totem de Poséidon.", enabled:true },
  { id:'ancien_parchemin_eole',     name:"Ancien Parchemin — Totem d'Éole",      type:CARD_TYPES.ANCIEN_PARCHEMIN, subtype:null, icon:'🗺', description:"Route secrète menant à l'île gardant le Totem d'Éole.",      enabled:true },
  { id:'ancien_parchemin_zeus',     name:'Ancien Parchemin — Totem de Zeus',      type:CARD_TYPES.ANCIEN_PARCHEMIN, subtype:null, icon:'🗺', description:"Route secrète menant à l'île gardant le Totem de Zeus.",      enabled:true },

  // ── RELIQUES ─────────────────────────────────────────────────────────────
  { id:'relique_poseidon', name:'Totem de Poséidon', type:CARD_TYPES.RELIQUE, subtype:null, icon:'🔱', description:"Contrôle des mers. La carte Mer d'Huile n'a plus d'effet sur vous.",    enabled:true },
  { id:'relique_eole',     name:"Totem d'Éole",      type:CARD_TYPES.RELIQUE, subtype:null, icon:'💨', description:"Contrôle des vents. La carte Vent Violent n'a plus d'effet sur vous.", enabled:true },
  { id:'relique_zeus',     name:'Totem de Zeus',      type:CARD_TYPES.RELIQUE, subtype:null, icon:'⚡', description:"Contrôle de la foudre. La carte Orage n'a plus d'effet sur vous.",     enabled:true },

  // ── ÉQUIPEMENTS ───────────────────────────────────────────────────────────
  { id:'equipement_boulet_poudre',  name:'Boulet et Poudre',  type:CARD_TYPES.EQUIPEMENT, subtype:null, icon:'💥', description:'Ressource de combat. Occupe 1 slot cargaison.',    enabled:true },
  { id:'equipement_planches_clous', name:'Planches et Clous', type:CARD_TYPES.EQUIPEMENT, subtype:null, icon:'🪵', description:'Ressource de réparation. Occupe 1 slot cargaison.', enabled:true },
];

function getCardById(id)         { return CARD_REGISTRY.find(c => c.id === id) || null; }
function getCardsByType(type)    { return CARD_REGISTRY.filter(c => c.type === type); }
function getCardsBySubtype(sub)  { return CARD_REGISTRY.filter(c => c.subtype === sub); }
function getEnabledCards()       { return CARD_REGISTRY.filter(c => c.enabled); }

module.exports = { CARD_TYPES, CARD_SUBTYPES, CARD_REGISTRY, getCardById, getCardsByType, getCardsBySubtype, getEnabledCards };