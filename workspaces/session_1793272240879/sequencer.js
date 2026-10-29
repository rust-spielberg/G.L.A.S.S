const BPM_SLIDER = document.getElementById('bpmSlider');
const BPM_LABEL = document.getElementById('bpmLabel');
const PLAY_BTN = document.getElementById('playBtn');
const PRESET_SELECT = document.getElementById('presetSelect');
const GRID = document.getElementById('sequencerGrid');
const CANVAS = document.getElementById('oscilloscope');
const CTX = CANVAS.getContext('2d');

let bpm = 120;
let isPlaying = false;
let currentStep = 0;
let scheduleAhead = 0.1;
let lookahead = 25;
let nextNoteTime = 0;
let timerID;
const instruments = ['kick','snare','hihat','synth'];
let pattern = instruments.map(()=>Array(16).fill(false));

BPM_SLIDER.addEventListener('input',()=>{bpm = +BPM_SLIDER.value; BPM_LABEL.textContent=bpm;});
PLAY_BTN.addEventListener('click',()=>{isPlaying=!isPlaying; PLAY_BTN.textContent=isPlaying?'Stop':'Play'; if(isPlaying){nextNoteTime=audioCtx.currentTime; scheduler();} else clearTimeout(timerID);});
PRESET_SELECT.addEventListener('change',loadPreset);

function loadPreset(){
  const val=PRESET_SELECT.value;
  pattern = instruments.map(()=>Array(16).fill(false));
  if(val==='synthwave'){
    for(let i=0;i<16;i+=4) pattern[3][i]=true;
    for(let i=2;i<16;i+=4) pattern[0][i]=true;
  }else if(val==='cyberpunk'){
    for(let i=0;i<16;i++) if(i%2===0) pattern[2][i]=true;
    for(let i=4;i<16;i+=8) pattern[1][i]=true;
  }
  renderGrid();
}
function renderGrid(){
  GRID.innerHTML='';
  instruments.forEach((inst,i)=>{
    const row=document.createElement('div');
    row.className='track';
    row.dataset.instrument=inst;
    const label=document.createElement('span');
    label.textContent=inst.charAt(0).toUpperCase()+inst.slice(1);
    row.appendChild(label);
    for(let step=0;step<16;step++){
      const btn=document.createElement('div');
      btn.className='step'+(pattern[i][step]?' active':'');
      btn.dataset.step=step;
      btn.dataset.track=i;
      btn.addEventListener('click',()=>{pattern[i][step]=!pattern[i][step]; btn.classList.toggle('active');});
      row.appendChild(btn);
    }
    GRID.appendChild(row);
  });
}
renderGrid();

function scheduler(){
  while(nextNoteTime < audioCtx.currentTime + scheduleAhead){
    scheduleStep(currentStep, nextNoteTime);
    nextNoteTime += 60 / bpm / 4;
    currentStep = (currentStep+1)%16;
  }
  timerID = setTimeout(scheduler, lookahead);
}
function scheduleStep(step,time){
  instruments.forEach((inst,i)=>{
    if(pattern[i][step]){
      if(inst==='kick') triggerKick(time);
      else if(inst==='snare') triggerSnare(time);
      else if(inst==='hihat') triggerHiHat(time);
      else if(inst==='synth') triggerSynth(220, time);
    }
  });
  highlightStep(step);
}
function highlightStep(step){
  document.querySelectorAll('.step').forEach(btn=>btn.classList.remove('playing'));
  document.querySelectorAll(`.track[data-instrument] .step[data-step="${step}"]`).forEach(btn=>btn.classList.add('playing'));
}
function drawOscilloscope(){
  requestAnimationFrame(drawOscilloscope);
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);
  CTX.fillStyle = '#111';
  CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
  CTX.lineWidth = 2;
  CTX.strokeStyle = '#00ffcc';
  CTX.beginPath();
  const sliceWidth = CANVAS.width * 1.0 / bufferLength;
  let x=0;
  for(let i=0;i<bufferLength;i++){
    const v = dataArray[i]/128.0;
    const y = v * CANVAS.height/2;
    if(i===0) CTX.moveTo(x,y);
    else CTX.lineTo(x,y);
    x+=sliceWidth;
  }
  CTX.lineTo(CANVAS.width, CANVAS.height/2);
  CTX.stroke();
}
drawOscilloscope();