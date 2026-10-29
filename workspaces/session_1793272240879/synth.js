let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let masterGain = audioCtx.createGain();
let analyser = audioCtx.createAnalyser();
masterGain.connect(analyser).connect(audioCtx.destination);
masterGain.gain.value = 0.7;

function triggerKick(time) {
  let osc = audioCtx.createOscillator();
  let env = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.5);
  env.gain.setValueAtTime(1, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc.connect(env).connect(masterGain);
  osc.start(time);
  osc.stop(time + 0.5);
}
function triggerSnare(time) {
  let noise = audioCtx.createBufferSource();
  let buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
  let data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  let filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1000;
  let env = audioCtx.createGain();
  env.gain.setValueAtTime(1, time);
  env.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  noise.connect(filter).connect(env).connect(masterGain);
  noise.start(time);
  noise.stop(time + 0.2);
}
function triggerHiHat(time) {
  let noise = audioCtx.createBufferSource();
  let buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
  let data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  let filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 8000;
  let env = audioCtx.createGain();
  env.gain.setValueAtTime(1, time);
  env.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  noise.connect(filter).connect(env).connect(masterGain);
  noise.start(time);
  noise.stop(time + 0.05);
}
function triggerSynth(freq, time) {
  const waveform = document.getElementById('waveformSelect').value;
  const attack = parseFloat(document.getElementById('attackSlider').value);
  const decay = parseFloat(document.getElementById('decaySlider').value);
  const cutoff = parseFloat(document.getElementById('filterSlider').value);
  let osc = audioCtx.createOscillator();
  let filter = audioCtx.createBiquadFilter();
  let env = audioCtx.createGain();
  osc.type = waveform;
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(1, time + attack);
  env.gain.linearRampToValueAtTime(0, time + attack + decay);
  osc.connect(filter).connect(env).connect(masterGain);
  osc.start(time);
  osc.stop(time + attack + decay);
}
function unlockAudio() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
document.getElementById('playBtn').addEventListener('click', unlockAudio);