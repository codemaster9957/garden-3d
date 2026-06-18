/**
 * ui.js - HUD, inventory, shop, weather, toasts, and modal panels.
 */

import { SEED_CATALOG, SEED_KEYS, seedColorHex, seedIcon, rarityColor, rarityRank } from './seeds.js';
import { buySeed, buyGear, buyPet, equipPet, equipWeapon, sellAll, expandGarden } from './network.js';

const EXPANSION_COSTS = [500, 1000, 5000, 10000];
const QUALITY_MULTIPLIERS = { normal: 1, silver: 1.25, gold: 1.6, rainbow: 2.25, giant: 2.75, mutated: 2 };

let selectedSeed = 'carrot';
let harvestMode = false;
let selectedGear = null;

let _shopCatalog = {};
let _shopStock = {};
let _cropPrices = {};
let _gearCatalog = {};
let _petCatalog = {};
let _restockCount = 0;
let _nextRestockAt = 0;
let _shopSort = 'inStock';
let _selectedShopSeed = null;
let _weather = null;
let _shopOpen = false;
let _gearShopOpen = false;
let _petShopOpen = false;
let _sellCrops = {};
let _sellOpen = false;
let _gunMode = false;
let _gunLabel = 'Pistol';
let _gunAmmo = 0;

export function getSelectedSeed() { return selectedSeed; }
export function isHarvestMode() { return harvestMode; }
export function getSelectedGear() { return selectedGear; }
export function clearSelectedGear() { selectedGear = null; _refreshGearPanel(); }
export function setGunMode(enabled, weaponType = 'pistol', ammo = 0) {
  _gunMode = !!enabled;
  _gunLabel = gearLabel(weaponType);
  _gunAmmo = ammo || 0;
  if (_gunMode) {
    harvestMode = false;
    selectedGear = null;
  }
  _refreshHotbar();
}

