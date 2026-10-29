// UI Elements
const playBtn = document.getElementById('playBtn');
const bpmSlider = document.getElementById('bpmSlider');
const bpmLabel = document.getElementById('bpmLabel');
const presetSelect = document.getElementById('presetSelect');
const waveformSelect = document.getElementById('waveformSelect');
const attackSlider = document.getElementById('attackSlider');
const decaySlider = document.getElementById('decaySlider');
const filterSlider = document.getElementById('filterSlider');
const canvas = document.getElementById('oscilloscope');
const ctxVis = canvas.getContext('2d');
const gridContainer = document.getElementById('stepGrid');

// Sequencer state
let isPlaying = false;
let currentStep = 0;
let bpm = 120;
let lookahead = 0.025; // seconds
let scheduleAhead = 0.1; // seconds
let nextNoteTime = 0;
const stepDuration = () => (60 / bpm) / 4; // 16th note

const tracks = {
  kick: new Array(16).fill(false),
  snare: new Array(16).fill(false),
  hihat: new Array(16).fill(false),
  synth: new Array(16).fill(false)
};

// Build grid UI
function initGrid() {
  const instruments = ['kick', 'snare', 'hihat', 'synth'];
  instruments.forEach(inst => {
    const label = document.createElement('div');
    label.className = 'instrument-label';
    label.textContent = inst.charAt(0).toUpperCase() + inst.slice(1);
    gridContainer.appendChild(label);
    for (let i = 0; i < 16; i++) {
      const btn = document.createElement('button');
      btn.className = 'step';
      btn.dataset.instrument = inst;
      btn.dataset.step = i;
      btn.addEventListener('click', () => toggleStep(inst, i, btn));
      gridContainer.appendChild(btn);
    }
  });
}
function toggleStep(inst, step, btn) {
  tracks[inst][step] = !tracks[inst][step];
  btn.classList.toggle('active', tracks[inst][step]);
}

// UI Listeners
playBtn.addEventListener('click', () => {
  if (!isPlaying) start();
  else stop();
});
bpmSlider.addEventListener('input', e => {
  bpm = +e.target.value;
  bpmLabel.textContent = bpm;
});
presetSelect.addEventListener('change', e => applyPreset(e.target.value));
waveformSelect.addEventListener('change', e => synth.setWaveform(e.target.value));
attackSlider.addEventListener('input', e => synth.setAttack(+e.target.value));
decaySlider.addEventListener('input', e => synth.setDecay(+e.target.value));
filterSlider.addEventListener('input', e => synth.setFilterCutoff(+e.target.value));

// Presets
function applyPreset(name) {
  switch (name) {
    case 'synthwave':
      waveformSelect.value = 'sawtooth';
      attackSlider.value = 0.02;
      decaySlider.value = 0.3;
      filterSlider.value = 5000;
      break;
    case 'cyberpunk':
      waveformSelect.value = 'square';
      attackSlider.value = 0.01;
      decaySlider.value = 0.15;
      filterSlider.value = 8000;
      break;
    default:
      waveformSelect.value = 'sine';
      attackSlider.value = 0.01;
      decaySlider.value = 0.2;
      filterSlider.value = 8000;
  }
  synth.setWaveform(waveformSelect.value);
  synth.setAttack(+attackSlider.value);
  synth.setDecay(+decaySlider.value);
  synth.setFilterCutoff(+filterSlider.value);
}

// Scheduler
function scheduler() {
  while (nextNoteTime < synth.ctx.currentTime + scheduleAhead) {
    scheduleStep(currentStep, nextNoteTime);
    nextNoteTime += stepDuration();
    currentStep = (currentStep + 1) % 16;
  }
}
function scheduleStep(step, time) {
  if (tracks.kick[step]) synth.playKick(time);
  if (tracks.snare[step]) synth.playSnare(time);
  if (tracks.hihat[step]) synth.playHiHat(time);
  if (tracks.synth[step]) synth.playSynth(time, 440);
  highlightStep(step);
}
function highlightStep(step) {
  document.querySelectorAll('.step').forEach(btn => {
    btn.classList.toggle('current', +btn.dataset.step === step);
  });
}
let timerID;
function start() {
  if (synth.ctx.state === 'suspended') synth.ctx.resume();
  isPlaying = true;
  playBtn.textContent = 'Stop';
  nextNoteTime = synth.ctx.currentTime + 0.05;
  currentStep = 0;
  timerID = setInterval(scheduler, lookahead * 1000);
}
function stop() {
  isPlaying = false;
  playBtn.textContent = 'Play';
  clearInterval(timerID);
  document.querySelectorAll('.step').forEach(btn => btn.classList.remove('current'));
}

// Visualizer
function draw() {
  requestAnimationFrame(draw);
  const data = new Uint8Array(synth.analyser.frequencyBinCount);
  synth.analyser.getByteFrequencyData(data);
  ctxVis.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = canvas.width / data.length;
  for (let i = 0; i < data.length; i++) {
    const barHeight = (data[i] / 255) * canvas.height;
    ctxVis.fillStyle = `rgb(${data[i]},255,${255 - data[i]})`;
    ctxVis.fillRect(i * barWidth, canvas.height - barHeight, barWidth, barHeight);
  }
}
draw();
initGrid();