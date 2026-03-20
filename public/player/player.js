// ═══════════════════════════════════════════════════════════════════════════════
// player/player.js — Logique de l'interface joueur
// ═══════════════════════════════════════════════════════════════════════════════

import { hexCenter, hexPoints, setCalibParams, IMG_W, IMG_H, GRID_ROWS, colsForRow } from '/shared/hex.js';

// ─── État local ───────────────────────────────────────────────────────────────

let socket;
let myId       = null;
let myName     = '';
let joined     = false;
let gameState  = {};
let myColor    = '#b8860b';

// ─── Constantes de calibration (modifiables via le tiroir) ───────────────────

let calibState = {
  HEX_R: 24.1, MARGIN_X: 48.5, MARGIN_Y: 42.5,
  COL_SP: 48.5, ROW_SP: 41.3, ROW_OFFSET: 24.3,
};

// ─── Init Socket ──────────────────────────────────────────────────────────────

function initSocket() {
  socket = io();
  myId   = socket.id;

  socket.on('connect', () => {
    myId = socket.id;
    setConnStatus(true);
    if (joined) socket.emit('player:join', { name: myName });
  });

  socket.on('disconnect', () => setConnStatus(false));

  socket.on('game:state', (state) => {
    gameState = state;
    myId      = state.myId || socket.id;
    if (state.players?.[myId]) {
      myColor = state.players[myId].color || '#b8860b';
      document.getElementById('myColorDot').style.background = myColor;
    }
    renderGame(state);
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────

function joinGame() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) { document.getElementById('nameInput').focus(); return; }
  myName  = name;
  joined  = true;
  socket.emit('player:join', { name });
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  document.getElementById('headerName').textContent = name;
}

function setConnStatus(on) {
  const dot = document.getElementById('connDot');
  const lbl = document.getElementById('connStatus');
  dot.className = on ? 'conn-dot conn-dot--on' : 'conn-dot conn-dot--off';
  lbl.innerHTML = on
    ? '<span class="conn-dot conn-dot--on"></span>Connecté'
    : '<span class="conn-dot conn-dot--off"></span>Déconnecté';
}

// ─── Rendu principal ──────────────────────────────────────────────────────────

function renderGame(state) {
  const isMyTurn       = state.isMyTurn;
  const status         = state.status;
  const isPickingPhase = status === 'picking';
  const isMyPickTurn   = isPickingPhase && isMyTurn;
  const rolled         = state.diceRoll?.playerId === myId;
  const moved          = state.players?.[myId]?.hasMoved;

  renderBadge(state, isMyPickTurn, isPickingPhase, isMyTurn);
  renderStatusCard(state, isMyTurn, isMyPickTurn, isPickingPhase, rolled, moved);
  renderDiceSection(state, isMyTurn, status, rolled, moved);
  renderMap(state, isMyTurn, status, rolled, moved, isMyPickTurn);
  renderEndTurnBtn(isMyTurn, status);
  renderPlayersList(state);
  renderLog(state);
  renderShipDashboard(state.players?.[myId]?.ship || defaultShip());
  renderResources(state.players?.[myId]?.resources);
}

function renderBadge(state, isMyPickTurn, isPickingPhase, isMyTurn) {
  const badge = document.getElementById('turnBadge');
  badge.className = 'badge';
  if (state.status === 'waiting') {
    badge.textContent = 'En attente'; badge.classList.add('badge--other');
  } else if (isMyPickTurn) {
    badge.textContent = 'Choisis !'; badge.classList.add('badge--picking-active');
  } else if (isPickingPhase) {
    badge.textContent = 'Attends…'; badge.classList.add('badge--other');
  } else if (isMyTurn) {
    badge.textContent = 'Ton tour !'; badge.classList.add('badge--my-turn');
  } else {
    badge.textContent = 'Tour adverse'; badge.classList.add('badge--other');
  }
}

function renderStatusCard(state, isMyTurn, isMyPickTurn, isPickingPhase, rolled, moved) {
  const card = document.getElementById('statusCard');
  const icon = document.getElementById('bigIcon');
  const text = document.getElementById('bigText');
  const sub  = document.getElementById('subText');
  card.className = 'status-card';

  if (state.status === 'waiting') {
    card.classList.add('status-card--other'); icon.textContent = '⏳';
    text.textContent = 'En attente du début…'; sub.textContent = 'Le maître de jeu démarre bientôt.';
  } else if (isMyPickTurn) {
    card.classList.add('status-card--picking'); icon.textContent = '🗺';
    text.textContent = 'Choisis ta case de départ'; sub.textContent = 'Appuie sur une case en surbrillance.';
  } else if (isPickingPhase) {
    const cur = state.players?.[state.currentTurn]?.name || '?';
    card.classList.add('status-card--other'); icon.textContent = '👁';
    text.textContent = `${cur} choisit sa position`; sub.textContent = 'Patiente…';
  } else if (isMyTurn) {
    card.classList.add('status-card--my-turn');
    const myPos = state.players?.[myId]?.position;
    if (!myPos) { icon.textContent = '⚠'; text.textContent = 'Position inconnue'; sub.textContent = ''; }
    else if (!rolled && !moved) { icon.textContent = '⚔'; text.textContent = "C'est ton tour !"; sub.textContent = 'Lance le dé pour commencer.'; }
    else if (rolled && !moved)  { icon.textContent = '🎯'; text.textContent = `Déplace-toi (${state.diceRoll.value} cases)`; sub.textContent = 'Appuie sur une case sur la carte.'; }
    else { icon.textContent = '✅'; text.textContent = 'Déplacement effectué !'; sub.textContent = 'Tu peux maintenant terminer ton tour.'; }
  } else {
    const cur = state.players?.[state.currentTurn]?.name || '?';
    card.classList.add('status-card--other'); icon.textContent = '👁';
    text.textContent = `Tour de ${cur}`; sub.textContent = 'Patiente…';
  }
}

function renderDiceSection(state, isMyTurn, status, rolled, moved) {
  const section = document.getElementById('diceSection');
  const face    = document.getElementById('diceFace');
  const btnRoll = document.getElementById('btnRoll');
  const hint    = document.getElementById('diceInstruction');
  const showDice = isMyTurn && status === 'playing' && !moved;

  section.classList.toggle('hidden', !showDice);
  if (!showDice) return;

  if (rolled && !moved) {
    face.textContent     = ['⚀','⚁','⚂','⚃','⚄','⚅'][state.diceRoll.value - 1] || state.diceRoll.value;
    btnRoll.disabled     = true;
    hint.classList.remove('hidden');
    document.getElementById('diceValue').textContent = state.diceRoll.value;
  } else {
    face.textContent = '?';
    btnRoll.disabled = false;
    hint.classList.add('hidden');
  }
}

function renderEndTurnBtn(isMyTurn, status) {
  document.getElementById('btnEndTurn').disabled = !(isMyTurn && status === 'playing');
}

function renderPlayersList(state) {
  const container = document.getElementById('playersList');
  const players   = Object.entries(state.players || {});
  if (!players.length) {
    container.innerHTML = '<div style="color:#6a5a3a;font-style:italic;font-size:.82rem">Aucun autre joueur.</div>';
    return;
  }
  container.innerHTML = players.map(([id, p]) => {
    const isActive = state.currentTurn === id;
    const pos      = p.position ? `${p.position.q},${p.position.r}` : '–';
    return `<div class="player-row ${isActive ? 'player-row--active' : ''}">
      <div class="player-row__dot" style="background:${p.color}"></div>
      <span>${p.name}${id === myId ? ' <span style="font-size:.62rem;color:var(--gold)">(vous)</span>' : ''}</span>
      <span class="player-row__pos">${pos}</span>
    </div>`;
  }).join('');
}

function renderLog(state) {
  document.getElementById('logList').innerHTML =
    (state.log?.length ? state.log : ['Aucun événement.'])
      .map(e => `<li>${e}</li>`).join('');
}

// ─── Minimap ──────────────────────────────────────────────────────────────────

function renderMap(state, isMyTurn, status, rolled, moved, isMyPickTurn) {
  const showMap = (isMyPickTurn && state.pendingStartSlots?.length > 0)
               || (isMyTurn && status === 'playing' && rolled && !moved);
  const section = document.getElementById('mapSection');
  section.classList.toggle('hidden', !showMap);
  if (showMap) renderMiniMap(state, isMyPickTurn);
}

function renderMiniMap(state, isPickPhase) {
  const img      = document.getElementById('miniMap');
  const svg      = document.getElementById('miniSvg');
  const viewport = document.getElementById('mapViewport');
  const label    = document.getElementById('zoomLabel');
  const baseScale = img.clientWidth / IMG_W;
  const imgH      = IMG_H * baseScale;

  let zoom = 1, panX = 0, panY = 0;
  const VIEWPORT_H = 240;
  const hexes = isPickPhase ? (state.pendingStartSlots || []) : (state.moveOptions || []);

  if (!isPickPhase && hexes.length > 0) {
    const myPos    = state.players?.[myId]?.position;
    const allHexes = myPos ? [myPos, ...hexes] : hexes;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const R = calibState.HEX_R;
    for (const { q, r } of allHexes) {
      const { x, y } = hexCenter(q, r, 1);
      minX = Math.min(minX, x - R); minY = Math.min(minY, y - R);
      maxX = Math.max(maxX, x + R); maxY = Math.max(maxY, y + R);
    }
    const PAD = R * 2.5;
    minX = Math.max(0, minX - PAD); minY = Math.max(0, minY - PAD);
    maxX = Math.min(IMG_W, maxX + PAD); maxY = Math.min(IMG_H, maxY + PAD);
    const regionW = maxX - minX, regionH = maxY - minY;
    const cW = img.clientWidth;
    const zoomX = cW / (regionW * baseScale);
    const zoomY = VIEWPORT_H / (regionH * baseScale);
    zoom = Math.min(zoomX, zoomY, 3.5);
    panX = -minX * baseScale * zoom;
    panY = -minY * baseScale * zoom;
    viewport.style.height = VIEWPORT_H + 'px';
    label.classList.add('map-section__zoom-label--visible');
  } else {
    viewport.style.height = 'auto';
    label.classList.remove('map-section__zoom-label--visible');
  }

  img.style.transform       = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  img.style.transformOrigin = '0 0';
  img.style.width           = img.clientWidth + 'px';
  img.style.height          = imgH + 'px';

  const svgW = img.clientWidth, svgH = imgH;
  svg.setAttribute('width',  svgW); svg.setAttribute('height', svgH);
  svg.style.width           = svgW + 'px'; svg.style.height = svgH + 'px';
  svg.style.transform       = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  svg.style.transformOrigin = '0 0';

  const s = baseScale;
  let html = '';

  // Grille
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let q = 0; q < colsForRow(r); q++) {
      const { x, y } = hexCenter(q, r, s);
      html += `<polygon points="${hexPoints(x, y, s)}" fill="transparent" stroke="rgba(184,134,11,0.10)" stroke-width="${s}"/>`;
    }
  }

  // Obstacles
  for (const obs of (state.obstacles || [])) {
    const { x, y } = hexCenter(obs.q, obs.r, s);
    const fill   = obs.type === 'ile'     ? 'rgba(30,100,30,0.45)'
                 : obs.type === 'port'    ? 'rgba(20,60,130,0.45)'
                 : obs.type === 'repaire' ? 'rgba(120,20,20,0.45)'
                 : obs.type === 'epave'   ? 'rgba(90,70,20,0.45)'
                 :                          'rgba(60,60,60,0.35)';
    const stroke = obs.type === 'ile'     ? '#5aad52'
                 : obs.type === 'port'    ? '#4ac8ff'
                 : obs.type === 'repaire' ? '#c04040'
                 : obs.type === 'epave'   ? '#c8a840'
                 :                          '#888';
    html += `<polygon points="${hexPoints(x, y, s)}" fill="${fill}" stroke="${stroke}" stroke-width="${1.5 * s}" style="pointer-events:none"/>`;
    html += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${9 * s}" style="pointer-events:none">${obs.icon || ''}</text>`;
  }

  // Cases cliquables
  if (isPickPhase) {
    for (const { q, r } of (state.pendingStartSlots || [])) {
      const { x, y } = hexCenter(q, r, s);
      html += `<g class="hex-clickable" onclick="window._pickStart(${q},${r})">
        <polygon points="${hexPoints(x, y, s)}" fill="rgba(74,238,204,0.3)" stroke="#4aedcc" stroke-width="${2 * s}"/>
      </g>`;
    }
  } else {
  // Construire index obstacles depuis state.obstacles
  const obsIndex = new Map();
  for (const obs of (state.obstacles || [])) obsIndex.set(`${obs.q},${obs.r}`, obs);

  const LIEU_STYLES = {
    ile:     { fill: 'rgba(30,100,30,0.45)',  stroke: '#5aad52' },
    port:    { fill: 'rgba(20,60,130,0.45)',  stroke: '#4ac8ff' },
    repaire: { fill: 'rgba(120,20,20,0.45)',  stroke: '#c04040' },
    epave:   { fill: 'rgba(90,70,20,0.45)',   stroke: '#c8a840' },
    default: { fill: 'rgba(255,200,50,0.30)', stroke: '#ffc832' },
  };

  html += `<rect x="0" y="0" width="${svgW}" height="${svgH}" fill="rgba(0,0,0,0.35)"/>`;
  for (const { q, r } of (state.moveOptions || [])) {
    const { x, y } = hexCenter(q, r, s);
    const obs   = obsIndex.get(`${q},${r}`);
    const style = obs ? (LIEU_STYLES[obs.type] || LIEU_STYLES.default) : LIEU_STYLES.default;
    html += `<g class="hex-clickable" onclick="window._moveHere(${q},${r})">
      <polygon points="${hexPoints(x, y, s)}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${2 * s}"/>
      ${obs ? `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${9 * s}" style="pointer-events:none">${obs.icon}</text>` : ''}
    </g>`;
  }
}

  // Joueurs
  for (const [id, p] of Object.entries(state.players || {})) {
    if (!p.position) continue;
    const { x, y } = hexCenter(p.position.q, p.position.r, s);
    const isMe = id === myId;
    const radius = (isMe ? 9 : 7) * s;
    if (isMe) html += `<circle cx="${x}" cy="${y}" r="${radius + 3 * s}" fill="none" stroke="${p.color}" stroke-width="${1.5 * s}" opacity="0.7"/>`;
    html += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${p.color}" stroke="#1a1209" stroke-width="${s}"/>`;
    html += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#1a1209" font-family="Cinzel Decorative" font-size="${7 * s}" font-weight="bold">${p.name[0].toUpperCase()}</text>`;
  }

  svg.innerHTML = html;
}

