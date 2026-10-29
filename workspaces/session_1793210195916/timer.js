let config = {
    pomodoro: 1500,
    shortBreak: 300,
    longBreak: 900,
    cycles: 4,
    colors: { primary: "#00ffea", secondary: "#ff00d5" }
};

async function loadConfig() {
    try {
        const res = await fetch('config.json');
        if (res.ok) Object.assign(config, await res.json());
    } catch (_) {}
}
loadConfig();

const display = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

let timerId = null;
let remaining = config.pomodoro;
let cycleCount = 0;
let onBreak = false;

function format(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function updateDisplay() {
    display.textContent = format(remaining);
}

function tick() {
    if (remaining > 0) {
        remaining--;
        updateDisplay();
    } else {
        clearInterval(timerId);
        timerId = null;
        onBreak = !onBreak;
        if (onBreak) {
            cycleCount = (cycleCount + 1) % config.cycles;
            remaining = cycleCount === 0 ? config.longBreak : config.shortBreak;
        } else {
            remaining = config.pomodoro;
        }
        updateDisplay();
        // auto‑restart next session
        startTimer();
    }
}

function startTimer() {
    if (timerId) return;
    timerId = setInterval(tick, 1000);
}

function pauseTimer() {
    clearInterval(timerId);
    timerId = null;
}

function resetTimer() {
    pauseTimer();
    onBreak = false;
    cycleCount = 0;
    remaining = config.pomodoro;
    updateDisplay();
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

updateDisplay();