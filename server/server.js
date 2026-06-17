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
const SERVER_VERSION = 'visual-weather-stolen-2026-06-17-1';

// Create Express app for HTTP + WebSocket
const app = express();
const server = http.createServer(app);
const path = require('path');
const fs = require('fs');

// WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: SERVER_VERSION, players: players.size, uptime: process.uptime() });
});

app.get('/version', (req, res) => {
  res.json({
    version: SERVER_VERSION,
    features: {
      positionUpdates: true,
      serverPlots: true,
      periodicSnapshots: true,
      rarityShop: true,
      weatherEvents: true,
      cropQuality: true,
      expandedSeeds: true,
      heldStolenVisuals: true,
      perennialCrops: true,
    },
  });
});

// Serve static files from the built client when this project is deployed as one app.
const distPath = process.env.CLIENT_DIST_DIR
  ? path.resolve(process.env.CLIENT_DIST_DIR)
  : path.join(__dirname, '../garden-3d/dist');
const indexPath = path.join(distPath, 'index.html');
const hasClientBuild = fs.existsSync(indexPath);

if (!hasClientBuild) {
  console.warn(`[static] Client build not found at ${indexPath}. Run npm run build:client before starting the server.`);
}

app.use(express.static(distPath));

// SPA fallback - serve index.html for HTML requests (skip WebSocket upgrades)
app.use((req, res, next) => {
  // Skip WebSocket upgrade requests
  if (req.headers.upgrade === 'websocket') {
    return next();
  }
  // Only serve index.html for requests that accept HTML
  if (req.accepts('html')) {
    if (!hasClientBuild) {
      res.status(503).type('text/plain').send('Client build is missing. Run npm run build:client before starting the server.');
      return;
    }
    res.sendFile(indexPath);
  } else {
    res.status(404).end();
  }
});

