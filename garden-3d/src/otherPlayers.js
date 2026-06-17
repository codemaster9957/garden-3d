/**
 * otherPlayers.js - Renders remote gardens, remote avatars, and theft targets.
 */

import * as THREE from 'three';
import { createGarden } from './garden.js';

const others = new Map();
const remoteCells = new Map();

export function updateOtherPlayers(scene, allGardens, myPlayerId) {
  const remoteGardens = allGardens.filter(g => g.id !== myPlayerId);
  remoteCells.clear();

  for (const [id, entry] of others) {
    if (!remoteGardens.find(g => g.id === id)) {
      entry.garden.dispose();
      scene.remove(entry.avatar);
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
    entry.avatar.position.set(gData.position?.x ?? origin.x, 0, gData.position?.z ?? origin.z + 5);
    entry.label.textContent = `${gData.id} HP ${gData.health ?? 100}`;
    if (entry.data?.position) {
      entry.avatar.position.set(entry.data.position.x, 0, entry.data.position.z);
    }
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
    holdingStolen: holdingStolen ?? entry.data?.holdingStolen,
  };
  entry.avatar.position.set(position.x, 0, position.z);
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

  scene.add(root);
  return root;
}

function hashColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return 0x3366aa + (hash % 0x777777);
}
