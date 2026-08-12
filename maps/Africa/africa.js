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

  // Territórios expandidos (33) para comportar até 6 jogadores com bom espaçamento
  countryDefs: [
    { code: 'MAR', nx: 0.25, ny: 0.10 },
    { code: 'TUN', nx: 0.52, ny: 0.06 },
    { code: 'ALG', nx: 0.38, ny: 0.16 },
    { code: 'LIB', nx: 0.60, ny: 0.16 },
    { code: 'EGI', nx: 0.82, ny: 0.12 },
    { code: 'MAU', nx: 0.08, ny: 0.22 },
    { code: 'MLI', nx: 0.24, ny: 0.26 },
    { code: 'NER', nx: 0.42, ny: 0.22 },
    { code: 'CHA', nx: 0.58, ny: 0.26 },
    { code: 'SUD', nx: 0.72, ny: 0.28 },
    { code: 'ERI', nx: 0.85, ny: 0.30 },
    { code: 'SEN', nx: 0.06, ny: 0.34 },
    { code: 'GUI', nx: 0.14, ny: 0.40 },
    { code: 'COI', nx: 0.20, ny: 0.46 },
    { code: 'GHA', nx: 0.28, ny: 0.42 },
    { code: 'NIG', nx: 0.40, ny: 0.38 },
    { code: 'CAM', nx: 0.48, ny: 0.44 },
    { code: 'RCA', nx: 0.58, ny: 0.42 },
    { code: 'ETI', nx: 0.88, ny: 0.40 },
    { code: 'SOM', nx: 0.96, ny: 0.46 },
    { code: 'GAB', nx: 0.40, ny: 0.54 },
    { code: 'CGO', nx: 0.52, ny: 0.56 },
    { code: 'UGA', nx: 0.72, ny: 0.46 },
    { code: 'QUE', nx: 0.82, ny: 0.52 },
    { code: 'TAN', nx: 0.78, ny: 0.62 },
    { code: 'ANG', nx: 0.50, ny: 0.68 },
    { code: 'ZAM', nx: 0.63, ny: 0.70 },
    { code: 'MOZ', nx: 0.80, ny: 0.74 },
    { code: 'MAD', nx: 0.92, ny: 0.76 },
    { code: 'ZIM', nx: 0.62, ny: 0.80 },
    { code: 'NAM', nx: 0.47, ny: 0.82 },
    { code: 'BOT', nx: 0.57, ny: 0.85 },
    { code: 'RSA', nx: 0.62, ny: 0.93 }
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
