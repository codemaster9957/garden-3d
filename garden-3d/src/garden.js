/**
 * garden.js - Renders one player's garden and crop visuals.
 * The server owns growth state; this file only turns that state into meshes.
 */

import * as THREE from 'three';
import { CELL_SIZE } from './scene.js';
import { plantColor, SEED_CATALOG } from './seeds.js';

const CELL_GEO = new THREE.BoxGeometry(CELL_SIZE * 0.92, 0.12, CELL_SIZE * 0.92);
const GRID_MAT = new THREE.LineBasicMaterial({ color: 0x2d170b, transparent: true, opacity: 0.58 });
const SOIL_COLOR = 0x8a5a34;
const PAD_COLOR = 0x5c3518;
const TREE_SEEDS = new Set(['goldenApple', 'dragonfruit', 'shadowDragonfruit']);
const BUSH_SEEDS = new Set(['strawberry', 'blueberry', 'frostBerry', 'crystalBlueberry', 'bountyFruit']);
const LARGE_FRUIT_SEEDS = new Set(['pumpkin', 'watermelon', 'crystalMelon', 'goldenPumpkin', 'kingCrop']);
const FLOWER_SEEDS = new Set(['moonflower', 'rainLily', 'loudBloom']);
const ROOT_SEEDS = new Set(['carrot', 'rainbowCarrot', 'potato', 'stormroot', 'thiefVine']);
const PEPPER_SEEDS = new Set(['pepper', 'emberPepper']);
const TALL_SEEDS = new Set(['wheat', 'sunburstCorn']);
const MUSHROOM_SEEDS = new Set(['mooncapMushroom']);

export function cellWorldOffset(row, col, gridSize) {
  const spacing = 1.2;
  return {
    x: (col - (gridSize - 1) / 2) * spacing,
    z: (row - (gridSize - 1) / 2) * spacing,
  };
}

export function createGarden(scene, originX = 0, originZ = 0, gridSize = 3, options = {}) {
  const cellMap = new Map();
  const plantMeshes = {};
  const cellState = new Map();
  const root = new THREE.Group();
  root.position.set(originX, 0, originZ);
  scene.add(root);

  const padGeo = new THREE.BoxGeometry(gridSize * CELL_SIZE + 0.2, 0.08, gridSize * CELL_SIZE + 0.2);
  const pad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: PAD_COLOR, roughness: 0.9 }));
  pad.position.set(0, -0.07, 0);
  pad.receiveShadow = true;
  root.add(pad);

  if (options.highlight) {
    root.add(makePlotHighlight(gridSize));
  }

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const { x, z } = cellWorldOffset(row, col, gridSize);
      const mesh = new THREE.Mesh(CELL_GEO, new THREE.MeshStandardMaterial({ color: SOIL_COLOR, roughness: 0.96 }));
      mesh.position.set(x, 0, z);
      mesh.receiveShadow = true;
      root.add(mesh);
      cellMap.set(mesh, { plotId: 0, row, col });
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(CELL_GEO), GRID_MAT));
    }
  }

  function update(plots) {
    if (!plots) return;

    for (const plot of plots) {
      for (const cell of plot.cells) {
        const key = `${plot.id}_${cell.row}_${cell.col}`;
        const { x, z } = cellWorldOffset(cell.row, cell.col, gridSize);
        cellState.set(key, cell);

        if (plantMeshes[key]) {
          root.remove(plantMeshes[key]);
          disposeMeshGroup(plantMeshes[key]);
          delete plantMeshes[key];
        }

        if (!cell.plant) continue;

        const group = makePlantGroup(cell.plant);
        group.position.set(x, 0, z);
        setShadowCasting(group);
        root.add(group);
        plantMeshes[key] = group;
      }
    }
  }

  function dispose() {
    scene.remove(root);
    for (const key of Object.keys(plantMeshes)) {
      disposeMeshGroup(plantMeshes[key]);
    }
  }

  function getCellData(plotId, row, col) {
    return cellState.get(`${plotId}_${row}_${col}`);
  }

  return { root, cellMap, update, dispose, getCellData, originX, originZ, gridSize };
}

function plantMaterial(options) {
  return new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, ...options });
}

