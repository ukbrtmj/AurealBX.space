// ==========================================================
// MAPA: ESTADOS UNIDOS (formas reais, via TopoJSON)
// ==========================================================
// Mesmo esquema do mapa do Brasil: contorno REAL dos estados,
// carregado em tempo de execução do us-atlas (TopoJSON público,
// mesma fonte do protótipo original).
//
// 36 territórios: os 48 estados contíguos MENOS os pequenos demais
// pra clicar com conforto num mapa que ocupa a tela toda de um
// celular (CT, DE, DC, ME, MD, MA, MS, NH, NJ, RI, VT, WV, WI) — e
// sem Alasca/Havaí, que ficam fora da projeção Albers USA padrão.
//
// Os nx,ny abaixo são o FALLBACK (usado pelo servidor, que nunca
// baixa TopoJSON nenhum, e pelo navegador se o fetch falhar): posições
// aproximadas à mão, na mesma lógica dos outros mapas do jogo — não
// precisam ser exatas, só preservar a posição relativa real de cada
// estado pra distância/duração de ataque e sorteio de capital fazerem
// sentido.
// ==========================================================

const MAP_USA = {
  name: 'Estados Unidos',
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
  aspectRatio: 1.55,
  projection: 'albersUsa',

  geoSource: {
    format: 'topojson',
    url: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
    objectName: 'states'
  },

  // Ordem FIXA — precisa bater com o array USA de maps.js no servidor.
  // "match" usa o FIPS numérico do estado (sem zero à esquerda), que é
  // o id de cada feature no TopoJSON do us-atlas.
  territories: [
    { code: 'WA', nx: 0.10, ny: 0.06, match: ['53'] },
    { code: 'OR', nx: 0.08, ny: 0.18, match: ['41'] },
    { code: 'CA', nx: 0.06, ny: 0.42, match: ['6'] },
    { code: 'NV', nx: 0.16, ny: 0.30, match: ['32'] },
    { code: 'ID', nx: 0.19, ny: 0.16, match: ['16'] },
    { code: 'MT', nx: 0.27, ny: 0.07, match: ['30'] },
    { code: 'WY', nx: 0.26, ny: 0.24, match: ['56'] },
    { code: 'UT', nx: 0.19, ny: 0.34, match: ['49'] },
    { code: 'CO', nx: 0.29, ny: 0.35, match: ['8'] },
    { code: 'AZ', nx: 0.17, ny: 0.52, match: ['4'] },
    { code: 'NM', nx: 0.27, ny: 0.52, match: ['35'] },
    { code: 'ND', nx: 0.38, ny: 0.08, match: ['38'] },
    { code: 'SD', nx: 0.37, ny: 0.19, match: ['46'] },
    { code: 'NE', nx: 0.38, ny: 0.28, match: ['31'] },
    { code: 'KS', nx: 0.39, ny: 0.37, match: ['20'] },
    { code: 'OK', nx: 0.40, ny: 0.46, match: ['40'] },
    { code: 'TX', nx: 0.38, ny: 0.62, match: ['48'] },
    { code: 'MN', nx: 0.47, ny: 0.11, match: ['27'] },
    { code: 'IA', nx: 0.48, ny: 0.25, match: ['19'] },
    { code: 'MO', nx: 0.49, ny: 0.37, match: ['29'] },
    { code: 'AR', nx: 0.48, ny: 0.48, match: ['5'] },
    { code: 'LA', nx: 0.48, ny: 0.62, match: ['22'] },
    { code: 'IL', nx: 0.55, ny: 0.30, match: ['17'] },
    { code: 'IN', nx: 0.59, ny: 0.32, match: ['18'] },
    { code: 'MI', nx: 0.60, ny: 0.17, match: ['26'] },
    { code: 'OH', nx: 0.63, ny: 0.30, match: ['39'] },
    { code: 'KY', nx: 0.60, ny: 0.40, match: ['21'] },
    { code: 'TN', nx: 0.59, ny: 0.46, match: ['47'] },
    { code: 'AL', nx: 0.60, ny: 0.56, match: ['1'] },
    { code: 'GA', nx: 0.65, ny: 0.56, match: ['13'] },
    { code: 'FL', nx: 0.70, ny: 0.73, match: ['12'] },
    { code: 'SC', nx: 0.70, ny: 0.50, match: ['45'] },
    { code: 'NC', nx: 0.72, ny: 0.42, match: ['37'] },
    { code: 'VA', nx: 0.73, ny: 0.37, match: ['51'] },
    { code: 'NY', nx: 0.77, ny: 0.19, match: ['36'] },
    { code: 'PA', nx: 0.75, ny: 0.28, match: ['42'] }
  ],

  // Contorno aproximado do território — só usado no fallback (Voronoi)
  // se o TopoJSON real não carregar.
  coastlines: [
    [
      [0.03, 0.05], [0.30, 0.02], [0.55, 0.02], [0.80, 0.15],
      [0.98, 0.18], [0.98, 0.30], [0.80, 0.34], [0.82, 0.55],
      [0.75, 0.60], [0.73, 0.80], [0.62, 0.65], [0.45, 0.68],
      [0.40, 0.70], [0.35, 0.65], [0.20, 0.55], [0.05, 0.50],
      [0.03, 0.30]
    ]
  ]
};

MAP_USA.countryDefs = MAP_USA.territories.map(t => ({ code: t.code, nx: t.nx, ny: t.ny }));

window.MAPS = window.MAPS || {};
window.MAPS.USA = MAP_USA;
