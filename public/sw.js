// モバイル・デスクトップブラウザでの「アプリとしてインストール (PWA / ホーム画面に追加)」を有効化するための最小Service Worker
// 動的API (./api/*.ts) やDB更新に影響を与えないよう、通信はキャッシュせずそのままネットワークへスルーさせます
self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
	// デフォルトのネットワーク通信をそのまま行う
});
