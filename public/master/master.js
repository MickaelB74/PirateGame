// ═══════════════════════════════════════════════════════════════════════════════
// master/master.js — Logique de l'interface Maître de Jeu
// ═══════════════════════════════════════════════════════════════════════════════

import { hexCenter, hexPoints, setCalibParams, IMG_W, IMG_H, GRID_ROWS, colsForRow } from '/shared/hex.js';

// ─── État ────────────────────────────────────────────────────────────────────

let socket;
let state     = {};
let cfg       = {};
let hoveredIleCases = [];

// Calibration
let calibState = { HEX_R: 24.1, MARGIN_X: 48.5, MARGIN_Y: 42.5, COL_SP: 48.5, ROW_SP: 41.9, ROW_OFFSET: 24.3 };
let _lastSetupSig = null;

// Index obstacles pour hover
let obstacleIndex = new Map();

// ─── Init Socket ──────────────────────────────────────────────────────────────

function initSocket() {
  socket = io();
  socket.emit('master:join');

  socket.on('game:state', (s) => {
    const hadSetup = !!state.setup;
    state = s;
    renderUI();
    renderMap();
    renderEnigmeSlots();
    if (s.setup && !hadSetup) renderIles();
  });

  socket.on('config:updated', (cards) => {
    cfg = cards;
    renderIles();
    renderAvancement();
    renderEnigmeSlots();
  });
}

function loadConfig() {
  fetch('/api/config')
    .then(r => r.json())
    .then(c => {
      cfg = c.cards || {};
      renderIles();
      renderAvancement();
    })
    .catch(() => {});
}

// ─── URL Joueur ──────────────────────────────────────────────────────────────

function initPlayerUrl() {
  const url = `${location.protocol}//${location.hostname}:${location.port}/`;
  const el  = document.getElementById('playerUrl');
  el.textContent = url;
  el.addEventListener('click', () => {
    navigator.clipboard.writeText(url).then(() => {
      const o = el.textContent;
      el.textContent = '✓ Copié !';
      setTimeout(() => el.textContent = o, 1500);
    });
  });
}

// ─── Rendu UI ─────────────────────────────────────────────────────────────────

function renderUI() {
  const badge   = document.getElementById('statusBadge');
  const labels  = { waiting: 'En attente', picking: 'Choix départ', playing: 'En cours', ended: 'Terminée' };
  const bCls    = { waiting: 'badge--waiting', picking: 'badge--picking', playing: 'badge--playing', ended: 'badge--ended' };
  badge.textContent = labels[state.status] || state.status;
  badge.className   = `badge ${bCls[state.status] || 'badge--waiting'}`;

  const players = Object.entries(state.players || {});
  document.getElementById('playerCount').textContent  = players.length;
  document.getElementById('playerCountS').textContent = players.length;

  const list = document.getElementById('playerList');
  list.innerHTML = players.length
    ? players.map(([id, p]) => {
        const isActive = state.currentTurn === id;
        const pos      = p.position ? `Q${p.position.q} R${p.position.r}` : '–';
        return `<div class="player-row ${isActive ? 'player-row--active' : ''}">
          <div class="player-dot" style="background:${p.color}"></div>
          <span>${p.name}</span>
          ${isActive ? '<span class="turn-tag">Tour</span>' : ''}
          <span class="player-pos">${pos}</span>
        </div>`;
      }).join('')
    : '<div style="color:var(--muted);font-style:italic;font-size:.9rem">Aucun joueur…</div>';

  document.getElementById('btnStart').disabled = players.length < 1 || state.status === 'playing' || state.status === 'picking';

  document.getElementById('logList').innerHTML =
    (state.log?.length ? state.log : ['Aucun événement.']).map(e => `<li>${e}</li>`).join('');

  // Détecter arrivée du setup → ouvrir la popup une seule fois
  const setupSig = state.setup ? JSON.stringify(state.setup.ileOrder) : null;
  if (state.setup && setupSig !== _lastSetupSig) {
    const wasNull = _lastSetupSig === null;
    _lastSetupSig = setupSig;
    if (wasNull) setTimeout(() => openSetupPopup(state.setup), 120);
  } else if (!state.setup) {
    _lastSetupSig = null;
  }
}

