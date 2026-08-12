// Referências ao Canvas principal e de buffer offline
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const wrap = document.getElementById('canvasWrap');

const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');
const maskCanvas = document.createElement('canvas');
const maskCtx = maskCanvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let cssWidth = 0, cssHeight = 0;
let layout = { offsetX: 0, offsetY: 0, mapW: 0, mapH: 0 };
let delaunay, voronoi;

// Estado do Jogo
let state = { territories: [] };
let moves = [];
let hitParticles = [];
let selected = null;
let dragPos = null;
let running = false;
let lastGrowth = 0;

// Configuração de Velocidade e Tempo das Tropas
const TROOP_SPEED = 60;
const MIN_DURATION = 1.2;
const MAX_DURATION = 8.0;

// Redimensiona o Canvas e reconstrói as superfícies de desenho
function resize() {
  dpr = window.devicePixelRatio || 1;
  cssWidth = wrap.clientWidth;
  cssHeight = wrap.clientHeight;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';

  offCanvas.width = canvas.width;
  offCanvas.height = canvas.height;
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;

  if (typeof CURRENT_MAP !== 'undefined') {
    computeLayout();
    buildVoronoi();
    buildMask();
  }
}
window.addEventListener('resize', resize);

function computeLayout() {
  const padTop = 15, padBottom = 15;
  const availH = Math.max(200, cssHeight - padTop - padBottom);
  const availW = cssWidth - 20;
  const MAP_ASPECT = CURRENT_MAP.aspectRatio || 1.25;
  let mapH = availH, mapW = mapH * MAP_ASPECT;
  if (mapW > availW) { mapW = availW; mapH = mapW / MAP_ASPECT; }
  layout = { mapW, mapH, offsetX: (cssWidth - mapW) / 2, offsetY: padTop };
}

function toCanvas(nx, ny) { 
  return { x: layout.offsetX + nx * layout.mapW, y: layout.offsetY + ny * layout.mapH }; 
}

function buildMask() {
  maskCtx.save();
  maskCtx.scale(dpr, dpr);
  maskCtx.clearRect(0, 0, cssWidth, cssHeight);
  maskCtx.fillStyle = '#fff';
  CURRENT_MAP.coastlines.forEach(coastline => {
    const pts = coastline.map(([nx, ny]) => toCanvas(nx, ny));
    maskCtx.beginPath();
    pts.forEach((p, i) => i === 0 ? maskCtx.moveTo(p.x, p.y) : maskCtx.lineTo(p.x, p.y));
    maskCtx.closePath();
    maskCtx.fill();
  });
  maskCtx.restore();
}

function buildVoronoi() {
  const pts = CURRENT_MAP.countryDefs.map(c => { const p = toCanvas(c.nx, c.ny); return [p.x, p.y]; });
  delaunay = d3.Delaunay.from(pts);
  const pad = 40;
  voronoi = delaunay.voronoi([layout.offsetX - pad, layout.offsetY - pad, layout.offsetX + layout.mapW + pad, layout.offsetY + layout.mapH + pad]);
}

function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Inicializa a Partida
function initGame() {
  resize();
  const points = CURRENT_MAP.countryDefs.map(c => toCanvas(c.nx, c.ny));
  
  const territories = CURRENT_MAP.countryDefs.map((c, i) => new Territory(i, c.code, points[i].x, points[i].y));

  state = { territories };

  const startIdx = CURRENT_MAP.startTerritoryIndex || 0;
  territories[startIdx].owner = 1;
  territories[startIdx].troops = 37;

  moves = []; 
  hitParticles = []; 
  selected = null; 
  dragPos = null; 
  running = true; 
  lastGrowth = 0;

  document.getElementById('overlay').style.display = 'none';
  updateScores();

  if (typeof isHost !== 'undefined' && isHost) {
    transmitirEstadoGame();
  }
}

// Sincronização P2P: Envia dados do mapa para todos
function transmitirEstadoGame() {
  if (typeof isHost === 'undefined' || !isHost || !state || typeof transmitirParaTodos !== 'function') return;

  const dadosSync = {
    tipo: 'SYNC_STATE',
    territories: state.territories.map(t => ({
      id: t.id,
      owner: t.owner,
      troops: t.troops
    }))
  };

  transmitirParaTodos(dadosSync);
}

function updateScores() {
  if (!state || !state.territories) return;
  const count = state.territories.filter(t => t.owner === 1).length;
  const total = state.territories.length;
  const bar = document.getElementById('bar');
  if (!bar) return;
  
  bar.innerHTML = '';
  
  const pSeg = document.createElement('div');
  pSeg.style.width = (count / total * 100) + '%';
  pSeg.style.background = CURRENT_MAP.colors[1];
  bar.appendChild(pSeg);

  const nSeg = document.createElement('div');
  nSeg.style.width = ((total - count) / total * 100) + '%';
  nSeg.style.background = CURRENT_MAP.colors[0];
  bar.appendChild(nSeg);

  if (running && count === total) endGame(true);
  else if (running && count === 0) endGame(false);
}

