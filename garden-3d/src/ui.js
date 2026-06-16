/**
 * ui.js - HUD panels, hotbar, connection status, toasts, and shop modals.
 */

import { SEED_CATALOG, SEED_KEYS, seedColorHex } from './seeds.js';
import { buySeed, sellAll, expandGarden } from './network.js';

const EXPANSION_COSTS = [500, 1000, 5000, 10000];
const MUTATION_MULTIPLIER = 2;

let selectedSeed = 'carrot';
let harvestMode = false;

export function getSelectedSeed() { return selectedSeed; }
export function isHarvestMode() { return harvestMode; }

export function buildHUD() {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="status-bar">
      <span id="conn-status" class="disconnected">Disconnected</span>
      <span id="player-id"></span>
    </div>
    <div id="top-bar">
      <span id="money-panel">Coins: <strong id="money">0</strong></span>
      <span id="crop-panel">Crops: <span id="crops">none</span></span>
      <button id="expand-btn" type="button">Expand: 500</button>
    </div>
    <div id="hotbar"></div>
    <div id="mode-indicator"></div>
    <div id="interact-hint" class="hidden"></div>
    <div id="hint-bar">WASD move | 1-9/0 select seed | E interact | H harvest mode</div>
  `;
  document.body.appendChild(hud);
  document.getElementById('expand-btn')?.addEventListener('click', expandGarden);
  return hud;
}

export function initHotbar() {
  const hotbar = document.getElementById('hotbar');
  hotbar.innerHTML = '';
  SEED_KEYS.forEach((key) => {
    const btn = document.createElement('button');
    btn.className = 'hotbar-btn';
    btn.dataset.seed = key;
    btn.innerHTML = `<span class="seed-dot" style="background:${seedColorHex(key)}"></span><span class="hk">${SEED_CATALOG[key].hotkey ?? ''}</span><span class="sname">${SEED_CATALOG[key].name}</span><span class="seed-count">x0</span>`;
    btn.addEventListener('click', () => _selectSeed(key));
    hotbar.appendChild(btn);
  });
  _refreshHotbar();
}

function _selectSeed(key) {
  selectedSeed = key;
  harvestMode = false;
  _refreshHotbar();
}

export function toggleHarvestMode() {
  harvestMode = !harvestMode;
  selectedSeed = harvestMode ? null : SEED_KEYS[0];
  _refreshHotbar();
}

function _refreshHotbar() {
  document.querySelectorAll('.hotbar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.seed === selectedSeed && !harvestMode);
    btn.classList.toggle('harvest-active', harvestMode && false);
  });
  const ind = document.getElementById('mode-indicator');
  if (!ind) return;
  if (harvestMode) {
    ind.textContent = 'Harvest Mode - press E near a plant';
    ind.className = 'harvest';
  } else {
    ind.textContent = `Selected: ${selectedSeed ? SEED_CATALOG[selectedSeed].name : '-'}`;
    ind.className = 'plant';
  }
}

export function initKeyboard() {
  window.addEventListener('keydown', e => {
    if (e.key === 'h' || e.key === 'H') { toggleHarvestMode(); return; }
    const key = SEED_KEYS.find(seedKey => SEED_CATALOG[seedKey].hotkey === e.key);
    if (key) _selectSeed(key);
  });
}

export function setInteractHint(text) {
  const el = document.getElementById('interact-hint');
  if (!el) return;
  if (text) {
    el.textContent = text;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

export function updateMoney(amount) {
  const el = document.getElementById('money');
  if (el) el.textContent = amount;
}

export function updateSeeds(seeds) {
  document.querySelectorAll('.hotbar-btn').forEach(btn => {
    const key = btn.dataset.seed;
    const count = seeds[key] || 0;
    const badge = btn.querySelector('.seed-count');
    if (badge) badge.textContent = `x${count}`;
    btn.classList.toggle('empty', count === 0);
  });
}

export function updateCrops(crops) {
  const el = document.getElementById('crops');
  if (!el) return;
  const parts = Object.entries(crops)
    .map(([k, v]) => [k, cropTotal(v)])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${SEED_CATALOG[k]?.name ?? k} x${v}`);
  el.textContent = parts.length ? parts.join(', ') : 'none';
}

export function updateExpansion(level = 0, gridSize = 3) {
  const btn = document.getElementById('expand-btn');
  if (!btn) return;
  const nextCost = EXPANSION_COSTS[level];
  if (nextCost == null || gridSize >= 6) {
    btn.textContent = `${gridSize}x${gridSize} Max`;
    btn.disabled = true;
  } else {
    btn.textContent = `${gridSize}x${gridSize} -> ${gridSize + 1}x${gridSize + 1}: ${nextCost}`;
    btn.disabled = false;
  }
}

export function setConnectionStatus(conn, pid) {
  const el = document.getElementById('conn-status');
  const pi = document.getElementById('player-id');
  if (!el) return;
  el.textContent = conn ? 'Connected' : 'Disconnected';
  el.className = conn ? 'connected' : 'disconnected';
  if (pi) pi.textContent = pid ? `(${pid})` : '';
}