function makePlotHighlight(gridSize) {
  const size = gridSize * 1.2 + 0.42;
  const thickness = 0.055;
  const mat = new THREE.MeshBasicMaterial({ color: 0x75ff8a, transparent: true, opacity: 0.48 });
  const group = new THREE.Group();
  const horizontal = new THREE.BoxGeometry(size, 0.035, thickness);
  const vertical = new THREE.BoxGeometry(thickness, 0.035, size);
  [
    [horizontal, 0, size / 2, 0],
    [horizontal, 0, -size / 2, 0],
    [vertical, size / 2, 0, 0],
    [vertical, -size / 2, 0, 0],
  ].forEach(([geo, x, z]) => {
    const edge = new THREE.Mesh(geo, mat);
    edge.position.set(x, 0.025, z);
    group.add(edge);
  });
  return group;
}

function makePlantGroup(plant) {
  const group = new THREE.Group();
  const seedType = plant.seedType;
  const info = SEED_CATALOG[seedType] || {};
  const maxStages = info.stages ?? 4;
  const stage = plant.stage ?? 0;
  const progressRatio = Number.isFinite(plant.progress) ? plant.progress : stage / Math.max(maxStages - 1, 1);
  const ratio = clamp(progressRatio, 0, 1);
  const isReady = ratio >= 0.995 || !!plant.quality;
  const quality = plant.quality || 'Normal';
  const qualityScale = quality === 'Giant' ? 1.55 : quality === 'Rainbow' ? 1.22 : quality === 'Gold' ? 1.14 : 1;
  const fruitColor = plantColor(seedType, maxStages - 1, maxStages, quality, plant.mutationName);
  const leafColor = info.stemColor || 0x2d6a4f;

  if (TREE_SEEDS.has(seedType)) {
    addTreePlant(group, seedType, ratio, isReady, qualityScale, leafColor, fruitColor, plant);
  } else if (BUSH_SEEDS.has(seedType)) {
    addBushPlant(group, seedType, ratio, isReady, qualityScale, leafColor, fruitColor, plant);
  } else if (MUSHROOM_SEEDS.has(seedType)) {
    addMushroomPlant(group, ratio, isReady, qualityScale, fruitColor, plant);
  } else {
    addFieldPlant(group, seedType, ratio, isReady, qualityScale, leafColor, fruitColor, plant);
  }

  addRareEffects(group, seedType, isReady, quality, plant.mutated || !!plant.mutationName, fruitColor);
  return group;
}

function addTreePlant(group, seedType, ratio, isReady, qualityScale, leafColor, fruitColor, plant) {
  const trunkHeight = (0.55 + ratio * 0.55) * Math.min(qualityScale, 1.25);
  const trunkMat = plantMaterial({ color: 0x6b3f1d });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.2, trunkHeight, 8),
    trunkMat
  );
  trunk.position.y = trunkHeight / 2 + 0.06;
  trunk.rotation.z = 0.04;
  group.add(trunk);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.28;
    const branchLength = (0.28 + ratio * 0.24) * qualityScale;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.065, branchLength, 6),
      trunkMat
    );
    branch.position.set(
      Math.cos(angle) * branchLength * 0.3,
      trunkHeight * (0.58 + (i % 2) * 0.16),
      Math.sin(angle) * branchLength * 0.3
    );
    branch.rotation.z = Math.PI / 2.8;
    branch.rotation.y = -angle;
    group.add(branch);
  }

  const canopySize = (0.38 + ratio * 0.42) * qualityScale;
  const canopyMat = plantMaterial({
    color: seedType === 'shadowDragonfruit' ? 0x19351f : leafColor,
    emissive: plant.mutationName ? 0x1d5c2b : 0x000000,
    emissiveIntensity: plant.mutationName ? 0.16 : 0,
  });
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(canopySize * 0.82, 1), canopyMat);
  canopy.position.y = trunkHeight + canopySize * 0.68;
  canopy.scale.set(1.08, 0.84, 1);
  group.add(canopy);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.35;
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(canopySize * (i % 2 ? 0.42 : 0.5), 1), canopyMat);
    puff.position.set(
      Math.cos(angle) * canopySize * 0.5,
      canopy.position.y - 0.08 + (i % 3) * canopySize * 0.1,
      Math.sin(angle) * canopySize * 0.48
    );
    puff.scale.set(1.1, 0.72, 0.95);
    group.add(puff);
  }

  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(canopySize * 0.44, 1), canopyMat);
  top.position.y = canopy.position.y + canopySize * 0.46;
  top.scale.set(0.9, 0.72, 0.9);
  group.add(top);

  if (ratio > 0.52) {
    addFruitCluster(group, fruitColor, isReady ? 7 : 3, isReady ? 0.105 : 0.055, canopy.position.y, canopySize * 0.72, qualityScale, isReady);
  }
}

