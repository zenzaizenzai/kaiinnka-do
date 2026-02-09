// メインアプリケーション
const App = {
    // 現在の画面
    currentScreen: 'home',
    // 撮影フロー用の一時データ
    captureFlow: {
        step: 'front', // 'front' | 'barcode'
        frontImage: null,
        barcodeImage: null
    },
    // 現在表示中のカードID
    currentCardId: null,

    // 初期化
    async init() {
        try {
            // IndexedDB初期化
            await CardDB.init();

            // Service Worker登録
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(() => console.log('Service Worker registered'))
                    .catch(err => console.warn('SW registration failed:', err));
            }

            // イベントリスナー設定
            this.setupEventListeners();

            // 初期データ読み込み
            await this.loadCards();

            // GPS取得開始
            this.updateGPSStatus('位置情報を取得中...');
            this.refreshRecommendations();

            console.log('App initialized');
        } catch (error) {
            console.error('App initialization failed:', error);
        }
    },

    // イベントリスナー設定
    setupEventListeners() {
        // ホーム画面
        document.getElementById('refresh-gps').addEventListener('click', () => this.refreshRecommendations());
        document.getElementById('add-card-btn').addEventListener('click', () => this.startCapture());

        // 詳細画面
        document.getElementById('back-btn').addEventListener('click', () => this.showScreen('home'));
        document.getElementById('add-location-btn').addEventListener('click', () => this.addCurrentLocation());
        document.getElementById('delete-card-btn').addEventListener('click', () => this.deleteCurrentCard());

        // 撮影画面
        document.getElementById('cancel-capture-btn').addEventListener('click', () => this.cancelCapture());
        document.getElementById('capture-btn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('retake-btn').addEventListener('click', () => this.retakePhoto());
        document.getElementById('confirm-btn').addEventListener('click', () => this.confirmPhoto());

        // 名前入力画面
        document.getElementById('name-back-btn').addEventListener('click', () => this.showScreen('home'));
        document.getElementById('save-card-btn').addEventListener('click', () => this.saveCard());
    },

    // 画面切り替え
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(`${screenId}-screen`).classList.add('active');
        this.currentScreen = screenId;
    },

    // カード一覧読み込み
    async loadCards() {
        try {
            const cards = await CardDB.getAllCards();
            this.renderAllCards(cards);
        } catch (error) {
            console.error('Failed to load cards:', error);
        }
    },

    // 全カード表示
    renderAllCards(cards) {
        const container = document.getElementById('all-cards');

        if (cards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="emoji">💳</div>
                    <p>カードがありません<br>＋ボタンで追加しましょう</p>
                </div>
            `;
            return;
        }

        container.innerHTML = cards.map(card => `
            <div class="card-item" data-id="${card.id}">
                <img class="card-thumb" src="${card.combinedImage}" alt="${card.name}">
                <div class="card-info">
                    <h3>${card.name}</h3>
                    <p>📍 ${card.locations?.length || 0}件の地点登録</p>
                </div>
            </div>
        `).join('');

        // クリックイベント
        container.querySelectorAll('.card-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showCardDetail(parseInt(item.dataset.id));
            });
        });
    },

    // レコメンド更新
    async refreshRecommendations() {
        const container = document.getElementById('recommend-cards');
        const statusEl = document.getElementById('gps-status');

        try {
            this.updateGPSStatus('位置情報を取得中...');
            const position = await GPS.getCurrentPosition();

            const cards = await CardDB.getAllCards();
            const recommended = Recommender.getTopCards(
                position.lat,
                position.lng,
                cards,
                4
            );

            if (recommended.length === 0) {
                container.innerHTML = '';
                this.updateGPSStatus('近くのカードがありません');
                return;
            }

            container.innerHTML = recommended.map(card => `
                <div class="recommend-card" data-id="${card.id}">
                    <img src="${card.combinedImage}" alt="${card.name}">
                    <span class="distance-badge">${GPS.formatDistance(card.nearestDistance)}</span>
                    <span class="card-name">${card.name}</span>
                </div>
            `).join('');

            // クリックイベント
            container.querySelectorAll('.recommend-card').forEach(item => {
                item.addEventListener('click', () => {
                    this.showCardDetail(parseInt(item.dataset.id));
                });
            });

            statusEl.classList.add('hidden');

        } catch (error) {
            console.warn('GPS error:', error);
            this.updateGPSStatus(error.message);
        }
    },

    // GPSステータス更新
    updateGPSStatus(message) {
        const statusEl = document.getElementById('gps-status');
        statusEl.textContent = message;
        statusEl.classList.remove('hidden');
    },

    // カード詳細表示
    async showCardDetail(cardId) {
        try {
            const card = await CardDB.getCard(cardId);
            if (!card) return;

            this.currentCardId = cardId;

            document.getElementById('detail-title').textContent = card.name;
            document.getElementById('card-image').src = card.combinedImage;

            // 登録地点一覧
            const locationsList = document.getElementById('locations-list');
            if (card.locations && card.locations.length > 0) {
                locationsList.innerHTML = card.locations.map((loc, index) => `
                    <div class="location-item">
                        <span>📍 ${loc.name || `地点${index + 1}`}</span>
                        <button class="remove-location" data-index="${index}">✕</button>
                    </div>
                `).join('');

                // 削除ボタン
                locationsList.querySelectorAll('.remove-location').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await this.removeLocation(cardId, parseInt(btn.dataset.index));
                    });
                });
            } else {
                locationsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">地点が登録されていません</p>';
            }

            this.showScreen('detail');
        } catch (error) {
            console.error('Failed to show card detail:', error);
        }
    },

    // 現在地をカードに追加
    async addCurrentLocation() {
        if (!this.currentCardId) return;

        try {
            const position = await GPS.getCurrentPosition();
            const locationName = prompt('この地点の名前（オプション）:', '');

            await CardDB.addLocationToCard(this.currentCardId, {
                lat: position.lat,
                lng: position.lng,
                name: locationName || null
            });

            // 詳細画面を更新
            this.showCardDetail(this.currentCardId);
        } catch (error) {
            alert(error.message);
        }
    },

    // 地点削除
    async removeLocation(cardId, locationIndex) {
        if (!confirm('この地点を削除しますか？')) return;

        try {
            await CardDB.removeLocationFromCard(cardId, locationIndex);
            this.showCardDetail(cardId);
        } catch (error) {
            console.error('Failed to remove location:', error);
        }
    },

    // カード削除
    async deleteCurrentCard() {
        if (!this.currentCardId) return;
        if (!confirm('このカードを削除しますか？')) return;

        try {
            await CardDB.deleteCard(this.currentCardId);
            this.currentCardId = null;
            await this.loadCards();
            this.showScreen('home');
        } catch (error) {
            console.error('Failed to delete card:', error);
        }
    },

    // 撮影開始
    async startCapture() {
        this.captureFlow = {
            step: 'front',
            frontImage: null,
            barcodeImage: null
        };

        document.getElementById('capture-title').textContent = '表面を撮影';
        document.getElementById('capture-preview').classList.add('hidden');

        this.showScreen('capture');

        try {
            const video = document.getElementById('camera-preview');
            await Camera.start(video);
        } catch (error) {
            alert(error.message);
            this.showScreen('home');
        }
    },

    // 撮影キャンセル
    cancelCapture() {
        Camera.stop();
        this.showScreen('home');
    },

    // 写真撮影
    capturePhoto() {
        try {
            const imageDataUrl = Camera.capture();
            document.getElementById('preview-image').src = imageDataUrl;
            document.getElementById('capture-preview').classList.remove('hidden');
        } catch (error) {
            console.error('Capture failed:', error);
        }
    },

    // 撮り直し
    retakePhoto() {
        document.getElementById('capture-preview').classList.add('hidden');
    },

    // 撮影確認
    async confirmPhoto() {
        const imageDataUrl = document.getElementById('preview-image').src;

        // 圧縮
        const compressed = await ImageProcessor.compress(imageDataUrl, 640, 0.5);
        console.log(`Image size: ${ImageProcessor.getSize(compressed)}KB`);

        if (this.captureFlow.step === 'front') {
            // 表面撮影完了 → バーコード撮影へ
            this.captureFlow.frontImage = compressed;
            this.captureFlow.step = 'barcode';

            document.getElementById('capture-title').textContent = 'バーコードを撮影';
            document.getElementById('capture-preview').classList.add('hidden');

        } else {
            // バーコード撮影完了 → 合成して名前入力へ
            this.captureFlow.barcodeImage = compressed;

            Camera.stop();

            // 合成
            const combined = await ImageProcessor.combine(
                this.captureFlow.frontImage,
                this.captureFlow.barcodeImage
            );

            // さらに圧縮
            const finalImage = await ImageProcessor.compress(combined, 640, 0.5);
            console.log(`Combined image size: ${ImageProcessor.getSize(finalImage)}KB`);

            document.getElementById('combined-image').src = finalImage;
            document.getElementById('card-name-input').value = '';
            document.getElementById('add-current-location').checked = true;

            this.showScreen('name');
        }
    },

    // カード保存
    async saveCard() {
        const name = document.getElementById('card-name-input').value.trim();
        if (!name) {
            alert('カード名を入力してください');
            return;
        }

        const combinedImage = document.getElementById('combined-image').src;
        const addLocation = document.getElementById('add-current-location').checked;

        const cardData = {
            name,
            frontImage: this.captureFlow.frontImage,
            barcodeImage: this.captureFlow.barcodeImage,
            combinedImage,
            locations: []
        };

        try {
            const cardId = await CardDB.addCard(cardData);

            // 現在地を追加
            if (addLocation) {
                try {
                    const position = await GPS.getCurrentPosition();
                    await CardDB.addLocationToCard(cardId, {
                        lat: position.lat,
                        lng: position.lng,
                        name: null
                    });
                } catch (gpsError) {
                    console.warn('Failed to add location:', gpsError);
                }
            }

            // 一覧更新
            await this.loadCards();
            await this.refreshRecommendations();

            this.showScreen('home');
        } catch (error) {
            console.error('Failed to save card:', error);
            alert('カードの保存に失敗しました');
        }
    }
};

// アプリ起動
document.addEventListener('DOMContentLoaded', () => App.init());
