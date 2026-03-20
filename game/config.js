// ═══════════════════════════════════════════════════════════════════════════════
// game/config.js — Persistance et defaults de la configuration admin
//
// Responsabilité unique : charger, sauvegarder et migrer adminConfig.
// Aucune logique de jeu ici.
// ═══════════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const { RULES } = require('./rules');

const DATA_DIR    = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// ─── Valeurs par défaut ────────────────────────────────────────────────────────

const DEFAULT_ILES = [
  { id: 'ile_0', nom: 'Île aux Squelettes', biome: 'Jungle maudite',      icon: '💀', nb_objets: 6, cases: [{ q: 11, r: 1  }, { q: 12, r: 2  }] },
  { id: 'ile_1', nom: 'Île des Tempêtes',   biome: 'Récifs balayés',      icon: '⛈',  nb_objets: 6, cases: [{ q: 21, r: 4  }, { q: 22, r: 4  }] },
  { id: 'ile_2', nom: 'Île Dorée',          biome: 'Plages de sable fin', icon: '💰', nb_objets: 6, cases: [{ q: 5,  r: 7  }] },
  { id: 'ile_3', nom: 'Île des Brumes',     biome: 'Marais mystérieux',   icon: '🌫', nb_objets: 6, cases: [{ q: 17, r: 8  }] },
  { id: 'ile_4', nom: 'Île du Kraken',      biome: 'Abysses redoutés',    icon: '🦑', nb_objets: 6, cases: [{ q: 2,  r: 14 }] },
  { id: 'ile_5', nom: 'Île Volcanique',     biome: 'Terres ardentes',     icon: '🌋', nb_objets: 6, cases: [{ q: 8,  r: 13 }, { q: 9, r: 13 }, { q: 9, r: 14 }] },
  { id: 'ile_6', nom: 'Île des Naufragés',  biome: 'Épaves et ruines',    icon: '⚓', nb_objets: 6, cases: [{ q: 16, r: 15 }] },
  { id: 'ile_7', nom: 'Île des Épices',     biome: 'Forêts aromatiques',  icon: '🌿', nb_objets: 6, cases: [{ q: 22, r: 14 }] },
  { id: 'ile_8', nom: 'Île des Coraux',     biome: 'Lagon turquoise',     icon: '🪸', nb_objets: 6, cases: [{ q: 5,  r: 20 }, { q: 5, r: 21 }] },
  { id: 'ile_9', nom: 'Île Fantôme',        biome: 'Brume perpétuelle',   icon: '👻', nb_objets: 6, cases: [{ q: 20, r: 21 }] },
];

const DEFAULT_PORTS = [
  { id: 'port_0', nom: 'Port de la Tortue',    coord_q: 4,  coord_r: 3  },
  { id: 'port_1', nom: 'Port du Roi des Mers', coord_q: 12, coord_r: 5  },
  { id: 'port_2', nom: "Port de l'Orient",     coord_q: 23, coord_r: 10 },
  { id: 'port_3', nom: 'Port des Caraïbes',    coord_q: 16, coord_r: 18 },
  { id: 'port_4', nom: 'Port du Couchant',     coord_q: 4,  coord_r: 13 },
];

const DEFAULT_REPAIRES = [
  { id: 'rep_0', nom: 'Repaire de la Grotte Noire',  coord_q: 1,  coord_r: 6  },
  { id: 'rep_1', nom: 'Repaire du Cap des Traîtres', coord_q: 23, coord_r: 2  },
  { id: 'rep_2', nom: 'Repaire de la Baie Maudite',  coord_q: 7,  coord_r: 20 },
  { id: 'rep_3', nom: 'Repaire du Rocher du Diable', coord_q: 23, coord_r: 18 },
];

const DEFAULT_EPAVES = [
  { id: 'ep_0', nom: 'Épave du Santa Fortuna',   coord_q: 1,  coord_r: 1  },
  { id: 'ep_1', nom: 'Épave du Corsaire Noir',   coord_q: 18, coord_r: 2  },
  { id: 'ep_2', nom: 'Épave du Brise-Lame',      coord_q: 8,  coord_r: 9  },
  { id: 'ep_3', nom: "Épave du Pélican d'Or",    coord_q: 20, coord_r: 12 },
  { id: 'ep_4', nom: 'Épave du Sanctuaire',      coord_q: 2,  coord_r: 19 },
  { id: 'ep_5', nom: 'Épave du Dragon des Mers', coord_q: 11, coord_r: 17 },
  { id: 'ep_6', nom: 'Épave du Vieux Jacques',   coord_q: 22, coord_r: 21 },
];

