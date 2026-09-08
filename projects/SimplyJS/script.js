document.addEventListener('DOMContentLoaded', () => {
    initCounter();
    initScrollEffects();
    initNavSync();
});

function initCounter() {
    const counterBtn = document.getElementById('counter-btn');
    const display = counterBtn.querySelector('span');
    let count = 0;

    counterBtn.addEventListener('click', () => {
        count++;
        display.textContent = count;
        
        display.style.transform = 'scale(1.4)';
        setTimeout(() => {
            display.style.transform = 'scale(1)';
        }, 100);

        console.log(`%c [Counter] New value: ${count} `, 'background: #6366f1; color: #fff; border-radius: 4px;');
    });
}

function initScrollEffects() {
    const cards = document.querySelectorAll('.card, .glass:not(nav)');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach((card, index) => {
        if (card.tagName.toLowerCase() === 'nav') return;
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        card.style.transition = `all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.1}s`;
        observer.observe(card);
    });
}

function initNavSync() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current) && current !== '') {
                link.classList.add('active');
            }
        });
    });
}
