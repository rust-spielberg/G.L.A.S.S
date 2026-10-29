const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hudScore = document.getElementById('score');
const hudHigh = document.getElementById('highScore');
const modal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

canvas.focus();

const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audio = new AudioCtx();

function playTone(freq, dur, type = 'square') {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audio.destination);
  const now = audio.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.start(now);
  osc.stop(now + dur);
}
function flapSound() { playTone(300, 0.15); }
function pointSound() { playTone(600, 0.08); }
function crashSound() { playTone(100, 0.4, 'sawtooth'); }

const GRAVITY = 0.35;
const FLAP_STRENGTH = -6.5;
const PIPE_SPEED = 2;
const PIPE_GAP = 120;
const PIPE_INTERVAL = 1500;
let highScore = 0;

let state = 'START_MENU';
let bird, pipes, lastPipeTime, score, animationId;

function resetGame() {
  bird = { x: 80, y: canvas.height / 2, vy: 0, radius: 12, angle: 0 };
  pipes = [];
  lastPipeTime = 0;
  score = 0;
  hudScore.textContent = 'Score: 0';
  hudHigh.textContent = `High: ${highScore}`;
  modal.classList.add('hidden');
  state = 'PLAYING';
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function createPipe() {
  const topHeight = Math.random() * (canvas.height - PIPE_GAP - 200) + 50;
  const bottomY = topHeight + PIPE_GAP;
  pipes.push({ x: canvas.width, top: topHeight, bottom: bottomY, passed: false });
}

function update() {
  bird.vy += GRAVITY;
  bird.y += bird.vy;
  bird.angle = Math.min(Math.PI / 6, Math.max(-Math.PI / 6, bird.vy / 10));

  for (let p of pipes) p.x -= PIPE_SPEED;
  pipes = pipes.filter(p => p.x + 50 > 0);

  if (performance.now() - lastPipeTime > PIPE_INTERVAL) {
    createPipe();
    lastPipeTime = performance.now();
  }

  if (bird.y + bird.radius > canvas.height - 30 || bird.y - bird.radius < 0) {
    crashSound();
    endGame();
  }

  for (let p of pipes) {
    if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + 50) {
      if (bird.y - bird.radius < p.top || bird.y + bird.radius > p.bottom) {
        crashSound();
        endGame();
        break;
      }
    }
    if (!p.passed && bird.x > p.x + 50) {
      p.passed = true;
      score++;
      hudScore.textContent = `Score: ${score}`;
      pointSound();
      if (score > highScore) {
        highScore = score;
        hudHigh.textContent = `High: ${highScore}`;
      }
    }
  }
}

function drawPipe(x, y, isTop) {
  const width = 50;
  const height = isTop ? y : canvas.height - y;
  const grad = ctx.createLinearGradient(x, 0, x + width, 0);
  grad.addColorStop(0, '#2f8b57');
  grad.addColorStop(1, '#3fbf6c');
  ctx.fillStyle = grad;
  ctx.fillRect(x, isTop ? 0 : y, width, height);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x, isTop ? y - 5 : y, width, 5);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);

  ctx.shadowColor = 'rgba(255,255,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffdd57';
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-bird.radius / 2, 0, bird.radius / 2, bird.radius / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(bird.radius / 2, -bird.radius / 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(bird.radius / 2, -bird.radius / 3, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffb84d';
  ctx.beginPath();
  ctx.moveTo(bird.radius, 0);
  ctx.lineTo(bird.radius + 6, -4);
  ctx.lineTo(bird.radius + 6, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0d0e15';
  ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

  for (let p of pipes) {
    drawPipe(p.x, p.top, true);
    drawPipe(p.x, p.bottom, false);
  }

  drawBird();
}

function loop() {
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

function flap() {
  if (state === 'START_MENU') {
    resetGame();
    return;
  }
  if (state !== 'PLAYING') return;
  bird.vy = FLAP_STRENGTH;
  flapSound();
}

function endGame() {
  state = 'GAMEOVER';
  finalScoreEl.textContent = `Score: ${score}`;
  modal.classList.remove('hidden');
  cancelAnimationFrame(animationId);
}

// Input handling
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    flap();
  }
});
window.addEventListener('pointerdown', e => {
  if (e.target === restartBtn) return;
  flap();
});
restartBtn.addEventListener('click', () => resetGame());

// Initial start screen
function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0d0e15';
  ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
  ctx.font = '20px Orbitron';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('Press SPACE or Tap to Jump', canvas.width / 2, canvas.height / 2);
}
drawStartScreen();