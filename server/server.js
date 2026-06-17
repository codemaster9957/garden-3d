/**
 * Garden Bloom 3D - Authoritative WebSocket Game Server
 * All game state lives here. Clients only send requests; server validates + broadcasts.
 * 
 * Environment variables:
 * - PORT: Server port (default: 3000)
 * - HOST: Server hostname (default: 0.0.0.0 for all interfaces)
 * - NODE_ENV: 'development' or 'production'
 */

const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');
const express = require('express');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app for HTTP + WebSocket
const app = express();
const server = http.createServer(app);
const path = require('path');

// WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

// Serve static files from the built client
const distPath = path.join(__dirname, '../garden-3d/dist');
app.use(express.static(distPath));

// Health check endpoint (must come BEFORE catch-all)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', players: players.size, uptime: process.uptime() });
});

// Fallback: serve index.html for any non-API routes (single-page app)
app.all(/.*/,  (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start HTTP server
server.listen(PORT, HOST, () => {
  console.log(`🌱 Garden Bloom 3D server running`);
  console.log(`   WebSocket: ws://${HOST}:${PORT}`);
  console.log(`   Health: http://${HOST}:${PORT}/health`);
  console.log(`   Environment: ${NODE_ENV}`);
});

// ─── Seed / Shop Config ───────────────────────────────────────────────────────
// 20 unique seeds with tiered rarity and chained stock roll mechanics.
// stockChance: probability each roll succeeds (determines if seed is stocked at all)
// maxStock: maximum number of this seed that can be in stock after chained rolls
const SEED_CATALOG = {
  // ━━ COMMON SEEDS (stockChance 0.65+, maxStock 4-6) ━━
  // These appear frequently and often reach higher stock counts
  lettuce:     { name: 'Lettuce',     buyPrice: 8,   baseSellPrice: 20,  growTime: 12000, stages: 4, color: 0x52B788, stockChance: 0.95, maxStock: 6 },
  radish:      { name: 'Radish',      buyPrice: 9,   baseSellPrice: 22,  growTime: 13000, stages: 4, color: 0xFF6B9D, stockChance: 0.90, maxStock: 5 },
  carrot:      { name: 'Carrot',      buyPrice: 10,  baseSellPrice: 25,  growTime: 15000, stages: 4, color: 0xF4A261, stockChance: 0.88, maxStock: 5 },
  spinach:     { name: 'Spinach',     buyPrice: 11,  baseSellPrice: 28,  growTime: 15000, stages: 4, color: 0x006400, stockChance: 0.85, maxStock: 5 },
  strawberry:  { name: 'Strawberry',  buyPrice: 12,  baseSellPrice: 30,  growTime: 18000, stages: 4, color: 0xFF69B4, stockChance: 0.88, maxStock: 5 },
  cucumber:    { name: 'Cucumber',    buyPrice: 13,  baseSellPrice: 35,  growTime: 17000, stages: 4, color: 0x228B22, stockChance: 0.82, maxStock: 4 },
  corn:        { name: 'Corn',        buyPrice: 16,  baseSellPrice: 42,  growTime: 21000, stages: 4, color: 0xFFD700, stockChance: 0.80, maxStock: 4 },
  sunflower:   { name: 'Sunflower',   buyPrice: 15,  baseSellPrice: 40,  growTime: 20000, stages: 4, color: 0xFFD60A, stockChance: 0.80, maxStock: 4 },
  tomato:      { name: 'Tomato',      buyPrice: 20,  baseSellPrice: 55,  growTime: 25000, stages: 4, color: 0xE63946, stockChance: 0.75, maxStock: 4 },

  // ━━ UNCOMMON SEEDS (stockChance 0.45-0.65, maxStock 2-4) ━━
  // Less frequent, smaller stock amounts. May reach 2-3 regularly
  broccoli:    { name: 'Broccoli',    buyPrice: 19,  baseSellPrice: 50,  growTime: 24000, stages: 4, color: 0x228B22, stockChance: 0.65, maxStock: 3 },
  beet:        { name: 'Beet',        buyPrice: 14,  baseSellPrice: 38,  growTime: 19000, stages: 4, color: 0x8B0000, stockChance: 0.62, maxStock: 3 },
  pepper:      { name: 'Pepper',      buyPrice: 18,  baseSellPrice: 48,  growTime: 23000, stages: 4, color: 0xFF4500, stockChance: 0.58, maxStock: 3 },
  eggplant:    { name: 'Eggplant',    buyPrice: 22,  baseSellPrice: 58,  growTime: 26000, stages: 4, color: 0x663399, stockChance: 0.55, maxStock: 3 },
  pumpkin:     { name: 'Pumpkin',     buyPrice: 35,  baseSellPrice: 90,  growTime: 40000, stages: 4, color: 0xF77F00, stockChance: 0.52, maxStock: 3 },
  garlic:      { name: 'Garlic',      buyPrice: 21,  baseSellPrice: 56,  growTime: 25000, stages: 4, color: 0xFFFFFF, stockChance: 0.48, maxStock: 2 },
  mushroom:    { name: 'Mushroom',    buyPrice: 28,  baseSellPrice: 70,  growTime: 30000, stages: 4, color: 0xCD853F, stockChance: 0.45, maxStock: 2 },
  blueberry:   { name: 'Blueberry',   buyPrice: 50,  baseSellPrice: 130, growTime: 55000, stages: 4, color: 0x4361EE, stockChance: 0.42, maxStock: 2 },

  // ━━ RARE SEEDS (stockChance 0.15-0.40, maxStock 1-2) ━━
  // Uncommon appearance, usually low stock. Sometimes misses entirely.
  watermelon:  { name: 'Watermelon',  buyPrice: 40,  baseSellPrice: 100, growTime: 45000, stages: 4, color: 0xFF6347, stockChance: 0.35, maxStock: 2 },
  goldenApple: { name: 'Golden Apple', buyPrice: 100, baseSellPrice: 250, growTime: 60000, stages: 4, color: 0xFFD700, stockChance: 0.12, maxStock: 1 },

  // ━━ ULTRA-RARE SEEDS (stockChance <0.10, maxStock 1) ━━
  // Almost never appear. When they do, almost always just x1.
  dragonfruit: { name: 'Dragonfruit', buyPrice: 250, baseSellPrice: 700, growTime: 90000, stages: 4, color: 0xFF1493, stockChance: 0.05, maxStock: 1 },
};

const STARTING_MONEY  = 100;
const STARTING_SEEDS  = { carrot: 3, tomato: 1 };
const MUTATION_CHANCE = 0.05; // 5% chance double value on harvest
const MUTATION_MULTIPLIER = 2; // mutated crops sell for 2x

// Garden expansion levels: level 0 = 3x3, level 1 = 4x4, etc.
const EXPANSION_COSTS = [500, 1000, 5000, 10000]; // costs for levels 1-4
const GRID_SIZES = [3, 4, 5, 6]; // grid sizes for levels 0-3

// ─── Crop Sell Price State ────────────────────────────────────────────────────
let cropPrices = {};
let restockCount = 0;
const RESTOCK_MS = 180_000; // every 3 minutes
const PRICE_UPDATE_EVERY = 3; // update prices every 3 restocks

function initializeCropPrices() {
  cropPrices = {};
  for (const [key, info] of Object.entries(SEED_CATALOG)) {
    cropPrices[key] = {
      baseSellPrice: info.baseSellPrice,
      currentSellPrice: info.baseSellPrice,
      previousSellPrice: info.baseSellPrice,
      trend: 'neutral',
    };
  }
}

function updateCropPrices() {
  for (const [key, priceInfo] of Object.entries(cropPrices)) {
    priceInfo.previousSellPrice = priceInfo.currentSellPrice;
    const change = (Math.random() - 0.5) * 0.4; // ±20% change
    const newPrice = Math.round(priceInfo.baseSellPrice * (1 + change));
    priceInfo.currentSellPrice = Math.max(1, newPrice);
    if (priceInfo.currentSellPrice > priceInfo.previousSellPrice) {
      priceInfo.trend = 'up';
    } else if (priceInfo.currentSellPrice < priceInfo.previousSellPrice) {
      priceInfo.trend = 'down';
    } else {
      priceInfo.trend = 'neutral';
    }
  }
}

function cropPricesForWelcome() {
  const prices = {};
  for (const [key, info] of Object.entries(cropPrices)) {
    prices[key] = { ...info, trend: 'neutral' };
  }
  return prices;
}

function getShopStock() {
  const stock = {};
  // ─── CHAINED STOCK ROLL SYSTEM ───
  // For each seed: roll to determine stock amount.
  // - Start with stock = 0
  // - Roll Math.random() < stockChance:
  //   * Success: increment stock (first success = stock becomes 1)
  //   * Failure: exit loop (seed has no stock this restock)
  // - Keep rolling while stock < maxStock, until a roll fails
  // - Result: common seeds often reach 4-5 stock, rare seeds usually 0-1
  for (const [key, info] of Object.entries(SEED_CATALOG)) {
    stock[key] = 0;
    let rolls = 0;
    // Each iteration: try to add +1 stock. Stop if roll fails or max reached.
    while (rolls < info.maxStock && Math.random() < info.stockChance) {
      stock[key]++;
      rolls++;
    }
  }
  return stock;
}

let currentShopStock = getShopStock();

function restock() {
  restockCount++;
  currentShopStock = getShopStock();
  
  if (restockCount % PRICE_UPDATE_EVERY === 0) {
    updateCropPrices();
    broadcast({ type: 'cropPricesChanged', prices: cropPrices, restockCount });
    console.log(`[shop] crop prices updated (restock ${restockCount})`);
  }
  
  broadcast({ type: 'shopRestocked', stock: currentShopStock, restockCount });
  console.log(`[shop] restocked #${restockCount}`);
}

initializeCropPrices();
setInterval(restock, RESTOCK_MS);

// ─── Player Store ─────────────────────────────────────────────────────────────
const players = new Map(); // playerId → playerState

function createPlayer(id) {
  const gridSize = GRID_SIZES[0]; // start at 3x3
  
  // Create cells with explicit row/col for stable positioning across expansions
  const cells = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      cells.push({
        row,
        col,
        plant: null, // null or { seedType, stage, plantedAt, growTime, mutated }
      });
    }
  }
  
  const plots = [{
    id: 0,
    playerId: id, // Explicit ownership tracking
    cells,
  }];

  return {
    id,
    money: STARTING_MONEY,
    seeds: { ...STARTING_SEEDS },
    crops: {},  // { seedType: { normal, mutated } }
    plots,
    expansionLevel: 0, // 0 = 3x3, 1 = 4x4, 2 = 5x5, 3 = 6x6
  };
}


