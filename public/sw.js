/// <reference lib="webworker" />

// モバイル・デスクトップブラウザでの「アプリとしてインストール (PWA / ホーム画面に追加)」を有効化するための最小Service Worker
// 動的API (./api/*.ts) やDB更新に影響を与えないよう、通信はキャッシュせずそのままネットワークへスルーさせます
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

sw.addEventListener('install', () => {
	void sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(sw.clients.claim());
});

sw.addEventListener('fetch', () => {
	// デフォルトのネットワーク通信をそのまま行う
});
