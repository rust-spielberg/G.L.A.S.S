// Navigation active link handling
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', e => {
        navLinks.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
    });
});

// Tab filtering for menu
const tabs = document.querySelectorAll('.tab');
const cards = document.querySelectorAll('.card');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.dataset.filter;
        cards.forEach(card => {
            const cat = card.dataset.category;
            const show = filter === 'all' || cat === filter;
            card.style.display = show ? '' : 'none';
        });
    });
});

// Inquiry counter
let requestCount = 0;
const counterEl = document.getElementById('requestCount');

// Add to Inquiry button logic
const notesField = document.getElementById('specialNotes');
document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const productName = btn.closest('.card').querySelector('h3').innerText;
        notesField.value = notesField.value
            ? notesField.value + ', ' + productName
            : productName;
        requestCount++;
        counterEl.textContent = requestCount;
    });
});

// Toast utility
const toast = document.getElementById('toastNotice');
function showToast(message) {
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.pointerEvents = 'auto';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.pointerEvents = 'none';
    }, 4000);
}

// Form validation & submission
const form = document.getElementById('inquiryForm');
form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phoneNumber').value.trim();
    const email = document.getElementById('emailAddress').value.trim();
    const date = document.getElementById('eventDate').value;
    const flavour = document.getElementById('flavourSelect').value;
    if (!name || !phone || !email || !date || !flavour) {
        showToast('⚠️ Please fill all required fields.');
        return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[0-9+\-\s()]{7,}$/;
    if (!emailPattern.test(email) || !phonePattern.test(phone)) {
        showToast('⚠️ Invalid phone or email format.');
        return;
    }
    const message = `✨ Request Received! Thank you ${name}. Our head baker will contact you at ${phone} or ${email} within 24 hours.`;
    showToast(message);
    form.reset();
    requestCount = 0;
    counterEl.textContent = requestCount;
});