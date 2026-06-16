/**
 * garden.js — Renders one player's garden: 1 expandable plot (3×3 to 6×6).
 * Plants are rendered with per-seed colors and per-stage sizes.
 * Returns cellMap (mesh → {plotId, row, col, playerId}) for proximity interaction.
 */

import * as THREE from 'three';
import { CELL_SIZE, PLOT_GAP } from './scene.js';
import { plantColor, SEED_CATALOG } from './seeds.js';

// Shared geometry for soil cells (never changes shape)
const CELL_GEO = new THREE.BoxGeometry(CELL_SIZE * 0.92, 0.12, CELL_SIZE * 0.92);
const GRID_MAT = new THREE.LineBasicMaterial({ color: 0x3d2010, transparent: true, opacity: 0.7 });
const SOIL_COLOR = 0x7a4f2e;
const PAD_COLOR  = 0x5c3518;

/** World-space offset of a specific cell by row and col (stable across expansions) */
export function cellWorldOffset(row, col, gridSize) {
  const CELL_SIZE = 1.2; // import from scene.js instead
  return {
    x: (col - (gridSize - 1) / 2) * CELL_SIZE,
    z: (row - (gridSize - 1) / 2) * CELL_SIZE,
  };
}

export function createGarden(scene, originX = 0, originZ = 0, gridSize = 3) {
  const cellMap     = new Map();   // mesh → { plotId, row, col, playerId }
  const plantMeshes = {};          // `${plotId}_${row}_${col}` → THREE.Group
  const root        = new THREE.Group();
  root.position.set(originX, 0, originZ);
  scene.add(root);

  // ── Build static soil cells ─────────────────────────────────────────────
  
  // Raised plot pad
  const padGeo = new THREE.BoxGeometry(
    gridSize * CELL_SIZE + 0.2,
    0.08,
    gridSize * CELL_SIZE + 0.2
  );
  const pad = new THREE.Mesh(padGeo, new THREE.MeshLambertMaterial({ color: PAD_COLOR }));
  pad.position.set(0, -0.07, 0);
  root.add(pad);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const { x, z } = cellWorldOffset(row, col, gridSize);

      const mat  = new THREE.MeshLambertMaterial({ color: SOIL_COLOR });
      const mesh = new THREE.Mesh(CELL_GEO, mat);
      mesh.position.set(x, 0, z);
      root.add(mesh);
      cellMap.set(mesh, { plotId: 0, row, col });

      // Grid lines
      const edges = new THREE.EdgesGeometry(CELL_GEO);
      mesh.add(new THREE.LineSegments(edges, GRID_MAT));
    }
  }

  // ── Update plant visuals from server state ───────────────────────────────
  function update(plots) {
    if (!plots) return;

    for (const plot of plots) {
      for (const cell of plot.cells) {
        const key = `${plot.id}_${cell.row}_${cell.col}`;
        const { x, z } = cellWorldOffset(cell.row, cell.col, gridSize);

        // Always remove the old plant group
        if (plantMeshes[key]) {
          root.remove(plantMeshes[key]);
          disposeMeshGroup(plantMeshes[key]);
          delete plantMeshes[key];
        }

        if (!cell.plant) continue;

        const { seedType, stage, mutated } = cell.plant;
        const maxStages = 4;
        const ratio     = stage / (maxStages - 1);
        const isReady   = stage >= maxStages - 1;

        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // ── Stem ────────────────────────────────────────────────────────
        const stemH   = 0.08 + ratio * 0.45;
        const stemW   = 0.10 + ratio * 0.08;
        const stemGeo = new THREE.BoxGeometry(stemW, stemH, stemW);
        const stemMat = new THREE.MeshLambertMaterial({
          color: plantColor(seedType, stage, maxStages),
        });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = stemH / 2 + 0.06;
        group.add(stem);

        // ── Fruit / head (only at stage 2+ and at full bloom) ──────────
        if (stage >= 2) {
          const fruitSize = 0.15 + ratio * 0.22;
          const fruitColor = SEED_CATALOG[seedType]?.color ?? 0xffffff;

          let fruitGeo;
          switch (seedType) {
            case 'tomato':
            case 'blueberry':
            case 'strawberry':
            case 'radish':
              fruitGeo = new THREE.SphereGeometry(fruitSize, 7, 7);
              break;
            case 'pumpkin':
            case 'watermelon':
              fruitGeo = new THREE.SphereGeometry(fruitSize * 1.2, 7, 5);
              break;
            case 'sunflower':
              fruitGeo = new THREE.CylinderGeometry(fruitSize * 1.3, fruitSize, fruitSize * 0.4, 8);
              break;
            default: // carrot — small pointed shape
              fruitGeo = new THREE.ConeGeometry(fruitSize * 0.7, fruitSize * 1.6, 6);
              break;
          }

          const fruitMat = new THREE.MeshLambertMaterial({
            color: fruitColor,
            emissive: isReady ? fruitColor : 0x000000,
            emissiveIntensity: isReady ? 0.18 : 0,
          });
          const fruit = new THREE.Mesh(fruitGeo, fruitMat);
          fruit.position.y = stemH + fruitSize * 0.9 + 0.06;
          group.add(fruit);

          // ── Mutation sparkle ring ────────────────────────────────────
          if (mutated) {
            const ringGeo = new THREE.TorusGeometry(fruitSize * 1.6, 0.04, 6, 12);
            const ringMat = new THREE.MeshLambertMaterial({ color: 0xcc44ff, emissive: 0x9900cc, emissiveIntensity: 0.6 });
            const ring    = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = fruit.position.y;
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
          }
        }

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

  return { root, cellMap, update, dispose, originX, originZ, gridSize };
}

function disposeMeshGroup(group) {
  group.traverse(obj => {
    if (obj.isMesh) {
      obj.geometry?.dispose();
      obj.material?.dispose();
    }
  });
}