function addBushPlant(group, seedType, ratio, isReady, qualityScale, leafColor, fruitColor) {
  const bushSize = (0.28 + ratio * 0.34) * qualityScale;
  const bushMat = plantMaterial({ color: leafColor });
  const darkMat = plantMaterial({ color: darkenColor(leafColor, 0.78) });

  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + (i % 2) * 0.16;
    const ring = i < 6 ? 0.5 : 0.22;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(bushSize * (i < 6 ? 0.36 : 0.3), 1), i % 3 === 0 ? darkMat : bushMat);
    leaf.position.set(
      Math.cos(angle) * bushSize * ring,
      0.2 + ratio * 0.22 + (i % 3) * 0.035,
      Math.sin(angle) * bushSize * ring
    );
    leaf.scale.set(1.2, 0.62, 0.92);
    leaf.rotation.y = angle;
    group.add(leaf);
  }

  const center = new THREE.Mesh(new THREE.IcosahedronGeometry(bushSize * 0.62, 1), bushMat);
  center.position.y = 0.28 + ratio * 0.22;
  center.scale.set(1.15, 0.76, 1.05);
  group.add(center);

  addLeaves(group, 6, bushSize * 1.05, 0.18 + ratio * 0.08, bushSize * 0.55, darkenColor(leafColor, 0.9));

  if (ratio > 0.48) {
    const fruitCount = isReady ? (seedType === 'strawberry' ? 8 : 9) : 4;
    addFruitCluster(group, fruitColor, fruitCount, isReady ? 0.085 : 0.045, center.position.y + 0.08, bushSize * 0.72, qualityScale, isReady);
  }
}

function addMushroomPlant(group, ratio, isReady, qualityScale, fruitColor, plant) {
  const stemHeight = (0.18 + ratio * 0.28) * qualityScale;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, stemHeight, 8),
    plantMaterial({ color: 0xe7d8bf })
  );
  stem.position.y = stemHeight / 2 + 0.06;
  group.add(stem);

  const capSize = (0.18 + ratio * 0.28) * qualityScale;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(capSize, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    plantMaterial({
      color: fruitColor,
      emissive: isReady ? fruitColor : 0x000000,
      emissiveIntensity: plant.mutationName ? 0.32 : isReady ? 0.12 : 0,
    })
  );
  cap.position.y = stemHeight + 0.08;
  group.add(cap);
}

function addFieldPlant(group, seedType, ratio, isReady, qualityScale, leafColor, fruitColor, plant) {
  const baseColor = plantColor(seedType, Math.max(0, Math.round(ratio * 2)), 4, plant.quality, plant.mutationName);
  addLeaves(group, 4 + Math.round(ratio * 4), 0.34 + ratio * 0.16, 0.12 + ratio * 0.08, 0.35 + ratio * 0.15, leafColor);

  if (TALL_SEEDS.has(seedType)) {
    addTallCrop(group, ratio, isReady, qualityScale, fruitColor);
    return;
  }

  if (FLOWER_SEEDS.has(seedType)) {
    addFlowerCrop(group, ratio, isReady, qualityScale, leafColor, fruitColor, plant);
    return;
  }

  const stemHeight = (0.12 + ratio * 0.52) * qualityScale;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055 + ratio * 0.03, 0.075 + ratio * 0.035, stemHeight, 7),
    plantMaterial({ color: baseColor })
  );
  stem.position.y = stemHeight / 2 + 0.08;
  group.add(stem);

  if (ratio < 0.42) return;

  if (LARGE_FRUIT_SEEDS.has(seedType)) {
    addGroundFruit(group, seedType, ratio, isReady, qualityScale, fruitColor, plant);
  } else if (ROOT_SEEDS.has(seedType)) {
    addRootCrop(group, seedType, ratio, isReady, qualityScale, fruitColor, stemHeight, plant);
  } else if (PEPPER_SEEDS.has(seedType) || seedType === 'tomato' || seedType === 'giantTomato') {
    addHangingFruit(group, seedType, ratio, isReady, qualityScale, fruitColor, stemHeight, plant);
  } else {
    addTopFruit(group, seedType, ratio, isReady, qualityScale, fruitColor, stemHeight, plant);
  }
}

