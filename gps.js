// GPS位置情報モジュール
const GPS = {
    currentPosition: null,
    watchId: null,

    // 現在地を取得
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('このブラウザは位置情報をサポートしていません'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // 1分間キャッシュ
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString()
                    };
                    resolve(this.currentPosition);
                },
                (error) => {
                    let message;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = '位置情報へのアクセスが拒否されました';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = '位置情報を取得できませんでした';
                            break;
                        case error.TIMEOUT:
                            message = '位置情報の取得がタイムアウトしました';
                            break;
                        default:
                            message = '位置情報の取得中にエラーが発生しました';
                    }
                    reject(new Error(message));
                },
                options
            );
        });
    },

    // 位置情報の監視開始
    startWatching(callback) {
        if (!navigator.geolocation) {
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                };
                if (callback) callback(this.currentPosition);
            },
            () => { },
            options
        );
    },

    // 位置情報の監視停止
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    },

    // 2点間の距離を計算（Haversine公式、メートル単位）
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // 地球の半径（メートル）
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    },

    // 度をラジアンに変換
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    },

    // 距離を人間が読みやすい形式に
    formatDistance(meters) {
        if (meters < 100) {
            return `${Math.round(meters)}m`;
        } else if (meters < 1000) {
            return `${Math.round(meters / 10) * 10}m`;
        } else if (meters < 10000) {
            return `${(meters / 1000).toFixed(1)}km`;
        } else {
            return `${Math.round(meters / 1000)}km`;
        }
    },

    // 位置情報が利用可能かチェック
    isAvailable() {
        return 'geolocation' in navigator;
    }
};
