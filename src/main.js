// Adaptação do exemplo oficial games_fps (Three.js r180).
// Mantém o mapa GLB, a câmera FPS e as colisões com Octree + Capsule.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';
// Módulos adicionados: regras da partida, projéteis e construção do hangar.
import { Game, LEVELS } from './game.js';
import { EnergyBlaster } from './projectiles.js';
import { buildArena, DEFAULT_ARENA } from './arenas/index.js';

const $ = (id) => document.getElementById(id);
const game = new Game();
// Base adaptada: cena 3D, neblina e câmera em primeira pessoa.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x182937);
scene.fog = new THREE.Fog(0x182937, 30, 80);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 150);
camera.rotation.order = 'YXZ';

// Cria o renderizador WebGL e informa se o navegador não conseguir iniciá-lo.
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (error) {
  $('message').textContent = 'Não foi possível iniciar o 3D. Use um navegador com WebGL 2 e aceleração gráfica.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('scene').appendChild(renderer.domElement);

// Reúne obstáculos sólidos; Octree e Capsule vêm da estrutura do exemplo original.
const world = new THREE.Group();
scene.add(world);
const worldOctree = new Octree();
const worldMeshes = [];
const player = new Capsule(new THREE.Vector3(), new THREE.Vector3(), 0.35);
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const movement = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
// Guarda teclas pressionadas, alvos ativos e posições válidas para reaparecimento.
const keys = new Set();
const targets = [];
const anchors = [];
let onFloor = false;
let loaded = false;
let nextAnchor = 0;
let motionTime = 0;
let lastFrame = performance.now();
let lastTick = lastFrame;
let lastShot = -Infinity;
let feedbackTimer;
let arenaFloor = -4;
let audio;
const spawn = new THREE.Vector3(0, 0, 0);
const blaster = new EnergyBlaster(scene, camera, worldOctree, targets, handleImpact);

// 1. ARENA: cada tema constrói materiais, fechamento, objetos e iluminação.
// Monta o tema antes de construir as colisões, incluindo teto, caixas e paredes.
function setupArena(map) {
  const arena = buildArena(DEFAULT_ARENA, { scene, world, map, renderer });
  arenaFloor = arena.floor;
  $('arena-name').textContent = arena.name;
  $('arena-description').textContent = arena.description;
  // Construir a Octree só depois de incluir teto, paredes, vigas e caixas.
  world.updateMatrixWorld(true);
  worldOctree.fromGraphNode(world);
  world.traverse((object) => { if (object.isMesh) worldMeshes.push(object); });
}

// Seleciona posições sobre superfícies do mapa, com espaço para a trajetória.
function findAnchors(map) {
  const down = new THREE.Raycaster();
  const probe = new THREE.Sphere(new THREE.Vector3(), 0.85);
  for (let x = -10; x <= 14; x += 4) {
    for (let z = -10; z <= 14; z += 4) {
      if (Math.hypot(x, z) < 4) continue;
      down.set(new THREE.Vector3(x, 15, z), new THREE.Vector3(0, -1, 0));
      const hit = down.intersectObject(map, true)[0];
      if (!hit || hit.face.normal.y < 0.7) continue;
      const position = hit.point.clone().add(new THREE.Vector3(0, 1.6, 0));
      let clear = true;
      // A maior amplitude e o maior raio garantem folga nos três níveis.
      for (let offset = -0.85; offset <= 0.86; offset += 0.17) {
        probe.center.copy(position).add(new THREE.Vector3(offset, 0, 0));
        if (worldOctree.sphereIntersect(probe)) { clear = false; break; }
      }
      if (clear) anchors.push(position);
    }
  }
  anchors.sort((a, b) => a.distanceToSquared(spawn) - b.distanceToSquared(spawn));
  if (anchors.length < 3) throw new Error('Não há espaço suficiente para os alvos no mapa.');
}

// Reposiciona o jogador e zera sua velocidade ao iniciar, reiniciar ou mudar de nível.
function resetPlayer() {
  player.start.copy(spawn).add(new THREE.Vector3(0, 0.35, 0));
  player.end.copy(spawn).add(new THREE.Vector3(0, 1.6, 0));
  velocity.set(0, 0, 0);
  camera.position.copy(player.end);
  camera.rotation.set(0, 0, 0);
  keys.clear();
  onFloor = false;
}

// 2. JOGADOR: aceleração, gravidade, pulo e colisões em cinco subpassos.
// Adapta os controles e a física da base: movimento, gravidade, pulo e colisões.
function updatePlayer(dt) {
  camera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();
  const side = new THREE.Vector3().crossVectors(direction, camera.up);
  movement.set(0, 0, 0);
  if (keys.has('KeyW')) movement.add(direction);
  if (keys.has('KeyS')) movement.sub(direction);
  if (keys.has('KeyD')) movement.add(side);
  if (keys.has('KeyA')) movement.sub(side);
  // Normalizar evita que andar na diagonal seja mais rápido.
  if (movement.lengthSq()) movement.normalize();
  velocity.addScaledVector(movement, dt * (onFloor ? 25 : 8));
  if (onFloor && keys.has('Space')) { velocity.y = 11; onFloor = false; }
  velocity.x *= Math.exp(-4 * dt);
  velocity.z *= Math.exp(-4 * dt);
  velocity.y -= 30 * dt;
  player.translate(movement.copy(velocity).multiplyScalar(dt));
  onFloor = false;
  for (let i = 0; i < 3; i++) {
    const collision = worldOctree.capsuleIntersect(player);
    if (!collision) break;
    if (collision.normal.y > 0.5) onFloor = true;
    const inwardSpeed = velocity.dot(collision.normal);
    if (inwardSpeed < 0) velocity.addScaledVector(collision.normal, -inwardSpeed);
    player.translate(collision.normal.multiplyScalar(collision.depth));
  }
  camera.position.copy(player.end);
  if (camera.position.y < arenaFloor - 5) resetPlayer();
}

// 3. ALVOS: esferas coloridas com anéis; apenas a esfera recebe o disparo.
const targetGeometry = new THREE.SphereGeometry(1, 24, 16);
const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff653b, emissive: 0x8d200b, emissiveIntensity: 0.35, roughness: 0.45 });
const ringGeometry = new THREE.TorusGeometry(0.63, 0.07, 8, 40);
const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xfff5dd });

