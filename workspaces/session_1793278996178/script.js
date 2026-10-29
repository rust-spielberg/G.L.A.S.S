// Canvas & Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Game State
let bird;
let pipes = [];
let frameCount = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let gameRunning = false;
let audioStarted = false;

// UI Elements
const currentScoreEl = document.getElementById('currentScore');
const highScoreEl = document.getElementById('highScore');
const restartBtn = document.getElementById('restartBtn');

// Sound Effects (Tone.js)
const flapSound = new Tone.Player('https://freesound.org/data/previews/331/331912_3248244-lq.mp3').toDestination();
const pointSound = new Tone.Player('https://freesound.org/data/previews/331/331913_3248244-lq.mp3').toDestination();
const hitSound = new Tone.Player('https://freesound.org/data/previews/331/331914_3248244-lq.mp3').toDestination();

// Bird Entity (drawn with canvas primitives for a polished look)
class Bird {
    constructor() {
        this.x = WIDTH * 0.2;
        this.y = HEIGHT / 2;
        this.radius = 18;
        this.velocity = 0;
        this.gravity = 0.45;
        this.lift = -9;
        this.wingAngle = 0;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.velocity * 0.03);

        // Body
        const grad = ctx.createRadialGradient(0, 0, this.radius * 0.2, 0, 0, this.radius);
        grad.addColorStop(0, '#ff0055');
        grad.addColorStop(1, '#ff66aa');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Wing (simple flap animation)
        this.wingAngle = Math.sin(frameCount * 0.2) * 0.5;
        ctx.save();
        ctx.rotate(this.wingAngle);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(-this.radius * 0.6, 0, this.radius * 0.8, this.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.radius * 0.4, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.radius * 0.45, -this.radius * 0.32, this.radius * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Clamp to canvas bounds
        if (this.y + this.radius > HEIGHT) {
            this.y = HEIGHT - this.radius;
            this.velocity = 0;
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    }
    flap() {
        this.velocity = this.lift;
        flapSound.start();
    }
}

// Pipe Entity
class Pipe {
    constructor() {
        this.spacing = 150;
        this.top = Math.random() * (HEIGHT - this.spacing - 120) + 60;
        this.bottom = HEIGHT - (this.top + this.spacing);
        this.x = WIDTH;
        this.width = 60;
        this.speed = 2.5;
        this.passed = false;
    }
    draw() {
        // Gradient pipe color
        const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        grad.addColorStop(0, 'rgba(0,255,204,0.6)');
        grad.addColorStop(1, 'rgba(0,200,150,0.6)');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 12;

        // Top pipe
        ctx.fillRect(this.x, 0, this.width, this.top);
        // Bottom pipe
        ctx.fillRect(this.x, HEIGHT - this.bottom, this.width, this.bottom);

        ctx.shadowBlur = 0;
    }
    update() {
        this.x -= this.speed;
    }
}

// Initialize / Reset Game
function init() {
    bird = new Bird();
    pipes = [];
    frameCount = 0;
    score = 0;
    gameRunning = true;
    updateScoreUI();
    restartBtn.style.display = 'none';
    requestAnimationFrame(gameLoop);
}

// Main Game Loop
function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();

    bird.update();
    bird.draw();

    // Spawn pipes
    if (frameCount % 120 === 0) {
        pipes.push(new Pipe());
    }

    // Update and render pipes
    pipes.forEach((pipe, i) => {
        pipe.update();
        pipe.draw();

        // Collision detection
        if (detectCollision(bird, pipe)) {
            hitSound.start();
            endGame();
        }

        // Scoring
        if (!pipe.passed && pipe.x + pipe.width < bird.x) {
            pipe.passed = true;
            score++;
            pointSound.start();
            updateScoreUI();
        }

        // Remove off-screen pipes
        if (pipe.x + pipe.width < 0) {
            pipes.splice(i, 1);
        }
    });

    frameCount++;
    requestAnimationFrame(gameLoop);
}

// Background Gradient
function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#0d0e15');
    grad.addColorStop(1, '#1a1b2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

// Simple AABB collision detection
function detectCollision(bird, pipe) {
    const bx = bird.x;
    const by = bird.y;
    const br = bird.radius;

    // Top pipe collision
    if (bx + br > pipe.x && bx - br < pipe.x + pipe.width && by - br < pipe.top) {
        return true;
    }
    // Bottom pipe collision
    if (bx + br > pipe.x && bx - br < pipe.x + pipe.width && by + br > HEIGHT - pipe.bottom) {
        return true;
    }
    return false;
}

// UI Score Update
function updateScoreUI() {
    currentScoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
    }
    highScoreEl.textContent = highScore;
}

// End Game Handler
function endGame() {
    gameRunning = false;
    restartBtn.style.display = 'block';
}

// Restart Button
restartBtn.addEventListener('click', () => {
    init();
});

// Input Handling
function startAudioIfNeeded() {
    if (!audioStarted) {
        Tone.start();
        audioStarted = true;
    }
}

// Space bar for flap and also to start a new game when over
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        startAudioIfNeeded();
        if (gameRunning) {
            bird.flap();
        } else {
            init();
        }
    }
});

window.addEventListener('mousedown', (e) => {
    if (gameRunning) {
        startAudioIfNeeded();
        bird.flap();
    }
});

// Kick off the game
init();