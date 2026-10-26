// Testes das regras: pontuação, precisão, pausa, tempo, progressão e reinício.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, LEVELS } from '../src/game.js';
const shoot = (game, hit) => { game.fire(); if (hit) game.hit(); };

test('disparo registra tentativa; ponto só entra no impacto posterior', () => {
  const game = new Game();
  game.start(); game.fire();
  assert.equal(game.shots, 1);
  assert.equal(game.score, 0);
  game.hit();
  assert.equal(game.score, 10);
  assert.equal(game.shots, 1);
});

test('acertos valem 10; erros só afetam a precisão', () => {
  const game = new Game();
  game.start();
  shoot(game, false);
  shoot(game, true);
  assert.equal(game.score, 10);
  assert.equal(game.accuracy, 50);
});

test('pausa bloqueia tempo e pontuação; retomar preserva o restante', () => {
  const game = new Game();
  game.start(); game.tick(12); game.pause();
  game.tick(50); shoot(game, true);
  assert.equal(game.remaining, 48);
  assert.equal(game.score, 0);
  game.start(); game.tick(2);
  assert.equal(game.remaining, 46);
});

test('tempo esgotado encerra e rejeita novos pontos', () => {
  const game = new Game();
  game.start(); game.fire(); game.tick(70); game.hit();
  assert.equal(game.remaining, 0);
  assert.equal(game.status, 'finished');
  assert.equal(game.score, 0);
  assert.equal(game.won, false);
});

test('três níveis acumulam 210 pontos e encerram com vitória', () => {
  const game = new Game();
  for (let i = 0; i < LEVELS.length; i++) {
    assert.equal(game.remaining, LEVELS[i].duration);
    game.start();
    for (let hit = 0; hit < LEVELS[i].goal; hit++) shoot(game, true);
    if (i < LEVELS.length - 1) {
      assert.equal(game.status, 'between');
      const score = game.score;
      shoot(game, true); game.tick(99);
      assert.equal(game.score, score);
      game.nextLevel();
      assert.equal(game.levelHits, 0);
    }
  }
  assert.equal(game.score, 210);
  assert.equal(game.status, 'finished');
  assert.equal(game.accuracy, 100);
  assert.equal(game.won, true);
  game.reset();
  assert.equal(game.score, 0);
  assert.equal(game.shots, 0);
  assert.equal(game.levelIndex, 0);
  assert.equal(game.remaining, 60);
});