// Escolhe a próxima origem livre e registra a posição anterior do alvo.
function placeTarget(target) {
  // Alvos ativos nunca compartilham a mesma posição de origem.
  for (let attempt = 0; attempt < anchors.length; attempt++) {
    const index = nextAnchor++ % anchors.length;
    if (targets.some((other) => other !== target && other.anchorIndex === index)) continue;
    target.anchorIndex = index;
    target.base = anchors[index];
    target.phase = index * 1.7;
    target.group.position.copy(target.base);
    target.previousPosition = target.group.position.clone();
    break;
  }
}

// Limpa a fase anterior e cria três alvos com o tamanho definido pelo nível.
function createTargets() {
  blaster.clear();
  for (const target of targets) scene.remove(target.group);
  targets.length = 0;
  nextAnchor = 0;
  motionTime = 0;
  for (let i = 0; i < 3; i++) {
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(targetGeometry, targetMaterial);
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.z = 0.8;
    group.add(sphere, ring);
    group.scale.setScalar(game.level.radius);
    scene.add(group);
    const target = { group, sphere, anchorIndex: -1 };
    sphere.userData.target = target;
    targets.push(target);
    placeTarget(target);
  }
  updateTargets(0);
}

// Usa seno para oscilar os alvos e mantém os anéis voltados para a câmera.
function updateTargets(dt) {
  motionTime += dt;
  for (const target of targets) {
    target.previousPosition.copy(target.group.position);
    target.group.position.copy(target.base);
    target.group.position.x += Math.sin(motionTime * game.level.speed + target.phase) * game.level.amplitude;
    target.group.lookAt(camera.position);
  }
}

