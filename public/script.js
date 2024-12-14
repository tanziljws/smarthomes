class GaugeManager {
    constructor(configs) {
        this.configs = configs;
        this.gauges = new Map();
        this.initializeGauges();
    }

    initializeGauges() {
        document.querySelectorAll('.metric-card').forEach(card => {
            const type = card.dataset.gaugeType;
            if (this.configs[type]) {
                this.gauges.set(type, new Gauge(card, this.configs[type]));
            }
        });
    }

    updateValue(type, value) {
        const gauge = this.gauges.get(type);
        if (gauge) {
            gauge.updateValue(value);
        }
    }
}

class Gauge {
    constructor(element, config) {
        this.element = element;
        this.config = config;
        this.elements = {
            gauge: element.querySelector('.gauge'),
            pointer: element.querySelector('.gauge-pointer'),
            value: element.querySelector('.gauge-value'),
            status: element.querySelector('.status-indicator')
        };
        this.initializeGauge();
    }

    initializeGauge() {
        this.setupScale();
        this.setupRangeIndicators();
    }

    setupScale() {
        const scaleElement = this.element.querySelector('.gauge-scale');
        scaleElement.innerHTML = this.config.scaleSteps
            .map(value => `<span>${value}</span>`)
            .join('');
    }

    setupRangeIndicators() {
        const indicatorsElement = this.element.querySelector('.range-indicators');
        indicatorsElement.innerHTML = this.config.thresholds
            .map(threshold => `
                <div class="range-indicator ${threshold.class}">
                    ${threshold.status}: ${this.formatThresholdValue(threshold)}
                </div>
            `).join('');
    }

    formatThresholdValue(threshold) {
        if (threshold.max === this.config.max) {
            return `>${this.config.thresholds[this.config.thresholds.length - 2].max}${this.config.unit}`;
        }
        return `<${threshold.max}${this.config.unit}`;
    }

    updateValue(value) {
        const validValue = Math.min(Math.max(value, this.config.min), this.config.max);
        this.updateDisplay(validValue);
        this.updatePointer(validValue);
        this.updateStatus(validValue);
    }

    updateDisplay(value) {
        this.elements.value.textContent = `${value.toFixed(this.config.precision)}${this.config.unit}`;
    }

    updatePointer(value) {
        const percentage = (value - this.config.min) / (this.config.max - this.config.min);
        const baseAngle = 360 - (this.config.startAngle + (percentage * (this.config.endAngle - this.config.startAngle)));
        const adjustedAngle = baseAngle - 90;
        this.elements.pointer.style.transform = `rotate(${adjustedAngle}deg)`;
    }

    updateStatus(value) {
        const threshold = this.getThresholdForValue(value);
        if (threshold) {
            this.elements.status.textContent = threshold.status;
            this.elements.gauge.className = `gauge ${threshold.class}`;
            
            // Update colors
            this.elements.pointer.style.color = threshold.color;
            this.elements.status.style.color = threshold.color;
        }
    }

    getThresholdForValue(value) {
        return this.config.thresholds.find(t => value <= t.max) || 
               this.config.thresholds[this.config.thresholds.length - 1];
    }

    getInterpolatedStatus(value) {
        const thresholds = this.config.thresholds;
        for (let i = 0; i < thresholds.length; i++) {
            if (value <= thresholds[i].max) {
                const isNearNext = i < thresholds.length - 1 && 
                    value > thresholds[i].max - (thresholds[i].max - (thresholds[i-1]?.max || 0)) * 0.15;
                
                if (isNearNext) {
                    return `Mendekati ${thresholds[i+1].status}`;
                }
                return thresholds[i].status;
            }
        }
        return thresholds[thresholds.length - 1].status;
    }
}

class DashboardManager {
    constructor() {
        this.gaugeManager = new GaugeManager(gaugeConfigs);
        this.historicalData = new HistoricalDataManager();
        this.settings = new SettingsManager(this);
        this.notifications = [];
        this.initializeSocket();
        this.initializeUI();
    }

    initializeSocket() {
        this.socket = io();
        this.socket.on('dhtData', (data) => this.handleDHTData(data));
    }

