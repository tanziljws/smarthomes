class SettingsManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.settings = this.loadSettings();
        this.initializeUI();
    }

    loadSettings() {
        const defaultSettings = {
            temperature: {
                unit: 'C',
                thresholds: {
                    cold: 18,
                    hot: 30
                },
                alerts: {
                    enabled: true,
                    critical: 35
                }
            },
            humidity: {
                thresholds: {
                    dry: 30,
                    humid: 70
                },
                alerts: {
                    enabled: true,
                    critical: 85
                }
            },
            display: {
                theme: 'dark',
                chartUpdateInterval: 1000,
                dataRetention: 24 // hours
            }
        };

        const savedSettings = localStorage.getItem('dashboardSettings');
        return savedSettings ? {...defaultSettings, ...JSON.parse(savedSettings)} : defaultSettings;
    }

    saveSettings() {
        localStorage.setItem('dashboardSettings', JSON.stringify(this.settings));
        this.dashboard.applySettings(this.settings);
    }

    initializeUI() {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'settings-panel';
        settingsPanel.innerHTML = this.getSettingsPanelHTML();
        document.body.appendChild(settingsPanel);

        this.bindEvents(settingsPanel);
    }

    getSettingsPanelHTML() {
        return `
            <div class="settings-content">
                <h2>Dashboard Settings</h2>
                
                <section class="settings-section">
                    <h3>Temperature</h3>
                    <div class="setting-group">
                        <label>Unit</label>
                        <select id="tempUnit">
                            <option value="C" ${this.settings.temperature.unit === 'C' ? 'selected' : ''}>Celsius</option>
                            <option value="F" ${this.settings.temperature.unit === 'F' ? 'selected' : ''}>Fahrenheit</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>Cold Threshold</label>
                        <input type="number" id="tempCold" value="${this.settings.temperature.thresholds.cold}">
                    </div>
                    <div class="setting-group">
                        <label>Hot Threshold</label>
                        <input type="number" id="tempHot" value="${this.settings.temperature.thresholds.hot}">
                    </div>
                </section>

                <section class="settings-section">
                    <h3>Humidity</h3>
                    <div class="setting-group">
                        <label>Dry Threshold (%)</label>
                        <input type="number" id="humDry" value="${this.settings.humidity.thresholds.dry}">
                    </div>
                    <div class="setting-group">
                        <label>Humid Threshold (%)</label>
                        <input type="number" id="humHumid" value="${this.settings.humidity.thresholds.humid}">
                    </div>
                </section>

                <section class="settings-section">
                    <h3>Display</h3>
                    <div class="setting-group">
                        <label>Theme</label>
                        <select id="theme">
                            <option value="dark" ${this.settings.display.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${this.settings.display.theme === 'light' ? 'selected' : ''}>Light</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>Update Interval (ms)</label>
                        <input type="number" id="updateInterval" value="${this.settings.display.chartUpdateInterval}">
                    </div>
                </section>

                <div class="settings-actions">
                    <button class="btn btn-primary" onclick="settings.saveSettings()">Save</button>
                    <button class="btn" onclick="settings.resetDefaults()">Reset to Defaults</button>
                </div>
            </div>
        `;
    }

    bindEvents(panel) {
        // Implement event binding for all settings inputs
        panel.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => this.updateSetting(input));
        });
    }

    updateSetting(input) {
        const path = input.id.split('.');
        let current = this.settings;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = input.type === 'number' ? Number(input.value) : input.value;
    }

    resetDefaults() {
        localStorage.removeItem('dashboardSettings');
        this.settings = this.loadSettings();
        this.initializeUI();
        this.dashboard.applySettings(this.settings);
    }
} 