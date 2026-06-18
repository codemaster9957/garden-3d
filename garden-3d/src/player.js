/**
 * player.js — Local player character: capsule body + WASD movement.
 * The camera target is driven from here. Exports proximity helpers.
 */

import * as THREE from 'three';
import { SEED_CATALOG, plantColor } from './seeds.js';

const SPEED        = 7.0;   // units per second
const BODY_COLOR   = 0x4cc9f0;
const HEAD_COLOR   = 0xffe0b2;
const SHADOW_COLOR = 0x000000;

export function createPlayer(scene) {
  const root = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.75, 0.35);
  const bodyMat = new THREE.MeshLambertMaterial({ color: BODY_COLOR });
  const body    = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.65;
  root.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  const headMat = new THREE.MeshLambertMaterial({ color: HEAD_COLOR });
  const head    = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.27;
  root.add(head);

  // Shadow blob
  const shadowGeo = new THREE.CircleGeometry(0.32, 10);
  const shadowMat = new THREE.MeshBasicMaterial({ color: SHADOW_COLOR, transparent: true, opacity: 0.22 });
  const shadow    = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.09;
  root.add(shadow);

  scene.add(root);
  let heldItem = null;
  let gunMesh = null;
  let petMesh = null;
  let gunEquipped = false;
  let gunKey = '';
  let petKey = '';

  // ── Input state ──────────────────────────────────────────────────────────
  const keys = { w: false, a: false, s: false, d: false,
                 ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

  window.addEventListener('keydown', e => { if (e.key in keys) { keys[e.key] = true;  e.preventDefault(); } });
  window.addEventListener('keyup',   e => { if (e.key in keys) { keys[e.key] = false; } });

  let facingAngle = 0; // radians, Y-axis

  function update(dt, collides = null, cameraYaw = Math.PI) {
    let inputX = 0, inputZ = 0;
    if (keys.w || keys.ArrowUp)    inputZ += 1;
    if (keys.s || keys.ArrowDown)  inputZ -= 1;
    if (keys.a || keys.ArrowLeft)  inputX -= 1;
    if (keys.d || keys.ArrowRight) inputX += 1;

    let dx = 0, dz = 0;
    if (inputX !== 0 || inputZ !== 0) {
      const inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
      inputX /= inputLen; inputZ /= inputLen;

      const forwardX = -Math.sin(cameraYaw);
      const forwardZ = -Math.cos(cameraYaw);
      const rightX = -Math.cos(cameraYaw);
      const rightZ = Math.sin(cameraYaw);
      dx = rightX * inputX + forwardX * inputZ;
      dz = rightZ * inputX + forwardZ * inputZ;
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len; dz /= len;
      const moveX = dx * SPEED * dt;
      const moveZ = dz * SPEED * dt;
      const nextX = root.position.x + moveX;
      const nextZ = root.position.z + moveZ;
      if (!collides || !collides(nextX, nextZ)) {
        root.position.x = nextX;
        root.position.z = nextZ;
      } else {
        const xOnly = root.position.x + moveX;
        const zOnly = root.position.z + moveZ;
        if (!collides(xOnly, root.position.z)) root.position.x = xOnly;
        if (!collides(root.position.x, zOnly)) root.position.z = zOnly;
      }
      if (!gunEquipped) {
        facingAngle = Math.atan2(dx, dz);
        root.rotation.y = facingAngle;
      }
    }

    // Subtle body bob
    body.position.y = 0.65 + Math.sin(Date.now() * 0.007) * (inputX !== 0 || inputZ !== 0 ? 0.04 : 0);
    head.position.y = 1.27 + Math.sin(Date.now() * 0.007) * (inputX !== 0 || inputZ !== 0 ? 0.04 : 0);
  }

  function getPosition() {
    return { x: root.position.x, z: root.position.z };
  }

  function setPosition(x, z) {
    root.position.x = x;
    root.position.z = z;
  }

  function setHeldItem(item) {
    if (heldItem) {
      root.remove(heldItem);
      disposeMeshGroup(heldItem);
      heldItem = null;
    }
    if (!item?.seedType) return;
    heldItem = makeHeldCrop(item);
    root.add(heldItem);
  }

  function setGunEquipped(equipped, weaponType = 'pistol') {
    const nextKey = equipped ? weaponType : '';
    if (gunKey === nextKey) {
      gunEquipped = !!equipped;
      return;
    }
    gunKey = nextKey;
    gunEquipped = !!equipped;
    if (gunMesh) {
      root.remove(gunMesh);
      disposeMeshGroup(gunMesh);
      gunMesh = null;
    }
    if (!gunEquipped) return;
    gunMesh = makeGun(weaponType);
    root.add(gunMesh);
  }

  function setAimAngle(angle) {
    if (!Number.isFinite(angle)) return;
    facingAngle = angle;
    root.rotation.y = facingAngle;
  }

  function setPet(petType) {
    const nextKey = petType || '';
    if (petKey === nextKey) return;
    petKey = nextKey;
    if (petMesh) {
      root.remove(petMesh);
      disposeMeshGroup(petMesh);
      petMesh = null;
    }
    if (!petType) return;
    petMesh = makePet(petType);
    root.add(petMesh);
  }

  /** Distance from player to a world-space point */
  function distanceTo(wx, wz) {
    const dx = root.position.x - wx;
    const dz = root.position.z - wz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  return { root, update, getPosition, setPosition, setHeldItem, setGunEquipped, setAimAngle, setPet, distanceTo };
}

function makeGun(weaponType) {
  const group = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x20242a });
  const metal = new THREE.MeshLambertMaterial({ color: weaponType === 'minigun' ? 0x666c74 : 0x3b4652 });
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.2), dark);
  stock.position.set(0.22, 0.84, 0.3);
  group.add(stock);

  const barrelLength = weaponType === 'shotgun' ? 0.72 : weaponType === 'minigun' ? 0.82 : 0.56;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, barrelLength, 8), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.28, 0.9, 0.58);
  group.add(barrel);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.08), dark);
  handle.position.set(0.23, 0.72, 0.35);
  group.add(handle);

  if (weaponType === 'minigun') {
    for (let i = 0; i < 3; i++) {
      const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.76, 6), metal);
      mini.rotation.x = Math.PI / 2;
      mini.position.set(0.28 + (i - 1) * 0.06, 0.96, 0.6);
      group.add(mini);
    }
  }

  return group;
}