    initializeUI() {
        // Theme toggle
        const themeToggle = document.getElementById('toggleTheme');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Notifications
        const notifButton = document.getElementById('showNotifications');
        if (notifButton) {
            notifButton.addEventListener('click', () => this.toggleNotifications());
        }
    }

    handleDHTData(data) {
        try {
            // Update gauges
            if (data.temperature !== undefined) {
                this.gaugeManager.updateValue('temperature', data.temperature);
                this.checkThresholds('temperature', data.temperature);
            }
            if (data.humidity !== undefined) {
                this.gaugeManager.updateValue('humidity', data.humidity);
                this.checkThresholds('humidity', data.humidity);
            }

            // Update historical data
            if (this.historicalData) {
                this.historicalData.updateData('temperature', data.temperature);
                this.historicalData.updateData('humidity', data.humidity);
            }
        } catch (error) {
            console.error('Error handling DHT data:', error);
        }
    }

    checkThresholds(type, value) {
        const config = this.gaugeManager.configs[type];
        if (!config || !config.thresholds) return;

        const thresholds = config.thresholds;
        for (const threshold of thresholds) {
            if (value > threshold.max && threshold.alert) {
                this.createAlert({
                    type: 'warning',
                    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Alert`,
                    message: `${type} has exceeded ${threshold.max}${config.unit}`,
                    severity: threshold.severity || 'moderate',
                    timestamp: new Date(),
                    value: value,
                    threshold: threshold.max
                });
            }
        }
    }

    createAlert(alertData) {
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${alertData.severity} animate-in`;
        alertElement.innerHTML = `
            <div class="alert-header">
                <h4>${alertData.title}</h4>
                <span class="alert-timestamp">${alertData.timestamp.toLocaleTimeString()}</span>
            </div>
            <p class="alert-message">${alertData.message}</p>
            <div class="alert-actions">
                <button class="btn btn-small" onclick="dashboard.dismissAlert(this)">
                    Dismiss
                </button>
                <button class="btn btn-small btn-info" onclick="dashboard.showAlertDetails('${JSON.stringify(alertData).replace(/'/g, "\\'")}')">
                    Details
                </button>
            </div>
        `;

        const alertsContainer = document.querySelector('.alerts-container');
        if (alertsContainer) {
            alertsContainer.appendChild(alertElement);
            if (alertData.severity !== 'critical') {
                setTimeout(() => this.dismissAlert(alertElement), 5000);
            }
        }

        this.notifications.push(alertData);
        this.updateNotificationBadge();
    }

    dismissAlert(element) {
        const alertElement = element.closest('.alert');
        if (alertElement) {
            alertElement.classList.add('animate-out');
            setTimeout(() => alertElement.remove(), 300);
        }
    }

    showAlertDetails(alertDataStr) {
        try {
            const alertData = JSON.parse(alertDataStr);
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Alert Details</h3>
                    <div class="alert-details">
                        <p><strong>Type:</strong> ${alertData.type}</p>
                        <p><strong>Value:</strong> ${alertData.value}</p>
                        <p><strong>Threshold:</strong> ${alertData.threshold}</p>
                        <p><strong>Time:</strong> ${new Date(alertData.timestamp).toLocaleString()}</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Error showing alert details:', error);
        }
    }

    toggleTheme() {
        document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    }

    toggleNotifications() {
        const sidebar = document.querySelector('.right-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = this.notifications.length;
            badge.style.display = this.notifications.length > 0 ? 'block' : 'none';
        }
    }

    clearAllNotifications() {
        const alertsContainer = document.querySelector('.alerts-container');
        if (alertsContainer) {
            alertsContainer.innerHTML = '';
        }
        this.notifications = [];
        this.updateNotificationBadge();
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
    window.historicalData = dashboard.historicalData;
});

function handleRelayToggle(relayId, status) {
    // Existing code...
    
    // Emit to server
    socket.emit('controlRelay', { relay: relayId, status: status });
    
    // Create local notification
    if (window.notificationManager) {
        window.notificationManager.createNotification(
            'Relay Update',
            `Relay ${relayId} turned ${status}`,
            'info'
        );
    }
}
