class NotificationManager {
    constructor() {
        console.log('Initializing NotificationManager');
        this.socket = io();
        
        // Load notifications from localStorage
        this.notifications = this.loadNotifications();
        
        this.rightSidebar = document.querySelector('.right-sidebar');
        this.alertsContainer = document.querySelector('.alerts-container');
        this.notificationBadge = document.querySelector('.notification-badge');
        this.showNotificationsBtn = document.getElementById('showNotifications');
        
        this.lastStatus = {
            value: '',
            timestamp: 0
        };
        this.debounceDelay = 300;
        this.activeTab = 'recent';
        
        this.initializeSocketListeners();
        this.initializeUIListeners();
        this.initializeTabs();
        
        // Load existing notifications to UI
        this.loadExistingNotifications();
    }

    loadNotifications() {
        try {
            const saved = localStorage.getItem('notifications');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Convert saved date strings back to Date objects
                parsed.recent.forEach(n => n.timestamp = new Date(n.timestamp));
                parsed.history.forEach(n => n.timestamp = new Date(n.timestamp));
                return parsed;
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
        return { recent: [], history: [] };
    }

    saveNotifications() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Error saving notifications:', error);
        }
    }

    loadExistingNotifications() {
        // Load recent notifications
        this.notifications.recent.forEach(notification => {
            this.addNotificationToUI(notification, 'recent', false); // false = no auto-remove
        });

        // Load history notifications
        this.notifications.history.forEach(notification => {
            this.addNotificationToUI(notification, 'history', false);
        });

        this.updateNotificationBadge();
    }

    initializeSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
        });

        // Handler untuk relay status
        this.socket.on('relayStatus', (status) => {
            this.handleStatusUpdate('relay', status);
        });

        // Handler untuk device status
        this.socket.on('deviceStatusUpdate', (status) => {
            // Ignore device status karena sudah ditangani oleh relay status
            return;
        });
    }

    handleStatusUpdate(type, status) {
        const now = Date.now();
        const statusStr = typeof status === 'object' ? JSON.stringify(status) : String(status);

        // Cek duplikasi
        if (statusStr === this.lastStatus.value && 
            now - this.lastStatus.timestamp < this.debounceDelay) {
            console.log(`Skipping duplicate ${type} status:`, status);
            return;
        }

        // Update last status
        this.lastStatus = {
            value: statusStr,
            timestamp: now
        };

        console.log(`Processing ${type} status:`, status);
        
        // Buat notifikasi
        const title = type === 'relay' ? 'Relay Update' : 'Device Update';
        const message = type === 'relay' 
            ? `Relay status changed to: ${status}`
            : `Device status: ${JSON.stringify(status)}`;

        this.createNotification(title, message, 'info');
    }

    initializeUIListeners() {
        if (this.showNotificationsBtn) {
            this.showNotificationsBtn.addEventListener('click', () => {
                console.log('Toggle notifications clicked');
                this.rightSidebar.classList.toggle('open');
            });
        }
    }

    initializeTabs() {
        // Update HTML structure with improved mobile layout
        const header = document.querySelector('.notifications-header');
        header.innerHTML = `
            <div class="notifications-title-area">
                <h2>Notifications</h2>
                <div class="notifications-actions">
                    <button class="btn-icon clear-all" onclick="notificationManager.clearAllNotifications()">
                        <span class="material-icons">clear_all</span>
                    </button>
                    <button class="btn-icon close-notifications">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            </div>
            <div class="notifications-tabs">
                <button class="tab-button active" data-tab="recent">
                    Recent
                </button>
                <button class="tab-button" data-tab="history">
                    History
                </button>
            </div>
        `;

        // Add close button handler
        const closeBtn = header.querySelector('.close-notifications');
        closeBtn.addEventListener('click', () => {
            this.rightSidebar.classList.remove('open');
        });

        // Add tab click handlers
        const tabs = header.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Create containers for each tab
        this.alertsContainer.innerHTML = `
            <div id="recent-notifications" class="tab-content active"></div>
            <div id="history-notifications" class="tab-content"></div>
        `;
    }

    switchTab(tabName) {
        // Update active tab
        this.activeTab = tabName;
        
        // Update tab buttons
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-notifications`);
        });
    }

    createNotification(title, message, severity = 'info') {
        const notification = {
            id: Date.now(),
            title,
            message,
            severity,
            timestamp: new Date(),
            type: 'device'
        };

        // Remove existing notification with same message
        const existingNotifications = document.querySelectorAll('.alert');
        existingNotifications.forEach(notif => {
            if (notif.querySelector('p').textContent === message) {
                notif.remove();
            }
        });

        // Update notifications array
        this.notifications.recent = this.notifications.recent.filter(n => n.message !== message);
        this.notifications.recent.unshift(notification);
        
        // Move to history if more than 10
        if (this.notifications.recent.length > 10) {
            const oldNotification = this.notifications.recent.pop();
            this.notifications.history.unshift(oldNotification);
        }

        // Save to localStorage
        this.saveNotifications();

        this.updateNotificationBadge();
        this.addNotificationToUI(notification, 'recent');
    }

    addNotificationToUI(notification, tab = 'recent', autoRemove = true) {
        const container = document.getElementById(`${tab}-notifications`);
        if (!container) return;

        const element = document.createElement('div');
        element.className = `alert alert-${notification.severity} animate-in`;
        element.innerHTML = `
            <div class="alert-header">
                <span class="material-icons">
                    ${notification.type === 'device' ? 'devices' : 'notifications'}
                </span>
                <h4>${notification.title}</h4>
                <span class="alert-time">
                    ${notification.timestamp.toLocaleTimeString()}
                </span>
            </div>
            <p>${notification.message}</p>
        `;

        container.insertBefore(element, container.firstChild);

        // Auto remove after 5 seconds only for recent notifications and if autoRemove is true
        if (tab === 'recent' && autoRemove) {
            setTimeout(() => {
                element.classList.add('animate-out');
                setTimeout(() => {
                    if (element.parentNode === container) {
                        element.remove();
                        // Move to history
                        const notificationIndex = this.notifications.recent.findIndex(n => n.id === notification.id);
                        if (notificationIndex > -1) {
                            const [movedNotification] = this.notifications.recent.splice(notificationIndex, 1);
                            this.notifications.history.unshift(movedNotification);
                            this.addNotificationToUI(movedNotification, 'history', false);
                            this.saveNotifications(); // Save after moving to history
                        }
                        this.updateNotificationBadge();
                    }
                }, 300);
            }, 5000);
        }
    }

    updateNotificationBadge() {
        const count = this.notifications.recent.length;
        this.notificationBadge.textContent = count;
        this.notificationBadge.style.display = count > 0 ? 'block' : 'none';
    }

    clearAllNotifications() {
        // Clear all notifications from UI
        const recentContainer = document.getElementById('recent-notifications');
        const historyContainer = document.getElementById('history-notifications');
        
        if (recentContainer) recentContainer.innerHTML = '';
        if (historyContainer) historyContainer.innerHTML = '';

        // Clear notifications arrays
        this.notifications.recent = [];
        this.notifications.history = [];

        // Update badge
        this.updateNotificationBadge();

        // Save empty state to localStorage
        this.saveNotifications();
    }
}

// Create instance immediately
console.log('Creating NotificationManager instance');
window.notificationManager = new NotificationManager(); 