// ─── Config par défaut complète ───────────────────────────────────────────────

function buildDefaultConfig() {
  return {
    cards: {
      parchemin_ile: DEFAULT_ILES.map((ile, i) => ({
        id: `pi_${i}`,
        ile: ile.nom,
        description: '',
      })),
      parchemin_vierge: { count: 10 },
      enigme_latitude:  Array.from({ length: 3 }, (_, i) => ({ id: `el_${i}`,  valeur: i + 1 })),
      enigme_longitude: Array.from({ length: 3 }, (_, i) => ({ id: `elo_${i}`, valeur: i + 1 })),
      enigme_code:      Array.from({ length: 3 }, (_, i) => ({ id: `ec_${i}`,  delta_lat: 0, delta_lon: 0, description: '' })),
      ancien_parchemin: [
        { id: 'ap_poseidon', relique: 'Totem de Poséidon', ile_destination: '', description: '' },
        { id: 'ap_eole',     relique: "Totem d'Éole",      ile_destination: '', description: '' },
        { id: 'ap_zeus',     relique: 'Totem de Zeus',     ile_destination: '', description: '' },
      ],
      reliques: {
        poseidon: { event: "Mer d'Huile",  desc: "Contrôle des mers. La carte Mer d'Huile n'a plus d'effet sur vous.",    enabled: true },
        eole:     { event: 'Vent Violent', desc: "Contrôle des vents. La carte Vent Violent n'a plus d'effet sur vous.", enabled: true },
        zeus:     { event: 'Orage',        desc: "Contrôle de la foudre. La carte Orage n'a plus d'effet sur vous.",     enabled: true },
      },
      equipement: [
        { id: 'eq_0', nom: 'Boulet et Poudre',  description: 'Ressource de combat. Occupe 1 slot cargaison.',    enabled: true },
        { id: 'eq_1', nom: 'Planches et Clous', description: 'Ressource de réparation. Occupe 1 slot cargaison.', enabled: true },
      ],
      action_offensive: [
        { id: 'ao_0', nom: 'Boulet de Canon',      description: "Inflige des dégâts à un joueur dans la portée de tes canons.",           enabled: true },
        { id: 'ao_1', nom: "À l'Abordage !",       description: 'Vole des doublons à un joueur adjacent.',                               enabled: true },
        { id: 'ao_2', nom: 'Sabotage',             description: "Réduit le déplacement d'un joueur adverse à son prochain tour.",        enabled: true },
        { id: 'ao_3', nom: 'Vol de Parchemin',     description: 'Vole un Parchemin aléatoire à un joueur adjacent.',                     enabled: true },
        { id: 'ao_4', nom: 'Brouillard de Guerre', description: "Force un joueur adverse à relancer son dé et garder le pire résultat.", enabled: true },
      ],
      action_defensive: [
        { id: 'ad_0', nom: 'Parade !',          description: "Annule une carte offensive jouée contre toi ce tour.",  enabled: true },
        { id: 'ad_1', nom: 'Renforts de Coque', description: "Absorbe les prochains dégâts reçus sur la coque.",      enabled: true },
        { id: 'ad_2', nom: 'Brume Protectrice', description: "Ton navire est insaisissable ce tour.",                  enabled: true },
      ],
      atout: [
        { id: 'at_0', nom: 'Vent en Poupe',      description: "Ajoute +2 cases à ton déplacement ce tour.",   enabled: true },
        { id: 'at_1', nom: 'Navigation Étoilée', description: 'Relance ton dé et garde le meilleur résultat.', enabled: true },
        { id: 'at_2', nom: 'Trésor Caché',       description: 'Gagne 3 doublons immédiatement.',               enabled: true },
      ],
      evenement: [
        { id: 'ev_0', nom: "Mer d'Huile",      description: "Tu ne peux pas te déplacer ce tour.",                           annule_relique: 'relique_poseidon', enabled: true },
        { id: 'ev_1', nom: 'Vent Violent',      description: 'Tu te déplaces de 3 cases dans une direction aléatoire.',      annule_relique: 'relique_eole',     enabled: true },
        { id: 'ev_2', nom: 'Orage',             description: 'Tu perds 1 point de coque.',                                   annule_relique: 'relique_zeus',     enabled: true },
        { id: 'ev_3', nom: 'Fortune de Mer',    description: "Tu trouves une épave à la dérive. Gagne 2 doublons.",          annule_relique: '',                 enabled: true },
        { id: 'ev_4', nom: 'Attaque du Kraken', description: 'Passe ton prochain tour et perds 1 point de coque.',           annule_relique: '',                 enabled: true },
        { id: 'ev_5', nom: 'Chant des Sirènes', description: "Envoûté par les sirènes. Défausse une carte action au choix.", annule_relique: '',                 enabled: true },
      ],
      iles:       JSON.parse(JSON.stringify(DEFAULT_ILES)),
      ports:      JSON.parse(JSON.stringify(DEFAULT_PORTS)),
      repaires:   JSON.parse(JSON.stringify(DEFAULT_REPAIRES)),
      epaves:     JSON.parse(JSON.stringify(DEFAULT_EPAVES)),
      avancement: { nb_cartes_temps: 6 },
    },
    rules: JSON.parse(JSON.stringify(RULES)),
  };
}

