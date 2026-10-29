import config from './config.json' assert {type: 'json'};
let intervalId = null;
let remaining = config.workDuration;
let cycle = 0;
let onBreak = false;

const display = document.getElementById('timer-display');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

function format(sec){
    const m = String(Math.floor(sec/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${m}:${s}`;
}
function updateDisplay(){
    display.textContent = format(remaining);
}
function tick(){
    if(--remaining<0){
        clearInterval(intervalId);
        onBreak = !onBreak;
        if(onBreak){
            cycle++;
            remaining = (cycle%config.cyclesBeforeLong===0)?config.longBreak:config.shortBreak;
        }else{
            remaining = config.workDuration;
        }
        updateDisplay();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
        return;
    }
    updateDisplay();
}
function start(){
    if(intervalId) return;
    intervalId = setInterval(tick,1000);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
}
function pause(){
    clearInterval(intervalId);
    intervalId = null;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}
function reset(){
    clearInterval(intervalId);
    intervalId = null;
    remaining = config.workDuration;
    onBreak = false;
    cycle = 0;
    updateDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
}
startBtn.addEventListener('click',start);
pauseBtn.addEventListener('click',pause);
resetBtn.addEventListener('click',reset);
updateDisplay();