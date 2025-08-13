/**
 * Core JavaScript utilities and base classes
 * Modern modular architecture for NoBall Sports Club
 */

// Base Component Class
class BaseComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = { ...this.getDefaultOptions(), ...options };
        this.state = {};
        this.eventListeners = new Map();
        
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
        
        this.init();
    }
    
    getDefaultOptions() {
        return {};
    }
    
    init() {
        this.render();
        this.bindEvents();
    }
    
    render() {
        // Override in subclasses
    }
    
    bindEvents() {
        // Override in subclasses
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.onStateChange(newState);
    }
    
    onStateChange(changedState) {
        // Override in subclasses
    }
    
    addEventListener(element, event, handler) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (element) {
            element.addEventListener(event, handler);
            
            const key = `${element.id || 'anonymous'}_${event}`;
            if (!this.eventListeners.has(key)) {
                this.eventListeners.set(key, []);
            }
            this.eventListeners.get(key).push({ element, event, handler });
        }
    }
    
    removeAllEventListeners() {
        this.eventListeners.forEach((listeners) => {
            listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();
    }
    
    destroy() {
        this.removeAllEventListeners();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
    
    emit(eventName, data) {
        const event = new CustomEvent(`${this.constructor.name.toLowerCase()}:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }
    
    on(eventName, handler) {
        document.addEventListener(`${this.constructor.name.toLowerCase()}:${eventName}`, handler);
    }
}

// API Client Class
class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error: ${error.message}`);
            throw error;
        }
    }
    
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url);
    }
    
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Toast Notification System
class ToastManager {
    constructor() {
        this.toasts = new Map();
        this.container = this.createContainer();
    }
    
    createContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }
    
    show(message, type = 'info', duration = 3000, options = {}) {
        const toast = this.createToast(message, type, duration, options);
        this.container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
        
        // Auto-remove
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }
        
        return toast;
    }
    
    createToast(message, type, duration, options) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        toast.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 1rem 1.5rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        `;
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info} ${type === 'info' && duration === 0 ? 'fa-spin' : ''}"></i>
            <span style="flex: 1; font-weight: 500;">${message}</span>
            ${duration > 0 ? '<button class="toast-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; opacity: 0.8;">&times;</button>' : ''}
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(toast));
        }
        
        return toast;
    }
    
    remove(toast) {
        if (toast && toast.parentNode) {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
    
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }
    
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }
    
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
    
    loading(message) {
        return this.show(message, 'info', 0);
    }
    
    clearAll() {
        this.container.innerHTML = '';
    }
}

// Modal Manager
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.overlay = this.createOverlay();
    }
    
    createOverlay() {
        let overlay = document.getElementById('modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'modal-overlay hidden';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(4px);
            `;
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeAll();
                }
            });
        }
        return overlay;
    }
    
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            this.overlay.classList.remove('hidden');
            this.overlay.style.display = 'flex';
            modal.classList.remove('hidden');
            
            // Add animation
            requestAnimationFrame(() => {
                modal.style.animation = 'modalSlideIn 0.3s ease';
            });
            
            this.modals.set(modalId, modal);
        }
    }
    
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.animation = 'modalSlideOut 0.3s ease';
            setTimeout(() => {
                modal.classList.add('hidden');
                this.modals.delete(modalId);
                
                if (this.modals.size === 0) {
                    this.overlay.classList.add('hidden');
                    this.overlay.style.display = 'none';
                }
            }, 300);
        }
    }
    
    closeAll() {
        this.modals.forEach((modal, modalId) => {
            this.hide(modalId);
        });
    }
}

// Utility Functions
const Utils = {
    formatTime(time24) {
        const [hour, minute] = time24.split(':').map(Number);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    },
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    formatCurrency(amount) {
        return `PKR ${amount.toLocaleString()}`;
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle(func, wait) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, wait);
            }
        };
    },
    
    validateRequired(fields, data) {
        const errors = [];
        fields.forEach(field => {
            if (!data[field] || String(data[field]).trim() === '') {
                errors.push(`${field} is required`);
            }
        });
        return errors;
    },
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validatePhone(phone) {
        const re = /^\+?[\d\s\-\(\)]+$/;
        return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
};

// Global instances
window.toast = new ToastManager();
window.modal = new ModalManager();
window.api = new APIClient('/admin/api');

// Make classes available globally for browser use
window.BaseComponent = BaseComponent;
window.APIClient = APIClient;
window.ToastManager = ToastManager;
window.ModalManager = ModalManager;
window.Utils = Utils;

console.log('✅ Core JavaScript modules loaded');