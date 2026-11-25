<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type Item } from './lib/api';

	let items = $state<Item[]>([]);
	let loading = $state(true);
	let errorMessage = $state('');

	let title = $state('');
	let description = $state('');
	let useSampleImage = $state(true);
	let submitting = $state(false);

	async function loadItems() {
		loading = true;
		errorMessage = '';
		try {
			const data = await api.getItems();
			items = data.items;
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'データの取得に失敗しました';
		} finally {
			loading = false;
		}
	}

	async function handleAdd(event: SubmitEvent) {
		event.preventDefault();
		if (!title.trim() || submitting) return;

		submitting = true;
		errorMessage = '';
		try {
			await api.addItem({
				title: title.trim(),
				description: description.trim(),
				useSampleImage
			});
			title = '';
			description = '';
			await loadItems();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : '登録中にエラーが発生しました';
		} finally {
			submitting = false;
		}
	}

	async function handleDelete(id: number) {
		errorMessage = '';
		try {
			await api.deleteItem(id);
			await loadItems();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : '削除中にエラーが発生しました';
		}
	}

	onMount(() => {
		void loadItems();
	});
</script>

<main class="mx-auto max-w-3xl px-4 py-10">
	<header class="mb-8">
		<div class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
			Svelte 5 + Hono + Drizzle (SQLite)
		</div>
		<h1 class="mt-3 text-2xl font-bold tracking-tight text-slate-900">
			Web Tool Template サンプル
		</h1>
		<p class="mt-1 text-sm text-slate-600">
			相対パスによるファイルベースAPI呼び出し（<code class="rounded bg-slate-200/70 px-1.5 py-0.5 text-xs">./api/*.ts</code>）と、公開データ領域（<code class="rounded bg-slate-200/70 px-1.5 py-0.5 text-xs">./data/public/</code>）の参照サンプルです。
		</p>
	</header>

	{#if errorMessage}
		<div
			role="alert"
			class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
		>
			{errorMessage}
		</div>
	{/if}

	<section class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
		<h2 class="mb-4 text-base font-semibold text-slate-800">新規アイテムを追加</h2>
		<form onsubmit={handleAdd} class="space-y-4">
			<div>
				<label for="item-title" class="block text-sm font-medium text-slate-700">
					タイトル <span class="text-red-500">*</span>
				</label>
				<input
					id="item-title"
					type="text"
					bind:value={title}
					required
					placeholder="例: サンプルレコード"
					class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
				/>
			</div>

			<div>
				<label for="item-description" class="block text-sm font-medium text-slate-700">
					説明・メモ
				</label>
				<textarea
					id="item-description"
					rows="2"
					bind:value={description}
					placeholder="補足説明を入力（任意）"
					class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
				></textarea>
			</div>

			<div class="flex items-center justify-between pt-1">
				<label class="inline-flex items-center gap-2 text-sm text-slate-700">
					<input
						type="checkbox"
						bind:checked={useSampleImage}
						class="h-4 w-4 rounded border-slate-300 text-blue-600"
					/>
					<span><code>./data/public/sample-icon.svg</code> を紐づける</span>
				</label>

				<button
					type="submit"
					disabled={submitting || !title.trim()}
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? '追加中...' : '追加する'}
				</button>
			</div>
		</form>
	</section>

	<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-base font-semibold text-slate-800">
				登録済みアイテム一覧 ({items.length})
			</h2>
			<button
				type="button"
				onclick={loadItems}
				class="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
			>
				再読み込み
			</button>
		</div>

		{#if loading}
			<p class="py-8 text-center text-sm text-slate-500">読み込み中...</p>
		{:else if items.length === 0}
			<p class="py-8 text-center text-sm text-slate-500">
				アイテムがありません。上のフォームから追加してください。
			</p>
		{:else}
			<ul class="divide-y divide-slate-100">
				{#each items as item (item.id)}
					<li class="flex items-start justify-between gap-4 py-4">
						<div class="flex items-start gap-3">
							{#if item.imagePath}
								<img
									src={item.imagePath}
									alt={item.title}
									class="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
								/>
							{/if}
							<div>
								<h3 class="text-sm font-semibold text-slate-900">{item.title}</h3>
								{#if item.description}
									<p class="mt-0.5 text-sm text-slate-600">{item.description}</p>
								{/if}
								{#if item.imagePath}
									<p class="mt-1 text-xs text-slate-400">
										画像パス: <code>{item.imagePath}</code>
									</p>
								{/if}
							</div>
						</div>
						<button
							type="button"
							onclick={() => handleDelete(item.id)}
							class="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
						>
							削除
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>