// ─── Migration des îles ────────────────────────────────────────────────────────

function migrateIles(iles) {
  return iles.map((ile, i) => {
    // Ancien format coord_q/coord_r → cases[]
    if (!ile.cases) {
      const cases = [];
      if (ile.coord_q != null && ile.coord_r != null)
        cases.push({ q: ile.coord_q, r: ile.coord_r });
      const { coord_q, coord_r, ...rest } = ile; // eslint-disable-line no-unused-vars
      ile = { ...rest, cases };
    }
    // Forcer nb_objets à 6 minimum
    if (!ile.nb_objets || ile.nb_objets < 6) ile.nb_objets = 6;
    // Coordonnées par défaut si manquantes
    const defaut = DEFAULT_ILES[i];
    if (defaut && (!ile.cases.length || ile.cases.every(c => c.q == null && c.r == null)))
      ile.cases = JSON.parse(JSON.stringify(defaut.cases));
    return ile;
  });
}

// ─── Chargement / sauvegarde ──────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Charge la config depuis le disque (ou retourne null).
 * @returns {object|null}
 */
function loadConfig() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log('  → Aucun config.json trouvé, utilisation des valeurs par défaut.');
    return null;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const cfg = JSON.parse(raw);
    console.log('  ✓ config.json chargé.');
    return cfg;
  } catch (e) {
    console.error('  ✗ Erreur lecture config.json :', e.message);
    return null;
  }
}

/**
 * Sauvegarde la config sur le disque.
 * @param {object} cfg
 * @returns {boolean}
 */
function saveConfig(cfg) {
  ensureDataDir();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    console.log('  ✓ config.json sauvegardé.');
    return true;
  } catch (e) {
    console.error('  ✗ Erreur écriture config.json :', e.message);
    return false;
  }
}

/**
 * Initialise adminConfig depuis le disque ou les valeurs par défaut,
 * en appliquant toutes les migrations nécessaires.
 * @returns {object} adminConfig
 */
function initConfig() {
  const saved   = loadConfig();
  const cfg     = saved || buildDefaultConfig();

  // Garantir les clés manquantes sur un ancien config.json
  if (!cfg.cards.iles      || !cfg.cards.iles.length)      cfg.cards.iles      = JSON.parse(JSON.stringify(DEFAULT_ILES));
  if (!cfg.cards.ports     || !cfg.cards.ports.length)     cfg.cards.ports     = JSON.parse(JSON.stringify(DEFAULT_PORTS));
  if (!cfg.cards.repaires  || !cfg.cards.repaires.length)  cfg.cards.repaires  = JSON.parse(JSON.stringify(DEFAULT_REPAIRES));
  if (!cfg.cards.epaves    || !cfg.cards.epaves.length)    cfg.cards.epaves    = JSON.parse(JSON.stringify(DEFAULT_EPAVES));
  if (!cfg.cards.avancement)                                cfg.cards.avancement = { nb_cartes_temps: 6 };

  // Migration îles
  cfg.cards.iles = migrateIles(cfg.cards.iles);

  return cfg;
}

module.exports = {
  loadConfig,
  saveConfig,
  initConfig,
  buildDefaultConfig,
  DEFAULT_ILES,
  DEFAULT_PORTS,
  DEFAULT_REPAIRES,
  DEFAULT_EPAVES,
};
