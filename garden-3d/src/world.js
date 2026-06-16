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
  // Seed shop is to the left of the player's garden
  const seedShop = createBuilding(scene, -14, -2, 0x6b9e5e, 0x3d7a45, '🌱 Seed Shop  [E]');

  // Sell stand is to the right
  const sellStand = createBuilding(scene, 14, -2, 0xcb8a3e, 0x9b5e1c, '💰 Sell Stand [E]');

  const buildings = [seedShop, sellStand];

  return {
    seedShop,
    sellStand,
    collides(x, z) {
      return buildings.some(building => building.collides(x, z));
    },
  };
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
