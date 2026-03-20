// ═══════════════════════════════════════════════════════════════════════════════
// shared/hex.js — Maths hexagonaux côté client
//
// Constantes par défaut synchronisées avec celles du serveur.
// L'outil de calibration (master/player) peut les surcharger dynamiquement.
// ═══════════════════════════════════════════════════════════════════════════════

export const IMG_W   = 1288;
export const IMG_H   = 952;
export const GRID_ROWS = 22;

// Paramètres de placement — peuvent être modifiés par la calibration
export let HEX_R      = 24.100;
export let MARGIN_X   = 48.5;
export let MARGIN_Y   = 42.5;
export let COL_SP     = 48.500;
export let ROW_SP     = 41.900;
export let ROW_OFFSET = 24.300;

/**
 * Modifie les paramètres de calibration.
 * @param {object} params
 */
export function setCalibParams(params) {
  if (params.HEX_R      != null) HEX_R      = params.HEX_R;
  if (params.MARGIN_X   != null) MARGIN_X   = params.MARGIN_X;
  if (params.MARGIN_Y   != null) MARGIN_Y   = params.MARGIN_Y;
  if (params.COL_SP     != null) COL_SP     = params.COL_SP;
  if (params.ROW_SP     != null) ROW_SP     = params.ROW_SP;
  if (params.ROW_OFFSET != null) ROW_OFFSET = params.ROW_OFFSET;
}

/**
 * Nombre de colonnes pour un rang.
 * @param {number} r
 * @returns {number}
 */
export function colsForRow(r) {
  return r % 2 === 0 ? 26 : 25;
}

/**
 * Centre d'une cellule (q, r) en coordonnées image (px).
 * @param {number} q
 * @param {number} r
 * @param {number} [scale=1]
 * @returns {{x:number, y:number}}
 */
export function hexCenter(q, r, scale = 1) {
  return {
    x: (MARGIN_X + q * COL_SP + (r % 2 === 1 ? ROW_OFFSET : 0)) * scale,
    y: (MARGIN_Y + r * ROW_SP) * scale,
  };
}

/**
 * Points d'un hexagone centré en (cx, cy).
 * @param {number} cx
 * @param {number} cy
 * @param {number} [scale=1]
 * @returns {string} SVG points string
 */
export function hexPoints(cx, cy, scale = 1) {
  const R   = HEX_R * scale;
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 2 + (Math.PI / 3) * i;
    pts.push(`${cx + R * Math.cos(angle)},${cy - R * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

/**
 * Points de départ disponibles.
 */
export const START_POSITIONS = [
  { q:  0, r:  0 },
  { q: 24, r:  0 },
  { q:  0, r: 10 },
  { q: 24, r: 10 },
  { q:  0, r: 21 },
  { q: 24, r: 21 },
];
