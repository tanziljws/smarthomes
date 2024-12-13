document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadDevices();
    loadGroups();
    loadSchedules();

    // Event Listeners untuk buttons
    document.querySelector('.btn-add-group').addEventListener('click', () => {
        showModal('addGroupModal');
    });

    document.querySelector('.btn-add-device').addEventListener('click', () => {
        showModal('addDeviceModal');
    });

    document.querySelector('.btn-add-schedule').addEventListener('click', () => {
        showModal('addScheduleModal');
        loadDevicesForSchedule();
    });

    // Form handlers
    document.getElementById('addGroupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupName = document.getElementById('groupName').value;

        try {
            const response = await fetch('/devices/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: groupName })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to add group');

            console.log('Group added:', data); // Debug log

            // Reload both devices and groups
            await Promise.all([loadDevices(), loadGroups()]);

            // Clear form and hide modal
            document.getElementById('groupName').value = '';
            hideModal('addGroupModal');

            // Show success message
            showSuccess('Group added successfully');

        } catch (error) {
            console.error('Error adding group:', error);
            showError(error.message);
        }
    });

    document.getElementById('addDeviceForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('deviceName').value.trim(),
            relay_number: parseInt(document.getElementById('relayNumber').value),
            group_id: document.getElementById('deviceGroup').value || null
        };

        try {
            const response = await fetch('/devices/add-device', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to add device');

            await loadDevices();
            hideModal('addDeviceModal');
            document.getElementById('addDeviceForm').reset();
        } catch (error) {
            console.error('Error adding device:', error);
            showError(error.message);
        }
    });

    document.getElementById('addScheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            device_id: document.getElementById('scheduleDevice').value,
            time: document.getElementById('scheduleTime').value,
            action: document.getElementById('scheduleAction').value,
            days: Array.from(document.querySelectorAll('.days-selector input:checked'))
                       .map(checkbox => checkbox.value)
        };

        try {
            const response = await fetch('/devices/schedules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add schedule');
            }

            await loadSchedules();
            hideModal('addScheduleModal');
            document.getElementById('addScheduleForm').reset();
            showSuccess('Schedule added successfully');
        } catch (error) {
            console.error('Error adding schedule:', error);
            showError(error.message);
        }
    });

    // Add click handlers for edit buttons
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = button.closest('.device, .schedule-item').dataset.id;
            if (button.closest('.device')) {
                editDevice(id);
            } else {
                editSchedule(id);
            }
        });
    });
});

// Functions untuk device management
async function loadDevices() {
    try {
        const response = await fetch('/devices');
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load devices');
        }
        const devices = await response.json();
        console.log('Loaded devices:', devices); // Debug log
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
        console.log('Schedules loaded:', schedules); // Tambahkan log ini
        const schedulesList = document.querySelector('.schedules-list');
        schedulesList.innerHTML = ''; // Kosongkan daftar sebelum menambahkan yang baru

        schedules.forEach(schedule => {
            const scheduleItem = renderScheduleItem(schedule);
            schedulesList.appendChild(scheduleItem);
        });
    } catch (error) {
        console.error('Error loading schedules:', error);
        showError('Failed to load schedules');
    }
}

// UI Update Functions
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

    // Render all groups, even empty ones
    fetch('/devices/groups')
        .then(res => res.json())
        .then(allGroups => {
            allGroups.forEach(group => {
                const groupDevices = devices.filter(d => d.group_id === group.id);
                const html = `
                    <div class="device-group" data-group-id="${group.id}">
                        <div class="group-header">
                            <h3>${group.name}</h3>
                            <div class="group-controls">
                                <button onclick="showEditGroupModal(${group.id}, '${group.name}')" class="btn-edit">
                                    <span class="material-icons">edit</span>
                                </button>
                                <button onclick="deleteGroup(${group.id})" class="btn-delete">
                                    <span class="material-icons">delete</span>
                                </button>
                            </div>
                        </div>
                        <div class="group-devices">
                            ${renderDevices(groupDevices)}
                        </div>
                    </div>
                `;
                deviceGroups.insertAdjacentHTML('beforeend', html);
            });
        })
        .catch(err => console.error('Error loading groups:', err));
}

