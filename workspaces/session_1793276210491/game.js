window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highScoreEl = document.getElementById('highScore');
  const modal = document.getElementById('gameOverModal');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GROUND_H = 50;
  const PIPE_W = 60;
  const GAP_H = 120;
  const PIPE_SPACING = 180;
  const BIRD_SIZE = 30;
  const GRAVITY = 0.45;
  const JUMP = -8.5;
  const STATE = { START: 0, PLAY: 1, OVER: 2 };
  let gameState = STATE.START;

  let bird = { x: 80, y: HEIGHT / 2, vy: 0, w: BIRD_SIZE, h: BIRD_SIZE };
  let pipes = [];
  let frameCount = 0;
  let score = 0;
  let highScore = Number(localStorage.getItem('flappyHigh')) || 0;

  const audio = new (window.AudioContext || window.webkitAudioContext)();

  function playFlap() {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, audio.currentTime);
    gain.gain.setValueAtTime(0.2, audio.currentTime);
    gain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.1);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.12);
  }

  function playScore() {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, audio.currentTime);
    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.linearRampToValueAtTime(0, audio.currentTime + 0.08);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.1);
  }

  function playCrash() {
    const buffer = audio.createBuffer(1, audio.sampleRate * 0.2, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.3, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.2);
    src.connect(gain).connect(audio.destination);
    src.start();
  }

  function reset() {
    bird.y = HEIGHT / 2;
    bird.vy = 0;
    pipes = [];
    frameCount = 0;
    score = 0;
    scoreEl.textContent = 'Score: 0';
    modal.classList.add('hidden');
    gameState = STATE.PLAY;
  }

  function spawnPipe() {
    const gapY = Math.random() * (HEIGHT - 2 * GROUND_H - GAP_H) + GROUND_H;
    pipes.push({ x: WIDTH, top: gapY, bottom: gapY + GAP_H, passed: false });
  }

  function update() {
    if (gameState !== STATE.PLAY) return;

    bird.vy += GRAVITY;
    bird.y += bird.vy;

    if (bird.y + bird.h > HEIGHT - GROUND_H) bird.y = HEIGHT - GROUND_H - bird.h;
    if (bird.y < 0) { bird.y = 0; bird.vy = 0; }

    if (frameCount % PIPE_SPACING === 0) spawnPipe();

    pipes.forEach(p => p.x -= 2);
    if (pipes[0] && pipes[0].x + PIPE_W < 0) pipes.shift();

    pipes.forEach(p => {
      if (!p.passed && p.x + PIPE_W < bird.x) {
        p.passed = true;
        score++;
        scoreEl.textContent = 'Score: ' + score;
        playScore();
      }
    });

    for (const p of pipes) {
      const inX = bird.x + bird.w > p.x && bird.x < p.x + PIPE_W;
      const inY = bird.y < p.top || bird.y + bird.h > p.bottom;
      if (inX && inY) { gameOver(); break; }
    }

    if (bird.y + bird.h >= HEIGHT - GROUND_H) gameOver();

    frameCount++;
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#a0e4f1';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#73bf2e';
    pipes.forEach(p => {
      ctx.fillRect(p.x, 0, PIPE_W, p.top);
      ctx.fillRect(p.x, p.bottom, PIPE_W, HEIGHT - p.bottom);
    });

    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, HEIGHT - GROUND_H, WIDTH, GROUND_H);

    ctx.save();
    ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
    ctx.rotate(bird.vy * 0.03);
    ctx.fillStyle = '#f8e71c';
    ctx.fillRect(-bird.w / 2, -bird.h / 2, bird.w, bird.h);
    ctx.restore();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function gameOver() {
    if (gameState !== STATE.PLAY) return;
    gameState = STATE.OVER;
    playCrash();
    finalScoreEl.textContent = 'Score: ' + score;
    modal.classList.remove('hidden');
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('flappyHigh', highScore);
    }
    highScoreEl.textContent = 'High: ' + highScore;
  }

  function flap() {
    if (gameState === STATE.START) reset();
    if (gameState === STATE.PLAY) {
      bird.vy = JUMP;
      playFlap();
    }
  }

  window.addEventListener('keydown', e => { if (e.code === 'Space') flap(); });
  canvas.addEventListener('mousedown', flap);
  restartBtn.addEventListener('click', reset);

  highScoreEl.textContent = 'High: ' + highScore;

  ctx.fillStyle = '#000';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Press Space or Click to Start', WIDTH / 2, HEIGHT / 2);

  requestAnimationFrame(loop);
});