lang:index.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Procedural Flappy Bird</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/tone@14.8.39/build/Tone.min.js"></script>
</head>
<body>
    <canvas id="gameCanvas" width="480" height="640"></canvas>

    <div id="hud">
        <div id="score">0</div>
        <div id="message" class="hidden">Click or Press Space to Start</div>
    </div>

    <script src="game.js"></script>
</body>
</html>

lang:style.css
html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #70c5ce;
    font-family: Arial, sans-serif;
    user-select: none;
}
#gameCanvas {
    display: block;
    margin: 0 auto;
    background: transparent;
}
#hud {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    color: #fff;
    text-shadow: 0 0 5px #000;
}
#hud #score {
    margin-top: 20px;
    font-size: 48px;
}
#hud #message {
    margin-top: 200px;
    font-size: 32px;
}
.hidden {
    display: none;
}
#hud button {
    pointer-events: auto;
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 24px;
    cursor: pointer;
}

lang:game.js
// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game constants
const GRAVITY = 0.45;
const FLAP_STRENGTH = -8;
const PIPE_SPEED = 2;
const PIPE_GAP = 140;
const PIPE_SPACING = 200;
const GROUND_HEIGHT = 80;

// Game state
let state = 'start';
let score = 0;

// Audio setup (Tone.js)
const synth = new Tone.Synth().toDestination();
const musicLoop = new Tone.Loop(time => {
    synth.triggerAttackRelease('C4', '8n', time);
}, '2n');
let audioStarted = false;

// Bird object
const bird = {
    x: WIDTH * 0.2,
    y: HEIGHT * 0.5,
    radius: 20,
    vy: 0,
    wingAngle: 0,
    flapTimer: 0,
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        const pitch = Math.min(Math.max(this.vy / 10, -0.5), 0.5);
        ctx.rotate(pitch);

        // Body
        ctx.fillStyle = '#ffdd57';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 1.2, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing (animated)
        ctx.save();
        ctx.rotate(this.wingAngle);
        ctx.fillStyle = '#ffcc33';
        ctx.beginPath();
        ctx.ellipse(-this.radius * 0.6, 0, this.radius * 0.8, this.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.radius * 0.4, -this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.radius * 0.45, -this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.6, -this.radius * 0.1);
        ctx.lineTo(this.radius * 1.1, 0);
        ctx.lineTo(this.radius * 0.6, this.radius * 0.1);
        ctx.closePath();
        ctx.fill();

        // Highlight shading
        const grad = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.2, 0, 0, this.radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.4)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 1.2, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        // Wing animation based on flap timer
        if (this.flapTimer > 0) {
            this.flapTimer--;
            this.wingAngle = Math.sin((this.flapTimer / 5) * Math.PI) * 0.5;
        } else {
            this.wingAngle *= 0.95;
        }

        // Prevent bird from leaving top
        if (this.y < this.radius) {
            this.y = this.radius;
            this.vy = 0;
        }
    },
    flap() {
        this.vy = FLAP_STRENGTH;
        this.flapTimer = 6;
        spawnFlapParticles(this.x, this.y);
    },
    reset() {
        this.x = WIDTH * 0.2;
        this.y = HEIGHT * 0.5;
        this.vy = 0;
        this.wingAngle = 0;
        this.flapTimer = 0;
    }
};

// Pipe management
const pipes = [];
let pipeSpawnTimer = 0;
function spawnPipe() {
    const topHeight = Math.random() * (HEIGHT - GROUND_HEIGHT - PIPE_GAP - 100) + 50;
    const bottomY = topHeight + PIPE_GAP;
    pipes.push({
        x: WIDTH,
        topHeight,
        bottomY,
        passed: false
    });
}

// Background layers
const clouds = [];
const skyline = [];

function initBackground() {
    for (let i = 0; i < 8; i++) {
        clouds.push({
            x: Math.random() * WIDTH,
            y: Math.random() * (HEIGHT * 0.4),
            speed: 0.3 + Math.random() * 0.3,
            size: 30 + Math.random() * 40
        });
    }
    for (let i = 0; i < 6; i++) {
        skyline.push({
            x: Math.random() * WIDTH,
            y: HEIGHT * 0.6 + Math.random() * 30,
            width: 80 + Math.random() * 40,
            height: 30 + Math.random() * 20,
            speed: 0.6
        });
    }
}
function updateBackground() {
    clouds.forEach(c => {
        c.x -= c.speed;
        if (c.x < -c.size * 2) c.x = WIDTH + c.size;
    });
    skyline.forEach(s => {
        s.x -= s.speed;
        if (s.x < -s.width) s.x = WIDTH + s.width;
    });
}
function drawBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    skyGrad.addColorStop(0, '#70c5ce');
    skyGrad.addColorStop(1, '#4aa3b8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#2c5a5e';
    skyline.forEach(s => {
        ctx.fillRect(s.x, s.y, s.width, s.height);
    });

    ctx.fillStyle = '#fff';
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 0.6, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.5, c.y - c.size * 0.2, c.size * 0.5, 0, Math.PI * 2);
        ctx.arc(c.x - c.size * 0.5, c.y - c.size * 0.2, c.size * 0.5, 0, Math.PI * 2);
        ctx.arc(c.x, c.y - c.size * 0.4, c.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Ground strip
let groundOffset = 0;
function drawGround() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 40;
    patternCanvas.height = GROUND_HEIGHT;
    const pctx = patternCanvas.getContext('2d');

    const grad = pctx.createLinearGradient(0, 0, 0, GROUND_HEIGHT);
    grad.addColorStop(0, '#5c8a3c');
    grad.addColorStop(1, '#3b5a20');
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 40, GROUND_HEIGHT);

    pctx.strokeStyle = 'rgba(0,0,0,0.2)';
    pctx.lineWidth = 2;
    for (let i = 4; i < GROUND_HEIGHT; i += 8) {
        pctx.beginPath();
        pctx.moveTo(0, i);
        pctx.lineTo(40, i);
        pctx.stroke();
    }

    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.save();
    ctx.translate(-groundOffset, HEIGHT - GROUND_HEIGHT);
    ctx.fillRect(groundOffset, 0, WIDTH + groundOffset, GROUND_HEIGHT);
    ctx.restore();

    groundOffset = (groundOffset + PIPE_SPEED) % 40;
}

