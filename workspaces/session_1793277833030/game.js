const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const TILE = 40;
const ROWS = canvas.height / TILE;
const COLS = canvas.width / TILE;

let credits = 500;
let baseHealth = 10;
let wave = 1;
let selected = 'laser';
let enemies = [];
let turrets = [];
let particles = [];

const path = [
  [0,2],[5,2],[5,7],[10,7],
  [10,3],[15,3],[15,8],[20,8]
];

const hud = {
  credits: document.getElementById('credits'),
  health: document.getElementById('healthFill'),
  wave: document.getElementById('wave')
};

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const finalScore = document.getElementById('finalScore');

document.getElementById('laserBtn').onclick = () => selected = 'laser';
document.getElementById('plasmaBtn').onclick = () => selected = 'plasma';
document.getElementById('freezeBtn').onclick = () => selected = 'freeze';
document.getElementById('restartBtn').onclick = () => resetGame();

canvas.onclick = e => {
  const x = Math.floor(e.offsetX / TILE);
  const y = Math.floor(e.offsetY / TILE);
  if (onPath(x,y) || turrets.some(t=>t.x===x&&t.y===y)) return;
  const cost = {laser:100, plasma:150, freeze:200}[selected];
  if (credits < cost) return;
  credits -= cost;
  turrets.push({x,y,type:selected,angle:0});
  playTone(800,0.05);
};

function onPath(x,y){
  return path.some(p=>p[0]===x&&p[1]===y);
}

let spawnTimer = 0;
let enemiesToSpawn = 0;

function startWave(){
  enemiesToSpawn = wave + 2;
  spawnTimer = 0;
}

function spawnEnemy(){
  const hp = 20 + wave*5;
  const speed = 0.05 + wave*0.005; // pixels per frame
  enemies.push({
    pos:[path[0][0]*TILE+TILE/2, path[0][1]*TILE+TILE/2],
    hp, maxHp:hp, speed, wp:0
  });
}

function update(dt){
  // spawn logic
  if (enemiesToSpawn>0){
    spawnTimer+=dt;
    if (spawnTimer>30){ // approx 0.5s at 60fps
      spawnEnemy();
      enemiesToSpawn--;
      spawnTimer=0;
    }
  }

  // move enemies
  enemies.forEach(e=>{
    const next = path[e.wp+1]||path[e.wp];
    const target=[next[0]*TILE+TILE/2, next[1]*TILE+TILE/2];
    const dx=target[0]-e.pos[0];
    const dy=target[1]-e.pos[1];
    const dist=Math.hypot(dx,dy);
    if (dist<e.speed*dt){
      e.pos=target;
      e.wp++;
      if (e.wp===path.length-1){
        baseHealth--;
        if (baseHealth<=0) endGame();
      }
    }else{
      e.pos[0]+=dx/dist*e.speed*dt;
      e.pos[1]+=dy/dist*e.speed*dt;
    }
  });

  // turrets
  turrets.forEach(t=>{
    const tx=t.x*TILE+TILE/2;
    const ty=t.y*TILE+TILE/2;
    let best=null;
    enemies.forEach(en=>{
      const d=Math.hypot(en.pos[0]-tx,en.pos[1]-ty);
      if (!best||d<best.dist) best={obj:en,dist:d};
    });
    if (best){
      t.angle=Math.atan2(best.obj.pos[1]-ty,best.obj.pos[0]-tx);
      if (best.dist<120) fire(t,best.obj);
    }
  });

  // particles
  particles.forEach(p=>{
    p.x+=p.vx*dt/60;
    p.y+=p.vy*dt/60;
    p.life-=dt/60;
  });
  particles=particles.filter(p=>p.life>0);

  // HUD
  hud.credits.textContent=credits;
  hud.health.style.width=`${(baseHealth/10)*100}%`;
  hud.wave.textContent=wave;

  // wave progression
  if (enemies.length===0 && enemiesToSpawn===0){
    wave++;
    startWave();
  }
}