function getPlayerPublic(player) {
  // Strip internal timers for broadcast — client only needs what to render
  return {
    id: player.id,
    money: player.money,
    seeds: player.seeds,
    crops: player.crops,
    expansionLevel: player.expansionLevel,
    gridSize: GRID_SIZES[player.expansionLevel],
    plots: player.plots.map(plot => ({
      id: plot.id,
      playerId: plot.playerId,
      cells: plot.cells.map(cell => {
        if (!cell.plant) return { row: cell.row, col: cell.col, plant: null };
        const { seedType, stage, mutated, plantedAt, growTime } = cell.plant;
        const elapsed = Date.now() - plantedAt;
        const progress = Math.min(elapsed / growTime, 1);
        return {
          row: cell.row,
          col: cell.col,
          plant: { seedType, stage, mutated, progress },
        };
      }),
    })),
  };
}

// ─── Growth Ticks ─────────────────────────────────────────────────────────────
setInterval(() => {
  let anyChanged = false;
  for (const [, player] of players) {
    for (const plot of player.plots) {
      for (const cell of plot.cells) {
        if (!cell.plant) continue;
        const { plantedAt, growTime, stage } = cell.plant;
        const maxStages = SEED_CATALOG[cell.plant.seedType]?.stages ?? 4;
        const targetStage = Math.min(
          Math.floor(((Date.now() - plantedAt) / growTime) * maxStages),
          maxStages - 1
        );
        if (targetStage !== stage) {
          cell.plant.stage = targetStage;
          anyChanged = true;
        }
      }
    }
  }
  if (anyChanged) broadcastAllGardens();
}, 2000); // check every 2s

