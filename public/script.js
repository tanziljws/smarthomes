// Initialize socket connection
const socket = io();

// DOM Elements
const devicesList = document.getElementById('devices-list');
const deviceModal = document.getElementById('deviceModal');
const deviceForm = document.getElementById('deviceForm');
const addDeviceBtn = document.getElementById('addDeviceBtn');
const closeModalBtn = document.getElementById('closeModal');

// Dark Mode Toggle
document.getElementById('toggleDarkMode').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

// Show modal
addDeviceBtn.addEventListener('click', () => {
  deviceModal.style.display = 'block';
});

// Close modal
closeModalBtn.addEventListener('click', () => {
  deviceModal.style.display = 'none';
});

// Fetch devices
async function fetchDevices() {
  try {
    const response = await fetch('/devices');
    if (!response.ok) throw new Error('Network response was not ok');
    const devices = await response.json();
    renderDevices(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
  }
}

// Render devices
function renderDevices(devices) {
  devicesList.innerHTML = devices.map(createDeviceCard).join('');
}

function initializeMeters() {
    // Create tick marks and numbers
    const tempMeter = document.querySelector('.temperature .meter');
    const humidMeter = document.querySelector('.humidity .meter');

    function createTicks(container) {
      const tickMarks = container.querySelector('.tick-marks');
      const numbers = container.querySelector('.numbers');

      for (let i = 0; i <= 180; i += 10) {
        // Create tick mark
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.transform = `rotate(${i}deg)`;
        tickMarks.appendChild(tick);

        // Create number (every 30 degrees)
        if (i % 30 === 0) {
          const number = document.createElement('div');
          number.className = 'number';
          const value = Math.round((i / 180) * 100);
          number.textContent = value;
          number.style.transform = `rotate(${i}deg) translate(0, -30px) rotate(-${i}deg)`;
          numbers.appendChild(number);
        }
      }
    }

    createTicks(tempMeter);
    createTicks(humidMeter);

    // Set initial values
    updateMeter('temperature', 25.3);
    updateMeter('humidity', 62.8);
  }

  function updateMeter(type, value) {
    const meter = document.querySelector(`.${type} .meter`);
    meter.style.setProperty('--value', value);
  }

  // Initialize when document is loaded
  document.addEventListener('DOMContentLoaded', initializeMeters);

// Create device card
function createDeviceCard(device) {
  return `
    <div class="device-card" id="device-${device.id}">
      <h3>${device.name}</h3>
      <p>Status: <span class="device-status" id="statusRelay${device.relay_number}">${device.status}</span></p>
      <label class="switch">
        <input type="checkbox" id="relay${device.relay_number}" onchange="toggleRelay(${device.relay_number}, this.checked)" ${device.status === 'ON' ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
      <button class="btn-delete" onclick="deleteDevice(${device.id})">Delete</button>
    </div>
  `;
}

function createGaugeTicks() {
    const meterContainers = document.querySelectorAll('.meter-container');

    meterContainers.forEach(container => {
        const tickMarks = document.createElement('div');
        tickMarks.className = 'tick-marks';

        // Create tick marks
        for(let i = 0; i <= 180; i += 18) { // 10 ticks for 180 degrees
            const tick = document.createElement('div');
            tick.className = 'tick';
            tick.style.transform = `rotate(${i}deg)`;
            tickMarks.appendChild(tick);
        }

        container.appendChild(tickMarks);
    });
}

// Call after DOM loads
document.addEventListener('DOMContentLoaded', createGaugeTicks);

function createGauge(containerId, value, max = 100) {
    const container = document.getElementById(containerId);
    const markers = container.querySelector('.gauge-markers');
    const numbers = container.querySelector('.gauge-numbers');
    const fill = container.querySelector('.gauge-fill');

    // Create markers
    for (let i = 0; i <= 180; i += 6) {
      const marker = document.createElement('div');
      marker.className = 'marker';
      marker.style.transform = `rotate(${i}deg)`;
      markers.appendChild(marker);
    }

    // Create numbers
    for (let i = 0; i <= 180; i += 30) {
      const number = document.createElement('div');
      number.className = 'number';
      number.textContent = Math.round((i / 180) * max);
      number.style.transform = `rotate(${i}deg) translate(0, -120px) rotate(-${i}deg)`;
      numbers.appendChild(number);
    }

    // Set fill
    const fillRotation = (value / max) * 180;
    fill.style.transform = `rotate(${fillRotation}deg)`;
  }

  // Initialize gauges
  createGauge('tempFill', 25.3, 50);  // Temperature max 50°C
  createGauge('humidityFill', 62.8);  // Humidity max 100%

  // Function to update gauge value
  function updateGauge(type, value) {
    const gauge = document.querySelector(`.${type} .meter-gauge`);
    const fill = document.querySelector(`.${type} .meter-fill`);

    if (type === 'temperature') {
        // Konversi nilai temperature (-30 to 120) ke persentase
        const percentage = ((value + 30) / 150) * 100;
        gauge.style.background = `conic-gradient(
            #FFD700 ${percentage}%,
            transparent ${percentage}%
        )`;
    } else {
        // Update humidity fill height
        if (fill) {
            fill.style.height = `${value}%`;
        }
    }
  }

// Handle device submission
async function handleDeviceSubmit(e) {
  e.preventDefault();
  const formData = {
    name: document.getElementById('deviceName').value,
    relay_number: parseInt(document.getElementById('relayNumber').value)
  };

  try {
    const response = await fetch('/devices/add-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to add device: ${errorData.error}`);
    }

    deviceModal.style.display = 'none';
    deviceForm.reset();
    await fetchDevices(); // Refresh device list
    alert('Device added successfully!');
  } catch (error) {
    console.error('Error adding device:', error);
    alert('Failed to add device. Please try again.');
  }
}

// Event listener for form submission
deviceForm.addEventListener('submit', handleDeviceSubmit);

// Relay status handling
socket.on('relayStatus', (status) => {
  const [relay, state] = status.split('_');
  const relayId = relay.replace('RELAY', '');

  // Update checkbox state
  const checkbox = document.getElementById(`relay${relayId}`);
  if (checkbox) {
    checkbox.checked = state === 'ON';
  }

  // Update status display
  const statusElement = document.getElementById(`statusRelay${relayId}`);
  if (statusElement) {
    statusElement.textContent = `Status: ${state}`;
    statusElement.className = `device-status ${state.toLowerCase()}`;
  }

  // Update the device status in the database if necessary
  updateDeviceStatusInDatabase(relayId, state);
});

// Function to update device status in the database
async function updateDeviceStatusInDatabase(relayId, state) {
  try {
    const response = await fetch('/devices/update-device-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relay: relayId, status: state })
    });

    if (!response.ok) {
      throw new Error('Failed to update device status in database');
    }
  } catch (error) {
    console.error('Error updating device status in database:', error);
  }
}