// ─── Rendu Îles ───────────────────────────────────────────────────────────────

function renderIles() {
  const iles = cfg.iles || [];
  const mid  = Math.ceil(iles.length / 2);
  document.getElementById('ileGauche').innerHTML = '<div class="zone-iles__title font-display">🏝 Îles</div>' + iles.slice(0, mid).map(ileCardHTML).join('');
  document.getElementById('ileDroite').innerHTML = '<div class="zone-iles__title font-display">🏝 Îles</div>' + iles.slice(mid).map(ileCardHTML).join('');
  bindIleHover();
}

function ileCardHTML(ile) {
  const nbObjets  = ile.nb_objets || 6;
  const objSlots  = Array.from({ length: nbObjets }).map(() => '<div class="obj-slot">·</div>').join('');
  let cases = (ile.cases || []).filter(c => c.q != null && c.r != null);
  if (!cases.length && ile.coord_q != null) cases = [{ q: ile.coord_q, r: ile.coord_r }];
  const coordsHTML = cases.length
    ? cases.map(c => `<span class="coord-tag coord-tag--active">Q${c.q} R${c.r}</span>`).join('')
    : '<span class="coord-tag">— aucune coord</span>';

  const pSlot = state.setup?.parcheminsParIle?.[ile.id];
  const parchSlot = pSlot
    ? `<div class="parch-slot parch-slot--filled" title="Cliquer pour révéler" onclick="openParchPopup('${ile.id}')">📜</div>`
    : '<div class="parch-slot" title="Aucune carte">·</div>';

  return `<div class="ile-card" data-cases='${JSON.stringify(cases)}' data-ile-id="${ile.id}">
    <div class="ile-card__header">
      <span class="ile-card__icon">${ile.icon || '🏝'}</span>
      <div class="ile-card__info">
        <div class="ile-card__name">${ile.nom || 'Île'}</div>
        <div class="ile-card__biome">${ile.biome || ''}</div>
        <div class="ile-card__coords">${coordsHTML}</div>
      </div>
    </div>
    <div class="ile-card__bottom">
      <span class="ile-objets-label">Obj.</span>
      <div class="ile-slots">${objSlots}</div>
      <div class="ile-sep"></div>
      <span class="ile-parch-label">Parch.</span>
      ${parchSlot}
    </div>
  </div>`;
}

function bindIleHover() {
  document.querySelectorAll('.ile-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      try { hoveredIleCases = JSON.parse(card.dataset.cases) || []; } catch { hoveredIleCases = []; }
      if (hoveredIleCases.length) renderMap();
    });
    card.addEventListener('mouseleave', () => { hoveredIleCases = []; renderMap(); });
  });
}

// ─── Popup Parchemin ─────────────────────────────────────────────────────────

function openParchPopup(ileId) {
  const pSlot = state.setup?.parcheminsParIle?.[ileId];
  if (!pSlot) return;
  const ile  = (cfg.iles || []).find(il => il.id === ileId);
  const card = pSlot.card;
  document.getElementById('parchPopupIleName').textContent = ile ? `${ile.icon || '🏝'} ${ile.nom}` : '';
  const body = document.getElementById('parchPopupBody');
  if (card?.type === 'ile') {
    body.innerHTML = `
      <span class="parch-popup__icon">📜</span>
      <span class="parch-popup__type">Parchemin Île</span>
      <span class="parch-popup__dest">${card.ile || '?'}</span>
      <div class="parch-popup__seal">⚓</div>`;
  } else {
    body.innerHTML = `
      <span class="parch-popup__icon">📄</span>
      <span class="parch-popup__type">Parchemin</span>
      <span class="parch-popup__vierge">Vierge — aucune destination</span>
      <div class="parch-popup__seal" style="background:radial-gradient(circle at 38% 32%,#555,#222)">·</div>`;
  }
  showOverlay('parchPopupOverlay');
}

