// Admin Promo Codes Management JavaScript
class PromoCodeManager {
    constructor() {
        this.isEditing = false;
        this.editingCode = null;
        this.init();
    }

    init() {
        this.loadPromoData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Code input uppercase conversion
        document.getElementById('promoCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    async loadPromoData() {
        try {
            console.log('🔄 Loading promo codes...');
            
            const response = await fetch('/admin/api/promo-codes', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Promo codes loaded:', data);

            if (data.success) {
                this.renderPromoCards(data.promo_codes || []);
                this.updateStatistics(data.promo_codes || []);
            } else {
                this.showToast('Failed to load promo codes', 'error');
                this.renderPromoCards([]);
            }

        } catch (error) {
            console.error('❌ Error loading promo codes:', error);
            this.showToast('Failed to load promo codes: ' + error.message, 'error');
            this.renderPromoCards([]);
        }
    }

    renderPromoCards(promoList) {
        const container = document.getElementById('promo-container');
        
        if (!promoList || promoList.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-tags fa-3x text-muted mb-3"></i>
                        <h4 class="text-muted">No Promo Codes Created</h4>
                        <p class="text-muted">Get started by creating your first promotional discount code</p>
                        <button class="btn btn-success" onclick="showAddPromoModal()">
                            <i class="fas fa-plus me-2"></i>Add First Promo Code
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        promoList.forEach(promo => {
            const status = this.getPromoStatus(promo);
            const usagePercent = promo.usage_limit ? Math.round((promo.usage_count / promo.usage_limit) * 100) : 0;
            
            html += `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="promo-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <div class="promo-code-badge mb-2">${promo.code}</div>
                                <span class="discount-badge ${promo.discount_type === 'percentage' ? 'discount-percentage' : 'discount-fixed'}">
                                    ${promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `₨${promo.discount_value.toLocaleString()} OFF`}
                                </span>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="editPromoCode('${promo.code}')">
                                        <i class="fas fa-edit me-2"></i>Edit
                                    </a></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deletePromoCode('${promo.code}')">
                                        <i class="fas fa-trash me-2"></i>Remove
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <p class="mb-2 text-muted">${promo.description}</p>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">Status:</small>
                                <span class="status-${status.class}">${status.text}</span>
                            </div>
                            
                            ${promo.min_amount ? `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <small class="text-muted">Min Amount:</small>
                                    <span>₨${promo.min_amount.toLocaleString()}</span>
                                </div>
                            ` : ''}
                            
                            ${promo.usage_limit ? `
                                <div class="mb-2">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <small class="text-muted">Usage:</small>
                                        <small>${promo.usage_count}/${promo.usage_limit} (${usagePercent}%)</small>
                                    </div>
                                    <div class="usage-progress">
                                        <div class="usage-fill" style="width: ${usagePercent}%"></div>
                                    </div>
                                </div>
                            ` : `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <small class="text-muted">Usage:</small>
                                    <span>${promo.usage_count} times</span>
                                </div>
                            `}
                        </div>
                        
                        <div class="text-center">
                            <button class="btn btn-edit btn-sm w-100" onclick="editPromoCode('${promo.code}')">
                                <i class="fas fa-edit me-2"></i>Edit Promo Code
                            </button>
                        </div>
                        
                        ${(promo.valid_from || promo.valid_until) ? `
                            <div class="mt-2 pt-2 border-top">
                                <small class="text-muted">
                                    ${promo.valid_from ? `From: ${this.formatDate(promo.valid_from)}` : ''}
                                    ${promo.valid_until ? ` Until: ${this.formatDate(promo.valid_until)}` : ''}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateStatistics(promoList) {
        const totalPromos = promoList.length;
        const activePromos = promoList.filter(p => this.getPromoStatus(p).class === 'active').length;
        const totalUsage = promoList.reduce((sum, p) => sum + p.usage_count, 0);
        
        // Calculate average discount (for display purposes, assume average booking of 5000)
        let avgDiscount = 0;
        if (promoList.length > 0) {
            const totalDiscount = promoList.reduce((sum, p) => {
                if (p.discount_type === 'percentage') {
                    const discount = Math.min((5000 * p.discount_value) / 100, p.max_discount || Infinity);
                    return sum + discount;
                } else {
                    return sum + p.discount_value;
                }
            }, 0);
            avgDiscount = Math.round(totalDiscount / promoList.length);
        }

        document.getElementById('total-promos').textContent = totalPromos;
        document.getElementById('active-promos').textContent = activePromos;
        document.getElementById('total-usage').textContent = totalUsage;
        document.getElementById('avg-discount').textContent = avgDiscount > 0 ? `₨${avgDiscount.toLocaleString()}` : '-';
    }

    getPromoStatus(promo) {
        if (!promo.is_active) {
            return { class: 'inactive', text: 'Inactive' };
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        if (promo.valid_from && today < promo.valid_from) {
            return { class: 'inactive', text: 'Not Started' };
        }
        
        if (promo.valid_until && today > promo.valid_until) {
            return { class: 'expired', text: 'Expired' };
        }
        
        if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
            return { class: 'expired', text: 'Usage Limit Reached' };
        }
        
        return { class: 'active', text: 'Active' };
    }

    async savePromoCode() {
        try {
            const form = document.getElementById('promoForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Handle applicable sports checkboxes
            const selectedSports = [];
            document.querySelectorAll('input[name="applicable_sports"]:checked').forEach(cb => {
                selectedSports.push(cb.value);
            });
            
            if (selectedSports.length > 0) {
                data.applicable_sports = JSON.stringify(selectedSports);
            } else {
                data.applicable_sports = null;
            }

            // Clean empty values
            Object.keys(data).forEach(key => {
                if (data[key] === '' || data[key] === null) {
                    delete data[key];
                }
            });

            // Validate required fields
            if (!data.code || !data.description || !data.discount_value || data.discount_value <= 0) {
                this.showToast('Please fill in all required fields with valid values', 'error');
                return;
            }

            // Convert numeric fields
            if (data.discount_value) data.discount_value = parseInt(data.discount_value);
            if (data.min_amount) data.min_amount = parseInt(data.min_amount);
            if (data.max_discount) data.max_discount = parseInt(data.max_discount);
            if (data.usage_limit) data.usage_limit = parseInt(data.usage_limit);

            this.setLoadingState(true);

            console.log('💾 Saving promo code:', data);

            const url = this.isEditing ? 
                `/admin/api/promo-codes/${this.editingCode}` : 
                '/admin/api/promo-codes';
            const method = this.isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('📄 Save response:', result);

            if (result.success) {
                this.showToast(result.message || 'Promo code saved successfully!', 'success');
                this.closePromoModal();
                this.loadPromoData();
            } else {
                this.showToast(result.message || 'Failed to save promo code', 'error');
            }

        } catch (error) {
            console.error('❌ Error saving promo code:', error);
            this.showToast('Failed to save promo code: ' + error.message, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async deletePromoCode(code) {
        if (!confirm(`Are you sure you want to remove promo code "${code}"? This action cannot be undone.`)) {
            return;
        }

        try {
            console.log('🗑️ Deleting promo code:', code);

            const response = await fetch(`/admin/api/promo-codes/${code}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('📄 Delete response:', result);

            if (result.success) {
                this.showToast(result.message || 'Promo code deleted successfully!', 'success');
                this.loadPromoData();
            } else {
                this.showToast(result.message || 'Failed to delete promo code', 'error');
            }

        } catch (error) {
            console.error('❌ Error deleting promo code:', error);
            this.showToast('Failed to delete promo code: ' + error.message, 'error');
        }
    }

    async editPromoCode(code) {
        try {
            console.log('✏️ Loading promo code for edit:', code);
            
            const response = await fetch(`/admin/api/promo-codes/${code}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load promo code data');
            }

            const result = await response.json();
            
            if (result.success && result.promo_code) {
                this.populateEditForm(result.promo_code);
                this.showEditPromoModal(code);
            } else {
                this.showToast('Failed to load promo code data', 'error');
            }

        } catch (error) {
            console.error('❌ Error loading promo code for edit:', error);
            this.showToast('Failed to load promo code data', 'error');
        }
    }

    populateEditForm(promo) {
        document.getElementById('promoCode').value = promo.code;
        document.getElementById('description').value = promo.description;
        document.getElementById('discountType').value = promo.discount_type;
        document.getElementById('discountValue').value = promo.discount_value;
        document.getElementById('minAmount').value = promo.min_amount || '';
        document.getElementById('maxDiscount').value = promo.max_discount || '';
        document.getElementById('usageLimit').value = promo.usage_limit || '';
        document.getElementById('validFrom').value = promo.valid_from || '';
        document.getElementById('validUntil').value = promo.valid_until || '';
        
        // Handle applicable sports
        document.querySelectorAll('input[name="applicable_sports"]').forEach(cb => {
            cb.checked = false;
        });
        
        if (promo.applicable_sports) {
            try {
                const sports = JSON.parse(promo.applicable_sports);
                sports.forEach(sport => {
                    const checkbox = document.getElementById(`sport-${sport}`);
                    if (checkbox) checkbox.checked = true;
                });
            } catch (e) {
                console.warn('Error parsing applicable sports:', e);
            }
        }
        
        toggleDiscountFields(); // Update form fields based on discount type
    }

    showAddPromoModal() {
        this.isEditing = false;
        this.editingCode = null;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Add New Promo Code';
        document.querySelector('.btn-text').textContent = 'Save Promo Code';
        
        // Reset form
        document.getElementById('promoForm').reset();
        document.getElementById('promoCode').removeAttribute('readonly');
        document.getElementById('promoCode').style.pointerEvents = 'auto';
        document.getElementById('promoCode').style.backgroundColor = '';
        
        toggleDiscountFields(); // Initialize form fields
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('promoModal'));
        modal.show();
    }

    showEditPromoModal(code) {
        this.isEditing = true;
        this.editingCode = code;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Promo Code';
        document.querySelector('.btn-text').textContent = 'Update Promo Code';
        
        // Make code field readonly during edit
        document.getElementById('promoCode').setAttribute('readonly', true);
        document.getElementById('promoCode').style.pointerEvents = 'none';
        document.getElementById('promoCode').style.backgroundColor = '#e9ecef';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('promoModal'));
        modal.show();
    }

    closePromoModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('promoModal'));
        if (modal) {
            modal.hide();
        }
    }

    setLoadingState(loading) {
        const button = document.querySelector('#promoModal .btn-success');
        const spinner = button.querySelector('.loading-spinner');
        const text = button.querySelector('.btn-text');
        
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
            spinner.style.display = 'inline-block';
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            spinner.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info'} text-white`;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    }
}

// Toggle discount fields based on discount type
function toggleDiscountFields() {
    const discountType = document.getElementById('discountType').value;
    const discountValueLabel = document.getElementById('discountValueLabel');
    const discountValueHelp = document.getElementById('discountValueHelp');
    const discountValueInput = document.getElementById('discountValue');
    const maxDiscountField = document.getElementById('maxDiscountField');
    
    if (discountType === 'percentage') {
        discountValueLabel.innerHTML = 'Discount Percentage <span class="text-danger">*</span>';
        discountValueHelp.textContent = 'Enter percentage (1-100)';
        discountValueInput.max = 100;
        discountValueInput.min = 1;
        maxDiscountField.style.display = 'block';
    } else {
        discountValueLabel.innerHTML = 'Discount Amount (PKR) <span class="text-danger">*</span>';
        discountValueHelp.textContent = 'Enter fixed amount in PKR';
        discountValueInput.max = 999999;
        discountValueInput.min = 1;
        maxDiscountField.style.display = 'none';
    }
}

// Global functions for onclick handlers
let promoCodeManager;

function showAddPromoModal() {
    promoCodeManager.showAddPromoModal();
}

function savePromoCode() {
    promoCodeManager.savePromoCode();
}

function editPromoCode(code) {
    promoCodeManager.editPromoCode(code);
}

function deletePromoCode(code) {
    promoCodeManager.deletePromoCode(code);
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    promoCodeManager = new PromoCodeManager();
});