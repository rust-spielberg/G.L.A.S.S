window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const hudScore = document.getElementById('score');
    const hudMultiplier = document.getElementById('multiplier');
    const hudHighScore = document.getElementById('highScore');
    const gameOverModal = document.getElementById('gameOverModal');
    const finalScoreEl = document.getElementById('finalScore');
    const restartBtn = document.getElementById('restartBtn');

    const STATE = { MENU: 0, RUNNING: 1, GAMEOVER: 2 };
    let currentState = STATE.MENU;

    const lanes = [200, 400, 600];
    let player = { lane: 1, y: 0, vy: 0, width: 40, height: 20, jumping: false };
    const gravity = 0.8;
    const jumpStrength = -15;

    let obstacles = [];
    let obstacleTimer = 0;
    const obstacleInterval = 120; // frames

    let distance = 0;
    let multiplier = 1;
    let highScore = parseInt(localStorage.getItem('highScore') || '0');

    // Audio Setup
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playBassNote(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(55, time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
    }

    let bassLoopHandle = null;
    function startBassLoop() {
        if (bassLoopHandle) clearTimeout(bassLoopHandle);
        const interval = 0.5; // seconds per beat
        let nextTime = audioCtx.currentTime + 0.1;
        function schedule() {
            playBassNote(nextTime);
            nextTime += interval;
            bassLoopHandle = setTimeout(schedule, (nextTime - audioCtx.currentTime - 0.1) * 1000);
        }
        schedule();
    }

    function playJumpChime() {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    function playCrashNoise() {
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const noise = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        noise.buffer = buffer;
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        noise.connect(gain).connect(audioCtx.destination);
        noise.start();
    }

    // Input
    function handleKey(e) {
        if (currentState !== STATE.RUNNING) return;
        if (e.code === 'ArrowLeft' && player.lane > 0) player.lane--;
        else if (e.code === 'ArrowRight' && player.lane < lanes.length - 1) player.lane++;
        else if (e.code === 'Space' || e.code === 'ArrowUp') triggerJump();
    }

    function handleClick() {
        if (currentState === STATE.MENU) startGame();
        else if (currentState === STATE.RUNNING) triggerJump();
    }

    function triggerJump() {
        if (!player.jumping) {
            player.vy = jumpStrength;
            player.jumping = true;
            playJumpChime();
        }
    }

    // Game Loop
    function update() {
        if (currentState !== STATE.RUNNING) return;

        // Update distance and multiplier
        distance += 0.2 * multiplier;
        if (Math.floor(distance) % 100 === 0) multiplier = Math.min(multiplier + 0.1, 3);

        // Player physics
        player.y += player.vy;
        player.vy += gravity;
        if (player.y > 0) {
            player.y = 0;
            player.vy = 0;
            player.jumping = false;
        }

        // Obstacles generation
        obstacleTimer++;
        if (obstacleTimer >= obstacleInterval) {
            obstacleTimer = 0;
            const laneIdx = Math.floor(Math.random() * lanes.length);
            obstacles.push({
                lane: laneIdx,
                y: -50,
                width: 50,
                height: 20,
                speed: 2 + multiplier
            });
        }

        // Move obstacles
        obstacles.forEach(o => o.y += o.speed);
        obstacles = obstacles.filter(o => o.y < canvas.height + 50);

        // Collision detection
        const playerX = lanes[player.lane] - player.width / 2;
        const playerRect = {
            x: playerX,
            y: canvas.height - player.height - player.y,
            w: player.width,
            h: player.height
        };
        for (const o of obstacles) {
            const obsX = lanes[o.lane] - o.width / 2;
            const obsRect = { x: obsX, y: o.y, w: o.width, h: o.height };
            if (rectIntersect(playerRect, obsRect)) {
                endGame();
                break;
            }
        }

        // HUD updates
        hudScore.textContent = `Distance: ${Math.floor(distance)}m`;
        hudMultiplier.textContent = `Multiplier: x${multiplier.toFixed(1)}`;
        hudHighScore.textContent = `High Score: ${highScore}m`;
    }

    function drawGrid() {
        const lineCount = 20;
        ctx.strokeStyle = '#00ffcc33';
        ctx.lineWidth = 1;
        for (let i = 0; i < lineCount; i++) {
            const t = i / lineCount;
            const y = canvas.height - t * canvas.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        // Perspective lines
        const centerX = canvas.width / 2;
        ctx.beginPath();
        ctx.moveTo(centerX, canvas.height);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX, canvas.height);
        ctx.lineTo(canvas.width, 0);
        ctx.stroke();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        // Player
        const px = lanes[player.lane] - player.width / 2;
        const py = canvas.height - player.height - player.y;
        ctx.fillStyle = '#ff0077';
        ctx.fillRect(px, py, player.width, player.height);

        // Obstacles
        ctx.fillStyle = '#00ffcc';
        obstacles.forEach(o => {
            const ox = lanes[o.lane] - o.width / 2;
            ctx.fillRect(ox, o.y, o.width, o.height);
        });
    }

    function loop() {
        update();
        render();
        requestAnimationFrame(loop);
    }

    function startGame() {
        currentState = STATE.RUNNING;
        distance = 0;
        multiplier = 1;
        obstacles = [];
        player = { lane: 1, y: 0, vy: 0, width: 40, height: 20, jumping: false };
        gameOverModal.classList.add('hidden');
        if (audioCtx.state === 'suspended') audioCtx.resume();
        startBassLoop();
    }

    function endGame() {
        currentState = STATE.GAMEOVER;
        finalScoreEl.textContent = `You traveled ${Math.floor(distance)}m`;
        gameOverModal.classList.remove('hidden');
        playCrashNoise();
        if (distance > highScore) {
            highScore = Math.floor(distance);
            localStorage.setItem('highScore', highScore);
        }
    }

    function rectIntersect(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    // Event Listeners
    window.addEventListener('keydown', handleKey);
    canvas.addEventListener('click', handleClick);
    restartBtn.addEventListener('click', startGame);

    // Start the loop (MENU state awaiting click)
    loop();
});