// Sidebar Mobile Navigation
function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const burgerMenu = document.getElementById('burgerMenu');
    const closeSidebar = document.getElementById('closeSidebar');

    // Set initial state based on screen size
    function setInitialState() {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            burgerMenu.style.display = 'block';
        } else {
            sidebar.classList.add('active');
            burgerMenu.style.display = 'none';
        }
    }

    function toggleSidebar() {
        sidebar.classList.toggle('active');

        // Handle overlay
        let overlay = document.querySelector('.sidebar-overlay');
        if (sidebar.classList.contains('active') && window.innerWidth <= 768) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                overlay.onclick = toggleSidebar;
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'block';
        } else if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Set initial state on load
    setInitialState();

    // Burger menu click
    burgerMenu.addEventListener('click', toggleSidebar);

    // Close button click
    closeSidebar.addEventListener('click', toggleSidebar);

    // Handle window resize
    window.addEventListener('resize', () => {
        setInitialState();
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.style.display = 'none';
    });
}

// Initialize sidebar
document.addEventListener('DOMContentLoaded', initSidebar);

// Toggle relay
async function toggleRelay(relayId, isChecked) {
  const action = isChecked ? 'ON' : 'OFF';
  try {
    const response = await fetch('/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relay: relayId, action })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`Failed to control relay: ${data.error || 'Unknown error'}`);
    }

    // Emit status update to all clients
    socket.emit('relayStatus', `RELAY${relayId}_${action}`);

    // Update UI
    const statusElement = document.getElementById(`statusRelay${relayId}`);
    if (statusElement) {
      statusElement.textContent = `Status: ${action}`;
      statusElement.className = `device-status ${action.toLowerCase()}`;
    }
  } catch (error) {
    console.error('Error controlling relay:', error);
    // Revert switch state on error
    const checkbox = document.getElementById(`relay${relayId}`);
    if (checkbox) {
      checkbox.checked = !isChecked;
    }
  }
}

