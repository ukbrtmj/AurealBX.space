const MAP_AFRICA = {
  name: 'África',
  colors: { 
    0: '#94a3b8', // Neutro
    1: '#2563eb', // P1
    2: '#dc2626', // P2
    3: '#16a34a', // P3
    4: '#ca8a04', // P4
    5: '#9333ea', // P5
    6: '#ea580c'  // P6
  },
  aspectRatio: 0.9,
  startTerritoryIndex: 0,

  countryDefs: [
    { code: 'MAR', nx: 0.25, ny: 0.12 },
    { code: 'ALG', nx: 0.40, ny: 0.15 },
    { code: 'EGI', nx: 0.80, ny: 0.12 },
    { code: 'LIB', nx: 0.60, ny: 0.18 },
    { code: 'SEN', nx: 0.10, ny: 0.32 },
    { code: 'NIG', nx: 0.45, ny: 0.35 },
    { code: 'SUD', nx: 0.72, ny: 0.32 },
    { code: 'ETI', nx: 0.88, ny: 0.38 },
    { code: 'GAB', nx: 0.42, ny: 0.52 },
    { code: 'CGO', nx: 0.55, ny: 0.55 },
    { code: 'QUE', nx: 0.82, ny: 0.52 },
    { code: 'TAN', nx: 0.78, ny: 0.62 },
    { code: 'ANG', nx: 0.52, ny: 0.68 },
    { code: 'ZAM', nx: 0.65, ny: 0.72 },
    { code: 'MOZ', nx: 0.80, ny: 0.75 },
    { code: 'MAD', nx: 0.92, ny: 0.76 },
    { code: 'NAM', nx: 0.50, ny: 0.82 },
    { code: 'RSA', nx: 0.65, ny: 0.90 }
  ],

  coastlines: [
    [
      [0.20,0.08],[0.50,0.02],[0.85,0.06],[0.98,0.22],
      [0.92,0.38],[0.88,0.48],[0.98,0.70],[0.88,0.85],
      [0.68,0.98],[0.45,0.88],[0.38,0.62],[0.32,0.45],
      [0.05,0.38],[0.02,0.25],[0.15,0.15]
    ],
    [
      [0.88,0.68],[0.96,0.68],[0.98,0.82],[0.90,0.85]
    ]
  ]
};

// Define o mapa padrão global
var CURRENT_MAP = MAP_AFRICA;
