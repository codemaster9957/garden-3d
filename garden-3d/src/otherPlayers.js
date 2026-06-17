/**
 * otherPlayers.js - Renders remote gardens, remote avatars, and theft targets.
 */

import * as THREE from 'three';
import { createGarden } from './garden.js';
import { SEED_CATALOG, plantColor } from './seeds.js';

const others = new Map();
const remoteCells = new Map();

export function updateOtherPlayers(scene, allGardens, myPlayerId) {
  const remoteGardens = allGardens.filter(g => g.id !== myPlayerId);
  remoteCells.clear();

  for (const [id, entry] of others) {
    if (!remoteGardens.find(g => g.id === id)) {
      entry.garden.dispose();
      scene.remove(entry.avatar);
      disposeMeshGroup(entry.avatar);
      if (entry.label?.parentNode) entry.label.remove();
      others.delete(id);
    }
  }

  remoteGardens.forEach((gData, idx) => {
    const origin = gData.plotOrigin || { x: (idx + 1) * 18, z: 8 };
    const gridSize = gData.gridSize || 3;

    if (!others.has(gData.id)) {
      const garden = createGarden(scene, origin.x, origin.z, gridSize);
      const label = makeLabel(gData.id);
      const avatar = createRemoteAvatar(scene, gData.id);
      others.set(gData.id, { garden, label, avatar, data: gData });
    }

    const entry = others.get(gData.id);
    if (entry.garden.gridSize !== gridSize) {
      entry.garden.dispose();
      entry.garden = createGarden(scene, origin.x, origin.z, gridSize);
    } else if (entry.garden.originX !== origin.x || entry.garden.originZ !== origin.z) {
      entry.garden.dispose();
      entry.garden = createGarden(scene, origin.x, origin.z, gridSize);
    }

    entry.data = gData;
    moveAvatar(entry.avatar, gData.position?.x ?? origin.x, gData.position?.z ?? origin.z + 5);
    setAvatarHeldItem(entry.avatar, gData.holdingStolen);
    entry.label.textContent = `${gData.id} HP ${gData.health ?? 100}`;
    entry.garden.update(gData.plots);

    for (const mesh of entry.garden.cellMap.keys()) {
      remoteCells.set(mesh, {
        ownerId: gData.id,
        originX: entry.garden.originX,
        originZ: entry.garden.originZ,
        ...entry.garden.cellMap.get(mesh),
      });
    }
  });
}

export function getRemoteCellMeshes() {
  return [...remoteCells.keys()];
}

export function getRemoteCellInfo(mesh) {
  return remoteCells.get(mesh);
}

export function getNearestOtherPlayer(x, z, maxDistance = 12) {
  let best = null;
  for (const [id, entry] of others) {
    const pos = entry.data?.position;
    if (!pos) continue;
    const dx = pos.x - x;
    const dz = pos.z - z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { id, distance, data: entry.data };
    }
  }
  return best;
}

export function updateRemotePlayerMove(playerId, position, health, holdingStolen) {
  const entry = others.get(playerId);
  if (!entry) return;
  entry.data = {
    ...entry.data,
    position,
    health: health ?? entry.data?.health,
    holdingStolen: holdingStolen === undefined ? entry.data?.holdingStolen : holdingStolen,
  };
  moveAvatar(entry.avatar, position.x, position.z);
  setAvatarHeldItem(entry.avatar, entry.data.holdingStolen);
  entry.label.textContent = `${playerId} HP ${entry.data.health ?? 100}`;
}

function makeLabel(playerId) {
  const label = document.createElement('div');
  label.className = 'player-label';
  label.textContent = playerId;
  label.style.left = '50%';
  label.style.top = '10px';
  document.body.appendChild(label);
  return label;
}

function createRemoteAvatar(scene, playerId) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.75, 0.35),
    new THREE.MeshLambertMaterial({ color: hashColor(playerId) })
  );
  body.position.y = 0.65;
  root.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xffe0b2 })
  );
  head.position.y = 1.27;
  root.add(head);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 10),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.09;
  root.add(shadow);

  scene.add(root);
  return root;
}

function moveAvatar(avatar, x, z) {
  const dx = x - avatar.position.x;
  const dz = z - avatar.position.z;
  if (Math.abs(dx) + Math.abs(dz) > 0.01) {
    avatar.rotation.y = Math.atan2(dx, dz);
  }
  avatar.position.set(x, 0, z);
}

function setAvatarHeldItem(avatar, item) {
  const nextKey = item?.seedType ? `${item.seedType}:${item.quality || ''}:${item.mutationName || ''}` : '';
  if (avatar.userData.heldKey === nextKey) return;
  avatar.userData.heldKey = nextKey;
  if (avatar.userData.heldItem) {
    avatar.remove(avatar.userData.heldItem);
    disposeMeshGroup(avatar.userData.heldItem);
    avatar.userData.heldItem = null;
  }
  if (!item?.seedType) return;
  const held = makeHeldCrop(item);
  avatar.userData.heldItem = held;
  avatar.add(held);
}

function makeHeldCrop(item) {
  const info = SEED_CATALOG[item.seedType] || {};
  const color = plantColor(item.seedType, 4, 4, item.quality, item.mutationName) || info.color || 0xffd166;
  const group = new THREE.Group();
  group.position.set(0, 0.95, 0.58);

  const crop = new THREE.Mesh(
    new THREE.SphereGeometry(item.quality === 'Giant' ? 0.34 : 0.26, 12, 8),
    new THREE.MeshLambertMaterial({
      color,
      emissive: color,
      emissiveIntensity: item.mutationName || item.quality === 'Gold' || item.quality === 'Rainbow' ? 0.38 : 0.12,
    })
  );
  group.add(crop);

  const leaf = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.22, 5),
    new THREE.MeshLambertMaterial({ color: info.stemColor || 0x52b788 })
  );
  leaf.position.y = 0.25;
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

function hashColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return 0x3366aa + (hash % 0x777777);
}
