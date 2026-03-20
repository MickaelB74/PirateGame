// ═══════════════════════════════════════════════════════════════════════════════
// admin/admin.js — Éditeur de configuration (ES module)
//
// Responsabilités :
//   - Charger / sauvegarder la config via GET/POST /api/config
//   - Rendre chaque section de carte (parchemins, énigmes, îles, lieux…)
//   - Gérer la navigation par onglets
//   - Synchroniser la save-bar
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constantes grille (pour la tempête) ──────────────────────────────────────
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

// ─── State ────────────────────────────────────────────────────────────────────
let state = {};
let _uid  = 1000;

function uid() { return `c${++_uid}`; }
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

// ─── Helpers îles ─────────────────────────────────────────────────────────────
function getIleOptions(selectedNom = '') {
  const iles = state.iles || DEFAULT_ILES;
  return `<option value="">— Aucune —</option>` +
    iles.map(ile => {
      const nom = ile.nom || 'Île';
      const sel = selectedNom === nom ? 'selected' : '';
      return `<option value="${esc(nom)}" ${sel}>${esc(ile.icon || '🏝')} ${esc(nom)}</option>`;
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

    // ── Garanties / migrations ──
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
        if (defaut && (!ile.cases.length || ile.cases.every(c => c.q == null))) {
          ile.cases = JSON.parse(JSON.stringify(defaut.cases));
        }
        if (!ile.nb_objets || ile.nb_objets < 1) ile.nb_objets = 6;
        return ile;
      });
    }

    if (!state.avancement) state.avancement = { nb_cartes_temps: 6 };

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
// RÈGLES
// ═══════════════════════════════════════════════════════════════════════════════

function applyRulesToForm(rules) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };
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
// NAVIGATION PAR ONGLETS
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
  renderSimpleList('equipement',       '⚙',  ['nom','description'], ['Nom','Description / effet']);
  renderSimpleList('action_offensive', '💥', ['nom','description'], ['Nom de la carte','Description / effet']);
  renderSimpleList('action_defensive', '🛡', ['nom','description'], ['Nom de la carte','Description / effet']);
  renderSimpleList('atout',            '💨', ['nom','description'], ['Nom','Description / effet']);
  renderEvenement();
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
  const el = document.getElementById('list-ancien_parchemin');
  if (!el) return;
  el.innerHTML = arr.map((c, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">${esc(c.relique)}</span>
      </div>
      <div class="fields">
        <div class="field">
          <label class="field__label">Île de destination</label>
          <select class="ile-select" onchange="window._admin.setField('ancien_parchemin',${i},'ile_destination',this.value)">
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
  const rel = state.reliques || {};
  const defs = [
    { key: 'poseidon', icon: '🔱', name: 'Totem de Poséidon' },
    { key: 'eole',     icon: '💨', name: "Totem d'Éole" },
    { key: 'zeus',     icon: '⚡', name: 'Totem de Zeus' },
  ];
  const el = document.getElementById('reliques-container');
  if (!el) return;
  el.innerHTML = defs.map(d => {
    const r = rel[d.key] || {};
    return `<div class="relique-card">
      <div class="relique-card__title">${d.icon} ${d.name}</div>
      <div class="fields">
        <div class="field">
          <label class="field__label">Événement annulé</label>
          <input type="text" value="${esc(r.event)}"
            oninput="window._admin.setRelique('${d.key}','event',this.value)">
        </div>
        <div class="field">
          <label class="field__label">Description de l'effet</label>
          <input type="text" value="${esc(r.desc)}"
            oninput="window._admin.setRelique('${d.key}','desc',this.value)">
        </div>
      </div>
      <label class="toggle-wrap">
        <span class="toggle">
          <input type="checkbox" ${r.enabled !== false ? 'checked' : ''}
            onchange="window._admin.setRelique('${d.key}','enabled',this.checked)">
          <span class="toggle__slider"></span>
        </span>
        Activée dans le jeu
      </label>
    </div>`;
  }).join('');
}

// ─── Listes simples (équipement, actions, atouts) ─────────────────────────────

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
  updateActionBadge();
}

