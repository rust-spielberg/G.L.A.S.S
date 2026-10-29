window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const hudScore = document.getElementById('score');
  const hudLives = document.getElementById('lives');
  const modal = document.getElementById('modal');
  const modalMsg = document.getElementById('modalMessage');
  const restartBtn = document.getElementById('restartBtn');

  const STATE = { PLAYING: 0, GAMEOVER: 1, VICTORY: 2 };
  let gameState = STATE.PLAYING;

  const paddle = { w: 80, h: 10, x: 260, y: canvas.height - 20, speed: 7 };
  const ball = { r: 6, x: 300, y: 200, vx: 3, vy: -3 };
  const rows = 4, cols = 7, brickPadding = 5, brickOffsetTop = 30, brickOffsetLeft = 30;
  const brickW = (canvas.width - 2 * brickOffsetLeft - (cols - 1) * brickPadding) / cols;
  const brickH = 20;
  const bricks = [];
  let score = 0, lives = 3;

  function initBricks() {
    const colors = ['#ff5555', '#ffaa55', '#55ff55', '#55aaff'];
    for (let r = 0; r < rows; r++) {
      bricks[r] = [];
      for (let c = 0; c < cols; c++) {
        bricks[r][c] = {
          x: brickOffsetLeft + c * (brickW + brickPadding),
          y: brickOffsetTop + r * (brickH + brickPadding),
          w: brickW,
          h: brickH,
          alive: true,
          color: colors[r]
        };
      }
    }
  }

  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 30;
    ball.vx = 3 * Math.sign(Math.random() - 0.5);
    ball.vy = -3;
  }

  function resetGame() {
    score = 0;
    lives = 3;
    gameState = STATE.PLAYING;
    paddle.x = (canvas.width - paddle.w) / 2;
    resetBall();
    initBricks();
    modal.classList.add('hidden');
    updateHUD();
  }

  function updateHUD() {
    hudScore.textContent = 'Score: ' + score;
    hudLives.textContent = 'Lives: ' + lives;
  }

  function drawPaddle() {
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0055';
    ctx.fill();
    ctx.closePath();
  }

  function drawBricks() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const b = bricks[r][c];
        if (b.alive) {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      }
    }
  }

  function collisionDetection() {
    // Brick collisions
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const b = bricks[r][c];
        if (b.alive) {
          const withinX = ball.x > b.x && ball.x < b.x + b.w;
          const withinY = ball.y - ball.r < b.y + b.h && ball.y + ball.r > b.y;
          if (withinX && withinY) {
            ball.vy = -ball.vy;
            b.alive = false;
            score += 10;
            updateHUD();
          }
        }
      }
    }
    // Paddle collision
    if (
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.r > paddle.y
    ) {
      const hitPos = (ball.x - paddle.x) / paddle.w - 0.5; // -0.5 .. 0.5
      const angle = hitPos * Math.PI / 3; // +/-60°
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx = speed * Math.sin(angle);
      ball.vy = -Math.abs(speed * Math.cos(angle));
    }
    // Wall collisions
    if (ball.x + ball.r > canvas.width || ball.x - ball.r < 0) ball.vx = -ball.vx;
    if (ball.y - ball.r < 0) ball.vy = -ball.vy;
    // Bottom (lose life)
    if (ball.y - ball.r > canvas.height) {
      lives--;
      updateHUD();
      if (lives === 0) {
        gameState = STATE.GAMEOVER;
        modalMsg.textContent = 'Game Over';
        modal.classList.remove('hidden');
      } else {
        resetBall();
      }
    }
    // Victory check
    if (bricks.flat().every(b => !b.alive)) {
      gameState = STATE.VICTORY;
      modalMsg.textContent = 'You Win!';
      modal.classList.remove('hidden');
    }
  }

  function update() {
    if (gameState !== STATE.PLAYING) return;
    ball.x += ball.vx;
    ball.y += ball.vy;
    collisionDetection();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPaddle();
    drawBall();
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  // Input handling
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    paddle.x = mx - paddle.w / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.w > canvas.width) paddle.x = canvas.width - paddle.w;
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') paddle.x = Math.max(0, paddle.x - paddle.speed);
    if (e.key === 'ArrowRight') paddle.x = Math.min(canvas.width - paddle.w, paddle.x + paddle.speed);
  });

  restartBtn.addEventListener('click', resetGame);

  // Start the game
  resetGame();
  requestAnimationFrame(loop);
});