function fire(turret,enemy){
  const dmg={laser:10, plasma:15, freeze:5}[turret.type];
  enemy.hp-=dmg;
  playTone(turret.type==='plasma'?200:800,0.07);
  if (enemy.hp<=0){
    spawnParticles(enemy.pos);
    credits+=20;
    enemies.splice(enemies.indexOf(enemy),1);
  }
}

function spawnParticles(pos){
  for(let i=0;i<12;i++){
    const a=Math.random()*2*Math.PI;
    particles.push({
      x:pos[0],
      y:pos[1],
      vx:Math.cos(a)*50,
      vy:Math.sin(a)*50,
      life:0.5
    });
  }
  playTone(100,0.2);
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // grid
  ctx.strokeStyle='rgba(255,255,255,.05)';
  ctx.lineWidth=1;
  for(let i=0;i<=COLS;i++){
    ctx.beginPath();
    ctx.moveTo(i*TILE,0);
    ctx.lineTo(i*TILE,canvas.height);
    ctx.stroke();
  }
  for(let j=0;j<=ROWS;j++){
    ctx.beginPath();
    ctx.moveTo(0,j*TILE);
    ctx.lineTo(canvas.width,j*TILE);
    ctx.stroke();
  }

  // path
  ctx.strokeStyle='#00ffcc';
  ctx.lineWidth=8;
  ctx.lineCap='round';
  ctx.beginPath();
  path.forEach((p,i)=>{
    const cx=p[0]*TILE+TILE/2;
    const cy=p[1]*TILE+TILE/2;
    if(i===0) ctx.moveTo(cx,cy);
    else ctx.lineTo(cx,cy);
  });
  ctx.stroke();

  // turrets
  turrets.forEach(t=>{
    const cx=t.x*TILE+TILE/2;
    const cy=t.y*TILE+TILE/2;
    const grad=ctx.createRadialGradient(cx,cy,5,cx,cy,20);
    grad.addColorStop(0,'#00ffcc');
    grad.addColorStop(1,'rgba(0,255,204,0)');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.arc(cx,cy,20,0,2*Math.PI);
    ctx.fill();

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(t.angle);
    ctx.fillStyle='#ff0055';
    ctx.fillRect(0,-4,30,8);
    ctx.restore();
  });

  // enemies
  enemies.forEach(e=>{
    const [x,y]=e.pos;
    const grad=ctx.createRadialGradient(x,y,5,x,y,15);
    grad.addColorStop(0,'#ff0055');
    grad.addColorStop(1,'rgba(255,0,85,0)');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.arc(x,y,15,0,2*Math.PI);
    ctx.fill();

    // health bar
    ctx.fillStyle='#00ffcc';
    ctx.fillRect(x-12,y+18,24*(e.hp/e.maxHp),4);
    ctx.strokeStyle='#0d0e15';
    ctx.strokeRect(x-12,y+18,24,4);
  });

  // particles
  particles.forEach(p=>{
    ctx.fillStyle='rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(p.x,p.y,3,0,2*Math.PI);
    ctx.fill();
  });
}

function endGame(){
  modalTitle.textContent='Game Over';
  finalScore.textContent=credits;
  modal.classList.remove('hidden');
}

function resetGame(){
  credits=500;
  baseHealth=10;
  wave=1;
  enemies=[];
  turrets=[];
  particles=[];
  selected='laser';
  modal.classList.add('hidden');
  startWave();
}

// Audio
const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
function playTone(freq,dur){
  const now=audioCtx.currentTime;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.frequency.setValueAtTime(freq,now);
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(0.2,now+0.01);
  gain.gain.exponentialRampToValueAtTime(0.001,now+dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now+dur);
}

// Game loop
const FRAME_MS=1000/60;
let last=performance.now();
function loop(now){
  const dt=(now-last)/FRAME_MS;
  last=now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
startWave();
requestAnimationFrame(loop);