// ─── Événements ───────────────────────────────────────────────────────────────

function renderEvenement() {
  const arr = state.evenement || [];
  const relOptions = [
    { val: '',                label: '— Aucune —' },
    { val: 'relique_poseidon', label: 'Totem de Poséidon' },
    { val: 'relique_eole',     label: "Totem d'Éole" },
    { val: 'relique_zeus',     label: 'Totem de Zeus' },
  ];
  const el = document.getElementById('list-evenement');
  if (!el) return;
  el.innerHTML = arr.map((c, i) => `
    <div class="card-entry">
      <div class="card-entry__header">
        <span class="card-entry__num">⚡ Événement ${i + 1}</span>
        <label class="toggle-wrap" style="margin-left:6px">
          <span class="toggle">
            <input type="checkbox" ${c.enabled !== false ? 'checked' : ''}
              onchange="window._admin.setField('evenement',${i},'enabled',this.checked)">
            <span class="toggle__slider"></span>
          </span>
          <span style="font-size:.8rem">${c.enabled !== false ? 'Actif' : 'Inactif'}</span>
        </label>
        <button class="btn-remove" onclick="window._admin.removeFrom('evenement',${i})">✕</button>
      </div>
      <div class="fields--3">
        <div class="field">
          <label class="field__label">Nom de l'événement</label>
          <input type="text" value="${esc(c.nom)}"
            oninput="window._admin.setField('evenement',${i},'nom',this.value)">
        </div>
        <div class="field">
          <label class="field__label">Description / effet</label>
          <input type="text" value="${esc(c.description)}"
            oninput="window._admin.setField('evenement',${i},'description',this.value)">
        </div>
        <div class="field">
          <label class="field__label">Annulé par la relique</label>
          <select onchange="window._admin.setField('evenement',${i},'annule_relique',this.value)">
            ${relOptions.map(r => `<option value="${r.val}" ${c.annule_relique === r.val ? 'selected' : ''}>${r.label}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`).join('');

  const badge = document.getElementById('nb-event');
  if (badge) badge.textContent = arr.length;
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

  // Resync les sélects qui dépendent des noms d'îles
  renderParcheminIle();
  renderAncienParchemin();
}

// ─── Avancement ───────────────────────────────────────────────────────────────

function renderAvancement() {
  const nb = state.avancement?.nb_cartes_temps ?? 6;
  const el = document.getElementById('nb_cartes_temps');
  if (el) el.value = nb;
}

// ─── Lieux (ports, repaires, épaves) ─────────────────────────────────────────

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
  const types = [
    { icon:'📜', lbl:'Parchemins',   n:(s.parchemin_ile?.length||0)+(s.parchemin_vierge?.count||0), tab:'parchemin' },
    { icon:'🔍', lbl:'Énigmes',      n:(s.enigme_latitude?.length||0)+(s.enigme_longitude?.length||0)+(s.enigme_code?.length||0), tab:'enigme' },
    { icon:'🗺',  lbl:'Anc. Parch.', n:3, tab:'ancien_parchemin' },
    { icon:'⭐', lbl:'Reliques',     n:3, tab:'relique' },
    { icon:'⚙',  lbl:'Équipements', n:s.equipement?.length||0, tab:'equipement' },
    { icon:'⚔',  lbl:'Actions',     n:(s.action_offensive?.length||0)+(s.action_defensive?.length||0), tab:'action' },
    { icon:'💨', lbl:'Atouts',       n:s.atout?.length||0, tab:'atout' },
    { icon:'⚡', lbl:'Événements',   n:s.evenement?.length||0, tab:'evenement' },
    { icon:'🏝', lbl:'Îles',         n:s.iles?.length||0, tab:'iles' },
    { icon:'⚓', lbl:'Ports',         n:s.ports?.length||0, tab:'port_commerce' },
    { icon:'💀', lbl:'Repaires',      n:s.repaires?.length||0, tab:'repaire_pirate' },
    { icon:'🚢', lbl:'Épaves',        n:s.epaves?.length||0, tab:'epave' },
    { icon:'🌀', lbl:'Tempête',       n:STORM_CELLS.length, tab:'tempete' },
  ];
  const total = types.reduce((acc, t) => acc + t.n, 0);
  const grid = document.getElementById('ovGrid');
  if (!grid) return;

  grid.innerHTML =
    `<div class="overview-chip overview-chip--total">
      <div class="overview-chip__icon">🃏</div>
      <div class="overview-chip__val">${total}</div>
      <div class="overview-chip__label">Total cartes</div>
    </div>` +
    types.map(t => `
      <div class="overview-chip" onclick="window._admin.switchTab('${t.tab}')">
        <div class="overview-chip__icon">${t.icon}</div>
        <div class="overview-chip__val">${t.n}</div>
        <div class="overview-chip__label">${t.lbl}</div>
      </div>`).join('');

  // Badges sidenav
  const setBadge = (id, n) => {
    const el = document.getElementById(id);
    if (el) el.textContent = n;
  };
  setBadge('nb-parchemin', (s.parchemin_ile?.length||0)+(s.parchemin_vierge?.count||0));
  setBadge('nb-enigme',    (s.enigme_latitude?.length||0)+(s.enigme_longitude?.length||0)+(s.enigme_code?.length||0));
  setBadge('nb-equip',     s.equipement?.length||0);
  setBadge('nb-atout',     s.atout?.length||0);
  setBadge('nb-event',     s.evenement?.length||0);
  setBadge('nb-iles',      s.iles?.length||0);
  setBadge('nb-ports',     s.ports?.length||0);
  setBadge('nb-repaires',  s.repaires?.length||0);
  setBadge('nb-epaves',    s.epaves?.length||0);
  updateActionBadge();
}

function updateActionBadge() {
  const el = document.getElementById('nb-action');
  if (el) el.textContent = (state.action_offensive?.length||0) + (state.action_defensive?.length||0);
}

function setCountDisplay(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS d'état (appelées depuis les handlers inline via window._admin)
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

function setRelique(key, field, val) {
  if (!state.reliques) state.reliques = {};
  if (!state.reliques[key]) state.reliques[key] = {};
  state.reliques[key][field] = val;
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

// ─── Changer un compteur (parchemins, énigmes, îles) ─────────────────────────

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

// ─── Ajouter un item dans une liste libre ─────────────────────────────────────

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

// ─── Rerender d'une clé spécifique ───────────────────────────────────────────

function rerender(key) {
  if (key === 'iles')             renderIles();
  if (key === 'parchemin_ile')    renderParcheminIle();
  if (key === 'enigme_latitude')  renderEnigmeLatitude();
  if (key === 'enigme_longitude') renderEnigmeLongitude();
  if (key === 'enigme_code')      renderEnigmeCode();
  if (key === 'equipement')       renderSimpleList('equipement',       '⚙',  ['nom','description'], ['Nom','Description / effet']);
  if (key === 'action_offensive') renderSimpleList('action_offensive', '💥', ['nom','description'], ['Nom de la carte','Description / effet']);
  if (key === 'action_defensive') renderSimpleList('action_defensive', '🛡', ['nom','description'], ['Nom de la carte','Description / effet']);
  if (key === 'atout')            renderSimpleList('atout',            '💨', ['nom','description'], ['Nom','Description / effet']);
  if (key === 'evenement')        renderEvenement();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPOSITIONS GLOBALES (nécessaires pour les onclick inline dans le HTML généré)
// ═══════════════════════════════════════════════════════════════════════════════

window._admin = {
  switchTab,
  showSubtab,
  setField, setFieldNum, setRelique,
  setLieu, setLieuCoord, rerenderLieu,
  setIleTaille, setCaseCoord,
  removeFrom, removeLieu,
  rerender,
  changeCount, addItem, addLieu,
  save:       saveConfig,
  discard:    discardChanges,
  markDirty,
};

// ─── Init ─────────────────────────────────────────────────────────────────────
loadConfig();
