// Audio Engine
const AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = true;
function playKey() {
  if (!soundEnabled) return;
  const osc = AudioCtx.createOscillator();
  const gain = AudioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200 + Math.random()*200, AudioCtx.currentTime);
  gain.gain.setValueAtTime(0.1, AudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, AudioCtx.currentTime + 0.15);
  osc.connect(gain).connect(AudioCtx.destination);
  osc.start();
  osc.stop(AudioCtx.currentTime + 0.15);
}

// Theme
const body = document.body;
const themeBtn = document.getElementById('themeBtn');
function setTheme(theme) {
  body.className = theme;
  localStorage.setItem('theme', theme);
}
themeBtn.addEventListener('click', () => {
  const newTheme = body.classList.contains('dark') ? 'light' : 'dark';
  setTheme(newTheme);
});
setTheme(localStorage.getItem('theme') || 'dark');

// Sound toggle
const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? '🔊' : '🔈';
});
soundEnabled = localStorage.getItem('sound') !== 'false';
soundBtn.textContent = soundEnabled ? '🔊' : '🔈';

// Clock
const clockEl = document.getElementById('clock');
function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// Terminal
const cliInput = document.getElementById('cliInput');
const cliOutput = document.getElementById('cliOutput');
let history = JSON.parse(localStorage.getItem('cliHistory')||'[]');
let histIdx = history.length;

function appendLine(text, className='') {
  const line = document.createElement('div');
  if (className) line.className = className;
  line.textContent = text;
  cliOutput.appendChild(line);
  cliOutput.scrollTop = cliOutput.scrollHeight;
}
function clearTerminal() {
  cliOutput.innerHTML = '';
}
function renderHelp() {
  appendLine('Available commands: help, skills, projects, contact, clear');
}
function renderSkills() {
  const skills = [
    {name:'HTML', level:90},
    {name:'CSS', level:85},
    {name:'JavaScript', level:80},
    {name:'Web Audio', level:70},
    {name:'Canvas', level:65}
  ];
  skills.forEach(s=>{
    const bar = document.createElement('div');
    bar.style.display='flex';
    bar.style.alignItems='center';
    bar.style.gap='8px';
    const label=document.createElement('span');
    label.textContent=s.name;
    label.style.minWidth='80px';
    const prog=document.createElement('div');
    prog.style.flex='1';
    prog.style.height='8px';
    prog.style.background='rgba(255,255,255,0.1)';
    prog.style.borderRadius='4px';
    const fill=document.createElement('div');
    fill.style.width=`${s.level}%`;
    fill.style.height='100%';
    fill.style.background='var(--neon-cyan)';
    fill.style.borderRadius='4px';
    prog.appendChild(fill);
    bar.appendChild(label);
    bar.appendChild(prog);
    cliOutput.appendChild(bar);
  });
}
function renderProjects(arg) {
  const cards = document.querySelectorAll('#projectGrid .card');
  cards.forEach(c=>c.style.boxShadow='none');
  if (!arg) {
    appendLine('Usage: projects <name>');
    return;
  }
  const target = Array.from(cards).find(c=>c.dataset.name.toLowerCase().includes(arg.toLowerCase()));
  if (target) {
    target.scrollIntoView({behavior:'smooth', block:'center'});
    target.style.boxShadow='0 0 16px var(--neon-pink)';
    appendLine(`Highlighted project: ${target.dataset.name}`);
  } else {
    appendLine(`No project matches "${arg}"`);
  }
}
function renderContact() {
  const modal=document.getElementById('modalOverlay');
  modal.classList.remove('hidden');
}
function handleCommand(cmd) {
  const parts=cmd.trim().split(/\s+/);
  const base=parts[0].toLowerCase();
  const arg=parts.slice(1).join(' ');
  switch(base){
    case 'help': renderHelp(); break;
    case 'skills': renderSkills(); break;
    case 'projects': renderProjects(arg); break;
    case 'contact': renderContact(); break;
    case 'clear': clearTerminal(); break;
    default: appendLine(`Unknown command: ${base}`); break;
  }
}
cliInput.addEventListener('keydown', e=>{
  if(e.key==='Enter'){
    const cmd=cliInput.value;
    if(!cmd) return;
    appendLine(`> ${cmd}`, 'prompt');
    handleCommand(cmd);
    history.push(cmd);
    localStorage.setItem('cliHistory', JSON.stringify(history));
    histIdx=history.length;
    cliInput.value='';
    playKey();
  } else if(e.key==='ArrowUp'){
    if(histIdx>0){
      histIdx--;
      cliInput.value=history[histIdx];
    }
  } else if(e.key==='ArrowDown'){
    if(histIdx<history.length-1){
      histIdx++;
      cliInput.value=history[histIdx];
    } else {
      histIdx=history.length;
      cliInput.value='';
    }
  }
});

// Modal close
document.getElementById('closeModal').addEventListener('click',()=>{
  document.getElementById('modalOverlay').classList.add('hidden');
});

// Initial prompt
appendLine('Welcome to the Anti‑Design Hacker Terminal. Type "help" for commands.');