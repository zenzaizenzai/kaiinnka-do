// 画像処理モジュール
const ImageProcessor = {
    // 画像を圧縮（イラスト風に軽量化）
    compress(imageDataUrl, maxWidth = 640, quality = 0.5) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // アスペクト比を維持してリサイズ
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');

                // イメージスムージングを有効化（イラスト風に）
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';

                ctx.drawImage(img, 0, 0, width, height);

                // JPEG品質を下げて圧縮
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = imageDataUrl;
        });
    },

    // 2枚の画像を縦に合成（表面 + バーコード）
    async combine(frontImageDataUrl, barcodeImageDataUrl) {
        const [frontImg, barcodeImg] = await Promise.all([
            this.loadImage(frontImageDataUrl),
            this.loadImage(barcodeImageDataUrl)
        ]);

        // 幅を統一（大きい方に合わせる）
        const targetWidth = Math.max(frontImg.width, barcodeImg.width);

        // 各画像の高さを計算
        const frontHeight = (frontImg.height * targetWidth) / frontImg.width;
        const barcodeHeight = (barcodeImg.height * targetWidth) / barcodeImg.width;

        // バーコード部分は少し小さく（全体の30%程度）
        const scaledBarcodeHeight = Math.min(barcodeHeight, frontHeight * 0.35);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = frontHeight + scaledBarcodeHeight + 10; // 間に10pxの余白

        const ctx = canvas.getContext('2d');

        // 背景を白に
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 表面を描画
        ctx.drawImage(frontImg, 0, 0, targetWidth, frontHeight);

        // バーコードを描画
        const barcodeY = frontHeight + 10;
        ctx.drawImage(barcodeImg, 0, barcodeY, targetWidth, scaledBarcodeHeight);

        return canvas.toDataURL('image/jpeg', 0.7);
    },

    // 画像読み込みヘルパー
    loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    },

    // DataURLをBlobに変換
    dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: contentType });
    },

    // BlobをDataURLに変換
    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    // 画像サイズを取得（KB）
    getSize(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const bytes = (base64.length * 3) / 4;
        return Math.round(bytes / 1024);
    }
};
