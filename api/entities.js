class Territory {
  constructor(id, code, x, y) {
    this.id = id;
    this.code = code;
    this.x = x;
    this.y = y;
    this.owner = 0; // 0 = Neutro, 1 = Jogador
    this.troops = 15;
    this.pulseAnim = 0;
    this.impactAnim = 0;
  }
}

class Particle {
  constructor(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 35;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 0.35;
    this.maxLife = 0.35;
    this.color = color;
    this.size = 2.5 + Math.random() * 2;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
}
