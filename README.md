# 💳 カードウォレット

GPSで自動レコメンド！ポイントカード・会員カードをスマホで管理するPWA

## ✨ 主な機能

### 1. 2in1カード撮影
- **表面**と**バーコード**を別々に撮影
- 自動合成して1枚の画像に
- **イラスト風圧縮**: 〜50KB以下に軽量化（スマホ容量を圧迫しない）

### 2. GPS連動レコメンド
- アプリ起動時に現在地を自動取得
- 近くで使えるカードを**上位4件**パネル表示
- **チェーン店対応**: 1つのカードに複数店舗の位置を登録可能

### 3. PWA（Progressive Web App）
- **オフライン動作**: IndexedDBでデータ保存、電波なしでも即表示
- **ホーム画面起動**: アプリのようにアイコンから一発起動
- **インストール不要**: ブラウザだけで動作

## 🚀 使い方

### ローカルで起動

```bash
# リポジトリをクローン
git clone https://github.com/zenzaizenzai/kaiinnka-do.git
cd kaiinnka-do

# サーバー起動（HTTPSが必要な場合はlocalhostで）
npx serve .
```

ブラウザで `http://localhost:3000` を開く

### カード追加

1. 右下の「＋」ボタンをタップ
2. カメラで表面を撮影
3. 続けてバーコードを撮影
4. カード名を入力して保存

### GPS連動

1. 位置情報の許可を求められたら「許可」
2. カード詳細から「📍 現在地をこのカードに追加」
3. 次回起動時、近くのカードが自動表示

## 📁 ファイル構成

```
kaiinnka-do/
├── index.html              # メインHTML
├── style.css               # ダークテーマUI
├── app.js                  # メインロジック
├── db.js                   # IndexedDB管理
├── camera.js               # カメラ制御
├── image-processor.js      # 画像合成・圧縮
├── gps.js                  # GPS取得・距離計算
├── recommender.js          # レコメンドエンジン
├── manifest.json           # PWAマニフェスト
├── sw.js                   # Service Worker
└── icons/                  # アプリアイコン
```

## 🛠️ 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **ストレージ**: IndexedDB
- **API**: Geolocation API, MediaDevices API
- **PWA**: Service Worker, Web App Manifest

## 📱 動作環境

- **推奨**: Chrome / Edge / Safari（最新版）
- **GPS**: HTTPS環境またはlocalhost
- **カメラ**: HTTPS環境またはlocalhost

## 🎨 デザイン

- ダークテーマ
- グラスモーフィズム
- グラデーション（紫→ピンク）
- スムーズなアニメーション

## 📝 ライセンス

MIT License

## 🙏 謝辞

このアプリは、ポイントカードの管理を簡単にするために作成されました。
