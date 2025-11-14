document.addEventListener('DOMContentLoaded', function() {
    // Efecto parallax sutil en las partículas
    document.addEventListener('mousemove', handleMouseMove);
    
    // Efecto ripple en botones
    addRippleEffect();
    
    // Manejadores de eventos para botones
    setupButtonHandlers();
    
    // Menú móvil
    setupMobileMenu();

    // Funcionalidad adicional para la página de game
    const aiCheckbox = document.querySelector('.ai-checkbox');
    const nameSection = document.getElementById('nameSection');
    const nameInput = document.querySelector('#name');
    
    if (aiCheckbox && nameSection && nameInput) {
        // Initial state
        if (aiCheckbox.checked) {
            nameSection.style.display = 'none';
            nameInput.removeAttribute('required');
        }

        aiCheckbox.addEventListener('change', function() {
            if (this.checked) {
                nameSection.style.display = 'none';
                nameInput.removeAttribute('required'); // Quitar required cuando IA está activa
                nameInput.value = ''; // Limpiar valor
            } else {
                nameSection.style.display = 'block';
                nameInput.setAttribute('required', ''); // Volver a poner required
            }
        });
    }
});

function handleMouseMove(e) {
    const particles = document.querySelectorAll('.floating-particle');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    particles.forEach((particle, index) => {
        const speed = (index + 1) * 0.5;
        const x = (mouseX - 0.5) * speed;
        const y = (mouseY - 0.5) * speed;
        particle.style.transform = `translate(${x}px, ${y}px)`;
    });
}

function addRippleEffect() {
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            if (e.target.closest('.logout-btn')) { // Do not show ripple on logout
                return;
            }
            let ripple = document.createElement('span');
            let rect = this.getBoundingClientRect();
            let size = Math.max(rect.width, rect.height);
            let x = e.clientX - rect.left - size / 2;
            let y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

function setupButtonHandlers() {
    const signupBtn = document.getElementById('signupBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            window.location.href = '/signup';
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/login';
        });
    }
}

function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
}

// Optimización de rendimiento para el parallax
let ticking = false;

function optimizedMouseMove(e) {
    if (!ticking) {
        requestAnimationFrame(() => {
            handleMouseMove(e);
            ticking = false;
        });
        ticking = true;
    }
}

// Usar la versión optimizada en dispositivos con mejor rendimiento
if (window.devicePixelRatio > 1) {
    document.removeEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousemove', optimizedMouseMove);
}

 // Función logout
async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok || response.redirected) {
            window.location.href = '/login';
        } else {
            console.error('Error during logout');
        }
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/logout';
    }
}

// Toggle menú móvil
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Cerrar menú móvil al hacer clic fuera
document.addEventListener('click', function(event) {
    const menu = document.getElementById('mobileMenu');
    const button = document.querySelector('.mobile-menu-btn');
    
    if (menu && button && !menu.contains(event.target) && !button.contains(event.target)) {
        menu.classList.add('hidden');
    }
});
        
       