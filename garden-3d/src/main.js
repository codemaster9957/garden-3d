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
import { SEED_CATALOG } from './seeds.js';
import { buildHUD, initHotbar, initKeyboard, updateMoney, updateSeeds, updateCrops, updateShop, updateSellCrops, updateExpansion, updatePlayerInventory, updateWeather, setConnectionStatus, showToast, getSelectedSeed, isHarvestMode, getSelectedGear, clearSelectedGear, openShopModal, openSellModal, buildShopModal, buildSellModal, setInteractHint } from './ui.js';
import { getNearestOtherPlayer, getRemoteCellInfo, getRemoteCellMeshes, updateOtherPlayers, updateRemotePlayerMove } from './otherPlayers.js';
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
let serverFeatures = {};
let cropHoverHint = null;

// ─── Network ──────────────────────────────────────────────────────────────────
setConnectionStatus(false, null);

Net.onMessage('connected',    ()  => setConnectionStatus(true,  Net.getPlayerId()));
Net.onMessage('disconnected', ()  => { setConnectionStatus(false, null); showToast('Disconnected from server', 'error'); });
Net.onMessage('connectionError', () => showToast('Cannot reach server', 'error'));

Net.onMessage('welcome', (msg) => {
  setConnectionStatus(true, msg.playerId);
  serverFeatures = msg.serverFeatures || {};

  world = createWorld(scene);

  // Build local player and garden
  const gridSize = msg.state.gridSize || 3;
  const plotOrigin = msg.state.plotOrigin || { x: 0, z: 0 };
  player       = createPlayer(scene);
  player.setPosition(msg.state.position?.x ?? plotOrigin.x, msg.state.position?.z ?? plotOrigin.z + 5);
  myGarden     = createGarden(scene, plotOrigin.x, plotOrigin.z, gridSize);
  myCellMeshes = [...myGarden.cellMap.keys()];
  const pos     = player.getPosition();
  setCameraTarget(pos.x, pos.z);

  myGarden.update(msg.state.plots);
  updateMoney(msg.state.money);
  updateSeeds(msg.state.seeds);
  updateCrops(msg.state.crops);
  updatePlayerInventory(msg.state);
  updateSellCrops(msg.state.crops, msg.shop.catalog);
  updateExpansion(msg.state.expansionLevel, msg.state.gridSize);
  updateShop(msg.shop.catalog, msg.shop.stock, msg.shop.cropPrices, msg.shop.restockCount, msg.shop.gearCatalog, msg.shop.nextRestockAt);
  updateWeather(msg.weather);

  // Render other players already online
  updateOtherPlayers(scene, msg.allGardens, msg.playerId);
});

Net.onMessage('stateUpdate', (msg) => {
  if (!myGarden) return;
  
  // Check if garden was expanded
  if (msg.state.gridSize && msg.state.gridSize !== myGarden.gridSize) {
    // Remove old garden and create new one with new size
    const plotOrigin = msg.state.plotOrigin || { x: myGarden.originX, z: myGarden.originZ };
    myGarden.dispose();
    myGarden = createGarden(scene, plotOrigin.x, plotOrigin.z, msg.state.gridSize);
    myCellMeshes = [...myGarden.cellMap.keys()];
    showToast('🌱 Garden expanded!', 'success');
  } else if (msg.state.plotOrigin && (myGarden.originX !== msg.state.plotOrigin.x || myGarden.originZ !== msg.state.plotOrigin.z)) {
    myGarden.dispose();
    myGarden = createGarden(scene, msg.state.plotOrigin.x, msg.state.plotOrigin.z, msg.state.gridSize || myGarden.gridSize);
    myCellMeshes = [...myGarden.cellMap.keys()];
  }
  
  myGarden.update(msg.state.plots);
  updateMoney(msg.state.money);
  updateSeeds(msg.state.seeds);
  updateCrops(msg.state.crops);
  updatePlayerInventory(msg.state);
  updateSellCrops(msg.state.crops);
  updateExpansion(msg.state.expansionLevel, msg.state.gridSize);
  if (msg.state.position && player) {
    const pos = player.getPosition();
    const dx = Math.abs(pos.x - msg.state.position.x);
    const dz = Math.abs(pos.z - msg.state.position.z);
    if (dx > 2 || dz > 2) player.setPosition(msg.state.position.x, msg.state.position.z);
  }
});

Net.onMessage('gardensUpdate', (msg) => {
  if (!Net.getPlayerId()) return;
  updateOtherPlayers(scene, msg.gardens, Net.getPlayerId());
  // Also re-render our own garden from the broadcast
  const mine = msg.gardens.find(g => g.id === Net.getPlayerId());
  if (mine && myGarden) myGarden.update(mine.plots);
});

Net.onMessage('shopRestocked', (msg) => {
  updateShop(null, msg.stock, null, msg.restockCount, null, msg.nextRestockAt);
});

Net.onMessage('cropPricesChanged', (msg) => {
  showToast('Crop sell market changed!', 'info');
  updateShop(null, null, msg.prices, msg.restockCount);
  if (msg.weather) updateWeather(msg.weather);
});