// ─── Rendu Avancement ─────────────────────────────────────────────────────────

function renderAvancement() {
  const nb        = cfg.avancement?.nb_cartes_temps || 6;
  const container = document.getElementById('topAvancement');
  let html = '<span class="top-label font-display">Avancement</span>';
  for (let i = 0; i < nb; i++) {
    if (i > 0) html += '<span class="av-arrow">›</span>';
    html += `<div class="card-slot" data-tip="Temps ${i + 1}|Carte d'avancement." id="tempsSlot${i}">
      <span class="card-slot__icon">⏳</span>
      <span class="card-slot__label">Temps ${i + 1}</span>
      <span class="card-slot__sub">vide</span>
    </div>`;
  }
  container.innerHTML = html;
  bindTooltips();
}

// ─── Rendu Énigmes ────────────────────────────────────────────────────────────

function renderEnigmeSlots() {
  const enigmes = state.setup?.enigmes;
  const defs = [
    { id: 'slotLatitude',  key: 'latitude',  icon: '↔', label: 'Latitude' },
    { id: 'slotLongitude', key: 'longitude', icon: '↕', label: 'Longitude' },
    { id: 'slotCode',      key: 'code',      icon: '🔐', label: 'Code' },
  ];
  for (const { id, key, icon, label } of defs) {
    const slot = document.getElementById(id);
    if (!slot) continue;
    const card = enigmes?.[key];
    if (card) {
      const visible = card.visible;
      const sub     = visible
        ? (key === 'code' ? `Δ${card.delta_lat >= 0 ? '+' : ''}${card.delta_lat} / ${card.delta_lon >= 0 ? '+' : ''}${card.delta_lon}` : `=${card.valeur}`)
        : 'face ↓';
      slot.className   = 'card-slot card-slot--filled';
      slot.innerHTML   = `<span class="card-slot__icon">${icon}</span><span class="card-slot__label">${label}</span><span class="card-slot__sub">${sub}</span>`;
      slot.style.cursor = 'pointer';
      slot.onclick      = () => toggleEnigme(key);
    } else {
      slot.className   = 'card-slot';
      slot.innerHTML   = `<span class="card-slot__icon">${icon}</span><span class="card-slot__label">${label}</span><span class="card-slot__sub">vide</span>`;
      slot.style.cursor = '';
      slot.onclick      = null;
    }
  }
  bindTooltips();
}

function toggleEnigme(key) {
  if (!state.setup?.enigmes?.[key]) return;
  state.setup.enigmes[key].visible = !state.setup.enigmes[key].visible;
  renderEnigmeSlots();
}

// ─── Carte ────────────────────────────────────────────────────────────────────

function getScale() {
  const img = document.getElementById('mapImg');
  return img.clientWidth / IMG_W;
}

function syncOverlay() {
  const img   = document.getElementById('mapImg');
  const wrap  = document.getElementById('mapWrap');
  const iRect = img.getBoundingClientRect();
  const wRect = wrap.getBoundingClientRect();
  const ov    = document.getElementById('hexOverlay');
  const l = iRect.left - wRect.left, t = iRect.top - wRect.top;
  ov.style.left   = l + 'px'; ov.style.top  = t + 'px';
  ov.style.width  = iRect.width + 'px'; ov.style.height = iRect.height + 'px';
  ov.setAttribute('width',  iRect.width);  ov.setAttribute('height', iRect.height);
  ov.setAttribute('viewBox', `0 0 ${iRect.width} ${iRect.height}`);
}