// Exposer les callbacks SVG onclick (pas d'autre moyen avec SVG inline)
window._pickStart = (q, r) => socket.emit('player:pickStart', { q, r });
window._moveHere  = (q, r) => socket.emit('player:move',      { q, r });

// ─── Dashboard navire ─────────────────────────────────────────────────────────

const STAT_DESCS = {
  hull:    ['Résistance de base',  'Coque renforcée (+2 PV)', 'Blindage de fer (+5 PV)'],
  sails:   ['Déplacement +1',     'Voiles de soie (+2)',      'Grand-voile (+3)'],
  cannons: ['Portée de tir : 1',  'Portée de tir : 2',        'Artillerie lourde : 3'],
  crew:    ['5 matelots',         '10 matelots aguerris',     'Élite de 15 corsaires'],
};

function defaultShip() {
  return { hull: { level: 1 }, sails: { level: 1 }, cannons: { level: 1 }, crew: { level: 1 } };
}

function renderShipDashboard(stats) {
  for (const key of ['hull', 'sails', 'cannons', 'crew']) {
    const lvl = stats[key]?.level ?? 1;
    const badge = document.getElementById(`${key}LvlBadge`);
    const desc  = document.getElementById(`${key}Desc`);
    if (badge) badge.textContent = `Niv. ${lvl}`;
    if (desc)  desc.textContent  = STAT_DESCS[key][lvl - 1] || '';
    for (let i = 0; i < 3; i++) {
      const pip = document.querySelector(`[data-stat="${key}"][data-idx="${i}"]`);
      if (pip) pip.classList.toggle('pip--filled', i < lvl);
    }
  }
}

