// ═══════════════════════════════════════════════════════════════════════════════
// admin/admin.js — Éditeur de configuration (ES module)
// ═══════════════════════════════════════════════════════════════════════════════

const STORM_CELLS = [
  {q:11,r:9},{q:12,r:9},{q:13,r:9},
  {q:11,r:10},{q:12,r:10},{q:13,r:10},{q:14,r:10},
  {q:11,r:11},{q:12,r:11},{q:13,r:11},
  {q:12,r:12},{q:13,r:12},
];

const DEFAULT_ILES = [
  { id:'ile_0', nom:'Île aux Squelettes', biome:'Jungle maudite',      icon:'💀', nb_objets:6, cases:[{q:11,r:1},{q:12,r:2}] },
  { id:'ile_1', nom:'Île des Tempêtes',   biome:'Récifs balayés',      icon:'⛈',  nb_objets:6, cases:[{q:21,r:4},{q:22,r:4}] },
  { id:'ile_2', nom:'Île Dorée',          biome:'Plages de sable fin', icon:'💰', nb_objets:6, cases:[{q:5,r:7}] },
  { id:'ile_3', nom:'Île des Brumes',     biome:'Marais mystérieux',   icon:'🌫', nb_objets:6, cases:[{q:17,r:8}] },
  { id:'ile_4', nom:'Île du Kraken',      biome:'Abysses redoutés',    icon:'🦑', nb_objets:6, cases:[{q:2,r:14}] },
  { id:'ile_5', nom:'Île Volcanique',     biome:'Terres ardentes',     icon:'🌋', nb_objets:6, cases:[{q:8,r:13},{q:9,r:13},{q:9,r:14}] },
  { id:'ile_6', nom:'Île des Naufragés',  biome:'Épaves et ruines',    icon:'⚓', nb_objets:6, cases:[{q:16,r:15}] },
  { id:'ile_7', nom:'Île des Épices',     biome:'Forêts aromatiques',  icon:'🌿', nb_objets:6, cases:[{q:22,r:14}] },
  { id:'ile_8', nom:'Île des Coraux',     biome:'Lagon turquoise',     icon:'🪸', nb_objets:6, cases:[{q:5,r:20},{q:5,r:21}] },
  { id:'ile_9', nom:'Île Fantôme',        biome:'Brume perpétuelle',   icon:'👻', nb_objets:6, cases:[{q:20,r:21}] },
];

const RELIQUES_FIXES = [
  { key: 'poseidon', icon: '🔱', name: 'Totem de Poséidon' },
  { key: 'eole',     icon: '💨', name: "Totem d'Éole"      },
  { key: 'zeus',     icon: '⚡', name: 'Totem de Zeus'      },
];

// ─── État ────────────────────────────────────────────────────────────────────
let state = {};
let _uid  = 1000;

function uid() { return `c${++_uid}`; }
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function getIleOptions(selectedNom = '') {
  const iles = state.iles || DEFAULT_ILES;
  return `<option value="">— Aucune —</option>` +
    iles.map(ile => {
      const nom = ile.nom || 'Île';
      const sel = selectedNom === nom ? 'selected' : '';
      return `<option value="${esc(nom)}" ${sel}>${esc(ile.icon || '🏝')} ${esc(nom)}</option>`;
    }).join('');
}

// ─── Helpers cascade ─────────────────────────────────────────────────────────

/** Retourne les actions joueur disponibles (niveau 4) */
function getActionsJoueur() {
  return state.actions_joueur || [];
}

/** Retourne les effets disponibles (niveau 3), avec leurs actions joueur liées */
function getEffets() {
  return state.effets || [];
}

/** Retourne les événements génériques (niveau 2) */
function getEvenementsGeneriques() {
  return state.evenements_generiques || [];
}

/** Vérifie si un effet est complet (a au moins une action joueur liée) */
function isEffetComplet(effet) {
  return Array.isArray(effet.actions_joueur_ids) && effet.actions_joueur_ids.length > 0;
}

/** Vérifie si un événement générique est complet (a au moins un effet lié) */
function isEvenementComplet(ev) {
  if (!Array.isArray(ev.effets_ids) || ev.effets_ids.length === 0) return false;
  const effets = getEffets();
  return ev.effets_ids.every(id => {
    const ef = effets.find(e => e.id === id);
    return ef && isEffetComplet(ef);
  });
}

/** Compte les éléments complets dans un tableau */
function countComplets(arr, checkFn) {
  return arr.filter(checkFn).length;
}

// ─── Options HTML pour les selects en cascade ────────────────────────────────

function optionsActionsJoueur(selectedIds = []) {
  const actions = getActionsJoueur();
  if (!actions.length) {
    return `<option value="" disabled>— Aucune action joueur définie —</option>`;
  }
  return actions.map(a =>
    `<option value="${esc(a.id)}" ${selectedIds.includes(a.id) ? 'selected' : ''}>${esc(a.icone || '▶')} ${esc(a.nom || 'Sans nom')}</option>`
  ).join('');
}

function optionsEffets(selectedIds = []) {
  const effets = getEffets();
  if (!effets.length) {
    return `<option value="" disabled>— Aucun effet défini —</option>`;
  }
  return effets.map(ef => {
    const complet = isEffetComplet(ef);
    const label = complet ? `${esc(ef.icone || '⚡')} ${esc(ef.nom || 'Sans nom')}` : `⚠ ${esc(ef.nom || 'Sans nom')} (incomplet)`;
    return `<option value="${esc(ef.id)}" ${selectedIds.includes(ef.id) ? 'selected' : ''} ${!complet ? 'data-incomplet="1"' : ''}>${label}</option>`;
  }).join('');
}

