const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gravity = 0.5;
const bird = {
    x: 50,
    y: 150,
    width: 30,
    height: 30,
    velocity: 0,
    flapStrength: -10,
    isAlive: true
};

const pipes = [];
const pipeGap = 150;
const pipeWidth = 50;
const pipeSpeed = 2;

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartButton = document.getElementById('restartButton');

function drawBird() {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
}

function drawPipes() {
    pipes.forEach(pipe => {
        ctx.fillStyle = 'green';
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.height);
        ctx.fillRect(pipe.x, pipe.height + pipeGap, pipeWidth, canvas.height);
    });
}

function updateBird() {
    bird.velocity += gravity;
    bird.y += bird.velocity;

    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        gameOver();
    }
}

function updatePipes() {
    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;

        if (pipe.x + pipeWidth < 0) {
            pipes.shift();
        }

        if (checkCollision(bird, pipe)) {
            gameOver();
        }
    });
}

function checkCollision(bird, pipe) {
    return bird.x < pipe.x + pipeWidth &&
           bird.x + bird.width > pipe.x &&
           (bird.y < pipe.height || bird.y + bird.height > pipe.height + pipeGap);
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
}

function gameOver() {
    bird.isAlive = false;
    gameOverScreen.style.display = 'block';
    restartButton.style.display = 'block';
}

function restartGame() {
    bird.x = 50;
    bird.y = 150;
    bird.velocity = 0;
    bird.isAlive = true;
    pipes.length = 0;
    score = 0;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    restartButton.style.display = 'none';
    gameLoop();
}

function gameLoop() {
    if (!bird.isAlive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBird();
    drawPipes();
    updateBird();
    updatePipes();
    drawScore();

    requestAnimationFrame(gameLoop);
}

function flap() {
    if (bird.isAlive) {
        bird.velocity = bird.flapStrength;
    }
}

canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', flap);

document.getElementById('startButton').addEventListener('click', () => {
    startScreen.style.display = 'none';
    gameLoop();
});

document.getElementById('restartButton').addEventListener('click', restartGame);

let score = 0;

function addPipe() {
    let pipeHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
    pipes.push({ x: canvas.width, height: pipeHeight });
    score++;
}

setInterval(addPipe, 2000);

document.getElementById('muteButton').addEventListener('click', () => {
    // Add mute functionality here
});