function renderMap() {
  syncOverlay();
  const scale = getScale();
  const svg   = document.getElementById('hexOverlay');
  let html    = '';

  // Grille
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let q = 0; q < colsForRow(r); q++) {
      const { x, y } = hexCenter(q, r, scale);
      html += `<polygon class="hex-cell" data-q="${q}" data-r="${r}" points="${hexPoints(x, y, scale)}"
        fill="transparent" stroke="rgba(184,134,11,0.08)" stroke-width="${scale}" style="cursor:crosshair"/>`;
    }
  }

  // Cases de départ
  if (state.status === 'picking' && state.pendingStartSlots) {
    for (const { q, r } of state.pendingStartSlots) {
      const { x, y } = hexCenter(q, r, scale);
      html += `<polygon points="${hexPoints(x, y, scale)}" fill="rgba(74,238,204,0.25)" stroke="#4aedcc" stroke-width="${1.5 * scale}" style="pointer-events:none"/>`;
    }
  }

  // Options de déplacement
  if (state.moveOptions?.length) {
    const LIEU_STYLES = {
      ile:     { fill: 'rgba(30,100,30,0.45)',  stroke: '#5aad52' },
      port:    { fill: 'rgba(20,60,130,0.45)',  stroke: '#4ac8ff' },
      repaire: { fill: 'rgba(120,20,20,0.45)',  stroke: '#c04040' },
      epave:   { fill: 'rgba(90,70,20,0.45)',   stroke: '#c8a840' },
      default: { fill: 'rgba(255,200,50,0.28)', stroke: '#ffc832' },
    };
    for (const { q, r } of state.moveOptions) {
      const { x, y } = hexCenter(q, r, scale);
      const lieu  = obstacleIndex.get(`${q},${r}`);
      const style = lieu ? (LIEU_STYLES[lieu.type] || LIEU_STYLES.default) : LIEU_STYLES.default;
      html += `<polygon points="${hexPoints(x, y, scale)}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${1.5 * scale}" style="pointer-events:none"/>`;
      if (lieu) html += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${11 * scale}" style="pointer-events:none">${lieu.icon}</text>`;
    }
  }

  // Cases île survolées
  for (const { q, r } of hoveredIleCases) {
    const { x, y } = hexCenter(q, r, scale);
    html += `<polygon points="${hexPoints(x, y, scale)}" fill="rgba(212,160,23,0.32)" stroke="#d4a017" stroke-width="${2.5 * scale}" style="pointer-events:none"/>`;
    html += `<text x="${x}" y="${y - (calibState.HEX_R + 6) * scale}" text-anchor="middle" fill="#d4a017" font-family="monospace" font-size="${8 * scale}" font-weight="bold" style="pointer-events:none">Q${q} R${r}</text>`;
  }

  // Joueurs
  for (const [id, p] of Object.entries(state.players || {})) {
    if (!p.position) continue;
    const { x, y }   = hexCenter(p.position.q, p.position.r, scale);
    const isActive = state.currentTurn === id;
    const radius   = 9 * scale;
    if (isActive) html += `<circle cx="${x}" cy="${y}" r="${radius + 3 * scale}" fill="none" stroke="${p.color}" stroke-width="${1.5 * scale}" opacity="0.6" style="pointer-events:none"/>`;
    html += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${p.color}" stroke="#1a1209" stroke-width="${scale}" style="pointer-events:none"/>`;
    html += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#1a1209" font-family="Cinzel Decorative" font-size="${7 * scale}" font-weight="bold" style="pointer-events:none">${p.name[0].toUpperCase()}</text>`;
  }

  // Indicateur dé
  if (state.diceRoll && state.players[state.diceRoll.playerId]?.position) {
    const p = state.players[state.diceRoll.playerId];
    const { x, y } = hexCenter(p.position.q, p.position.r, scale);
    html += `<text x="${x + 18 * scale}" y="${y - 18 * scale}" text-anchor="middle" dominant-baseline="central" fill="#ffc832" font-size="${16 * scale}" style="pointer-events:none">🎲${state.diceRoll.value}</text>`;
  }

  svg.innerHTML = `<defs><filter id="shadow"><feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#000" flood-opacity="0.8"/></filter></defs>` + html;
  buildObstacleIndex();
  bindHexHover();
}