// Particle system
const particles = [];
function spawnFlapParticles(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 1.5 - 0.5,
            life: 30,
            maxLife: 30,
            size: 4 + Math.random() * 2
        });
    }
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}
function drawParticles() {
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = `rgba(200,200,200,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Pipe drawing
function drawPipe(pipe) {
    const pipeWidth = 60;
    const grad = ctx.createLinearGradient(0, pipe.topHeight, 0, pipe.bottomY);
    grad.addColorStop(0, '#6ab04c');
    grad.addColorStop(1, '#4b7d2b');
    ctx.fillStyle = grad;

    // Top pipe
    ctx.beginPath();
    ctx.moveTo(pipe.x, 0);
    ctx.lineTo(pipe.x, pipe.topHeight - 20);
    ctx.quadraticCurveTo(pipe.x, pipe.topHeight, pipe.x + 20, pipe.topHeight);
    ctx.lineTo(pipe.x + pipeWidth - 20, pipe.topHeight);
    ctx.quadraticCurveTo(pipe.x + pipeWidth, pipe.topHeight, pipe.x + pipeWidth, pipe.topHeight - 20);
    ctx.lineTo(pipe.x + pipeWidth, 0);
    ctx.closePath();
    ctx.fill();

    // Bottom pipe
    ctx.beginPath();
    ctx.moveTo(pipe.x, pipe.bottomY + 20);
    ctx.quadraticCurveTo(pipe.x, pipe.bottomY, pipe.x + 20, pipe.bottomY);
    ctx.lineTo(pipe.x + pipeWidth - 20, pipe.bottomY);
    ctx.quadraticCurveTo(pipe.x + pipeWidth, pipe.bottomY, pipe.x + pipeWidth, pipe.bottomY + 20);
    ctx.lineTo(pipe.x + pipeWidth, HEIGHT - GROUND_HEIGHT);
    ctx.lineTo(pipe.x, HEIGHT - GROUND_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Rim highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pipe.x + 20, pipe.topHeight);
    ctx.lineTo(pipe.x + pipeWidth - 20, pipe.topHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pipe.x + 20, pipe.bottomY);
    ctx.lineTo(pipe.x + pipeWidth - 20, pipe.bottomY);
    ctx.stroke();
}

// Collision detection
function checkCollision() {
    if (bird.y + bird.radius > HEIGHT - GROUND_HEIGHT) return true;
    for (const pipe of pipes) {
        const pipeRect = {
            x: pipe.x,
            width: 60,
            top: pipe.topHeight,
            bottom: pipe.bottomY
        };
        const birdRect = {
            x: bird.x - bird.radius,
            y: bird.y - bird.radius,
            width: bird.radius * 2,
            height: bird.radius * 2
        };
        if (birdRect.x + birdRect.width > pipeRect.x && birdRect.x < pipeRect.x + pipeRect.width) {
            if (birdRect.y < pipeRect.top) return true;
            if (birdRect.y + birdRect.height > pipeRect.bottom) return true;
        }
    }
    return false;
}

// Scoring
function updateScore() {
    for (const pipe of pipes) {
        if (!pipe.passed && pipe.x + 60 < bird.x) {
            pipe.passed = true;
            score++;
            document.getElementById('score').textContent = score;
        }
    }
}

// Game loop
function update() {
    if (state === 'playing') {
        bird.update();
        updateBackground();
        updateParticles();

        pipeSpawnTimer--;
        if (pipeSpawnTimer <= 0) {
            spawnPipe();
            pipeSpawnTimer = PIPE_SPACING;
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= PIPE_SPEED;
            if (p.x + 60 < 0) pipes.splice(i, 1);
        }

        updateScore();

        if (checkCollision()) {
            state = 'gameover';
            const msg = document.getElementById('message');
            msg.textContent = 'Game Over! Click or Press Space to Restart';
            msg.classList.remove('hidden');
        }
    }
    render();
    requestAnimationFrame(update);
}

// Rendering
function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    drawGround();
    pipes.forEach(drawPipe);
    bird.draw();
    drawParticles();
}

// Audio handling
function startAudioIfNeeded() {
    if (!audioStarted) {
        Tone.start().then(() => {
            musicLoop.start(0);
            Tone.Transport.start();
            audioStarted = true;
        });
    }
}

// Game control
function startGame() {
    bird.reset();
    pipes.length = 0;
    particles.length = 0;
    score = 0;
    document.getElementById('score').textContent = score;
    groundOffset = 0;
    pipeSpawnTimer = PIPE_SPACING;
    state = 'playing';
    document