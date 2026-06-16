/**
 * main.js — Garden Bloom 3D entry point.
 * Wires together: network, scene, garden, UI, input.
 */

import './style.css';
import * as THREE       from 'three';
import { initScene, getScene, getCamera, getRenderer, updatePointer, raycastCells, renderFrame, setCameraTarget } from './scene.js';
import { createGarden } from './garden.js';
import { createPlayer } from './player.js';
import { createWorld } from './world.js';
import { buildHUD, initHotbar, initKeyboard, updateMoney, updateSeeds, updateCrops, updateShop, updateSellCrops, updateExpansion, setConnectionStatus, showToast, getSelectedSeed, isHarvestMode, openShopModal, openSellModal, buildShopModal, buildSellModal, setInteractHint } from './ui.js';
import { updateOtherPlayers } from './otherPlayers.js';
import * as Net from './network.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const { scene } = initScene(canvas);

buildHUD();
initHotbar();
initKeyboard();
buildShopModal();
buildSellModal();

// My garden (centered)
let myGarden = null;
// All cell meshes for raycasting (only my own garden is interactive)
let myCellMeshes = [];
let player = null;
let world  = null;

// ─── Network ──────────────────────────────────────────────────────────────────
setConnectionStatus(false, null);

Net.onMessage('connected',    ()  => setConnectionStatus(true,  Net.getPlayerId()));
Net.onMessage('disconnected', ()  => { setConnectionStatus(false, null); showToast('Disconnected from server', 'error'); });
Net.onMessage('connectionError', () => showToast('Cannot reach server', 'error'));

Net.onMessage('welcome', (msg) => {
  setConnectionStatus(true, msg.playerId);

  world = createWorld(scene);

  // Build local player and garden
  const gridSize = msg.state.gridSize || 3;
  player       = createPlayer(scene);
  myGarden     = createGarden(scene, 0, 0, gridSize);
  myCellMeshes = [...myGarden.cellMap.keys()];
  const pos     = player.getPosition();
  setCameraTarget(pos.x, pos.z);

  myGarden.update(msg.state.plots);
  updateMoney(msg.state.money);
  updateSeeds(msg.state.seeds);
  updateCrops(msg.state.crops);
  updateSellCrops(msg.state.crops, msg.shop.catalog);
  updateExpansion(msg.state.expansionLevel, msg.state.gridSize);
  updateShop(msg.shop.catalog, msg.shop.stock, msg.shop.cropPrices, msg.shop.restockCount);

  // Render other players already online
  updateOtherPlayers(scene, msg.allGardens, msg.playerId);
});

Net.onMessage('stateUpdate', (msg) => {
  if (!myGarden) return;
  
  // Check if garden was expanded
  if (msg.state.gridSize && msg.state.gridSize !== myGarden.gridSize) {
    // Remove old garden and create new one with new size
    myGarden.dispose();
    myGarden = createGarden(scene, 0, 0, msg.state.gridSize);
    myCellMeshes = [...myGarden.cellMap.keys()];
    showToast('🌱 Garden expanded!', 'success');
  }
  
  myGarden.update(msg.state.plots);
  updateMoney(msg.state.money);
  updateSeeds(msg.state.seeds);
  updateCrops(msg.state.crops);
  updateSellCrops(msg.state.crops);
  updateExpansion(msg.state.expansionLevel, msg.state.gridSize);
});

Net.onMessage('gardensUpdate', (msg) => {
  if (!Net.getPlayerId()) return;
  updateOtherPlayers(scene, msg.gardens, Net.getPlayerId());
  // Also re-render our own garden from the broadcast
  const mine = msg.gardens.find(g => g.id === Net.getPlayerId());
  if (mine && myGarden) myGarden.update(mine.plots);
});

Net.onMessage('shopRestocked', (msg) => {
  updateShop(null, msg.stock, null, msg.restockCount);
});

Net.onMessage('cropPricesChanged', (msg) => {
  showToast('Crop sell market changed!', 'info');
  updateShop(null, null, msg.prices, msg.restockCount);
});

Net.onMessage('sold', (msg) => {
  showToast(`💰 Sold crops for +${msg.earned}!`, 'success');
});

Net.onMessage('error', (msg) => {
  showToast(`⚠️ ${msg.message}`, 'error');
});

Net.onMessage('playerJoined', (msg) => {
  showToast(`👤 ${msg.playerId} joined`, 'info');
});

Net.onMessage('playerLeft', (msg) => {
  showToast(`👋 ${msg.playerId} left`, 'info');
});

// Connect to server
Net.connect().catch(() => {
  setConnectionStatus(false, null);
  showToast('Could not connect to server — make sure it is running on port 3000', 'error');
});

// ─── Input ────────────────────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  Net.disconnect();
});

canvas.addEventListener('click', (event) => {
  if (!myGarden || !Net.isConnected()) return;

  updatePointer(event, canvas);
  const hits = raycastCells(myCellMeshes);
  if (!hits.length) return;

  const hit       = hits[0].object;
  const cellInfo  = myGarden.cellMap.get(hit);
  if (!cellInfo) return;

  const { plotId, row, col } = cellInfo;

  if (isHarvestMode()) {
    Net.harvestPlant(plotId, row, col);
  } else {
    const seed = getSelectedSeed();
    if (seed) Net.plantSeed(plotId, row, col, seed);
  }
});

// ─── World interaction / E key ─────────────────────────────────────────────────
window.addEventListener('keydown', (event) => {
  if (event.key !== 'e' && event.key !== 'E') return;
  if (!player || !world) return;
  const { x, z } = player.getPosition();
  if (world.seedShop.inRange(x, z)) {
    openShopModal();
  } else if (world.sellStand.inRange(x, z)) {
    openSellModal();
  }
});

function updateWorldUI() {
  if (!player || !world) return;
  const { x, z } = player.getPosition();
  let hint = null;
  if (world.seedShop.inRange(x, z)) hint = 'Press E to open Seed Shop';
  else if (world.sellStand.inRange(x, z)) hint = 'Press E to open Sell Stand';
  setInteractHint(hint);
}

let lastFrameTime = performance.now();
function loop() {
  const now = performance.now();
  const dt  = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;

  if (player) {
    player.update(dt, world?.collides);
    const pos = player.getPosition();
    setCameraTarget(pos.x, pos.z);
    updateWorldUI();
  }

  requestAnimationFrame(loop);
  renderFrame();
}
loop();
