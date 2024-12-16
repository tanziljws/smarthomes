class VoiceStreamer {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.isStreaming = false;
        this.mediaStream = null;
        this.websocket = null;
        this.audioContext = null;
        this.mediaRecorder = null;
    }

    async startStreaming() {
        try {
            // Cek dukungan getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser tidak mendukung audio capture');
            }

            // Request permission dengan explicit constraints
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 44100
                },
                video: false // pastikan video dimatikan
            });

            // Setup Web Audio API dengan error handling
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            const processor = this.audioContext.createScriptProcessor(2048, 1, 1);

            source.connect(processor);
            processor.connect(this.audioContext.destination);

            // Setup WebSocket dengan error handling
            this.websocket = new WebSocket(`ws://${this.serverUrl}:8081/stream`);
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected');
                this.isStreaming = true;
                this.updateUI(true);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.stopStreaming();
                showError('Connection error');
            };

            processor.onaudioprocess = (e) => {
                if (this.isStreaming && this.websocket.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = inputData[i] * 0x7FFF;
                    }
                    this.websocket.send(pcmData.buffer);
                }
            };

        } catch (error) {
            console.error('Error starting voice stream:', error);
            this.stopStreaming();
            
            // Tampilkan pesan error yang lebih spesifik
            if (error.name === 'NotFoundError') {
                showError('Mikrofon tidak ditemukan. Pastikan mikrofon terhubung dan izinkan akses.');
            } else if (error.name === 'NotAllowedError') {
                showError('Akses mikrofon ditolak. Mohon izinkan akses mikrofon di pengaturan browser.');
            } else {
                showError(`Failed to start voice stream: ${error.message}`);
            }
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
        const button = document.getElementById('voiceStreamBtn');
        if (button) {
            button.classList.toggle('active', isStreaming);
            button.innerHTML = `
                <i class="material-icons">mic</i>
                VOICE STREAM: ${isStreaming ? 'ON' : 'OFF'}
            `;
            button.style.background = isStreaming ? 
                'linear-gradient(135deg, #4CAF50, #45a049)' : 
                'linear-gradient(135deg, #FF4081, #E91E63)';
        }
    }
}

// Helper function untuk menampilkan error
function showError(message) {
    console.error(message);
    // Implementasikan UI untuk menampilkan error ke user
    alert(message);
}

// Initialize voice streamer
const voiceStreamer = new VoiceStreamer('192.168.2.90');

// Add event listener to button
document.getElementById('voiceStreamBtn')?.addEventListener('click', () => {
    if (!voiceStreamer.isStreaming) {
        voiceStreamer.startStreaming();
    } else {
        voiceStreamer.stopStreaming();
    }
}); 