// Modern NoBall Sports Club - Interactive Features

class ModernNoBall {
    constructor() {
        this.init();
        this.setupAnimations();
        this.setupInteractions();
        this.setupScrollEffects();
    }

    init() {
        // Loading screen
        this.hideLoadingScreen();
        
        // Initialize components
        this.initMobileMenu();
        this.initSportCards();
        this.initScrollToTop();
        
        // Performance optimizations
        this.setupIntersectionObserver();
        
        console.log('🚀 Modern NoBall initialized');
    }

    hideLoadingScreen() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 800);
                }
            }, 1000);
        });
    }

    initMobileMenu() {
        const mobileToggle = document.querySelector('.mobile-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileToggle && navLinks) {
            mobileToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                mobileToggle.classList.toggle('active');
            });
        }
    }

    initSportCards() {
        const sportCards = document.querySelectorAll('.sport-card.modern');
        
        sportCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.animateCardHover(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.animateCardHover(card, false);
            });
            
            card.addEventListener('click', () => {
                const sport = card.dataset.sport;
                this.handleSportSelection(sport);
            });
        });
    }

    animateCardHover(card, isHover) {
        const icon = card.querySelector('.sport-icon');
        const cardBtn = card.querySelector('.card-btn');
        
        if (isHover) {
            // Animate icon
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(10deg)';
            }
            
            // Animate button
            if (cardBtn) {
                cardBtn.style.transform = 'scale(1.1) rotate(90deg)';
            }
            
            // Add hover class for additional effects
            card.classList.add('hover-active');
        } else {
            // Reset animations
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0deg)';
            }
            
            if (cardBtn) {
                cardBtn.style.transform = 'scale(1) rotate(0deg)';
            }
            
            card.classList.remove('hover-active');
        }
    }

    handleSportSelection(sport) {
        // Add selection animation
        const selectedCard = document.querySelector(`[data-sport="${sport}"]`);
        if (selectedCard) {
            selectedCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                selectedCard.style.transform = '';
            }, 150);
        }
        
        // Navigate to booking with sport pre-selected
        setTimeout(() => {
            window.location.href = `/booking?sport=${sport}`;
        }, 300);
    }

    setupScrollEffects() {
        let lastScrollY = window.scrollY;
        const header = document.querySelector('.modern-header');
        
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            
            // Header visibility
            if (header) {
                if (scrollY > lastScrollY && scrollY > 100) {
                    header.style.transform = 'translateY(-100%)';
                } else {
                    header.style.transform = 'translateY(0)';
                }
                
                // Header background opacity
                const opacity = Math.min(scrollY / 100, 1);
                header.style.background = `rgba(255, 255, 255, ${opacity * 0.1})`;
            }
            
            lastScrollY = scrollY;
        });
        
        // Parallax effect for floating shapes
        this.setupParallax();
    }

    setupParallax() {
        const shapes = document.querySelectorAll('.floating-shape');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 0.2;
                shape.style.transform = `translateY(${rate * speed}px)`;
            });
        });
    }

    setupAnimations() {
        // Animate elements on scroll
        this.animateOnScroll();
        
        // Sport orbs animation
        this.animateSportOrbs();
        
        // Button hover effects
        this.setupButtonAnimations();
    }

    animateOnScroll() {
        const elements = document.querySelectorAll('.section-header, .sport-card, .feature-item, .contact-method');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
    }

    animateSportOrbs() {
        const sportOrbs = document.querySelectorAll('.sport-orb');
        
        sportOrbs.forEach((orb, index) => {
            orb.addEventListener('mouseenter', () => {
                orb.style.transform = 'scale(1.2) rotate(10deg)';
                orb.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
            });
            
            orb.addEventListener('mouseleave', () => {
                orb.style.transform = 'scale(1) rotate(0deg)';
                orb.style.boxShadow = '';
            });
            
            orb.addEventListener('click', () => {
                this.triggerOrbClick(orb, index);
            });
        });
    }

    triggerOrbClick(orb, index) {
        // Ripple effect
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.width = '0';
        ripple.style.height = '0';
        ripple.style.background = 'rgba(255, 255, 255, 0.6)';
        ripple.style.borderRadius = '50%';
        ripple.style.top = '50%';
        ripple.style.left = '50%';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.pointerEvents = 'none';
        
        orb.style.position = 'relative';
        orb.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
        
        // Navigate to sport
        const sports = ['padel', 'cricket', 'futsal', 'pickleball'];
        if (sports[index]) {
            this.handleSportSelection(sports[index]);
        }
    }

    setupButtonAnimations() {
        const buttons = document.querySelectorAll('.btn-modern');
        
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.style.transform = 'translateX(5px)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.style.transform = 'translateX(0)';
                }
            });
            
            button.addEventListener('click', (e) => {
                this.createRippleEffect(e, button);
            });
        });
    }

    createRippleEffect(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.position = 'absolute';
        ripple.style.background = 'rgba(255, 255, 255, 0.4)';
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.pointerEvents = 'none';
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupInteractions() {
        // Smooth scrolling for navigation links
        this.setupSmoothScrolling();
        
        // Contact method interactions
        this.setupContactMethods();
        
        // Form validations (if any)
        this.setupFormValidations();
    }

    setupSmoothScrolling() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }

    setupContactMethods() {
        const contactMethods = document.querySelectorAll('.contact-method');
        
        contactMethods.forEach(method => {
            method.addEventListener('click', () => {
                const icon = method.querySelector('.method-icon');
                const iconElement = icon.querySelector('i');
                
                // Bounce animation
                icon.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    icon.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        icon.style.transform = 'scale(1)';
                    }, 150);
                }, 100);
                
                // Handle click based on method type
                if (iconElement.classList.contains('fa-phone')) {
                    // Phone call
                    window.location.href = 'tel:+923XXXXXXXXX';
                } else if (iconElement.classList.contains('fa-whatsapp')) {
                    // WhatsApp
                    window.open('https://wa.me/923XXXXXXXXX', '_blank');
                } else if (iconElement.classList.contains('fa-envelope')) {
                    // Email
                    window.location.href = 'mailto:info@noball.pk';
                }
            });
        });
    }

    setupFormValidations() {
        // Add any form validation logic here
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                // Add validation logic if needed
                console.log('Form submitted');
            });
        });
    }

    setupIntersectionObserver() {
        // Optimize animations with Intersection Observer
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -10% 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    
                    // Trigger specific animations based on element
                    if (entry.target.classList.contains('sport-card')) {
                        this.animateSportCard(entry.target);
                    } else if (entry.target.classList.contains('feature-item')) {
                        this.animateFeatureItem(entry.target);
                    }
                }
            });
        }, observerOptions);
        
        // Observe elements
        const elementsToObserve = document.querySelectorAll('.sport-card, .feature-item, .stat-item');
        elementsToObserve.forEach(el => observer.observe(el));
    }

    animateSportCard(card) {
        const delay = Array.from(card.parentNode.children).indexOf(card) * 100;
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0) scale(1)';
        }, delay);
    }

    animateFeatureItem(item) {
        const delay = Array.from(item.parentNode.children).indexOf(item) * 200;
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, delay);
    }

    initScrollToTop() {
        // Create scroll to top button
        const scrollToTopBtn = document.createElement('button');
        scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollToTopBtn.className = 'scroll-to-top';
        scrollToTopBtn.style.cssText = `
            position: fixed;
            bottom: 6.5rem; /* lifted to avoid WhatsApp bubble overlap */
            right: 2rem;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: var(--primary-gradient);
            border: none;
            color: white;
            cursor: pointer;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: var(--shadow-lg);
        `;
        
        document.body.appendChild(scrollToTopBtn);
        
        // Show/hide based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollToTopBtn.style.opacity = '1';
                scrollToTopBtn.style.transform = 'translateY(0)';
            } else {
                scrollToTopBtn.style.opacity = '0';
                scrollToTopBtn.style.transform = 'translateY(20px)';
            }
        });
        
        // Scroll to top functionality
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ModernNoBall();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    
    .in-view {
        opacity: 1 !important;
        transform: translateY(0) translateX(0) !important;
    }
    
    .hover-active {
        box-shadow: var(--shadow-2xl) !important;
    }
    
    .nav-links.active {
        display: flex !important;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        flex-direction: column;
        padding: var(--space-4);
        border-radius: var(--radius-xl);
        margin-top: var(--space-2);
    }
    
    .mobile-toggle.active span:nth-child(1) {
        transform: rotate(-45deg) translate(-5px, 6px);
    }
    
    .mobile-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-toggle.active span:nth-child(3) {
        transform: rotate(45deg) translate(-5px, -6px);
    }
    
    .sport-card.modern {
        opacity: 0;
        transform: translateY(30px) scale(0.9);
        transition: all 0.6s ease;
    }
    
    .feature-item {
        opacity: 0;
        transform: translateX(-30px);
        transition: all 0.6s ease;
    }
    
    @media (max-width: 768px) {
        .nav-links {
            display: none;
        }
    }
`;
document.head.appendChild(style);
