let clapFeatureEnabled = false;

async function loadClapStatus() {
    try {
        const response = await fetch('/devices/clap-settings');
        const data = await response.json();
        
        // Update local state
        clapFeatureEnabled = Boolean(data.enabled);
        
        // Update UI
        updateClapControlUI(clapFeatureEnabled);
        
    } catch (error) {
        console.error('Error loading clap status:', error);
        updateClapControlUI(false);
    }
}

// Fungsi untuk menampilkan modal
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Fungsi untuk menyembunyikan modal
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Function untuk toggle clap feature
async function toggleClapFeature() {
    try {
        if (!clapFeatureEnabled) {
            showModal('confirmClapModal');
        } else {
            const response = await fetch('/devices/clap-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enabled: false
                })
            });

            if (!response.ok) {
                throw new Error('Failed to disable clap control');
            }

            clapFeatureEnabled = false;
            localStorage.setItem('clapControlStatus', 'false');
            updateClapControlUI(false);
            showSuccess('Clap control disabled');
        }
    } catch (error) {
        console.error('Error toggling clap control:', error);
        showError('Failed to toggle clap control');
    }
}

async function confirmEnableClap() {
    hideModal('confirmClapModal');
    showModal('clapSettingsModal');
}

// Success and error message functions
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Functions untuk device management
async function loadDevices() {
    try {
        const response = await fetch('/devices');
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load devices');
        }
        const devices = await response.json();
        console.log('Loaded devices:', devices);
        updateDevicesUI(devices);
    } catch (error) {
        console.error('Error loading devices:', error);
        showError(error.message);
    }
}

async function loadGroups() {
    try {
        const response = await fetch('/devices/groups');
        const groups = await response.json();
        updateGroupSelect(groups);
    } catch (error) {
        console.error('Error loading groups:', error);
        showError('Failed to load groups');
    }
}

async function loadSchedules() {
    try {
        const response = await fetch('/devices/schedules');
        const schedules = await response.json();
        console.log('Schedules loaded:', schedules);
        const schedulesList = document.querySelector('.schedules-list');
        schedulesList.innerHTML = '';
        schedules.forEach(schedule => {
            const scheduleItem = renderScheduleItem(schedule);
            schedulesList.appendChild(scheduleItem);
        });
    } catch (error) {
        console.error('Error loading schedules:', error);
        showError('Failed to load schedules');
    }
}

// Device Control Functions
async function toggleDevice(relayNumber, newStatus) {
    try {
        const relay = parseInt(relayNumber);
        if (isNaN(relay) || relay < 1 || relay > 4) {
            throw new Error(`Invalid relay number: ${relayNumber}. Must be between 1 and 4`);
        }

        // Format command untuk MQTT
        const command = `RELAY${relay}_${newStatus}`;
        console.log('Sending MQTT command:', command);

        // Kirim ke endpoint control
        const controlResponse = await fetch('/control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: 'smarthome/control',
                message: command
            })
        });

        if (!controlResponse.ok) {
            const errorData = await controlResponse.json();
            throw new Error(errorData.error || 'Failed to control device');
        }

        // Update status di database
        const updateResponse = await fetch('/devices/update-device-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                relay: relay,
                status: newStatus
            })
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update device status');
        }

        console.log(`Successfully toggled device ${relay} to ${newStatus}`);
    } catch (error) {
        console.error('Error toggling device:', error);
        showError(error.message);
        const toggle = document.querySelector(`[data-relay="${relayNumber}"] input[type="checkbox"]`);
        if (toggle) {
            toggle.checked = newStatus !== 'ON';
        }
    }
}