export function buildHUD() {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="status-bar">
      <span id="conn-status" class="disconnected">Disconnected</span>
      <span id="player-id"></span>
    </div>
    <div id="top-bar">
      <span id="money-panel">Coins <strong id="money">0</strong></span>
      <span id="health-panel">HP <strong id="health">100</strong></span>
      <span id="crop-panel">Crops <span id="crops">none</span></span>
      <span id="weather-panel">Weather <strong id="weather-name">Clear</strong> <span id="weather-time"></span></span>
      <button id="expand-btn" type="button">Expand: 500</button>
    </div>
    <div id="gear-panel"></div>
    <div id="inventory-panel"></div>
    <div id="hotbar"></div>
    <div id="mode-indicator"></div>
    <div id="interact-hint" class="hidden"></div>
    <div id="hint-bar">WASD move | right/middle drag camera | wheel zoom | E interact | H harvest/steal | F gun</div>
    <div id="weather-effects" class="weather-effect hidden"></div>
    <div id="toast-stack"></div>
  `;
  document.body.appendChild(hud);
  document.getElementById('expand-btn')?.addEventListener('click', expandGarden);
  setInterval(_renderTimers, 500);
  return hud;
}

export function initHotbar() {
  const hotbar = document.getElementById('hotbar');
  hotbar.innerHTML = '';
  SEED_KEYS.forEach((key) => {
    const btn = document.createElement('button');
    btn.className = 'hotbar-btn hidden';
    btn.dataset.seed = key;
    btn.innerHTML = `
      <span class="seed-icon">${seedIcon(key)}</span>
      <span class="hk">${SEED_CATALOG[key].hotkey ?? ''}</span>
      <span class="sname">${SEED_CATALOG[key].name}</span>
      <span class="seed-count">x0</span>
    `;
    btn.addEventListener('click', () => _selectSeed(key));
    hotbar.appendChild(btn);
  });
  _refreshHotbar();
}

function _selectSeed(key) {
  selectedSeed = key;
  harvestMode = false;
  selectedGear = null;
  _refreshHotbar();
  _refreshGearPanel();
}

export function toggleHarvestMode() {
  harvestMode = !harvestMode;
  selectedSeed = harvestMode ? null : selectedSeed || SEED_KEYS[0];
  selectedGear = null;
  _refreshHotbar();
  _refreshGearPanel();
}

function _refreshHotbar() {
  document.querySelectorAll('.hotbar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.seed === selectedSeed && !harvestMode);
  });
  const ind = document.getElementById('mode-indicator');
  if (!ind) return;
  if (harvestMode) {
    ind.textContent = 'Harvest/Steal Mode - click a ready plant';
    ind.className = 'harvest';
  } else if (_gunMode) {
    ind.textContent = `${_gunLabel} equipped - click to fire (${_gunAmmo} ammo)`;
    ind.className = 'harvest';
  } else if (selectedGear) {
    ind.textContent = `Using ${gearLabel(selectedGear)} - click your garden`;
    ind.className = 'plant';
  } else {
    const info = SEED_CATALOG[selectedSeed] || _shopCatalog[selectedSeed];
    ind.textContent = selectedSeed ? `Selected ${seedIcon(selectedSeed, info)} ${info?.name ?? selectedSeed}` : 'Select a seed';
    ind.className = 'plant';
  }
  _renderSelectedSeedCard();
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

export function updateHealth(amount, max = 100) {
  const el = document.getElementById('health');
  if (el) el.textContent = `${amount}/${max}`;
}

export function updateSeeds(seeds) {
  document.querySelectorAll('.hotbar-btn').forEach(btn => {
    const key = btn.dataset.seed;
    const count = seeds[key] || 0;
    const badge = btn.querySelector('.seed-count');
    if (badge) badge.textContent = `x${count}`;
    btn.classList.toggle('hidden', count === 0);
  });
  if (!selectedSeed || (seeds[selectedSeed] || 0) === 0) {
    selectedSeed = Object.keys(seeds).find(key => (seeds[key] || 0) > 0) || null;
  }
  _renderInventory(seeds, _sellCrops);
  _refreshHotbar();
}

export function updatePlayerInventory(state) {
  updateHealth(state.health ?? 100, state.maxHealth ?? 100);
  _renderGearPanel(state);
  _renderInventory(state.seeds || {}, state.crops || {});
}

export function updateCrops(crops) {
  _sellCrops = crops || {};
  const el = document.getElementById('crops');
  if (!el) return;
  const total = Object.values(_sellCrops).reduce((sum, stack) => sum + cropTotal(stack), 0);
  el.textContent = total ? `${total}` : 'none';
  _renderInventory(null, _sellCrops);
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

export function updateWeather(weather) {
  _weather = weather || _weather;
  _renderTimers();
  const overlay = document.getElementById('weather-effects');
  if (!overlay) return;
  const current = _weather?.current || 'Clear';
  overlay.className = `weather-effect weather-${slug(current)}`;
  overlay.classList.toggle('hidden', !current || current === 'Clear');
  overlay.dataset.weather = current;
  document.body.dataset.weather = slug(current);
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
  const stack = document.getElementById('toast-stack') || document.body;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = text;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

export function buildShopModal() {
  const modal = document.createElement('div');
  modal.id = 'shop-modal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-inner shop-modal-inner">
      <div class="shop-title-row">
        <div>
          <h2>Seed Shop</h2>
          <div id="restock-count" class="shop-meta">Next market refresh: --:--</div>
        </div>
        <button id="shop-close" class="modal-close compact">Close [E]</button>
      </div>
      <div id="shop-sort-controls" class="segmented">
        <button data-sort="inStock" class="active">In Stock</button>
        <button data-sort="cheapest">Cheapest</button>
        <button data-sort="profit">Best Profit</button>
        <button data-sort="sell">Highest Sell</button>
        <button data-sort="rare">Rarest</button>
      </div>
      <div class="shop-grid">
        <div>
          <div class="shop-columns">
            <span>Seed</span><span>Stock</span><span>Buy</span><span>Sell</span><span>Profit</span><span>Trend</span><span>Buy</span>
          </div>
          <div id="shop-items"></div>
        </div>
        <aside id="seed-info-card" class="seed-info-card">Hover a seed for details.</aside>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('shop-close').addEventListener('click', closeShopModal);
  document.querySelectorAll('#shop-sort-controls button').forEach(btn => {
    btn.addEventListener('click', () => {
      _shopSort = btn.dataset.sort;
      document.querySelectorAll('#shop-sort-controls button').forEach(b => b.classList.toggle('active', b === btn));
      _renderShopItems();
    });
  });
  return modal;
}

export function openShopModal() { _shopOpen = true; document.getElementById('shop-modal')?.classList.remove('hidden'); _renderTimers(); }
export function closeShopModal() { _shopOpen = false; document.getElementById('shop-modal')?.classList.add('hidden'); }
export function isShopOpen() { return _shopOpen; }

export function buildGearShopModal() {
  const modal = document.createElement('div');
  modal.id = 'gear-shop-modal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-inner gear-modal-inner">
      <div class="shop-title-row">
        <div>
          <h2>Gear Shop</h2>
          <div class="shop-meta">Tools, defenses, and weapons for protecting your crops.</div>
        </div>
        <button id="gear-shop-close" class="modal-close compact">Close [E]</button>
      </div>
      <div id="gear-shop-items"></div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('gear-shop-close').addEventListener('click', closeGearShopModal);
  _renderGearShopItems();
  return modal;
}

export function openGearShopModal() {
  _gearShopOpen = true;
  document.getElementById('gear-shop-modal')?.classList.remove('hidden');
  _renderGearShopItems();
}

export function closeGearShopModal() {
  _gearShopOpen = false;
  document.getElementById('gear-shop-modal')?.classList.add('hidden');
}

export function isGearShopOpen() { return _gearShopOpen; }

export function buildPetShopModal() {
  const modal = document.createElement('div');
  modal.id = 'pet-shop-modal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-inner gear-modal-inner">
      <div class="shop-title-row">
        <div>
          <h2>Pet Shop</h2>
          <div class="shop-meta">Companions that follow you around the garden.</div>
        </div>
        <button id="pet-shop-close" class="modal-close compact">Close [E]</button>
      </div>
      <div id="pet-shop-items"></div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('pet-shop-close').addEventListener('click', closePetShopModal);
  _renderPetShopItems();
  return modal;
}

export function openPetShopModal() {
  _petShopOpen = true;
  document.getElementById('pet-shop-modal')?.classList.remove('hidden');
  _renderPetShopItems();
}

export function closePetShopModal() {
  _petShopOpen = false;
  document.getElementById('pet-shop-modal')?.classList.add('hidden');
}

export function isPetShopOpen() { return _petShopOpen; }

export function updateShop(catalog, stock, cropPrices, restockCount, gearCatalog, nextRestockAt, petCatalog) {
  _shopCatalog = catalog ?? _shopCatalog;
  _shopStock = stock ?? _shopStock;
  _cropPrices = cropPrices ?? _cropPrices;
  _gearCatalog = gearCatalog ?? _gearCatalog;
  _petCatalog = petCatalog ?? _petCatalog;
  _restockCount = restockCount ?? _restockCount;
  _nextRestockAt = nextRestockAt ?? _nextRestockAt;
  _renderShopItems();
  _renderGearShopItems();
  _renderPetShopItems();
  _renderTimers();
  if (_sellOpen) _renderSellItems();
}

function _renderShopItems() {
  const el = document.getElementById('shop-items');
  if (!el) return;
  el.innerHTML = '';
  const rows = Object.entries(_shopCatalog).sort((a, b) => sortSeeds(a, b));
  for (const [key, info] of rows) {
    const buyPrice = info.buyPrice ?? 0;
    const stock = _shopStock[key] ?? 0;
    const sellPrice = _cropPrices[key]?.currentSellPrice ?? info.baseSellPrice ?? 0;
    const profit = sellPrice - buyPrice;
    const out = stock <= 0;
    const row = document.createElement('div');
    row.className = `shop-row rarity-${slug(info.rarity)} ${out ? 'out-of-stock' : ''} ${_selectedShopSeed === key ? 'selected' : ''}`;
    row.style.setProperty('--rarity-color', info.rarityColor || rarityColor(info.rarity));
    row.innerHTML = `
      <span class="seed-name"><span class="seed-icon">${seedIcon(key, info)}</span><span>${info.name}</span><small>${info.rarity}</small></span>
      <span class="stock">${out ? 'OUT OF STOCK' : `Stock ${stock}`}</span>
      <span class="price">Buy ${buyPrice}</span>
      <span class="sell-price">Sell ${sellPrice}</span>
      <span class="profit ${profit >= 0 ? 'positive' : 'negative'}">${profit >= 0 ? '+' : ''}${profit}</span>
      <span>${trendIcon(_cropPrices[key])}</span>
      <div class="qty-row">
        <button data-seed="${key}" data-qty="1">x1</button>
        <button data-seed="${key}" data-qty="5">x5</button>
        <button data-seed="${key}" data-qty="10">x10</button>
      </div>
    `;
    row.querySelectorAll('button').forEach(btn => {
      btn.disabled = out;
      btn.addEventListener('click', () => buySeed(btn.dataset.seed, parseInt(btn.dataset.qty, 10)));
    });
    row.addEventListener('mouseenter', () => _renderSeedInfo(key));
    row.addEventListener('click', () => { _selectedShopSeed = key; _renderSeedInfo(key); _renderShopItems(); });
    el.appendChild(row);
  }
  if (!_selectedShopSeed && rows.length) _renderSeedInfo(rows[0][0]);
}

function sortSeeds(a, b) {
  const [ak, ai] = a;
  const [bk, bi] = b;
  const as = _shopStock[ak] || 0;
  const bs = _shopStock[bk] || 0;
  const ap = (_cropPrices[ak]?.currentSellPrice ?? ai.baseSellPrice ?? 0) - (ai.buyPrice ?? 0);
  const bp = (_cropPrices[bk]?.currentSellPrice ?? bi.baseSellPrice ?? 0) - (bi.buyPrice ?? 0);
  if (_shopSort === 'inStock') return (bs > 0) - (as > 0) || ai.buyPrice - bi.buyPrice;
  if (_shopSort === 'cheapest') return (ai.buyPrice ?? 0) - (bi.buyPrice ?? 0);
  if (_shopSort === 'profit') return bp - ap;
  if (_shopSort === 'sell') return (_cropPrices[bk]?.currentSellPrice ?? bi.baseSellPrice ?? 0) - (_cropPrices[ak]?.currentSellPrice ?? ai.baseSellPrice ?? 0);
  if (_shopSort === 'rare') return (bi.rarityRank || rarityRank(bi.rarity)) - (ai.rarityRank || rarityRank(ai.rarity));
  return 0;
}

function _renderSeedInfo(key) {
  const card = document.getElementById('seed-info-card');
  const info = _shopCatalog[key];
  if (!card || !info) return;
  const buyPrice = info.buyPrice ?? 0;
  const sellPrice = _cropPrices[key]?.currentSellPrice ?? info.baseSellPrice ?? 0;
  const profit = sellPrice - buyPrice;
  card.style.setProperty('--rarity-color', info.rarityColor || rarityColor(info.rarity));
  card.innerHTML = `
    <div class="info-title"><span class="seed-icon large">${seedIcon(key, info)}</span><div><strong>${info.name}</strong><small>${info.rarity}</small></div></div>
    <p>${info.description || 'A mysterious crop.'}</p>
    <dl>
      <dt>Grow time</dt><dd>${formatDuration(info.growTime)}</dd>
      <dt>Buy price</dt><dd>${buyPrice}</dd>
      <dt>Sell price</dt><dd>${sellPrice}</dd>
      <dt>Profit</dt><dd class="${profit >= 0 ? 'positive' : 'negative'}">${profit >= 0 ? '+' : ''}${profit}</dd>
      <dt>Best weather</dt><dd>${info.preferredWeather || 'Any'}</dd>
      <dt>Mutation chance</dt><dd>${Math.round((info.mutationChance || 0) * 100)}%</dd>
      <dt>Stock chance</dt><dd>${Math.round((info.stockChance || 0) * 100)}%</dd>
      <dt>Category</dt><dd>${info.category || 'Crop'}</dd>
    </dl>
  `;
}

function _renderGearShopItems() {
  const el = document.getElementById('gear-shop-items');
  if (!el) return;
  el.innerHTML = '';
  for (const [key, info] of Object.entries(_gearCatalog)) {
    const div = document.createElement('div');
    div.className = 'gear-shop-row';
    const detail = info.type === 'weapon'
      ? `Damage ${info.damage} | Ammo +${info.ammoOnBuy}`
      : `${info.size}x${info.size} | ${Math.round(info.durationMs / 1000)}s`;
    div.innerHTML = `
      <span class="gear-icon">${gearIcon(key)}</span>
      <span class="sname">${info.name}</span>
      <span class="stock">${detail}</span>
      <span class="price">Buy ${info.buyPrice}</span>
      <button data-gear="${key}">Buy</button>
    `;
    div.querySelector('button').addEventListener('click', () => buyGear(key));
    el.appendChild(div);
  }
}

function _renderPetShopItems() {
  const el = document.getElementById('pet-shop-items');
  if (!el) return;
  el.innerHTML = '';
  for (const [key, info] of Object.entries(_petCatalog)) {
    const div = document.createElement('div');
    div.className = 'gear-shop-row pet-shop-row';
    div.innerHTML = `
      <span class="gear-icon">${petIcon(key)}</span>
      <span class="sname">${info.name}<small>${info.description || ''}</small></span>
      <span class="stock">Companion</span>
      <span class="price">Buy ${info.buyPrice}</span>
      <button data-pet="${key}">Buy</button>
    `;
    div.querySelector('button').addEventListener('click', () => buyPet(key));
    el.appendChild(div);
  }
}

function _renderGearPanel(state) {
  const el = document.getElementById('gear-panel');
  if (!el) return;
  const gear = state.gear || {};
  const weapons = state.weapons || {};
  const ammo = state.ammo || {};
  const activeWeapon = state.activeWeapon || 'pistol';
  const pets = state.pets || {};
  const activePet = state.activePet;
  const holding = state.holdingStolen;
  const protection = Math.max(0, (state.protectedUntil || 0) - Date.now());
  const gearButtons = Object.entries(gear)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `<button class="gear-btn ${selectedGear === key ? 'active' : ''}" data-use-gear="${key}">${gearIcon(key)} ${gearLabel(key)} x${count}</button>`)
    .join('');
  const weaponButtons = Object.keys(weapons)
    .filter(key => weapons[key])
    .map(key => `<button class="gear-btn ${activeWeapon === key ? 'active' : ''}" data-equip-weapon="${key}">${gearIcon(key)} ${gearLabel(key)} ${ammo[key] || 0}</button>`)
    .join('');
  const petButtons = Object.keys(pets)
    .filter(key => pets[key])
    .map(key => `<button class="gear-btn ${activePet === key ? 'active' : ''}" data-equip-pet="${key}">${petIcon(key)} ${petLabel(key)}</button>`)
    .join('');
  el.innerHTML = `
    ${protection > 0 ? `<span class="holding shield">Shield ${formatClock(protection)}</span>` : ''}
    ${holding ? `<span class="holding">Holding stolen ${SEED_CATALOG[holding.seedType]?.name ?? holding.seedType}</span>` : ''}
    ${gearButtons}
    ${weaponButtons}
    ${petButtons}
  `;
  el.querySelectorAll('[data-use-gear]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedGear = btn.dataset.useGear;
      harvestMode = false;
      selectedSeed = null;
      _refreshHotbar();
      _refreshGearPanel();
    });
  });
  el.querySelectorAll('[data-equip-weapon]').forEach(btn => {
    btn.addEventListener('click', () => equipWeapon(btn.dataset.equipWeapon));
  });
  el.querySelectorAll('[data-equip-pet]').forEach(btn => {
    btn.addEventListener('click', () => equipPet(btn.dataset.equipPet));
  });
  _refreshHotbar();
}

function _refreshGearPanel() {
  document.querySelectorAll('.gear-btn[data-use-gear]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.useGear === selectedGear);
  });
  _refreshHotbar();
}

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
  _sellCrops = crops || {};
  if (catalog) _shopCatalog = { ..._shopCatalog, ...catalog };
  if (_sellOpen) _renderSellItems();
}

function _renderSellItems() {
  const el = document.getElementById('sell-items');
  const total = document.getElementById('sell-total');
  if (!el) return;
  el.innerHTML = '';
  let sum = 0;
  for (const [key, cropStack] of Object.entries(_sellCrops)) {
    const info = _shopCatalog[key] ?? SEED_CATALOG[key] ?? {};
    const sellPrice = _cropPrices[key]?.currentSellPrice ?? info.baseSellPrice ?? 0;
    for (const [quality, qty] of cropQualityEntries(cropStack)) {
      const value = Math.round(sellPrice * (QUALITY_MULTIPLIERS[quality] || 1) * qty);
      sum += value;
      el.appendChild(makeSellRow(key, info, quality, qty, sellPrice, value));
    }
  }
  if (total) total.textContent = sum > 0 ? `Total: ${sum}` : 'No crops to sell.';
}

function makeSellRow(key, info, quality, qty, sellPrice, value) {
  const row = document.createElement('div');
  row.className = 'sell-row';
  row.innerHTML = `
    <span class="seed-icon">${seedIcon(key, info)}</span>
    <span class="sname">${info.name ?? key} <small>${titleCase(quality)}</small></span>
    <span class="qty">Owned ${qty}</span>
    <span class="unit">Each ${sellPrice}</span>
    <span class="price">${value}</span>
  `;
  return row;
}

function _renderInventory(seeds = null, crops = null) {
  const el = document.getElementById('inventory-panel');
  if (!el) return;
  const seedRows = seeds ? Object.entries(seeds).filter(([, count]) => count > 0) : [];
  const cropRows = crops ? Object.entries(crops).filter(([, stack]) => cropTotal(stack) > 0) : [];
  el.innerHTML = `
    <div class="inventory-section"><strong>Seeds</strong>${seedRows.slice(0, 8).map(([key, count]) => `<span>${seedIcon(key, _shopCatalog[key])} ${_shopCatalog[key]?.name ?? SEED_CATALOG[key]?.name ?? key} x${count}</span>`).join('') || '<span>none</span>'}</div>
    <div class="inventory-section"><strong>Crops</strong>${cropRows.slice(0, 8).map(([key, stack]) => `<span>${seedIcon(key, _shopCatalog[key])} ${_shopCatalog[key]?.name ?? SEED_CATALOG[key]?.name ?? key} x${cropTotal(stack)}</span>`).join('') || '<span>none</span>'}</div>
  `;
  _renderSelectedSeedCard();
}

function _renderSelectedSeedCard() {
  const el = document.getElementById('inventory-panel');
  if (!el || !selectedSeed) return;
  const info = _shopCatalog[selectedSeed] || SEED_CATALOG[selectedSeed];
  if (!info) return;
  let card = document.getElementById('selected-seed-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'selected-seed-card';
    el.appendChild(card);
  }
  card.style.setProperty('--rarity-color', info.rarityColor || rarityColor(info.rarity));
  card.innerHTML = `<span class="seed-icon">${seedIcon(selectedSeed, info)}</span><strong>${info.name}</strong><small>${info.rarity || 'Common'} - ${info.description || ''}</small>`;
}

function _renderTimers() {
  const restock = document.getElementById('restock-count');
  if (restock) restock.textContent = `Next market refresh: ${formatClock(Math.max(0, _nextRestockAt - Date.now()))} | Restocks ${_restockCount}`;
  const name = document.getElementById('weather-name');
  const time = document.getElementById('weather-time');
  if (name && _weather) name.textContent = _weather.current;
  if (time && _weather) time.textContent = `${formatClock(Math.max(0, (_weather.endsAt || 0) - Date.now()))} -> ${_weather.next || '?'}`;
}

function trendIcon(info = {}) {
  const pct = info.trendPercent || 0;
  if (pct > 0) return `<span class="trend up">▲ +${pct}%</span>`;
  if (pct < 0) return `<span class="trend down">▼ ${pct}%</span>`;
  return '<span class="trend neutral">— 0%</span>';
}

function cropQualityEntries(value) {
  if (typeof value === 'number') return value > 0 ? [['normal', value]] : [];
  return Object.entries(value || {}).filter(([, qty]) => qty > 0);
}

function cropTotal(value) {
  return cropQualityEntries(value).reduce((sum, [, qty]) => sum + qty, 0);
}

function gearIcon(key) {
  if (key === 'wateringCan') return 'Can';
  if (key === 'sprinkler') return 'Spr';
  if (key === 'ak47') return 'AK';
  if (key === 'shotgun') return 'SG';
  if (key === 'minigun') return 'MG';
  if (key === 'pistol') return 'P';
  return '*';
}

function petIcon(key) {
  if (key === 'gardenBee') return 'Bee';
  if (key === 'sproutPup') return 'Pup';
  if (key === 'moonCat') return 'Cat';
  if (key === 'emberFox') return 'Fox';
  return 'Pet';
}

function petLabel(key) {
  return _petCatalog[key]?.name || {
    gardenBee: 'Garden Bee',
    sproutPup: 'Sprout Pup',
    moonCat: 'Moon Cat',
    emberFox: 'Ember Fox',
  }[key] || key;
}

function gearLabel(key) {
  return _gearCatalog[key]?.name || {
    wateringCan: 'Watering Can',
    sprinkler: 'Sprinkler',
    pistol: 'Pistol',
    ak47: 'AK-47',
    shotgun: 'Shotgun',
    minigun: 'Minigun',
  }[key] || key;
}

function slug(value = 'common') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function titleCase(value = '') {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function formatDuration(ms = 0) {
  return `${Math.max(1, Math.round(ms / 1000))}s`;
}

function formatClock(ms = 0) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
