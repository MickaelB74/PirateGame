// ═══════════════════════════════════════════════════════════════════════════════
// game/config.js — Persistance et defaults de la configuration admin
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

// Reliques : 3 fixes, toujours poseidon / eole / zeus — structure immuable
const DEFAULT_RELIQUES = {
  poseidon: { event: "Mer d'Huile",  desc: "Contrôle des mers. La carte Mer d'Huile n'a plus d'effet sur vous.",    enabled: true },
  eole:     { event: 'Vent Violent', desc: "Contrôle des vents. La carte Vent Violent n'a plus d'effet sur vous.", enabled: true },
  zeus:     { event: 'Orage',        desc: "Contrôle de la foudre. La carte Orage n'a plus d'effet sur vous.",     enabled: true },
};

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

      // 3 anciens parchemins — champ `relique` est un label d'affichage fixe,
      // seuls `ile_destination` et `description` sont configurables par l'admin.
      ancien_parchemin: [
        {
          id:              'ap_poseidon',
          relique:         'Totem de Poséidon',
          ile_destination: "Île du Kraken",
          description:     "Une carte usée révèle la route vers les abysses du Kraken.",
        },
        {
          id:              'ap_eole',
          relique:         "Totem d'Éole",
          ile_destination: "Île des Brumes",
          description:     "Des inscriptions floues indiquent les marais de l'Île des Brumes.",
        },
        {
          id:              'ap_zeus',
          relique:         'Totem de Zeus',
          ile_destination: "Île Fantôme",
          description:     "Une encre invisible révèle la route vers l'Île Fantôme.",
        },
      ],

      // Reliques liées — toujours les 3 mêmes, reconstruites à l'init
      reliques: JSON.parse(JSON.stringify(DEFAULT_RELIQUES)),

      // Équipements
      equipement: [
        { id: 'eq_0', nom: 'Boulet et Poudre',  description: 'Ressource de combat. Occupe 1 slot cargaison.',    enabled: true },
        { id: 'eq_1', nom: 'Planches et Clous', description: 'Ressource de réparation. Occupe 1 slot cargaison.', enabled: true },
      ],

      // Actions / Atouts / Événements : vides — structure à définir plus tard
      action_offensive: [],
      action_defensive: [],
      atout:            [],
      evenement:        [],

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
    if (!ile.cases) {
      const cases = [];
      if (ile.coord_q != null && ile.coord_r != null)
        cases.push({ q: ile.coord_q, r: ile.coord_r });
      const { coord_q, coord_r, ...rest } = ile;
      ile = { ...rest, cases };
    }
    if (!ile.nb_objets || ile.nb_objets < 6) ile.nb_objets = 6;
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

function initConfig() {
  const saved = loadConfig();
  const cfg   = saved || buildDefaultConfig();

  // Garantir les clés structurelles manquantes
  if (!cfg.cards.iles      || !cfg.cards.iles.length)      cfg.cards.iles      = JSON.parse(JSON.stringify(DEFAULT_ILES));
  if (!cfg.cards.ports     || !cfg.cards.ports.length)     cfg.cards.ports     = JSON.parse(JSON.stringify(DEFAULT_PORTS));
  if (!cfg.cards.repaires  || !cfg.cards.repaires.length)  cfg.cards.repaires  = JSON.parse(JSON.stringify(DEFAULT_REPAIRES));
  if (!cfg.cards.epaves    || !cfg.cards.epaves.length)    cfg.cards.epaves    = JSON.parse(JSON.stringify(DEFAULT_EPAVES));
  if (!cfg.cards.avancement)                                cfg.cards.avancement = { nb_cartes_temps: 6 };

  // Reliques : toujours reconstruites depuis les défauts (immuables)
  cfg.cards.reliques = JSON.parse(JSON.stringify(DEFAULT_RELIQUES));

  // Anciens parchemins : garantir les 3 entrées avec les bons ids/reliques,
  // en préservant ile_destination et description si déjà renseignés.
  const AP_DEFAULTS = buildDefaultConfig().cards.ancien_parchemin;
  if (!Array.isArray(cfg.cards.ancien_parchemin) || cfg.cards.ancien_parchemin.length !== 3) {
    cfg.cards.ancien_parchemin = AP_DEFAULTS;
  } else {
    cfg.cards.ancien_parchemin = AP_DEFAULTS.map((def, i) => {
      const saved = cfg.cards.ancien_parchemin[i] || {};
      return {
        id:              def.id,
        relique:         def.relique,
        ile_destination: saved.ile_destination ?? def.ile_destination,
        description:     saved.description     ?? def.description,
      };
    });
  }

  // Actions / Atouts / Événements : toujours forcés à vide côté serveur
  cfg.cards.action_offensive = [];
  cfg.cards.action_defensive = [];
  cfg.cards.atout            = [];
  cfg.cards.evenement        = [];

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
  DEFAULT_RELIQUES,
};