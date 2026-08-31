<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import snarkdown from 'snarkdown';

	let { data } = $props();
	let item = $state(data.item);
	let children = $state(data.children ?? []);
	let allTags = $state<any[]>([]);
	let editing = $state(false);
	let name = $state(item?.name ?? '');
	let description = $state(item?.description ?? '');
	let content = $state(item?.markdown ?? '');
	let imageUrl = $state(item?.imageUrl ?? '');
	let videoUrl = $state(item?.videoUrl ?? '');
	let externalUrl = $state(item?.externalUrl ?? '');
	let tagIds = $state<string[]>((() => { try { return item?.tags ? JSON.parse(item.tags) : []; } catch { return []; } })());
	let ydkData = $state(item?.ydkData ?? '');
	let ydkInput = $state('');
	let cardCache = $state(new Map<string, any>());
	let loadingCards = $state(false);
	let ydkAccordionOpen = $state(false);
	let ydkEnabled = $state(!!item?.ydkData);
	let showAddChild = $state(false);
	let newChildName = $state('');
	let searchItemsQuery = $state('');
	let searchItemsResults = $state<any[]>([]);
	let enlargedCard = $state<any>(null);
	let showTagPicker = $state(false);
	let isSmallImage = $state(false);

	let isDeck = $derived(!!ydkData);
	let parsedDeck = $derived(() => {
		try { return ydkData ? JSON.parse(ydkData) : null; } catch { return null; }
	});
	let assignedTags = $derived(allTags.filter((t) => tagIds.includes(t.id)));
	let renderedContent = $derived(content ? snarkdown(content) : '');

	onMount(() => {
		if (!item?.imageUrl) return;
		const img = new Image();
		img.onload = () => { if (img.naturalWidth < 200 || img.naturalHeight < 150) isSmallImage = true; };
		img.src = item.imageUrl;
	});

	function handleModalMousemove(e: MouseEvent) {
		const el = e.currentTarget as HTMLElement;
		const inner = el.querySelector('.ygo-card-inner') as HTMLElement;
		if (!inner) return;
		const rect = el.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width - 0.5;
		const y = (e.clientY - rect.top) / rect.height - 0.5;
		inner.style.transform = `rotateY(${x * 15}deg) rotateX(${-y * 15}deg) scale(1.02)`;
	}

	function handleModalMouseleave(e: MouseEvent) {
		const inner = (e.currentTarget as HTMLElement).querySelector('.ygo-card-inner') as HTMLElement;
		if (inner) inner.style.transform = '';
	}

	async function fetchCards(cardIds: string[]) {
		const unique = [...new Set(cardIds)].filter((id) => !cardCache.has(id));
		if (unique.length === 0) return;
		loadingCards = true;
		try {
			const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${unique.slice(0, 50).join(',')}`);
			if (res.ok) {
				const d = await res.json();
				const newCache = new Map(cardCache);
				for (const card of d.data ?? []) newCache.set(String(card.id), card);
				cardCache = newCache;
			}
		} catch {} finally { loadingCards = false; }
	}

	function parseYdk(text: string) {
		const lines = text.split('\n').map((l) => l.trim());
		let mainDeck: string[] = [], extraDeck: string[] = [], sideDeck: string[] = [], section = '';
		for (const line of lines) {
			if (line === '#main') section = 'main';
			else if (line === '#extra') section = 'extra';
			else if (line === '!side') section = 'side';
			else if (line && /^\d+$/.test(line)) {
				if (section === 'main') mainDeck.push(line);
				else if (section === 'extra') extraDeck.push(line);
				else if (section === 'side') sideDeck.push(line);
			}
		}
		return { mainDeck, extraDeck, sideDeck };
	}

	function getCardCounts(cards: string[]) {
		const counts = new Map<string, number>();
		for (const c of cards) counts.set(c, (counts.get(c) ?? 0) + 1);
		return counts;
	}

	function getUniqueCards(cards: string[]) { return [...new Set(cards)]; }

	function applyYdkPaste() {
		if (!ydkInput.trim()) return;
		const parsed = parseYdk(ydkInput);
		ydkData = JSON.stringify(parsed);
		ydkEnabled = true;
		ydkInput = '';
		fetchCards([...parsed.mainDeck, ...parsed.extraDeck, ...parsed.sideDeck]);
	}

	function handleYdkFileImport(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => { ydkInput = reader.result as string; applyYdkPaste(); };
		reader.readAsText(file);
		input.value = '';
	}

	function clearYdk() { ydkData = ''; ydkEnabled = false; ydkInput = ''; }

	function exportYdk() {
		const deck = parsedDeck();
		if (!deck) return;
		let ydk = '#created by MegaOrganize\n#main\n';
		for (const id of deck.mainDeck) ydk += `${id}\n`;
		ydk += '#extra\n';
		for (const id of deck.extraDeck) ydk += `${id}\n`;
		ydk += '!side\n';
		for (const id of deck.sideDeck) ydk += `${id}\n`;
		return ydk;
	}

	function downloadYdk() {
		const text = ydkInput || exportYdk();
		if (!text) return;
		const blob = new Blob([text], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = `${name || 'deck'}.ydk`; a.click();
		URL.revokeObjectURL(url);
	}

	let ydkEditText = $derived(ydkInput || (isDeck ? (exportYdk() || '') : ''));

	async function saveItem() {
		if (!item) return;
		const body: any = { id: item.id, name, description, markdown: content, imageUrl, videoUrl, externalUrl, tags: JSON.stringify(tagIds) };
		if (ydkEnabled && ydkData) body.ydkData = ydkData;
		else if (!ydkEnabled) body.ydkData = '';
		const res = await fetch('/api/tree', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		if (res.ok) { editing = false; item = { ...item, ...body }; }
	}

	async function deleteItem() {
		if (!confirm('Delete this item?')) return;
		const res = await fetch('/api/tree', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item?.id }) });
		if (res.ok) goto('/app/library');
	}

	function toggleTag(tagId: string) {
		if (tagIds.includes(tagId)) tagIds = tagIds.filter((id) => id !== tagId);
		else tagIds = [...tagIds, tagId];
	}

	async function searchToAdd() {
		if (!searchItemsQuery.trim()) { searchItemsResults = []; return; }
		const res = await fetch(`/api/tree?search=${encodeURIComponent(searchItemsQuery)}`);
		if (res.ok) {
			const all = await res.json();
			searchItemsResults = all.filter((r: any) => r.type === 'item' && r.id !== item?.id);
		}
	}

	async function addChildExisting(childId: string) {
		if (!item) return;
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'addChild', parentType: 'item', parentId: item.id, childType: 'item', childId })
		});
		if (res.ok) {
			const el = await fetch(`/api/tree?id=${childId}`).then(r => r.json());
			children = [...children, el];
			searchItemsQuery = '';
			searchItemsResults = [];
			showAddChild = false;
		}
	}

	async function addChildNew() {
		if (!newChildName.trim() || !item) return;
		const createRes = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'create', type: 'item', name: newChildName })
		});
		if (createRes.ok) {
			const child = await createRes.json();
			const linkRes = await fetch('/api/tree', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'addChild', parentType: 'item', parentId: item.id, childType: 'item', childId: child.id })
			});
			if (linkRes.ok) { children = [...children, child]; newChildName = ''; showAddChild = false; }
		}
	}

	async function removeChild(childId: string) {
		if (!item) return;
		const res = await fetch('/api/tree', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'removeChild', parentType: 'item', parentId: item.id, childId })
		});
		if (res.ok) children = children.filter((c: any) => c.id !== childId);
	}

	$effect(() => {
		fetch('/api/tags').then(r => r.json()).then((t) => { allTags = t; });
	});

	$effect(() => {
		if (isDeck && parsedDeck()) {
			const deck = parsedDeck()!;
			fetchCards([...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck]);
		}
	});
</script>

<svelte:head><title>{item?.name || 'Item'} - MegaOrganize</title></svelte:head>

{#if !item}
	<div class="flex h-full items-center justify-center">
		<div class="rounded-sm border border-border bg-surface py-16 text-center px-8">
			<i class="fas fa-exclamation-triangle mb-3 text-3xl text-fg-subdued"></i>
			<p class="text-sm text-fg-subdued">Item not found</p>
			<a href="/app/library" class="mt-3 inline-block text-sm text-primary hover:text-primary-hover">Back to Library</a>
		</div>
	</div>
{:else}
	<!-- Header bar -->
	<div class="border-b border-border bg-bg-subdued px-4 sm:px-6 py-2">
		<div class="flex items-center gap-1.5 text-[11px] text-fg-subdued">
			<a href="javascript:history.back()" class="hover:text-primary"><i class="fas fa-arrow-left text-[10px]"></i></a>
			<i class="fas fa-chevron-right text-[8px]"></i>
			<span class="text-fg truncate">{item.name}</span>
		</div>
	</div>

	<!-- DECK VIEW -->
	{#if isDeck && !editing}
		<div class="p-4 sm:p-6">
			<div class="mb-4 sm:mb-6 flex items-center justify-between">
				<h1 class="text-lg font-semibold text-fg-accent">{item.name}</h1>
				<div class="flex gap-1.5 shrink-0">
					<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i></button>
					<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-error/15 px-4 text-sm font-medium text-error hover:bg-error/25" onclick={deleteItem}><i class="fas fa-trash text-xs"></i></button>
				</div>
			</div>

			<div class="rounded-sm border border-border bg-surface">
				<div class="border-b border-border px-4 sm:px-5 py-3 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Deck Viewer</h2>
						{#if loadingCards}<span class="text-xs text-fg-subdued">Loading...</span>{/if}
					</div>
					<button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-muted px-3 text-xs font-medium text-fg-subdued hover:bg-border hover:text-fg" onclick={downloadYdk}><i class="fas fa-download text-[10px]"></i> Export</button>
				</div>
				<div class="p-4 sm:p-5">
					{#if parsedDeck()}
						{@const deck = parsedDeck()!}
						{#each [['Main Deck', deck.mainDeck], ['Extra Deck', deck.extraDeck], ['Side Deck', deck.sideDeck]] as [label, cards]}
							{#if cards.length > 0}
								<div class="mb-5">
									<h3 class="mb-2 text-[11px] font-bold text-fg-subdued uppercase tracking-wider">{label} · {cards.length}</h3>
									<div class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
										{#each getUniqueCards(cards) as cardId}
											{@const count = getCardCounts(cards).get(cardId)}
											{@const card = cardCache.get(cardId)}
											<div
												class="ygo-card relative"
												role="button"
												tabindex="0"
												onclick={() => card?.card_images?.[0] && (enlargedCard = card)}
												onkeydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && card?.card_images?.[0]) enlargedCard = card; }}
											>
												{#if card?.card_images?.[0]}
													<div class="ygo-card-inner">
														<img src={card.card_images[0].image_url_small} alt={card.name} loading="lazy" class="w-full rounded-sm" />
													</div>
												{:else}
													<div class="aspect-[2.5/3.5] w-full rounded-sm bg-muted flex items-center justify-center">
														<span class="text-[8px] text-fg-subdued font-mono text-center px-0.5">{cardId}</span>
													</div>
												{/if}
											{#if count && count > 1}
												<div class="ygo-count-badge">
													<div class="ygo-count-rects">
														{#each { length: Math.min(count, 3) } as _}
															<div class="ygo-count-rect"></div>
														{/each}
													</div>
													<div class="ygo-count-label">x{count}</div>
												</div>
											{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			</div>

			<!-- Tags under deck -->
			<div class="mt-4 rounded-sm border border-border bg-surface p-4">
				<div class="flex flex-wrap gap-1">
					{#each assignedTags as t}
						<span class="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white" style="background: {t.color || '#5A31F4'}">{t.name}</span>
					{:else}
						<p class="text-[11px] text-fg-subdued">No tags</p>
					{/each}
				</div>
			</div>
		</div>

	<!-- NON-DECK VIEW -->
	{:else}
		<!-- Mobile: single column -->
		<div class="lg:hidden p-4 sm:p-6 space-y-4">
			<!-- Title + actions -->
			<div class="flex items-center gap-3">
				<div class="flex-1 min-w-0">
					{#if editing}
						<input type="text" bind:value={name} class="w-full border-b-2 border-primary bg-transparent text-lg font-semibold text-fg-accent focus:outline-none" />
					{:else}
						<h1 class="text-lg font-semibold text-fg-accent truncate">{item.name}</h1>
					{/if}
					<p class="text-xs text-fg-subdued capitalize">{item.type}</p>
				</div>
				<div class="flex gap-1.5 shrink-0">
					{#if editing}
						<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover" onclick={saveItem}><i class="fas fa-check text-xs"></i> Save</button>
						<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = false)}>Cancel</button>
					{:else}
						<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i></button>
						<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-error/15 px-4 text-sm font-medium text-error hover:bg-error/25" onclick={deleteItem}><i class="fas fa-trash text-xs"></i></button>
					{/if}
				</div>
			</div>

			<!-- Details -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<div class="flex items-start gap-3">
					{#if item.imageUrl}
						{#if isSmallImage}
							<div class="relative h-14 w-14 shrink-0 overflow-hidden rounded">
								<img src={item.imageUrl} alt="" class="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-60" />
								<img src={item.imageUrl} alt={item.name} class="relative h-full w-full object-contain" />
							</div>
						{:else}
							<img src={item.imageUrl} alt={item.name} class="h-14 w-14 rounded object-cover shrink-0" />
						{/if}
					{:else}
						<div class="flex h-14 w-14 items-center justify-center rounded-sm bg-muted shrink-0">
							<i class="fas fa-cube text-lg text-fg-subdued"></i>
						</div>
					{/if}
					<dl class="flex-1 min-w-0 space-y-1 text-xs">
						<div class="flex justify-between"><dt class="text-fg-subdued">Type</dt><dd class="capitalize text-fg">{item.type}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Created</dt><dd class="text-fg">{new Date(item.createdAt).toLocaleDateString()}</dd></div>
						<div class="flex justify-between"><dt class="text-fg-subdued">Updated</dt><dd class="text-fg">{new Date(item.updatedAt).toLocaleDateString()}</dd></div>
					</dl>
				</div>
			</div>

			<!-- Content -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Content</h3>
				{#if editing}
					<textarea bind:value={content} rows="10" class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 text-sm text-fg font-mono placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="Write content (markdown supported)..."></textarea>
				{:else if content}
					<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedContent}</div>
				{:else}
					<p class="text-xs text-fg-subdued text-center py-4">No content yet</p>
				{/if}
			</div>

			<!-- Tags -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Tags</h3>
					{#if editing}
						<button type="button" class="text-[10px] text-primary hover:text-primary-hover" onclick={() => (showTagPicker = !showTagPicker)}>
							{showTagPicker ? 'Done' : 'Edit'}
						</button>
					{/if}
				</div>
				{#if showTagPicker && editing}
					<div class="mb-3 space-y-1 max-h-40 overflow-y-auto">
						{#each allTags as t}
							<button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted {tagIds.includes(t.id) ? 'bg-muted' : ''}" onclick={() => toggleTag(t.id)}>
								<div class="h-3 w-3 shrink-0 rounded-full" style="background: {t.color || '#5A31F4'}"></div>
								<span class="flex-1 text-fg">{t.name}</span>
								{#if tagIds.includes(t.id)}<i class="fas fa-check text-[9px] text-primary"></i>{/if}
							</button>
						{:else}
							<p class="text-[11px] text-fg-subdued italic">No tags. Create some in <a href="/app/tags" class="text-primary hover:text-primary-hover">Tags</a> page.</p>
						{/each}
					</div>
				{/if}
				<div class="flex flex-wrap gap-1">
					{#each assignedTags as t}
						<span class="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white" style="background: {t.color || '#5A31F4'}">{t.name}</span>
					{:else}
						<p class="text-[11px] text-fg-subdued">{editing ? 'No tags assigned' : 'No tags'}</p>
					{/each}
				</div>
			</div>

			<!-- Edit-only fields -->
			{#if editing}
				<div class="rounded-sm border border-border bg-surface p-4 space-y-3">
					<div class="flex flex-col gap-1.5">
						<label for="imageUrl" class="text-xs font-semibold text-fg-accent tracking-wide">Image URL</label>
						<input type="url" id="imageUrl" bind:value={imageUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="videoUrl" class="text-xs font-semibold text-fg-accent tracking-wide">Video URL</label>
						<input type="url" id="videoUrl" bind:value={videoUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="externalUrl" class="text-xs font-semibold text-fg-accent tracking-wide">External URL</label>
						<input type="url" id="externalUrl" bind:value={externalUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-semibold text-fg-accent tracking-wide">YDK Deck</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input type="checkbox" bind:checked={ydkEnabled} class="h-4 w-4 rounded-sm border-border bg-bg text-primary focus:ring-primary" />
							<span class="text-sm text-fg">Enable YDK</span>
							{#if isDeck && !ydkEnabled}
								<button type="button" class="text-xs text-error hover:text-error/80" onclick={clearYdk}>Clear</button>
							{/if}
						</label>
						{#if ydkEnabled}
							<textarea value={ydkEditText} oninput={(e) => { ydkInput = (e.target as HTMLTextAreaElement).value; }} rows="5" class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 font-mono text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="#main&#10;12345678&#10;#extra&#10;87654321&#10;!side&#10;11111111"></textarea>
							<div class="flex items-center gap-3">
								<button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover" onclick={applyYdkPaste}><i class="fas fa-paste text-[10px]"></i> Apply</button>
								<label class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border cursor-pointer"><i class="fas fa-upload text-[10px]"></i> Import .ydk<input type="file" accept=".ydk,.txt" class="hidden" onchange={handleYdkFileImport} /></label>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Video (non-edit) -->
			{#if item.videoUrl && !editing}
				<div class="rounded-sm border border-border bg-surface p-4">
					<div class="aspect-video"><iframe src={item.videoUrl} class="h-full w-full rounded-sm" allowfullscreen></iframe></div>
				</div>
			{/if}

			<!-- External link (non-edit) -->
			{#if item.externalUrl && !editing}
				<div class="rounded-sm border border-border bg-surface p-4">
					<a href={item.externalUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover"><i class="fas fa-external-link text-[10px]"></i> {item.externalUrl}</a>
				</div>
			{/if}

			<!-- Child Items -->
			<div class="rounded-sm border border-border bg-surface p-4">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Child Items ({children.length})</h3>
					<button type="button" class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-primary px-2.5 text-[11px] font-medium text-white hover:bg-primary-hover" onclick={() => (showAddChild = !showAddChild)}><i class="fas fa-plus text-[9px]"></i> Add</button>
				</div>
				{#if showAddChild}
					<div class="mb-3 space-y-2">
						<input type="search" bind:value={searchItemsQuery} oninput={searchToAdd} placeholder="Search existing items..." class="w-full h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
						{#if searchItemsResults.length > 0}
							<div class="max-h-32 overflow-y-auto space-y-0.5">
								{#each searchItemsResults.slice(0, 5) as result}
									<button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] hover:bg-muted" onclick={() => addChildExisting(result.id)}>
										<i class="fas fa-cube w-3 text-center text-fg-subdued"></i> {result.name}
									</button>
								{/each}
							</div>
						{/if}
						<div class="flex gap-1.5">
							<input type="text" bind:value={newChildName} placeholder="Or create new item" class="flex-1 min-w-0 h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
							<button type="button" class="h-8 shrink-0 rounded-sm bg-primary px-2 text-xs text-white hover:bg-primary-hover" onclick={addChildNew}>Create</button>
							<button type="button" class="h-8 shrink-0 rounded-sm bg-muted px-2 text-xs text-fg hover:bg-border" onclick={() => { showAddChild = false; newChildName = ''; searchItemsQuery = ''; }}>Cancel</button>
						</div>
					</div>
				{/if}
				{#if children.length > 0}
					<div class="space-y-1">
						{#each children as child}
							<div class="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted">
								<a href="/app/item/{child.id}" class="flex flex-1 items-center gap-2 text-fg">
									<i class="fas fa-cube w-3 text-center text-fg-subdued"></i>
									{child.name}
								</a>
								<button type="button" class="h-5 w-5 items-center justify-center rounded-sm text-fg-subdued hover:text-error hidden group-hover:flex" onclick={() => removeChild(child.id)}><i class="fas fa-times text-[9px]"></i></button>
							</div>
						{/each}
					</div>
				{:else if !showAddChild}
					<p class="text-xs text-fg-subdued text-center py-2">No child items yet.</p>
				{/if}
			</div>
		</div>

		<!-- Desktop: content left + sidebar right -->
		<div class="hidden lg:flex gap-0 min-h-[calc(100vh-49px)]">
			<!-- Main content area -->
			<div class="flex-1 p-8 overflow-y-auto">
				<!-- Title + actions -->
				<div class="flex items-center gap-3 mb-6">
					{#if editing}
						<input type="text" bind:value={name} class="flex-1 border-b-2 border-primary bg-transparent text-xl font-semibold text-fg-accent focus:outline-none" />
					{:else}
						<h1 class="flex-1 text-xl font-semibold text-fg-accent">{item.name}</h1>
					{/if}
					<div class="flex gap-1.5 shrink-0">
						{#if editing}
							<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover" onclick={saveItem}><i class="fas fa-check text-xs"></i> Save</button>
							<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = false)}>Cancel</button>
						{:else}
							<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editing = true)}><i class="fas fa-pen text-xs"></i> Edit</button>
							<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-error/15 px-4 text-sm font-medium text-error hover:bg-error/25" onclick={deleteItem}><i class="fas fa-trash text-xs"></i></button>
						{/if}
					</div>
				</div>

				<!-- Content -->
				<div class="mb-6">
					{#if editing}
						<textarea bind:value={content} rows="20" class="w-full rounded-sm border border-border bg-surface px-4 py-3 text-sm text-fg font-mono placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="Write content (markdown supported)..."></textarea>
					{:else if content}
						<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedContent}</div>
					{:else}
						<div class="rounded-sm border border-dashed border-border bg-surface py-16 text-center">
							<i class="fas fa-file-alt mb-2 text-2xl text-fg-subdued/40"></i>
							<p class="text-sm text-fg-subdued">No content yet</p>
							<p class="mt-1 text-xs text-fg-subdued">Click Edit to add content</p>
						</div>
					{/if}
				</div>

				<!-- Video (non-edit) -->
				{#if item.videoUrl && !editing}
					<div class="mb-6 rounded-sm border border-border bg-surface p-4">
						<div class="aspect-video"><iframe src={item.videoUrl} class="h-full w-full rounded-sm" allowfullscreen></iframe></div>
					</div>
				{/if}

				<!-- Child Items -->
				<div class="rounded-sm border border-border bg-surface p-5">
					<div class="flex items-center justify-between mb-3">
						<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Child Items ({children.length})</h3>
						<button type="button" class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-primary px-2.5 text-[11px] font-medium text-white hover:bg-primary-hover" onclick={() => (showAddChild = !showAddChild)}><i class="fas fa-plus text-[9px]"></i> Add</button>
					</div>
					{#if showAddChild}
						<div class="mb-3 space-y-2">
							<input type="search" bind:value={searchItemsQuery} oninput={searchToAdd} placeholder="Search existing items..." class="w-full h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
							{#if searchItemsResults.length > 0}
								<div class="max-h-32 overflow-y-auto space-y-0.5">
									{#each searchItemsResults.slice(0, 5) as result}
										<button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] hover:bg-muted" onclick={() => addChildExisting(result.id)}>
											<i class="fas fa-cube w-3 text-center text-fg-subdued"></i> {result.name}
										</button>
									{/each}
								</div>
							{/if}
							<div class="flex gap-1.5">
								<input type="text" bind:value={newChildName} placeholder="Or create new item" class="flex-1 min-w-0 h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
								<button type="button" class="h-8 shrink-0 rounded-sm bg-primary px-2 text-xs text-white hover:bg-primary-hover" onclick={addChildNew}>Create</button>
								<button type="button" class="h-8 shrink-0 rounded-sm bg-muted px-2 text-xs text-fg hover:bg-border" onclick={() => { showAddChild = false; newChildName = ''; searchItemsQuery = ''; }}>Cancel</button>
							</div>
						</div>
					{/if}
					{#if children.length > 0}
						<div class="grid gap-1 grid-cols-1 sm:grid-cols-2">
							{#each children as child}
								<div class="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted">
									<a href="/app/item/{child.id}" class="flex flex-1 items-center gap-2 text-fg">
										<i class="fas fa-cube w-3 text-center text-fg-subdued"></i>
										{child.name}
									</a>
									<button type="button" class="h-5 w-5 items-center justify-center rounded-sm text-fg-subdued hover:text-error hidden group-hover:flex" onclick={() => removeChild(child.id)}><i class="fas fa-times text-[9px]"></i></button>
								</div>
							{/each}
						</div>
					{:else if !showAddChild}
						<p class="text-xs text-fg-subdued text-center py-4">No child items yet.</p>
					{/if}
				</div>
			</div>

			<!-- Right sidebar -->
			<div class="w-72 xl:w-80 shrink-0 border-l border-border bg-surface p-5 space-y-4 overflow-y-auto">
				<!-- Details -->
				<div>
					<h3 class="mb-3 text-xs font-semibold text-fg-accent uppercase tracking-wide">Details</h3>
					<div class="flex items-start gap-3">
						{#if item.imageUrl}
							{#if isSmallImage}
								<div class="relative h-16 w-16 shrink-0 overflow-hidden rounded">
									<img src={item.imageUrl} alt="" class="absolute inset-0 h-full w-full scale-125 object-cover blur-xl opacity-60" />
									<img src={item.imageUrl} alt={item.name} class="relative h-full w-full object-contain" />
								</div>
							{:else}
								<img src={item.imageUrl} alt={item.name} class="h-16 w-16 rounded object-cover shrink-0" />
							{/if}
						{:else}
							<div class="flex h-16 w-16 items-center justify-center rounded-sm bg-muted shrink-0">
								<i class="fas fa-cube text-lg text-fg-subdued"></i>
							</div>
						{/if}
						<dl class="flex-1 min-w-0 space-y-1.5 text-xs">
							<div class="flex justify-between"><dt class="text-fg-subdued">Type</dt><dd class="capitalize text-fg">{item.type}</dd></div>
							<div class="flex justify-between"><dt class="text-fg-subdued">Created</dt><dd class="text-fg">{new Date(item.createdAt).toLocaleDateString()}</dd></div>
							<div class="flex justify-between"><dt class="text-fg-subdued">Updated</dt><dd class="text-fg">{new Date(item.updatedAt).toLocaleDateString()}</dd></div>
						</dl>
					</div>
				</div>

				<!-- Tags -->
				<div>
					<div class="flex items-center justify-between mb-3">
						<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Tags</h3>
						{#if editing}
							<button type="button" class="text-[10px] text-primary hover:text-primary-hover" onclick={() => (showTagPicker = !showTagPicker)}>
								{showTagPicker ? 'Done' : 'Edit'}
							</button>
						{/if}
					</div>
					{#if showTagPicker && editing}
						<div class="mb-3 space-y-1 max-h-40 overflow-y-auto">
							{#each allTags as t}
								<button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted {tagIds.includes(t.id) ? 'bg-muted' : ''}" onclick={() => toggleTag(t.id)}>
									<div class="h-3 w-3 shrink-0 rounded-full" style="background: {t.color || '#5A31F4'}"></div>
									<span class="flex-1 text-fg">{t.name}</span>
									{#if tagIds.includes(t.id)}<i class="fas fa-check text-[9px] text-primary"></i>{/if}
								</button>
							{:else}
								<p class="text-[11px] text-fg-subdued italic">No tags. Create some in <a href="/app/tags" class="text-primary hover:text-primary-hover">Tags</a> page.</p>
							{/each}
						</div>
					{/if}
					<div class="flex flex-wrap gap-1">
						{#each assignedTags as t}
							<span class="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white" style="background: {t.color || '#5A31F4'}">{t.name}</span>
						{:else}
							<p class="text-[11px] text-fg-subdued">{editing ? 'No tags assigned' : 'No tags'}</p>
						{/each}
					</div>
				</div>

				<!-- External link (non-edit) -->
				{#if item.externalUrl && !editing}
					<div>
						<h3 class="mb-2 text-xs font-semibold text-fg-accent uppercase tracking-wide">Link</h3>
						<a href={item.externalUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-xs text-primary hover:text-primary-hover break-all"><i class="fas fa-external-link text-[10px] shrink-0"></i> {item.externalUrl}</a>
					</div>
				{/if}

				<!-- Edit-only fields -->
				{#if editing}
					<div class="space-y-3">
						<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Edit Fields</h3>
						<div class="flex flex-col gap-1.5">
							<label for="imageUrl" class="text-[10px] font-semibold text-fg-subdued tracking-wide">Image URL</label>
							<input type="url" id="imageUrl" bind:value={imageUrl} class="h-[32px] w-full rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
						</div>
						<div class="flex flex-col gap-1.5">
							<label for="videoUrl" class="text-[10px] font-semibold text-fg-subdued tracking-wide">Video URL</label>
							<input type="url" id="videoUrl" bind:value={videoUrl} class="h-[32px] w-full rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
						</div>
						<div class="flex flex-col gap-1.5">
							<label for="externalUrl" class="text-[10px] font-semibold text-fg-subdued tracking-wide">External URL</label>
							<input type="url" id="externalUrl" bind:value={externalUrl} class="h-[32px] w-full rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-[10px] font-semibold text-fg-subdued tracking-wide">YDK Deck</label>
							<label class="flex items-center gap-2 cursor-pointer">
								<input type="checkbox" bind:checked={ydkEnabled} class="h-4 w-4 rounded-sm border-border bg-bg text-primary focus:ring-primary" />
								<span class="text-sm text-fg">Enable YDK</span>
								{#if isDeck && !ydkEnabled}
									<button type="button" class="text-xs text-error hover:text-error/80" onclick={clearYdk}>Clear</button>
								{/if}
							</label>
							{#if ydkEnabled}
							<textarea value={ydkEditText} oninput={(e) => { ydkInput = (e.target as HTMLTextAreaElement).value; }} rows="5" class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 font-mono text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="#main&#10;12345678&#10;#extra&#10;87654321&#10;!side&#10;11111111"></textarea>
								<div class="flex items-center gap-3">
									<button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover" onclick={applyYdkPaste}><i class="fas fa-paste text-[10px]"></i> Apply</button>
									<label class="inline-flex h-8 items-center gap-1.5 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border cursor-pointer"><i class="fas fa-upload text-[10px]"></i> Import .ydk<input type="file" accept=".ydk,.txt" class="hidden" onchange={handleYdkFileImport} /></label>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/if}

{#if enlargedCard}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="card-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay" onclick={() => (enlargedCard = null)}>
		<div class="card-modal-content relative max-w-md w-full mx-4" onclick={(e) => e.stopPropagation()}>
			<button type="button" class="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border text-fg-subdued hover:text-fg hover:bg-muted shadow-lg" onclick={() => (enlargedCard = null)}>
				<i class="fas fa-times text-xs"></i>
			</button>
			{#if enlargedCard.card_images?.[0]}
				<div class="ygo-card ygo-card-large" onmousemove={handleModalMousemove} onmouseleave={handleModalMouseleave}>
					<div class="ygo-card-inner rounded-lg overflow-hidden shadow-2xl">
						<img src={enlargedCard.card_images[0].image_url} alt={enlargedCard.name} class="w-full" />
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
