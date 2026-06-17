/**
 * seeds.js - Client-side seed visuals and fallback metadata.
 * The server remains authoritative for prices, stock, growth, weather, and rewards.
 */

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

export const RARITY_STYLES = {
  Common: { color: '#9adf9a', sort: 1 },
  Uncommon: { color: '#52b788', sort: 2 },
  Rare: { color: '#4cc9f0', sort: 3 },
  Epic: { color: '#b36bff', sort: 4 },
  Legendary: { color: '#ffd166', sort: 5 },
  Mythic: { color: '#ff5c8a', sort: 6 },
};

export const SEED_CATALOG = {
  carrot: { name: 'Carrot', rarity: 'Common', color: 0xf4a261, stemColor: 0x52b788, icon: '🥕', hotkey: '1' },
  tomato: { name: 'Tomato', rarity: 'Common', color: 0xe63946, stemColor: 0x2d6a4f, icon: '🍅', hotkey: '2' },
  potato: { name: 'Potato', rarity: 'Common', color: 0xc9a66b, stemColor: 0x52b788, icon: '🥔', hotkey: '3' },
  wheat: { name: 'Wheat', rarity: 'Common', color: 0xf2c94c, stemColor: 0x8ab17d, icon: '🌾', hotkey: '4' },
  lettuce: { name: 'Lettuce', rarity: 'Common', color: 0x52b788, stemColor: 0x52b788, icon: '🥬', hotkey: '5' },
  strawberry: { name: 'Strawberry', rarity: 'Uncommon', color: 0xff69b4, stemColor: 0x2d6a4f, icon: '🍓', hotkey: '6' },
  blueberry: { name: 'Blueberry', rarity: 'Uncommon', color: 0x4361ee, stemColor: 0x2d6a4f, icon: '🫐', hotkey: '7' },
  pumpkin: { name: 'Pumpkin', rarity: 'Uncommon', color: 0xf77f00, stemColor: 0x52b788, icon: '🎃', hotkey: '8' },
  watermelon: { name: 'Watermelon', rarity: 'Uncommon', color: 0xff6347, stemColor: 0x2d6a4f, icon: '🍉', hotkey: '9' },
  pepper: { name: 'Pepper', rarity: 'Uncommon', color: 0xff4500, stemColor: 0x52b788, icon: '🌶️', hotkey: '0' },
  goldenApple: { name: 'Golden Apple', rarity: 'Rare', color: 0xffd700, stemColor: 0x52b788, icon: '🍏' },
  dragonfruit: { name: 'Dragonfruit', rarity: 'Rare', color: 0xff1493, stemColor: 0x2d6a4f, icon: '🐉' },
  crystalMelon: { name: 'Crystal Melon', rarity: 'Epic', color: 0x80f7ff, stemColor: 0x52b788, icon: '💎' },
  moonflower: { name: 'Moonflower', rarity: 'Epic', color: 0xdedcff, stemColor: 0x6c75a8, icon: '🌙' },
  emberPepper: { name: 'Ember Pepper', rarity: 'Epic', color: 0xff6b35, stemColor: 0x7f5539, icon: '🔥' },
  rainLily: { name: 'Rain Lily', rarity: 'Rare', color: 0x8ecae6, stemColor: 0x219ebc, icon: '🌧️' },
  sunburstCorn: { name: 'Sunburst Corn', rarity: 'Rare', color: 0xffd60a, stemColor: 0x52b788, icon: '☀️' },
  frostBerry: { name: 'Frost Berry', rarity: 'Rare', color: 0xbde0fe, stemColor: 0x90e0ef, icon: '❄️' },
  stormroot: { name: 'Stormroot', rarity: 'Epic', color: 0x7b2cbf, stemColor: 0x5a189a, icon: '⛈️' },
  mooncapMushroom: { name: 'Mooncap Mushroom', rarity: 'Epic', color: 0xcdb4db, stemColor: 0x6f4e37, icon: '🍄' },
  rainbowCarrot: { name: 'Rainbow Carrot', rarity: 'Legendary', color: 0xff5fd2, stemColor: 0x52b788, icon: '🌈' },
  giantTomato: { name: 'Giant Tomato', rarity: 'Legendary', color: 0xd00000, stemColor: 0x2d6a4f, icon: '🍅' },
  goldenPumpkin: { name: 'Golden Pumpkin', rarity: 'Legendary', color: 0xffc300, stemColor: 0x52b788, icon: '🏆' },
  crystalBlueberry: { name: 'Crystal Blueberry', rarity: 'Legendary', color: 0x72ddf7, stemColor: 0x2d6a4f, icon: '🔷' },
  shadowDragonfruit: { name: 'Shadow Dragonfruit', rarity: 'Mythic', color: 0x3a0ca3, stemColor: 0x1b1b3a, icon: '🌑' },
  kingCrop: { name: 'King Crop', rarity: 'Mythic', color: 0xf4d35e, stemColor: 0x6a994e, icon: '👑' },
  loudBloom: { name: 'Loud Bloom', rarity: 'Legendary', color: 0xff70a6, stemColor: 0x52b788, icon: '📣' },
  thiefVine: { name: 'Thief Vine', rarity: 'Epic', color: 0x386641, stemColor: 0x2d6a4f, icon: '🛡️' },
  bountyFruit: { name: 'Bounty Fruit', rarity: 'Legendary', color: 0xffb703, stemColor: 0x52b788, icon: '💰' },
  meteorSeed: { name: 'Meteor Seed', rarity: 'Mythic', color: 0xff4800, stemColor: 0x4a4e69, icon: '☄️' },
};

export const SEED_KEYS = Object.keys(SEED_CATALOG);

export function seedColorHex(seedType) {
  const c = SEED_CATALOG[seedType]?.color ?? 0xaaaaaa;
  return '#' + c.toString(16).padStart(6, '0');
}

export function seedIcon(seedType, serverInfo = null) {
  return serverInfo?.icon || SEED_CATALOG[seedType]?.icon || '✦';
}

export function rarityColor(rarity = 'Common') {
  return RARITY_STYLES[rarity]?.color || RARITY_STYLES.Common.color;
}

export function rarityRank(rarity = 'Common') {
  return RARITY_STYLES[rarity]?.sort || 1;
}

export function plantColor(seedType, stage, maxStages = 4, quality = 'Normal', mutationName = null) {
  const info = SEED_CATALOG[seedType];
  if (!info) return 0x888888;
  if (mutationName) return mutationColor(mutationName, info.color);
  if (quality === 'Rainbow') return 0xff5fd2;
  if (quality === 'Gold') return 0xffd700;
  if (quality === 'Silver') return 0xc0d6df;
  const ratio = stage / Math.max(maxStages - 1, 1);
  if (ratio >= 1) return info.color;
  const base = info.stemColor;
  const r = ((base >> 16) & 0xff);
  const g = ((base >> 8) & 0xff);
  const b = (base & 0xff);
  const dim = 0.35 + ratio * 0.65;
  return (Math.round(r * dim) << 16) | (Math.round(g * dim) << 8) | Math.round(b * dim);
}

function mutationColor(mutationName, fallback) {
  if (mutationName?.includes('Rainbow')) return 0xff5fd2;
  if (mutationName?.includes('Golden')) return 0xffd700;
  if (mutationName?.includes('Crystal')) return 0x80f7ff;
  if (mutationName?.includes('Shadow')) return 0x3a0ca3;
  if (mutationName?.includes('Storm') || mutationName?.includes('Lightning')) return 0x90e0ef;
  return fallback;
}
