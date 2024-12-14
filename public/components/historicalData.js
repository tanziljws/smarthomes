class HistoricalDataManager {
    constructor() {
        this.charts = {};
        this.data = {
            temperature: [],
            humidity: []
        };
        this.maxDataPoints = 20; // Jumlah data point yang ditampilkan
        this.initializeCharts();
    }

    initializeCharts() {
        // Temperature Chart
        const tempCtx = document.getElementById('temperatureChart').getContext('2d');
        this.charts.temperature = new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#FF5722',
                    backgroundColor: 'rgba(255, 87, 34, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#FF5722',
                    fill: true
                }]
            },
            options: {
                ...this.getChartOptions('Temperature'),
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                transitions: {
                    show: {
                        animations: {
                            x: {
                                from: 0
                            },
                            y: {
                                from: 0
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: (ctx) => {
                            const values = ctx.chart.data.datasets[0].data;
                            const min = Math.min(...values) - 2;
                            return min < 0 ? 0 : min;
                        },
                        max: (ctx) => {
                            return Math.max(...ctx.chart.data.datasets[0].data) + 2;
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                }
            }
        });

        // Humidity Chart
        const humCtx = document.getElementById('humidityChart').getContext('2d');
        this.charts.humidity = new Chart(humCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#2196F3',
                    fill: true
                }]
            },
            options: {
                ...this.getChartOptions('Humidity'),
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                transitions: {
                    show: {
                        animations: {
                            x: {
                                from: 0
                            },
                            y: {
                                from: 0
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: (ctx) => {
                            const values = ctx.chart.data.datasets[0].data;
                            const min = Math.min(...values) - 5;
                            return min < 0 ? 0 : min;
                        },
                        max: (ctx) => {
                            return Math.max(...ctx.chart.data.datasets[0].data) + 5;
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }

    updateData(type, value) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Add new data
        this.data[type].push({ time: timestamp, value });
        
        // Keep only last maxDataPoints
        if (this.data[type].length > this.maxDataPoints) {
            this.data[type].shift();
        }

        const chart = this.charts[type];
        
        // Update chart data
        chart.data.labels = this.data[type].map(d => d.time);
        chart.data.datasets[0].data = this.data[type].map(d => d.value);

        // Add some random variation to make it more dynamic
        const variation = type === 'temperature' ? 0.2 : 1;
        const randomValue = value + (Math.random() - 0.5) * variation;
        
        // Update with animation
        chart.update('active');
    }

    getChartOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${title} History`,
                    color: '#fff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    labels: {
                        color: '#fff'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 3,
                    hoverRadius: 6
                }
            }
        };
    }

    exportData(format) {
        switch(format) {
            case 'csv':
                this.exportToCSV();
                break;
            case 'json':
                this.exportToJSON();
                break;
        }
    }

    exportToCSV() {
        let csv = 'Timestamp,Temperature,Humidity\n';
        const maxLength = Math.max(this.data.temperature.length, this.data.humidity.length);
        
        for (let i = 0; i < maxLength; i++) {
            const temp = this.data.temperature[i] || { time: '', value: '' };
            const hum = this.data.humidity[i] || { time: '', value: '' };
            csv += `${temp.time},${temp.value},${hum.value}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sensor_data.csv';
        a.click();
    }

    exportToJSON() {
        const data = {
            temperature: this.data.temperature,
            humidity: this.data.humidity,
            exportTime: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sensor_data.json';
        a.click();
    }
} 