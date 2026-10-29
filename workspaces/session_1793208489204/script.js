const board = document.getElementById('board');
let firstCard = null;
let lockBoard = false;

function createCard(value) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.value = value;

    const inner = document.createElement('div');
    inner.classList.add('card-inner');

    const front = document.createElement('div');
    front.classList.add('card-face', 'card-front');

    const back = document.createElement('div');
    back.classList.add('card-face', 'card-back');
    back.textContent = value;

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener('click', onCardClick);
    return card;
}

function onCardClick(e) {
    if (lockBoard) return;
    const card = e.currentTarget;
    if (card === firstCard) return;
    card.classList.add('flipped');

    if (!firstCard) {
        firstCard = card;
        return;
    }

    // Second card
    const secondCard = card;
    checkForMatch(firstCard, secondCard);
}

function checkForMatch(c1, c2) {
    const isMatch = c1.dataset.value === c2.dataset.value;
    if (isMatch) {
        c1.removeEventListener('click', onCardClick);
        c2.removeEventListener('click', onCardClick);
        resetBoard();
    } else {
        lockBoard = true;
        setTimeout(() => {
            c1.classList.remove('flipped');
            c2.classList.remove('flipped');
            resetBoard();
        }, 1000);
    }
}

function resetBoard() {
    [firstCard, lockBoard] = [null, false];
}

function initGame() {
    fetch('/api/init')
        .then(res => res.json())
        .then(data => {
            board.innerHTML = '';
            data.forEach(value => {
                const card = createCard(value);
                board.appendChild(card);
            });
        })
        .catch(err => console.error('Failed to load game data:', err));
}

document.addEventListener('DOMContentLoaded', initGame);