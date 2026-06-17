/**
 * world.js — Static world objects: Seed Shop building and Sell Stand building.
 * Exposes interaction zones checked each frame by main.js.
 */

import * as THREE from 'three';

const INTERACT_RADIUS = 3.5; // how close the player must be (world units)
const BUILDING_W = 3.2;
const BUILDING_D = 2.8;
const COLLISION_PADDING = 0.45;

/**
 * Creates a simple building mesh at (x, z) with a given color and sign text.
 * Returns { mesh, x, z, interactRadius, label }
 */
function createBuilding(scene, x, z, color, accentColor, signText) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Base walls
  const wallGeo = new THREE.BoxGeometry(BUILDING_W, 2.2, BUILDING_D);
  const wallMat = new THREE.MeshLambertMaterial({ color });
  const wall    = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 1.1;
  group.add(wall);

  // Roof (prism)
  const roofGeo = new THREE.ConeGeometry(2.4, 1.2, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const roof    = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 2.8;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  // Door
  const doorGeo = new THREE.BoxGeometry(0.7, 1.2, 0.15);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x5c3518 });
  const door    = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.6, 1.48);
  group.add(door);

  // Sign board above door
  const boardGeo = new THREE.BoxGeometry(2.2, 0.55, 0.12);
  const boardMat = new THREE.MeshLambertMaterial({ color: 0xf5deb3 });
  const board    = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 1.95, 1.48);
  group.add(board);

  // Interaction radius ring (decorative, shown on ground)
  const ringGeo = new THREE.RingGeometry(INTERACT_RADIUS - 0.1, INTERACT_RADIUS, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.08;
  group.add(ring);

  scene.add(group);

  // CSS label for the sign (positioned in DOM by main.js via world-to-screen)
  const label = document.createElement('div');
  label.className   = 'world-label';
  label.textContent = signText;
  document.body.appendChild(label);

  return {
    group,
    x, z,
    interactRadius: INTERACT_RADIUS,
    label,
    /** Returns true when the player is close enough */
    inRange(playerX, playerZ) {
      const dx = playerX - x;
      const dz = playerZ - z;
      return Math.sqrt(dx * dx + dz * dz) <= INTERACT_RADIUS;
    },
    collides(playerX, playerZ) {
      return Math.abs(playerX - x) <= BUILDING_W / 2 + COLLISION_PADDING
        && Math.abs(playerZ - z) <= BUILDING_D / 2 + COLLISION_PADDING;
    },
  };
}

export function createWorld(scene) {
  createDecorations(scene);
  // Seed shop is to the left of the player's garden
  const seedShop = createBuilding(scene, -14, -2, 0x6b9e5e, 0x3d7a45, 'Seed Shop [E]');
  const gearShop = createBuilding(scene, 0, -14, 0x5b6fa6, 0x263b78, 'Gear Shop [E]');

  // Sell stand is to the right
  const sellStand = createBuilding(scene, 14, -2, 0xcb8a3e, 0x9b5e1c, 'Sell Stand [E]');
  const weatherBoard = createBoard(scene, -6, -12, 0x203a5f, 'Weather Board');
  const leaderboard = createBoard(scene, 6, -12, 0x5f3b20, 'Leaderboard');

  const buildings = [seedShop, gearShop, sellStand, weatherBoard, leaderboard];

  return {
    seedShop,
    gearShop,
    sellStand,
    weatherBoard,
    leaderboard,
    collides(x, z) {
      return buildings.some(building => building.collides(x, z));
    },
  };
}

function createBoard(scene, x, z, color, labelText) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x5c3518 });
  const boardMat = new THREE.MeshLambertMaterial({ color });
  const postGeo = new THREE.BoxGeometry(0.18, 1.2, 0.18);
  [-0.8, 0.8].forEach(px => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, 0.6, 0);
    group.add(post);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.16), boardMat);
  board.position.y = 1.45;
  group.add(board);
  scene.add(group);
  const label = document.createElement('div');
  label.className = 'world-label';
  label.textContent = labelText;
  document.body.appendChild(label);
  return {
    group, x, z, label,
    inRange(px, pz) { return Math.hypot(px - x, pz - z) <= INTERACT_RADIUS; },
    collides(px, pz) { return Math.abs(px - x) <= 1.4 && Math.abs(pz - z) <= 0.8; },
  };
}

function createDecorations(scene) {
  const pathMat = new THREE.MeshLambertMaterial({ color: 0x8f7a4f });
  [
    [0, 0, 34, 1.2],
    [0, -8, 1.2, 18],
    [-8, -2, 14, 1.0],
    [8, -2, 14, 1.0],
  ].forEach(([x, z, w, d]) => {
    const path = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), pathMat);
    path.position.set(x, -0.095, z);
    scene.add(path);
  });

  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 24 + (i % 3) * 2.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (i % 4 === 0) createTree(scene, x, z);
    else if (i % 4 === 1) createRock(scene, x, z);
    else if (i % 4 === 2) createFlower(scene, x, z);
    else createFence(scene, x, z, angle);
  }

  createScarecrow(scene, -4, 7);
  createScarecrow(scene, 14, 7);
}

function createTree(scene, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x6b3f1d }));
  trunk.position.set(x, 0.6, z);
  scene.add(trunk);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2f7d32 }));
  leaves.position.set(x, 1.6, z);
  scene.add(leaves);
}

function createRock(scene, x, z) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), new THREE.MeshLambertMaterial({ color: 0x7d7d7d }));
  rock.position.set(x, 0.25, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(rock);
}

function createFlower(scene, x, z) {
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 5), new THREE.MeshLambertMaterial({ color: 0x2d6a4f }));
  stem.position.set(x, 0.18, z);
  scene.add(stem);
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshLambertMaterial({ color: [0xff70a6, 0xffd166, 0x90e0ef][Math.floor(Math.random() * 3)] }));
  bloom.position.set(x, 0.42, z);
  scene.add(bloom);
}

function createFence(scene, x, z, angle) {
  const fence = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.12), new THREE.MeshLambertMaterial({ color: 0x8b5e3c }));
  fence.position.set(x, 0.25, z);
  fence.rotation.y = angle;
  scene.add(fence);
}

function createScarecrow(scene, x, z) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xc48a3a });
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), mat);
  pole.position.set(x, 0.75, z);
  scene.add(pole);
  const arms = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), mat);
  arms.position.set(x, 1.15, z);
  scene.add(arms);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshLambertMaterial({ color: 0xf2c14e }));
  head.position.set(x, 1.65, z);
  scene.add(head);
}

/**
 * Projects a 3D world position to 2D screen pixel coordinates.
 * Used to anchor DOM labels over buildings.
 */
export function worldToScreen(camera, renderer, wx, wz) {
  const vec = new THREE.Vector3(wx, 2.5, wz);
  vec.project(camera);
  const hw = renderer.domElement.clientWidth  / 2;
  const hh = renderer.domElement.clientHeight / 2;
  return {
    x: Math.round(vec.x * hw + hw),
    y: Math.round(-vec.y * hh + hh),
  };
}
