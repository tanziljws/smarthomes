const mqtt = require('mqtt');
const EventEmitter = require('events');

class MqttService {
  constructor() {
    this.client = null;
    this.emitter = new EventEmitter();
    this.io = null;
  }

  connect(io) {
    this.io = io;
    this.client = mqtt.connect('mqtt://192.168.2.84', {
      username: 'root',
      password: 'adminse10',
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.client.subscribe('smarthome/status');
      this.client.subscribe('smarthome/dht');
      this.client.subscribe('smarthome/airquality');
    });

    this.client.on('message', (topic, message) => {
      if (topic === 'smarthome/status') {
        const status = message.toString();
        console.log('Sending relay status:', status);
        io.emit('relayStatus', status);
        io.emit('deviceStatusUpdate', status);
      }

      if (topic === 'smarthome/dht') {
        try {
          const data = JSON.parse(message.toString());
          io.emit('dhtData', data);
        } catch (err) {
          console.error('Error parsing DHT11 message:', err);
        }
      }

      if (topic === 'smarthome/airquality') {
        try {
          const data = JSON.parse(message.toString());
          io.emit('airQuality', data);
        } catch (err) {
          console.error('Error parsing air quality message:', err);
        }
      }
    });
  }

  broadcastDeviceUpdate(deviceData) {
    if (this.io) {
      this.io.emit('deviceUpdate', deviceData);
    }
  }

  publishCommand(command) {
    if (this.client) {
      this.client.publish('smarthome/control', command);
    }
  }

  async controlRelay(relayNumber, action) {
    try {
      const command = `RELAY${relayNumber}_${action}`;
      this.publishCommand(command);
      console.log(`Sent command: ${command}`);
      return true;
    } catch (error) {
      console.error('Error in controlRelay:', error);
      throw error;
    }
  }
}

module.exports = new MqttService();
