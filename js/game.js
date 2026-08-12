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
let netAccum = 0;
let hostEvents = [];

// Configuração de Velocidade das Tropas
const TROOP_SPEED = 60;
const MIN_DURATION = 1.2;
const MAX_DURATION = 8.0;

// Intervalo de sincronização de rede (host -> clientes), em segundos
const NET_SYNC_INTERVAL = 0.12;

// Bônus de produção do território principal (capital)
const CAPITAL_GROWTH_MULTIPLIER = 1.5;

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

// padTop maior que padBottom: sobra espaço reservado em cima do mapa
// para a coroa da capital nunca ser desenhada cortada/fora da tela.
const ICON_TOP_MARGIN = 30;

function computeLayout() {
  const padTop = ICON_TOP_MARGIN, padBottom = 10;
  const availH = Math.max(200, cssHeight - padTop - padBottom);
  const availW = cssWidth - 20;
  const MAP_ASPECT = CURRENT_MAP.aspectRatio || 1.25;
  let mapH = availH, mapW = mapH * MAP_ASPECT;
  if (mapW > availW) { mapW = availW; mapH = mapW / MAP_ASPECT; }
  layout = {
    mapW, mapH,
    offsetX: (cssWidth - mapW) / 2,
    // Mapa centralizado verticalmente no espaço disponível (não gruda no topo).
    offsetY: padTop + (availH - mapH) / 2
  };
}

function toCanvas(nx, ny) {
  return { x: layout.offsetX + nx * layout.mapW, y: layout.offsetY + ny * layout.mapH };
}

// ==========================================
// ÍCONE DE CAPITAL (Lucide "crown")
// ==========================================
// Antes usávamos o emoji 👑 (fonte do sistema, tamanho inconsistente e
// podia "vazar" para fora do mapa perto das bordas). Agora desenhamos o
// ícone "crown" do Lucide Icons diretamente no canvas via Path2D, do
// mesmo jeito que o resto do site já usa os ícones Lucide.
const CROWN_PATH = new Path2D(
  'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294zM5 21h14'
);

