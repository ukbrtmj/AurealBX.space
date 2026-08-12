const MAP_AFRICA = {
  name: 'África',
  colors: { 
    0: '#64748b', // Neutro
    1: '#2563eb', // P1 - Azul
    2: '#dc2626', // P2 - Vermelho
    3: '#16a34a', // P3 - Verde
    4: '#ca8a04', // P4 - Amarelo
    5: '#9333ea', // P5 - Roxo
    6: '#ea580c'  // P6 - Laranja
  },
  aspectRatio: 0.95,
  startTerritoryIndex: 0,

  countryDefs: [
    { code: 'MAR', nx: 0.22, ny: 0.12 },
    { code: 'ALG', nx: 0.42, ny: 0.12 },
    { code: 'TUN', nx: 0.52, ny: 0.08 },
    { code: 'LIB', nx: 0.64, ny: 0.14 },
    { code: 'EGI', nx: 0.82, ny: 0.12 },
    { code: 'MAU', nx: 0.12, ny: 0.25 },
    { code: 'MLI', nx: 0.30, ny: 0.26 },
    { code: 'NER', nx: 0.48, ny: 0.27 },
    { code: 'CHA', nx: 0.64, ny: 0.28 },
    { code: 'SUD', nx: 0.80, ny: 0.27 },
    { code: 'SEN', nx: 0.08, ny: 0.36 },
    { code: 'GHA', nx: 0.32, ny: 0.42 },
    { code: 'NGA', nx: 0.46, ny: 0.42 },
    { code: 'CMR', nx: 0.56, ny: 0.48 },
    { code: 'ETI', nx: 0.88, ny: 0.36 },
    { code: 'SOM', nx: 0.94, ny: 0.46 },
    { code: 'GAB', nx: 0.48, ny: 0.58 },
    { code: 'CGO', nx: 0.60, ny: 0.58 },
    { code: 'KEN', nx: 0.82, ny: 0.52 },
    { code: 'TZA', nx: 0.78, ny: 0.64 },
    { code: 'ANG', nx: 0.56, ny: 0.72 },
    { code: 'ZAM', nx: 0.68, ny: 0.75 },
    { code: 'MOZ', nx: 0.80, ny: 0.78 },
    { code: 'AFS', nx: 0.62, ny: 0.90 }
  ],

  coastlines: [
    [
      [0.20, 0.05], [0.55, 0.05], [0.85, 0.08], [0.95, 0.20],
      [0.98, 0.45], [0.85, 0.60], [0.82, 0.82], [0.65, 0.96],
      [0.55, 0.96], [0.45, 0.78], [0.42, 0.55], [0.25, 0.46],
      [0.05, 0.38], [0.05, 0.22], [0.20, 0.05]
    ]
  ]
};

const CURRENT_MAP = MAP_AFRICA;
