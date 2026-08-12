const CURRENT_MAP = {
  // Paleta de Cores: 0 = Neutro, 1 a 6 = Jogadores
  colors: { 
    0: '#94a3b8', // Neutro (Cinza)
    1: '#2563eb', // Jogador 1 (Azul)
    2: '#dc2626', // Jogador 2 (Vermelho)
    3: '#16a34a', // Jogador 3 (Verde)
    4: '#ca8a04', // Jogador 4 (Amarelo)
    5: '#9333ea', // Jogador 5 (Roxo)
    6: '#ea580c'  // Jogador 6 (Laranja)
  },
  aspectRatio: 0.9,
  startTerritoryIndex: 0,

  countryDefs: [
    { code: 'MAR', nx: 0.25, ny: 0.12 }, // Marrocos
    { code: 'ALG', nx: 0.40, ny: 0.15 }, // Argélia
    { code: 'EGI', nx: 0.80, ny: 0.12 }, // Egito
    { code: 'LIB', nx: 0.60, ny: 0.18 }, // Líbia
    { code: 'SEN', nx: 0.10, ny: 0.32 }, // Senegal
    { code: 'NIG', nx: 0.45, ny: 0.35 }, // Nigéria
    { code: 'SUD', nx: 0.72, ny: 0.32 }, // Sudão
    { code: 'ETI', nx: 0.88, ny: 0.38 }, // Etiópia
    { code: 'GAB', nx: 0.42, ny: 0.52 }, // Gabão
    { code: 'CGO', nx: 0.55, ny: 0.55 }, // Congo
    { code: 'QUE', nx: 0.82, ny: 0.52 }, // Quênia
    { code: 'TAN', nx: 0.78, ny: 0.62 }, // Tanzânia
    { code: 'ANG', nx: 0.52, ny: 0.68 }, // Angola
    { code: 'ZAM', nx: 0.65, ny: 0.72 }, // Zâmbia
    { code: 'MOZ', nx: 0.80, ny: 0.75 }, // Moçambique
    { code: 'MAD', nx: 0.92, ny: 0.76 }, // Madagascar
    { code: 'NAM', nx: 0.50, ny: 0.82 }, // Namíbia
    { code: 'RSA', nx: 0.65, ny: 0.90 }  // África do Sul
  ],

  coastlines: [
    [
      [0.20,0.08],[0.50,0.02],[0.85,0.06],[0.98,0.22],
      [0.92,0.38],[0.88,0.48],[0.98,0.70],[0.88,0.85],
      [0.68,0.98],[0.45,0.88],[0.38,0.62],[0.32,0.45],
      [0.05,0.38],[0.02,0.25],[0.15,0.15]
    ],
    // Madagascar
    [
      [0.88,0.68],[0.96,0.68],[0.98,0.82],[0.90,0.85]
    ]
  ]
};