// Event listener utama
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadDevices();
    loadGroups();
    loadSchedules();
    loadClapStatus();

    // Event Listeners untuk buttons
    document.querySelector('.btn-add-group')?.addEventListener('click', () => {
        showModal('addGroupModal');
    });

    document.querySelector('.btn-add-device')?.addEventListener('click', () => {
        showModal('addDeviceModal');
    });

    document.querySelector('.btn-add-schedule')?.addEventListener('click', () => {
        showModal('addScheduleModal');
        loadDevicesForSchedule();
    });

    // Form handlers
    const clapSettingsForm = document.getElementById('clapSettingsForm');
    if (clapSettingsForm) {
        clapSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const enabled = document.getElementById('clapEnabled')?.checked ?? true;
                const relaySelect = document.getElementById('clapRelay');
                const threshold = document.getElementById('soundThreshold');

                const response = await fetch('/devices/clap-settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        enabled: enabled,
                        deviceId: parseInt(relaySelect.value),
                        threshold: parseInt(threshold.value)
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    hideModal('clapSettingsModal');
                    clapFeatureEnabled = enabled;
                    updateClapControlUI(enabled);
                    showSuccess('Clap control settings updated');
                } else {
                    throw new Error(data.error || 'Failed to update settings');
                }
            } catch (error) {
                console.error('Error updating clap settings:', error);
                showError(error.message || 'Failed to update clap settings');
            }
        });
    }

    // Add other form handlers here...
    // (Paste kembali semua event listener form yang ada sebelumnya)
});

// Paste kembali semua fungsi lain yang ada sebelumnya di sini
// (seperti updateDevicesUI, renderDevices, dll)

// Tambahkan fungsi updateDevicesUI
function updateDevicesUI(devices) {
    const deviceGroups = document.querySelector('.device-groups');
    deviceGroups.innerHTML = ''; // Clear existing content

    // Get unique groups from devices
    const groups = new Map();
    devices.forEach(device => {
        if (device.group_id && !groups.has(device.group_id)) {
            groups.set(device.group_id, {
                id: device.group_id,
                name: device.group_name,
                devices: []
            });
        }
    });

    // Add devices to their groups
    devices.forEach(device => {
        if (device.group_id) {
            groups.get(device.group_id).devices.push(device);
        }
    });

    // Render ungrouped devices first
    const ungroupedDevices = devices.filter(d => !d.group_id);
    if (ungroupedDevices.length > 0) {
        const html = `
            <div class="device-group">
                <div class="group-header">
                    <h3>Ungrouped Devices</h3>
                </div>
                <div class="group-devices">
                    ${renderDevices(ungroupedDevices)}
                </div>
            </div>
        `;
        deviceGroups.insertAdjacentHTML('beforeend', html);
    }

    // Render grouped devices
    groups.forEach(group => {
        const html = `
            <div class="device-group" data-group-id="${group.id}">
                <div class="group-header">
                    <h3>${group.name}</h3>
                </div>
                <div class="group-devices">
                    ${renderDevices(group.devices)}
                </div>
            </div>
        `;
        deviceGroups.insertAdjacentHTML('beforeend', html);
    });
}

// Tambahkan fungsi updateGroupSelect
function updateGroupSelect(groups) {
    const selects = document.querySelectorAll('#deviceGroup, #moveToGroup');
    selects.forEach(select => {
        if (select) {
            select.innerHTML = `
                <option value="">No Group</option>
                ${groups.map(group => `
                    <option value="${group.id}">${group.name}</option>
                `).join('')}
            `;
        }
    });
}

// Tambahkan fungsi renderScheduleItem
function renderScheduleItem(schedule) {
    const scheduleElement = document.createElement('div');
    scheduleElement.className = 'schedule-item';
    scheduleElement.dataset.id = schedule.id;

    scheduleElement.innerHTML = `
        <div class="schedule-info">
            <span class="device-name">${schedule.device_name}</span>
            <span class="schedule-time">${schedule.time}</span>
            <span class="schedule-days">${formatDays(schedule.days)}</span>
            <span class="schedule-action ${schedule.action.toLowerCase()}">${schedule.action}</span>
        </div>
        <div class="schedule-controls">
            <button class="btn-edit" onclick="editSchedule(${schedule.id})">
                <span class="material-icons">edit</span>
            </button>
            <button class="btn-delete" onclick="deleteSchedule(${schedule.id})">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `;

    return scheduleElement;
}

