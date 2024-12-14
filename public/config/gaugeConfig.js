const gaugeConfigs = {
    temperature: {
        min: 0,
        max: 50,
        unit: '°C',
        precision: 1,
        startAngle: -150,
        endAngle: 150,
        scaleSteps: [0, 10, 20, 30, 40, 50],
        thresholds: [
            { max: 18, status: 'Cold', class: 'cold', color: '#2196F3' },
            { max: 30, status: 'Normal', class: 'normal', color: '#4CAF50' },
            { max: 50, status: 'Hot', class: 'hot', color: '#FF5722' }
        ],
        icon: '🌡️'
    },
    humidity: {
        min: 0,
        max: 100,
        unit: '%',
        precision: 1,
        startAngle: -150,
        endAngle: 150,
        scaleSteps: [0, 20, 40, 60, 80, 100],
        thresholds: [
            { max: 30, status: 'Dry', class: 'dry', color: '#FF5722' },
            { max: 70, status: 'Optimal', class: 'normal', color: '#4CAF50' },
            { max: 100, status: 'Humid', class: 'humid', color: '#2196F3' }
        ],
        icon: '💧'
    }
};

// Dapat menambahkan konfigurasi gauge baru di sini 