function endGame(won) {
  running = false;
  document.getElementById('overlay').style.display = 'flex';
  document.getElementById('overlayTitle').textContent = won ? 'Mapa Dominado!' : 'Derrota!';
  document.getElementById('overlaySub').textContent = won ? 'Você dominou todos os territórios.' : 'Você perdeu seus territórios.';
}

// Lógica de Envio de Tropas
function sendTroops(fromId, toId) {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  const totalToSend = Math.floor(from.troops);
  if (totalToSend < 1) return;

  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const fixedDuration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, dist / TROOP_SPEED));

  let remaining = totalToSend;
  let waveIndex = 0;

  while (remaining > 0) {
    const ballsInWave = Math.min(5, remaining);
    
    for (let b = 0; b < ballsInWave; b++) {
      const offsetFactor = (ballsInWave === 1) ? 0 : (b - (ballsInWave - 1) / 2) * 9;
      
      moves.push({
        fromId,
        toId,
        owner: from.owner,
        troops: 1,
        progress: 0,
        delay: waveIndex * 0.5,
        duration: fixedDuration,
        maxOffset: offsetFactor,
        isFirstInWave: (b === 0),
        waveAmount: ballsInWave
      });
      remaining -= 1;
    }
    waveIndex++;
  }
}

function resolveArrival(m) {
  const t = state.territories[m.toId];
  t.impactAnim = 1.0;

  const color = CURRENT_MAP.colors[m.owner];
  for (let i = 0; i < 5; i++) {
    hitParticles.push(new Particle(t.x, t.y, color));
  }

  if (t.owner === m.owner) {
    t.troops += m.troops;
  } else {
    t.troops -= m.troops;
    if (t.troops < 0) {
      t.owner = m.owner;
      t.troops = Math.abs(t.troops);
      t.pulseAnim = 1.0;
    }
  }
  updateScores();

  if (typeof isHost !== 'undefined' && isHost) {
    transmitirEstadoGame();
  }
}

function growthTick() {
  for (const t of state.territories) {
    if (t.owner === 1) t.troops += 1;
  }
  if (typeof isHost !== 'undefined' && isHost) {
    transmitirEstadoGame();
  }
}

