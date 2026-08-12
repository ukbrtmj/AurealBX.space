// ==========================================================
// MAPA: ARQUIPÉLAGO
// ==========================================================
// Cada território é uma pequena ilha isolada na água, espalhada
// e mantida longe das outras. Toda a "massa terrestre" fica
// centralizada dentro do canvas (nem colada no topo, nem embaixo),
// e o mapa é bem largo/grande para aproveitar melhor a tela.
//
// A geração dos pontos e das ilhas usa um gerador pseudo-aleatório
// com SEMENTE FIXA (sem Math.random). Isso é essencial: host e
// clientes no modo online precisam enxergar exatamente o mesmo
// mapa (mesmos territórios, mesmas posições), senão o jogo
// dessincroniza.
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

  // Região central onde os territórios podem nascer: uma elipse que
  // deixa boa margem em cima, embaixo e nas laterais, garantindo que
  // o arquipélago fique visualmente no MEIO da tela.
  const REGION = { cx: 0.5, cy: 0.5, rx: 0.46, ry: 0.40 };
  const MIN_DIST = 0.14;    // distância mínima entre ilhas (bem espalhadas)
  const TARGET_COUNT = 28;  // quantidade alvo de territórios
  const ISLAND_BASE_RADIUS = 0.046;

  function generatePoints(count, minDist) {
    const pts = [];
    let attempts = 0;
    const maxAttempts = count * 2500;
    while (pts.length < count && attempts < maxAttempts) {
      attempts++;
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand());
      const nx = REGION.cx + Math.cos(ang) * rad * REGION.rx;
      const ny = REGION.cy + Math.sin(ang) * rad * REGION.ry;

      let ok = true;
      for (let i = 0; i < pts.length; i++) {
        const dx = pts[i].nx - nx, dy = pts[i].ny - ny;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) { ok = false; break; }
      }
      if (ok) pts.push({ nx, ny });
    }
    return pts;
  }

  // Contorno irregular (ilha) ao redor de cada ponto — polígono fechado
  // usado depois para "recortar" a cor do território (mask), então
  // cada território aparece como uma ilhota independente na água.
  function generateIslandShape(nx, ny, baseRadius) {
    const vertices = 9 + Math.floor(rand() * 3); // 9-11 vértices
    const pts = [];
    for (let i = 0; i < vertices; i++) {
      const ang = (i / vertices) * Math.PI * 2;
      const jitter = 0.62 + rand() * 0.65; // 0.62 - 1.27
      const rX = baseRadius * jitter;
      const rY = baseRadius * jitter * 0.8; // levemente achatada
      pts.push([nx + Math.cos(ang) * rX, ny + Math.sin(ang) * rY]);
    }
    return pts;
  }

  const rawPoints = generatePoints(TARGET_COUNT, MIN_DIST);

  const countryDefs = rawPoints.map((p, i) => ({
    code: 'IL' + (i + 1),
    nx: p.nx,
    ny: p.ny
  }));

  const coastlines = countryDefs.map(c =>
    generateIslandShape(c.nx, c.ny, ISLAND_BASE_RADIUS)
  );

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

  // Define o mapa padrão global
  window.MAP_ARQUIPELAGO = MAP_ARQUIPELAGO;
  var CURRENT_MAP = MAP_ARQUIPELAGO;
  window.CURRENT_MAP = CURRENT_MAP;
})();