// ─── Index obstacles ─────────────────────────────────────────────────────────

function buildObstacleIndex() {
  obstacleIndex.clear();
  for (const ile of (cfg.iles || [])) {
    const cases = (ile.cases || []).filter(c => c.q != null && c.r != null);
    if (!cases.length && ile.coord_q != null) cases.push({ q: ile.coord_q, r: ile.coord_r });
    for (const c of cases)
      obstacleIndex.set(`${c.q},${c.r}`, { type: 'ile', label: ile.nom || 'Île', icon: '🏝' });
  }
  for (const p of (cfg.ports || []))
    if (p.coord_q != null) obstacleIndex.set(`${p.coord_q},${p.coord_r}`, { type: 'port', label: p.nom || 'Port', icon: '⚓' });
  for (const r of (cfg.repaires || []))
    if (r.coord_q != null) obstacleIndex.set(`${r.coord_q},${r.coord_r}`, { type: 'repaire', label: r.nom || 'Repaire', icon: '💀' });
  for (const e of (cfg.epaves || []))
    if (e.coord_q != null) obstacleIndex.set(`${e.coord_q},${e.coord_r}`, { type: 'epave', label: e.nom || 'Épave', icon: '🚢' });
}

// ─── Hover hex ────────────────────────────────────────────────────────────────

function bindHexHover() {
  const svg = document.getElementById('hexOverlay');
  const hexTip = document.getElementById('hexTip');
  const LIEU_STYLES = {
    ile:     { fill: 'rgba(30,100,30,0.35)',  stroke: '#5aad52',  tipColor: '#5aad52'  },
    port:    { fill: 'rgba(20,60,130,0.35)',  stroke: '#4ac8ff',  tipColor: '#4ac8ff'  },
    repaire: { fill: 'rgba(120,20,20,0.35)',  stroke: '#c04040',  tipColor: '#e07070'  },
    epave:   { fill: 'rgba(90,70,20,0.35)',   stroke: '#c8a840',  tipColor: '#d4b850'  },
    default: { fill: 'rgba(180,180,180,0.18)',stroke: 'rgba(200,200,200,0.5)', tipColor: '#aaa' },
  };

  document.querySelectorAll('.hex-cell').forEach(cell => {
    cell.addEventListener('mouseenter', e => {
      const q = parseInt(cell.dataset.q), r = parseInt(cell.dataset.r);
      const scale = getScale();
      const { x, y } = hexCenter(q, r, scale);
      const lieu  = obstacleIndex.get(`${q},${r}`);
      const style = lieu ? (LIEU_STYLES[lieu.type] || LIEU_STYLES.default) : LIEU_STYLES.default;

      let ghost = document.getElementById('hex-ghost');
      if (!ghost) {
        ghost = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        ghost.id = 'hex-ghost'; ghost.style.pointerEvents = 'none'; svg.appendChild(ghost);
      }
      ghost.setAttribute('points', hexPoints(x, y, scale));
      ghost.setAttribute('fill', style.fill);
      ghost.setAttribute('stroke', style.stroke);
      ghost.setAttribute('stroke-width', 1.8 * scale);

      let ghostIcon = document.getElementById('hex-ghost-icon');
      if (!ghostIcon) {
        ghostIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ghostIcon.id = 'hex-ghost-icon'; ghostIcon.style.pointerEvents = 'none';
        ghostIcon.setAttribute('text-anchor', 'middle'); ghostIcon.setAttribute('dominant-baseline', 'central');
        svg.appendChild(ghostIcon);
      }
      if (lieu) {
        ghostIcon.setAttribute('x', x); ghostIcon.setAttribute('y', y);
        ghostIcon.setAttribute('font-size', 11 * scale); ghostIcon.textContent = lieu.icon;
      } else { ghostIcon.textContent = ''; }

      hexTip.style.color = style.tipColor;
      hexTip.innerHTML   = lieu
        ? `<span style="opacity:.7">${lieu.icon}</span> <strong>${lieu.label}</strong> <span style="opacity:.5;font-size:.8em">Q${q} R${r}</span>`
        : `Q${q}  R${r}`;
      hexTip.classList.add('hex-tip--show');
    });
    cell.addEventListener('mousemove', e => {
      let x = e.clientX + 14, y = e.clientY - 32;
      if (x + 120 > window.innerWidth) x = e.clientX - 130;
      hexTip.style.left = x + 'px'; hexTip.style.top = y + 'px';
    });
    cell.addEventListener('mouseleave', () => {
      const ghost     = document.getElementById('hex-ghost');
      const ghostIcon = document.getElementById('hex-ghost-icon');
      if (ghost)     ghost.removeAttribute('points');
      if (ghostIcon) ghostIcon.textContent = '';
      hexTip.classList.remove('hex-tip--show');
    });
  });
}

