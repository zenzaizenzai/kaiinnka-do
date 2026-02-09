// レコメンドエンジン
const Recommender = {
    // 現在地から近いカードをレコメンド
    getTopCards(currentLat, currentLng, cards, limit = 4) {
        if (!currentLat || !currentLng) {
            return [];
        }

        // 位置情報が登録されているカードのみ
        const cardsWithLocations = cards.filter(
            card => card.locations && card.locations.length > 0
        );

        // 各カードの最短距離を計算
        const cardsWithDistance = cardsWithLocations.map(card => {
            const distances = card.locations.map(loc =>
                GPS.calculateDistance(currentLat, currentLng, loc.lat, loc.lng)
            );

            return {
                ...card,
                nearestDistance: Math.min(...distances),
                nearestLocation: card.locations[distances.indexOf(Math.min(...distances))]
            };
        });

        // 距離でソート
        cardsWithDistance.sort((a, b) => a.nearestDistance - b.nearestDistance);

        // 上位N件を返す
        return cardsWithDistance.slice(0, limit);
    },

    // カードが「近く」にあるか判定（スコアリング用）
    isNearby(distance) {
        // 300m以内なら「近く」
        return distance <= 300;
    },

    // 距離に基づくスコアを計算（0-100）
    calculateScore(distance) {
        // 100m以内: 100点
        // 500m: 50点
        // 1km以上: 0点
        if (distance <= 100) return 100;
        if (distance >= 1000) return 0;
        return Math.round(100 - (distance / 10));
    }
};