function addTallCrop(group, ratio, isReady, qualityScale, fruitColor) {
  const stalkCount = 3;
  for (let i = 0; i < stalkCount; i++) {
    const offset = (i - 1) * 0.13;
    const height = (0.38 + ratio * 0.55) * qualityScale;
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, height, 6),
      plantMaterial({ color: 0x6a994e })
    );
    stalk.position.set(offset, height / 2 + 0.06, Math.abs(offset) * 0.4);
    group.add(stalk);

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 + ratio * 0.055, 0.28 + ratio * 0.18, 6),
      plantMaterial({
        color: fruitColor,
        emissive: isReady ? fruitColor : 0x000000,
        emissiveIntensity: isReady ? 0.16 : 0,
      })
    );
    head.position.set(offset, height + 0.2, Math.abs(offset) * 0.4);
    group.add(head);
  }
}

function addFlowerCrop(group, ratio, isReady, qualityScale, leafColor, fruitColor, plant) {
  const stemHeight = (0.22 + ratio * 0.48) * qualityScale;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, stemHeight, 7),
    plantMaterial({ color: leafColor })
  );
  stem.position.y = stemHeight / 2 + 0.08;
  group.add(stem);

  const bloomSize = (0.16 + ratio * 0.18) * qualityScale;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(bloomSize * 0.44, 7, 5),
      plantMaterial({
        color: fruitColor,
        emissive: isReady || plant.mutationName ? fruitColor : 0x000000,
        emissiveIntensity: plant.mutationName ? 0.4 : isReady ? 0.18 : 0,
      })
    );
    petal.position.set(Math.cos(angle) * bloomSize * 0.5, stemHeight + bloomSize, Math.sin(angle) * bloomSize * 0.5);
    petal.scale.set(1.2, 0.65, 0.9);
    group.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(bloomSize * 0.38, 8, 5), plantMaterial({ color: 0xffd166 }));
  center.position.y = stemHeight + bloomSize;
  group.add(center);
}

function addGroundFruit(group, seedType, ratio, isReady, qualityScale, fruitColor, plant) {
  const fruitSize = (0.2 + ratio * 0.28) * qualityScale;
  const geo = seedType === 'crystalMelon'
    ? new THREE.DodecahedronGeometry(fruitSize * 1.05, 1)
    : new THREE.SphereGeometry(fruitSize * 1.12, 12, 8);
  const fruit = new THREE.Mesh(geo, readyMaterial(fruitColor, isReady, plant));
  fruit.position.y = fruitSize * 0.72 + 0.06;
  fruit.scale.set(1.18, 0.82, 1.03);
  group.add(fruit);
}

function addRootCrop(group, seedType, ratio, isReady, qualityScale, fruitColor, stemHeight, plant) {
  const size = (0.14 + ratio * 0.22) * qualityScale;
  const geo = seedType === 'potato'
    ? new THREE.DodecahedronGeometry(size, 0)
    : new THREE.ConeGeometry(size * 0.72, size * 1.55, 7);
  const root = new THREE.Mesh(geo, readyMaterial(fruitColor, isReady, plant));
  root.position.y = seedType === 'potato' ? 0.18 : stemHeight + size * 0.6;
  if (seedType !== 'potato') root.rotation.x = Math.PI;
  group.add(root);
}