// 4. DISPAROS: a mira orienta o lançamento. Pontos só entram no impacto.
// Substitui as bolas da base: a mira orienta o projétil, mas ainda não concede pontos.
function shoot() {
  if (game.status !== 'running' || document.pointerLockElement !== renderer.domElement) return;
  updateTimer();
  if (game.status !== 'running') return;
  const now = performance.now();
  if (now - lastShot < 220) return;
  lastShot = now;
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster.intersectObjects([...worldMeshes, ...targets.map((t) => t.sphere)], false)[0];
  const aimPoint = hit ? hit.point : raycaster.ray.at(80, new THREE.Vector3());
  game.fire();
  blaster.fire(aimPoint);
  tone(210, 0.07);
  refreshHUD();
}

// Soma pontos somente no impacto válido e verifica se o nível terminou.
function handleImpact(target) {
  if (game.status !== 'running') return false;
  if (!target) { tone(100, 0.04); return true; }
  game.hit();
  tone(760, 0.12);
  clearTimeout(feedbackTimer);
  $('feedback').textContent = '+10  /  ACERTO';
  $('crosshair').classList.add('hit');
  feedbackTimer = setTimeout(() => { $('feedback').textContent = ''; $('crosshair').classList.remove('hit'); }, 220);
  if (target && game.status === 'running') placeTarget(target);
  refreshHUD();
  if (game.status === 'between' || game.status === 'finished') showPanel();
  return game.status === 'running';
}

// 5. INTERFACE, TEMPO E ESTADOS: o relógio usa tempo real e pausa com Esc.
// Atualiza nível, pontos, acertos e tempo nos elementos HTML do placar.
function refreshHUD() {
  $('level').textContent = `${String(game.levelIndex + 1).padStart(2, '0')} / 03`;
  $('score').textContent = String(game.score).padStart(3, '0');
  $('hits').textContent = `${game.levelHits} / ${game.level.goal}`;
  $('time').textContent = `${Math.ceil(game.remaining)}s`;
  $('time').classList.toggle('urgent', game.remaining <= 10);
}

// Desconta tempo real, separado do passo limitado da simulação física.
function updateTimer() {
  const now = performance.now();
  game.tick((now - lastTick) / 1000);
  lastTick = now;
  if (game.status === 'finished' && $('overlay').hidden) showPanel();
}

// Exibe pausa, intervalo entre níveis ou resultado final e libera o cursor.
function showPanel() {
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  $('overlay').hidden = false;
  $('result').hidden = true;
  const status = game.status;
  if (status === 'paused') {
    $('title').textContent = 'PAUSA.';
    $('description').textContent = 'Respire, ajuste a mira e continue de onde parou.';
    $('message').textContent = 'O tempo está pausado.';
    $('play').textContent = 'Continuar →';
  } else if (status === 'between') {
    $('title').textContent = 'NÍVEL CONCLUÍDO.';
    const next = LEVELS[game.levelIndex + 1];
    $('description').textContent = `Próximo: ${next.name}. Acerte ${next.goal} alvos em ${next.duration} segundos.`;
    $('message').textContent = `Pontuação acumulada: ${game.score} pontos.`;
    $('play').textContent = 'Próximo nível →';
  } else if (status === 'finished') {
    $('title').textContent = game.won ? 'MISSÃO CUMPRIDA.' : 'TEMPO ESGOTADO.';
    $('description').textContent = game.won ? 'Você completou os três níveis da arena.' : 'O cronômetro zerou. Tente novamente para completar os três níveis.';
    $('result').hidden = false;
    $('result').textContent = `Score final: ${game.score} pontos · Acertos: ${game.totalHits} · Disparos: ${game.shots} · Precisão: ${game.accuracy}%`;
    $('message').textContent = `Nível alcançado: ${game.levelIndex + 1} de ${LEVELS.length}.`;
    $('play').textContent = 'Jogar novamente →';
  }
  $('play').focus();
}