function optionsEvenementsGeneriques(selectedIds = []) {
  const evs = getEvenementsGeneriques();
  if (!evs.length) {
    return `<option value="" disabled>— Aucun événement générique défini —</option>`;
  }
  return evs.map(ev => {
    const complet = isEvenementComplet(ev);
    const label = complet ? `${esc(ev.nom || 'Sans nom')}` : `⚠ ${esc(ev.nom || 'Sans nom')} (incomplet)`;
    return `<option value="${esc(ev.id)}" ${selectedIds.includes(ev.id) ? 'selected' : ''} ${!complet ? 'data-incomplet="1"' : ''}>${label}</option>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTANCE
// ═══════════════════════════════════════════════════════════════════════════════

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cfg = await res.json();

    state = cfg.cards || {};

    if (!state.iles || !state.iles.length) {
      state.iles = JSON.parse(JSON.stringify(DEFAULT_ILES));
    } else {
      state.iles = state.iles.map((ile, i) => {
        if (!ile.cases) {
          const cases = [];
          if (ile.coord_q != null && ile.coord_r != null) cases.push({ q: ile.coord_q, r: ile.coord_r });
          const { coord_q, coord_r, ...rest } = ile;
          ile = { ...rest, cases };
        }
        const defaut = DEFAULT_ILES[i];
        if (defaut && (!ile.cases.length || ile.cases.every(c => c.q == null)))
          ile.cases = JSON.parse(JSON.stringify(defaut.cases));
        if (!ile.nb_objets || ile.nb_objets < 1) ile.nb_objets = 6;
        return ile;
      });
    }

    if (!state.avancement) state.avancement = { nb_cartes_temps: 6 };

    // Initialiser les tableaux des 4 niveaux si absents
    if (!Array.isArray(state.evenements_generiques)) state.evenements_generiques = [];
    if (!Array.isArray(state.effets))                state.effets = [];
    if (!Array.isArray(state.actions_joueur))        state.actions_joueur = [];
    if (!Array.isArray(state.action_offensive))      state.action_offensive = [];
    if (!Array.isArray(state.action_defensive))      state.action_defensive = [];
    if (!Array.isArray(state.evenement))             state.evenement = [];

    applyRulesToForm(cfg.rules || {});
    renderAll();
    document.getElementById('loadingOverlay').style.display = 'none';
  } catch (e) {
    document.getElementById('loadingOverlay').textContent = '✗ Erreur de chargement : ' + e.message;
  }
}

async function saveConfig() {
  const btn      = document.getElementById('btnSave');
  const statusEl = document.getElementById('saveStatus');
  btn.disabled = true;
  statusEl.textContent = '⏳ Sauvegarde en cours…';
  statusEl.className = 'save-bar__status';

  try {
    state.avancement = {
      nb_cartes_temps: parseInt(document.getElementById('nb_cartes_temps')?.value) || 6,
    };

    const body = { cards: state, rules: collectRules() };
    const res = await fetch('/api/config', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error('Le serveur a refusé la sauvegarde');

    statusEl.textContent = '✓ Sauvegardé avec succès';
    statusEl.className = 'save-bar__status--saved save-bar__status';
    setTimeout(() => document.getElementById('saveBar').classList.remove('is-visible'), 2200);
  } catch (e) {
    statusEl.textContent = '✗ Erreur : ' + e.message;
    statusEl.className = 'save-bar__status--error save-bar__status';
  } finally {
    btn.disabled = false;
  }
}

function discardChanges() {
  if (confirm('Annuler toutes les modifications non sauvegardées ?')) loadConfig();
}

function markDirty() {
  const bar = document.getElementById('saveBar');
  bar.classList.add('is-visible');
  const s = document.getElementById('saveStatus');
  s.textContent = '⚠ Modifications non sauvegardées';
  s.className = 'save-bar__status--dirty save-bar__status';
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT CONFIG.JSON
// ═══════════════════════════════════════════════════════════════════════════════

function openExportModal() {
  const exportData = {
    cards: {
      ...state,
      avancement: {
        nb_cartes_temps: parseInt(document.getElementById('nb_cartes_temps')?.value) || 6,
      },
    },
    rules: collectRules(),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const modal = document.getElementById('exportModal');
  const textarea = document.getElementById('exportTextarea');
  const counter = document.getElementById('exportCounter');

  textarea.value = jsonStr;
  counter.textContent = `${jsonStr.length.toLocaleString()} caractères`;

  modal.classList.add('export-modal--open');
  textarea.scrollTop = 0;
}

function closeExportModal() {
  document.getElementById('exportModal').classList.remove('export-modal--open');
}

function copyExportJson() {
  const textarea = document.getElementById('exportTextarea');
  navigator.clipboard.writeText(textarea.value).then(() => {
    const btn = document.getElementById('btnExportCopy');
    const orig = btn.textContent;
    btn.textContent = '✓ Copié dans le presse-papier !';
    btn.classList.add('export-copy-btn--success');
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove('export-copy-btn--success');
    }, 2000);
  }).catch(() => {
    textarea.select();
    document.execCommand('copy');
  });
}

function downloadExportJson() {
  const jsonStr = document.getElementById('exportTextarea').value;
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'config.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RÈGLES
// ═══════════════════════════════════════════════════════════════════════════════

function applyRulesToForm(rules) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  const sb = rules.ship?.statBonuses || {};
  set('hull1', sb.hull?.[0]);   set('hull2', sb.hull?.[1]);   set('hull3', sb.hull?.[2]);
  set('sails1', sb.sails?.[0]); set('sails2', sb.sails?.[1]); set('sails3', sb.sails?.[2]);
  set('c1', sb.cannons?.[0]);   set('c2', sb.cannons?.[1]);   set('c3', sb.cannons?.[2]);
  set('pmin',   rules.players?.min);
  set('pmax',   rules.players?.max);
  set('dfaces', rules.dice?.faces);
  set('handmax',rules.hand?.maxCards);
  set('sd', rules.resources?.startDoublons);
  set('sr', rules.resources?.startReputation);
  set('sc', rules.resources?.startResearch);
  set('cargo', rules.ship?.cargo?.maxSlots);
  set('equip', rules.ship?.equipment?.maxSlots);
}

function collectRules() {
  const n = id => parseInt(document.getElementById(id)?.value) || 0;
  return {
    ship: {
      statBonuses: {
        hull:    [n('hull1'), n('hull2'),  n('hull3')],
        sails:   [n('sails1'),n('sails2'), n('sails3')],
        cannons: [n('c1'),    n('c2'),     n('c3')],
      },
      cargo:     { maxSlots: n('cargo') },
      equipment: { maxSlots: n('equip') },
    },
    players:   { min: n('pmin'), max: n('pmax') },
    dice:      { faces: n('dfaces') },
    hand:      { maxCards: n('handmax') },
    resources: { startDoublons: n('sd'), startReputation: n('sr'), startResearch: n('sc') },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

export function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('is-active'));
  document.querySelectorAll('.sidenav__item').forEach(el => el.classList.remove('is-active'));
  document.getElementById(`tab-${tab}`)?.classList.add('is-active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('is-active');
}

export function showSubtab(parent, sub, btn) {
  const panel = document.getElementById(`tab-${parent}`);
  if (!panel) return;
  panel.querySelectorAll(`[id^="${parent}-"]`).forEach(el => el.style.display = 'none');
  const el = document.getElementById(`${parent}-${sub}`);
  if (el) el.style.display = 'block';
  panel.querySelectorAll('.subtab').forEach(b => b.classList.remove('is-active'));
  btn.classList.add('is-active');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════════════════════════

function renderAll() {
  renderParcheminIle();
  renderParcheminVierge();
  renderEnigmeLatitude();
  renderEnigmeLongitude();
  renderEnigmeCode();
  renderAncienParchemin();
  renderReliques();
  renderSimpleList('equipement', '⚙', ['nom','description'], ['Nom','Description / effet']);
  // Niveau 4 → 3 → 2 → 1 (du plus bas au plus haut)
  renderActionsJoueur();
  renderEffets();
  renderEvenementsGeneriques();
  renderCartesMecaniques();
  renderIles();
  renderAvancement();
  renderLieux('ports',    '⚓');
  renderLieux('repaires', '💀');
  renderLieux('epaves',   '🚢');
  renderTempete();
  updateOverview();
}

// ─── Parchemins ───────────────────────────────────────────────────────────────

function renderParcheminIle() {
  const arr = state.parchemin_ile || [];
  setCountDisplay('cnt-parchemin_ile', arr.length);
  const el = document.getElementById('list-parchemin_ile');
  if (!el) return;
  el.innerHTML = arr.map((c, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">📜 Parchemin ${i + 1}</span>
        <button class="btn-remove" onclick="window._admin.removeFrom('parchemin_ile',${i})">✕ Supprimer</button>
      </div>
      <div class="fields">
        <div class="field">
          <label class="field__label">Île de destination</label>
          <select class="ile-select" onchange="window._admin.setField('parchemin_ile',${i},'ile',this.value)">
            ${getIleOptions(c.ile)}
          </select>
        </div>
        <div class="field">
          <label class="field__label">Description sur la carte</label>
          <input type="text" value="${esc(c.description)}" placeholder="Texte de la carte…"
            oninput="window._admin.setField('parchemin_ile',${i},'description',this.value)">
        </div>
      </div>
    </div>`).join('');
}

function renderParcheminVierge() {
  const cnt = state.parchemin_vierge?.count ?? 0;
  setCountDisplay('cnt-parchemin_vierge', cnt);
}

// ─── Énigmes ──────────────────────────────────────────────────────────────────

function renderEnigmeLatitude() {
  const arr = state.enigme_latitude || [];
  setCountDisplay('cnt-enigme_latitude', arr.length);
  const el = document.getElementById('list-enigme_latitude');
  if (!el) return;
  el.innerHTML = arr.map((c, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">Carte ${i + 1}</span>
        <button class="btn-remove" onclick="window._admin.removeFrom('enigme_latitude',${i})">✕</button>
      </div>
      <div class="fields--1">
        <div class="field">
          <label class="field__label">Coordonnée Latitude — colonne Q (0 à 24)</label>
          <input type="number" min="0" max="24" value="${c.valeur ?? 0}"
            oninput="window._admin.setFieldNum('enigme_latitude',${i},'valeur',this.value)">
        </div>
      </div>
    </div>`).join('');
}

function renderEnigmeLongitude() {
  const arr = state.enigme_longitude || [];
  setCountDisplay('cnt-enigme_longitude', arr.length);
  const el = document.getElementById('list-enigme_longitude');
  if (!el) return;
  el.innerHTML = arr.map((c, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">Carte ${i + 1}</span>
        <button class="btn-remove" onclick="window._admin.removeFrom('enigme_longitude',${i})">✕</button>
      </div>
      <div class="fields--1">
        <div class="field">
          <label class="field__label">Coordonnée Longitude — rang R (0 à 21)</label>
          <input type="number" min="0" max="21" value="${c.valeur ?? 0}"
            oninput="window._admin.setFieldNum('enigme_longitude',${i},'valeur',this.value)">
        </div>
      </div>
    </div>`).join('');
}

function renderEnigmeCode() {
  const arr = state.enigme_code || [];
  setCountDisplay('cnt-enigme_code', arr.length);
  const el = document.getElementById('list-enigme_code');
  if (!el) return;
  el.innerHTML = arr.map((c, i) => {
    const lat = c.delta_lat || 0, lon = c.delta_lon || 0;
    return `<div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">Code ${i + 1}</span>
        <span style="font-size:.8rem;color:#7a6a4a;font-style:italic">
          Lat ${lat >= 0 ? '+' : ''}${lat} / Lon ${lon >= 0 ? '+' : ''}${lon}
        </span>
        <button class="btn-remove" onclick="window._admin.removeFrom('enigme_code',${i})">✕</button>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Δ Latitude</label>
          <input type="number" min="-24" max="24" value="${lat}"
            oninput="window._admin.setFieldNum('enigme_code',${i},'delta_lat',this.value);window._admin.rerender('enigme_code')">
        </div>
        <div class="field">
          <label class="field__label">Δ Longitude</label>
          <input type="number" min="-21" max="21" value="${lon}"
            oninput="window._admin.setFieldNum('enigme_code',${i},'delta_lon',this.value);window._admin.rerender('enigme_code')">
        </div>
        <div class="field">
          <label class="field__label">Description (optionnel)</label>
          <input type="text" value="${esc(c.description)}" placeholder="ex : Cherche au nord-est…"
            oninput="window._admin.setField('enigme_code',${i},'description',this.value)">
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Anciens Parchemins ───────────────────────────────────────────────────────

function renderAncienParchemin() {
  const arr = state.ancien_parchemin || [];
  const el  = document.getElementById('list-ancien_parchemin');
  if (!el) return;

  el.innerHTML = arr.map((c, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">🗺 Ancien Parchemin ${i + 1}</span>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Relique associée</label>
          <select class="ile-select"
            onchange="window._admin.setField('ancien_parchemin',${i},'relique',this.value)">
            ${RELIQUES_FIXES.map(r =>
              `<option value="${esc(r.name)}" ${c.relique === r.name ? 'selected' : ''}>${r.icon} ${esc(r.name)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="field">
          <label class="field__label">Île de destination</label>
          <select class="ile-select"
            onchange="window._admin.setField('ancien_parchemin',${i},'ile_destination',this.value)">
            ${getIleOptions(c.ile_destination)}
          </select>
        </div>
        <div class="field">
          <label class="field__label">Description sur la carte</label>
          <input type="text" value="${esc(c.description)}" placeholder="Texte de la carte…"
            oninput="window._admin.setField('ancien_parchemin',${i},'description',this.value)">
        </div>
      </div>
    </div>`).join('');
}

// ─── Reliques ─────────────────────────────────────────────────────────────────

function renderReliques() {
  const el = document.getElementById('reliques-container');
  if (!el) return;
  el.innerHTML = `
    <div class="soon-block" style="padding:22px 20px;opacity:1">
      <div class="soon-block__icon">🔒</div>
      <div class="soon-block__title" style="font-size:.9rem">Reliques — Lecture seule</div>
      <div class="soon-block__desc">
        Les 3 reliques sont fixes et liées aux Anciens Parchemins.<br>
        Leurs effets sont définis dans le code et ne sont pas modifiables depuis l'admin.
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${RELIQUES_FIXES.map(r => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
          background:rgba(255,255,255,.025);border:1px solid rgba(184,134,11,.15);
          border-radius:8px;font-size:.9rem;color:#9a8a6a">
          <span style="font-size:1.3rem">${r.icon}</span>
          <strong style="color:#d4a017">${esc(r.name)}</strong>
        </div>`).join('')}
    </div>`;
}

// ─── Listes simples (équipement) ──────────────────────────────────────────────

function renderSimpleList(key, icon, fields, labels) {
  const arr = state[key] || [];
  const el = document.getElementById(`list-${key}`);
  if (!el) return;
  el.innerHTML = arr.map((c, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">${icon} Carte ${i + 1}</span>
        <label class="toggle-wrap" style="margin-left:6px">
          <span class="toggle">
            <input type="checkbox" ${c.enabled !== false ? 'checked' : ''}
              onchange="window._admin.setField('${key}',${i},'enabled',this.checked)">
            <span class="toggle__slider"></span>
          </span>
          <span style="font-size:.8rem">${c.enabled !== false ? 'Active' : 'Inactive'}</span>
        </label>
        <button class="btn-remove" onclick="window._admin.removeFrom('${key}',${i})">✕</button>
      </div>
      <div class="fields">
        ${fields.map((f, fi) => `
          <div class="field">
            <label class="field__label">${labels[fi]}</label>
            <input type="text" value="${esc(c[f])}" placeholder="${labels[fi]}…"
              oninput="window._admin.setField('${key}',${i},'${f}',this.value)">
          </div>`).join('')}
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEAU 4 — ACTIONS JOUEUR
// ═══════════════════════════════════════════════════════════════════════════════

function renderActionsJoueur() {
  const arr = getActionsJoueur();
  const el  = document.getElementById('list-actions-joueur');
  const badge = document.getElementById('nb-actions-joueur');
  if (badge) badge.textContent = arr.length;

  // Mettre à jour le badge du menu
  const sidenavBadge = document.getElementById('sidenav-nb-actions-joueur');
  if (sidenavBadge) sidenavBadge.textContent = arr.length;

  if (!el) return;

  if (!arr.length) {
    el.innerHTML = `
      <div class="cascade-empty cascade-empty--level4">
        <div class="cascade-empty__icon">🎮</div>
        <div class="cascade-empty__title">Aucune action joueur définie</div>
        <div class="cascade-empty__desc">
          Les actions joueur sont le <strong>niveau de base</strong> de la cascade.<br>
          Elles décrivent ce que le joueur doit concrètement faire en jeu.<br>
          Tous les autres niveaux dépendent d'elles.
        </div>
      </div>`;
    return;
  }

  el.innerHTML = arr.map((a, i) => `
    <div class="card-entry card-entry--level4">
      <div class="card-entry__header">
        <span class="card-entry__badge card-entry__badge--level4">Niv. 4</span>
        <span class="card-entry__num" style="color:#c06eed">${esc(a.icone || '🎮')} ${esc(a.nom || `Action ${i + 1}`)}</span>
        <button class="btn-remove" onclick="window._admin.removeActionJoueur(${i})">✕</button>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Icône</label>
          <input type="text" value="${esc(a.icone || '')}" placeholder="ex : 🎯"
            oninput="window._admin.setActionJoueurField(${i},'icone',this.value);window._admin.rerender('actions_joueur')">
        </div>
        <div class="field">
          <label class="field__label">Nom de l'action</label>
          <input type="text" value="${esc(a.nom || '')}" placeholder="ex : Lancer le dé de combat"
            oninput="window._admin.setActionJoueurField(${i},'nom',this.value);window._admin.rerender('actions_joueur')">
        </div>
        <div class="field">
          <label class="field__label">Type</label>
          <select onchange="window._admin.setActionJoueurField(${i},'type',this.value)">
            <option value="immediate" ${(a.type||'immediate')==='immediate' ? 'selected' : ''}>⚡ Immédiate</option>
            <option value="choix"     ${a.type==='choix'     ? 'selected' : ''}>🎲 Choix du joueur</option>
            <option value="duree"     ${a.type==='duree'     ? 'selected' : ''}>⏳ Sur durée</option>
            <option value="cible"     ${a.type==='cible'     ? 'selected' : ''}>🎯 Cibler un joueur</option>
          </select>
        </div>
      </div>
      <div class="fields--1" style="margin-top:6px">
        <div class="field">
          <label class="field__label">Description complète de ce que le joueur doit faire</label>
          <textarea placeholder="Décrivez précisément l'action que le joueur doit réaliser…"
            oninput="window._admin.setActionJoueurField(${i},'description',this.value)">${esc(a.description || '')}</textarea>
        </div>
      </div>
      ${a.type === 'duree' ? `
      <div class="fields--1" style="margin-top:6px">
        <div class="field">
          <label class="field__label">Durée (en nombre de tours)</label>
          <input type="number" min="1" max="10" value="${a.duree_tours || 1}"
            oninput="window._admin.setActionJoueurField(${i},'duree_tours',parseInt(this.value)||1)">
        </div>
      </div>` : ''}
    </div>`).join('');
}

export function addActionJoueur() {
  if (!Array.isArray(state.actions_joueur)) state.actions_joueur = [];
  state.actions_joueur.push({
    id:          uid(),
    icone:       '',
    nom:         '',
    type:        'immediate',
    description: '',
  });
  renderActionsJoueur();
  // Rafraîchir les niveaux supérieurs qui référencent les actions
  renderEffets();
  markDirty();
  updateOverview();
  scrollToLastIn('list-actions-joueur');
}

function setActionJoueurField(i, field, val) {
  if (!state.actions_joueur?.[i]) return;
  state.actions_joueur[i][field] = val;
  markDirty();
}

function removeActionJoueur(i) {
  if (!state.actions_joueur) return;
  const removedId = state.actions_joueur[i].id;
  state.actions_joueur.splice(i, 1);
  // Nettoyer les références dans les effets
  if (state.effets) {
    state.effets.forEach(ef => {
      if (Array.isArray(ef.actions_joueur_ids))
        ef.actions_joueur_ids = ef.actions_joueur_ids.filter(id => id !== removedId);
    });
  }
  renderActionsJoueur();
  renderEffets();
  markDirty();
  updateOverview();
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEAU 3 — EFFETS
// ═══════════════════════════════════════════════════════════════════════════════

function renderEffets() {
  const arr     = getEffets();
  const actions = getActionsJoueur();
  const el      = document.getElementById('list-effets');
  const badge   = document.getElementById('nb-effets');
  if (badge) badge.textContent = arr.length;

  const sidenavBadge = document.getElementById('sidenav-nb-effets');
  if (sidenavBadge) sidenavBadge.textContent = arr.length;

  if (!el) return;

  const hasActions = actions.length > 0;

  if (!arr.length) {
    el.innerHTML = `
      <div class="cascade-empty cascade-empty--level3">
        <div class="cascade-empty__icon">⚡</div>
        <div class="cascade-empty__title">Aucun effet défini</div>
        <div class="cascade-empty__desc">
          Les effets sont le <strong>niveau 3</strong> de la cascade.<br>
          Chaque effet regroupe une ou plusieurs <strong>actions joueur</strong> (niveau 4).<br>
          ${!hasActions ? '<strong style="color:#e07070">⚠ Définissez d\'abord des actions joueur.</strong>' : 'Vous pouvez maintenant créer des effets.'}
        </div>
      </div>`;
    return;
  }

  el.innerHTML = arr.map((ef, i) => {
    const complet      = isEffetComplet(ef);
    const selectedIds  = ef.actions_joueur_ids || [];
    const nbSelected   = selectedIds.length;

    return `
    <div class="card-entry card-entry--level3 ${complet ? '' : 'card-entry--incomplete'}">
      <div class="card-entry__header">
        <span class="card-entry__badge card-entry__badge--level3">Niv. 3</span>
        <span class="card-entry__num" style="color:#4ac8ff">${esc(ef.icone || '⚡')} ${esc(ef.nom || `Effet ${i + 1}`)}</span>
        ${!complet ? '<span class="cascade-tag cascade-tag--warn">⚠ Incomplet</span>' : '<span class="cascade-tag cascade-tag--ok">✓ Complet</span>'}
        <button class="btn-remove" onclick="window._admin.removeEffet(${i})">✕</button>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Icône</label>
          <input type="text" value="${esc(ef.icone || '')}" placeholder="ex : ⚡"
            oninput="window._admin.setEffetField(${i},'icone',this.value);window._admin.rerender('effets')">
        </div>
        <div class="field">
          <label class="field__label">Nom de l'effet</label>
          <input type="text" value="${esc(ef.nom || '')}" placeholder="ex : Perte de ressources"
            oninput="window._admin.setEffetField(${i},'nom',this.value);window._admin.rerender('effets')">
        </div>
        <div class="field">
          <label class="field__label">Portée</label>
          <select onchange="window._admin.setEffetField(${i},'portee',this.value)">
            <option value="joueur"    ${(ef.portee||'joueur')==='joueur'    ? 'selected':''}>👤 Ce joueur uniquement</option>
            <option value="adjacent"  ${ef.portee==='adjacent'  ? 'selected':''}>👥 Joueurs adjacents</option>
            <option value="tous"      ${ef.portee==='tous'      ? 'selected':''}>🌍 Tous les joueurs</option>
          </select>
        </div>
      </div>
      <div class="fields--1" style="margin-top:6px">
        <div class="field">
          <label class="field__label">Description de l'effet (visible sur la carte)</label>
          <textarea placeholder="Décrivez l'effet tel qu'il apparaîtra sur la carte…"
            oninput="window._admin.setEffetField(${i},'description',this.value)">${esc(ef.description || '')}</textarea>
        </div>
      </div>
      <div class="cascade-link-block" style="margin-top:10px">
        <div class="cascade-link-block__title">
          🎮 Actions joueur liées
          <span class="cascade-link-count">${nbSelected} sélectionnée(s)</span>
          ${!hasActions ? '<span class="cascade-tag cascade-tag--warn" style="margin-left:6px">⚠ Aucune action disponible</span>' : ''}
        </div>
        ${hasActions ? `
        <div class="cascade-link-block__hint">Maintenez Ctrl/Cmd pour sélectionner plusieurs actions</div>
        <select multiple class="cascade-multiselect"
          onchange="window._admin.setEffetActions(${i},this)"
          size="${Math.min(5, actions.length)}">
          ${actions.map(a => `
            <option value="${esc(a.id)}" ${selectedIds.includes(a.id) ? 'selected' : ''}>
              ${esc(a.icone || '🎮')} ${esc(a.nom || 'Sans nom')} (${esc(a.type || 'immediate')})
            </option>`).join('')}
        </select>
        <div class="cascade-selected-chips">
          ${selectedIds.map(id => {
            const a = actions.find(x => x.id === id);
            return a ? `<span class="cascade-chip cascade-chip--level4">${esc(a.icone || '🎮')} ${esc(a.nom || 'Sans nom')}</span>` : '';
          }).join('')}
        </div>` : `<div class="cascade-link-block__empty">→ Définissez d'abord des <a href="#" onclick="window._admin.switchTab('actions_joueur');return false">Actions Joueur (niveau 4)</a></div>`}
      </div>
    </div>`;
  }).join('');
}

export function addEffet() {
  if (!Array.isArray(state.effets)) state.effets = [];
  const hasActions = getActionsJoueur().length > 0;
  if (!hasActions) {
    alert('⚠ Vous devez d\'abord créer au moins une Action Joueur (niveau 4) avant de créer un effet.');
    switchTab('actions_joueur');
    return;
  }
  state.effets.push({
    id:               uid(),
    icone:            '',
    nom:              '',
    portee:           'joueur',
    description:      '',
    actions_joueur_ids: [],
  });
  renderEffets();
  renderEvenementsGeneriques();
  markDirty();
  updateOverview();
  scrollToLastIn('list-effets');
}

function setEffetField(i, field, val) {
  if (!state.effets?.[i]) return;
  state.effets[i][field] = val;
  markDirty();
}

function setEffetActions(i, selectEl) {
  if (!state.effets?.[i]) return;
  state.effets[i].actions_joueur_ids = Array.from(selectEl.selectedOptions).map(o => o.value);
  renderEffets();
  renderEvenementsGeneriques(); // rafraîchir les statuts complets en cascade
  markDirty();
  updateOverview();
}

function removeEffet(i) {
  if (!state.effets) return;
  const removedId = state.effets[i].id;
  state.effets.splice(i, 1);
  // Nettoyer les références dans les événements génériques
  if (state.evenements_generiques) {
    state.evenements_generiques.forEach(ev => {
      if (Array.isArray(ev.effets_ids))
        ev.effets_ids = ev.effets_ids.filter(id => id !== removedId);
    });
  }
  renderEffets();
  renderEvenementsGeneriques();
  renderCartesMecaniques();
  markDirty();
  updateOverview();
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEAU 2 — ÉVÉNEMENTS GÉNÉRIQUES
// ═══════════════════════════════════════════════════════════════════════════════

function renderEvenementsGeneriques() {
  const arr    = getEvenementsGeneriques();
  const effets = getEffets();
  const el     = document.getElementById('list-evenements-generiques');
  const badge  = document.getElementById('nb-evgen');
  if (badge) badge.textContent = arr.length;

  const sidenavBadge = document.getElementById('sidenav-nb-evgen');
  if (sidenavBadge) sidenavBadge.textContent = arr.length;

  if (!el) return;

  const hasEffets = effets.length > 0;

  if (!arr.length) {
    el.innerHTML = `
      <div class="cascade-empty cascade-empty--level2">
        <div class="cascade-empty__icon">🌊</div>
        <div class="cascade-empty__title">Aucun événement générique défini</div>
        <div class="cascade-empty__desc">
          Les événements génériques sont le <strong>niveau 2</strong> de la cascade.<br>
          Chaque événement regroupe un ou plusieurs <strong>effets</strong> (niveau 3).<br>
          ${!hasEffets ? '<strong style="color:#e07070">⚠ Définissez d\'abord des effets.</strong>' : 'Vous pouvez maintenant créer des événements génériques.'}
        </div>
      </div>`;
    return;
  }

  el.innerHTML = arr.map((ev, i) => {
    const complet     = isEvenementComplet(ev);
    const selectedIds = ev.effets_ids || [];
    const nbSelected  = selectedIds.length;
    const effetsComplets = effets.filter(ef => isEffetComplet(ef));

    return `
    <div class="evgen-card card-entry--level2 ${complet ? '' : 'card-entry--incomplete'}">
      <div class="evgen-card__header">
        <span class="card-entry__badge card-entry__badge--level2">Niv. 2</span>
        <div class="evgen-card__name-wrap">
          <input class="evgen-name-input" type="text" value="${esc(ev.nom)}"
            placeholder="Nom de l'événement générique…"
            oninput="window._admin.setEvGenField(${i},'nom',this.value)"/>
        </div>
        ${!complet ? '<span class="cascade-tag cascade-tag--warn">⚠ Incomplet</span>' : '<span class="cascade-tag cascade-tag--ok">✓ Complet</span>'}
        <div class="evgen-card__actions">
          <button class="evgen-btn-del" onclick="window._admin.removeEvGen(${i})" title="Supprimer">✕</button>
        </div>
      </div>
      <div class="evgen-card__body evgen-card__body--single">
        <div class="evgen-field-group evgen-field-group--full">
          <label class="evgen-label">Description générale</label>
          <textarea class="evgen-textarea"
            placeholder="Décrivez cet événement tel qu'il sera lu par le joueur…"
            oninput="window._admin.setEvGenField(${i},'description',this.value)">${esc(ev.description || '')}</textarea>
        </div>
      </div>
      <div class="cascade-link-block" style="margin:0 14px 14px">
        <div class="cascade-link-block__title">
          ⚡ Effets liés
          <span class="cascade-link-count">${nbSelected} sélectionné(s)</span>
          ${!hasEffets ? '<span class="cascade-tag cascade-tag--warn" style="margin-left:6px">⚠ Aucun effet disponible</span>' : ''}
        </div>
        ${hasEffets ? `
        <div class="cascade-link-block__hint">
          Maintenez Ctrl/Cmd pour sélectionner plusieurs effets.
          ${effets.length !== effetsComplets.length ? `<span style="color:#e07070">${effets.length - effetsComplets.length} effet(s) incomplet(s) masqué(s).</span>` : ''}
        </div>
        <select multiple class="cascade-multiselect"
          onchange="window._admin.setEvGenEffets(${i},this)"
          size="${Math.min(5, effetsComplets.length || 1)}">
          ${effetsComplets.map(ef => `
            <option value="${esc(ef.id)}" ${selectedIds.includes(ef.id) ? 'selected' : ''}>
              ${esc(ef.icone || '⚡')} ${esc(ef.nom || 'Sans nom')} — ${esc(ef.portee || 'joueur')}
            </option>`).join('')}
        </select>
        <div class="cascade-selected-chips">
          ${selectedIds.map(id => {
            const ef = effets.find(x => x.id === id);
            return ef ? `<span class="cascade-chip cascade-chip--level3">${esc(ef.icone || '⚡')} ${esc(ef.nom || 'Sans nom')}</span>` : '';
          }).join('')}
        </div>` : `<div class="cascade-link-block__empty">→ Définissez d'abord des <a href="#" onclick="window._admin.switchTab('effets');return false">Effets (niveau 3)</a></div>`}
      </div>
    </div>`;
  }).join('');
}

export function addEvGen() {
  if (!Array.isArray(state.evenements_generiques)) state.evenements_generiques = [];
  const hasEffetsComplets = getEffets().some(isEffetComplet);
  if (!hasEffetsComplets) {
    alert('⚠ Vous devez d\'abord créer au moins un Effet complet (niveau 3) avant de créer un événement générique.\n\nUn effet est complet quand il a au moins une action joueur liée.');
    switchTab('effets');
    return;
  }
  state.evenements_generiques.push({
    id:          uid(),
    nom:         '',
    description: '',
    effets_ids:  [],
  });
  renderEvenementsGeneriques();
  renderCartesMecaniques();
  markDirty();
  updateOverview();
  scrollToLastIn('list-evenements-generiques');
}

function setEvGenField(i, field, val) {
  if (!state.evenements_generiques?.[i]) return;
  state.evenements_generiques[i][field] = val;
  markDirty();
  if (field === 'nom') {
    const badge = document.getElementById('nb-evgen');
    if (badge) badge.textContent = state.evenements_generiques.length;
  }
}

function setEvGenEffets(i, selectEl) {
  if (!state.evenements_generiques?.[i]) return;
  state.evenements_generiques[i].effets_ids = Array.from(selectEl.selectedOptions).map(o => o.value);
  renderEvenementsGeneriques();
  renderCartesMecaniques(); // rafraîchir les cartes qui référencent les événements
  markDirty();
  updateOverview();
}

function removeEvGen(i) {
  if (!state.evenements_generiques) return;
  const removedId = state.evenements_generiques[i].id;
  state.evenements_generiques.splice(i, 1);
  // Nettoyer les références dans les cartes action/événement
  ['action_offensive', 'action_defensive', 'evenement'].forEach(key => {
    if (state[key]) {
      state[key].forEach(c => {
        if (Array.isArray(c.evenements_ids))
          c.evenements_ids = c.evenements_ids.filter(id => id !== removedId);
      });
    }
  });
  renderEvenementsGeneriques();
  renderCartesMecaniques();
  markDirty();
  updateOverview();
}

// ═══════════════════════════════════════════════════════════════════════════════
// NIVEAU 1 — CARTES MÉCANIQUES (Actions offensives/défensives, Événements)
// ═══════════════════════════════════════════════════════════════════════════════

function renderCartesMecaniques() {
  renderCartesList('action_offensive', '💥', 'offensive');
  renderCartesList('action_defensive', '🛡', 'defensive');
  renderCartesList('evenement',        '⚡', 'evenement');
}

function renderCartesList(key, icon, type) {
  const arr = state[key] || [];
  const evs = getEvenementsGeneriques().filter(ev => isEvenementComplet(ev));
  const el  = document.getElementById(`list-${key}`);
  if (!el) return;

  const badgeMap = { action_offensive: 'nb-action-off', action_defensive: 'nb-action-def', evenement: 'nb-evenement' };
  const badge = document.getElementById(badgeMap[key]);
  if (badge) badge.textContent = arr.length;

  if (!arr.length) {
    const hasEvs = evs.length > 0;
    el.innerHTML = `
      <div class="cascade-empty cascade-empty--level1">
        <div class="cascade-empty__icon">${icon}</div>
        <div class="cascade-empty__title">Aucune carte ${type === 'offensive' ? 'offensive' : type === 'defensive' ? 'défensive' : 'événement'} définie</div>
        <div class="cascade-empty__desc">
          Les cartes sont le <strong>niveau 1</strong> — le niveau le plus haut.<br>
          Elles s'appuient sur des <strong>événements génériques complets</strong> (niveau 2).<br>
          ${!hasEvs ? '<strong style="color:#e07070">⚠ Définissez d\'abord des événements génériques complets.</strong>' : 'Vous pouvez maintenant créer des cartes.'}
        </div>
      </div>`;
    return;
  }

  el.innerHTML = arr.map((c, i) => {
    const selectedIds = c.evenements_ids || [];
    const complet     = selectedIds.length > 0 && selectedIds.every(id => evs.find(e => e.id === id));

    return `
    <div class="card-entry card-entry--level1 ${complet ? '' : 'card-entry--incomplete'}">
      <div class="card-entry__header">
        <span class="card-entry__badge card-entry__badge--level1">Niv. 1</span>
        <span class="card-entry__num" style="color:${type==='offensive'?'#e07070':type==='defensive'?'#4aedcc':'#ffc832'}">${icon} ${esc(c.nom || `Carte ${i+1}`)}</span>
        ${!complet ? '<span class="cascade-tag cascade-tag--warn">⚠ Incomplet</span>' : '<span class="cascade-tag cascade-tag--ok">✓ Complet</span>'}
        <label class="toggle-wrap" style="margin-left:auto">
          <span class="toggle">
            <input type="checkbox" ${c.enabled !== false ? 'checked' : ''}
              onchange="window._admin.setCarteField('${key}',${i},'enabled',this.checked)">
            <span class="toggle__slider"></span>
          </span>
          <span style="font-size:.78rem">${c.enabled !== false ? 'Active' : 'Inactive'}</span>
        </label>
        <button class="btn-remove" onclick="window._admin.removeCarte('${key}',${i})">✕</button>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Icône de la carte</label>
          <input type="text" value="${esc(c.icone || icon)}" placeholder="${icon}"
            oninput="window._admin.setCarteField('${key}',${i},'icone',this.value);window._admin.rerender('${key}')">
        </div>
        <div class="field">
          <label class="field__label">Nom de la carte</label>
          <input type="text" value="${esc(c.nom || '')}" placeholder="ex : Tempête de Boulets"
            oninput="window._admin.setCarteField('${key}',${i},'nom',this.value);window._admin.rerender('${key}')">
        </div>
        <div class="field">
          <label class="field__label">Rareté</label>
          <select onchange="window._admin.setCarteField('${key}',${i},'rarete',this.value)">
            <option value="commune"  ${(c.rarete||'commune')==='commune'  ? 'selected':''}>⚪ Commune</option>
            <option value="rare"     ${c.rarete==='rare'     ? 'selected':''}>🔵 Rare</option>
            <option value="epique"   ${c.rarete==='epique'   ? 'selected':''}>🟣 Épique</option>
            <option value="legendaire" ${c.rarete==='legendaire' ? 'selected':''}>🟡 Légendaire</option>
          </select>
        </div>
      </div>
      <div class="fields--1" style="margin-top:6px">
        <div class="field">
          <label class="field__label">Texte de la carte (flavour text, visible par le joueur)</label>
          <textarea placeholder="Texte narratif ou descriptif affiché sur la carte…"
            oninput="window._admin.setCarteField('${key}',${i},'texte',this.value)">${esc(c.texte || '')}</textarea>
        </div>
      </div>
      <div class="cascade-link-block" style="margin-top:10px">
        <div class="cascade-link-block__title">
          🌊 Événements génériques liés
          <span class="cascade-link-count">${selectedIds.length} sélectionné(s)</span>
          ${!evs.length ? '<span class="cascade-tag cascade-tag--warn" style="margin-left:6px">⚠ Aucun événement disponible</span>' : ''}
        </div>
        ${evs.length ? `
        <div class="cascade-link-block__hint">Maintenez Ctrl/Cmd pour sélectionner plusieurs événements</div>
        <select multiple class="cascade-multiselect"
          onchange="window._admin.setCarteEvenements('${key}',${i},this)"
          size="${Math.min(5, evs.length)}">
          ${evs.map(ev => `
            <option value="${esc(ev.id)}" ${selectedIds.includes(ev.id) ? 'selected' : ''}>
              ${esc(ev.nom || 'Sans nom')}
            </option>`).join('')}
        </select>
        <div class="cascade-selected-chips">
          ${selectedIds.map(id => {
            const ev = getEvenementsGeneriques().find(x => x.id === id);
            return ev ? `<span class="cascade-chip cascade-chip--level2">🌊 ${esc(ev.nom || 'Sans nom')}</span>` : '';
          }).join('')}
        </div>` : `<div class="cascade-link-block__empty">→ Définissez d'abord des <a href="#" onclick="window._admin.switchTab('evenements_generiques');return false">Événements génériques (niveau 2)</a></div>`}
      </div>
    </div>`;
  }).join('');
}

export function addCarte(key) {
  if (!Array.isArray(state[key])) state[key] = [];
  const hasEvsComplets = getEvenementsGeneriques().some(isEvenementComplet);
  if (!hasEvsComplets) {
    alert('⚠ Vous devez d\'abord créer au moins un Événement générique complet (niveau 2) avant de créer une carte.\n\nUn événement est complet quand il a au moins un effet complet lié.');
    switchTab('evenements_generiques');
    return;
  }
  const iconMap = { action_offensive: '💥', action_defensive: '🛡', evenement: '⚡' };
  state[key].push({
    id:            uid(),
    icone:         iconMap[key] || '🃏',
    nom:           '',
    rarete:        'commune',
    texte:         '',
    enabled:       true,
    evenements_ids: [],
  });
  renderCartesMecaniques();
  markDirty();
  updateOverview();
}

function setCarteField(key, i, field, val) {
  if (!state[key]?.[i]) return;
  state[key][i][field] = val;
  markDirty();
}

function setCarteEvenements(key, i, selectEl) {
  if (!state[key]?.[i]) return;
  state[key][i].evenements_ids = Array.from(selectEl.selectedOptions).map(o => o.value);
  renderCartesMecaniques();
  markDirty();
  updateOverview();
}

function removeCarte(key, i) {
  if (!state[key]) return;
  state[key].splice(i, 1);
  renderCartesMecaniques();
  markDirty();
  updateOverview();
}

// ─── Îles ─────────────────────────────────────────────────────────────────────

function renderIles() {
  const arr = state.iles || [];
  setCountDisplay('cnt-iles', arr.length);
  const badge = document.getElementById('nb-iles');
  if (badge) badge.textContent = arr.length;

  const el = document.getElementById('list-iles');
  if (!el) return;

  el.innerHTML = arr.map((ile, i) => {
    const taille = Math.min(3, Math.max(1, ile.cases?.length || 1));
    const casesHTML = Array.from({ length: taille }, (_, ci) => {
      const cas = (ile.cases && ile.cases[ci]) || { q: '', r: '' };
      return `<div class="case-block">
        <span class="case-block__label">Case ${ci + 1}</span>
        <div class="field">
          <label class="field__label">Q (0–24)</label>
          <input type="number" min="0" max="24"
            value="${cas.q != null && cas.q !== '' ? cas.q : ''}" placeholder="—"
            oninput="window._admin.setCaseCoord(${i},${ci},'q',this.value)">
        </div>
        <div class="field">
          <label class="field__label">R (0–21)</label>
          <input type="number" min="0" max="21"
            value="${cas.r != null && cas.r !== '' ? cas.r : ''}" placeholder="—"
            oninput="window._admin.setCaseCoord(${i},${ci},'r',this.value)">
        </div>
        <div></div>
      </div>`;
    }).join('');

    return `<div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">${esc(ile.icon || '🏝')} ${esc(ile.nom || `Île ${i + 1}`)}</span>
        <button class="btn-remove" onclick="window._admin.removeFrom('iles',${i})">✕ Supprimer</button>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Icône</label>
          <input type="text" value="${esc(ile.icon)}" placeholder="ex : 🏝"
            oninput="window._admin.setField('iles',${i},'icon',this.value);window._admin.rerender('iles')">
        </div>
        <div class="field">
          <label class="field__label">Nom de l'île</label>
          <input type="text" value="${esc(ile.nom)}" placeholder="ex : Île aux Squelettes"
            oninput="window._admin.setField('iles',${i},'nom',this.value);window._admin.rerender('iles')">
        </div>
        <div class="field">
          <label class="field__label">Biome / ambiance</label>
          <input type="text" value="${esc(ile.biome)}" placeholder="ex : Forêt tropicale hostile"
            oninput="window._admin.setField('iles',${i},'biome',this.value)">
        </div>
      </div>
      <div class="fields" style="margin-top:6px">
        <div class="field">
          <label class="field__label">Nombre de slots objets</label>
          <input type="number" min="0" max="12" value="${ile.nb_objets ?? 6}"
            oninput="window._admin.setFieldNum('iles',${i},'nb_objets',this.value)">
        </div>
        <div class="field">
          <label class="field__label">Taille (cases occupées)</label>
          <select onchange="window._admin.setIleTaille(${i},parseInt(this.value))">
            <option value="1" ${taille === 1 ? 'selected' : ''}>1 case</option>
            <option value="2" ${taille === 2 ? 'selected' : ''}>2 cases</option>
            <option value="3" ${taille === 3 ? 'selected' : ''}>3 cases</option>
          </select>
        </div>
      </div>
      <div style="margin-top:8px">${casesHTML}</div>
    </div>`;
  }).join('');

  renderParcheminIle();
  renderAncienParchemin();
}

// ─── Avancement ───────────────────────────────────────────────────────────────

function renderAvancement() {
  const nb = state.avancement?.nb_cartes_temps ?? 6;
  const el = document.getElementById('nb_cartes_temps');
  if (el) el.value = nb;
}

// ─── Lieux ────────────────────────────────────────────────────────────────────

function renderLieux(key, icon) {
  const arr = state[key] || [];
  const el = document.getElementById(`list-${key}`);
  if (!el) return;

  el.innerHTML = arr.map((lieu, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">${icon} ${esc(lieu.nom || `Lieu ${i + 1}`)}</span>
        <button class="btn-remove" onclick="window._admin.removeLieu('${key}',${i})">✕</button>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Nom</label>
          <input type="text" value="${esc(lieu.nom)}" placeholder="ex : Port de la Tortue"
            oninput="window._admin.setLieu('${key}',${i},'nom',this.value);window._admin.rerenderLieu('${key}','${icon}')">
        </div>
        <div class="field field--coord">
          <label class="field__label field__label--coord">📍 Q (colonne 0–24)</label>
          <input type="number" min="0" max="24"
            value="${lieu.coord_q != null ? lieu.coord_q : ''}" placeholder="—"
            oninput="window._admin.setLieuCoord('${key}',${i},'coord_q',this.value)">
        </div>
        <div class="field field--coord">
          <label class="field__label field__label--coord">📍 R (rang 0–21)</label>
          <input type="number" min="0" max="21"
            value="${lieu.coord_r != null ? lieu.coord_r : ''}" placeholder="—"
            oninput="window._admin.setLieuCoord('${key}',${i},'coord_r',this.value)">
        </div>
      </div>
    </div>`).join('');

  const badgeMap = { ports: 'nb-ports', repaires: 'nb-repaires', epaves: 'nb-epaves' };
  const badge = document.getElementById(badgeMap[key]);
  if (badge) badge.textContent = arr.length;
}

// ─── Tempête ──────────────────────────────────────────────────────────────────

function renderTempete() {
  const el = document.getElementById('tempeteCases');
  if (!el) return;
  el.innerHTML = STORM_CELLS.map(c => `<span class="tempete-case-tag">Q${c.q} R${c.r}</span>`).join('');
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function updateOverview() {
  const s = state;
  const actionsJoueur   = s.actions_joueur    || [];
  const effets          = s.effets             || [];
  const eventsGen       = s.evenements_generiques || [];
  const actionOff       = s.action_offensive   || [];
  const actionDef       = s.action_defensive   || [];
  const evenements      = s.evenement          || [];

  const effetsComplets    = countComplets(effets, isEffetComplet);
  const eventsComplets    = countComplets(eventsGen, isEvenementComplet);
  const cartesTotal       = actionOff.length + actionDef.length + evenements.length;
  const cartesCompletes   = countComplets([...actionOff, ...actionDef, ...evenements], c => c.evenements_ids?.length > 0);

  const types = [
    { icon:'📜', lbl:'Parchemins',   n:(s.parchemin_ile?.length||0)+(s.parchemin_vierge?.count||0), tab:'parchemin' },
    { icon:'🔍', lbl:'Énigmes',      n:(s.enigme_latitude?.length||0)+(s.enigme_longitude?.length||0)+(s.enigme_code?.length||0), tab:'enigme' },
    { icon:'🗺',  lbl:'Anc. Parch.', n:(s.ancien_parchemin?.length||0), tab:'ancien_parchemin' },
    { icon:'⭐', lbl:'Reliques',     n:3, tab:'relique' },
    { icon:'⚙',  lbl:'Équipements', n:s.equipement?.length||0, tab:'equipement' },
    { icon:'🎮', lbl:'Actions joueur', n:actionsJoueur.length, tab:'actions_joueur', sub: '' },
    { icon:'⚡', lbl:'Effets',       n:effets.length, tab:'effets', sub: `${effetsComplets}/${effets.length} complets` },
    { icon:'🌊', lbl:'Évén. génér.', n:eventsGen.length, tab:'evenements_generiques', sub: `${eventsComplets}/${eventsGen.length} complets` },
    { icon:'🃏', lbl:'Cartes',       n:cartesTotal, tab:'action', sub: `${cartesCompletes}/${cartesTotal} complètes` },
    { icon:'🏝', lbl:'Îles',         n:s.iles?.length||0, tab:'iles' },
    { icon:'⚓', lbl:'Ports',         n:s.ports?.length||0, tab:'port_commerce' },
    { icon:'💀', lbl:'Repaires',      n:s.repaires?.length||0, tab:'repaire_pirate' },
    { icon:'🚢', lbl:'Épaves',        n:s.epaves?.length||0, tab:'epave' },
    { icon:'🌀', lbl:'Tempête',       n:STORM_CELLS.length, tab:'tempete' },
  ];
  const total = types.reduce((acc, t) => acc + t.n, 0);
  const grid  = document.getElementById('ovGrid');
  if (!grid) return;

  grid.innerHTML =
    `<div class="overview-chip overview-chip--total">
      <div class="overview-chip__icon">🃏</div>
      <div class="overview-chip__val">${total}</div>
      <div class="overview-chip__label">Total éléments</div>
    </div>` +
    types.map(t => `
      <div class="overview-chip" onclick="window._admin.switchTab('${t.tab}')">
        <div class="overview-chip__icon">${t.icon}</div>
        <div class="overview-chip__val">${t.n}</div>
        <div class="overview-chip__label">${t.lbl}</div>
        ${t.sub ? `<div class="overview-chip__sub">${t.sub}</div>` : ''}
      </div>`).join('');

  const setBadge = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  setBadge('nb-parchemin',  (s.parchemin_ile?.length||0)+(s.parchemin_vierge?.count||0));
  setBadge('nb-enigme',     (s.enigme_latitude?.length||0)+(s.enigme_longitude?.length||0)+(s.enigme_code?.length||0));
  setBadge('nb-equip',      s.equipement?.length||0);
  setBadge('nb-evgen',      eventsGen.length);
  setBadge('nb-iles',       s.iles?.length||0);
  setBadge('nb-ports',      s.ports?.length||0);
  setBadge('nb-repaires',   s.repaires?.length||0);
  setBadge('nb-epaves',     s.epaves?.length||0);
  setBadge('sidenav-nb-actions-joueur', actionsJoueur.length);
  setBadge('sidenav-nb-effets',         effets.length);
  setBadge('sidenav-nb-evgen',          eventsGen.length);
  setBadge('nb-action-off',             actionOff.length);
  setBadge('nb-action-def',             actionDef.length);
  setBadge('nb-evenement',              evenements.length);
}

function setCountDisplay(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

// ─── Utilitaire scroll ────────────────────────────────────────────────────────

function scrollToLastIn(listId) {
  const list = document.getElementById(listId);
  if (list) setTimeout(() => list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS GÉNÉRIQUES
// ═══════════════════════════════════════════════════════════════════════════════

function setField(key, i, field, val) {
  if (!state[key]) return;
  state[key][i][field] = val;
  markDirty();
}

function setFieldNum(key, i, field, val) {
  if (!state[key]) return;
  state[key][i][field] = val !== '' ? parseInt(val) || 0 : 0;
  markDirty();
}

function setLieu(key, i, field, val) {
  if (!state[key]) return;
  state[key][i][field] = val;
  markDirty();
}

function setLieuCoord(key, i, field, val) {
  if (!state[key]) return;
  state[key][i][field] = val !== '' ? parseInt(val) : null;
  markDirty();
}

function setIleTaille(i, taille) {
  const ile = state.iles?.[i];
  if (!ile) return;
  if (!ile.cases) ile.cases = [];
  while (ile.cases.length < taille) ile.cases.push({ q: null, r: null });
  ile.cases = ile.cases.slice(0, taille);
  renderIles();
  markDirty();
}

function setCaseCoord(i, ci, axis, val) {
  const ile = state.iles?.[i];
  if (!ile) return;
  if (!ile.cases) ile.cases = [];
  while (ile.cases.length <= ci) ile.cases.push({ q: null, r: null });
  ile.cases[ci][axis] = val !== '' ? parseInt(val) : null;
  markDirty();
}

function removeFrom(key, i) {
  if (!state[key]) return;
  state[key].splice(i, 1);
  rerender(key);
  markDirty();
  updateOverview();
}

function removeLieu(key, i) {
  if (!state[key]) return;
  state[key].splice(i, 1);
  const iconMap = { ports: '⚓', repaires: '💀', epaves: '🚢' };
  renderLieux(key, iconMap[key]);
  markDirty();
  updateOverview();
}

function rerenderLieu(key, icon) {
  renderLieux(key, icon);
}

export function changeCount(key, delta) {
  if (key === 'parchemin_vierge') {
    if (!state.parchemin_vierge) state.parchemin_vierge = { count: 0 };
    state.parchemin_vierge.count = Math.max(0, (state.parchemin_vierge.count || 0) + delta);
    renderParcheminVierge();
    markDirty(); updateOverview();
    return;
  }
  const arr = state[key];
  if (!arr) return;
  if (delta > 0) {
    const defaultIle = state.iles?.[0]?.nom || '';
    const newItems = {
      parchemin_ile:    { id: uid(), ile: defaultIle, description: '' },
      enigme_latitude:  { id: uid(), valeur: 0 },
      enigme_longitude: { id: uid(), valeur: 0 },
      enigme_code:      { id: uid(), delta_lat: 0, delta_lon: 0, description: '' },
      iles:             { id: uid(), nom: '', biome: '', icon: '🏝', nb_objets: 6, cases: [{ q: null, r: null }] },
    };
    if (newItems[key]) arr.push(newItems[key]);
  } else {
    if (arr.length > 0) arr.pop();
  }
  rerender(key);
  markDirty(); updateOverview();
}

export function addItem(key) {
  if (!state[key]) state[key] = [];
  state[key].push({ id: uid(), nom: '', description: '', enabled: true });
  rerender(key);
  markDirty(); updateOverview();
}

export function addLieu(key) {
  if (!state[key]) state[key] = [];
  state[key].push({ id: uid(), nom: '', coord_q: null, coord_r: null });
  const iconMap = { ports: '⚓', repaires: '💀', epaves: '🚢' };
  renderLieux(key, iconMap[key]);
  markDirty(); updateOverview();
}

function rerender(key) {
  if (key === 'iles')              renderIles();
  if (key === 'parchemin_ile')     renderParcheminIle();
  if (key === 'ancien_parchemin')  renderAncienParchemin();
  if (key === 'enigme_latitude')   renderEnigmeLatitude();
  if (key === 'enigme_longitude')  renderEnigmeLongitude();
  if (key === 'enigme_code')       renderEnigmeCode();
  if (key === 'equipement')        renderSimpleList('equipement', '⚙', ['nom','description'], ['Nom','Description / effet']);
  if (key === 'actions_joueur')    renderActionsJoueur();
  if (key === 'effets')            renderEffets();
  if (['action_offensive','action_defensive','evenement'].includes(key)) renderCartesMecaniques();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPOSITIONS GLOBALES
// ═══════════════════════════════════════════════════════════════════════════════

window._admin = {
  switchTab,
  showSubtab,
  setField, setFieldNum,
  setLieu, setLieuCoord, rerenderLieu,
  setIleTaille, setCaseCoord,
  removeFrom, removeLieu,
  rerender,
  changeCount, addItem, addLieu,
  // Niveau 4 — Actions joueur
  addActionJoueur,
  setActionJoueurField,
  removeActionJoueur,
  // Niveau 3 — Effets
  addEffet,
  setEffetField,
  setEffetActions,
  removeEffet,
  // Niveau 2 — Événements génériques
  addEvGen,
  setEvGenField,
  setEvGenEffets,
  removeEvGen,
  // Niveau 1 — Cartes mécaniques
  addCarte,
  setCarteField,
  setCarteEvenements,
  removeCarte,
  // Export
  openExportModal,
  closeExportModal,
  copyExportJson,
  downloadExportJson,
  // Save
  save:      saveConfig,
  discard:   discardChanges,
  markDirty,
};

// Init modal export close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('exportModal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeExportModal(); });
});

loadConfig();