// ─── Popup Mise en Place ─────────────────────────────────────────────────────

let setupStep = 0;

function openSetupPopup(setup) {
  setupStep = 0;
  renderSetupStep(setup, 0);
  showOverlay('setupOverlay');
}

function setupNextStep() {
  setupStep++;
  renderSetupStep(state.setup, setupStep);
}

function renderSetupStep(setup, step) {
  if (!setup) return;
  const iles  = cfg.iles || [];
  const total = 2;

  document.getElementById('setupStepBadge').textContent        = `Étape ${step + 1} / ${total}`;
  document.getElementById('setupProgressBar').style.width      = `${((step + 1) / total) * 100}%`;

  ['setupSec1', 'setupSec2'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('setup-section--active', 'setup-section--done');
    if (i < step) el.classList.add('setup-section--done');
    else if (i === step) el.classList.add('setup-section--active');
    const numEl = el.querySelector('.step-num');
    if (numEl) numEl.textContent = i < step ? '✓' : (i + 1);
  });

  const btnNext  = document.getElementById('setupBtnNext');
  const btnClose = document.getElementById('setupBtnClose');
  if (step >= total - 1) {
    btnNext.classList.add('hidden'); btnClose.classList.remove('hidden');
  } else {
    btnNext.classList.remove('hidden'); btnClose.classList.add('hidden');
  }

  if (step === 0) {
    const grid   = document.getElementById('setupParchCards');
    const attrib = document.getElementById('setupParchAttrib');
    grid.innerHTML = ''; attrib.innerHTML = '';

    const assigned = (setup.ileOrder || []).map(id => ({ ileId: id, ...setup.parcheminsParIle[id] }));
    const counts   = {};
    assigned.forEach(a => { if (a.card) counts[a.card.type] = (counts[a.card.type] || 0) + 1; });

    [{ type: 'ile', label: `${counts.ile || 0} Parchemin(s) Île`, icon: '📜' },
     { type: 'vierge', label: `${counts.vierge || 0} Parchemin(s) Vierge`, icon: '📄' }].forEach((c, i) => {
      const chip = document.createElement('div');
      chip.className = `setup-card-chip setup-card-chip--${c.type}`;
      chip.innerHTML = `<span>${c.icon}</span><span>${c.label}</span>`;
      grid.appendChild(chip);
      setTimeout(() => chip.classList.add('setup-card-chip--show'), 80 * i);
    });

    assigned.forEach((a, i) => {
      const ile = iles.find(il => il.id === a.ileId);
      if (!ile || !a.card) return;
      const row = document.createElement('div');
      row.className = 'setup-attrib-row';
      const cls  = a.card.type === 'ile' ? 'attrib-ile-type' : 'attrib-vierge-type';
      const desc = a.card.type === 'ile'
        ? `📜 Parchemin Île <em style="opacity:.7">(${a.card.ile || '?'})</em>`
        : '📄 Parchemin Vierge';
      row.innerHTML = `<span class="attrib-ile">${ile.icon || '🏝'} ${ile.nom}</span><span style="color:#3a2a10">→</span><span class="${cls}">${desc}</span>`;
      attrib.appendChild(row);
      setTimeout(() => row.classList.add('setup-attrib-row--show'), 60 + 100 * i);
    });
  }

  if (step === 1) {
    const grid    = document.getElementById('setupEnigmeCards');
    grid.innerHTML = '';
    const defs = [
      { key: 'latitude',  icon: '↔', label: 'Latitude',  cls: 'lat',  val: e => `Q = ${e.valeur}` },
      { key: 'longitude', icon: '↕', label: 'Longitude', cls: 'lon',  val: e => `R = ${e.valeur}` },
      { key: 'code',      icon: '🔐', label: 'Code',      cls: 'code', val: e => `Δlat${e.delta_lat >= 0 ? '+' : ''}${e.delta_lat} / Δlon${e.delta_lon >= 0 ? '+' : ''}${e.delta_lon}` },
    ];
    defs.forEach((d, i) => {
      const card = setup.enigmes[d.key];
      if (!card) return;
      const chip = document.createElement('div');
      chip.className = `setup-card-chip setup-card-chip--${d.cls}`;
      chip.innerHTML = `<span>${d.icon}</span><span>${d.label}</span><span style="opacity:.5;font-size:.75rem;margin-left:4px">${d.val(card)}</span>`;
      grid.appendChild(chip);
      setTimeout(() => chip.classList.add('setup-card-chip--show'), 80 * i);
    });
  }
}

