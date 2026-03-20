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

// Reliques fixes — labels immuables, jamais modifiables depuis l'admin
const RELIQUES_FIXES = [
  { key: 'poseidon', icon: '🔱', name: 'Totem de Poséidon' },
  { key: 'eole',     icon: '💨', name: "Totem d'Éole"      },
  { key: 'zeus',     icon: '⚡', name: 'Totem de Zeus'      },
];

// Effets prédéfinis pour les événements génériques
const EFFETS_PREDEFINIS = [
  'Aucun déplacement ce tour',
  'Déplacement réduit de moitié',
  'Déplacement forcé (direction aléatoire)',
  'Perte de 1 point de coque',
  'Perte de 2 points de coque',
  'Perte de 1 doublon',
  'Perte de 2 doublons',
  'Gain de 2 doublons',
  'Gain de 3 doublons',
  'Passer son tour',
  'Rejouer immédiatement',
  'Défausser 1 carte',
  'Piocher 1 carte supplémentaire',
  'Voler 1 doublon à un joueur adjacent',
  'Effet personnalisé…',
];

// ─── State ────────────────────────────────────────────────────────────────────
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
    if (!Array.isArray(state.evenements_generiques)) state.evenements_generiques = [];

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
  // Construire le snapshot courant avec les règles
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
  counter.textContent = `${jsonStr.length.toLocaleString()} caractères · ${exportData.cards.evenements_generiques?.length || 0} événements génériques`;

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
  renderTodoSection('action',    '⚔ Actions',     'La mécanique des cartes action (offensives / défensives) sera conçue dans une prochaine itération.');
  renderTodoSection('atout',     '💨 Atouts',      'La mécanique des cartes atout sera conçue dans une prochaine itération.');
  renderTodoSection('evenement', '⚡ Événements',  'La mécanique des cartes événement sera conçue dans une prochaine itération.');
  renderEvenementsGeneriques();
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

// ─── Sections "À venir" ───────────────────────────────────────────────────────

function renderTodoSection(tabKey, title, message) {
  const ids = {
    action:    ['list-action_offensive', 'list-action_defensive'],
    atout:     ['list-atout'],
    evenement: ['list-evenement'],
  };
  const html = `
    <div class="soon-block">
      <div class="soon-block__icon">🚧</div>
      <div class="soon-block__title">${title}</div>
      <div class="soon-block__desc">${message}</div>
    </div>`;
  for (const id of (ids[tabKey] || [])) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
}

// ─── ÉVÉNEMENTS GÉNÉRIQUES ────────────────────────────────────────────────────

