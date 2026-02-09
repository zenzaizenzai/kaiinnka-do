// カメラ制御モジュール
const Camera = {
    stream: null,
    videoElement: null,

    // カメラ開始
    async start(videoElement) {
        this.videoElement = videoElement;

        try {
            // 背面カメラを優先
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;

            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });
        } catch (error) {
            console.error('Camera access failed:', error);
            throw new Error('カメラへのアクセスが拒否されました。設定からカメラの使用を許可してください。');
        }
    },

    // 撮影（スナップショット）
    capture() {
        if (!this.videoElement || !this.stream) {
            throw new Error('Camera not started');
        }

        const canvas = document.createElement('canvas');
        const videoWidth = this.videoElement.videoWidth;
        const videoHeight = this.videoElement.videoHeight;

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);

        return canvas.toDataURL('image/jpeg', 0.9);
    },

    // カメラ停止
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    },

    // カメラが利用可能かチェック
    async isAvailable() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch {
            return false;
        }
    }
};