// ─── Overlays ────────────────────────────────────────────────────────────────

function showOverlay(id) {
  document.getElementById(id).classList.add('popup-overlay--show');
  document.getElementById(id).removeAttribute('aria-hidden');
}
function hideOverlay(id) {
  document.getElementById(id).classList.remove('popup-overlay--show');
  document.getElementById(id).setAttribute('aria-hidden', 'true');
}

// ─── Calibration ─────────────────────────────────────────────────────────────

function toggleCalib() {
  document.getElementById('calibInner').classList.toggle('calib-inner--open');
  document.getElementById('sidebar').classList.add('sidebar--open');
  document.getElementById('sidebarToggle').style.right = '260px';
  if (document.getElementById('calibInner').classList.contains('calib-inner--open'))
    updateCalibDisplay();
}

function updateCalibFromSliders() {
  calibState.HEX_R      = parseFloat(document.getElementById('sR').value);
  calibState.MARGIN_X   = parseFloat(document.getElementById('sMX').value);
  calibState.MARGIN_Y   = parseFloat(document.getElementById('sMY').value);
  calibState.COL_SP     = parseFloat(document.getElementById('sCS').value);
  calibState.ROW_SP     = parseFloat(document.getElementById('sRS').value);
  calibState.ROW_OFFSET = parseFloat(document.getElementById('sOF').value);
  setCalibParams(calibState);
  document.getElementById('vR').textContent  = calibState.HEX_R.toFixed(2);
  document.getElementById('vMX').textContent = calibState.MARGIN_X.toFixed(1);
  document.getElementById('vMY').textContent = calibState.MARGIN_Y.toFixed(1);
  document.getElementById('vCS').textContent = calibState.COL_SP.toFixed(2);
  document.getElementById('vRS').textContent = calibState.ROW_SP.toFixed(2);
  document.getElementById('vOF').textContent = calibState.ROW_OFFSET.toFixed(2);
  updateCalibDisplay();
  renderMap();
}

