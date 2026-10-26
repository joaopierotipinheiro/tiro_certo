// Tema adicionado sobre o mapa original: materiais, fechamento e decoração orbital.
import * as THREE from 'three';

// Texturas desenhadas em código: nenhuma imagem externa é necessária.
// Transforma um desenho em Canvas 2D em textura para os objetos 3D.
function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Desenha painéis metálicos repetíveis para pisos e paredes.
function panelTexture(deck = false) {
  const texture = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = deck ? '#3b5163' : '#526c7f';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#0b1723'; c.lineWidth = 8;
    c.strokeRect(4, 4, 504, 504);
    c.strokeStyle = deck ? '#506475' : '#667c89'; c.lineWidth = 2;
    c.strokeRect(13, 13, 486, 486);
    c.fillStyle = '#172733';
    c.fillRect(26, 32, 460, 12);
    c.fillRect(26, 468, 460, 10);
    for (const x of [24, 488]) for (const y of [24, 488]) {
      c.fillStyle = '#0b1823'; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7c909c'; c.fillRect(x - 3, y - 1, 6, 2);
    }
    c.fillStyle = '#758791'; c.font = '11px monospace'; c.fillText(deck ? 'DECK / 07' : 'ORION // 07', 35, 459);
    if (deck) {
      c.strokeStyle = '#344a58'; c.lineWidth = 2;
      for (let x = 48; x < 460; x += 22) {
        c.beginPath(); c.moveTo(x, 65); c.lineTo(x - 18, 88); c.stroke();
        c.beginPath(); c.moveTo(x, 413); c.lineTo(x - 18, 436); c.stroke();
      }
    } else {
      c.fillStyle = '#101e2b'; c.fillRect(40, 85, 432, 282);
      c.fillStyle = '#3a5163'; c.fillRect(48, 93, 416, 266);
      c.fillStyle = '#183140';
      for (let y = 280; y < 340; y += 12) c.fillRect(350, y, 95, 5);
      c.fillStyle = '#ffaa4a'; c.fillRect(42, 400, 34, 8);
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// Desenha a vista orbital decorativa; não cria uma abertura na parede.
function spaceTexture() {
  return canvasTexture(1024, 512, (c, w, h) => {
    c.fillStyle = '#030b19'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      const x = ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1 * w;
      const y = ((Math.sin(i * 31.417) * 15731.743) % 1 + 1) % 1 * h;
      c.fillStyle = i % 3 ? '#bcd2e8' : '#5a9abb';
      c.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    const glow = c.createRadialGradient(680, 620, 320, 680, 620, 470);
    glow.addColorStop(0, '#579dd5'); glow.addColorStop(.82, '#214d89'); glow.addColorStop(1, '#030b19');
    c.fillStyle = glow; c.beginPath(); c.arc(680, 620, 470, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.arc(680, 620, 407, 0, Math.PI * 2); c.clip();
    const planet = c.createLinearGradient(250, 240, 900, 560);
    planet.addColorStop(0, '#8bd5ed'); planet.addColorStop(.3, '#2b6c9e'); planet.addColorStop(1, '#091529');
    c.fillStyle = planet; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c8e9e877'; c.lineWidth = 18;
    for (let i = 0; i < 5; i++) {
      c.beginPath(); c.ellipse(610 + i * 30, 440 + i * 32, 330, 30, -.25, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    c.fillStyle = '#a9dceb'; c.font = '14px monospace'; c.fillText('ORION STATION   /   LOW ORBIT', 30, 40);
  });
}

// Mantém todos os triângulos do GLB; troca materiais e coordenadas de textura.
// Personaliza materiais e coordenadas de textura, preservando a forma do GLB.
function restyleMap(map, materials) {
  map.updateMatrixWorld(true);
  const position = new THREE.Vector3();
  map.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const oldGeometry = mesh.geometry;
    const geometry = oldGeometry.index ? oldGeometry.toNonIndexed() : oldGeometry.clone();
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uv = new Float32Array(positions.count * 2);
    geometry.clearGroups();
    for (let i = 0; i < positions.count; i += 3) {
      const nx = normals.getX(i), ny = normals.getY(i), nz = normals.getZ(i);
      const material = ny > .5 ? 0 : ny < -.5 ? 2 : 1;
      geometry.addGroup(i, 3, material);
      for (let vertex = i; vertex < i + 3; vertex++) {
        position.fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld);
        uv[vertex * 2] = (Math.abs(ny) > .5 ? position.x : Math.abs(nx) > Math.abs(nz) ? position.z : position.x) / 3;
        uv[vertex * 2 + 1] = (Math.abs(ny) > .5 ? position.z : position.y) / 3;
      }
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // Agrupa faces do mesmo material para evitar uma chamada de desenho por triângulo.
    const index = [];
    const groups = [...geometry.groups];
    geometry.clearGroups();
    for (let material = 0; material < materials.length; material++) {
      const start = index.length;
      for (const group of groups) if (group.materialIndex === material) {
        index.push(group.start, group.start + 1, group.start + 2);
      }
      geometry.addGroup(start, index.length - start, material);
    }
    geometry.setIndex(index);
    mesh.geometry = geometry;
    const oldMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of oldMaterials) { material.map?.dispose(); material.dispose(); }
    oldGeometry.dispose();
    mesh.material = materials;
    mesh.castShadow = mesh.receiveShadow = true;
  });
}

// Mede o mapa e monta o hangar ao redor dele.
export function buildOrbitalHangar({ scene, world, map, renderer }) {
  const bounds = new THREE.Box3().setFromObject(map);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const width = size.x + 4, depth = size.z + 4;
  const floor = bounds.min.y - .5, ceiling = bounds.max.y + 4;
  const xMin = center.x - width / 2, xMax = center.x + width / 2;
  const zMin = center.z - depth / 2, zMax = center.z + depth / 2;
  const height = ceiling - floor, middleY = (floor + ceiling) / 2;
  const decorations = new THREE.Group(); decorations.name = 'orbital-decorations'; scene.add(decorations);
  world.name = 'arena-collisions';
  scene.background = new THREE.Color(0x091421);
  scene.fog = new THREE.Fog(0x091421, 28, 72);
  const deck = new THREE.MeshStandardMaterial({ map: panelTexture(true), metalness: .28, roughness: .64 });
  const wall = new THREE.MeshStandardMaterial({ map: panelTexture(), metalness: .3, roughness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b4356, metalness: .15, roughness: .65 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3c5367, metalness: .35, roughness: .48 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xd67d2c, metalness: .2, roughness: .55 });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x70e9ff });
  const halo = new THREE.MeshBasicMaterial({ color: 0x1f586a });
  restyleMap(map, [deck, wall, dark]);

  // Cria uma caixa sólida ou decorativa conforme o parâmetro solid.
  function box(dimensions, position, material, solid = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
    mesh.position.set(...position);
    mesh.castShadow = solid; mesh.receiveShadow = solid;
    (solid ? world : decorations).add(mesh);
    return mesh;
  }
  // Alinha uma viga entre dois pontos usando comprimento, centro e rotação.
  function beam(a, b, thickness, material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const mesh = box([thickness, delta.length(), thickness], start.add(end).multiplyScalar(.5).toArray(), material);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  }

  // Fecha a arena com piso de segurança, teto e quatro paredes sólidas.
  box([width + 1, .5, depth + 1], [center.x, floor - .25, center.z], dark);
  box([width + 1, .5, depth + 1], [center.x, ceiling + .25, center.z], dark);
  for (const x of [xMin, xMax]) box([.5, height, depth + 1], [x, middleY, center.z], steel);
  for (const z of [zMin, zMax]) box([width + 1, height, .5], [center.x, middleY, z], steel);

  // Pórticos e nervuras do teto: peças sólidas, incluídas na Octree.
  for (let z = zMin + 3; z < zMax; z += 6) {
    box([width - .6, .38, .42], [center.x, ceiling - .4, z], steel);
    box([width - 6, .04, .24], [center.x, ceiling - .615, z], halo, false);
    box([width - 6, .045, .07], [center.x, ceiling - .64, z], cyan, false);
    for (const [x, sign] of [[xMin + .6, 1], [xMax - .6, -1]]) {
      box([.46, height - .5, .6], [x, middleY - .25, z], dark);
      beam([x, ceiling - 3, z], [x + 3 * sign, ceiling - .5, z], .38, steel);
      box([.035, 2.2, .12], [x + sign * .25, ceiling - 2.7, z], cyan, false);
      box([.52, .3, .64], [x, floor + 2.1, z], orange, false);
    }
  }

  const ray = new THREE.Raycaster();
  // Consulta a altura do piso com um raio vertical sobre o mapa original.
  function floorAt(x, z) {
    ray.set(new THREE.Vector3(x, ceiling - .2, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(map, true)[0];
    return hit && hit.face.normal.y > .9 ? hit.point.y : null;
  }

  // Trechos curtos de guarda-corpo, sem fechar os acessos das escadas.
  for (const [ax, az, bx, bz] of [[-7, -8, -3, -8], [-7, 5, -3, 5], [12, 11, 16, 11]]) {
    const ay = floorAt(ax, az), by = floorAt(bx, bz);
    if (ay === null || by === null || ay < 0 || Math.abs(ay - by) > .05) continue;
    const points = [0, .5, 1].map(t => [ax + (bx - ax) * t, az + (bz - az) * t]);
    if (points.some(([x, z]) => Math.abs((floorAt(x, z) ?? -100) - ay) > .05)) continue;
    for (const [x, z] of points) beam([x, ay, z], [x, ay + .9, z], .055, steel);
    beam([ax, ay + .9, az], [bx, ay + .9, bz], .075, orange);
    beam([ax, ay + .42, az], [bx, ay + .42, bz], .04, steel);
  }

  // Cargas nas bordas: deixa o ponto inicial, escadas e linhas de tiro livres.
  const crateTexture = canvasTexture(512, 512, (c) => {
    c.fillStyle = '#263d51'; c.fillRect(0, 0, 512, 512);
    c.fillStyle = '#102330'; c.fillRect(26, 26, 460, 460);
    c.fillStyle = '#456073'; c.fillRect(44, 44, 424, 424);
    c.fillStyle = '#263d51';
    for (let x = 60; x < 460; x += 60) c.fillRect(x, 54, 24, 400);
    c.fillStyle = '#e19440'; c.fillRect(44, 355, 424, 76);
    c.fillStyle = '#192b37'; c.font = 'bold 30px monospace'; c.fillText('ORION / CARGO', 60, 404);
    c.fillStyle = '#a5c1ca'; c.font = '16px monospace'; c.fillText('07     //     PRESSURIZED', 58, 310);
  });
  const crateMaterial = new THREE.MeshStandardMaterial({ map: crateTexture, roughness: .65, metalness: .25 });
  for (const [x, z, scale] of [[9, -7, 1.4], [-9, -7, 1.4], [10, 3, 1.5], [-9, 8, 1.4], [14, 12, 1.5], [9, 12, 1.4], [-6, 12, 1.4], [-10, 2, 1.4], [6, -11, 1.4], [13, -3, 1.4]]) {
    const ground = floorAt(x, z);
    if (ground === null) continue;
    // Confere apoio nos quatro cantos antes de colocar uma caixa de carga.
    const corners = [-1, 1].flatMap(a => [-1, 1].map(b => floorAt(x + a * scale / 2, z + b * scale / 2)));
    if (corners.some(y => y === null || Math.abs(y - ground) > .1)) continue;
    const crate = box([scale, scale, scale], [x, ground + scale / 2, z], crateMaterial);
    crate.name = 'orbital-cargo';
    for (const sign of [-1, 1]) {
      box([.1, scale + .08, scale + .08], [x + sign * (scale / 2 - .13), ground + scale / 2, z], dark, false);
    }
    box([scale * .5, .035, .08], [x, ground + scale + .02, z], cyan, false);
  }

  // Janelas decorativas sobre paredes sólidas: visão orbital sem abrir a arena.
  const space = new THREE.MeshBasicMaterial({ map: spaceTexture() });
  // Posiciona imagens e molduras sobre paredes, mantendo a colisão por trás.
  function wallDisplay(origin, direction, material, w, h, label) {
    ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction));
    const hit = ray.intersectObject(map, true)[0];
    if (!hit || Math.abs(hit.face.normal.y) > .1) return;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const frame = new THREE.Group();
    frame.position.copy(hit.point).addScaledVector(normal, .045);
    frame.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    frame.add(pane);
    for (const sign of [-1, 1]) {
      const horizontal = new THREE.Mesh(new THREE.BoxGeometry(w + .2, .13, .13), steel);
      horizontal.position.set(0, sign * h / 2, .025); frame.add(horizontal);
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(.13, h, .13), steel);
      vertical.position.set(sign * w / 2, 0, .025); frame.add(vertical);
    }
    const led = new THREE.Mesh(new THREE.BoxGeometry(w - .2, .035, .04), cyan);
    led.position.set(0, -h / 2 + .12, .06); frame.add(led);
    frame.name = label;
    decorations.add(frame);
  }
  for (const z of [-7, 5, 13]) {
    wallDisplay([center.x, 3.8, z], [1, 0, 0], space, 5.2, 2.7, 'orbital-window');
    wallDisplay([center.x, 3.8, z], [-1, 0, 0], space, 5.2, 2.7, 'orbital-window');
  }
  // Desenha a placa de identificação HANGAR 07.
  const signTexture = canvasTexture(1024, 256, (c, w, h) => {
    c.fillStyle = '#0a1c29'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6fe7f5'; c.fillRect(0, 0, 12, h);
    c.font = '20px monospace'; c.fillText('ORION STATION  /  TRAINING DECK', 42, 46);
    c.fillStyle = '#e8f3f8'; c.font = 'bold 70px sans-serif'; c.fillText('HANGAR', 40, 136);
    c.fillStyle = '#ffac50'; c.font = 'bold 110px monospace'; c.fillText('07', 800, 145);
    c.fillStyle = '#6fe7f5'; c.font = '21px monospace'; c.fillText('PRECISION LAB   >>>   SECTOR ACTIVE', 42, 208);
  });
  wallDisplay([0, 3.9, 0], [0, 0, -1], new THREE.MeshBasicMaterial({ map: signTexture }), 7.8, 1.95, 'orbital-sign');

  // Montantes destacados da parede frontal, como portas de um cais de carga.
  for (const x of [-12, -6, 6, 12]) {
    ray.set(new THREE.Vector3(x, 3, 0), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(map, true)[0];
    if (hit && hit.face.normal.z > .9) {
      box([.22, 4.7, .1], [x, 2.9, hit.point.z + .055], dark, false);
      box([.075, .7, .11], [x, 1.4, hit.point.z + .065], orange, false);
      box([.055, 1.1, .11], [x, 4.3, hit.point.z + .065], cyan, false);
    }
  }

  // Linhas de orientação aplicadas sobre trechos planos do mapa original.
  for (const x of [1, 4]) for (let z = -11; z < 13; z += 1.5) {
    const y = floorAt(x, z);
    const ahead = floorAt(x, z + .7);
    if (y !== null && ahead !== null && Math.abs(y - ahead) < .04) {
      box([.045, .012, .65], [x, y + .012, z + .32], cyan, false);
    }
  }

  // Adapta a iluminação da base ao ambiente fechado e acrescenta luzes azuis.
  const fill = new THREE.HemisphereLight(0xd2e7ff, 0x8ba2b7, 3.2); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xc4ddef, .6));
  const key = new THREE.DirectionalLight(0xe5f4ff, 2.5);
  key.position.set(2, 8, 5); key.target.position.set(0, -1, -5);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: .1, far: 70 });
  key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = .03;
  scene.add(key, key.target);
  for (const [x, z] of [[-8, -7], [10, 5], [0, 13]]) {
    const light = new THREE.PointLight(0x5bbcff, 32, 20, 2);
    light.position.set(x, 4, z); scene.add(light);
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Geometria do mundo é estática; sombras só precisam ser calculadas uma vez.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  return { floor, ceiling, bounds, decorations };
}
