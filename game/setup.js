// ═══════════════════════════════════════════════════════════════════════════════
// game/setup.js — Mise en place d'une partie : tirage des cartes
//
// Expose une seule fonction buildSetup(adminConfig) qui retourne le tirage
// initial complet, sans toucher au gameState.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mélange un tableau de façon aléatoire (Fisher-Yates).
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Construit l'état de mise en place d'une partie à partir de la config admin.
 *
 * Retourne :
 * {
 *   parcheminsParIle : { [ileId]: { card, visible } }
 *   enigmes          : { latitude, longitude, code }
 *   cardsTemps       : Array<{ id, index, visible }>
 *   ileOrder         : string[]   — ids des îles dans l'ordre
 * }
 *
 * @param {object} adminConfig — adminConfig.cards issu de config.json
 * @returns {object}
 */
function buildSetup(adminConfig) {
  const cards = adminConfig.cards;

  // Îles valides (avec coordonnées)
  const iles = (cards.iles || []).filter(ile => {
    const cases = ile.cases || [];
    if (cases.some(c => c.q != null && c.r != null)) return true;
    return ile.coord_q != null && ile.coord_r != null;
  });

  // ── 1. Parchemins ──────────────────────────────────────────────────────────
  // 3 parchemins île tirés aléatoirement + compléter avec des vierges
  const parcheminIlePool = shuffleArray(cards.parchemin_ile || []);
  const nbIleCards  = Math.min(3, parcheminIlePool.length);
  const selectedIle = parcheminIlePool.slice(0, nbIleCards).map(c => ({ ...c, type: 'ile' }));
  const nbVierge    = Math.max(0, iles.length - nbIleCards);
  const viergeCards = Array.from({ length: nbVierge }, (_, i) => ({
    id: `vierge_setup_${i}`,
    type: 'vierge',
    nom: 'Parchemin Vierge',
    icon: '📄',
  }));

  const deckParchemins = shuffleArray([...selectedIle, ...viergeCards]);

  const parcheminsParIle = {};
  iles.forEach((ile, i) => {
    parcheminsParIle[ile.id] = {
      card:    deckParchemins[i] || null,
      visible: false,
    };
  });

  // ── 2. Énigmes ─────────────────────────────────────────────────────────────
  const latPool  = shuffleArray(cards.enigme_latitude  || []);
  const lonPool  = shuffleArray(cards.enigme_longitude || []);
  const codePool = shuffleArray(cards.enigme_code      || []);

  const enigmes = {
    latitude:  latPool[0]  ? { ...latPool[0],  type: 'latitude',  visible: false } : null,
    longitude: lonPool[0]  ? { ...lonPool[0],  type: 'longitude', visible: false } : null,
    code:      codePool[0] ? { ...codePool[0], type: 'code',      visible: false } : null,
  };

  // ── 3. Cartes Temps ────────────────────────────────────────────────────────
  const nbTemps  = cards.avancement?.nb_cartes_temps || 6;
  const cardsTemps = Array.from({ length: nbTemps }, (_, i) => ({
    id: `temps_${i}`,
    index: i + 1,
    visible: false,
  }));

  return {
    parcheminsParIle,
    enigmes,
    cardsTemps,
    ileOrder: iles.map(ile => ile.id),
  };
}

module.exports = { buildSetup, shuffleArray };