function updateCalibDisplay() {
  document.getElementById('calibCode').textContent =
`HEX_R    = ${calibState.HEX_R.toFixed(3)}\nMARGIN_X = ${calibState.MARGIN_X.toFixed(1)}\nMARGIN_Y = ${calibState.MARGIN_Y.toFixed(1)}\nCOL_SP   = ${calibState.COL_SP.toFixed(3)}\nROW_SP   = ${calibState.ROW_SP.toFixed(3)}\nOFFSET   = ${calibState.ROW_OFFSET.toFixed(3)}`;
}

function copyCalib() {
  const c = calibState;
  const txt = `const HEX_R=${c.HEX_R.toFixed(3)};\nconst MARGIN_X=${c.MARGIN_X.toFixed(1)};\nconst MARGIN_Y=${c.MARGIN_Y.toFixed(1)};\nconst COL_SP=${c.COL_SP.toFixed(3)};\nconst ROW_SP=${c.ROW_SP.toFixed(3)};\nconst ROW_OFFSET=${c.ROW_OFFSET.toFixed(3)};`;
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById('btnCalibCopy');
    btn.textContent = '✓ Copié !';
    setTimeout(() => btn.textContent = '📋 Copier les constantes', 1500);
  });
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

function bindTooltips() {
  const tip = document.getElementById('tooltip');
  document.querySelectorAll('[data-tip]:not([data-tip-bound])').forEach(el => {
    el.dataset.tipBound = '1';
    el.addEventListener('mouseenter', () => {
      const [t, d] = el.dataset.tip.split('|');
      tip.innerHTML = `<span class="tooltip__title">${t}</span>${d || ''}`;
      tip.classList.add('tooltip--show');
    });
    el.addEventListener('mousemove', e => {
      let x = e.clientX + 12, y = e.clientY - 8;
      if (x + 220 > window.innerWidth) x = e.clientX - 225;
      if (y + 70 > window.innerHeight) y = e.clientY - 65;
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    el.addEventListener('mouseleave', () => tip.classList.remove('tooltip--show'));
  });
}

// ─── Listeners ───────────────────────────────────────────────────────────────

function initListeners() {
  document.getElementById('btnStart').addEventListener('click', () => socket.emit('master:start'));
  document.getElementById('btnReset').addEventListener('click', () => { if (confirm('Réinitialiser la partie ?')) socket.emit('master:reset'); });
  document.getElementById('btnCalib').addEventListener('click', toggleCalib);
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb  = document.getElementById('sidebar');
    const btn = document.getElementById('sidebarToggle');
    sb.classList.toggle('sidebar--open');
    btn.style.right = sb.classList.contains('sidebar--open') ? '260px' : '0';
  });

  document.getElementById('btnParchClose').addEventListener('click', () => hideOverlay('parchPopupOverlay'));
  document.getElementById('parchPopupOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) hideOverlay('parchPopupOverlay'); });
  document.getElementById('setupBtnNext').addEventListener('click',  setupNextStep);
  document.getElementById('setupBtnClose').addEventListener('click', () => hideOverlay('setupOverlay'));
  document.getElementById('btnCalibCopy').addEventListener('click',  copyCalib);

  for (const id of ['sR','sMX','sMY','sCS','sRS','sOF'])
    document.getElementById(id).addEventListener('input', updateCalibFromSliders);

  const mapImg = document.getElementById('mapImg');
  mapImg.addEventListener('load', () => renderMap());
  window.addEventListener('resize', () => renderMap());
  if (mapImg.complete && mapImg.naturalWidth > 0) renderMap();
}

// Exposer pour onclick inline dans SVG de la popup parchemin
window.openParchPopup = openParchPopup;

// ─── Bootstrap ────────────────────────────────────────────────────────────────

initSocket();
loadConfig();
initListeners();
bindTooltips();
updateCalibDisplay();
