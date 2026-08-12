// ==========================================================
// MAPA: BRASIL
// ==========================================================
// Territórios = as 26 unidades federativas + o Distrito Federal
// (27 no total), posicionados de forma aproximada às posições
// reais dos estados dentro do contorno do país.
//
// Diferente da versão "SVG + GeoJSON real" que às vezes circula por
// aí, aqui o contorno e os pontos já vêm PRONTOS, escritos direto no
// código (coordenadas normalizadas 0-1, mesmo esquema que os outros
// mapas do jogo). Isso é proposital e é a otimização mais importante
// deste mapa:
//   - Sem fetch() de GeoJSON externo: o mapa carrega instantaneamente,
//     não depende de internet/CDN nem pode falhar ao buscar o arquivo.
//   - Sem Math.random(): a divisão em territórios usa sempre os
//     mesmos pontos fixos, então host e clientes no modo online
//     enxergam exatamente o mesmo mapa (senão o jogo dessincroniza).
//   - Sem geometria pesada (turf/d3-geo, milhares de pontos de
//     costa): o contorno tem só ~27 vértices, then o Voronoi (feito
//     pelo próprio game.js) e a máscara de canvas resolvem o resto
//     com o mesmo custo dos outros mapas do jogo.
// ==========================================================

const MAP_BRASIL = {
  name: 'Brasil',
  colors: {
    0: '#94a3b8', // Neutro
    1: '#2563eb', // P1
    2: '#dc2626', // P2
    3: '#16a34a', // P3
    4: '#ca8a04', // P4
    5: '#9333ea', // P5
    6: '#ea580c'  // P6
  },
  // Brasil é levemente mais largo que alto.
  aspectRatio: 1.05,

  // 27 territórios (26 estados + Distrito Federal), posições
  // aproximadas dentro do contorno do país.
  countryDefs: [
    { code: 'RR', nx: 0.333, ny: 0.056 },
    { code: 'AP', nx: 0.573, ny: 0.127 },
    { code: 'AM', nx: 0.250, ny: 0.256 },
    { code: 'PA', nx: 0.550, ny: 0.231 },
    { code: 'MA', nx: 0.725, ny: 0.256 },
    { code: 'CE', nx: 0.863, ny: 0.256 },
    { code: 'RN', nx: 0.950, ny: 0.260 },
    { code: 'PB', nx: 0.930, ny: 0.315 },
    { code: 'PE', nx: 0.900, ny: 0.346 },
    { code: 'PI', nx: 0.788, ny: 0.308 },
    { code: 'AC', nx: 0.155, ny: 0.384 },
    { code: 'RO', nx: 0.253, ny: 0.354 },
    { code: 'TO', nx: 0.643, ny: 0.390 },
    { code: 'AL', nx: 0.958, ny: 0.376 },
    { code: 'SE', nx: 0.923, ny: 0.408 },
    { code: 'MT', nx: 0.475, ny: 0.462 },
    { code: 'BA', nx: 0.808, ny: 0.449 },
    { code: 'GO', nx: 0.618, ny: 0.556 },
    { code: 'DF', nx: 0.653, ny: 0.533 },
    { code: 'MG', nx: 0.738, ny: 0.590 },
    { code: 'MS', nx: 0.485, ny: 0.651 },
    { code: 'ES', nx: 0.843, ny: 0.638 },
    { code: 'SP', nx: 0.638, ny: 0.705 },
    { code: 'RJ', nx: 0.770, ny: 0.715 },
    { code: 'PR', nx: 0.563, ny: 0.756 },
    { code: 'SC', nx: 0.588, ny: 0.828 },
    { code: 'RS', nx: 0.525, ny: 0.885 }
  ],

  // Contorno aproximado do país (um único polígono fechado).
  coastlines: [
    [
      [0.25, 0.03], [0.35, 0.02], [0.58, 0.03], [0.56, 0.15],
      [0.75, 0.19], [0.83, 0.21], [0.91, 0.26], [0.98, 0.32],
      [0.96, 0.37], [0.91, 0.45], [0.89, 0.46], [0.88, 0.56],
      [0.85, 0.64], [0.77, 0.72], [0.69, 0.74], [0.64, 0.78],
      [0.64, 0.84], [0.55, 0.96], [0.43, 0.90], [0.49, 0.78],
      [0.41, 0.64], [0.34, 0.54], [0.22, 0.38], [0.03, 0.36],
      [0.10, 0.23], [0.11, 0.15], [0.18, 0.09]
    ]
  ]
};

// Registra este mapa junto dos outros disponíveis no jogo.
window.MAPS = window.MAPS || {};
window.MAPS.BRASIL = MAP_BRASIL;

// Só define como mapa ativo se nenhum outro script de mapa já tiver
// definido um (ex.: quando esta página é aberta sozinha, sem os
// outros mapas). Na tela principal, quem decide o mapa ativo é o
// jogador, em "Configurações da Sala".
if (typeof window.CURRENT_MAP === 'undefined') {
  window.CURRENT_MAP = MAP_BRASIL;
}