// ─── Helpers ──────────────────────────────────────────────────────────────────
let uidCounter = 1;
function nextId() { return `p${uidCounter++}`; }

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const [, player] of players) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function broadcastAllGardens() {
  const allGardens = [...players.values()].map(getPlayerPublic);
  broadcast({ type: 'gardensUpdate', gardens: allGardens });
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// ─── Connection Handler ───────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const playerId = nextId();
  const player   = createPlayer(playerId);
  player.ws      = ws;
  players.set(playerId, player);

  console.log(`[+] ${playerId} connected (${players.size} online)`);

  // Send the joining player their full state + shop info
  send(ws, {
    type: 'welcome',
    playerId,
    state: getPlayerPublic(player),
    shop: { 
      catalog: SEED_CATALOG,
      stock: currentShopStock,
      cropPrices: cropPricesForWelcome(),
      restockCount,
    },
    allGardens: [...players.values()].map(getPlayerPublic),
  });

  // Tell everyone else someone joined
  broadcast({ type: 'playerJoined', playerId });
  broadcastAllGardens();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(player, msg);
  });

  ws.on('close', () => {
    players.delete(playerId);
    console.log(`[-] ${playerId} disconnected (${players.size} online)`);
    broadcast({ type: 'playerLeft', playerId });
    broadcastAllGardens();
  });

  ws.on('error', (err) => console.error(`[ws error] ${playerId}:`, err.message));
});

