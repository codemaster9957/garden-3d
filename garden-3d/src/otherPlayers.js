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
    setAvatarPet(entry.avatar, gData.activePet);
    applyAvatarCombat(entry.avatar, gData.combat || gData);
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

export function updateRemotePlayerMove(playerId, position, health, holdingStolen, combat = null, activePet = undefined) {
  const entry = others.get(playerId);
  if (!entry) return;
  entry.data = {
    ...entry.data,
    position,
    health: health ?? entry.data?.health,
    holdingStolen: holdingStolen === undefined ? entry.data?.holdingStolen : holdingStolen,
    activePet: activePet === undefined ? entry.data?.activePet : activePet,
    combat: combat || entry.data?.combat,
  };
  moveAvatar(entry.avatar, position.x, position.z);
  setAvatarHeldItem(entry.avatar, entry.data.holdingStolen);
  setAvatarPet(entry.avatar, entry.data.activePet);
  applyAvatarCombat(entry.avatar, entry.data.combat);
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
  if (!avatar.userData.gunEquipped && Math.abs(dx) + Math.abs(dz) > 0.01) {
    avatar.rotation.y = Math.atan2(dx, dz);
  }
  avatar.position.set(x, 0, z);
}

function applyAvatarCombat(avatar, combat = {}) {
  const gunEquipped = !!combat?.gunEquipped;
  avatar.userData.gunEquipped = gunEquipped;
  if (Number.isFinite(combat?.aimAngle)) avatar.rotation.y = combat.aimAngle;
  setAvatarGun(avatar, gunEquipped, combat?.activeWeapon || 'pistol');
}

function setAvatarGun(avatar, equipped, weaponType) {
  const nextKey = equipped ? weaponType : '';
  if (avatar.userData.gunKey === nextKey) return;
  avatar.userData.gunKey = nextKey;
  if (avatar.userData.gunItem) {
    avatar.remove(avatar.userData.gunItem);
    disposeMeshGroup(avatar.userData.gunItem);
    avatar.userData.gunItem = null;
  }
  if (!equipped) return;
  const gun = makeGun(weaponType);
  avatar.userData.gunItem = gun;
  avatar.add(gun);
}

function setAvatarPet(avatar, petType) {
  const nextKey = petType || '';
  if (avatar.userData.petKey === nextKey) return;
  avatar.userData.petKey = nextKey;
  if (avatar.userData.petItem) {
    avatar.remove(avatar.userData.petItem);
    disposeMeshGroup(avatar.userData.petItem);
    avatar.userData.petItem = null;
  }
  if (!petType) return;
  const pet = makePet(petType);
  avatar.userData.petItem = pet;
  avatar.add(pet);
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
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 7), new THREE.MeshLambertMaterial({ color: colors[0] }));
  body.position.y = 0.32;
  body.scale.set(1.15, 0.78, 0.92);
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: colors[0] }));
  head.position.set(0.16, 0.46, 0.08);
  group.add(head);
  const accent = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), new THREE.MeshLambertMaterial({ color: colors[1] }));
  accent.position.set(-0.22, 0.38, -0.03);
  accent.rotation.z = Math.PI / 2.4;
  group.add(accent);
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
