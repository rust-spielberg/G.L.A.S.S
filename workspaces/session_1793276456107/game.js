window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const hudP = document.getElementById('playerScore');
  const hudA = document.getElementById('aiScore');
  const modal = document.getElementById('gameOverModal');
  const msg = document.getElementById('gameOverMessage');
  const restartBtn = document.getElementById('restartBtn');

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const STATE = { PLAYING: 0, POINT: 1, GAMEOVER: 2 };
  let gameState = STATE.PLAYING;

  const paddle = { w: 10, h: 80, speed: 6 };
  const player = { x: 10, y: canvas.height / 2 - paddle.h / 2, score: 0 };
  const ai = { x: canvas.width - paddle.w - 10, y: canvas.height / 2 - paddle.h / 2, score: 0, err: 0 };
  const ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 4, vy: 2, radius: 6, speed: 4 };

  function resetBall(dir) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 4;
    ball.vx = dir * ball.speed;
    ball.vy = 0;
  }

  function playTone(freq, dur) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(player.x, player.y, paddle.w, paddle.h);
    ctx.fillRect(ai.x, ai.y, paddle.w, paddle.h);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function update() {
    if (gameState !== STATE.PLAYING) return;

    // Keyboard input
    if (keys['ArrowUp']) player.y -= paddle.speed;
    if (keys['ArrowDown']) player.y += paddle.speed;

    // Mouse / touch input
    if (mouseY !== null) player.y = mouseY - paddle.h / 2;

    // Clamp player paddle within canvas
    player.y = Math.max(0, Math.min(canvas.height - paddle.h, player.y));

    // AI movement with interpolation and slight error variance
    ai.err += (Math.random() - 0.5) * 0.2;
    const targetY = ball.y - paddle.h / 2 + ai.err * 30;
    ai.y += (targetY - ai.y) * 0.07;
    ai.y = Math.max(0, Math.min(canvas.height - paddle.h, ai.y));

    // Ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top / bottom wall bounce
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
      ball.vy = -ball.vy;
      playTone(300, 0.05);
    }

    // Paddle collisions
    const hitPlayer = ball.x - ball.radius < player.x + paddle.w &&
                      ball.y > player.y && ball.y < player.y + paddle.h;
    const hitAI = ball.x + ball.radius > ai.x &&
                  ball.y > ai.y && ball.y < ai.y + paddle.h;

    if (hitPlayer || hitAI) {
      const paddleY = hitPlayer ? player.y : ai.y;
      const offset = (ball.y - (paddleY + paddle.h / 2)) / (paddle.h / 2);
      const angle = offset * (Math.PI / 4);
      const dir = hitPlayer ? -1 : 1;
      ball.speed += 0.3;
      ball.vx = dir * Math.cos(angle) * ball.speed;
      ball.vy = Math.sin(angle) * ball.speed;
      playTone(600, 0.07);
    }

    // Scoring
    if (ball.x < 0) {
      ai.score++;
      hudA.textContent = ai.score;
      checkGameOver();
      resetBall(1);
    }
    if (ball.x > canvas.width) {
      player.score++;
      hudP.textContent = player.score;
      checkGameOver();
      resetBall(-1);
    }
  }

  function checkGameOver() {
    if (player.score >= 5 || ai.score >= 5) {
      gameState = STATE.GAMEOVER;
      msg.textContent = `${player.score >= 5 ? 'Player' : 'AI'} Wins!`;
      modal.classList.remove('hidden');
      playTone(800, 0.5);
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Input handling
  const keys = {};
  window.addEventListener('keydown', e => (keys[e.key] = true));
  window.addEventListener('keyup', e => (keys[e.key] = false));

  let mouseY = null;
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseY = e.clientY - rect.top;
  });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    mouseY = e.touches[0].clientY - rect.top;
  }, { passive: false });
  canvas.addEventListener('mouseleave', () => {
    mouseY = null;
  });

  restartBtn.addEventListener('click', () => {
    player.score = 0;
    ai.score = 0;
    hudP.textContent = '0';
    hudA.textContent = '0';
    modal.classList.add('hidden');
    gameState = STATE.PLAYING;
    resetBall(1);
  });

  // Initialize game
  resetBall(1);
  loop();
});