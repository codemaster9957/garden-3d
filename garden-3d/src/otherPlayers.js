/**
 * otherPlayers.js — Renders other connected players' gardens
 * spaced out with PLAYER_GAP distance between them.
 */

import { createGarden } from './garden.js';
import { PLAYER_GAP }   from './scene.js';

// map: playerId → { garden, label }
const others = new Map();

export function updateOtherPlayers(scene, allGardens, myPlayerId) {
  const remoteGardens = allGardens.filter(g => g.id !== myPlayerId);

  // Remove gardens for players who left
  for (const [id, entry] of others) {
    if (!remoteGardens.find(g => g.id === id)) {
      entry.garden.dispose();
      if (entry.label?.parentNode) entry.label.remove();
      others.delete(id);
    }
  }

  // Add / update remaining
  remoteGardens.forEach((gData, idx) => {
    const offsetX = (idx + 1) * PLAYER_GAP;

    if (!others.has(gData.id)) {
      const gridSize = gData.gridSize || 3;
      const garden = createGarden(scene, offsetX, 0, gridSize);
      const label  = makeLabel(gData.id, offsetX);
      others.set(gData.id, { garden, label });
    }

    const entry = others.get(gData.id);
    const gridSize = gData.gridSize || 3;
    if (entry.garden.gridSize !== gridSize) {
      entry.garden.dispose();
      entry.garden = createGarden(scene, offsetX, 0, gridSize);
    }
    const { garden } = entry;
    garden.update(gData.plots);
  });
}

function makeLabel(playerId, offsetX) {
  const label       = document.createElement('div');
  label.className   = 'player-label';
  label.textContent = `👤 ${playerId}`;
  label.style.left  = `${50 + offsetX * 3}%`;
  label.style.top   = '10px';
  document.body.appendChild(label);
  return label;
}
