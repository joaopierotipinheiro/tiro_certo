// Sistema adicionado: substitui as bolas físicas da base por projéteis de energia.
import * as THREE from 'three';

// Projéteis de energia: viajam a velocidade finita e pontuam no impacto.
// A colisão testa TODO o segmento percorrido, não apenas sua posição final.
export class EnergyBlaster {
  // Recebe a cena e as colisões e prepara recursos compartilhados entre os tiros.
  constructor(scene, camera, worldOctree, targets, onImpact) {
    Object.assign(this, { scene, camera, worldOctree, targets, onImpact });
    this.projectiles = [];
    this.effects = [];
    this.speed = 26;
    this.radius = 0.06;
    this.recoil = 0;
    this.flashTime = 0;
    this.ray = new THREE.Ray();
    this.sphere = new THREE.Sphere(new THREE.Vector3(), this.radius);
    this.ball = new THREE.SphereGeometry(1, 10, 8);
    this.tail = new THREE.ConeGeometry(0.055, 1.1, 8);
    this.tail.rotateX(-Math.PI / 2);
    this.coreMaterial = new THREE.MeshBasicMaterial({ color: 0xd9ffff });
    this.glowMaterial = new THREE.MeshBasicMaterial({ color: 0x2eefff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
    this.tailMaterial = new THREE.MeshBasicMaterial({ color: 0x31ddff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
    this.effectRing = new THREE.RingGeometry(0.7, 1, 24);
    this.makeLauncher();
  }

  // Lançador arcade feito apenas com primitivas, sem modelo externo.
  makeLauncher() {
    const dark = new THREE.MeshStandardMaterial({ color: 0x243844, metalness: 0.6, roughness: 0.35 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9bafb6, metalness: 0.7, roughness: 0.25 });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x55f5ff });
    this.launcher = new THREE.Group();
    this.launcher.position.set(0.24, -0.22, -0.36);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.35), dark);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 12), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.21;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.11), dark);
    grip.position.set(0, -0.12, 0.06);
    grip.rotation.x = -0.25;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.025, 0.22), cyan);
    stripe.position.y = 0.035;
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, -0.34);
    this.flash = new THREE.Mesh(this.ball, this.coreMaterial);
    this.flash.scale.setScalar(0.075);
    this.flash.visible = false;
    this.muzzle.add(this.flash);
    this.launcher.add(body, barrel, grip, stripe, this.muzzle);
    this.camera.add(this.launcher);
    this.scene.add(this.camera);
  }

  // Lança do cano até a direção da mira; verifica obstruções entre câmera e cano.
  fire(aimPoint) {
    this.camera.updateMatrixWorld(true);
    const origin = this.muzzle.getWorldPosition(new THREE.Vector3());
    const eye = this.camera.getWorldPosition(new THREE.Vector3());
    const toMuzzle = origin.clone().sub(eye);
    const gap = toMuzzle.length();
    this.ray.set(eye, toMuzzle.normalize());
    const blocked = this.worldOctree.rayIntersect(this.ray);
    this.recoil = 0.055;
    this.flashTime = 0.07;
    this.flash.visible = true;
    // Se o cano encostar/atravessar uma parede, o tiro termina nela.
    if (blocked && blocked.distance <= gap) {
      this.impact(blocked.position, null);
      return;
    }
    const direction = aimPoint.clone().sub(origin).normalize();
    const mesh = new THREE.Group();
    const core = new THREE.Mesh(this.ball, this.coreMaterial);
    core.scale.setScalar(this.radius);
    const glow = new THREE.Mesh(this.ball, this.glowMaterial);
    glow.scale.setScalar(0.14);
    const trail = new THREE.Mesh(this.tail, this.tailMaterial);
    mesh.add(core, glow, trail);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, trail, direction, age: 0, distance: 0 });
  }

  // Cria faíscas e anel de impacto e informa ao jogo se atingiu um alvo.
  impact(point, target) {
    const group = new THREE.Group();
    group.position.copy(point);
    const material = new THREE.MeshBasicMaterial({ color: target ? 0xbaff68 : 0xffb85c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(this.effectRing, material);
    ring.scale.setScalar(0.08);
    group.add(ring);
    const sparks = [];
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(this.ball, material);
      mesh.scale.setScalar(0.025 + Math.random() * 0.02);
      group.add(mesh);
      const velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.25, Math.random() - 0.5).normalize().multiplyScalar(1.5 + Math.random() * 2);
      sparks.push({ mesh, velocity });
    }
    this.scene.add(group);
    this.effects.push({ group, material, ring, sparks, age: 0 });
    return this.onImpact(target);
  }

  // Retira o tiro da cena e da lista, impedindo novos acertos pelo mesmo projétil.
  remove(projectile) {
    this.scene.remove(projectile.mesh);
    this.projectiles.splice(this.projectiles.indexOf(projectile), 1);
  }

  // Avança o tiro e verifica todo o segmento percorrido, evitando saltar obstáculos.
  update(dt) {
    this.recoil *= Math.exp(-18 * dt);
    this.launcher.position.z = -0.36 + this.recoil;
    this.flashTime -= dt;
    this.flash.visible = this.flashTime > 0;
    this.updateEffects(dt);
    for (const projectile of [...this.projectiles]) {
      const start = projectile.mesh.position;
      const step = projectile.direction.clone().multiplyScalar(this.speed * dt);
      const distance = step.length();
      if (!distance) continue;
      this.ray.set(start, projectile.direction);
      // Contra paredes, testa a linha central; contra alvos, considera a soma dos raios.
      const wall = this.worldOctree.rayIntersect(this.ray);
      let fraction = wall && wall.distance <= distance ? wall.distance / distance : Infinity;
      let targetHit = null;
      for (const target of this.targets) {
        // Movimento relativo: considera também o deslocamento do alvo.
        const previous = target.previousPosition ?? target.group.position;
        const relativeStart = start.clone().sub(previous);
        const relativeStep = step.clone().sub(target.group.position.clone().sub(previous));
        const length = relativeStep.length();
        this.sphere.radius = target.group.scale.x + this.radius;
        let candidate = Infinity;
        if (relativeStart.length() <= this.sphere.radius) candidate = 0;
        else if (length > 0) {
          this.ray.set(relativeStart, relativeStep.normalize());
          const intersection = this.ray.intersectSphere(this.sphere, new THREE.Vector3());
          if (intersection) candidate = relativeStart.distanceTo(intersection) / length;
        }
        // Empate favorece o cenário, impedindo acertar através de paredes.
        if (candidate <= 1 && candidate < fraction) { fraction = candidate; targetHit = target; }
      }
      if (fraction <= 1) {
        const point = start.clone().addScaledVector(step, fraction);
        this.remove(projectile);
        if (this.impact(point, targetHit) === false) { this.clearProjectiles(); break; }
        continue;
      }
      start.add(step);
      projectile.age += dt;
      projectile.distance += distance;
      const length = Math.min(1.1, projectile.distance);
      projectile.trail.scale.z = length / 1.1;
      projectile.trail.position.z = -length / 2;
      if (projectile.age > 3) this.remove(projectile);
    }
  }

  // Move e apaga os efeitos gradualmente, liberando seus materiais ao terminar.
  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.age += dt;
      effect.material.opacity = Math.max(0, 1 - effect.age / 0.4);
      effect.ring.scale.setScalar(0.08 + effect.age * 1.8);
      effect.ring.quaternion.copy(this.camera.quaternion);
      for (const spark of effect.sparks) {
        spark.velocity.y -= dt * 3;
        spark.mesh.position.addScaledVector(spark.velocity, dt);
      }
      if (effect.age >= 0.4) {
        this.scene.remove(effect.group);
        effect.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  // Descarta todos os tiros em voo sem marcar pontos.
  clearProjectiles() {
    for (const projectile of this.projectiles) this.scene.remove(projectile.mesh);
    this.projectiles.length = 0;
  }

  // Remove tiros e efeitos e zera o recuo na troca de fase ou no reinício.
  clear() {
    this.clearProjectiles();
    for (const effect of this.effects) { this.scene.remove(effect.group); effect.material.dispose(); }
    this.effects.length = 0;
    this.flash.visible = false;
    this.flashTime = this.recoil = 0;
    this.launcher.position.z = -0.36;
  }
}
