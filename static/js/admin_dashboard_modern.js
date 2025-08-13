/**
 * Modern Admin Dashboard JavaScript
 * Professional dashboard with real-time updates and charts
 */

class ModernAdminDashboard extends BaseComponent {
    constructor() {
        super('refresh-dashboard', {
            refreshInterval: 30000, // 30 seconds
            chartUpdateInterval: 60000, // 1 minute
        });
        
        this.chart = null;
        this.refreshTimer = null;
        this.statsData = {};
        this.isRefreshing = false;
    }

    init() {
        this.setupRealTimeClock();
        this.bindEvents();
        this.initializeChart();
        this.startAutoRefresh();
        this.loadInitialData();
        console.log('✅ Modern Admin Dashboard initialized');
    }

    setupRealTimeClock() {
        const updateTime = () => {
            const now = new Date();
            const timeDisplay = document.getElementById('time-display');
            const lastUpdateTime = document.getElementById('last-update-time');
            
            if (timeDisplay) {
                timeDisplay.textContent = now.toLocaleTimeString('en-US', {
                    hour12: true,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
            
            if (lastUpdateTime) {
                lastUpdateTime.textContent = now.toLocaleString();
            }
        };

        updateTime();
        setInterval(updateTime, 1000);
    }

    bindEvents() {
        // Refresh button
        this.addEventListener('refresh-dashboard', 'click', () => this.refreshDashboard());

        // Management cards hover effects
        this.setupCardAnimations();

        // Quick action buttons
        this.setupQuickActions();

        // Chart period selector
        this.addEventListener('chart-period-btn', 'click', () => this.showChartPeriodMenu());
    }

    setupCardAnimations() {
        document.querySelectorAll('.modern-card-action').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px)';
                card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.15)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
        });
    }

    setupQuickActions() {
        document.querySelectorAll('.modern-quick-actions .modern-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-spin');
                    setTimeout(() => {
                        icon.classList.remove('fa-spin');
                    }, 1000);
                }
            });
        });
    }

    async loadInitialData() {
        try {
            await this.loadDashboardStats();
            await this.loadChartData();
        } catch (error) {
            console.warn('Could not load initial dashboard data:', error);
            this.showOfflineMode();
        }
    }

    async loadDashboardStats() {
        try {
            const response = await api.get('/admin/api/dashboard-stats');
            
            if (response.success) {
                this.statsData = response.data;
                this.updateStatCards();
                this.updateTodayStats();
            }
        } catch (error) {
            console.warn('Stats API not available:', error);
            // Use placeholder data for demo
            this.showDemoData();
        }
    }

    updateStatCards() {
        const updates = {
            'total-bookings': this.animateNumber(this.statsData.total_bookings || 0),
            'pending-payment': this.animateNumber(this.statsData.pending_payment || 0),
            'confirmed-bookings': this.animateNumber(this.statsData.confirmed || 0),
            'total-revenue': `PKR ${(this.statsData.revenue || 0).toLocaleString()}`,
            'bookings-growth': `+${this.statsData.growth_bookings || 0}%`,
            'confirmed-growth': `+${this.statsData.growth_confirmed || 0}%`,
            'revenue-growth': `+${this.statsData.growth_revenue || 0}%`
        };

        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (typeof value === 'number') {
                    this.animateNumberChange(element, parseInt(element.textContent) || 0, value);
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    updateTodayStats() {
        const todayUpdates = {
            'today-bookings': this.statsData.today_bookings || 0,
            'today-revenue': `PKR ${(this.statsData.today_revenue || 0).toLocaleString()}`,
            'today-hours': `${this.statsData.today_hours || 0}h`,
            'today-utilization': `${this.statsData.today_utilization || 0}%`
        };

        Object.entries(todayUpdates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.style.opacity = '0';
                element.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    element.textContent = value;
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                    element.style.transition = 'all 0.5s ease';
                }, 100);
            }
        });
    }

    animateNumberChange(element, from, to) {
        const duration = 1000;
        const steps = 30;
        const stepValue = (to - from) / steps;
        let current = from;
        let step = 0;

        const animate = () => {
            if (step < steps) {
                current += stepValue;
                element.textContent = Math.round(current);
                step++;
                requestAnimationFrame(animate);
            } else {
                element.textContent = to;
            }
        };

        animate();
    }

    showDemoData() {
        // Demo data for when API is not available
        const demoData = {
            total_bookings: 1247,
            pending_payment: 23,
            confirmed: 1156,
            revenue: 2840000,
            growth_bookings: 12.5,
            growth_confirmed: 8.3,
            growth_revenue: 15.7,
            today_bookings: 18,
            today_revenue: 45000,
            today_hours: 36,
            today_utilization: 75
        };

        this.statsData = demoData;
        this.updateStatCards();
        this.updateTodayStats();

        toast.info('Dashboard loaded with sample data', 3000);
    }

    initializeChart() {
        const ctx = document.getElementById('bookings-chart');
        if (!ctx) return;

        // Sample data - replace with real data from API
        const chartData = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Bookings',
                data: [12, 19, 15, 25, 22, 30, 28],
                borderColor: '#2e7d50',
                backgroundColor: 'rgba(46, 125, 80, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2e7d50',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }, {
                label: 'Revenue (K)',
                data: [30, 45, 35, 60, 55, 75, 70],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        };

        const config = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 1) {
                                    return `Revenue: PKR ${context.parsed.y}K`;
                                }
                                return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        };

        this.chart = new Chart(ctx, config);
    }

    async loadChartData(period = '7d') {
        try {
            const response = await api.get(`/admin/api/chart-data?period=${period}`);
            
            if (response.success && this.chart) {
                this.chart.data = response.chartData;
                this.chart.update('active');
            }
        } catch (error) {
            console.warn('Chart data not available, using sample data');
        }
    }

    showChartPeriodMenu() {
        const periods = [
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 3 Months' },
            { value: '1y', label: 'Last Year' }
        ];

        // Simple implementation - in a real app, you'd use a proper dropdown
        const currentPeriod = prompt('Select period:\n' + 
            periods.map((p, i) => `${i + 1}. ${p.label}`).join('\n'));
        
        const selectedIndex = parseInt(currentPeriod) - 1;
        if (selectedIndex >= 0 && selectedIndex < periods.length) {
            const period = periods[selectedIndex];
            document.getElementById('chart-period-btn').innerHTML = 
                `${period.label} <i class="fas fa-chevron-down"></i>`;
            this.loadChartData(period.value);
        }
    }

    async refreshDashboard() {
        if (this.isRefreshing) return;

        this.isRefreshing = true;
        const refreshBtn = document.getElementById('refresh-dashboard');
        const icon = refreshBtn.querySelector('i');

        // Animate refresh button
        icon.classList.add('fa-spin');
        
        try {
            const loadingToast = toast.loading('Refreshing dashboard...');
            
            await Promise.all([
                this.loadDashboardStats(),
                this.loadChartData()
            ]);
            
            toast.remove(loadingToast);
            toast.success('Dashboard updated successfully!');
            
        } catch (error) {
            toast.error('Failed to refresh dashboard');
            console.error('Refresh error:', error);
        } finally {
            this.isRefreshing = false;
            setTimeout(() => {
                icon.classList.remove('fa-spin');
            }, 1000);
        }
    }

    startAutoRefresh() {
        // Auto-refresh stats every 30 seconds
        this.refreshTimer = setInterval(() => {
            if (!document.hidden) { // Only refresh when tab is active
                this.loadDashboardStats();
            }
        }, this.options.refreshInterval);

        // Update chart every minute
        setInterval(() => {
            if (!document.hidden) {
                this.loadChartData();
            }
        }, this.options.chartUpdateInterval);
    }

    showOfflineMode() {
        toast.warning('Some features may be limited - check your connection', 5000);
        
        // Show demo data
        this.showDemoData();
        
        // Add offline indicator
        const header = document.querySelector('.modern-header-actions');
        if (header) {
            const offlineIndicator = document.createElement('span');
            offlineIndicator.className = 'modern-offline-indicator';
            offlineIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
            offlineIndicator.style.cssText = `
                background: #f39c12;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
                margin-right: 1rem;
            `;
            header.insertBefore(offlineIndicator, header.firstChild);
        }
    }

    animateNumber(target) {
        return target; // For now, just return the target. Could add animation later.
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        super.destroy();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Modern Admin Dashboard...');
    window.modernAdminDashboard = new ModernAdminDashboard();
});

// Handle visibility change to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
    if (window.modernAdminDashboard) {
        if (document.hidden) {
            console.log('📴 Dashboard paused (tab hidden)');
        } else {
            console.log('📱 Dashboard resumed (tab active)');
            // Refresh immediately when tab becomes active
            window.modernAdminDashboard.loadDashboardStats();
        }
    }
});

console.log('✅ Modern Admin Dashboard script loaded');