function renderEvenementsGeneriques() {
  const arr = state.evenements_generiques || [];
  const el  = document.getElementById('list-evenements-generiques');
  const badge = document.getElementById('nb-evgen');
  if (badge) badge.textContent = arr.length;
  if (!el) return;

  if (!arr.length) {
    el.innerHTML = `
      <div class="evgen-empty">
        <span class="evgen-empty__icon">🌊</span>
        <div class="evgen-empty__text">Aucun événement générique défini</div>
        <div class="evgen-empty__sub">Cliquez sur « + Ajouter un événement » pour commencer</div>
      </div>`;
    return;
  }

  el.innerHTML = arr.map((ev, i) => {
    const dureeLabel = ev.duree === 0 ? 'Instantané' : ev.duree === 1 ? '1 tour' : `${ev.duree} tours`;
    const dureeColor = ev.duree === 0 ? '#4aedcc' : ev.duree === 1 ? '#d4a017' : '#e07070';
    return `
    <div class="evgen-card" id="evgen-${i}">
      <div class="evgen-card__header">
        <div class="evgen-card__index">#${String(i + 1).padStart(2, '0')}</div>
        <div class="evgen-card__name-wrap">
          <input
            class="evgen-name-input"
            type="text"
            value="${esc(ev.nom)}"
            placeholder="Nom de l'événement…"
            oninput="window._admin.setEvGenField(${i},'nom',this.value)"
          />
        </div>
        <div class="evgen-card__duree" style="color:${dureeColor}">
          <span class="evgen-duree-ico">⏱</span>
          <span>${dureeLabel}</span>
        </div>
        <div class="evgen-card__actions">
          <button class="evgen-btn-dupe" onclick="window._admin.dupeEvGen(${i})" title="Dupliquer">⧉</button>
          <button class="evgen-btn-del"  onclick="window._admin.removeEvGen(${i})" title="Supprimer">✕</button>
        </div>
      </div>
      <div class="evgen-card__body">
        <div class="evgen-field-group">
          <label class="evgen-label">Effet</label>
          <div class="evgen-effet-row">
            <select class="evgen-select" onchange="window._admin.onEffetSelect(${i},this.value)">
              ${EFFETS_PREDEFINIS.map(ef => {
                const isCustom = ef === 'Effet personnalisé…';
                const isSelected = !EFFETS_PREDEFINIS.slice(0, -1).includes(ev.effet)
                  ? isCustom
                  : ev.effet === ef;
                return `<option value="${esc(ef)}" ${isSelected ? 'selected' : ''}>${esc(ef)}</option>`;
              }).join('')}
            </select>
          </div>
          <textarea
            class="evgen-textarea"
            placeholder="Décrivez l'effet complet…"
            oninput="window._admin.setEvGenField(${i},'effet',this.value)"
          >${esc(ev.effet)}</textarea>
        </div>
        <div class="evgen-field-group">
          <label class="evgen-label">Durée</label>
          <div class="evgen-duree-control">
            <button class="evgen-duree-btn" onclick="window._admin.setEvGenDuree(${i}, Math.max(0, ${ev.duree}-1))">−</button>
            <div class="evgen-duree-display" style="color:${dureeColor}">
              <span class="evgen-duree-val">${ev.duree}</span>
              <span class="evgen-duree-unit">${ev.duree === 0 ? 'instantané' : ev.duree === 1 ? 'tour' : 'tours'}</span>
            </div>
            <button class="evgen-duree-btn" onclick="window._admin.setEvGenDuree(${i}, Math.min(10, ${ev.duree}+1))">+</button>
          </div>
          <div class="evgen-duree-hint">
            ${ev.duree === 0 ? '⚡ Effet immédiat, sans durée' : ev.duree === 1 ? '🔄 Actif pendant le tour en cours' : `🔁 Actif pendant ${ev.duree} tours consécutifs`}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

export function addEvGen() {
  if (!Array.isArray(state.evenements_generiques)) state.evenements_generiques = [];
  state.evenements_generiques.push({
    id:    uid(),
    nom:   '',
    effet: '',
    duree: 0,
  });
  renderEvenementsGeneriques();
  markDirty();
  updateOverview();
  // Scroll to last card
  const list = document.getElementById('list-evenements-generiques');
  if (list) setTimeout(() => list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}

function setEvGenField(i, field, val) {
  if (!state.evenements_generiques?.[i]) return;
  state.evenements_generiques[i][field] = val;
  markDirty();
  // Only re-render header part to avoid losing focus
  if (field === 'nom') {
    const badge = document.getElementById('nb-evgen');
    if (badge) badge.textContent = state.evenements_generiques.length;
  }
}

function setEvGenDuree(i, val) {
  if (!state.evenements_generiques?.[i]) return;
  state.evenements_generiques[i].duree = val;
  renderEvenementsGeneriques();
  markDirty();
}

function dupeEvGen(i) {
  if (!state.evenements_generiques?.[i]) return;
  const copy = { ...state.evenements_generiques[i], id: uid(), nom: state.evenements_generiques[i].nom + ' (copie)' };
  state.evenements_generiques.splice(i + 1, 0, copy);
  renderEvenementsGeneriques();
  markDirty();
  updateOverview();
}

function removeEvGen(i) {
  if (!state.evenements_generiques) return;
  state.evenements_generiques.splice(i, 1);
  renderEvenementsGeneriques();
  markDirty();
  updateOverview();
}

function onEffetSelect(i, val) {
  if (!state.evenements_generiques?.[i]) return;
  if (val !== 'Effet personnalisé…') {
    state.evenements_generiques[i].effet = val;
    // Update textarea directly without full re-render to avoid losing select focus
    const card = document.getElementById(`evgen-${i}`);
    if (card) {
      const ta = card.querySelector('.evgen-textarea');
      if (ta) ta.value = val;
    }
    markDirty();
  }
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
  const types = [
    { icon:'📜', lbl:'Parchemins',   n:(s.parchemin_ile?.length||0)+(s.parchemin_vierge?.count||0), tab:'parchemin' },
    { icon:'🔍', lbl:'Énigmes',      n:(s.enigme_latitude?.length||0)+(s.enigme_longitude?.length||0)+(s.enigme_code?.length||0), tab:'enigme' },
    { icon:'🗺',  lbl:'Anc. Parch.', n:(s.ancien_parchemin?.length||0), tab:'ancien_parchemin' },
    { icon:'⭐', lbl:'Reliques',     n:3, tab:'relique' },
    { icon:'⚙',  lbl:'Équipements', n:s.equipement?.length||0, tab:'equipement' },
    { icon:'⚔',  lbl:'Actions',     n:0, tab:'action' },
    { icon:'💨', lbl:'Atouts',       n:0, tab:'atout' },
    { icon:'⚡', lbl:'Événements',   n:0, tab:'evenement' },
    { icon:'🌊', lbl:'Évén. Génér.', n:s.evenements_generiques?.length||0, tab:'evenements_generiques' },
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
      <div class="overview-chip__label">Total cartes</div>
    </div>` +
    types.map(t => `
      <div class="overview-chip" onclick="window._admin.switchTab('${t.tab}')">
        <div class="overview-chip__icon">${t.icon}</div>
        <div class="overview-chip__val">${t.n}</div>
        <div class="overview-chip__label">${t.lbl}</div>
      </div>`).join('');

  const setBadge = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  setBadge('nb-parchemin', (s.parchemin_ile?.length||0)+(s.parchemin_vierge?.count||0));
  setBadge('nb-enigme',    (s.enigme_latitude?.length||0)+(s.enigme_longitude?.length||0)+(s.enigme_code?.length||0));
  setBadge('nb-equip',     s.equipement?.length||0);
  setBadge('nb-atout',     0);
  setBadge('nb-event',     0);
  setBadge('nb-action',    0);
  setBadge('nb-evgen',     s.evenements_generiques?.length||0);
  setBadge('nb-iles',      s.iles?.length||0);
  setBadge('nb-ports',     s.ports?.length||0);
  setBadge('nb-repaires',  s.repaires?.length||0);
  setBadge('nb-epaves',    s.epaves?.length||0);
}

function setCountDisplay(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
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
  if (key === 'iles')             renderIles();
  if (key === 'parchemin_ile')    renderParcheminIle();
  if (key === 'ancien_parchemin') renderAncienParchemin();
  if (key === 'enigme_latitude')  renderEnigmeLatitude();
  if (key === 'enigme_longitude') renderEnigmeLongitude();
  if (key === 'enigme_code')      renderEnigmeCode();
  if (key === 'equipement')       renderSimpleList('equipement', '⚙', ['nom','description'], ['Nom','Description / effet']);
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
  // Événements génériques
  addEvGen,
  setEvGenField,
  setEvGenDuree,
  dupeEvGen,
  removeEvGen,
  onEffetSelect,
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