function addHangingFruit(group, seedType, ratio, isReady, qualityScale, fruitColor, stemHeight, plant) {
  const count = isReady ? (seedType === 'giantTomato' ? 3 : 4) : 2;
  const size = (seedType === 'giantTomato' ? 0.2 : 0.13) + ratio * 0.12;
  const fruitSize = size * qualityScale;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.35;
    const geo = PEPPER_SEEDS.has(seedType)
      ? new THREE.ConeGeometry(fruitSize * 0.62, fruitSize * 1.42, 7)
      : new THREE.SphereGeometry(fruitSize, 10, 7);
    const fruit = new THREE.Mesh(geo, readyMaterial(fruitColor, isReady, plant));
    fruit.position.set(Math.cos(angle) * 0.2, stemHeight * 0.76 + 0.18, Math.sin(angle) * 0.2);
    group.add(fruit);
  }
}

function addTopFruit(group, seedType, ratio, isReady, qualityScale, fruitColor, stemHeight, plant) {
  const fruitSize = (0.15 + ratio * 0.22) * qualityScale;
  const geo = seedType === 'lettuce'
    ? new THREE.DodecahedronGeometry(fruitSize * 1.1, 1)
    : new THREE.SphereGeometry(fruitSize, 10, 7);
  const fruit = new THREE.Mesh(geo, readyMaterial(fruitColor, isReady, plant));
  fruit.position.y = stemHeight + fruitSize * 0.9 + 0.06;
  group.add(fruit);
}

function addFruitCluster(group, color, count, size, centerY, radius, qualityScale, isReady) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.35;
    const ring = i % 3 === 0 ? 0.48 : 0.78;
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(size * qualityScale, 8, 6),
      plantMaterial({
        color,
        emissive: isReady ? color : 0x000000,
        emissiveIntensity: isReady ? 0.18 : 0,
        transparent: !isReady,
        opacity: isReady ? 1 : 0.62,
      })
    );
    fruit.position.set(Math.cos(angle) * radius * ring, centerY + ((i % 2) - 0.5) * radius * 0.25, Math.sin(angle) * radius * ring);
    group.add(fruit);
  }
}

function addLeaves(group, count, radius, y, size, color) {
  const mat = plantMaterial({ color });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(size * 0.18, 8, 4), mat);
    leaf.position.set(Math.cos(angle) * radius * 0.42, y, Math.sin(angle) * radius * 0.42);
    leaf.scale.set(0.55, 0.16, 1.45);
    leaf.rotation.y = angle;
    leaf.rotation.z = 0.18 + (i % 2) * 0.16;
    group.add(leaf);
  }
}

function addRareEffects(group, seedType, isReady, quality, mutated, color) {
  if (!isReady && !mutated) return;
  const needsGlow = mutated || quality === 'Rainbow' || quality === 'Gold' || quality === 'Giant' || (SEED_CATALOG[seedType]?.rarity === 'Mythic');
  if (!needsGlow) return;
  const ringColor = mutated ? 0xcc44ff : quality === 'Gold' ? 0xffd700 : quality === 'Giant' ? 0xff8c00 : color;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.025, 6, 22),
    plantMaterial({ color: ringColor, emissive: ringColor, emissiveIntensity: 0.55 })
  );
  ring.position.y = 0.64;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  for (let i = 0; i < 4; i++) {
    const sparkle = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 4),
      new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.8 })
    );
    const angle = (i / 4) * Math.PI * 2;
    sparkle.position.set(Math.cos(angle) * 0.46, 0.88 + (i % 2) * 0.16, Math.sin(angle) * 0.46);
    group.add(sparkle);
  }
}

function readyMaterial(color, isReady, plant) {
  return plantMaterial({
    color,
    emissive: isReady || plant.mutationName ? color : 0x000000,
    emissiveIntensity: plant.mutationName ? 0.38 : isReady ? 0.16 : 0,
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function darkenColor(color, amount) {
  const c = new THREE.Color(color);
  c.multiplyScalar(amount);
  return c.getHex();
}

function disposeMeshGroup(group) {
  group.traverse(obj => {
    if (obj.isMesh) {
      obj.geometry?.dispose();
      obj.material?.dispose();
    }
  });
}

function setShadowCasting(group) {
  group.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}
