// Admin Pricing Management JavaScript
class PricingManager {
    constructor() {
        this.isEditing = false;
        this.editingCourtId = null;
        this.init();
    }

    init() {
        this.loadPricingData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Court selection change handler
        document.getElementById('courtId').addEventListener('change', (e) => {
            this.updateCourtInfo(e.target.value);
        });
    }

    updateCourtInfo(courtId) {
        const courtMappings = {
            'padel-1': { name: 'Court 1: Purple Mondo', sport: 'padel' },
            'padel-2': { name: 'Court 2: Teracotta Court', sport: 'padel' },
            'cricket-1': { name: 'Court 1: 110x50ft', sport: 'cricket' },
            'cricket-2': { name: 'Court 2: 130x60ft Multi', sport: 'cricket' },
            'futsal-1': { name: 'Court 1: 130x60ft Multi', sport: 'futsal' },
            'pickleball-1': { name: 'Court 1: Professional Setup', sport: 'pickleball' },
            'axe-1': { name: 'Lane 1: Axe Throw', sport: 'axe_throw' },
            'archery-1': { name: 'Lane 1: Archery Range', sport: 'archery' }
        };

        const courtInfo = courtMappings[courtId];
        if (courtInfo) {
            document.getElementById('courtName').value = courtInfo.name;
            document.getElementById('sport').value = courtInfo.sport;
        }
    }

