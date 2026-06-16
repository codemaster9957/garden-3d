/**
 * seeds.js — Seed catalog for client-side rendering.
 * Server is authoritative for prices/grow-times; this file drives visuals only.
 * 
 * STOCK TIERS:
 * - COMMON (9 seeds): Appear frequently, often reach 4-5+ stock
 * - UNCOMMON (9 seeds): Less frequent, usually 1-3 stock
 * - RARE (1 seed): Uncommon, usually 0-2 stock
 * - ULTRA-RARE (1 seed): Almost never, usually 0-1 stock
 */

export const SEED_CATALOG = {
  // ━━ COMMON ━━
  lettuce:     { name: 'Lettuce',     color: 0x52B788, stemColor: 0x52b788, hotkey: '1' },
  radish:      { name: 'Radish',      color: 0xFF6B9D, stemColor: 0x52b788, hotkey: '2' },
  carrot:      { name: 'Carrot',      color: 0xF4A261, stemColor: 0x52b788, hotkey: '3' },
  spinach:     { name: 'Spinach',     color: 0x006400, stemColor: 0x2d6a4f, hotkey: '4' },
  strawberry:  { name: 'Strawberry',  color: 0xFF69B4, stemColor: 0x2d6a4f, hotkey: '5' },
  cucumber:    { name: 'Cucumber',    color: 0x228B22, stemColor: 0x52b788, hotkey: '6' },
  corn:        { name: 'Corn',        color: 0xFFD700, stemColor: 0x52b788, hotkey: '7' },
  sunflower:   { name: 'Sunflower',   color: 0xFFD60A, stemColor: 0x52b788, hotkey: '8' },
  tomato:      { name: 'Tomato',      color: 0xE63946, stemColor: 0x2d6a4f, hotkey: '9' },
  
  // ━━ UNCOMMON ━━
  broccoli:    { name: 'Broccoli',    color: 0x228B22, stemColor: 0x52b788, hotkey: '0' },
  beet:        { name: 'Beet',        color: 0x8B0000, stemColor: 0x2d6a4f },
  pepper:      { name: 'Pepper',      color: 0xFF4500, stemColor: 0x52b788 },
  eggplant:    { name: 'Eggplant',    color: 0x663399, stemColor: 0x2d6a4f },
  pumpkin:     { name: 'Pumpkin',     color: 0xF77F00, stemColor: 0x52b788 },
  garlic:      { name: 'Garlic',      color: 0xFFFFFF, stemColor: 0x52b788 },
  mushroom:    { name: 'Mushroom',    color: 0xCD853F, stemColor: 0x6f4e37 },
  blueberry:   { name: 'Blueberry',   color: 0x4361EE, stemColor: 0x2d6a4f },
  
  // ━━ RARE ━━
  watermelon:  { name: 'Watermelon',  color: 0xFF6347, stemColor: 0x2d6a4f },
  
  // ━━ ULTRA-RARE ━━
  goldenApple: { name: 'Golden Apple', color: 0xFFD700, stemColor: 0x52b788 },
  dragonfruit: { name: 'Dragonfruit', color: 0xFF1493, stemColor: 0x2d6a4f },
};

export const SEED_KEYS = Object.keys(SEED_CATALOG);

/** Returns a CSS hex string like "#F4A261" */
export function seedColorHex(seedType) {
  const c = SEED_CATALOG[seedType]?.color ?? 0xAAAAAA;
  return '#' + c.toString(16).padStart(6, '0');
}

/**
 * Returns the THREE.js color for a plant at a given stage.
 * Stage 0-2: the seed's own stem color (green hue), darkening.
 * Stage 3 (ready): the seed's fruit color, full brightness + gold tint.
 */
export function plantColor(seedType, stage, maxStages = 4) {
  const info = SEED_CATALOG[seedType];
  if (!info) return 0x888888;
  const ratio = stage / (maxStages - 1);
  if (ratio >= 1) return info.color; // fully grown — show real crop color
  // Lerp stem color brightness: dim at stage 0, bright at stage 2
  const t = ratio;
  const base = info.stemColor;
  const r = ((base >> 16) & 0xff);
  const g = ((base >> 8)  & 0xff);
  const b = ((base)       & 0xff);
  const dim = 0.35 + t * 0.65;
  return (Math.round(r * dim) << 16) | (Math.round(g * dim) << 8) | Math.round(b * dim);
}
