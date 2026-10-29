// Web Audio setup
const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();
const masterGain = ctx.createGain();
masterGain.gain.value = 0.7;
masterGain.connect(ctx.destination);
const analyser = ctx.createAnalyser();
analyser.fftSize = 2048;
masterGain.connect(analyser);

// Global synth parameters
let waveform = 'sine';
let attack = 0.01;
let decay = 0.2;
let filterCutoff = 8000;

// Drum synthesis
function playKick(time) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.5);
  env.gain.setValueAtTime(1, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc.connect(env).connect(masterGain);
  osc.start(time);
  osc.stop(time + 0.5);
}
function playSnare(time) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(1, time);
  env.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  noise.connect(filter).connect(env).connect(masterGain);
  noise.start(time);
  noise.stop(time + 0.2);
}
function playHiHat(time) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 8000;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.7, time);
  env.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  noise.connect(filter).connect(env).connect(masterGain);
  noise.start(time);
  noise.stop(time + 0.05);
}

// Polyphonic synth
function playSynth(time, freq = 440) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = waveform;
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = filterCutoff;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(1, time + attack);
  env.gain.setValueAtTime(1, time + attack);
  env.gain.linearRampToValueAtTime(0, time + attack + decay);
  osc.connect(filter).connect(env).connect(masterGain);
  osc.start(time);
  osc.stop(time + attack + decay);
}

// Parameter setters
function setWaveform(type) { waveform = type; }
function setAttack(val) { attack = val; }
function setDecay(val) { decay = val; }
function setFilterCutoff(val) { filterCutoff = val; }

// Export for sequencer
window.synth = {
  ctx,
  analyser,
  playKick,
  playSnare,
  playHiHat,
  playSynth,
  setWaveform,
  setAttack,
  setDecay,
  setFilterCutoff
};