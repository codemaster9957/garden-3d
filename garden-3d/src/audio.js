/**
 * audio.js - Generated ambient music with weather-aware layers.
 * No audio files are needed; the browser synthesizes the soundtrack.
 */

const PRESETS = {
  Clear: { root: 57, mode: [0, 4, 7, 11], tempo: 86, wave: 'sine', filter: 1400, gain: 0.08 },
  Rain: { root: 55, mode: [0, 3, 7, 10], tempo: 74, wave: 'triangle', filter: 1050, gain: 0.075, noise: 0.012 },
  Heatwave: { root: 52, mode: [0, 4, 7, 9], tempo: 92, wave: 'sawtooth', filter: 900, gain: 0.06 },
  Thunderstorm: { root: 50, mode: [0, 3, 7, 10], tempo: 68, wave: 'triangle', filter: 760, gain: 0.075, noise: 0.016 },
  Fog: { root: 53, mode: [0, 2, 7, 10], tempo: 64, wave: 'sine', filter: 650, gain: 0.07 },
  'Golden Hour': { root: 59, mode: [0, 4, 7, 12], tempo: 88, wave: 'triangle', filter: 1800, gain: 0.085 },
  'Meteor Shower': { root: 61, mode: [0, 2, 7, 11], tempo: 98, wave: 'sine', filter: 2200, gain: 0.08 },
  'Bee Swarm': { root: 57, mode: [0, 4, 7, 9], tempo: 104, wave: 'triangle', filter: 1700, gain: 0.075 },
  'Frost Night': { root: 58, mode: [0, 3, 7, 12], tempo: 70, wave: 'sine', filter: 1200, gain: 0.07 },
  'Market Crash': { root: 51, mode: [0, 3, 6, 10], tempo: 78, wave: 'triangle', filter: 820, gain: 0.065 },
  'Market Boom': { root: 60, mode: [0, 4, 7, 11], tempo: 104, wave: 'triangle', filter: 1900, gain: 0.08 },
};

let ctx = null;
let master = null;
let weatherName = 'Clear';
let step = 0;
let started = false;
let timer = null;

export function initMusic() {
  if (started) return;
  const start = () => {
    if (started) return;
    started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    scheduleLoop();
  };
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown', start, { once: true });
}

export function setMusicWeather(weather) {
  weatherName = weather?.current || 'Clear';
}

function scheduleLoop() {
  if (!ctx || !master) return;
  const preset = PRESETS[weatherName] || PRESETS.Clear;
  const beatMs = 60000 / preset.tempo;
  playStep(preset);
  timer = setTimeout(scheduleLoop, beatMs);
}

function playStep(preset) {
  const now = ctx.currentTime;
  const chord = preset.mode.map(interval => midiToFreq(preset.root + interval + ((step % 8) >= 4 ? 5 : 0)));
  const bass = midiToFreq(preset.root - 12 + (step % 6 === 0 ? -5 : 0));

  if (step % 4 === 0) {
    chord.forEach((freq, index) => playTone(freq, 2.4, preset.wave, preset.gain * 0.34, now + index * 0.035, preset.filter));
    playTone(bass, 1.6, 'sine', preset.gain * 0.5, now, 420);
  }

  const arpFreq = chord[(step * 2 + Math.floor(step / 3)) % chord.length] * (step % 5 === 0 ? 2 : 1);
  playTone(arpFreq, 0.22, 'triangle', preset.gain * 0.22, now, preset.filter + 600);

  if (preset.noise && step % 2 === 0) {
    playNoise(0.42, preset.noise, preset.filter);
  }
  if (weatherName === 'Thunderstorm' && step % 16 === 0) {
    playTone(midiToFreq(preset.root - 24), 0.9, 'sawtooth', 0.025, now, 180);
  }
  if (weatherName === 'Meteor Shower' && step % 5 === 0) {
    playTone(arpFreq * 2, 0.55, 'sine', 0.035, now, 2600);
  }

  step = (step + 1) % 64;
}

function playTone(freq, duration, type, gainValue, when, filterHz) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterHz, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), when + 0.045);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

function playNoise(duration, gainValue, filterHz) {
  const samples = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterHz;
  gain.gain.value = gainValue;
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();
}

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}
