const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const wrap = document.getElementById('canvasWrap');

let dpr = window.devicePixelRatio || 1;
let cssWidth = 0, cssHeight = 0;
let layout = { offsetX: 0, offsetY: 0, mapW: 0, mapH: 0 };
let delaunay, voronoi;

let state = { territories: [] };
let moves = [];
let selected = null;
let dragPos = null;
let running = false;
let lastGrowth = performance.now();

let myPlayerId = 1;
let totalPlayersInRoom = 1;
let peerConnections = [];

const TROOP_SPEED = 70;

function resize() {
  dpr = window.devicePixelRatio || 1;
  cssWidth = wrap.clientWidth;
  cssHeight = wrap.clientHeight;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';

  if (typeof CURRENT_MAP !== 'undefined') {
    computeLayout();
    buildVoronoi();
  }
}
window.addEventListener('resize', resize);

function computeLayout() {
  const padTop = 20, padBottom = 20;
  const availH = Math.max(200, cssHeight - padTop - padBottom);
  const availW = cssWidth - 20;
  const MAP_ASPECT = CURRENT_MAP.aspectRatio || 0.95;
  let mapH = availH, mapW = mapH * MAP_ASPECT;
  if (mapW > availW) { mapW = availW; mapH = mapW / MAP_ASPECT; }
  layout = { mapW, mapH, offsetX: (cssWidth - mapW) / 2, offsetY: padTop };
}

function toCanvas(nx, ny) { 
  return { x: layout.offsetX + nx * layout.mapW, y: layout.offsetY + ny * layout.mapH }; 
}

function buildVoronoi() {
  const pts = CURRENT_MAP.countryDefs.map(c => { const p = toCanvas(c.nx, c.ny); return [p.x, p.y]; });
  delaunay = d3.Delaunay.from(pts);
  const pad = 40;
  voronoi = delaunay.voronoi([layout.offsetX - pad, layout.offsetY - pad, layout.offsetX + layout.mapW + pad, layout.offsetY + layout.mapH + pad]);
}

// Inicializa a Partida
function initGame(numPlayers = 1, localPlayerId = 1) {
  resize();
  totalPlayersInRoom = Math.min(6, Math.max(1, numPlayers));
  myPlayerId = localPlayerId;

  const points = CURRENT_MAP.countryDefs.map(c => toCanvas(c.nx, c.ny));
  const territories = CURRENT_MAP.countryDefs.map((c, i) => new Territory(i, c.code, points[i].x, points[i].y));
  
  // Todos neutros por padrão
  territories.forEach(t => {
    t.owner = 0;
    t.troops = 10;
    t.isCapital = false;
  });

  // Dá exatamente 1 território inicial por jogador conectado
  const step = Math.floor(territories.length / totalPlayersInRoom);
  for (let p = 1; p <= totalPlayersInRoom; p++) {
    const idx = (p - 1) * step;
    if (territories[idx]) {
      territories[idx].owner = p;
      territories[idx].troops = 20;
      territories[idx].isCapital = true; // Território Principal (Coroa)
    }
  }

  state = { territories };
  moves = [];
  lastGrowth = performance.now();
  running = true;
}

// Iniciar Partida com Timer de 5s
function iniciarPartidaComTimer(numPlayers, localPlayerId, connections = []) {
  peerConnections = connections;
  const overlay = document.getElementById('countdownOverlay');
  const numDisplay = document.getElementById('countdownNumber');
  overlay.classList.add('active');

  let count = 5;
  numDisplay.innerText = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      numDisplay.innerText = count;
    } else {
      clearInterval(interval);
      overlay.classList.remove('active');
      
      document.getElementById('homeScreen').style.display = 'none';
      document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
      document.getElementById('hud').style.display = 'block';
      
      const wrap = document.getElementById('canvasWrap');
      wrap.style.display = 'flex';
      wrap.classList.add('map-appear');

      initGame(numPlayers, localPlayerId);
      requestAnimationFrame(gameLoop);
    }
  }, 1000);
}

// Enviar / Receber Ataques
function atacarTerritorio(fromId, toId) {
  const fromT = state.territories[fromId];
  if (!fromT || fromT.owner !== myPlayerId || fromT.troops <= 1) return;

  const amount = Math.floor(fromT.troops / 2);
  fromT.troops -= amount;

  // Enviar comando para outros jogadores na sala via PeerJS
  if (peerConnections && peerConnections.length > 0) {
    peerConnections.forEach(conn => {
      if (conn && conn.open) {
        conn.send({ tipo: 'ATAQUE', fromId, toId, amount, owner: myPlayerId });
      }
    });
  }

  criarOndaMovimento(fromId, toId, amount, myPlayerId);
}