// Start HTTP server
server.listen(PORT, HOST, () => {
  console.log(`🌱 Garden Bloom 3D server running`);
  console.log(`   WebSocket: ws://${HOST}:${PORT}`);
  console.log(`   Health: http://${HOST}:${PORT}/health`);
  console.log(`   Environment: ${NODE_ENV}`);
  console.log(`   Version: ${SERVER_VERSION}`);
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

const RARITY_CONFIG = {
  Common: { rank: 1, border: '#9adf9a', stockMultiplier: 1.15, sellMultiplier: 1.0, growMultiplier: 0.95, mutationBonus: 0 },
  Uncommon: { rank: 2, border: '#52b788', stockMultiplier: 0.9, sellMultiplier: 1.16, growMultiplier: 1.05, mutationBonus: 0.01 },
  Rare: { rank: 3, border: '#4cc9f0', stockMultiplier: 0.65, sellMultiplier: 1.35, growMultiplier: 1.18, mutationBonus: 0.02 },
  Epic: { rank: 4, border: '#b36bff', stockMultiplier: 0.42, sellMultiplier: 1.65, growMultiplier: 1.35, mutationBonus: 0.035 },
  Legendary: { rank: 5, border: '#ffd166', stockMultiplier: 0.22, sellMultiplier: 2.1, growMultiplier: 1.7, mutationBonus: 0.055 },
  Mythic: { rank: 6, border: '#ff5c8a', stockMultiplier: 0.12, sellMultiplier: 2.8, growMultiplier: 2.25, mutationBonus: 0.08 },
};

const SEED_DATABASE = [
  { id: 'carrot', name: 'Carrot', rarity: 'Common', buyPrice: 6, baseSellPrice: 19, stockChance: 0.95, minStock: 2, maxStock: 8, growTime: 14000, stages: 4, color: 0xf4a261, icon: '🥕', preferredWeather: 'Golden Hour', mutationChance: 0.04, description: 'Reliable starter crop with a bright harvest.', category: 'Starter' },
  { id: 'tomato', name: 'Tomato', rarity: 'Common', buyPrice: 10, baseSellPrice: 31, stockChance: 0.88, minStock: 1, maxStock: 6, growTime: 22000, stages: 4, color: 0xe63946, icon: '🍅', preferredWeather: 'Rain', mutationChance: 0.045, description: 'A flexible crop with solid early profit.', category: 'Starter' },
  { id: 'potato', name: 'Potato', rarity: 'Common', buyPrice: 8, baseSellPrice: 24, stockChance: 0.92, minStock: 2, maxStock: 7, growTime: 18000, stages: 3, color: 0xc9a66b, icon: '🥔', preferredWeather: 'Fog', mutationChance: 0.035, description: 'Hardy and cheap, good for filling empty plots.', category: 'Starter' },
  { id: 'wheat', name: 'Wheat', rarity: 'Common', buyPrice: 7, baseSellPrice: 21, stockChance: 0.94, minStock: 2, maxStock: 8, growTime: 16000, stages: 3, color: 0xf2c94c, icon: '🌾', preferredWeather: 'Golden Hour', mutationChance: 0.03, description: 'Fast crop for combos and quick coin flow.', category: 'Starter' },
  { id: 'lettuce', name: 'Lettuce', rarity: 'Common', buyPrice: 7, baseSellPrice: 22, stockChance: 0.95, minStock: 2, maxStock: 8, growTime: 15000, stages: 3, color: 0x52b788, icon: '🥬', preferredWeather: 'Rain', mutationChance: 0.035, description: 'Quick-growing leaves that love wet weather.', category: 'Starter' },
  { id: 'strawberry', name: 'Strawberry', rarity: 'Uncommon', buyPrice: 16, baseSellPrice: 45, stockChance: 0.7, minStock: 1, maxStock: 5, growTime: 26000, stages: 4, color: 0xff69b4, icon: '🍓', preferredWeather: 'Bee Swarm', mutationChance: 0.06, description: 'Sweet mid-game crop with good mutation odds.', category: 'Profit' },
  { id: 'blueberry', name: 'Blueberry', rarity: 'Uncommon', buyPrice: 22, baseSellPrice: 62, stockChance: 0.58, minStock: 1, maxStock: 4, growTime: 33000, stages: 4, color: 0x4361ee, icon: '🫐', preferredWeather: 'Frost Night', mutationChance: 0.065, description: 'Compact berries that benefit from cold nights.', category: 'Profit' },
  { id: 'pumpkin', name: 'Pumpkin', rarity: 'Uncommon', buyPrice: 30, baseSellPrice: 86, stockChance: 0.52, minStock: 1, maxStock: 3, growTime: 42000, stages: 5, color: 0xf77f00, icon: '🎃', preferredWeather: 'Golden Hour', mutationChance: 0.07, description: 'Large crop with strong sell value.', category: 'Profit' },
  { id: 'watermelon', name: 'Watermelon', rarity: 'Uncommon', buyPrice: 34, baseSellPrice: 98, stockChance: 0.48, minStock: 1, maxStock: 3, growTime: 46000, stages: 5, color: 0xff6347, icon: '🍉', preferredWeather: 'Rain', mutationChance: 0.065, description: 'Slow but juicy profit crop.', category: 'Profit' },
  { id: 'pepper', name: 'Pepper', rarity: 'Uncommon', buyPrice: 20, baseSellPrice: 57, stockChance: 0.6, minStock: 1, maxStock: 4, growTime: 28000, stages: 4, color: 0xff4500, icon: '🌶️', preferredWeather: 'Heatwave', mutationChance: 0.055, description: 'Spicy crop that likes hot markets.', category: 'Profit' },
  { id: 'goldenApple', name: 'Golden Apple', rarity: 'Rare', buyPrice: 75, baseSellPrice: 210, stockChance: 0.25, minStock: 1, maxStock: 2, growTime: 62000, stages: 5, color: 0xffd700, icon: '🍏', preferredWeather: 'Golden Hour', mutationChance: 0.09, description: 'Rare orchard seed with sparkling value.', category: 'Rare' },
  { id: 'dragonfruit', name: 'Dragonfruit', rarity: 'Rare', buyPrice: 120, baseSellPrice: 360, stockChance: 0.18, minStock: 1, maxStock: 2, growTime: 76000, stages: 5, color: 0xff1493, icon: '🐉', preferredWeather: 'Heatwave', mutationChance: 0.1, description: 'High-value exotic crop with risky timing.', category: 'Rare' },
  { id: 'crystalMelon', name: 'Crystal Melon', rarity: 'Epic', buyPrice: 180, baseSellPrice: 610, stockChance: 0.12, minStock: 1, maxStock: 1, growTime: 92000, stages: 5, color: 0x80f7ff, icon: '💎', preferredWeather: 'Meteor Shower', mutationChance: 0.12, description: 'A crystalline melon that shines during cosmic events.', category: 'Rare' },
  { id: 'moonflower', name: 'Moonflower', rarity: 'Epic', buyPrice: 150, baseSellPrice: 520, stockChance: 0.14, minStock: 1, maxStock: 1, growTime: 86000, stages: 5, color: 0xdedcff, icon: '🌙', preferredWeather: 'Frost Night', mutationChance: 0.12, description: 'Blooms brightest when the farm goes quiet.', category: 'Rare' },
  { id: 'emberPepper', name: 'Ember Pepper', rarity: 'Epic', buyPrice: 165, baseSellPrice: 560, stockChance: 0.14, minStock: 1, maxStock: 1, growTime: 84000, stages: 5, color: 0xff6b35, icon: '🔥', preferredWeather: 'Heatwave', mutationChance: 0.11, description: 'A blazing pepper with heatwave bonuses.', category: 'Rare' },
  { id: 'rainLily', name: 'Rain Lily', rarity: 'Rare', buyPrice: 70, baseSellPrice: 220, stockChance: 0.28, minStock: 1, maxStock: 2, growTime: 52000, stages: 4, color: 0x8ecae6, icon: '🌧️', preferredWeather: 'Rain', mutationChance: 0.09, description: 'Grows especially fast in rain.', category: 'Weather' },
  { id: 'sunburstCorn', name: 'Sunburst Corn', rarity: 'Rare', buyPrice: 80, baseSellPrice: 250, stockChance: 0.25, minStock: 1, maxStock: 2, growTime: 56000, stages: 5, color: 0xffd60a, icon: '☀️', preferredWeather: 'Heatwave', mutationChance: 0.085, description: 'A sunny crop that sells well in heat.', category: 'Weather' },
  { id: 'frostBerry', name: 'Frost Berry', rarity: 'Rare', buyPrice: 88, baseSellPrice: 280, stockChance: 0.22, minStock: 1, maxStock: 2, growTime: 58000, stages: 4, color: 0xbde0fe, icon: '❄️', preferredWeather: 'Frost Night', mutationChance: 0.095, description: 'Thrives when ordinary crops slow down.', category: 'Weather' },
  { id: 'stormroot', name: 'Stormroot', rarity: 'Epic', buyPrice: 135, baseSellPrice: 460, stockChance: 0.16, minStock: 1, maxStock: 1, growTime: 78000, stages: 5, color: 0x7b2cbf, icon: '⛈️', preferredWeather: 'Thunderstorm', mutationChance: 0.13, description: 'Charged roots grow quickly in storms.', category: 'Weather' },
  { id: 'mooncapMushroom', name: 'Mooncap Mushroom', rarity: 'Epic', buyPrice: 145, baseSellPrice: 500, stockChance: 0.15, minStock: 1, maxStock: 1, growTime: 76000, stages: 4, color: 0xcdb4db, icon: '🍄', preferredWeather: 'Frost Night', mutationChance: 0.14, description: 'A night-loving mushroom with cold bonuses.', category: 'Weather' },
  { id: 'rainbowCarrot', name: 'Rainbow Carrot', rarity: 'Legendary', buyPrice: 260, baseSellPrice: 1000, stockChance: 0.08, minStock: 1, maxStock: 1, growTime: 105000, stages: 5, color: 0xff5fd2, icon: '🌈', preferredWeather: 'Bee Swarm', mutationChance: 0.18, description: 'A mutation-prone carrot with wild color.', category: 'Mutation' },
  { id: 'giantTomato', name: 'Giant Tomato', rarity: 'Legendary', buyPrice: 300, baseSellPrice: 1160, stockChance: 0.07, minStock: 1, maxStock: 1, growTime: 112000, stages: 5, color: 0xd00000, icon: '🍅', preferredWeather: 'Rain', mutationChance: 0.16, description: 'Huge crop, huge target, huge payout.', category: 'Mutation' },
  { id: 'goldenPumpkin', name: 'Golden Pumpkin', rarity: 'Legendary', buyPrice: 360, baseSellPrice: 1350, stockChance: 0.06, minStock: 1, maxStock: 1, growTime: 118000, stages: 5, color: 0xffc300, icon: '🏆', preferredWeather: 'Golden Hour', mutationChance: 0.18, description: 'A glittering pumpkin that announces wealth.', category: 'Mutation' },
  { id: 'crystalBlueberry', name: 'Crystal Blueberry', rarity: 'Legendary', buyPrice: 330, baseSellPrice: 1240, stockChance: 0.065, minStock: 1, maxStock: 1, growTime: 110000, stages: 5, color: 0x72ddf7, icon: '🔷', preferredWeather: 'Meteor Shower', mutationChance: 0.2, description: 'A gem-bright berry that loves meteor dust.', category: 'Mutation' },
  { id: 'shadowDragonfruit', name: 'Shadow Dragonfruit', rarity: 'Mythic', buyPrice: 550, baseSellPrice: 2400, stockChance: 0.025, minStock: 1, maxStock: 1, growTime: 155000, stages: 5, color: 0x3a0ca3, icon: '🌑', preferredWeather: 'Fog', mutationChance: 0.22, description: 'Extremely rare and excellent for thieves.', category: 'Mutation' },
  { id: 'kingCrop', name: 'King Crop', rarity: 'Mythic', buyPrice: 800, baseSellPrice: 3800, stockChance: 0.018, minStock: 1, maxStock: 1, growTime: 210000, stages: 5, color: 0xf4d35e, icon: '👑', preferredWeather: 'Golden Hour', mutationChance: 0.25, description: 'Server-famous crop, painfully slow and valuable.', category: 'Competition' },
  { id: 'loudBloom', name: 'Loud Bloom', rarity: 'Legendary', buyPrice: 380, baseSellPrice: 1500, stockChance: 0.055, minStock: 1, maxStock: 1, growTime: 120000, stages: 5, color: 0xff70a6, icon: '📣', preferredWeather: 'Bee Swarm', mutationChance: 0.17, description: 'Alerts the garden when it reaches full bloom.', category: 'Competition' },
  { id: 'thiefVine', name: 'Thief Vine', rarity: 'Epic', buyPrice: 160, baseSellPrice: 520, stockChance: 0.13, minStock: 1, maxStock: 1, growTime: 78000, stages: 5, color: 0x386641, icon: '🛡️', preferredWeather: 'Fog', mutationChance: 0.1, description: 'Protects nearby crops slightly from thieves.', category: 'Competition' },
  { id: 'bountyFruit', name: 'Bounty Fruit', rarity: 'Legendary', buyPrice: 420, baseSellPrice: 1600, stockChance: 0.05, minStock: 1, maxStock: 1, growTime: 128000, stages: 5, color: 0xffb703, icon: '💰', preferredWeather: 'Market Boom', mutationChance: 0.16, description: 'Bonus value during server events.', category: 'Competition' },
  { id: 'meteorSeed', name: 'Meteor Seed', rarity: 'Mythic', buyPrice: 650, baseSellPrice: 3100, stockChance: 0.01, minStock: 1, maxStock: 1, growTime: 180000, stages: 5, color: 0xff4800, icon: '☄️', preferredWeather: 'Meteor Shower', mutationChance: 0.28, description: 'A strange seed that appears during meteor showers.', category: 'Event' },
];

const requestedSeedIds = new Set(SEED_DATABASE.map(seed => seed.id));
for (const key of Object.keys(SEED_CATALOG)) {
  if (!requestedSeedIds.has(key)) delete SEED_CATALOG[key];
}
for (const seed of SEED_DATABASE) {
  const rarity = RARITY_CONFIG[seed.rarity] || RARITY_CONFIG.Common;
  SEED_CATALOG[seed.id] = {
    ...seed,
    rarityRank: rarity.rank,
    rarityColor: rarity.border,
    baseSellPrice: Math.round(seed.baseSellPrice * rarity.sellMultiplier),
    stockChance: Math.max(0.01, Math.min(0.98, seed.stockChance * rarity.stockMultiplier)),
    growTime: Math.round(seed.growTime * rarity.growMultiplier),
    mutationChance: Math.max(0, Math.min(0.9, seed.mutationChance + rarity.mutationBonus)),
  };
}

const STARTING_MONEY  = 100;
const STARTING_SEEDS  = { carrot: 3, tomato: 1 };
const MUTATION_CHANCE = 0.05; // 5% chance double value on harvest
const MUTATION_MULTIPLIER = 2; // mutated crops sell for 2x
const MAX_HEALTH = 100;
const BOOST_TICK_MS = 2000;
const PLOT_SPACING = 10;
const POSITION_SYNC_MS = 100;

// Make every plant seed at least 2x more expensive than the old economy.
for (const info of Object.values(SEED_CATALOG)) {
  info.buyPrice *= 2;
}

const GEAR_CATALOG = {
  wateringCan: { name: 'Watering Can', type: 'booster', buyPrice: 90, size: 2, durationMs: 15000, speedMultiplier: 2 },
  sprinkler: { name: 'Sprinkler', type: 'booster', buyPrice: 240, size: 3, durationMs: 60000, speedMultiplier: 2 },
  ak47: { name: 'AK-47', type: 'weapon', buyPrice: 650, damage: 25, ammoOnBuy: 30, range: 13 },
  shotgun: { name: 'Shotgun', type: 'weapon', buyPrice: 900, damage: 50, ammoOnBuy: 12, range: 7 },
  minigun: { name: 'Minigun', type: 'weapon', buyPrice: 1800, damage: 16, ammoOnBuy: 80, range: 14 },
};

const PERENNIAL_SEEDS = new Set([
  'strawberry',
  'blueberry',
  'goldenApple',
  'dragonfruit',
  'frostBerry',
  'crystalBlueberry',
  'shadowDragonfruit',
  'bountyFruit',
]);

const WEAPON_CATALOG = {
  pistol: { name: 'Pistol', damage: 34, range: 11 },
  ak47: GEAR_CATALOG.ak47,
  shotgun: GEAR_CATALOG.shotgun,
  minigun: GEAR_CATALOG.minigun,
};

const WEATHER_DURATION_MS = 180_000;
const WEATHER_EVENTS = [
  { name: 'Rain', description: 'All crops grow faster. Rain Lily surges.', growMultiplier: 1.25, mutationBonus: 0.01 },
  { name: 'Heatwave', description: 'Some crops slow down, but fiery crops sell high.', growMultiplier: 0.9, sellBoosts: { sunburstCorn: 1.35, emberPepper: 1.45 }, mutationBonus: 0 },
  { name: 'Thunderstorm', description: 'Storm crops grow fast and charged mutations can appear.', growMultiplier: 1.05, preferredGrowBoost: { stormroot: 1.65 }, mutationBonus: 0.04 },
  { name: 'Fog', description: 'Visibility drops and stealing is easier.', growMultiplier: 1.0, mutationBonus: 0.015 },
  { name: 'Golden Hour', description: 'Sell prices rise temporarily.', growMultiplier: 1.05, sellMultiplier: 1.25, mutationBonus: 0.015 },
  { name: 'Meteor Shower', description: 'Meteor seeds and fertilizer can appear around the map.', growMultiplier: 1.0, stockBoosts: { meteorSeed: 0.22, crystalMelon: 0.12, crystalBlueberry: 0.12 }, mutationBonus: 0.05 },
  { name: 'Bee Swarm', description: 'Mutation chances rise across the server.', growMultiplier: 1.1, mutationBonus: 0.08 },
  { name: 'Frost Night', description: 'Normal crops slow down, cold crops become valuable.', growMultiplier: 0.82, sellBoosts: { frostBerry: 1.5, mooncapMushroom: 1.35 }, mutationBonus: 0.025 },
  { name: 'Market Crash', description: 'Common crop sell prices drop and rare crops matter more.', growMultiplier: 1.0, sellMultiplier: 0.85, rareSellMultiplier: 1.18, mutationBonus: 0 },
  { name: 'Market Boom', description: 'Sell prices rise. Harvest and sell fast.', growMultiplier: 1.0, sellMultiplier: 1.35, mutationBonus: 0.01 },
];
let weatherIndex = 0;
let currentWeather = WEATHER_EVENTS[weatherIndex];
let nextWeather = WEATHER_EVENTS[(weatherIndex + 1) % WEATHER_EVENTS.length];
let weatherEndsAt = Date.now() + WEATHER_DURATION_MS;

// Garden expansion levels: level 0 = 3x3, level 1 = 4x4, etc.
const EXPANSION_COSTS = [500, 1000, 5000, 10000]; // costs for levels 1-4
const GRID_SIZES = [3, 4, 5, 6]; // grid sizes for levels 0-3

// ─── Crop Sell Price State ────────────────────────────────────────────────────
let cropPrices = {};
let restockCount = 0;
const RESTOCK_MS = 180_000; // every 3 minutes
const PRICE_UPDATE_EVERY = 3; // update prices every 3 restocks
let nextRestockAt = Date.now() + RESTOCK_MS;

function initializeCropPrices() {
  cropPrices = {};
  for (const [key, info] of Object.entries(SEED_CATALOG)) {
    cropPrices[key] = {
      baseSellPrice: info.baseSellPrice,
      currentSellPrice: info.baseSellPrice,
      previousSellPrice: info.baseSellPrice,
      trend: 'neutral',
      trendPercent: 0,
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

function updateCropPrices() {
  for (const [key, priceInfo] of Object.entries(cropPrices)) {
    const seed = SEED_CATALOG[key];
    priceInfo.previousSellPrice = priceInfo.currentSellPrice;
    const swing = 0.12 + ((seed?.rarityRank || 1) * 0.025);
    const change = (Math.random() - 0.5) * swing * 2;
    const newPrice = Math.round(priceInfo.baseSellPrice * (1 + change) * getWeatherSellMultiplier(key));
    priceInfo.currentSellPrice = Math.max(1, newPrice);
    if (priceInfo.currentSellPrice > priceInfo.previousSellPrice) {
      priceInfo.trend = 'up';
    } else if (priceInfo.currentSellPrice < priceInfo.previousSellPrice) {
      priceInfo.trend = 'down';
    } else {
      priceInfo.trend = 'neutral';
    }
    priceInfo.trendPercent = priceInfo.previousSellPrice
      ? Math.round(((priceInfo.currentSellPrice - priceInfo.previousSellPrice) / priceInfo.previousSellPrice) * 100)
      : 0;
  }
}

function cropPricesForWelcome() {
  const prices = {};
  for (const [key, info] of Object.entries(cropPrices)) {
    prices[key] = { ...info };
  }
  return prices;
}

function getShopStock() {
  const stock = {};
  for (const [key, info] of Object.entries(SEED_CATALOG)) {
    const eventBoost = currentWeather.stockBoosts?.[key] || 0;
    const chance = Math.min(0.98, info.stockChance + eventBoost);
    if (Math.random() >= chance) {
      stock[key] = 0;
      continue;
    }
    const minStock = info.minStock ?? 1;
    const maxStock = Math.max(minStock, info.maxStock ?? minStock);
    stock[key] = minStock + Math.floor(Math.random() * (maxStock - minStock + 1));
  }
  return stock;
}

let currentShopStock = getShopStock();

function restock() {
  restockCount++;
  nextRestockAt = Date.now() + RESTOCK_MS;
  currentShopStock = getShopStock();
  
  if (restockCount % PRICE_UPDATE_EVERY === 0) {
    updateCropPrices();
    broadcast({ type: 'cropPricesChanged', prices: cropPrices, restockCount });
    console.log(`[shop] crop prices updated (restock ${restockCount})`);
  }
  
  broadcast({ type: 'shopRestocked', stock: currentShopStock, restockCount, nextRestockAt });
  console.log(`[shop] restocked #${restockCount}`);
}

initializeCropPrices();
setInterval(restock, RESTOCK_MS);
setInterval(rotateWeather, WEATHER_DURATION_MS);

function rotateWeather() {
  weatherIndex = (weatherIndex + 1) % WEATHER_EVENTS.length;
  currentWeather = WEATHER_EVENTS[weatherIndex];
  nextWeather = WEATHER_EVENTS[(weatherIndex + 1) % WEATHER_EVENTS.length];
  weatherEndsAt = Date.now() + WEATHER_DURATION_MS;
  updateCropPrices();
  currentShopStock = getShopStock();
  broadcast({ type: 'weatherChanged', weather: getWeatherState() });
  broadcast({ type: 'cropPricesChanged', prices: cropPrices, restockCount, weather: getWeatherState() });
  broadcast({ type: 'shopRestocked', stock: currentShopStock, restockCount, nextRestockAt });
  broadcast({ type: 'worldEvent', message: `${currentWeather.name} has started! ${currentWeather.description}`, event: currentWeather.name });
}

function getWeatherState() {
  return {
    current: currentWeather.name,
    description: currentWeather.description,
    endsAt: weatherEndsAt,
    timeRemainingMs: Math.max(0, weatherEndsAt - Date.now()),
    next: nextWeather.name,
  };
}

function getWeatherGrowMultiplier(seedType) {
  const seed = SEED_CATALOG[seedType];
  let multiplier = currentWeather.growMultiplier || 1;
  if (seed?.preferredWeather === currentWeather.name) multiplier *= 1.45;
  if (currentWeather.preferredGrowBoost?.[seedType]) multiplier *= currentWeather.preferredGrowBoost[seedType];
  if (currentWeather.name === 'Rain' && seedType === 'rainLily') multiplier *= 1.6;
  if (currentWeather.name === 'Frost Night' && !['frostBerry', 'mooncapMushroom'].includes(seedType)) multiplier *= 0.82;
  return Math.max(0.35, multiplier);
}

function getWeatherSellMultiplier(seedType) {
  const seed = SEED_CATALOG[seedType];
  let multiplier = currentWeather.sellMultiplier || 1;
  if (currentWeather.sellBoosts?.[seedType]) multiplier *= currentWeather.sellBoosts[seedType];
  if (currentWeather.name === 'Market Crash' && seed?.rarity === 'Common') multiplier *= 0.7;
  if (currentWeather.name === 'Market Crash' && (seed?.rarityRank || 1) >= 3) multiplier *= currentWeather.rareSellMultiplier || 1;
  if (seed?.preferredWeather === currentWeather.name) multiplier *= 1.08;
  return multiplier;
}

function getWeatherMutationBonus(seedType) {
  const seed = SEED_CATALOG[seedType];
  let bonus = currentWeather.mutationBonus || 0;
  if (seed?.preferredWeather === currentWeather.name) bonus += 0.035;
  if (currentWeather.name === 'Thunderstorm' && ['tomato', 'pepper', 'stormroot'].includes(seedType)) bonus += 0.06;
  return bonus;
}

// ─── Player Store ─────────────────────────────────────────────────────────────
const players = new Map(); // playerId → playerState

function createPlayer(id, slotIndex = 0) {
  const gridSize = GRID_SIZES[0]; // start at 3x3
  const plotOrigin = getPlotOrigin(slotIndex);
  
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
    gear: {},
    weapons: { pistol: true },
    ammo: { pistol: 6 },
    activeWeapon: 'pistol',
    health: MAX_HEALTH,
    plotOrigin,
    position: getSpawnPosition(plotOrigin),
    holdingStolen: null,
    protectedUntil: Date.now() + 60_000,
    progression: {
      level: 1,
      xp: 0,
      season: 'Spring',
      achievements: {},
      collection: { crops: {}, mutations: {}, weatherVariants: {}, giantCrops: 0, eventCrops: {} },
      quests: [
        { id: 'harvest-5', label: 'Harvest 5 crops', progress: 0, target: 5 },
        { id: 'shop-2', label: 'Buy from the shop twice', progress: 0, target: 2 },
      ],
      mastery: {},
      stats: { harvests: 0, steals: 0, rareFinds: 0, biggestHarvest: 0 },
    },
    activeBoosts: [],
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
    gear: player.gear,
    weapons: player.weapons,
    ammo: player.ammo,
    activeWeapon: player.activeWeapon,
    health: player.health,
    maxHealth: MAX_HEALTH,
    plotOrigin: player.plotOrigin,
    position: player.position,
    holdingStolen: player.holdingStolen,
    protectedUntil: player.protectedUntil,
    progression: player.progression,
    expansionLevel: player.expansionLevel,
    gridSize: GRID_SIZES[player.expansionLevel],
    plots: player.plots.map(plot => ({
      id: plot.id,
      playerId: plot.playerId,
      originX: player.plotOrigin.x,
      originZ: player.plotOrigin.z,
      cells: plot.cells.map(cell => {
        if (!cell.plant) return { row: cell.row, col: cell.col, plant: null };
        const { seedType, stage, mutated, mutationName, quality, plantedAt, growTime, regrowing, perennial } = cell.plant;
        const elapsed = Date.now() - plantedAt;
        const progress = Math.min((elapsed * getWeatherGrowMultiplier(seedType)) / growTime, 1);
        return {
          row: cell.row,
          col: cell.col,
          plant: { seedType, stage, mutated, mutationName, quality, progress, regrowing, perennial },
        };
      }),
    })),
  };
}

// ─── Growth Ticks ─────────────────────────────────────────────────────────────
setInterval(() => {
  let anyChanged = false;
  const now = Date.now();
  for (const [, player] of players) {
    player.activeBoosts = player.activeBoosts.filter(boost => boost.endsAt > now);
    for (const plot of player.plots) {
      for (const cell of plot.cells) {
        if (!cell.plant) continue;
        const boost = getActiveBoost(player, cell.row, cell.col, now);
        if (boost) {
          cell.plant.plantedAt -= BOOST_TICK_MS * (boost.speedMultiplier - 1);
        }
        const { plantedAt, growTime, stage, seedType } = cell.plant;
        const seedInfo = SEED_CATALOG[seedType];
        const maxStages = seedInfo?.stages ?? 4;
        const effectiveGrowTime = growTime / getWeatherGrowMultiplier(seedType);
        const targetStage = Math.min(
          Math.floor(((Date.now() - plantedAt) / effectiveGrowTime) * maxStages),
          maxStages - 1
        );
        if (targetStage !== stage) {
          cell.plant.stage = targetStage;
          anyChanged = true;
        }
        if (targetStage >= maxStages - 1 && !cell.plant.quality) {
          const result = rollCropFinish(seedType);
          cell.plant.quality = result.quality;
          cell.plant.mutated = !!result.mutationName;
          cell.plant.mutationName = result.mutationName;
          if (['loudBloom', 'kingCrop', 'meteorSeed'].includes(seedType)) {
            broadcast({ type: 'worldEvent', message: `${seedInfo.name} is ready in ${player.id}'s garden!`, event: 'Rare Crop Ready' });
          }
          anyChanged = true;
        }
      }
    }
  }
  if (anyChanged) broadcastAllGardens();
}, 2000); // check every 2s

// Keep late or briefly disconnected clients in sync with player positions.
setInterval(() => {
  if (players.size > 1) broadcastAllGardens();
}, 1000);

function getActiveBoost(player, row, col, now = Date.now()) {
  return player.activeBoosts.find(boost =>
    boost.endsAt > now
      && row >= boost.row
      && col >= boost.col
      && row < boost.row + boost.size
      && col < boost.col + boost.size
  );
}

function rollCropFinish(seedType) {
  const seed = SEED_CATALOG[seedType] || {};
  const qualityRoll = Math.random();
  let quality = 'Normal';
  if (qualityRoll > 0.985) quality = 'Giant';
  else if (qualityRoll > 0.955) quality = 'Rainbow';
  else if (qualityRoll > 0.88) quality = 'Gold';
  else if (qualityRoll > 0.68) quality = 'Silver';

  const mutationChance = Math.min(0.85, (seed.mutationChance ?? MUTATION_CHANCE) + getWeatherMutationBonus(seedType));
  const mutationName = Math.random() < mutationChance ? mutationFor(seedType) : null;
  return { quality, mutationName };
}

function mutationFor(seedType) {
  if (currentWeather.name === 'Thunderstorm' && seedType === 'tomato') return 'Storm Tomato';
  if (currentWeather.name === 'Thunderstorm' && seedType === 'pepper') return 'Lightning Pepper';
  const names = {
    carrot: 'Rainbow Carrot',
    tomato: 'Giant Tomato',
    pumpkin: 'Golden Pumpkin',
    blueberry: 'Crystal Blueberry',
    dragonfruit: 'Shadow Dragonfruit',
    rainbowCarrot: 'Rainbow Carrot',
    giantTomato: 'Giant Tomato',
    goldenPumpkin: 'Golden Pumpkin',
    crystalBlueberry: 'Crystal Blueberry',
    shadowDragonfruit: 'Shadow Dragonfruit',
  };
  return names[seedType] || `${SEED_CATALOG[seedType]?.name || 'Crop'} Mutation`;
}

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
  const player   = createPlayer(playerId, players.size);
  player.ws      = ws;
  players.set(playerId, player);

  console.log(`[+] ${playerId} connected (${players.size} online)`);

  // Send the joining player their full state + shop info
  send(ws, {
    type: 'welcome',
    playerId,
    serverFeatures: { positionUpdates: true, serverPlots: true, heldStolenVisuals: true, perennialCrops: true },
    state: getPlayerPublic(player),
    shop: { 
      catalog: SEED_CATALOG,
      stock: currentShopStock,
      cropPrices: cropPricesForWelcome(),
      gearCatalog: GEAR_CATALOG,
      weaponCatalog: WEAPON_CATALOG,
      restockCount,
      nextRestockAt,
    },
    weather: getWeatherState(),
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
  if (msg.type === 'updatePosition' || msg.type === 'playerPosition' || msg.type === 'movePlayer') {
    updatePlayerPosition(player, msg);
    return;
  }

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
      broadcast({ type: 'shopRestocked', stock: currentShopStock, restockCount, nextRestockAt });
      break;
    }

    case 'buyGear': {
      const { itemType } = msg;
      const item = GEAR_CATALOG[itemType];
      if (!item) return sendError(player, 'Unknown gear item');
      if (player.money < item.buyPrice) return sendError(player, 'Not enough money');
      player.money -= item.buyPrice;
      if (item.type === 'weapon') {
        player.weapons[itemType] = true;
        player.ammo[itemType] = (player.ammo[itemType] || 0) + item.ammoOnBuy;
        player.activeWeapon = itemType;
      } else {
        player.gear[itemType] = (player.gear[itemType] || 0) + 1;
      }
      sendState(player);
      break;
    }

    case 'useGear': {
      const { itemType, plotId, cellRow, cellCol } = msg;
      const item = GEAR_CATALOG[itemType];
      if (!item || item.type !== 'booster') return sendError(player, 'That gear cannot be used on crops');
      if ((player.gear[itemType] || 0) < 1) return sendError(player, `No ${item.name} in inventory`);
      const plot = player.plots[plotId];
      if (!plot || plot.playerId !== player.id) return sendError(player, 'Invalid plot');
      if (!plot.cells.find(c => c.row === cellRow && c.col === cellCol)) return sendError(player, 'Invalid cell');
      player.gear[itemType]--;
      player.activeBoosts.push({
        itemType,
        row: cellRow,
        col: cellCol,
        size: item.size,
        speedMultiplier: item.speedMultiplier,
        endsAt: Date.now() + item.durationMs,
      });
      sendState(player);
      send(player.ws, { type: 'gearUsed', itemType, durationMs: item.durationMs });
      break;
    }

    case 'equipWeapon': {
      const { weaponType } = msg;
      if (!player.weapons[weaponType]) return sendError(player, 'You do not own that weapon');
      player.activeWeapon = weaponType;
      sendState(player);
      break;
    }

    case 'shootPlayer': {
      const target = players.get(msg.targetId);
      if (!target) return sendError(player, 'Target is gone');
      const weapon = WEAPON_CATALOG[player.activeWeapon];
      if (!weapon) return sendError(player, 'No weapon equipped');
      if ((player.ammo[player.activeWeapon] || 0) <= 0) return sendError(player, `${weapon.name} is out of ammo`);
      if (distance(player.position, target.position) > weapon.range) return sendError(player, 'Target is out of range');
      player.ammo[player.activeWeapon]--;
      target.health = Math.max(0, target.health - weapon.damage);
      if (target.health <= 0) {
        respawnPlayer(target);
        broadcast({ type: 'playerDefeated', attackerId: player.id, victimId: target.id });
      } else {
        broadcast({ type: 'playerHit', attackerId: player.id, victimId: target.id, health: target.health });
      }
      sendState(player);
      sendState(target);
      broadcastAllGardens();
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
        mutated: false,
        quality: null,
        mutationName: null,
        perennial: isPerennialSeed(seedType),
        regrowing: false,
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

      const { seedType, quality, mutationName } = collectReadyPlant(cell);
      addCrop(player, seedType, quality, mutationName);
      send(player.ws, { type: 'harvestPopup', seedType, quality: quality || 'Normal', mutationName });
      sendState(player);
      broadcastAllGardens();
      break;
    }

    case 'stealPlant': {
      const { ownerId, plotId, cellRow, cellCol } = msg;
      if (player.holdingStolen) return sendError(player, 'Return your stolen crop before stealing another');
      if (ownerId === player.id) return sendError(player, 'Use harvest mode on your own garden to harvest');
      const owner = players.get(ownerId);
      if (!owner) return sendError(player, 'That player is no longer online');
      if ((owner.protectedUntil || 0) > Date.now()) return sendError(player, 'That garden is protected');
      const plot = owner.plots[plotId];
      if (!plot) return sendError(player, 'Invalid target plot');
      const cell = plot.cells.find(c => c.row === cellRow && c.col === cellCol);
      if (!cell || !cell.plant) return sendError(player, 'Nothing to steal');
      const maxStages = SEED_CATALOG[cell.plant.seedType]?.stages ?? 4;
      if (cell.plant.stage < maxStages - 1) return sendError(player, 'That crop is not ready yet');
      const { seedType, quality, mutationName } = collectReadyPlant(cell);
      player.holdingStolen = { ownerId, seedType, quality: quality || 'Normal', mutationName };
      sendState(player);
      sendState(owner);
      broadcast({ type: 'cropStolen', thiefId: player.id, ownerId, seedType });
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
        earned += Math.round(cropStackValue(cropStack, priceInfo.currentSellPrice));
        player.crops[seedType] = emptyCropStack();
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

function updatePlayerPosition(player, msg) {
  const source = msg.position || msg;
  const x = Number(source.x);
  const z = Number(source.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  player.position = { x: clamp(x, -150, 150), z: clamp(z, -150, 150) };
  maybeDepositStolenCrop(player);
  broadcast({
    type: 'playerMoved',
    playerId: player.id,
    position: player.position,
    health: player.health,
    holdingStolen: player.holdingStolen,
  });
  const now = Date.now();
  if (!player.lastPositionSyncAt || now - player.lastPositionSyncAt >= POSITION_SYNC_MS) {
    player.lastPositionSyncAt = now;
    broadcastAllGardens();
  }
}

function maybeDepositStolenCrop(player) {
  if (!player.holdingStolen) return;
  if (!isAtOwnPlot(player)) return;
  const { seedType, quality, mutationName } = player.holdingStolen;
  addCrop(player, seedType, quality, mutationName);
  player.holdingStolen = null;
  send(player.ws, { type: 'stolenDeposited', seedType });
  sendState(player);
}

function isAtOwnPlot(player) {
  const gridSize = GRID_SIZES[player.expansionLevel] || 3;
  const plotRadius = Math.max(5.5, gridSize * 0.85 + 2.6);
  return distance(player.position, player.plotOrigin) <= plotRadius
    || distance(player.position, getSpawnPosition(player.plotOrigin)) <= 4;
}

function collectReadyPlant(cell) {
  const { seedType, quality, mutationName } = cell.plant;
  if (isPerennialSeed(seedType)) {
    startPerennialRegrowth(cell, seedType);
  } else {
    cell.plant = null;
  }
  return { seedType, quality: quality || 'Normal', mutationName };
}

function isPerennialSeed(seedType) {
  return PERENNIAL_SEEDS.has(seedType);
}

function startPerennialRegrowth(cell, seedType) {
  const seed = SEED_CATALOG[seedType] || {};
  const maxStages = seed.stages ?? 4;
  const regrowTime = Math.max(12000, Math.round((seed.growTime || 30000) * 0.45));
  const baseStage = Math.max(1, Math.min(maxStages - 2, Math.floor(maxStages * 0.45)));
  const backdate = Math.round(regrowTime * (baseStage / maxStages));
  cell.plant = {
    seedType,
    stage: baseStage,
    plantedAt: Date.now() - backdate,
    growTime: regrowTime,
    mutated: false,
    quality: null,
    mutationName: null,
    regrowing: true,
    perennial: true,
  };
}

function respawnPlayer(player) {
  returnHeldCrop(player);
  player.health = MAX_HEALTH;
  player.position = getSpawnPosition(player.plotOrigin);
}

function getPlotOrigin(slotIndex) {
  if (slotIndex === 0) return { x: 0, z: 8 };
  const ring = Math.ceil(slotIndex / 8);
  const sideIndex = (slotIndex - 1) % 8;
  const positions = [
    { x: ring, z: 0 },
    { x: ring, z: ring },
    { x: 0, z: ring },
    { x: -ring, z: ring },
    { x: -ring, z: 0 },
    { x: -ring, z: -ring },
    { x: 0, z: -ring },
    { x: ring, z: -ring },
  ];
  const pos = positions[sideIndex];
  return { x: pos.x * PLOT_SPACING, z: 8 + pos.z * PLOT_SPACING };
}

function getSpawnPosition(plotOrigin) {
  return { x: plotOrigin.x, z: plotOrigin.z + 5 };
}

function returnHeldCrop(player) {
  if (!player.holdingStolen) return;
  const owner = players.get(player.holdingStolen.ownerId);
  if (owner) {
    const { seedType, quality, mutationName } = player.holdingStolen;
    addCrop(owner, seedType, quality, mutationName);
    sendState(owner);
  }
  player.holdingStolen = null;
}

function emptyCropStack() {
  return { normal: 0, silver: 0, gold: 0, rainbow: 0, giant: 0, mutated: 0 };
}

function addCrop(player, seedType, quality = 'Normal', mutationName = null) {
  if (!player.crops[seedType]) player.crops[seedType] = emptyCropStack();
  const stack = player.crops[seedType];
  if (mutationName) stack.mutated = (stack.mutated || 0) + 1;
  else if (quality === 'Giant') stack.giant = (stack.giant || 0) + 1;
  else if (quality === 'Rainbow') stack.rainbow = (stack.rainbow || 0) + 1;
  else if (quality === 'Gold') stack.gold = (stack.gold || 0) + 1;
  else if (quality === 'Silver') stack.silver = (stack.silver || 0) + 1;
  else stack.normal = (stack.normal || 0) + 1;
}

function cropStackValue(cropStack, sellPrice) {
  if (typeof cropStack === 'number') return sellPrice * cropStack;
  return sellPrice * (
    (cropStack.normal || 0)
    + (cropStack.silver || 0) * 1.25
    + (cropStack.gold || 0) * 1.6
    + (cropStack.rainbow || 0) * 2.25
    + (cropStack.giant || 0) * 2.75
    + (cropStack.mutated || 0) * MUTATION_MULTIPLIER
  );
}

function distance(a, b) {
  const dx = (a?.x || 0) - (b?.x || 0);
  const dz = (a?.z || 0) - (b?.z || 0);
  return Math.sqrt(dx * dx + dz * dz);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sendState(player) {
  send(player.ws, { type: 'stateUpdate', state: getPlayerPublic(player) });
}

function sendError(player, message) {
  send(player.ws, { type: 'error', message });
  console.warn(`[error] ${player.id}: ${message}`);
}