function makePet(petType) {
  const colors = {
    gardenBee: [0xffd166, 0x2f2518],
    sproutPup: [0x9b6a3c, 0x52b788],
    moonCat: [0x403d58, 0xcdb4db],
    emberFox: [0xff7a33, 0xffd166],
  }[petType] || [0xffffff, 0x52b788];

  const group = new THREE.Group();
  group.position.set(-0.78, 0, 0.38);

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 7),
    new THREE.MeshLambertMaterial({ color: colors[0], emissive: petType === 'moonCat' ? colors[1] : 0x000000, emissiveIntensity: petType === 'moonCat' ? 0.18 : 0 })
  );
  body.position.y = 0.32;
  body.scale.set(1.15, 0.78, 0.92);
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: colors[0] }));
  head.position.set(0.16, 0.46, 0.08);
  group.add(head);

  if (petType === 'gardenBee') {
    [-0.16, 0.16].forEach(x => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 5), new THREE.MeshBasicMaterial({ color: 0xdff7ff, transparent: true, opacity: 0.55 }));
      wing.position.set(x, 0.42, -0.02);
      wing.scale.set(0.7, 0.18, 1);
      group.add(wing);
    });
  } else {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), new THREE.MeshLambertMaterial({ color: colors[1] }));
    tail.position.set(-0.22, 0.38, -0.03);
    tail.rotation.z = Math.PI / 2.4;
    group.add(tail);
  }

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  return group;
}

function makeHeldCrop(item) {
  const info = SEED_CATALOG[item.seedType] || {};
  const color = plantColor(item.seedType, 4, 4, item.quality, item.mutationName) || info.color || 0xffd166;
  const group = new THREE.Group();
  group.position.set(0, 0.95, 0.58);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 8),
    new THREE.MeshLambertMaterial({
      color,
      emissive: color,
      emissiveIntensity: item.mutationName || item.quality === 'Gold' || item.quality === 'Rainbow' ? 0.38 : 0.12,
    })
  );
  glow.scale.y = item.quality === 'Giant' ? 1.35 : 1;
  group.add(glow);

  const leaf = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.22, 5),
    new THREE.MeshLambertMaterial({ color: info.stemColor || 0x52b788 })
  );
  leaf.position.set(0, 0.25, 0);
  leaf.rotation.x = Math.PI;
  group.add(leaf);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.025, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.5 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  return group;
}

function disposeMeshGroup(group) {
  group.traverse(obj => {
    if (obj.isMesh) {
      obj.geometry?.dispose();
      obj.material?.dispose();
    }
  });
}
