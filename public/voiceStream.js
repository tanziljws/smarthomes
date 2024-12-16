class VoiceStreamer {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.isStreaming = false;
        this.mediaStream = null;
        this.websocket = null;
        this.audioContext = null;
        this.bufferSize = 512; // Buffer sedikit lebih besar
        this.sendTimestamp = 0;
        this.receiveTimestamp = 0;
        this._lastUpdateTime = 0;

        // Mobile panel handling
        this.initializeMobilePanel();
    }

    initializeMobilePanel() {
        const voiceBtn = document.querySelector('.btn-voice-stream');
        const mobilePanel = document.querySelector('.voice-stream-mobile');
        const closeBtn = document.getElementById('closeVoicePanel');

        if (window.innerWidth <= 768) {
            voiceBtn?.addEventListener('click', () => {
                mobilePanel?.classList.add('show');
            });

            closeBtn?.addEventListener('click', () => {
                mobilePanel?.classList.remove('show');
            });
        }
    }

    async startStreaming() {
        try {
            this.audioContext = new AudioContext({ 
                latencyHint: 'interactive', 
                sampleRate: 44100 
            });

            // Mendapatkan izin mikrofon
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 44100, latency: 0.01 }, 
                video: false 
            });

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            const processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);

            source.connect(processor);
            processor.connect(this.audioContext.destination);

            // Inisialisasi WebSocket
            this.websocket = new WebSocket(`ws://${this.serverUrl}:8081/stream`);
            this.websocket.binaryType = 'arraybuffer';

            // Memeriksa status koneksi WebSocket
            this.websocket.onopen = () => {
                console.log("WebSocket connected");
                this.isStreaming = true;
                this.updateUI(true);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.stopStreaming();
                showError('WebSocket connection error');
            };

            this.websocket.onclose = () => {
                console.log('WebSocket closed');
                this.stopStreaming();
            };

            processor.onaudioprocess = (e) => {
                if (this.websocket.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = Int16Array.from(inputData, val => val * 32767);

                    // Mengukur waktu pengiriman
                    this.sendTimestamp = performance.now();
                    this.websocket.send(pcmData.buffer);

                    // Logging waktu pengiriman
                    console.log(`Sent data at: ${this.sendTimestamp}`);
                }
            };

            // Listening untuk data yang diterima dari server dan hitung latensinya
            this.websocket.onmessage = (event) => {
                this.receiveTimestamp = performance.now();
                const latency = this.receiveTimestamp - this.sendTimestamp;
                console.log(`Round-trip latency: ${latency.toFixed(2)}ms`);

                // Menampilkan latensi di UI jika diinginkan
                this.updateLatencyUI(latency);
            };

        } catch (error) {
            console.error('Error starting voice stream:', error);
            this.stopStreaming();
            showError(`Failed to start voice stream: ${error.message}`);
        }
    }

    stopStreaming() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.isStreaming = false;
        this.updateUI(false);
    }

    updateUI(isStreaming) {
        const button = document.querySelector('.btn-voice-stream');
        const statusPill = document.querySelector('.voice-status-pill');
        
        if (button) {
            button.classList.toggle('active', isStreaming);
            
            if (statusPill) {
                statusPill.textContent = `VOICE: ${isStreaming ? 'ON' : 'OFF'}`;
                statusPill.classList.add('show');
                setTimeout(() => statusPill.classList.remove('show'), 1500);
            }
        }
    }

    updateLatencyUI(latency) {
        const latencyElement = document.getElementById('latencyDisplay');
        if (latencyElement) {
            latencyElement.textContent = `Latency: ${latency.toFixed(2)} ms`;
        }
    }

    updateStatusDot(isStreaming) {
        const button = document.querySelector('.btn-voice-stream');
        if (button) {
            if (isStreaming) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }
}

// Fungsi bantu untuk menampilkan error
function showError(message) {
    console.error(message);
    alert(message);
}

// Inisialisasi voice streamer
const voiceStreamer = new VoiceStreamer('192.168.2.90');

// Tambahkan event listener ke tombol
document.getElementById('voiceStreamBtn')?.addEventListener('click', () => {
    if (!voiceStreamer.isStreaming) {
        voiceStreamer.startStreaming();
    } else {
        voiceStreamer.stopStreaming();
    }
});
