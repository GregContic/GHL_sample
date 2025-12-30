// ===================================
// THEME MANAGEMENT
// ===================================

/**
 * Handles dark/light theme switching
 * Persists user preference in localStorage
 */
class ThemeManager {
    constructor() {
        this.themeToggle = document.querySelector('.theme-toggle');
        this.currentTheme = this.getStoredTheme();
        this.init();
    }

    init() {
        // Set initial theme
        this.setTheme(this.currentTheme, false);
        
        // Add event listener
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    getStoredTheme() {
        // Check localStorage first
        const stored = localStorage.getItem('theme');
        if (stored) return stored;
        
        // Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        
        return 'dark';
    }

    setTheme(theme, animate = true) {
        // Add transition class for smooth color change
        if (animate) {
            document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        
        // Remove transition after animation completes
        if (animate) {
            setTimeout(() => {
                document.documentElement.style.transition = '';
            }, 300);
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}

// ===================================
// SCROLL ANIMATIONS
// ===================================

/**
 * REVEAL ANIMATION SYSTEM
 * ========================
 * 
 * PURPOSE:
 * Creates smooth scroll-triggered animations that REPLAY every time
 * an element enters the viewport and REVERSE when it exits.
 * 
 * HOW IT WORKS:
 * 1. Elements with .reveal class start hidden (opacity: 0)
 * 2. IntersectionObserver watches when elements enter/exit viewport
 * 3. When element ENTERS viewport → adds .is-visible class
 * 4. When element EXITS viewport → removes .is-visible class
 * 5. CSS transitions handle the smooth animation
 * 
 * KEY FEATURES:
 * - ✅ Animations replay on every viewport entry (not once)
 * - ✅ Smooth transitions using transform & opacity only
 * - ✅ GPU-accelerated (no layout shifts)
 * - ✅ Supports custom delays via CSS variables
 * - ✅ Auto-staggered animations for grouped elements
 * - ✅ Respects prefers-reduced-motion
 * - ✅ Backwards compatible with .fade-in-up class
 * 
 * USAGE EXAMPLES:
 * ---------------
 * 
 * Basic fade-up:
 * <div class="reveal fade-up">Content</div>
 * 
 * With custom delay:
 * <div class="reveal fade-up" style="--delay: 0.3s">Content</div>
 * 
 * Different animation types:
 * <div class="reveal fade-in">Simple fade</div>
 * <div class="reveal slide-left">Slide from right</div>
 * <div class="reveal slide-right">Slide from left</div>
 * <div class="reveal scale-in">Grow effect</div>
 * <div class="reveal fade-down">Fade down</div>
 * 
 * Staggered grid:
 * <div class="grid">
 *   <div class="reveal fade-up" style="--delay: 0.1s">Item 1</div>
 *   <div class="reveal fade-up" style="--delay: 0.2s">Item 2</div>
 *   <div class="reveal fade-up" style="--delay: 0.3s">Item 3</div>
 * </div>
 * 
 * PERFORMANCE NOTES:
 * ------------------
 * - Uses IntersectionObserver (modern, efficient API)
 * - Only animates transform and opacity (GPU-accelerated)
 * - Elements remain observed (no re-initialization needed)
 * - Minimal JavaScript - CSS handles animations
 * - Auto-disabled for users with reduced motion preferences
 * 
 * BROWSER SUPPORT:
 * ----------------
 * - Modern browsers: Full support with smooth animations
 * - Legacy browsers: Graceful fallback (elements visible immediately)
 */

/**
 * Observes elements and triggers reveal animations
 * Uses IntersectionObserver for performance
 * Animations replay every time element enters viewport
 * 
 * HOW IT WORKS:
 * 1. Observes all elements with .reveal class
 * 2. When element ENTERS viewport → adds .is-visible class
 * 3. When element EXITS viewport → removes .is-visible class
 * 4. CSS handles the actual animation via transitions
 * 5. Supports custom delays via --delay CSS variable
 */
class ScrollAnimations {
    constructor() {
        // Select all elements with reveal animation classes
        this.elements = document.querySelectorAll('.reveal, .fade-in-up');
        
        // Configure intersection threshold
        // rootMargin: negative value means animation triggers slightly before entering
        this.options = {
            root: null,
            rootMargin: '-50px', // Trigger 50px before element enters
            threshold: 0.15 // 15% of element must be visible
        };
        
        this.init();
    }

    init() {
        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            // Fallback: show all elements immediately for older browsers
            this.elements.forEach(el => {
                el.classList.add('visible', 'is-visible');
            });
            return;
        }

        // Create observer that DOES NOT unobserve
        // This allows animations to replay on re-entry
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Element is entering viewport
                    // Add both classes for backwards compatibility
                    entry.target.classList.add('is-visible', 'visible');
                } else {
                    // Element is exiting viewport
                    // Remove classes to reset animation
                    // Only remove if element has scrolled out significantly
                    const rect = entry.boundingClientRect;
                    if (rect.bottom < 0 || rect.top > window.innerHeight) {
                        entry.target.classList.remove('is-visible');
                        // Keep 'visible' for fade-in-up legacy support
                    }
                }
            });
        }, this.options);

        // Observe all elements
        // NOTE: We do NOT unobserve, allowing continuous monitoring
        this.elements.forEach(el => {
            this.observer.observe(el);
            
            // Apply stagger delay from inline CSS variable
            // Example: <div class="reveal" style="--delay: 0.2s">
            this.applyStaggerDelay(el);
        });
    }

    /**
     * Applies stagger delay using CSS variable
     * Can be overridden with inline style="--delay: 0.3s"
     */
    applyStaggerDelay(element) {
        // Check if element already has a delay set
        const hasCustomDelay = element.style.getPropertyValue('--delay');
        if (hasCustomDelay) return;
        
        // Auto-calculate stagger for grouped elements
        const parent = element.parentElement;
        const siblings = Array.from(parent.children).filter(el => 
            el.classList.contains('reveal') || el.classList.contains('fade-in-up')
        );
        
        if (siblings.length > 1) {
            const index = siblings.indexOf(element);
            // Stagger by 0.1s per element, max 0.5s
            const delay = Math.min(index * 0.1, 0.5);
            element.style.setProperty('--delay', `${delay}s`);
        }
    }

    /**
     * Public method to refresh observer
     * Useful if new elements are added dynamically
     */
    refresh() {
        this.elements = document.querySelectorAll('.reveal, .fade-in-up');
        this.elements.forEach(el => {
            this.observer.observe(el);
            this.applyStaggerDelay(el);
        });
    }
}

