// Regras independentes da cena 3D: facilita entender e testar o jogo.
// Níveis adicionados: duração, meta, tamanho, velocidade e amplitude dos alvos.
export const LEVELS = [
  { name: 'Aquecimento', duration: 60, goal: 5, radius: 0.65, speed: 0, amplitude: 0 },
  { name: 'Em movimento', duration: 50, goal: 7, radius: 0.50, speed: 1.6, amplitude: 0.55 },
  { name: 'Precisão máxima', duration: 40, goal: 9, radius: 0.35, speed: 2.8, amplitude: 0.85 }
];

// Controla regras e estados sem depender da renderização 3D.
export class Game {
  constructor() { this.reset(); }

  // Zera pontuação e estatísticas e prepara o primeiro nível.
  reset() {
    this.levelIndex = 0;
    this.score = 0;
    this.shots = 0;
    this.totalHits = 0;
    this.levelHits = 0;
    this.remaining = LEVELS[0].duration;
    this.status = 'ready';
    this.won = false;
  }

  // Retorna a configuração do nível atual.
  get level() { return LEVELS[this.levelIndex]; }
  // Calcula acertos por disparos em porcentagem; evita divisão por zero.
  get accuracy() { return this.shots ? Math.round(100 * this.totalHits / this.shots) : 0; }

  // Permite iniciar ou retomar, sem reabrir uma partida encerrada.
  start() {
    if (this.status !== 'ready' && this.status !== 'paused') return;
    this.status = 'running';
  }

  // Suspende a partida preservando pontos e tempo restante.
  pause() { if (this.status === 'running') this.status = 'paused'; }

  // Desconta o tempo apenas em jogo e encerra a partida quando ele chega a zero.
  tick(seconds) {
    if (this.status !== 'running') return;
    this.remaining = Math.max(0, this.remaining - Math.max(0, seconds));
    if (this.remaining === 0) this.status = 'finished';
  }

  // Conta a tentativa no lançamento, antes de saber se houve acerto.
  fire() {
    if (this.status !== 'running') return;
    this.shots += 1;
  }

  // Soma 10 pontos no impacto e decide entre continuar, avançar ou vencer.
  hit() {
    if (this.status !== 'running') return;
    this.score += 10;
    this.totalHits += 1;
    this.levelHits += 1;
    if (this.levelHits >= this.level.goal) {
      this.won = this.levelIndex === LEVELS.length - 1;
      this.status = this.won ? 'finished' : 'between';
    }
  }

  // Avança a fase e renova o tempo, mantendo os pontos acumulados.
  nextLevel() {
    if (this.status !== 'between') return;
    this.levelIndex += 1;
    this.levelHits = 0;
    this.remaining = this.level.duration;
    this.status = 'ready';
  }
}
