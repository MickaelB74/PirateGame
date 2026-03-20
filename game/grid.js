// ═══════════════════════════════════════════════════════════════════════════════
// game/grid.js — Logique de la grille hexagonale (offset coords)
//
// Grille : 22 rangs (r=0..21)
//   rangs pairs  → 25 colonnes (q=0..24)
//   rangs impairs → 24 colonnes (q=0..23)
//
// Aucune dépendance DOM. Utilisé côté serveur ET importable côté client.
// ═══════════════════════════════════════════════════════════════════════════════

const GRID_ROWS = 22;

/**
 * Nombre de colonnes pour un rang donné.
 * @param {number} r
 * @returns {number}
 */
function colsForRow(r) {
  return r % 2 === 0 ? 26 : 25;
}

/**
 * Indique si une cellule (q, r) existe dans la grille.
 * @param {number} q
 * @param {number} r
 * @returns {boolean}
 */
function isValidCell(q, r) {
  return r >= 0 && r < GRID_ROWS && q >= 0 && q < colsForRow(r);
}

/**
 * Retourne les voisins valides d'une cellule (q, r).
 * Utilise les directions offset "even-r" / "odd-r".
 * @param {number} q
 * @param {number} r
 * @returns {Array<{q:number, r:number}>}
 */
function hexNeighbors(q, r) {
  const dirs = (r % 2 === 0)
    ? [[-1, 0], [1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]]
    : [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
  return dirs
    .map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
    .filter(n => isValidCell(n.q, n.r));
}

/**
 * BFS : retourne toutes les cellules accessibles en `range` pas depuis (q, r).
 * - La cellule de départ n'est PAS incluse dans le résultat.
 * - Les cellules bloquées (blockedSet) arrêtent la propagation (et sont incluses
 *   dans le résultat comme destinations "à la bordure").
 * - Les cellules de tempête (stormSet) sont totalement inaccessibles.
 * - Les cellules occupées par d'autres joueurs sont ignorées.
 *
 * @param {number} q
 * @param {number} r
 * @param {number} range
 * @param {Set<string>} blockedSet   — clés "q,r" des cases bloquées (îles, ports…)
 * @param {Set<string>} stormSet     — clés "q,r" des cases de tempête
 * @param {Array<{q:number,r:number}>} occupiedPositions — positions des autres joueurs
 * @returns {Array<{q:number, r:number}>}
 */
function hexesInRange(q, r, range, blockedSet, stormSet, occupiedPositions) {
  const blocked  = blockedSet  || new Set();
  const storm    = stormSet    || new Set();
  const occupied = new Set((occupiedPositions || []).map(p => `${p.q},${p.r}`));

  const visited = new Set();
  const result  = [];
  const queue   = [{ q, r, dist: 0, stoppedHere: false }];
  visited.add(`${q},${r}`);

  while (queue.length) {
    const { q: cq, r: cr, dist, stoppedHere } = queue.shift();

    if (dist > 0) result.push({ q: cq, r: cr });
    if (dist >= range || stoppedHere) continue;

    for (const n of hexNeighbors(cq, cr)) {
      const key = `${n.q},${n.r}`;
      if (visited.has(key))    continue;
      if (storm.has(key))      continue;
      if (occupied.has(key))   continue;
      visited.add(key);
      const isBlocked = blocked.has(key);
      queue.push({ ...n, dist: dist + 1, stoppedHere: isBlocked });
    }
  }

  return result;
}

/**
 * Points de départ fixes de la partie.
 * @type {Array<{q:number, r:number}>}
 */
const START_POSITIONS = [
  { q:  0, r:  0 },
  { q: 25, r:  0 },
  { q:  0, r: 10 },
  { q: 25, r: 10 },
  { q:  0, r: 21 },
  { q: 24, r: 21 },
];

/**
 * Cases de tempête permanentes (infranchissables).
 * @type {Set<string>}
 */
const STORM_CELLS = new Set([
  '11,9', '12,9', '13,9',
  '11,10', '12,10', '13,10', '14,10',
  '11,11', '12,11', '13,11',
  '12,12', '13,12',
]);

module.exports = {
  GRID_ROWS,
  colsForRow,
  isValidCell,
  hexNeighbors,
  hexesInRange,
  START_POSITIONS,
  STORM_CELLS,
};