// Gera efeitos sonoros com Web Audio, respeitando a opção de som do usuário.
function tone(frequency, duration) {
  if (!$('sound').checked || !audio || audio.state !== 'running') return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  gain.gain.setValueAtTime(0.06, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

// Prepara início, retomada ou próxima fase e solicita a captura do mouse.
$('play').addEventListener('click', async () => {
  if (!loaded) return;
  if (game.status === 'finished') { game.reset(); resetPlayer(); createTargets(); }
  if (game.status === 'between') { game.nextLevel(); resetPlayer(); createTargets(); }
  // Áudio opcional: uma falha de áudio não impede iniciar o jogo.
  if ($('sound').checked) {
    try { audio ??= new AudioContext(); audio.resume().catch(() => {}); } catch { /* Som indisponível. */ }
  }
  try { await renderer.domElement.requestPointerLock(); }
  catch { $('message').textContent = 'O navegador bloqueou o mouse. Clique novamente em Iniciar/Continuar.'; }
});

// Adapta o Pointer Lock da base para iniciar/retomar o jogo e pausar com Esc.
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === renderer.domElement) {
    if (game.status === 'ready') resetPlayer();
    blaster.launcher.visible = true;
    game.start();
    lastTick = lastFrame = performance.now();
    lastShot = -Infinity;
    $('overlay').hidden = true;
    $('result').hidden = true;
  } else if (game.status === 'running') {
    updateTimer();
    game.pause();
    showPanel();
  }
});
// Mostra uma orientação se o navegador recusar a captura do mouse.
document.addEventListener('pointerlockerror', () => {
  $('message').textContent = 'Não foi possível capturar o mouse. Clique no botão para tentar novamente.';
});
// Gira a câmera com o mouse e limita a inclinação vertical.
document.addEventListener('mousemove', (event) => {
  if (game.status !== 'running' || document.pointerLockElement !== renderer.domElement) return;
  camera.rotation.y -= event.movementX / 500;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - event.movementY / 500, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
});
// Registra WASD e Espaço somente durante a partida.
document.addEventListener('keydown', (event) => {
  if (game.status !== 'running') return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
renderer.domElement.addEventListener('mousedown', (event) => { if (event.button === 0) shoot(); });
// Pausa ao perder foco e limpa teclas para evitar movimento involuntário.
function pauseOnBlur() {
  keys.clear();
  if (game.status !== 'running') return;
  updateTimer();
  game.pause();
  showPanel();
}
window.addEventListener('blur', pauseOnBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnBlur(); });
// Mantém câmera e canvas proporcionais ao tamanho da janela.
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

// Carrega o GLB original, constrói o hangar, prepara alvos e libera o botão inicial.
async function init() {
  try {
    // Resolve o modelo pela localização deste módulo, inclusive em subpastas do site.
    const modelURL = new URL('../assets/models/collision-world.glb', import.meta.url);
    const gltf = await new GLTFLoader().loadAsync(modelURL.href);
    world.add(gltf.scene);
    setupArena(gltf.scene);
    findAnchors(gltf.scene);
    resetPlayer();
    createTargets();
    // Vista de apresentação; o jogador só é posicionado ao entrar na arena.
    camera.position.set(-4, 3, 9);
    camera.lookAt(5, 2, -8);
    blaster.launcher.visible = false;
    updateTargets(0);
    loaded = true;
    $('message').textContent = 'Nível 1: acerte 5 alvos em 60 segundos.';
    $('play').disabled = false;
    $('play').textContent = 'Entrar na arena →';
    refreshHUD();
  } catch (error) {
    $('message').textContent = 'Falha ao carregar a arena. Abra com o Live Server e confira a pasta models. Detalhes no console (F12).';
    console.error(error);
  }
}

// Mantém cinco subpassos da base; atualiza jogador, alvos e tiros apenas em jogo.
renderer.setAnimationLoop(() => {
  const now = performance.now();
  // A física limita o passo; o cronômetro acima usa todo o tempo decorrido.
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (loaded && game.status === 'running') {
    updateTimer();
    if (game.status === 'running') {
      for (let step = 0; step < 5 && game.status === 'running'; step++) {
        updatePlayer(dt / 5);
        updateTargets(dt / 5);
        blaster.update(dt / 5);
      }
    }
    refreshHUD();
  }
  renderer.render(scene, camera);
});
init();