function renderDevices(devices) {
    return devices.map(device => `
        <div class="device-item" data-device-id="${device.id}" data-relay="${device.relay_number}">
            <span class="device-name">${device.name}</span>
            <div class="device-controls">
                <label class="switch">
                    <input type="checkbox"
                        ${device.status === 'ON' ? 'checked' : ''}
                        onchange="toggleDevice(${device.relay_number}, this.checked ? 'ON' : 'OFF')">
                    <span class="slider"></span>
                </label>
                <button onclick="showMoveDeviceModal(${device.id})" class="btn-move">
                    <span class="material-icons">drive_file_move</span>
                </button>
                <button onclick="deleteDevice(${device.id})" class="btn-delete">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

function updateGroupsUI(groups) {
    const groupsContainer = document.querySelector('.device-groups');
    const groupsHtml = groups.map(group => `
        <div class="device-group" data-group-id="${group.id}">
            <div class="group-header">
                <h3>${group.name}</h3>
                <div class="group-controls">
                    <button onclick="showEditGroupModal(${group.id}, '${group.name}')" class="btn-edit">
                        <span class="material-icons">edit</span>
                    </button>
                    <button onclick="deleteGroup(${group.id})" class="btn-delete">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            </div>
            <div class="group-devices"></div>
        </div>
    `).join('');

    // Append after ungrouped devices
    const existingContent = groupsContainer.innerHTML;
    groupsContainer.innerHTML = existingContent + groupsHtml;
}

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

// Device Control Functions
async function toggleDevice(relayNumber, newStatus) {
    try {
        const relay = parseInt(relayNumber);
        if (isNaN(relay) || relay < 1 || relay > 4) {
            throw new Error(`Invalid relay number: ${relayNumber}. Must be between 1 and 4`);
        }

        console.log('Toggling device:', { relay, newStatus });

        // Kirim perintah ke relay
        const controlResponse = await fetch('/control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                relay: relay,
                action: newStatus
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
        // Kembalikan toggle switch ke posisi semula jika gagal
        const toggle = document.querySelector(`[data-relay="${relayNumber}"] input[type="checkbox"]`);
        if (toggle) {
            toggle.checked = newStatus !== 'ON';
        }
    }
}

// Group Management Functions
async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
        const response = await fetch(`/devices/groups/${groupId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete group');
        await loadGroups();
        await loadDevices();
    } catch (error) {
        console.error('Error deleting group:', error);
        showError('Failed to delete group');
    }
}

async function editGroup(groupId) {
    const newName = document.getElementById('editGroupName').value;
    try {
        const response = await fetch(`/devices/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (!response.ok) throw new Error('Failed to edit group');
        await loadGroups();
        hideModal('editGroupModal');
    } catch (error) {
        console.error('Error editing group:', error);
        showError('Failed to edit group');
    }
}

async function moveDevice(deviceId, groupId) {
    try {
        console.log('Moving device:', { deviceId, groupId }); // Debug log

        const response = await fetch('/devices/move-device', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deviceId, groupId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to move device');
        }

        await loadDevices(); // Reload devices after successful move
        hideModal('moveDeviceModal');

    } catch (error) {
        console.error('Error moving device:', error);
        showError(error.message);
    }
}

// Modal Functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showMoveDeviceModal(deviceId) {
    console.log('Opening move modal for device:', deviceId); // Debug log

    const modal = document.getElementById('moveDeviceModal');
    if (!modal) {
        console.error('Move device modal not found');
        return;
    }

    modal.setAttribute('data-device-id', deviceId);

    // Update group options
    fetch('/devices/groups')
        .then(res => res.json())
        .then(groups => {
            const select = document.getElementById('moveToGroup');
            select.innerHTML = `
                <option value="">No Group</option>
                ${groups.map(group => `
                    <option value="${group.id}">${group.name}</option>
                `).join('')}
            `;
        })
        .catch(err => {
            console.error('Error loading groups:', err);
            showError('Failed to load groups');
        });

    showModal('moveDeviceModal');
}

function showEditGroupModal(groupId, currentName) {
    const modal = document.getElementById('editGroupModal');
    if (!modal) {
        console.error('Edit group modal not found');
        return;
    }

    const input = document.getElementById('editGroupName');
    if (input) {
        input.value = currentName || '';
    }

    modal.setAttribute('data-group-id', groupId);
    showModal('editGroupModal');
}

// Error Handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Event Listeners for Modal Close
document.querySelectorAll('.modal .close, .modal .btn-cancel').forEach(element => {
    element.addEventListener('click', function() {
        const modal = this.closest('.modal');
        if (modal) {
            hideModal(modal.id);
        }
    });
});

// Event Listener for Move Device Form
document.getElementById('moveDeviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const deviceId = e.target.closest('.modal').getAttribute('data-device-id');
    const groupId = document.getElementById('moveToGroup').value;

    console.log('Form submission:', { deviceId, groupId }); // Debug log
    await moveDevice(deviceId, groupId);
});

// Event Listener for Edit Group Form
document.getElementById('editGroupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const groupId = e.target.closest('.modal').getAttribute('data-group-id');
    await editGroup(groupId);
});

// Add success message function
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

// Delete Device Function
async function deleteDevice(deviceId) {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
        const response = await fetch(`/devices/devices/${deviceId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete device');
        }

        await loadDevices();
        showSuccess('Device deleted successfully');
    } catch (error) {
        console.error('Error deleting device:', error);
        showError(error.message);
    }
}

// Schedule Functions
async function loadDevicesForSchedule() {
    try {
        const response = await fetch('/devices');
        const devices = await response.json();

        const select = document.getElementById('scheduleDevice');
        select.innerHTML = devices.map(device => `
            <option value="${device.id}">${device.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error loading devices for schedule:', error);
        showError('Failed to load devices');
    }
}

function updateSchedulesUI(schedules) {
    const schedulesList = document.querySelector('.schedules-list');

    if (!schedules.length) {
        schedulesList.innerHTML = '<p class="no-schedules">No schedules yet</p>';
        return;
    }

    schedulesList.innerHTML = schedules.map(schedule => `
        <div class="schedule-item">
            <div class="schedule-info">
                <span class="device-name">${schedule.device_name}</span>
                <span class="schedule-time">${formatTime(schedule.time)}</span>
                <span class="schedule-days">${formatDays(schedule.days)}</span>
                <span class="schedule-action ${schedule.action.toLowerCase()}">${schedule.action}</span>
            </div>
            <div class="schedule-controls">
                <button onclick="deleteSchedule(${schedule.id})" class="btn-delete">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

async function deleteSchedule(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
        const response = await fetch(`/devices/schedules/${scheduleId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete schedule');
        }

        await loadSchedules();
        showSuccess('Schedule deleted successfully');
    } catch (error) {
        console.error('Error deleting schedule:', error);
        showError(error.message);
    }
}

// Helper Functions
function formatTime(time) {
    return new Date('2000-01-01T' + time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatDays(days) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.split(',').map(day => dayNames[parseInt(day)]).join(', ');
}

// Fungsi untuk mengedit device
async function editDevice(deviceId) {
    console.log('Editing device:', deviceId);
    try {
        // Ambil data device yang akan diedit
        const response = await fetch(`/api/devices/${deviceId}`);
        const device = await response.json();

        // Populate form dengan data yang ada
        document.getElementById('editDeviceName').value = device.name;
        document.getElementById('editRelayNumber').value = device.relayNumber;
        document.getElementById('editDeviceGroup').value = device.groupId || '';

        // Simpan device ID untuk digunakan saat submit
        document.getElementById('editDeviceForm').dataset.deviceId = deviceId;

        // Tampilkan modal
        showModal('editDeviceModal');

    } catch (error) {
        console.error('Error fetching device data:', error);
        showError('Failed to load device data');
    }
}

// Fungsi untuk mengedit schedule
async function editSchedule(scheduleId) {
    try {
        const response = await fetch(`/devices/schedules/${scheduleId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch schedule data');
        }

        const schedule = await response.json();

        // Memuat perangkat untuk dropdown
        await loadDevicesForEdit(schedule.device_id);

        // Populate form dengan data yang ada
        document.getElementById('editScheduleTime').value = schedule.time;
        document.getElementById('editScheduleAction').value = schedule.action;

        // Check days checkboxes
        const days = schedule.days.split(','); // Mengambil data hari
        document.querySelectorAll('input[name="editDays"]').forEach(checkbox => {
            checkbox.checked = days.includes(checkbox.value);
        });

        // Simpan schedule ID untuk digunakan saat submit
        document.getElementById('editScheduleForm').dataset.scheduleId = scheduleId;

        // Tampilkan modal
        showModal('editScheduleModal');

        // Tambahkan event listener untuk form submit
        document.getElementById('editScheduleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const selectedDays = Array.from(document.querySelectorAll('input[name="editDays"]:checked'))
                .map(checkbox => checkbox.value)
                .join(','); // Menggabungkan menjadi string dengan koma

            const updatedSchedule = {
                device_id: document.getElementById('editScheduleDevice').value,
                time: document.getElementById('editScheduleTime').value,
                action: document.getElementById('editScheduleAction').value,
                days: selectedDays // Pastikan formatnya benar
            };

            console.log('Updating schedule with:', updatedSchedule); // Log untuk memeriksa nilai yang dikirim

            try {
                const response = await fetch(`/devices/schedules/${scheduleId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedSchedule)
                });

                if (response.ok) {
                    hideModal('editScheduleModal');
                    await loadSchedules(); // Memuat ulang jadwal setelah berhasil memperbarui
                    showSuccess('Schedule berhasil diupdate');
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update schedule');
                }
            } catch (error) {
                console.error('Error updating schedule:', error);
                showError('Gagal mengupdate schedule: ' + error.message);
            }
        });
    } catch (error) {
        console.error('Error getting schedule:', error);
        showError('Gagal mengambil data schedule: ' + error.message);
    }
}

// Fungsi untuk memuat perangkat ke dalam select input
async function loadDevicesForEdit(selectedDeviceId) {
    try {
        const response = await fetch('/devices');
        if (!response.ok) {
            throw new Error('Failed to load devices');
        }
        const devices = await response.json();

        const select = document.getElementById('editScheduleDevice');
        select.innerHTML = devices.map(device => `
            <option value="${device.id}" ${device.id === selectedDeviceId ? 'selected' : ''}>
                ${device.name}
            </option>
        `).join('');
    } catch (error) {
        console.error('Error loading devices for edit:', error);
        showError('Failed to load devices');
    }
}

// Event listeners untuk form submissions
document.getElementById('editDeviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const deviceId = e.target.dataset.deviceId;

    const updatedDevice = {
        name: document.getElementById('editDeviceName').value,
        relayNumber: document.getElementById('editRelayNumber').value,
        groupId: document.getElementById('editDeviceGroup').value
    };

    try {
        const response = await fetch(`/api/devices/${deviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedDevice)
        });

        if (response.ok) {
            hideModal('editDeviceModal');
            loadDevices(); // Refresh device list
            showSuccess('Device updated successfully');
        } else {
            throw new Error('Failed to update device');
        }
    } catch (error) {
        console.error('Error updating device:', error);
        showError('Failed to update device');
    }
});

document.getElementById('editScheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const scheduleId = e.target.dataset.scheduleId;

    const selectedDays = Array.from(document.querySelectorAll('input[name="editDays"]:checked'))
        .map(checkbox => checkbox.value)
        .join(',');

    const actionValue = document.getElementById('editScheduleAction').value;
    console.log('Selected action value:', actionValue); // Log untuk memeriksa nilai yang dipilih

    const updatedSchedule = {
        device_id: document.getElementById('editScheduleDevice').value,
        time: document.getElementById('editScheduleTime').value,
        action: actionValue, // Ambil langsung dari actionValue
        days: selectedDays
    };

    console.log('Updating schedule with:', updatedSchedule); // Log untuk memeriksa nilai yang dikirim

    try {
        const response = await fetch(`/devices/schedules/${scheduleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedSchedule)
        });

        if (response.ok) {
            hideModal('editScheduleModal');
            await loadSchedules(); // Memuat ulang jadwal setelah berhasil memperbarui
            showSuccess('Schedule berhasil diupdate');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update schedule');
        }
    } catch (error) {
        console.error('Error updating schedule:', error);
        showError('Gagal mengupdate schedule: ' + error.message);
    }
});

// Helper functions untuk UI
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showSuccess(message) {
    console.log('Success:', message);
    // Implementasi notifikasi sukses sesuai kebutuhan
}

function showError(message) {
    console.error('Error:', message);
    // Implementasi notifikasi error sesuai kebutuhan
}

// Fungsi untuk render device
function renderDevice(device, container) {
    const deviceElement = document.createElement('div');
    deviceElement.className = 'device';
    deviceElement.innerHTML = `
        <div class="device-info">
            <span class="device-name">${device.name}</span>
            <div class="toggle-switch">
                <input type="checkbox" id="toggle-${device.id}" class="toggle-input"
                    ${device.status === 'ON' ? 'checked' : ''}>
                <label for="toggle-${device.id}"></label>
            </div>
        </div>
        <div class="device-controls">
            <button class="btn-control btn-edit" onclick="editDevice('${device.id}')">
                <span class="material-icons">edit</span>
            </button>
            <button class="btn-control btn-move" onclick="moveDevice('${device.id}')">
                <span class="material-icons">drive_file_move</span>
            </button>
            <button class="btn-control btn-delete" onclick="deleteDevice('${device.id}')">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `;
    container.appendChild(deviceElement);
}

// Fungsi untuk render schedule
function renderSchedule(schedule) {
    const scheduleElement = document.createElement('div');
    scheduleElement.className = 'schedule-item';
    scheduleElement.innerHTML = `
        <div class="schedule-info">
            <div class="schedule-device">${schedule.deviceName}</div>
            <div class="schedule-time">${schedule.time}</div>
            <div class="schedule-days">${schedule.days}</div>
            <div class="schedule-action ${schedule.action.toLowerCase()}">${schedule.action}</div>
        </div>
        <div class="schedule-controls">
            <button class="btn-control btn-edit" onclick="editSchedule('${schedule.id}')">
                <span class="material-icons">edit</span>
            </button>
            <button class="btn-control btn-delete" onclick="deleteSchedule('${schedule.id}')">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `;
    return scheduleElement;
}

// Fungsi untuk render schedule item
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
            <button class="btn-control btn-edit" onclick="editSchedule(${schedule.id})">
                <span class="material-icons">edit</span>
            </button>
            <button class="btn-control btn-delete" onclick="deleteSchedule(${schedule.id})">
                <span class="material-icons">delete</span>
            </button>
        </div>
    `;

    return scheduleElement;
}

// Tambahkan CSS untuk styling tombol
const style = document.createElement('style');
style.textContent = `
    .schedule-controls {
        display: flex;
        gap: 8px;
        margin-left: auto;
    }

    .schedule-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #2a2a2a;
        border-radius: 8px;
        margin-bottom: 8px;
    }

    .schedule-info {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .btn-control {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-edit {
        background: rgba(33, 150, 243, 0.2);
        color: #2196F3;
    }

    .btn-delete {
        background: rgba(244, 67, 54, 0.2);
        color: #F44336;
    }

    .btn-control:hover {
        transform: translateY(-2px);
        filter: brightness(1.2);
    }

    .btn-control .material-icons {
        font-size: 18px;
    }
`;

document.head.appendChild(style);

async function sendMQTTMessage(deviceId, action) {
    const message = {
        deviceId: deviceId,
        action: action
    };

    console.log(`Sending message: ${JSON.stringify(message)}`); // Log untuk memeriksa pesan yang dikirim
    mqttClient.publish('smarthome/control', JSON.stringify(message), { qos: 1 });
}

async function checkSchedules() {
    console.log('Checking schedules...'); // Log saat fungsi dipanggil
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // Format HH:MM:SS

    const schedules = await loadSchedules(); // Pastikan ini mengembalikan jadwal yang benar
    console.log('Loaded schedules:', schedules); // Log untuk memeriksa jadwal yang dimuat

    schedules.forEach(schedule => {
        console.log('Current Time:', currentTime);
        console.log('Schedule Time:', schedule.time);
        console.log('Schedule Days:', schedule.days); // Log untuk memeriksa days
        console.log('Schedule Active:', schedule.active);

        if (schedule.active && schedule.time === currentTime) {
            const daysArray = schedule.days.split(','); // Mengubah string menjadi array
            const currentDay = now.getDay(); // Mendapatkan hari saat ini (0-6)

            if (daysArray.includes(currentDay.toString())) {
                console.log(`Executing schedule ${schedule.time}: ${schedule.action} relay ${schedule.device_id}`);
                sendMQTTMessage(schedule.device_id, schedule.action);
                console.log(`Sent command: RELAY${schedule.device_id}_${schedule.action}`);
            }
        }
    });
}

// Panggil fungsi ini setiap menit
setInterval(checkSchedules, 60000); // Cek setiap 60 detik

async function addSchedule() {
    const selectedDays = Array.from(document.querySelectorAll('input[name="addDays"]:checked'))
                               .map(checkbox => checkbox.value)
                               .join(',');

    const newSchedule = {
        device_id: document.getElementById('addScheduleDevice').value,
        time: document.getElementById('addScheduleTime').value,
        action: document.getElementById('addScheduleAction').value,
        days: selectedDays // Pastikan ini diambil dari input yang benar
    };

    console.log('Days yang dikirim untuk ditambahkan:', selectedDays); // Log untuk memeriksa nilai yang dikirim

    try {
        const response = await fetch('/devices/schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSchedule)
        });

        if (response.ok) {
            // Tindakan setelah berhasil menambahkan jadwal
            showSuccess('Schedule berhasil ditambahkan');
        } else {
            throw new Error('Failed to add schedule');
        }
    } catch (error) {
        console.error('Error adding schedule:', error);
        showError('Gagal menambahkan schedule: ' + error.message);
    }
}
