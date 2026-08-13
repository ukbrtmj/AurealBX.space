// ==========================================================
// MAPA: BRASIL (formas reais, via GeoJSON)
// ==========================================================
// Diferente do resto do jogo (que aproxima territórios por Voronoi a
// partir de um punhado de pontos), este mapa desenha o contorno REAL
// dos estados, carregado em tempo de execução do click_that_hood
// (GeoJSON público, mesma fonte usada no protótipo original).
//
// 22 territórios: 20 estados individuais + 2 grupos (agrupados pra não
// espremer estado pequeno demais pra clicar num jogo mobile):
//   - "NE" = SE + AL + PE + PB + RN
//   - "GO" = GO + DF
//
// Os nx,ny abaixo são só o FALLBACK: usados pelo servidor (que nunca
// baixa GeoJSON nenhum, só quer saber id + posição aproximada pra
// calcular distância/duração de ataque e sortear capitais) e também
// pelo próprio navegador caso o fetch do GeoJSON falhe (sem internet,
// CDN fora do ar etc.) — nesse caso o jogo cai pro Voronoi de sempre
// e continua 100% jogável, só sem o contorno real.
// ==========================================================

const MAP_BRASIL = {
  name: 'Brasil',
  type: 'geo',
  colors: {
    0: '#94a3b8', // Neutro
    1: '#2563eb', // P1
    2: '#dc2626', // P2
    3: '#16a34a', // P3
    4: '#ca8a04', // P4
    5: '#9333ea', // P5
    6: '#ea580c'  // P6
  },
  aspectRatio: 1.05,

  // De onde vem a geometria real, carregada pelo js/geoEngine.js.
  geoSource: {
    format: 'geojson',
    url: 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson',
    siglaProperty: 'sigla'
  },

  // Ordem FIXA — precisa bater com o array BRASIL de maps.js no servidor.
  territories: [
    { code: 'AC', nx: 0.1205, ny: 0.3787, match: ['AC'] },
    { code: 'AM', nx: 0.2586, ny: 0.2733, match: ['AM'] },
    { code: 'RR', nx: 0.3347, ny: 0.1056, match: ['RR'] },
    { code: 'AP', nx: 0.5585, ny: 0.1224, match: ['AP'] },
    { code: 'PA', nx: 0.5323, ny: 0.2542, match: ['PA'] },
    { code: 'TO', nx: 0.6514, ny: 0.3979, match: ['TO'] },
    { code: 'MA', nx: 0.7157, ny: 0.2781, match: ['MA'] },
    { code: 'PI', nx: 0.7823, ny: 0.338, match: ['PI'] },
    { code: 'CE', nx: 0.8561, ny: 0.2829, match: ['CE'] },
    { code: 'RO', nx: 0.299, ny: 0.4219, match: ['RO'] },
    { code: 'MT', nx: 0.4657, ny: 0.465, match: ['MT'] },
    { code: 'MS', nx: 0.4895, ny: 0.6494, match: ['MS'] },
    { code: 'BA', nx: 0.8014, ny: 0.4578, match: ['BA'] },
    { code: 'MG', nx: 0.7347, ny: 0.6063, match: ['MG'] },
    { code: 'ES', nx: 0.8275, ny: 0.6279, match: ['ES'] },
    { code: 'RJ', nx: 0.7752, ny: 0.6902, match: ['RJ'] },
    { code: 'SP', nx: 0.6347, ny: 0.6926, match: ['SP'] },
    { code: 'PR', nx: 0.5681, ny: 0.7477, match: ['PR'] },
    { code: 'SC', nx: 0.6038, ny: 0.8123, match: ['SC'] },
    { code: 'RS', nx: 0.5276, ny: 0.877, match: ['RS'] },
    { code: 'NE', nx: 0.918, ny: 0.3596, match: ['SE', 'AL', 'PE', 'PB', 'RN'] },
    { code: 'GO', nx: 0.6204, ny: 0.5392, match: ['GO', 'DF'] }
  ],

  // Contorno aproximado do país — só usado no fallback (Voronoi) se o
  // GeoJSON real não carregar.
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

// countryDefs é o formato "antigo" (code, nx, ny) que o resto do motor
// (Voronoi fallback, sorteio de capitais) já sabe ler — gerado direto
// da lista `territories` acima, pra não duplicar os dados.
MAP_BRASIL.countryDefs = MAP_BRASIL.territories.map(t => ({ code: t.code, nx: t.nx, ny: t.ny }));

window.MAPS = window.MAPS || {};
window.MAPS.BRASIL = MAP_BRASIL;

if (typeof window.CURRENT_MAP === 'undefined') {
  window.CURRENT_MAP = MAP_BRASIL;
}