// ===================================
// SMOOTH SCROLL
// ===================================

/**
 * Handles smooth scrolling for anchor links
 */
class SmoothScroll {
    constructor() {
        this.links = document.querySelectorAll('a[href^="#"]');
        this.init();
    }

    init() {
        this.links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Skip if href is just "#"
                if (href === '#') {
                    e.preventDefault();
                    return;
                }

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    
                    // Calculate offset for fixed nav
                    const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
                    const targetPosition = target.offsetTop - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ===================================
// NAVIGATION SCROLL EFFECT
// ===================================

/**
 * Adds background blur effect to nav on scroll
 */
class NavigationScroll {
    constructor() {
        this.nav = document.querySelector('.nav');
        this.scrollThreshold = 50;
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    }

    handleScroll() {
        if (window.scrollY > this.scrollThreshold) {
            this.nav.style.background = 'rgba(10, 14, 23, 0.95)';
            this.nav.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
        } else {
            this.nav.style.background = '';
            this.nav.style.boxShadow = '';
        }
    }
}

// ===================================
// BUTTON INTERACTIONS
// ===================================

/**
 * Handles button click interactions and analytics
 */
class ButtonManager {
    constructor() {
        this.buttons = document.querySelectorAll('.btn');
        this.init();
    }

    init() {
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => this.handleClick(e, button));
        });
    }

    handleClick(event, button) {
        // Get button text for analytics
        const buttonText = button.textContent.trim();
        
        // Log to console (replace with actual analytics in production)
        console.log('Button clicked:', buttonText);
        
        // Add ripple effect
        this.createRipple(event, button);
        
        // Here you can add:
        // - Google Analytics event tracking
        // - Form submission
        // - Modal opening
        // - External link handling
        // - etc.
        
        // Example: Open contact form for CTA buttons
        if (buttonText.includes('Schedule') || buttonText.includes('Get Started')) {
            // Prevent default if it's a link
            event.preventDefault();
            
            // Example: You could open a modal or redirect to a GHL form
            console.log('Opening contact form...');
            // window.location.href = 'your-ghl-form-url';
        }
    }

    createRipple(event, button) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.5)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.pointerEvents = 'none';
        
        // Make button position relative if it's not
        if (getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }
        button.style.overflow = 'hidden';
        
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }
}

// Add ripple animation to stylesheet dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===================================
// PERFORMANCE MONITORING
// ===================================

