// ==========================================================
// MAPA: ARQUIPÉLAGO
// ==========================================================
// Em vez de dezenas de ilhotas soltas (uma por território, cada uma
// isolada no meio da água), o arquipélago é montado como um punhado
// de MASSAS DE TERRA maiores e recortadas — cada uma contendo vários
// territórios vizinhos, do jeito que um arquipélago de verdade se
// parece (grupos de ilhas, não confete espalhado). Além disso,
// algumas ilhotas soltas de 1 território só ficam espalhadas entre
// os grupos, pra dar variedade.
//
// A geração usa um gerador pseudo-aleatório com SEMENTE FIXA (sem
// Math.random). Isso é essencial: host e clientes no modo online
// precisam enxergar exatamente o mesmo mapa (mesmos territórios,
// mesmas posições), senão o jogo dessincroniza.
// ==========================================================

(function () {
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(20260812); // semente fixa: mapa sempre igual

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = v => clamp(v, 0.025, 0.975);

  // Região central onde tudo pode nascer: deixa boa margem em cima,
  // embaixo e nas laterais, garantindo que o arquipélago fique
  // visualmente no MEIO da tela.
  const REGION = { cx: 0.5, cy: 0.5, rx: 0.47, ry: 0.43 };

  // Quantos territórios cada "grupo de ilhas" (massa de terra) vai ter.
  // Grupos de tamanhos variados = visual mais orgânico e menos repetitivo.
  const CLUSTER_SIZES = [8, 7, 6, 7, 6];
  const MIN_CLUSTER_CENTER_DIST = 0.40;
  // Ilhotas soltas (1 território cada), espalhadas entre os grupos.
  const LONE_ISLAND_COUNT = 6;

  function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- 1) Posiciona o centro de cada grupo, bem espalhados entre si ---
  function placeClusterCenters(count) {
    const centers = [];
    let attempts = 0;
    while (centers.length < count && attempts < count * 6000) {
      attempts++;
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand());
      const cx = REGION.cx + Math.cos(ang) * rad * REGION.rx;
      const cy = REGION.cy + Math.sin(ang) * rad * REGION.ry;
      let ok = true;
      for (const c of centers) {
        if (dist(cx, cy, c.cx, c.cy) < MIN_CLUSTER_CENTER_DIST) { ok = false; break; }
      }
      if (ok) centers.push({ cx, cy });
    }
    // fallback: relaxa a distância mínima gradualmente até caber todo mundo
    let relax = MIN_CLUSTER_CENTER_DIST;
    while (centers.length < count) {
      relax *= 0.92;
      let placed = false;
      for (let tries = 0; tries < 400 && centers.length < count; tries++) {
        const ang = rand() * Math.PI * 2;
        const rad = Math.sqrt(rand());
        const cx = REGION.cx + Math.cos(ang) * rad * REGION.rx;
        const cy = REGION.cy + Math.sin(ang) * rad * REGION.ry;
        let ok = true;
        for (const c of centers) {
          if (dist(cx, cy, c.cx, c.cy) < relax) { ok = false; break; }
        }
        if (ok) { centers.push({ cx, cy }); placed = true; }
      }
      if (!placed && relax < 0.05) {
        // último recurso: só encaixa em algum lugar da região
        centers.push({ cx: REGION.cx + (rand() - 0.5) * REGION.rx, cy: REGION.cy + (rand() - 0.5) * REGION.ry });
      }
    }
    return centers;
  }

  // --- 2) Espalha N pontos de território dentro de um grupo ---
  function placeClusterPoints(cx, cy, n, spread) {
    const pts = [];
    const localMinDist = spread * 0.58;
    let attempts = 0;
    while (pts.length < n && attempts < n * 3000) {
      attempts++;
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()) * spread;
      const nx = cx + Math.cos(ang) * rad;
      const ny = cy + Math.sin(ang) * rad * 0.86; // grupos levemente achatados
      let ok = true;
      for (const p of pts) {
        if (dist(nx, ny, p.nx, p.ny) < localMinDist) { ok = false; break; }
      }
      if (ok) pts.push({ nx: clamp01(nx), ny: clamp01(ny) });
    }
    while (pts.length < n) {
      // fallback bem raro: garante a quantidade pedida mesmo sob pressão de espaço
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()) * spread;
      pts.push({
        nx: clamp01(cx + Math.cos(ang) * rad),
        ny: clamp01(cy + Math.sin(ang) * rad * 0.86)
      });
    }
    return pts;
  }

  // --- 3) Desenha o contorno irregular (costa) ao redor de um grupo de
  // pontos: acha, em N direções ao redor do centro, o quão longe estão
  // os territórios naquela direção, preenche os "buracos" (direções sem
  // território por perto) por interpolação e suaviza tudo — assim a
  // costa fecha sem se auto-cruzar, mas continua bem irregular (baías e
  // pontas), com cara de ilha recortada em vez de um círculo liso.
  function buildClusterCoastline(points, cx, cy) {
    const N = 20 + Math.floor(rand() * 4); // 20-23 vértices
    const radii = new Array(N).fill(-1);

    points.forEach(p => {
      const dx = p.nx - cx, dy = p.ny - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let ang = Math.atan2(dy, dx);
      if (ang < 0) ang += Math.PI * 2;
      const idx = Math.round((ang / (Math.PI * 2)) * N) % N;
      for (let off = -1; off <= 1; off++) {
        const j = (idx + off + N) % N;
        radii[j] = Math.max(radii[j], d);
      }
    });

    // Preenche direções sem território por perto interpolando entre os
    // vizinhos conhecidos mais próximos (circular), evitando espinhos
    // gigantes apontando pro meio do mapa.
    for (let i = 0; i < N; i++) {
      if (radii[i] >= 0) continue;
      let left = -1, leftDist = 0;
      for (let k = 1; k <= N; k++) { const j = (i - k + N) % N; if (radii[j] >= 0) { left = radii[j]; leftDist = k; break; } }
      let right = -1, rightDist = 0;
      for (let k = 1; k <= N; k++) { const j = (i + k) % N; if (radii[j] >= 0) { right = radii[j]; rightDist = k; break; } }
      if (left < 0) left = right;
      if (right < 0) right = left;
      const total = leftDist + rightDist || 1;
      radii[i] = (left * rightDist + right * leftDist) / total;
    }

    // Suaviza (2 passadas) pra tirar picos bruscos que poderiam cruzar a
    // própria costa.
    for (let pass = 0; pass < 2; pass++) {
      const smoothed = radii.slice();
      for (let i = 0; i < N; i++) {
        const prev = radii[(i - 1 + N) % N], next = radii[(i + 1) % N];
        smoothed[i] = radii[i] * 0.5 + prev * 0.25 + next * 0.25;
      }
      for (let i = 0; i < N; i++) radii[i] = smoothed[i];
    }

    const out = [];
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      const pad = 0.035 + rand() * 0.028; // faixa de água entre o território e a costa
      let jag = 0.94 + rand() * 0.2;      // irregularidade suave
      if (rand() < 0.16) jag *= 1.12 + rand() * 0.16; // ponta/baía ocasional, discreta

      const rX = (radii[i] + pad) * jag;
      const rY = rX * (0.84 + rand() * 0.24);

      out.push([
        clamp01(cx + Math.cos(ang) * rX),
        clamp01(cy + Math.sin(ang) * rY)
      ]);
    }
    return out;
  }

  // Contorno de uma ilhota isolada de 1 território só.
  function buildLoneIslandCoastline(nx, ny, baseRadius) {
    const vertices = 9 + Math.floor(rand() * 3); // 9-11 vértices
    const pts = [];
    for (let i = 0; i < vertices; i++) {
      const ang = (i / vertices) * Math.PI * 2;
      const jitter = 0.62 + rand() * 0.55;
      const rX = baseRadius * jitter;
      const rY = baseRadius * jitter * 0.8;
      pts.push([clamp01(nx + Math.cos(ang) * rX), clamp01(ny + Math.sin(ang) * rY)]);
    }
    return pts;
  }

  // ==========================================================
  // Monta os grupos (massas de terra com vários territórios)
  // ==========================================================
  const clusterCenters = placeClusterCenters(CLUSTER_SIZES.length);

  const countryDefs = [];
  const coastlines = [];
  const clusterFootprints = []; // { cx, cy, maxR } — usado pra afastar ilhotas soltas
  let codeCounter = 1;

  CLUSTER_SIZES.forEach((n, i) => {
    const { cx, cy } = clusterCenters[i];
    const spread = 0.05 + n * 0.007; // grupos maiores = espalham mais os pontos
    const points = placeClusterPoints(cx, cy, n, spread);

    points.forEach(p => {
      countryDefs.push({ code: 'IL' + (codeCounter++), nx: p.nx, ny: p.ny });
    });

    const coastline = buildClusterCoastline(points, cx, cy);
    coastlines.push(coastline);

    let maxR = 0;
    coastline.forEach(([x, y]) => { maxR = Math.max(maxR, dist(x, y, cx, cy)); });
    clusterFootprints.push({ cx, cy, maxR });
  });

  // --- Ilhotas soltas, espalhadas nos vãos entre os grupos ---
  const ISLAND_BASE_RADIUS = 0.048;
  const LONE_MARGIN = 0.06;

  let loneAdded = 0, loneAttempts = 0;
  const lonePoints = [];
  while (loneAdded < LONE_ISLAND_COUNT && loneAttempts < LONE_ISLAND_COUNT * 5000) {
    loneAttempts++;
    const ang = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand());
    const nx = REGION.cx + Math.cos(ang) * rad * REGION.rx;
    const ny = REGION.cy + Math.sin(ang) * rad * REGION.ry;

    let ok = true;
    for (const f of clusterFootprints) {
      if (dist(nx, ny, f.cx, f.cy) < f.maxR + ISLAND_BASE_RADIUS + LONE_MARGIN) { ok = false; break; }
    }
    if (ok) {
      for (const p of lonePoints) {
        if (dist(nx, ny, p.nx, p.ny) < ISLAND_BASE_RADIUS * 2 + LONE_MARGIN) { ok = false; break; }
      }
    }
    if (!ok) continue;

    const point = { nx: clamp01(nx), ny: clamp01(ny) };
    lonePoints.push(point);
    countryDefs.push({ code: 'IL' + (codeCounter++), nx: point.nx, ny: point.ny });
    coastlines.push(buildLoneIslandCoastline(point.nx, point.ny, ISLAND_BASE_RADIUS));
    loneAdded++;
  }

  const MAP_ARQUIPELAGO = {
    name: 'Arquipélago',
    colors: {
      0: '#94a3b8', // Neutro
      1: '#2563eb', // P1
      2: '#dc2626', // P2
      3: '#16a34a', // P3
      4: '#ca8a04', // P4
      5: '#9333ea', // P5
      6: '#ea580c'  // P6
    },
    // Bem largo: mapa grande, ocupando melhor telas widescreen.
    aspectRatio: 1.55,

    countryDefs,
    coastlines
  };

  // Registra este mapa junto dos outros disponíveis no jogo.
  window.MAPS = window.MAPS || {};
  window.MAPS.ARQUIPELAGO = MAP_ARQUIPELAGO;

  // Só define como mapa ativo se nenhum outro script de mapa já tiver
  // definido um (ex.: quando esta página é aberta sozinha, sem a África).
  // Na tela principal, quem decide o mapa ativo é o jogador, em
  // "Configurações da Sala".
  if (typeof window.CURRENT_MAP === 'undefined') {
    window.CURRENT_MAP = MAP_ARQUIPELAGO;
  }
})();
