import config from './config.json' assert {type: 'json'};
let durations = {
    pomodoro: config.pomodoro,
    shortBreak: config.shortBreak,
    longBreak: config.longBreak
};
let cycle = 0;
let mode = 'pomodoro';
let remaining = durations[mode];
let interval = null;

const display = document.getElementById('display');
const modeLabel = document.getElementById('mode');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

function format(sec){
    const m = String(Math.floor(sec/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${m}:${s}`;
}
function updateUI(){
    display.textContent = format(remaining);
    modeLabel.textContent = mode === 'pomodoro' ? 'Pomodoro' : (mode === 'shortBreak' ? 'Short Break' : 'Long Break');
}
function tick(){
    if(remaining>0){
        remaining--;
        updateUI();
    }else{
        clearInterval(interval);
        nextMode();
        startTimer();
    }
}
function startTimer(){
    if(interval) return;
    interval = setInterval(tick,1000);
}
function pauseTimer(){
    clearInterval(interval);
    interval = null;
}
function resetTimer(){
    pauseTimer();
    mode = 'pomodoro';
    remaining = durations[mode];
    cycle = 0;
    updateUI();
}
function nextMode(){
    if(mode==='pomodoro'){
        cycle++;
        mode = (cycle%config.cyclesBeforeLong===0) ? 'longBreak' : 'shortBreak';
    }else{
        mode = 'pomodoro';
    }
    remaining = durations[mode];
}
startBtn.onclick = startTimer;
pauseBtn.onclick = pauseTimer;
resetBtn.onclick = resetTimer;
updateUI();