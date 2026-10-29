window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const shieldBar = document.getElementById('shieldBar');
  const waveEl = document.getElementById('wave');
  const modal = document.getElementById('gameOverModal');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');

  const STATE = { MENU: 0, PLAYING: 1, GAMEOVER: 2 };
  let gameState = STATE.PLAYING;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const keys = {};
  let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
  let lastFire = 0;

  const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    shield: 100,
    thrustOsc: null,
    thrustGain: null,
  };

  const lasers = [];
  const asteroids = [];
  const particles = [];

  let score = 0,
    wave = 1,
    asteroidCount = 3;

  function playTone(freq, dur, type = 'sine') {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  }

  function thrustSound(start) {
    if (start) {
      if (player.thrustOsc) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 40;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      osc.start(now);
      player.thrustOsc = osc;
      player.thrustGain = gain;
    } else if (player.thrustOsc) {
      const now = audioCtx.currentTime;
      player.thrustGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      player.thrustOsc.stop(now + 0.21);
      player.thrustOsc = null;
      player.thrustGain = null;
    }
  }

  function spawnAsteroid(x, y, size) {
    const s = size || 'large';
    const radius = s === 'large' ? 40 : s === 'medium' ? 20 : 10;
    const speed = s === 'large' ? 1.2 : s === 'medium' ? 2 : 3;
    const angle = Math.random() * Math.PI * 2;
    asteroids.push({
      x: x ?? Math.random() * canvas.width,
      y: y ?? Math.random() * canvas.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      size: s,
    });
  }

  function resetGame() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.vx = player.vy = 0;
    player.angle = 0;
    player.shield = 100;
    lasers.length = 0;
    asteroids.length = 0;
    particles.length = 0;
    score = 0;
    wave = 1;
    asteroidCount = 3;
    for (let i = 0; i < asteroidCount; i++) spawnAsteroid();
    gameState = STATE.PLAYING;
    modal.style.visibility = 'hidden';
    updateUI();
  }

  function updateUI() {
    scoreEl.textContent = 'Score: ' + score;
    shieldBar.style.width = player.shield + '%';
    waveEl.textContent = 'Wave: ' + wave;
  }

  function fireLaser() {
    const now = performance.now();
    if (now - lastFire < 200) return;
    lastFire = now;
    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    lasers.push({
      x: player.x,
      y: player.y,
      dx: Math.cos(angle) * 6,
      dy: Math.sin(angle) * 6,
      life: 60,
    });
    playTone(800, 0.1, 'square');
    particles.push({
      x: player.x,
      y: player.y,
      vx: -Math.cos(angle) * 1,
      vy: -Math.sin(angle) * 1,
      life: 30,
      clr: '#f80',
    });
  }

  function update() {
    if (gameState !== STATE.PLAYING) return;

    // Input handling
    const thrust = keys['w'] || keys['ArrowUp'];
    if (thrust) {
      const ax = Math.cos(player.angle) * 0.1;
      const ay = Math.sin(player.angle) * 0.1;
      player.vx += ax;
      player.vy += ay;
      thrustSound(true);
    } else {
      thrustSound(false);
    }

    // Mouse aiming
    player.angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);

    // Move player
    player.x += player.vx;
    player.y += player.vy;
    player.vx *= 0.99;
    player.vy *= 0.99;

    // Wrap player
    if (player.x < 0) player.x += canvas.width;
    if (player.x > canvas.width) player.x -= canvas.width;
    if (player.y < 0) player.y += canvas.height;
    if (player.y > canvas.height) player.y -= canvas.height;

    // Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.x += l.dx;
      l.y += l.dy;
      l.life--;
      if (l.life <= 0) {
        lasers.splice(i, 1);
        continue;
      }
      // Collision with asteroids
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const a = asteroids[j];
        const dx = l.x - a.x,
          dy = l.y - a.y;
        if (dx * dx + dy * dy < a.radius * a.radius) {
          // Split asteroid
          if (a.size === 'large') {
            spawnAsteroid(a.x, a.y, 'medium');
            spawnAsteroid(a.x, a.y, 'medium');
          } else if (a.size === 'medium') {
            spawnAsteroid(a.x, a.y, 'small');
            spawnAsteroid(a.x, a.y, 'small');
          }
          // Explosion particles
          for (let p = 0; p < 8; p++) {
            const ang = Math.random() * Math.PI * 2;
            particles.push({
              x: a.x,
              y: a.y,
              vx: Math.cos(ang) * 2,
              vy: Math.sin(ang) * 2,
              life: 30,
              clr: '#f44',
            });
          }
          playTone(200, 0.2, 'sawtooth');
          asteroids.splice(j, 1);
          score += 10;
          break;
        }
      }
    }

    // Asteroids movement
    asteroids.forEach((a) => {
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < 0) a.x += canvas.width;
      if (a.x > canvas.width) a.x -= canvas.width;
      if (a.y < 0) a.y += canvas.height;
      if (a.y > canvas.height) a.y -= canvas.height;
    });

    // Player-asteroid collision
    for (const a of asteroids) {
      const dx = player.x - a.x,
        dy = player.y - a.y;
      if (dx * dx + dy * dy < (a.radius + 10) * (a.radius + 10)) {
        player.shield -= 0.5;
        if (player.shield <= 0) {
          gameState = STATE.GAMEOVER;
          finalScoreEl.textContent = 'Final Score: ' + score;
          modal.style.visibility = 'visible';
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Wave progression
    if (asteroids.length === 0) {
      wave++;
      asteroidCount += 2;
      for (let i = 0; i < asteroidCount; i++) spawnAsteroid();
    }

    updateUI();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player ship
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-10, -8);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Lasers
    ctx.fillStyle = '#ff0';
    lasers.forEach((l) => {
      ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
    });

    // Asteroids
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    asteroids.forEach((a) => {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Particles
    particles.forEach((p) => {
      ctx.fillStyle = p.clr;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    });
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  // Input handlers
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    fireLaser();
  });
  restartBtn.addEventListener('click', resetGame);

  // Start game
  resetGame();
  requestAnimationFrame(loop);
});