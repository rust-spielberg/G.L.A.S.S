/* Navigation: smooth scroll & active link highlighting */
function initNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const sections = {
        portfolioSection: document.getElementById('portfolioSection'),
        estimatorSection: document.getElementById('estimatorSection'),
        bookingForm: document.getElementById('bookingForm')
    };

    links.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    function setActive() {
        const scrollPos = window.scrollY + 150;
        for (const [id, sec] of Object.entries(sections)) {
            if (sec.offsetTop <= scrollPos && sec.offsetTop + sec.offsetHeight > scrollPos) {
                links.forEach(l => {
                    l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
                });
            }
        }
    }

    window.addEventListener('scroll', setActive);
    setActive();
}

/* Portfolio Filtering */
function initPortfolioFilter() {
    const btns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.card');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.toggle('active', b === btn));
            const filter = btn.dataset.filter;
            cards.forEach(card => {
                const cat = card.dataset.category;
                const show = filter === 'all' || cat === filter;
                card.style.display = show ? '' : 'none';
            });
        });
    });
}

/* Estimator Engine */
function initEstimator() {
    const areaSlider = document.getElementById('areaSlider');
    const areaValue = document.getElementById('areaValue');
    const materialSelect = document.getElementById('materialSelect');
    const scopeRadios = document.getElementsByName('scope');
    const totalDisplay = document.getElementById('totalEstimate');

    const materialCost = {
        oak: 120,
        marble: 200,
        microcement: 150
    };
    const scopeMultiplier = {
        full: 1.5,
        styling: 1.0
    };

    function calculate() {
        const area = parseInt(areaSlider.value, 10);
        const material = materialSelect.value;
        const scope = Array.from(scopeRadios).find(r => r.checked).value;

        const base = area * materialCost[material];
        const total = Math.round(base * scopeMultiplier[scope]);

        totalDisplay.textContent = `$${total.toLocaleString()}`;
    }

    areaSlider.addEventListener('input', () => {
        areaValue.textContent = areaSlider.value;
        calculate();
    });
    materialSelect.addEventListener('change', calculate);
    scopeRadios.forEach(r => r.addEventListener('change', calculate));

    calculate(); // initial display
}

/* Booking Form Handler */
function initBookingForm() {
    const form = document.getElementById('consultForm');
    const container = document.getElementById('confirmationContainer');

    form.addEventListener('submit', e => {
        e.preventDefault();
        const data = new FormData(form);
        const name = data.get('name');
        const phone = data.get('phone');
        const email = data.get('email');
        const date = data.get('date');

        const card = document.createElement('div');
        card.className = 'confirmation-card';
        card.innerHTML = `
            <p>Consultation Reserved for <strong>${name}</strong>.</p>
            <p>Confirmation sent to <strong>${email}</strong>.</p>
            <p>We will call <strong>${phone}</strong> on <strong>${date}</strong> to confirm room specifications.</p>
        `;
        container.innerHTML = '';
        container.appendChild(card);
        form.reset();
    });
}

/* Hero Button Shortcut */
function initHeroButton() {
    const btn = document.getElementById('heroBtn');
    btn.addEventListener('click', () => {
        document.getElementById('estimatorSection').scrollIntoView({ behavior: 'smooth' });
    });
}

/* Initialize all modules */
initNavigation();
initPortfolioFilter();
initEstimator();
initBookingForm();
initHeroButton();