// Desenha a coroa centralizada em (x, y) com o tamanho informado (px).
function drawCrownIcon(x, y, size, fillColor) {
  const scale = size / 24; // viewBox original do Lucide é 24x24
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2 / scale;
  ctx.fillStyle = fillColor || '#FFD700';
  ctx.fill(CROWN_PATH);
  ctx.strokeStyle = '#0f172a';
  ctx.stroke(CROWN_PATH);
  ctx.restore();
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

// ==========================================
// DISTRIBUIÇÃO DE TERRITÓRIOS / CAPITAIS
// ==========================================

// Escolhe N índices de território bem espalhados entre si (farthest-point sampling)
// para que cada jogador comece longe dos outros.
function pickCapitalIndices(n) {
  const total = CURRENT_MAP.countryDefs.length;
  n = Math.max(1, Math.min(n, total));
  const coords = CURRENT_MAP.countryDefs.map(c => [c.nx, c.ny]);
  const chosen = [Math.floor(Math.random() * total)];

  while (chosen.length < n) {
    let bestIdx = -1, bestDist = -1;
    for (let i = 0; i < total; i++) {
      if (chosen.includes(i)) continue;
      let minD = Infinity;
      for (const ci of chosen) {
        const dx = coords[i][0] - coords[ci][0];
        const dy = coords[i][1] - coords[ci][1];
        const d = dx * dx + dy * dy;
        if (d < minD) minD = d;
      }
      if (minD > bestDist) { bestDist = minD; bestIdx = i; }
    }
    chosen.push(bestIdx);
  }
  return chosen;
}

// Define, para cada jogador (1..n), um único território principal (capital).
// O resto do mapa começa neutro. A capital "pertence ao território", não ao
// jogador: se for conquistada, o novo dono passa a ter a coroa e o bônus.
function distributeCapitals(playersCount) {
  state.territories.forEach(t => {
    t.owner = 0;
    t.isCapital = false;
    t.troops = 8 + Math.floor(Math.random() * 8);
  });

  const capitalIndices = pickCapitalIndices(playersCount);
  capitalIndices.forEach((idx, i) => {
    const t = state.territories[idx];
    t.owner = i + 1;
    t.isCapital = true;
    t.troops = 30;
  });
}

// Inicializa a Partida
// config.playersCount -> quantos jogadores reais existem (define capitais)
// config.assignCapitals -> se false, não sorteia dono nenhum (usado pelos
//   clientes online, que apenas esperam o SYNC_STATE do host)
function initGame(config) {
  config = config || {};
  resize();
  const points = CURRENT_MAP.countryDefs.map(c => toCanvas(c.nx, c.ny));

  const territories = CURRENT_MAP.countryDefs.map((c, i) => new Territory(i, c.code, points[i].x, points[i].y));
  state = { territories };

  if (config.assignCapitals === false) {
    territories.forEach(t => { t.owner = 0; t.troops = 12; t.isCapital = false; });
  } else {
    distributeCapitals(config.playersCount || 1);
  }

  moves = [];
  hitParticles = [];
  selected = null;
  dragPos = null;
  running = true;
  lastGrowth = 0;
  netAccum = 0;
  hostEvents = [];

  updateScores();
}
window.initGame = initGame;

function updateScores() {
  // Barra de progresso removida do HUD a pedido do usuário; função mantida
  // vazia para não quebrar as chamadas existentes.
}

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
window.sendTroops = sendTroops;

function resolveArrival(m) {
  const t = state.territories[m.toId];
  t.impactAnim = 1.0;

  const color = CURRENT_MAP.colors[m.owner];
  for (let i = 0; i < 5; i++) {
    hitParticles.push(new Particle(t.x, t.y, color));
  }

  let conquered = false;
  if (t.owner === m.owner) {
    t.troops += m.troops;
  } else {
    t.troops -= m.troops;
    if (t.troops < 0) {
      t.owner = m.owner;
      t.troops = Math.abs(t.troops);
      t.pulseAnim = 1.0;
      conquered = true;
    }
  }

  if (typeof onlineMode !== 'undefined' && onlineMode && typeof isHost !== 'undefined' && isHost) {
    hostEvents.push({ type: 'arrival', territoryId: t.id, owner: m.owner, conquered });
  }

  updateScores();
}

function growthTick() {
  for (const t of state.territories) {
    if (t.owner > 0) t.troops += t.isCapital ? CAPITAL_GROWTH_MULTIPLIER : 1;
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

function onDown(e) {
  if (!running) return;
  const p = getPos(e);
  const t = territoryAt(p.x, p.y);

  const meuIndex = (typeof meuIndexJogador !== 'undefined') ? meuIndexJogador : 1;

  if (t && t.owner === meuIndex && t.troops > 0) {
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

// ==========================================
// REDE - Ataque não é mais aplicado localmente pelo cliente:
// ele avisa o host, e é o host quem simula e sincroniza para todos.
// ==========================================
function onUp(e) {
  if (!selected) return;
  const p = getPos(e);
  const t = territoryAt(p.x, p.y);

  if (t && t.id !== selected.id) {
    const online = (typeof onlineMode !== 'undefined' && onlineMode);
    const souHost = (typeof isHost !== 'undefined' && isHost);

    if (online && !souHost) {
      if (typeof conexaoHost !== 'undefined' && conexaoHost && conexaoHost.open) {
        conexaoHost.send({ tipo: 'ENVIAR_TROPAS', fromId: selected.id, toId: t.id });
      }
    } else {
      sendTroops(selected.id, t.id);
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

// ==========================================
// SINCRONIZAÇÃO DE ESTADO (HOST -> CLIENTES)
// ==========================================
function broadcastState() {
  if (typeof transmitirParaTodos !== 'function') return;

  const territoriesPayload = state.territories.map(t => ({
    id: t.id,
    owner: t.owner,
    troops: Math.round(t.troops * 100) / 100,
    isCapital: t.isCapital
  }));

  const movesPayload = moves
    .filter(m => m.delay <= 0)
    .map(m => ({
      fromId: m.fromId,
      toId: m.toId,
      owner: m.owner,
      progress: m.progress,
      maxOffset: m.maxOffset
    }));

  transmitirParaTodos({
    tipo: 'SYNC_STATE',
    territories: territoriesPayload,
    moves: movesPayload,
    events: hostEvents
  });

  hostEvents = [];
}
window.broadcastState = broadcastState;

// Aplicado pelos clientes (não-host) ao receber o estado do host
function applySyncState(data) {
  if (!state || !state.territories) return;

  (data.territories || []).forEach(rt => {
    const t = state.territories[rt.id];
    if (t) {
      t.owner = rt.owner;
      t.troops = rt.troops;
      t.isCapital = rt.isCapital;
    }
  });

  moves = (data.moves || []).map(m => ({
    fromId: m.fromId,
    toId: m.toId,
    owner: m.owner,
    progress: m.progress,
    delay: 0,
    duration: 1,
    maxOffset: m.maxOffset
  }));

  (data.events || []).forEach(ev => {
    if (ev.type === 'arrival') {
      const t = state.territories[ev.territoryId];
      if (!t) return;
      t.impactAnim = 1.0;
      if (ev.conquered) t.pulseAnim = 1.0;
      const color = CURRENT_MAP.colors[ev.owner];
      for (let i = 0; i < 5; i++) hitParticles.push(new Particle(t.x, t.y, color));
    }
  });

  updateScores();
}
window.applySyncState = applySyncState;

// Loop Principal de Renderização
let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // "Autoridade de simulação": local sozinho ou host online simulam o jogo.
  // Um cliente online (não-host) só renderiza o que recebe via SYNC_STATE.
  const online = (typeof onlineMode !== 'undefined' && onlineMode);
  const souHost = (typeof isHost !== 'undefined' && isHost);
  const authority = !(online && !souHost);

  if (running) {
    if (authority) {
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

    if (authority) {
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

      if (online && souHost) {
        netAccum += dt;
        if (netAccum > NET_SYNC_INTERVAL) {
          broadcastState();
          netAccum = 0;
        }
      }
    }
  }

  try {
    render();
  } catch (err) {
    console.error('Erro ao renderizar o frame (ignorado, jogo continua):', err);
  }
  requestAnimationFrame(loop);
}

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

  offCtx.globalCompositeOperation = 'destination-in';
  offCtx.drawImage(maskCanvas, 0, 0, cssWidth, cssHeight);
  offCtx.globalCompositeOperation = 'source-over';
  offCtx.restore();

  ctx.drawImage(offCanvas, 0, 0, cssWidth, cssHeight);

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

  // Bolinhas de tropas em trânsito: círculo branco + anel/centro na cor do dono,
  // para ficarem visíveis mesmo sobre um território da mesma cor.
  for (const m of moves) {
    if (m.delay > 0) continue;

    const from = state.territories[m.fromId], to = state.territories[m.toId];
    if (!from || !to) continue;

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

    const ownerColor = CURRENT_MAP.colors[m.owner] || '#1e3a8a';

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.arc(finalX, finalY, 5.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ownerColor;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(finalX, finalY, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = ownerColor;
    ctx.fill();
    ctx.restore();
  }

  for (const p of hitParticles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  for (const t of state.territories) {
    if (t.pulseAnim > 0) {
      const waveRadius = 12 + (1 - t.pulseAnim) * 20;
      ctx.beginPath();
      ctx.arc(t.x, t.y, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = CURRENT_MAP.colors[t.owner];
      ctx.lineWidth = 3 * t.pulseAnim;
      ctx.globalAlpha = t.pulseAnim;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    const impactScale = t.impactAnim > 0 ? Math.sin(t.impactAnim * Math.PI) * 3 : 0;
    const conquestScale = t.pulseAnim > 0 ? Math.sin(t.pulseAnim * Math.PI) * 4 : 0;
    const radius = 12 + impactScale + conquestScale;

    ctx.beginPath();
    ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = CURRENT_MAP.colors[t.owner] || '#64748b';
    ctx.lineWidth = 2 + (t.impactAnim * 2) + (t.pulseAnim * 2);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(t.troops), t.x, t.y);

    // Coroa do território principal: fica presa ao território, não ao jogador.
    // Se outro jogador conquistar essa capital, a coroa (e o bônus) passam a ser dele.
    if (t.isCapital) {
      const iconSize = 18;
      const half = iconSize / 2 + 2;

      // Posição "ideal": acima do território. Se isso ficar fora do
      // canvas (ou muito perto da borda), a coroa é travada dentro dos
      // limites visíveis em vez de ser cortada.
      let iconX = t.x;
      let iconY = t.y - radius - 10 - iconSize / 2;

      iconX = Math.min(cssWidth - half, Math.max(half, iconX));
      iconY = Math.max(half, iconY);
      // Nunca deixa a coroa invadir a área abaixo do território.
      iconY = Math.min(t.y - radius - 2, iconY);

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      drawCrownIcon(iconX, iconY, iconSize);
      ctx.restore();
    }
  }

  ctx.restore();
}

// O jogo é iniciado explicitamente por iniciarTelaJogo() (em index.html),
// só depois que a tela do jogo estiver visível e o canvas tiver um tamanho real.
function startGameLoop() {
  if (window.__loopStarted) return;
  window.__loopStarted = true;
  requestAnimationFrame(loop);
}
window.startGameLoop = startGameLoop;
