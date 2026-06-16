/**
 * scene.js — Three.js scene, orthographic camera, renderer.
 * Camera follows the player character; call setCameraTarget() each frame.
 */

import * as THREE from 'three';

export const CELL_SIZE  = 1.0;
export const PLOT_GAP   = 1.4;   // gap between plots (unused now, kept for compatibility)
export const PLAYER_GAP = 36;    // world-space X distance between players' gardens

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

export function updatePointer(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

export function raycastCells(objects) {
  if (!camera) return [];
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(objects, false);
}

// How many world units the camera shows vertically
const FRUST_H = 16;

let scene, camera, renderer;
// Smooth camera target
const _camTarget = new THREE.Vector3(0, 0, 0);
const _camCurrent = new THREE.Vector3(0, 0, 0);

export function initScene(canvas) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3d7a45);

  // Ground plane (grass texture via color)
  const groundGeo = new THREE.PlaneGeometry(300, 300);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a9c58 });
  const ground    = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.11;
  scene.add(ground);

  // Decorative grass patches
  for (let i = 0; i < 120; i++) {
    const pGeo = new THREE.PlaneGeometry(
      0.3 + Math.random() * 0.5,
      0.3 + Math.random() * 0.5
    );
    const pMat = new THREE.MeshLambertMaterial({ color: 0x3d8c46 });
    const p = new THREE.Mesh(pGeo, pMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(
      (Math.random() - 0.5) * 200,
      -0.10,
      (Math.random() - 0.5) * 200
    );
    scene.add(p);
  }

  const aspect = canvas.clientWidth / canvas.clientHeight;
  camera = new THREE.OrthographicCamera(
    -FRUST_H * aspect, FRUST_H * aspect,
    FRUST_H, -FRUST_H,
    0.1, 500
  );
  camera.position.set(0, 30, 12);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfffbe6, 0.9);
  sun.position.set(8, 20, 10);
  sun.castShadow = true;
  scene.add(sun);

  window.addEventListener('resize', () => onResize(canvas));
  return { scene, camera, renderer };
}

export function getScene()    { return scene; }
export function getCamera()   { return camera; }
export function getRenderer() { return renderer; }

/** Call every frame with the player's world position to smoothly pan the camera. */
export function setCameraTarget(x, z) {
  _camTarget.set(x, 0, z);
}

export function updateCamera() {
  // Smooth follow with lerp
  _camCurrent.lerp(_camTarget, 0.08);
  camera.position.x = _camCurrent.x;
  camera.position.z = _camCurrent.z + 12;
  camera.lookAt(_camCurrent.x, 0, _camCurrent.z);
}

function onResize(canvas) {
  if (!renderer || !camera) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const aspect = w / h;
  camera.left   = -FRUST_H * aspect;
  camera.right  =  FRUST_H * aspect;
  camera.top    =  FRUST_H;
  camera.bottom = -FRUST_H;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

export function renderFrame() {
  updateCamera();
  renderer.render(scene, camera);
}