function criarOndaMovimento(fromId, toId, amount, owner) {
  const fromT = state.territories[fromId];
  const toT = state.territories[toId];
  if (!fromT || !toT) return;

  const dx = toT.x - fromT.x;
  const dy = toT.y - fromT.y;
  const dist = Math.hypot(dx, dy);
  const duration = Math.max(1.0, dist / TROOP_SPEED);

  const numBalls = Math.min(amount, 5);
  const troopsPerBall = Math.ceil(amount / numBalls);
  let remaining = amount;

  for (let i = 0; i < numBalls; i++) {
    const ballAmount = Math.min(remaining, troopsPerBall);
    if (ballAmount <= 0) break;
    remaining -= ballAmount;

    moves.push({
      fromId, toId, owner,
      amount: ballAmount,
      progress: 0,
      duration,
      delay: i * 0.15,
      startX: fromT.x, startY: fromT.y,
      targetX: toT.x, targetY: toT.y
    });
  }
}

// Loop Principal
function gameLoop(now) {
  if (!running) return;
  const dt = 0.016;

  // Farm 1.5x no Território Principal (Capital)
  if (now - lastGrowth >= 1000) {
    state.territories.forEach(t => {
      if (t.owner !== 0) {
        const rate = t.isCapital ? 1.5 : 1.0;
        t.troops += rate;
      }
    });
    lastGrowth = now;
  }

  // Atualizar movimentos
  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i];
    if (m.delay > 0) {
      m.delay -= dt;
      continue;
    }

    m.progress += dt / m.duration;
    if (m.progress >= 1) {
      const targetT = state.territories[m.toId];
      if (targetT.owner === m.owner) {
        targetT.troops += m.amount;
      } else {
        targetT.troops -= m.amount;
        if (targetT.troops < 0) {
          targetT.owner = m.owner;
          targetT.troops = Math.abs(targetT.troops);
          // O novo dono conquista a capital
        }
      }
      moves.splice(i, 1);
    }
  }

  render();
  requestAnimationFrame(gameLoop);
}

// Renderização das Bolinhas, Coroa e Voronoi
function render() {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Voronoi
  if (voronoi) {
    state.territories.forEach((t, i) => {
      const poly = voronoi.cellPolygon(i);
      if (!poly) return;

      ctx.beginPath();
      poly.forEach((p, j) => j === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
      ctx.closePath();

      ctx.fillStyle = CURRENT_MAP.colors[t.owner] || '#64748b';
      ctx.globalAlpha = t.owner === 0 ? 0.35 : 0.75;
      ctx.fill();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    });
  }

  // Territórios
  state.territories.forEach(t => {
    ctx.globalAlpha = 1.0;
    
    ctx.beginPath();
    ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = CURRENT_MAP.colors[t.owner] || '#64748b';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(t.troops), t.x, t.y);

    if (t.isCapital) {
      desenharCoroa(t.x, t.y - 24);
    }
  });

  // Bolinhas de Tropa (Claramente Visíveis)
  moves.forEach(m => {
    if (m.delay > 0) return;

    const curX = m.startX + (m.targetX - m.startX) * m.progress;
    const curY = m.startY + (m.targetY - m.startY) * m.progress;

    ctx.beginPath();
    ctx.arc(curX, curY, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = CURRENT_MAP.colors[m.owner] || '#2563eb';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.amount, curX, curY);
  });

  // Linha de mira ao arrastar
  if (selected !== null && dragPos !== null) {
    const fromT = state.territories[selected];
    ctx.beginPath();
    ctx.moveTo(fromT.x, fromT.y);
    ctx.lineTo(dragPos.x, dragPos.y);
    ctx.strokeStyle = CURRENT_MAP.colors[myPlayerId] || '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function desenharCoroa(x, y) {
  ctx.save();
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(x - 10, y + 5);
  ctx.lineTo(x - 12, y - 5);
  ctx.lineTo(x - 5, y);
  ctx.lineTo(x, y - 8);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x + 12, y - 5);
  ctx.lineTo(x + 10, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// Mouse e Toque
canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  state.territories.forEach(t => {
    if (Math.hypot(t.x - clickX, t.y - clickY) < 22 && t.owner === myPlayerId) {
      selected = t.id;
    }
  });
});

canvas.addEventListener('mousemove', e => {
  if (selected === null) return;
  const rect = canvas.getBoundingClientRect();
  dragPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

canvas.addEventListener('mouseup', e => {
  if (selected !== null && dragPos !== null) {
    state.territories.forEach(t => {
      if (Math.hypot(t.x - dragPos.x, t.y - dragPos.y) < 25 && t.id !== selected) {
        atacarTerritorio(selected, t.id);
      }
    });
  }
  selected = null;
  dragPos = null;
});