function territoryAt(x, y) {
  if (!state || !state.territories) return null;
  for (const t of state.territories) {
    const poly = voronoi.cellPolygon(t.id);
    if (poly && pointInPoly({ x, y }, poly)) return t;
  }
  return null;
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const src = e.touches && e.touches.length ? e.touches[0] : (e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e);
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

// Eventos de Entrada / Toque do Jogador
function onDown(e) {
  if (!running) return;
  const p = getPos(e);
  const t = territoryAt(p.x, p.y);
  if (t && t.owner === 1 && t.troops > 0) { 
    selected = t; 
    dragPos = p; 
    e.preventDefault(); 
  }
}

function onMove(e) { 
  if (selected) { 
    dragPos = getPos(e); 
    e.preventDefault(); 
  } 
}

function onUp(e) {
  if (!selected) return;
  const p = getPos(e);
  const t = territoryAt(p.x, p.y);

  if (t && t.id !== selected.id) {
    if (typeof isHost === 'undefined' || isHost) {
      // Se for Host ou jogo Local, executa diretamente
      sendTroops(selected.id, t.id);
    } else if (typeof conexaoHost !== 'undefined' && conexaoHost && conexaoHost.open) {
      // Se for Cliente, solicita a ao Host
      conexaoHost.send({
        tipo: 'ENVIAR_TROPAS',
        fromId: selected.id,
        toId: t.id
      });
    }
  }
  selected = null; 
  dragPos = null;
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', onDown, { passive: false });
canvas.addEventListener('touchmove', onMove, { passive: false });
canvas.addEventListener('touchend', onUp, { passive: false });

const restartBtn = document.getElementById('restartBtn');
if (restartBtn) restartBtn.addEventListener('click', initGame);

const overlayBtn = document.getElementById('overlayBtn');
if (overlayBtn) overlayBtn.addEventListener('click', initGame);

// Loop Principal de Atualizao e Renderizao (60 FPS)
let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (running) {
    // Apenas o Host faz o tick de ganho automático
    if (typeof isHost === 'undefined' || isHost) {
      lastGrowth += dt;
      if (lastGrowth > 1.5) { 
        growthTick(); 
        lastGrowth = 0; 
      }
    }

    for (const t of state.territories) {
      if (t.pulseAnim > 0) {
        t.pulseAnim -= dt * 2.5;
        if (t.pulseAnim < 0) t.pulseAnim = 0;
      }
      if (t.impactAnim > 0) {
        t.impactAnim -= dt * 5.0;
        if (t.impactAnim < 0) t.impactAnim = 0;
      }
    }

    for (let i = hitParticles.length - 1; i >= 0; i--) {
      const p = hitParticles[i];
      p.update(dt);
      if (p.life <= 0) hitParticles.splice(i, 1);
    }

    for (let i = moves.length - 1; i >= 0; i--) {
      const m = moves[i];
      if (m.delay > 0) {
        m.delay -= dt;
        continue;
      }

      if (m.isFirstInWave) {
        const fromT = state.territories[m.fromId];
        fromT.troops = Math.max(0, fromT.troops - m.waveAmount);
        m.isFirstInWave = false;
      }

      m.progress += dt / m.duration;
      if (m.progress >= 1) {
        resolveArrival(m);
        moves.splice(i, 1);
      }
    }
  }

  render();
  requestAnimationFrame(loop);
}

// Renderiza a Interface e o Mapa no Canvas
function render() {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (!state || !state.territories || state.territories.length === 0) {
    ctx.restore();
    return;
  }

  offCtx.save();
  offCtx.scale(dpr, dpr);
  offCtx.clearRect(0, 0, cssWidth, cssHeight);

  // Desenha Células de Voronoi dos Territórios
  for (const t of state.territories) {
    const poly = voronoi.cellPolygon(t.id);
    if (!poly) continue;
    offCtx.beginPath();
    poly.forEach((p, i) => i === 0 ? offCtx.moveTo(p[0], p[1]) : offCtx.lineTo(p[0], p[1]));
    offCtx.closePath();
    
    offCtx.fillStyle = CURRENT_MAP.colors[t.owner];
    offCtx.fill();
    
    offCtx.strokeStyle = '#0f172a';
    offCtx.lineWidth = 2.5;
    offCtx.stroke();

    if (selected && selected.id === t.id) {
      offCtx.strokeStyle = '#ffffff';
      offCtx.lineWidth = 3.5;
      offCtx.stroke();
    }
  }

  // Aplica a Máscara das Massas de Terra (Continentes)
  offCtx.globalCompositeOperation = 'destination-in';
  offCtx.drawImage(maskCanvas, 0, 0, cssWidth, cssHeight);
  offCtx.globalCompositeOperation = 'source-over';
  offCtx.restore();

  ctx.drawImage(offCanvas, 0, 0, cssWidth, cssHeight);

  // Linha Guia de Mira ao Arrastar
  if (selected && dragPos) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(selected.x, selected.y);
    ctx.lineTo(dragPos.x, dragPos.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Desenha as Tropas em Trânsito (Bolinhas)
  for (const m of moves) {
    if (m.delay > 0) continue;

    const from = state.territories[m.fromId], to = state.territories[m.toId];
    
    const baseX = from.x + (to.x - from.x) * m.progress;
    const baseY = from.y + (to.y - from.y) * m.progress;

    let spreadFactor = 0;
    if (m.progress < 0.25) spreadFactor = m.progress / 0.25;
    else if (m.progress <= 0.65) spreadFactor = 1.0;
    else spreadFactor = (1.0 - m.progress) / 0.35;

    const currentOffset = m.maxOffset * Math.max(0, spreadFactor);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const finalX = baseX + nx * currentOffset;
    const finalY = baseY + ny * currentOffset;

    ctx.beginPath();
    ctx.arc(finalX, finalY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a8a';
    ctx.fill();
  }

  // Partículas de Impacto
  for (const p of hitParticles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Circulos dos Territórios e Valores de Tropas
  for (const t of state.territories) {
    if (t.pulseAnim > 0) {
      const waveRadius = 17 + (1 - t.pulseAnim) * 28;
      ctx.beginPath();
      ctx.arc(t.x, t.y, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = CURRENT_MAP.colors[t.owner];
      ctx.lineWidth = 3 * t.pulseAnim;
      ctx.globalAlpha = t.pulseAnim;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    const impactScale = t.impactAnim > 0 ? Math.sin(t.impactAnim * Math.PI) * 4 : 0;
    const conquestScale = t.pulseAnim > 0 ? Math.sin(t.pulseAnim * Math.PI) * 6 : 0;
    const radius = 17 + impactScale + conquestScale;

    ctx.beginPath();
    ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = t.owner === 1 ? '#2563eb' : '#64748b';
    ctx.lineWidth = 2 + (t.impactAnim * 2) + (t.pulseAnim * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(t.troops), t.x, t.y);
  }

  ctx.restore();
}

// Inicia o Loop principal do Canvas
requestAnimationFrame(loop);