export function showToast(text, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

let _shopCatalog = {};
let _shopStock = {};
let _cropPrices = {};
let _restockCount = 0;
let _shopOpen = false;

export function buildShopModal() {
  const modal = document.createElement('div');
  modal.id = 'shop-modal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-inner shop-modal-inner">
      <h2>Seed Shop</h2>
      <div id="restock-count" class="shop-meta">Restocks: 0</div>
      <div id="shop-items"></div>
      <button id="shop-close" class="modal-close">Close [E]</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('shop-close').addEventListener('click', closeShopModal);
  return modal;
}

export function openShopModal() { _shopOpen = true; document.getElementById('shop-modal')?.classList.remove('hidden'); }
export function closeShopModal() { _shopOpen = false; document.getElementById('shop-modal')?.classList.add('hidden'); }
export function isShopOpen() { return _shopOpen; }

export function updateShop(catalog, stock, cropPrices, restockCount) {
  _shopCatalog = catalog ?? _shopCatalog;
  _shopStock = stock ?? _shopStock;
  _cropPrices = cropPrices ?? _cropPrices;
  _restockCount = restockCount ?? _restockCount;
  _renderShopItems();
  if (_sellOpen) _renderSellItems();
}

function _renderShopItems() {
  const el = document.getElementById('shop-items');
  if (!el) return;
  const counter = document.getElementById('restock-count');
  if (counter) counter.textContent = `Restocks: ${_restockCount}`;
  el.innerHTML = '';
  for (const [key, info] of Object.entries(_shopCatalog)) {
    const buyPrice = info.buyPrice ?? 0;
    const stock = _shopStock[key] ?? 0;
    const sellPrice = _cropPrices[key]?.currentSellPrice ?? info.baseSellPrice ?? 0;
    const div = document.createElement('div');
    div.className = 'shop-row';
    div.innerHTML = `
      <span class="seed-dot big" style="background:${seedColorHex(key)}"></span>
      <span class="sname">${info.name}</span>
      <span class="stock">Stock: ${stock}</span>
      <span class="price">Buy: ${buyPrice}</span>
      <span class="sell-price">Sell: ${sellPrice} ${trendIcon(_cropPrices[key]?.trend)}</span>
      <div class="qty-row">
        <button data-seed="${key}" data-qty="1">x1</button>
        <button data-seed="${key}" data-qty="5">x5</button>
        <button data-seed="${key}" data-qty="10">x10</button>
      </div>
    `;
    div.querySelectorAll('button').forEach(btn => {
      btn.disabled = stock <= 0;
      btn.addEventListener('click', () => buySeed(btn.dataset.seed, parseInt(btn.dataset.qty, 10)));
    });
    el.appendChild(div);
  }
}

let _sellCrops = {};
let _sellOpen = false;

export function buildSellModal() {
  const modal = document.createElement('div');
  modal.id = 'sell-modal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-inner">
      <h2>Sell Stand</h2>
      <div id="sell-items"></div>
      <div id="sell-total"></div>
      <button id="sell-all-btn">Sell All</button>
      <button id="sell-close" class="modal-close">Close [E]</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('sell-all-btn').addEventListener('click', () => { sellAll(); closeSellModal(); });
  document.getElementById('sell-close').addEventListener('click', closeSellModal);
  return modal;
}

export function openSellModal() { _sellOpen = true; document.getElementById('sell-modal')?.classList.remove('hidden'); _renderSellItems(); }
export function closeSellModal() { _sellOpen = false; document.getElementById('sell-modal')?.classList.add('hidden'); }
export function isSellOpen() { return _sellOpen; }

export function updateSellCrops(crops, catalog) {
  _sellCrops = crops;
  if (_sellOpen) _renderSellItems(catalog);
}

function _renderSellItems(catalog) {
  const el = document.getElementById('sell-items');
  const total = document.getElementById('sell-total');
  if (!el) return;
  el.innerHTML = '';
  let sum = 0;
  for (const [key, cropStack] of Object.entries(_sellCrops)) {
    const normal = cropNormal(cropStack);
    const mutated = cropMutated(cropStack);
    const info = (catalog ?? _shopCatalog)[key] ?? {};
    const sellPrice = _cropPrices[key]?.currentSellPrice ?? info.baseSellPrice ?? 0;
    const trend = trendIcon(_cropPrices[key]?.trend);
    if (normal) {
      const value = sellPrice * normal;
      sum += value;
      el.appendChild(makeSellRow(key, info, normal, sellPrice, trend, value));
    }
    if (mutated) {
      const value = sellPrice * MUTATION_MULTIPLIER * mutated;
      sum += value;
      el.appendChild(makeSellRow(key, info, mutated, sellPrice, trend, value, MUTATION_MULTIPLIER));
    }
  }
  if (total) total.textContent = sum > 0 ? `Total: ${sum}` : 'No crops to sell.';
}

function makeSellRow(key, info, qty, sellPrice, trend, value, multiplier = 1) {
  const row = document.createElement('div');
  row.className = 'sell-row';
  row.innerHTML = `
    <span class="seed-dot big" style="background:${seedColorHex(key)}"></span>
    <span class="sname">${info.name ?? key}${multiplier > 1 ? ` x${multiplier}` : ''}</span>
    <span class="qty">Owned: ${qty}</span>
    <span class="unit">Each: ${sellPrice} ${trend}</span>
    <span class="price">${value}</span>
  `;
  return row;
}

function trendIcon(trend = 'neutral') {
  if (trend === 'up') return '<span class="trend up">▲</span>';
  if (trend === 'down') return '<span class="trend down">▼</span>';
  return '<span class="trend neutral">▬</span>';
}

function cropNormal(value) {
  if (typeof value === 'number') return value;
  return value?.normal || 0;
}

function cropMutated(value) {
  if (typeof value === 'number') return 0;
  return value?.mutated || 0;
}

function cropTotal(value) {
  return cropNormal(value) + cropMutated(value);
}
