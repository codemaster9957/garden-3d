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

  // ── Input state ──────────────────────────────────────────────────────────
  const keys = { w: false, a: false, s: false, d: false,
                 ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

  window.addEventListener('keydown', e => { if (e.key in keys) { keys[e.key] = true;  e.preventDefault(); } });
  window.addEventListener('keyup',   e => { if (e.key in keys) { keys[e.key] = false; } });

  let facingAngle = 0; // radians, Y-axis

  function update(dt, collides = null) {
    let dx = 0, dz = 0;
    if (keys.w || keys.ArrowUp)    dz -= 1;
    if (keys.s || keys.ArrowDown)  dz += 1;
    if (keys.a || keys.ArrowLeft)  dx -= 1;
    if (keys.d || keys.ArrowRight) dx += 1;

    if (dx !== 0 || dz !== 0) {
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
      // Face direction of travel
      facingAngle = Math.atan2(dx, dz);
      root.rotation.y = facingAngle;
    }

    // Subtle body bob
    body.position.y = 0.65 + Math.sin(Date.now() * 0.007) * (dx !== 0 || dz !== 0 ? 0.04 : 0);
    head.position.y = 1.27 + Math.sin(Date.now() * 0.007) * (dx !== 0 || dz !== 0 ? 0.04 : 0);
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

  /** Distance from player to a world-space point */
  function distanceTo(wx, wz) {
    const dx = root.position.x - wx;
    const dz = root.position.z - wz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  return { root, update, getPosition, setPosition, setHeldItem, distanceTo };
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