/**
 * Monitors page performance metrics
 */
class PerformanceMonitor {
    constructor() {
        this.init();
    }

    init() {
        // Wait for page to fully load
        window.addEventListener('load', () => {
            // Check if Performance API is available
            if ('performance' in window) {
                this.logMetrics();
            }
        });
    }

    logMetrics() {
        // Get navigation timing
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domComplete - perfData.domLoading;
        
        console.log('Performance Metrics:');
        console.log('- Page Load Time:', pageLoadTime + 'ms');
        console.log('- Server Response Time:', connectTime + 'ms');
        console.log('- DOM Render Time:', renderTime + 'ms');
        
        // You can send these metrics to analytics
        // Example: Google Analytics, Mixpanel, etc.
    }
}

// ===================================
// LAZY LOADING IMAGES (Optional)
// ===================================

/**
 * Lazy loads images for better performance
 * Note: Currently no images in the design, but ready for future use
 */
class LazyLoader {
    constructor() {
        this.images = document.querySelectorAll('img[data-src]');
        this.init();
    }

    init() {
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately
            this.images.forEach(img => this.loadImage(img));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });

        this.images.forEach(img => observer.observe(img));
    }

    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
        }
    }
}

// ===================================
// FORM VALIDATION (Ready for GHL forms)
// ===================================

/**
 * Form validation helper
 * Use this when integrating with GHL forms
 */
class FormValidator {
    constructor(formSelector) {
        this.form = document.querySelector(formSelector);
        if (this.form) this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        // Validate form fields
        if (this.validateForm(data)) {
            console.log('Form is valid, submitting...', data);
            // Submit to GHL or your backend
            // this.submitToGHL(data);
        }
    }

    validateForm(data) {
        // Add your validation rules
        let isValid = true;
        
        // Example: Email validation
        if (data.email && !this.isValidEmail(data.email)) {
            this.showError('Please enter a valid email address');
            isValid = false;
        }
        
        return isValid;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showError(message) {
        console.error('Form Error:', message);
        // Display error message to user
    }
}

// ===================================
// INITIALIZE ALL MODULES
// ===================================

/**
 * Main initialization function
 * Runs when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager
    new ThemeManager();
    
    // Initialize scroll animations (store globally for refresh capability)
    window.scrollAnimations = new ScrollAnimations();
    
    // Initialize smooth scroll
    new SmoothScroll();
    
    // Initialize navigation scroll effect
    new NavigationScroll();
    
    // Initialize button manager
    new ButtonManager();
    
    // Initialize performance monitoring (optional in production)
    new PerformanceMonitor();
    
    // Initialize lazy loader (if you add images later)
    new LazyLoader();
    
    // Initialize form validation (uncomment when you add forms)
    // new FormValidator('#contact-form');
    
    // NEW: Initialize FAQ accordion
    new FAQAccordion();
    
    // NEW: Initialize parallax effects
    new ParallaxEffect();
    
    // NEW: Initialize sticky CTA
    new StickyCTA();
    
    // NEW: Initialize keyboard navigation
    new KeyboardNavigation();
    
    console.log('🚀 Website initialized successfully!');
});

// ===================================
// FAQ ACCORDION
// ===================================

/**
 * Handles FAQ accordion interactions
 * Smooth expand/collapse with ARIA support
 */
class FAQAccordion {
    constructor() {
        this.faqItems = document.querySelectorAll('.faq-question');
        this.init();
    }

    init() {
        this.faqItems.forEach(button => {
            button.addEventListener('click', () => this.toggleFAQ(button));
            
            // Keyboard support
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleFAQ(button);
                }
            });
        });
    }

    toggleFAQ(button) {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        const answer = button.nextElementSibling;
        
        // Close all other FAQs (optional - remove if you want multiple open)
        this.closeAllFAQs(button);
        
        // Toggle current FAQ
        button.setAttribute('aria-expanded', !isExpanded);
        
        if (!isExpanded) {
            // Opening
            const contentHeight = answer.querySelector('.faq-answer-content').scrollHeight;
            answer.style.maxHeight = contentHeight + 'px';
        } else {
            // Closing
            answer.style.maxHeight = '0';
        }
    }

    closeAllFAQs(exceptButton) {
        this.faqItems.forEach(button => {
            if (button !== exceptButton) {
                button.setAttribute('aria-expanded', 'false');
                const answer = button.nextElementSibling;
                answer.style.maxHeight = '0';
            }
        });
    }
}

