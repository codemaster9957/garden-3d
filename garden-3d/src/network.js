/**
 * network.js — WebSocket client module
 * Connects to the authoritative server and dispatches incoming messages.
 * All outbound game actions go through this module.
 */

function toWebSocketUrl(value) {
  if (!value) return null;
  if (value.startsWith('ws://') || value.startsWith('wss://')) return value;
  if (value.startsWith('http://')) return value.replace(/^http:\/\//, 'ws://');
  if (value.startsWith('https://')) return value.replace(/^https:\/\//, 'wss://');
  return `wss://${value}`;
}

function getServerUrl() {
  const configuredUrl = toWebSocketUrl(import.meta.env.VITE_WS_URL);
  if (configuredUrl) return configuredUrl;

  const isLocal =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (isLocal) return 'ws://localhost:3000';

  if (location.hostname.endsWith('.netlify.app')) {
    return 'wss://garden-3d-production.up.railway.app';
  }

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}`;
}

const SERVER_URL = getServerUrl();

let socket      = null;
let connected   = false;
let playerId    = null;

// Registered listeners: type → callback[]
const listeners = {};

export function onMessage(type, cb) {
  if (!listeners[type]) listeners[type] = [];
  listeners[type].push(cb);
}

export function offMessage(type, cb) {
  if (!listeners[type]) return;
  listeners[type] = listeners[type].filter(fn => fn !== cb);
}

function dispatch(msg) {
  const fns = listeners[msg.type] || [];
  for (const fn of fns) fn(msg);
  const all = listeners['*'] || [];
  for (const fn of all) fn(msg);
}

export function getPlayerId() { return playerId; }
export function isConnected() { return connected; }

/**
 * Connect to the server. Returns a Promise that resolves once the
 * 'welcome' message is received (i.e., we have our playerId + state).
 */
export function connect() {
  return new Promise((resolve, reject) => {
    socket = new WebSocket(SERVER_URL);

    socket.addEventListener('open', () => {
      connected = true;
      console.log('[net] connected');
      dispatch({ type: 'connected' });
    });

    socket.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'welcome') {
        playerId = msg.playerId;
        resolve(msg);
      }

      dispatch(msg);
    });

    socket.addEventListener('close', () => {
      connected = false;
      playerId  = null;
      console.log('[net] disconnected');
      dispatch({ type: 'disconnected' });
    });

    socket.addEventListener('error', (err) => {
      connected = false;
      dispatch({ type: 'connectionError', err });
      reject(err);
    });
  });
}

/** Send a raw message object to the server. */
export function send(msg) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[net] not connected, dropping message:', msg);
    return;
  }
  socket.send(JSON.stringify(msg));
}

// ─── Game Action Helpers ──────────────────────────────────────────────────────

export function buySeed(seedType, qty = 1) {
  send({ type: 'buySeed', seedType, qty });
}

export function plantSeed(plotId, cellRow, cellCol, seedType) {
  send({ type: 'plantSeed', plotId, cellRow, cellCol, seedType });
}

export function harvestPlant(plotId, cellRow, cellCol) {
  send({ type: 'harvestPlant', plotId, cellRow, cellCol });
}

export function sellAll() {
  send({ type: 'sellAll' });
}

export function expandGarden() {
  send({ type: 'expandGarden' });
}

export function requestState() {
  send({ type: 'requestState' });
}

export function disconnect() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close(1000, 'tab closed');
  }
}
