import './app.css';
import { mount } from 'svelte';
import Page from './+page.svelte';

const app = mount(Page, {
	target: document.getElementById('app')!
});

// モバイルデバイス等でWebアプリ（PWA）としてホーム画面に登録・インストール可能にする
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
			// ローカル開発時や非HTTPS環境で登録できない場合は無視
		});
	});
}

export default app;