    async loadPricingData() {
        try {
            console.log('🔄 Loading pricing data...');
            
            const response = await fetch('/admin/api/pricing', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Pricing data loaded:', data);

            if (data.success) {
                this.renderPricingCards(data.pricing || []);
                this.updateStatistics(data.pricing || []);
            } else {
                this.showToast('Failed to load pricing data', 'error');
                this.renderPricingCards([]); // Show empty state
            }

        } catch (error) {
            console.error('❌ Error loading pricing data:', error);
            this.showToast('Failed to load pricing data: ' + error.message, 'error');
            this.renderPricingCards([]); // Show empty state
        }
    }

    renderPricingCards(pricingList) {
        const container = document.getElementById('pricing-container');
        
        if (!pricingList || pricingList.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-dollar-sign fa-3x text-muted mb-3"></i>
                        <h4 class="text-muted">No Pricing Configured</h4>
                        <p class="text-muted">Get started by adding pricing for your courts</p>
                        <button class="btn btn-primary" onclick="showAddPricingModal()">
                            <i class="fas fa-plus me-2"></i>Add First Pricing
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        pricingList.forEach(pricing => {
            const sportClass = `sport-${pricing.sport}`;
            
            html += `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="pricing-card p-4 h-100">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="mb-1">${pricing.court_name}</h5>
                                <span class="sport-badge ${sportClass}">${pricing.sport.toUpperCase()}</span>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="editPricing('${pricing.court_id}')">
                                        <i class="fas fa-edit me-2"></i>Edit
                                    </a></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deletePricing('${pricing.court_id}')">
                                        <i class="fas fa-trash me-2"></i>Remove
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <div class="price-tag">
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">Base Price</small>
                                    <span class="price-display">₨ ${pricing.base_price.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            ${pricing.peak_price ? `
                                <div class="price-tag">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">Peak (6PM-10PM)</small>
                                        <span class="fw-bold text-warning">₨ ${pricing.peak_price.toLocaleString()}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${pricing.off_peak_price ? `
                                <div class="price-tag">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">Off-Peak (2PM-6PM)</small>
                                        <span class="fw-bold text-info">₨ ${pricing.off_peak_price.toLocaleString()}</span>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${pricing.weekend_price ? `
                                <div class="price-tag">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <small class="text-muted">Weekend</small>
                                        <span class="fw-bold text-success">₨ ${pricing.weekend_price.toLocaleString()}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="text-center">
                            <button class="btn btn-edit btn-sm w-100" onclick="editPricing('${pricing.court_id}')">
                                <i class="fas fa-edit me-2"></i>Edit Pricing
                            </button>
                        </div>
                        
                        ${pricing.effective_from || pricing.effective_until ? `
                            <div class="mt-2 pt-2 border-top">
                                <small class="text-muted">
                                    ${pricing.effective_from ? `From: ${pricing.effective_from}` : ''}
                                    ${pricing.effective_until ? ` Until: ${pricing.effective_until}` : ''}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateStatistics(pricingList) {
        const totalCourts = pricingList.length;
        const activePricing = pricingList.filter(p => p.is_active).length;
        const sports = [...new Set(pricingList.map(p => p.sport))];
        const avgPrice = pricingList.length > 0 ? 
            Math.round(pricingList.reduce((sum, p) => sum + p.base_price, 0) / pricingList.length) : 0;

        document.getElementById('total-courts').textContent = totalCourts;
        document.getElementById('active-pricing').textContent = activePricing;
        document.getElementById('sports-count').textContent = sports.length;
        document.getElementById('avg-price').textContent = avgPrice > 0 ? `₨ ${avgPrice.toLocaleString()}` : '-';
    }

    async savePricing() {
        try {
            const form = document.getElementById('pricingForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Handle disabled fields for edit mode
            if (this.isEditing && this.editingCourtId) {
                data.court_id = this.editingCourtId;
                // Also get other disabled field values
                data.court_name = document.getElementById('courtName').value;
                data.sport = document.getElementById('sport').value;
            }

            // Clean empty values and validate required fields
            Object.keys(data).forEach(key => {
                if (data[key] === '' || data[key] === null) {
                    delete data[key];
                }
            });

            // Validate required fields
            if (!data.court_id || !data.base_price || data.base_price <= 0) {
                this.showToast('Please select a court and enter a valid base price', 'error');
                console.log('❌ Validation failed:', data);
                return;
            }

            // Ensure numeric fields are properly converted
            if (data.base_price) data.base_price = parseInt(data.base_price);
            if (data.peak_price) data.peak_price = parseInt(data.peak_price);
            if (data.off_peak_price) data.off_peak_price = parseInt(data.off_peak_price);
            if (data.weekend_price) data.weekend_price = parseInt(data.weekend_price);

            // Show loading state
            this.setLoadingState(true);

            console.log('💾 Saving pricing data:', data);

            const response = await fetch('/admin/api/pricing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('📄 Save response:', result);

            if (result.success) {
                this.showToast(result.message || 'Pricing saved successfully!', 'success');
                this.closePricingModal();
                this.loadPricingData(); // Refresh the data
            } else {
                this.showToast(result.message || 'Failed to save pricing', 'error');
            }

        } catch (error) {
            console.error('❌ Error saving pricing:', error);
            this.showToast('Failed to save pricing: ' + error.message, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async deletePricing(courtId) {
        if (!confirm('Are you sure you want to remove pricing for this court? This action cannot be undone.')) {
            return;
        }

        try {
            console.log('🗑️ Deleting pricing for court:', courtId);

            const response = await fetch(`/admin/api/pricing/${courtId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            console.log('📄 Delete response:', result);

            if (result.success) {
                this.showToast(result.message || 'Pricing removed successfully!', 'success');
                this.loadPricingData(); // Refresh the data
            } else {
                this.showToast(result.message || 'Failed to remove pricing', 'error');
            }

        } catch (error) {
            console.error('❌ Error deleting pricing:', error);
            this.showToast('Failed to remove pricing: ' + error.message, 'error');
        }
    }

    async editPricing(courtId) {
        try {
            console.log('✏️ Loading pricing for edit:', courtId);
            
            // Find the pricing data from current loaded data
            const response = await fetch(`/admin/api/pricing/${courtId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load pricing data');
            }

            const result = await response.json();
            
            if (result.success && result.pricing) {
                this.populateEditForm(result.pricing);
                this.showEditPricingModal(courtId);
            } else {
                this.showToast('Failed to load pricing data', 'error');
            }

        } catch (error) {
            console.error('❌ Error loading pricing for edit:', error);
            this.showToast('Failed to load pricing data', 'error');
        }
    }

    populateEditForm(pricing) {
        document.getElementById('courtId').value = pricing.court_id;
        document.getElementById('courtName').value = pricing.court_name;
        document.getElementById('sport').value = pricing.sport;
        document.getElementById('basePrice').value = pricing.base_price;
        document.getElementById('peakPrice').value = pricing.peak_price || '';
        document.getElementById('offPeakPrice').value = pricing.off_peak_price || '';
        document.getElementById('weekendPrice').value = pricing.weekend_price || '';
    }

    showAddPricingModal() {
        this.isEditing = false;
        this.editingCourtId = null;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Add New Pricing';
        document.querySelector('.btn-text').textContent = 'Add Pricing';
        
        // Reset form
        document.getElementById('pricingForm').reset();
        document.getElementById('courtId').removeAttribute('readonly');
        document.getElementById('courtId').style.pointerEvents = 'auto';
        document.getElementById('courtId').style.backgroundColor = '';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('pricingModal'));
        modal.show();
    }

    showEditPricingModal(courtId) {
        this.isEditing = true;
        this.editingCourtId = courtId;
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Pricing';
        document.querySelector('.btn-text').textContent = 'Update Pricing';
        
        // Make court selection readonly during edit
        document.getElementById('courtId').setAttribute('readonly', true);
        document.getElementById('courtId').style.pointerEvents = 'none';
        document.getElementById('courtId').style.backgroundColor = '#e9ecef';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('pricingModal'));
        modal.show();
    }

    closePricingModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('pricingModal'));
        if (modal) {
            modal.hide();
        }
    }

    setLoadingState(loading) {
        const button = document.querySelector('#pricingModal .btn-primary');
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
        
        // Set message and styling
        toastMessage.textContent = message;
        toast.className = `toast ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info'} text-white`;
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Global functions for onclick handlers
let pricingManager;

function showAddPricingModal() {
    pricingManager.showAddPricingModal();
}

function savePricing() {
    pricingManager.savePricing();
}

function editPricing(courtId) {
    pricingManager.editPricing(courtId);
}

function deletePricing(courtId) {
    pricingManager.deletePricing(courtId);
}

function showTimingConfigModal() {
    const modal = new bootstrap.Modal(document.getElementById('timingConfigModal'));
    modal.show();
}

function saveTimingConfig() {
    // For now, just show a success message since this is a UI demonstration
    // In a real implementation, this would save to a configuration table
    
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = 'Timing configuration updated successfully! (This is a demo feature)';
    toast.className = 'toast bg-success text-white';
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('timingConfigModal'));
    if (modal) {
        modal.hide();
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    pricingManager = new PricingManager();
});