function renderResources(res) {
  document.getElementById('resDoublons').textContent   = res?.doublons   ?? 0;
  document.getElementById('resReputation').textContent = res?.reputation ?? 0;
  document.getElementById('resResearch').textContent   = res?.research   ?? 0;
}

// ─── Calibration ──────────────────────────────────────────────────────────────

function toggleCalib() {
  document.getElementById('calibDrawer').classList.toggle('calib-drawer--open');
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
  if (!document.getElementById('mapSection').classList.contains('hidden')) {
    const isPickPhase = gameState.status === 'picking' && gameState.isMyTurn;
    renderMiniMap(gameState, isPickPhase);
  }
}

function updateCalibDisplay() {
  document.getElementById('calibCode').textContent =
`HEX_R      = ${calibState.HEX_R.toFixed(3)}
MARGIN_X   = ${calibState.MARGIN_X.toFixed(1)}
MARGIN_Y   = ${calibState.MARGIN_Y.toFixed(1)}
COL_SP     = ${calibState.COL_SP.toFixed(3)}
ROW_SP     = ${calibState.ROW_SP.toFixed(3)}
ROW_OFFSET = ${calibState.ROW_OFFSET.toFixed(3)}`;
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

// ─── Listeners ────────────────────────────────────────────────────────────────

function initListeners() {
  document.getElementById('btnJoin').addEventListener('click', joinGame);
  document.getElementById('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinGame(); });

  document.getElementById('btnRoll').addEventListener('click', () => {
    const face = document.getElementById('diceFace');
    face.classList.add('dice-face--rolling');
    setTimeout(() => face.classList.remove('dice-face--rolling'), 500);
    socket.emit('player:rollDice');
  });

  document.getElementById('btnEndTurn').addEventListener('click', () => socket.emit('player:endTurn'));

  document.getElementById('btnCalib').addEventListener('click',     toggleCalib);
  document.getElementById('btnCalibClose').addEventListener('click', toggleCalib);
  document.getElementById('btnCalibCopy').addEventListener('click',  copyCalib);

  for (const id of ['sR','sMX','sMY','sCS','sRS','sOF']) {
    document.getElementById(id).addEventListener('input', updateCalibFromSliders);
  }

  document.getElementById('miniMap').addEventListener('load', () => {
    if (gameState.status) renderGame(gameState);
  });

  window.addEventListener('resize', () => {
    if (gameState.status) renderGame(gameState);
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

initSocket();
initListeners();
setCalibParams(calibState);
renderShipDashboard(defaultShip());
renderResources({});
updateCalibDisplay();