// ===================================
// PARALLAX EFFECT
// ===================================

/**
 * Adds subtle parallax effect to hero background
 * Transform-only for best performance
 */
class ParallaxEffect {
    constructor() {
        this.heroBackground = document.querySelector('.hero-background');
        if (!this.heroBackground) return;
        
        this.parallaxStrength = 0.3; // Lower = more subtle
        this.init();
    }

    init() {
        // Add parallax class for will-change optimization
        this.heroBackground.classList.add('parallax-element');
        
        // Use throttled scroll handler for performance
        window.addEventListener('scroll', throttle(() => {
            this.updateParallax();
        }, 16), { passive: true }); // 16ms = ~60fps
    }

    updateParallax() {
        const scrolled = window.pageYOffset;
        const heroHeight = document.querySelector('.hero')?.offsetHeight || 0;
        
        // Only apply parallax when hero is visible
        if (scrolled < heroHeight) {
            const yPos = scrolled * this.parallaxStrength;
            this.heroBackground.style.transform = `translateY(${yPos}px)`;
        }
    }
}

// ===================================
// STICKY CTA (Mobile)
// ===================================

/**
 * Shows sticky CTA bar on mobile when user scrolls past main CTA
 * Hides when user is at main CTA or footer
 */
class StickyCTA {
    constructor() {
        this.stickyCta = document.getElementById('stickyCta');
        this.mainCta = document.querySelector('.final-cta');
        this.footer = document.querySelector('.footer');
        
        if (!this.stickyCta || !this.mainCta) return;
        
        this.init();
    }

    init() {
        // Check visibility on scroll
        window.addEventListener('scroll', throttle(() => {
            this.checkVisibility();
        }, 100), { passive: true });
        
        // Handle click on sticky CTA button
        const stickyButton = this.stickyCta.querySelector('.btn-sticky');
        if (stickyButton) {
            stickyButton.addEventListener('click', () => {
                this.scrollToMainCTA();
            });
        }
    }

    checkVisibility() {
        const scrollPosition = window.scrollY + window.innerHeight;
        const mainCtaPosition = this.mainCta.offsetTop;
        const mainCtaBottom = mainCtaPosition + this.mainCta.offsetHeight;
        const footerPosition = this.footer?.offsetTop || Infinity;
        
        // Show sticky CTA if:
        // - User scrolled past the main CTA
        // - User is not at the footer
        // - Window width is mobile (handled by CSS, but check here too)
        if (scrollPosition > mainCtaBottom && 
            scrollPosition < footerPosition && 
            window.innerWidth <= 768) {
            this.stickyCta.classList.add('visible');
        } else {
            this.stickyCta.classList.remove('visible');
        }
    }

    scrollToMainCTA() {
        const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
        const targetPosition = this.mainCta.offsetTop - navHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// ===================================
// KEYBOARD NAVIGATION
// ===================================

/**
 * Enhanced keyboard navigation support
 * Improves accessibility across the site
 */
class KeyboardNavigation {
    constructor() {
        this.init();
    }

    init() {
        // Handle Escape key to close modals, FAQs, etc.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscape();
            }
        });
        
        // Trap focus in modals (if you add modals later)
        this.setupFocusTrap();
        
        // Add skip-to-content link functionality
        this.setupSkipLink();
    }

    handleEscape() {
        // Close all open FAQs
        const openFAQs = document.querySelectorAll('.faq-question[aria-expanded="true"]');
        openFAQs.forEach(faq => {
            faq.setAttribute('aria-expanded', 'false');
            const answer = faq.nextElementSibling;
            answer.style.maxHeight = '0';
        });
        
        // Close any open modals (implement when needed)
        // this.closeModals();
    }

    setupFocusTrap() {
        // Implement focus trap for modals when needed
        // This keeps keyboard focus within modal dialogs
    }

    setupSkipLink() {
        // Add invisible skip-to-content link for screen readers
        // This is a best practice for accessibility
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: var(--accent-blue);
            color: white;
            padding: 8px;
            text-decoration: none;
            z-index: 10000;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.prepend(skipLink);
        
        // Add id to hero section if not exists
        const hero = document.querySelector('.hero');
        if (hero && !hero.id) {
            hero.id = 'main-content';
        }
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Debounce function for performance
 * Use for scroll and resize events
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for performance
 * Alternative to debounce for certain use cases
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ThemeManager,
        ScrollAnimations,
        SmoothScroll,
        debounce,
        throttle
    };
}