// Function to delete device
async function deleteDevice(deviceId) {
  if (confirm('Are you sure you want to delete this device?')) {
    try {
      const response = await fetch(`/devices/delete-device/${deviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      await fetchDevices(); // Refresh device list
      alert('Device deleted successfully!');
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Failed to delete device. Please try again.');
    }
  }
}



// Fetch devices and other functionalities as before
// (no changes needed here)


// script.js
document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.addEventListener('click', function() {
        // Hapus kelas 'active' dari semua link
        document.querySelectorAll('.sidebar nav a').forEach(nav => nav.classList.remove('active'));
        // Tambahkan kelas 'active' ke link yang diklik
        this.classList.add('active');
    });
});

// Mendengarkan event dht11Data yang dikirimkan dari server
socket.on('dhtData', (status) => {
    console.log("Received DHT data:", status);
    // Update elemen HTML dengan data yang diterima
    document.getElementById('temperature').innerText = status.temperature + '°C';
    document.getElementById('humidity').innerText = status.humidity + '%';
  });

// Update meter rotation based on value
function updateMeterRotation(type, value) {
    const indicator = document.querySelector(`.${type} .meter-indicator`);
    if (type === 'humidity') {
        // Konversi nilai humidity (0-100) ke derajat (0-180)
        const rotation = (value / 100) * 180;
        indicator.style.transform = `rotate(${rotation}deg)`;
    } else {
        // Untuk temperature, sesuaikan range (misalnya 0-50°C)
        const rotation = (value / 50) * 180;
        indicator.style.transform = `rotate(${rotation}deg)`;
    }
}

// Gunakan saat menerima data dari socket
socket.on('dhtData', (status) => {
    console.log("Received DHT data:", status);
    updateMeterRotation('temperature', status.temperature);
    updateMeterRotation('humidity', status.humidity);
});

// Fetch devices on page load
fetchDevices();

function createGaugeMarkers() {
    const containers = document.querySelectorAll('.meter-container');

    containers.forEach(container => {
        // Bersihkan tick marks dan numbers yang sudah ada
        container.querySelector('.tick-marks').innerHTML = '';
        container.querySelector('.meter-numbers').innerHTML = '';

        const type = container.closest('.card').classList.contains('temperature') ? 'temp' : 'humidity';

        // Generate ticks
        for(let i = 0; i <= 180; i += 6) { // Setiap 6 derajat (total 30 ticks)
            const tick = document.createElement('div');
            tick.className = i % 30 === 0 ? 'tick major' : 'tick';
            tick.style.transform = `rotate(${i}deg)`;
            container.querySelector('.tick-marks').appendChild(tick);

            // Tambah angka untuk major ticks
            if(i % 30 === 0) {
                const number = document.createElement('div');
                number.className = 'meter-number';
                const value = type === 'temp'
                    ? Math.round((i / 180) * 50)
                    : Math.round((i / 180) * 100);
                number.textContent = type === 'temp' ? `${value}°` : `${value}%`;
                number.style.transform = `rotate(${i}deg) translate(0, -30px) rotate(-${i}deg)`;
                container.querySelector('.meter-numbers').appendChild(number);
            }
        }
    });
}

// Panggil fungsi saat dokumen dimuat
document.addEventListener('DOMContentLoaded', createGaugeMarkers);

// Update saat menerima data
socket.on('dhtData', (status) => {
    updateGauge('temperature', status.temperature);
    updateGauge('humidity', status.humidity);
});

function updateTemperatureGauge(value) {
    const gauge = document.querySelector('.temperature .gauge-arc');
    if (!gauge) return;

    // Convert temperature range (-30 to 120) to degrees
    const min = -30;
    const max = 120;
    const range = max - min;
    const percentage = ((value - min) / range);

    // Calculate rotation (-220 to 40 degrees)
    const minRotation = -220;
    const maxRotation = 40;
    const rotationRange = maxRotation - minRotation;
    const rotation = minRotation + (percentage * rotationRange);

    gauge.style.transform = `rotate(${rotation}deg)`;
}

// Update when receiving data
socket.on('dhtData', (data) => {
    updateTemperatureGauge(data.temperature);
});

function updateAirQuality(data) {
    // Update temperature gauge
    const tempPercent = (data.temperature / 50) * 100; // Asumsi max 50°C
    document.getElementById('tempGauge').style.transform =
        `rotate(${tempPercent * 1.8}deg)`;
    document.getElementById('temperature').textContent =
        `${data.temperature.toFixed(1)}°C`;

    // Update humidity gauge
    const humidityPercent = data.humidity;
    document.getElementById('humidityGauge').style.transform =
        `rotate(${humidityPercent * 1.8}deg)`;
    document.getElementById('humidity').textContent =
        `${data.humidity.toFixed(1)}%`;

    // Update AQI
    const aqi = data.aqi;
    let aqiStatus = '';
    let statusColor = '';

    if (aqi <= 50) {
        aqiStatus = 'Good';
        statusColor = 'good';
    } else if (aqi <= 100) {
        aqiStatus = 'Moderate';
        statusColor = 'moderate';
    } else {
        aqiStatus = 'Poor';
        statusColor = 'poor';
    }

    document.getElementById('aqiGauge').style.transform =
        `rotate(${(aqi / 200) * 180}deg)`;
    document.getElementById('aqiValue').textContent = aqiStatus;
    document.getElementById('aqiNumber').textContent = aqi;

    const statusIndicator = document.querySelector('.status-indicator');
    statusIndicator.className = `status-indicator ${statusColor}`;
    document.getElementById('aqiStatus').querySelector('span').textContent =
        `Air Quality is ${aqiStatus}`;
}

// Tambahkan listener untuk MQTT
socket.on('airQuality', (data) => {
    updateAirQuality(data);
});

// Fungsi untuk mengambil data cuaca dari BMKG
async function fetchWeatherData() {
    try {
        const response = await fetch('/api/weather'); // Endpoint backend Anda
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
}

// Fungsi untuk mengupdate UI cuaca
function updateWeatherUI(data) {
    // Update suhu
    document.getElementById('weatherTemp').textContent = data.t;

    // Update deskripsi cuaca
    document.getElementById('weatherDesc').textContent = data.weather_desc;

    // Update waktu lokal
    const localTime = new Date(data.local_datetime).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('localTime').textContent = localTime;

    // Update detail cuaca
    document.getElementById('humidity').textContent = `${data.hu}%`;
    document.getElementById('windSpeed').textContent = `${data.ws} km/h`;
    document.getElementById('visibility').textContent = `${data.vs_text} km`;
    document.getElementById('cloudCover').textContent = `${data.tcc}%`;

    // Update icon cuaca berdasarkan deskripsi
    updateWeatherIcon(data.weather_desc);
}

// Fungsi untuk memilih icon yang sesuai
function updateWeatherIcon(weatherDesc) {
    let iconName = 'wb_sunny'; // default icon

    weatherDesc = weatherDesc.toLowerCase();
    if (weatherDesc.includes('hujan')) {
        iconName = 'rainy';
    } else if (weatherDesc.includes('berawan')) {
        iconName = 'cloud';
    } else if (weatherDesc.includes('cerah berawan')) {
        iconName = 'partly_cloudy_day';
    } else if (weatherDesc.includes('mendung')) {
        iconName = 'cloudy';
    }

    document.getElementById('weatherIcon').textContent = iconName;
}

// Panggil fungsi setiap 30 menit
fetchWeatherData();
setInterval(fetchWeatherData, 30 * 60 * 1000);

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Weather Monitoring System Started');

    // Fungsi untuk mengambil data cuaca dari BMKG
    async function fetchWeatherData(locationCode) {
        console.group('📡 Fetching Weather Data');
        console.log('Location Code:', locationCode);

        try {
            const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${locationCode}`;
            console.log('Fetching from URL:', url);

            const response = await fetch(url);
            const rawData = await response.json();
            console.log('Raw API Response:', rawData);

            // Ekstrak data cuaca dari response
            const weatherData = rawData?.data?.[0]?.lokasi?.[0]?.data?.[0];
            console.log('Extracted Weather Data:', weatherData);

            if (weatherData) {
                // Update UI dengan data cuaca
                updateWeatherUI(weatherData);
            } else {
                throw new Error('Invalid data structure from API');
            }

        } catch (error) {
            console.error('❌ Error:', error);
            showError('Gagal mengambil data cuaca');
        } finally {
            console.groupEnd();
        }
    }

    // Fungsi untuk update UI
    function updateWeatherUI(data) {
        console.group('🔄 Updating Weather UI');
        try {
            const updates = {
                'weatherTemp': `${data.t}°C`,
                'weatherDesc': data.weather_desc,
                'weatherLocation': 'Empang, Bogor',
                'weatherTime': new Date().toLocaleTimeString('id-ID'),
                'weatherHumidity': `${data.hu}%`,
                'weatherWindSpeed': `${data.ws} km/h`,
                'weatherWindDir': data.wd,
                'weatherVisibility': data.vs_text,
                'weatherCloud': `${data.tcc}%`
            };

            // Update setiap elemen dan log hasilnya
            Object.entries(updates).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                    console.log(`✅ Updated ${id}:`, value);
                } else {
                    console.warn(`⚠️ Element not found: ${id}`);
                }
            });

            // Update icon cuaca berdasarkan deskripsi
            updateWeatherIcon(data.weather_desc);

        } catch (error) {
            console.error('❌ Error updating UI:', error);
            showError('Gagal memperbarui tampilan');
        } finally {
            console.groupEnd();
        }
    }

    // Fungsi untuk update icon cuaca
    function updateWeatherIcon(weatherDesc) {
        console.log('🎨 Updating weather icon for:', weatherDesc);
        const iconElement = document.getElementById('weatherIcon');
        if (!iconElement) {
            console.warn('⚠️ Weather icon element not found');
            return;
        }

        let iconName = 'wb_sunny'; // default
        weatherDesc = weatherDesc.toLowerCase();

        if (weatherDesc.includes('hujan')) {
            iconName = 'rainy';
        } else if (weatherDesc.includes('berawan')) {
            iconName = 'cloud';
        } else if (weatherDesc.includes('cerah berawan')) {
            iconName = 'partly_cloudy_day';
        } else if (weatherDesc.includes('mendung')) {
            iconName = 'cloudy';
        }

        iconElement.textContent = iconName;
        console.log('✅ Updated weather icon to:', iconName);
    }

    // Fungsi untuk menampilkan error
    function showError(message) {
        console.error('❌ Error:', message);
        const elements = {
            'weatherTemp': '--°C',
            'weatherDesc': message,
            'weatherLocation': 'Error',
            'weatherTime': '--:--',
            'weatherHumidity': '--%',
            'weatherWindSpeed': '-- km/h',
            'weatherWindDir': '--',
            'weatherVisibility': '-- km',
            'weatherCloud': '--%'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    // Setup event listeners
    console.group('🎯 Setting up Event Listeners');

    const locationSelect = document.getElementById('locationSelect');
    const refreshButton = document.getElementById('refreshWeather');

    if (locationSelect) {
        locationSelect.addEventListener('change', (e) => {
            console.log('📍 Location changed to:', e.target.value);
            fetchWeatherData(e.target.value);
        });
        console.log('✅ Location select listener added');
    } else {
        console.warn('⚠️ Location select not found');
    }

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log('🔄 Refresh clicked');
            const locationCode = locationSelect?.value || '32.71.01.1003';
            fetchWeatherData(locationCode);
        });
        console.log('✅ Refresh button listener added');
    } else {
        console.warn('⚠️ Refresh button not found');
    }

    console.groupEnd();

    // Load initial data
    console.log('🎬 Loading initial weather data');
    fetchWeatherData('32.71.01.1003');
});