// Tambahkan fungsi renderDevices
function renderDevices(devices) {
    return devices.map(device => `
        <div class="device-item" data-device-id="${device.id}" data-relay="${device.relay_number}">
            <span class="device-name">${device.name}</span>
            <div class="device-controls">
                <label class="switch">
                    <input type="checkbox" 
                        ${device.status === 'ON' ? 'checked' : ''}
                        onchange="toggleDevice(${device.relay_number}, this.checked ? 'ON' : 'OFF')"
                        data-relay="${device.relay_number}">
                    <span class="slider"></span>
                </label>
                <button class="btn-edit" onclick="editDevice(${device.id})">
                    <span class="material-icons">edit</span>
                </button>
                <button class="btn-delete" onclick="deleteDevice(${device.id})">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Tambahkan fungsi formatDays
function formatDays(days) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.split(',').map(day => dayNames[parseInt(day)]).join(', ');
}

async function loadDevicesForSchedule() {
    try {
        const response = await fetch('/devices');
        const devices = await response.json();
        const select = document.getElementById('scheduleDevice');
        
        if (select) {
            select.innerHTML = devices.map(device => `
                <option value="${device.id}">${device.name}</option>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading devices for schedule:', error);
        showError('Failed to load devices');
    }
}

async function loadDevicesForEditSchedule() {
    try {
        const response = await fetch('/devices');
        const devices = await response.json();
        const select = document.getElementById('editScheduleDevice');
        
        if (select) {
            select.innerHTML = `
                <option value="">Select Device</option>
                ${devices.map(device => `
                    <option value="${device.id}">${device.name}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading devices for schedule:', error);
        showError('Failed to load devices');
    }
}

async function editSchedule(scheduleId) {
    try {
        // Load devices first
        await loadDevicesForEditSchedule();
        
        const response = await fetch(`/devices/schedules/${scheduleId}`);
        const schedule = await response.json();
        
        // Reset form
        document.querySelectorAll('input[name="editDays"]').forEach(cb => cb.checked = false);
        
        // Populate modal with schedule data
        const deviceSelect = document.getElementById('editScheduleDevice');
        if (deviceSelect) {
            deviceSelect.value = schedule.device_id;
        }
        
        document.getElementById('editScheduleTime').value = schedule.time;
        document.getElementById('editScheduleAction').value = schedule.action;
        
        // Set days checkboxes
        const days = schedule.days.split(',');
        days.forEach(day => {
            const checkbox = document.querySelector(`input[name="editDays"][value="${day}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Show edit modal
        showModal('editScheduleModal');
        
        // Set schedule ID for update
        document.getElementById('editScheduleForm').dataset.scheduleId = scheduleId;
    } catch (error) {
        console.error('Error loading schedule:', error);
        showError('Failed to load schedule details');
    }
}

// Add event listener for edit schedule form
document.getElementById('editScheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const scheduleId = e.target.dataset.scheduleId;
    
    // Perbaikan format days
    const selectedDays = Array.from(document.querySelectorAll('input[name="editDays"]:checked'))
                             .map(checkbox => checkbox.value)
                             .join(','); // Gabungkan dengan koma

    const formData = {
        device_id: document.getElementById('editScheduleDevice').value,
        time: document.getElementById('editScheduleTime').value,
        action: document.getElementById('editScheduleAction').value,
        days: selectedDays // Kirim sebagai string yang dipisahkan koma
    };

    try {
        const response = await fetch(`/devices/schedules/${scheduleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update schedule');
        }

        await loadSchedules();
        hideModal('editScheduleModal');
        showSuccess('Schedule updated successfully');
    } catch (error) {
        console.error('Error updating schedule:', error);
        showError(error.message || 'Failed to update schedule');
    }
});

// Di bagian atas file, tambahkan fungsi untuk mengecek URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        clapRelay: params.get('clapRelay'),
        soundThreshold: params.get('soundThreshold')
    };
}

// Fungsi baru untuk update UI clap control
function updateClapControlUI(enabled) {
    const button = document.getElementById('clapToggleBtn');
    const statusText = document.getElementById('clapStatusText');
    const statusBanner = document.querySelector('.status-banner');
    
    if (button && statusText) {
        if (enabled) {
            button.classList.add('active');
            button.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            statusText.textContent = 'CLAP CONTROL: ON';
            if (statusBanner) {
                statusBanner.textContent = 'Clap control enabled';
                statusBanner.style.backgroundColor = '#4CAF50';
            }
        } else {
            button.classList.remove('active');
            button.style.background = 'linear-gradient(135deg, #FF4081, #E91E63)';
            statusText.textContent = 'CLAP CONTROL: OFF';
            if (statusBanner) {
                statusBanner.textContent = 'Clap control disabled';
                statusBanner.style.backgroundColor = '#E91E63';
            }
        }
    }
}

// Tambahkan event listener untuk window load
window.addEventListener('load', () => {
    loadClapStatus();
});

async function editDevice(deviceId) {
    if (!deviceId) {
        console.error('No device ID provided');
        showError('Invalid device ID');
        return;
    }

    try {
        // Fetch device details
        const response = await fetch(`/devices/devices/${deviceId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch device details');
        }
        
        const device = await response.json();
        if (!device) {
            throw new Error('No device data received');
        }

        // Make sure modal elements exist before trying to populate them
        const nameInput = document.getElementById('editDeviceName');
        const relayInput = document.getElementById('editDeviceRelay');
        const groupSelect = document.getElementById('editDeviceGroup');
        const editForm = document.getElementById('editDeviceForm');

        if (!nameInput || !relayInput || !editForm) {
            throw new Error('Required modal elements not found');
        }

        // Populate edit modal with device data
        nameInput.value = device.name || '';
        relayInput.value = device.relay_number || '';
        
        if (groupSelect) {
            groupSelect.value = device.group_id || '';
        }

        // Store device ID in the form for submission
        editForm.dataset.deviceId = deviceId;

        // Show edit modal
        showModal('editDeviceModal');
    } catch (error) {
        console.error('Error loading device details:', error);
        showError(error.message || 'Failed to load device details');
    }
}

document.getElementById('editDeviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const deviceId = form.dataset.deviceId;
    
    if (!deviceId) {
        showError('No device ID found');
        return;
    }

    try {
        const formData = {
            name: document.getElementById('editDeviceName').value,
            relay_number: parseInt(document.getElementById('editDeviceRelay').value),
            group_id: document.getElementById('editDeviceGroup')?.value || null
        };

        const response = await fetch(`/devices/devices/${deviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update device');
        }

        // Refresh devices list
        await loadDevices();
        
        // Hide modal
        hideModal('editDeviceModal');
        
        // Show success message
        showSuccess('Device updated successfully');
    } catch (error) {
        console.error('Error updating device:', error);
        showError(error.message || 'Failed to update device');
    }
});

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar) {
        sidebar.classList.toggle('show');
        
        // Update styles saat sidebar ditampilkan
        if (sidebar.classList.contains('show')) {
            sidebar.style.transform = 'translateX(0)';
            sidebar.style.visibility = 'visible';
        } else {
            sidebar.style.transform = 'translateX(-100%)';
            // Jangan langsung sembunyikan, tunggu animasi selesai
            setTimeout(() => {
                if (!sidebar.classList.contains('show')) {
                    sidebar.style.visibility = 'hidden';
                }
            }, 300);
        }
    }
}
// Add CSS styles dynamically
// Tambahkan event listener untuk menu button
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.querySelector('.menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', toggleSidebar);
    }
});