// ─── Message Handlers ─────────────────────────────────────────────────────────
function handleMessage(player, msg) {
  switch (msg.type) {

    case 'buySeed': {
      const { seedType, qty = 1 } = msg;
      if (!SEED_CATALOG[seedType]) return sendError(player, 'Unknown seed type');
      
      const available = currentShopStock[seedType] || 0;
      if (available < qty) return sendError(player, `Only ${available} ${seedType}(s) in stock`);
      
      const price = SEED_CATALOG[seedType].buyPrice * qty;
      if (player.money < price) return sendError(player, 'Not enough money');
      
      player.money -= price;
      player.seeds[seedType] = (player.seeds[seedType] || 0) + qty;
      currentShopStock[seedType] -= qty;
      
      sendState(player);
      broadcast({ type: 'shopRestocked', stock: currentShopStock });
      break;
    }

    case 'plantSeed': {
      const { plotId, cellRow, cellCol, seedType } = msg;
      if (!SEED_CATALOG[seedType]) return sendError(player, 'Unknown seed type');
      if ((player.seeds[seedType] || 0) < 1) return sendError(player, 'No seeds of that type');
      const plot = player.plots[plotId];
      if (!plot) return sendError(player, 'Invalid plot');
      if (plot.playerId !== player.id) return sendError(player, 'Cannot plant on others\' plots');
      const cell = plot.cells.find(c => c.row === cellRow && c.col === cellCol);
      if (!cell) return sendError(player, 'Invalid cell');
      if (cell.plant) return sendError(player, 'Cell already occupied');

      player.seeds[seedType]--;
      cell.plant = {
        seedType,
        stage: 0,
        plantedAt: Date.now(),
        growTime: SEED_CATALOG[seedType].growTime,
        mutated: Math.random() < MUTATION_CHANCE,
      };
      sendState(player);
      broadcastAllGardens();
      break;
    }

    case 'harvestPlant': {
      const { plotId, cellRow, cellCol } = msg;
      const plot = player.plots[plotId];
      if (!plot) return sendError(player, 'Invalid plot');
      if (plot.playerId !== player.id) return sendError(player, 'Cannot harvest from others\' plots');
      const cell = plot.cells.find(c => c.row === cellRow && c.col === cellCol);
      if (!cell || !cell.plant) return sendError(player, 'Nothing to harvest');
      const maxStages = SEED_CATALOG[cell.plant.seedType]?.stages ?? 4;
      if (cell.plant.stage < maxStages - 1) return sendError(player, 'Plant not ready yet');

      const { seedType, mutated } = cell.plant;
      cell.plant = null;
      if (!player.crops[seedType]) player.crops[seedType] = { normal: 0, mutated: 0 };
      if (mutated) player.crops[seedType].mutated++;
      else player.crops[seedType].normal++;
      sendState(player);
      broadcastAllGardens();
      break;
    }

    case 'expandGarden': {
      if (player.expansionLevel >= GRID_SIZES.length - 1) {
        return sendError(player, 'Garden already at max size');
      }
      const cost = EXPANSION_COSTS[player.expansionLevel];
      if (player.money < cost) {
        return sendError(player, `Need ${cost} coins to expand. You have ${player.money}`);
      }
      
      player.money -= cost;
      const oldGridSize = GRID_SIZES[player.expansionLevel];
      player.expansionLevel++;
      const newGridSize = GRID_SIZES[player.expansionLevel];
      
      // Expand the plot cells with row/col coordinates
      const plot = player.plots[0];
      
      // Add new cells only in the expanded rows/cols
      for (let row = 0; row < newGridSize; row++) {
        for (let col = 0; col < newGridSize; col++) {
          // Check if this cell already exists (don't duplicate old cells)
          const exists = plot.cells.some(c => c.row === row && c.col === col);
          if (!exists) {
            plot.cells.push({ row, col, plant: null });
          }
        }
      }
      
      sendState(player);
      broadcastAllGardens();
      break;
    }

    case 'sellAll': {
      let earned = 0;
      for (const [seedType, cropStack] of Object.entries(player.crops)) {
        const priceInfo = cropPrices[seedType];
        if (!priceInfo) continue;
        const normal = typeof cropStack === 'number' ? cropStack : cropStack.normal || 0;
        const mutated = typeof cropStack === 'number' ? 0 : cropStack.mutated || 0;
        earned += priceInfo.currentSellPrice * normal;
        earned += priceInfo.currentSellPrice * MUTATION_MULTIPLIER * mutated;
        player.crops[seedType] = { normal: 0, mutated: 0 };
      }
      player.money += earned;
      send(player.ws, { type: 'sold', earned });
      sendState(player);
      broadcastAllGardens();
      break;
    }

    case 'requestState': {
      sendState(player);
      break;
    }

    default:
      sendError(player, `Unknown message type: ${msg.type}`);
  }
}

function sendState(player) {
  send(player.ws, { type: 'stateUpdate', state: getPlayerPublic(player) });
}

function sendError(player, message) {
  send(player.ws, { type: 'error', message });
  console.warn(`[error] ${player.id}: ${message}`);
}

console.log(`🌱 Garden Bloom 3D server running on ws://localhost:${PORT}`);
