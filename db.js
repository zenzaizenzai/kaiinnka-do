// IndexedDB管理モジュール
const CardDB = {
    DB_NAME: 'CardWalletDB',
    DB_VERSION: 1,
    STORE_NAME: 'cards',
    db: null,

    // データベース初期化
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // インデックス作成
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    },

    // カード追加
    async addCard(card) {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);

        const cardData = {
            ...card,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const request = store.add(cardData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // カード取得（単一）
    async getCard(id) {
        const tx = this.db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // 全カード取得
    async getAllCards() {
        const tx = this.db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    // カード更新
    async updateCard(card) {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);

        card.updatedAt = new Date().toISOString();

        return new Promise((resolve, reject) => {
            const request = store.put(card);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // カード削除
    async deleteCard(id) {
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // 位置情報をカードに追加
    async addLocationToCard(cardId, location) {
        const card = await this.getCard(cardId);
        if (!card) throw new Error('Card not found');

        if (!card.locations) {
            card.locations = [];
        }

        // 同じ場所が既に登録されていないかチェック（50m以内は同一とみなす）
        const isDuplicate = card.locations.some(loc => {
            const distance = GPS.calculateDistance(loc.lat, loc.lng, location.lat, location.lng);
            return distance < 50;
        });

        if (!isDuplicate) {
            card.locations.push({
                lat: location.lat,
                lng: location.lng,
                name: location.name || `地点${card.locations.length + 1}`,
                addedAt: new Date().toISOString()
            });

            await this.updateCard(card);
        }

        return card;
    },

    // 位置情報をカードから削除
    async removeLocationFromCard(cardId, locationIndex) {
        const card = await this.getCard(cardId);
        if (!card) throw new Error('Card not found');

        if (card.locations && card.locations[locationIndex]) {
            card.locations.splice(locationIndex, 1);
            await this.updateCard(card);
        }

        return card;
    },

    // BlobをBase64に変換（保存用）
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    // Base64をBlobに変換（復元用）
    base64ToBlob(base64) {
        const parts = base64.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: contentType });
    }
};
