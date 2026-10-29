window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const hudScore = document.getElementById('score');
    const hudMultiplier = document.getElementById('multiplier');
    const hudHighScore = document.getElementById('highScore');
    const gameOverModal = document.getElementById('gameOverModal');
    const finalScoreEl = document.getElementById('finalScore');
    const restartBtn = document.getElementById('restartBtn');

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const LANE_COUNT = 3;
    const LANE_WIDTH = WIDTH / LANE_COUNT;
    const PLAYER_SIZE = 30;
    const GRAVITY = 0.6;
    const JUMP_VELOCITY = -12;
    const OBSTACLE_SPEED = 6;
    const GRID_SPACING = 40;

    const State = { MENU: 0, RUNNING: 1, GAMEOVER: 2 };
    let currentState = State.MENU;

    let player = { lane: 1, y: HEIGHT - PLAYER_SIZE, vy: 0, jumping: false };
    let obstacles = [];
    let gridOffset = 0;
    let distance = 0;
    let multiplier = 1;
    let highScore = parseInt(localStorage.getItem('highScore') || '0');

    // Audio Setup
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let bassOsc, bassGain, bassInterval;

    function startBass() {
        bassOsc = audioCtx.createOscillator();
        bassGain = audioCtx.createGain();
        bassOsc.type = 'square';
        bassOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
        bassGain.gain.setValueAtTime(0, audioCtx.currentTime);
        bassOsc.connect(bassGain).connect(audioCtx.destination);
        bassOsc.start();

        function pulse() {
            const now = audioCtx.currentTime;
            bassGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        }
        bassInterval = setInterval(pulse, 500);
    }

    function stopBass() {
        if (bassOsc) bassOsc.stop();
        if (bassInterval) clearInterval(bassInterval);
    }

    function playJump() {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
    }

    function playCrash() {
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
    }

    // Input
    function handleKey(e) {
        if (currentState !== State.RUNNING) return;
        if (e.code === 'ArrowLeft' && player.lane > 0) player.lane--;
        else if (e.code === 'ArrowRight' && player.lane < LANE_COUNT - 1) player.lane++;
        else if (e.code === 'Space' || e.code === 'ArrowUp') triggerJump();
    }

    function handleClick(e) {
        if (currentState !== State.RUNNING) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const lane = Math.floor(x / LANE_WIDTH);
        if (lane >= 0 && lane < LANE_COUNT) player.lane = lane;
        triggerJump();
    }

    function triggerJump() {
        if (!player.jumping) {
            player.vy = JUMP_VELOCITY;
            player.jumping = true;
            playJump();
        }
    }

    // Game Loop
    function update() {
        if (currentState !== State.RUNNING) return;

        // Grid movement
        gridOffset = (gridOffset + OBSTACLE_SPEED) % GRID_SPACING;

        // Player physics
        player.y += player.vy;
        player.vy += GRAVITY;
        if (player.y >= HEIGHT - PLAYER_SIZE) {
            player.y = HEIGHT - PLAYER_SIZE;
            player.vy = 0;
            player.jumping = false;
        }

        // Obstacles movement
        obstacles.forEach(o => o.z -= OBSTACLE_SPEED);
        obstacles = obstacles.filter(o => o.z > 0);

        // Spawn obstacles
        if (Math.random() < 0.02) {
            const lane = Math.floor(Math.random() * LANE_COUNT);
            obstacles.push({ lane, z: WIDTH, size: 30 });
        }

        // Collision detection
        obstacles.forEach(o => {
            const obsX = o.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const playerX = player.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const dx = Math.abs(obsX - playerX);
            const dy = Math.abs((HEIGHT - PLAYER_SIZE) - player.y);
            if (dx < (PLAYER_SIZE + o.size) / 2 && dy < (PLAYER_SIZE + o.size) / 2) {
                currentState = State.GAMEOVER;
                stopBass();
                playCrash();
                finalScoreEl.textContent = `You traveled ${Math.floor(distance)}m`;
                gameOverModal.classList.add('visible');
                if (distance > highScore) {
                    highScore = Math.floor(distance);
                    localStorage.setItem('highScore', highScore);
                }
                hudHighScore.textContent = `High Score: ${highScore}m`;
            }
        });

        // Scoring
        distance += 0.1 * multiplier;
        if (Math.floor(distance) % 100 === 0 && multiplier < 5) multiplier++;
        hudScore.textContent = `Distance: ${Math.floor(distance)}m`;
        hudMultiplier.textContent = `×${multiplier}`;
    }

    function draw() {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // Grid lines
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        for (let i = -GRID_SPACING; i < WIDTH + GRID_SPACING; i += GRID_SPACING) {
            ctx.beginPath();
            ctx.moveTo(i + gridOffset, 0);
            ctx.lineTo(i + gridOffset, HEIGHT);
            ctx.stroke();
        }

        // Player
        ctx.fillStyle = '#ff0077';
        const px = player.lane * LANE_WIDTH + (LANE_WIDTH - PLAYER_SIZE) / 2;
        ctx.fillRect(px, player.y, PLAYER_SIZE, PLAYER_SIZE);

        // Obstacles
        ctx.fillStyle = '#00ffcc';
        obstacles.forEach(o => {
            const ox = o.lane * LANE_WIDTH + (LANE_WIDTH - o.size) / 2;
            const oy = HEIGHT - o.z;
            ctx.fillRect(ox, oy, o.size, o.size);
        });
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    // State management
    function startGame() {
        currentState = State.RUNNING;
        player = { lane: 1, y: HEIGHT - PLAYER_SIZE, vy: 0, jumping: false };
        obstacles = [];
        gridOffset = 0;
        distance = 0;
        multiplier = 1;
        hudScore.textContent = 'Distance: 0m';
        hudMultiplier.textContent = '×1';
        gameOverModal.classList.remove('visible');
        startBass();
    }

    // Event listeners
    window.addEventListener('keydown', handleKey);
    canvas.addEventListener('click', handleClick);
    restartBtn.addEventListener('click', startGame);

    // Auto-start for demo
    startGame();
    requestAnimationFrame(loop);
});