Net.onMessage('weatherChanged', (msg) => {
  updateWeather(msg.weather);
  showToast(`${msg.weather.current}: ${msg.weather.description}`, 'info');
});

Net.onMessage('worldEvent', (msg) => {
  showToast(msg.message, 'info');
});

Net.onMessage('harvestPopup', (msg) => {
  const extra = msg.mutationName ? `${msg.mutationName}!` : `${msg.quality} quality`;
  showToast(`${extra}`, msg.mutationName || msg.quality !== 'Normal' ? 'success' : 'info');
});

Net.onMessage('playerMoved', (msg) => {
  if (msg.playerId !== Net.getPlayerId()) {
    updateRemotePlayerMove(msg.playerId, msg.position, msg.health, msg.holdingStolen);
  }
});

Net.onMessage('gearUsed', (msg) => {
  showToast(`${msg.itemType} active for ${Math.round(msg.durationMs / 1000)}s`, 'success');
});

Net.onMessage('cropStolen', (msg) => {
  const mine = msg.ownerId === Net.getPlayerId();
  showToast(mine ? `${msg.thiefId} stole your crop!` : `${msg.thiefId} stole a crop`, mine ? 'error' : 'info');
});

Net.onMessage('stolenDeposited', (msg) => {
  showToast(`Stolen ${msg.seedType} added to your inventory`, 'success');
});

Net.onMessage('playerHit', (msg) => {
  if (msg.victimId === Net.getPlayerId()) showToast(`Hit! HP ${msg.health}`, 'error');
});

Net.onMessage('playerDefeated', (msg) => {
  showToast(msg.victimId === Net.getPlayerId() ? 'You were stopped and respawned' : `${msg.victimId} was stopped`, 'info');
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
  const selectedGear = getSelectedGear();
  const ownHits = raycastCells(myCellMeshes);
  const remoteHits = raycastCells(getRemoteCellMeshes());
  const hits = [...ownHits, ...remoteHits].sort((a, b) => a.distance - b.distance);
  if (!hits.length) return;

  const hit       = hits[0].object;
  const cellInfo  = myGarden.cellMap.get(hit);
  const remoteInfo = getRemoteCellInfo(hit);

  if (remoteInfo) {
    if (isHarvestMode()) {
      Net.stealPlant(remoteInfo.ownerId, remoteInfo.plotId, remoteInfo.row, remoteInfo.col);
    }
    return;
  }

  if (!cellInfo) return;
  const { plotId, row, col } = cellInfo;

  if (selectedGear) {
    Net.useGear(selectedGear, plotId, row, col);
    clearSelectedGear();
  } else if (isHarvestMode()) {
    Net.harvestPlant(plotId, row, col);
  } else {
    const seed = getSelectedSeed();
    if (seed) Net.plantSeed(plotId, row, col, seed);
  }
});

canvas.addEventListener('mousemove', (event) => {
  if (!myGarden || !Net.isConnected()) return;
  updatePointer(event, canvas);
  const hits = raycastCells(myCellMeshes);
  if (!hits.length) { cropHoverHint = null; return; }
  const cellInfo = myGarden.cellMap.get(hits[0].object);
  if (!cellInfo) { cropHoverHint = null; return; }
  const cell = myGarden.getCellData?.(cellInfo.plotId, cellInfo.row, cellInfo.col);
  if (!cell?.plant) { cropHoverHint = null; return; }
  const info = SEED_CATALOG[cell.plant.seedType] || {};
  const pct = Math.round((cell.plant.progress || 0) * 100);
  const detail = cell.plant.mutationName || cell.plant.quality || '';
  cropHoverHint = `${info.name || cell.plant.seedType} - ${pct}% grown${detail ? ` - ${detail}` : ''}`;
});

// ─── World interaction / E key ─────────────────────────────────────────────────
window.addEventListener('keydown', (event) => {
  if (event.key === 'f' || event.key === 'F') {
    if (!player || !Net.isConnected()) return;
    const pos = player.getPosition();
    const target = getNearestOtherPlayer(pos.x, pos.z, 14);
    if (target) Net.shootPlayer(target.id);
    else showToast('No player in range', 'error');
    return;
  }
  if (event.key !== 'e' && event.key !== 'E') return;
  if (!player || !world) return;
  const { x, z } = player.getPosition();
  if (world.seedShop.inRange(x, z)) {
    openShopModal();
  } else if (world.gearShop.inRange(x, z)) {
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
  else if (world.gearShop.inRange(x, z)) hint = 'Press E to open Gear Shop';
  else if (world.sellStand.inRange(x, z)) hint = 'Press E to open Sell Stand';
  else if (cropHoverHint) hint = cropHoverHint;
  setInteractHint(hint);
}

let lastFrameTime = performance.now();
let lastPositionSent = 0;
function loop() {
  const now = performance.now();
  const dt  = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;

  if (player) {
    player.update(dt, world?.collides);
    const pos = player.getPosition();
    setCameraTarget(pos.x, pos.z);
    updateWorldUI();
    if (Net.isConnected() && serverFeatures.positionUpdates && now - lastPositionSent > 150) {
      Net.updatePosition(pos.x, pos.z);
      lastPositionSent = now;
    }
  }

  requestAnimationFrame(loop);
  renderFrame();
}
loop();
