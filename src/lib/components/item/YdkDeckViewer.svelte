<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let {
		ydkData,
		onEdit,
		onDelete,
		assignedTags = []
	}: {
		ydkData: string;
		onEdit: () => void;
		onDelete: () => void;
		assignedTags?: Array<{ id: string; name: string; color?: string }>;
	} = $props();

	let cardCache = $state(new Map<string, any>());
	let loadingCards = $state(false);
	let enlargedCard = $state<any>(null);

	let parsedDeck = $derived.by(() => {
		try {
			return ydkData ? JSON.parse(ydkData) : null;
		} catch {
			return null;
		}
	});

	function getCardCounts(cards: string[]) {
		const counts = new Map<string, number>();
		for (const c of cards) counts.set(c, (counts.get(c) ?? 0) + 1);
		return counts;
	}

	function getUniqueCards(cards: string[]) {
		return [...new Set(cards)];
	}

	async function fetchCards(cardIds: string[]) {
		const unique = [...new Set(cardIds)].filter((id) => !cardCache.has(id));
		if (unique.length === 0) return;
		loadingCards = true;
		try {
			const res = await fetch(
				`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${unique.slice(0, 50).join(',')}`
			);
			if (res.ok) {
				const d = await res.json();
				const newCache = new Map(cardCache);
				for (const card of d.data ?? []) newCache.set(String(card.id), card);
				cardCache = newCache;
			}
		} catch {
		} finally {
			loadingCards = false;
		}
	}

	function exportYdk() {
		const deck = parsedDeck;
		if (!deck) return '';
		let ydk = '#created by MegaOrganize\n#main\n';
		for (const id of deck.mainDeck) ydk += `${id}\n`;
		ydk += '#extra\n';
		for (const id of deck.extraDeck) ydk += `${id}\n`;
		ydk += '!side\n';
		for (const id of deck.sideDeck) ydk += `${id}\n`;
		return ydk;
	}

	function downloadYdk() {
		const text = exportYdk();
		if (!text) return;
		const blob = new Blob([text], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'deck.ydk';
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleModalMousemove(e: MouseEvent) {
		const el = e.currentTarget as HTMLElement;
		const inner = el.querySelector('.ygo-card-inner') as HTMLElement;
		if (!inner) return;
		const rect = el.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width;
		const y = (e.clientY - rect.top) / rect.height;
		const tiltX = (y - 0.5) * -25;
		const tiltY = (x - 0.5) * 25;
		inner.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.05)`;
		inner.style.setProperty('--shine-x', `${x * 100}%`);
		inner.style.setProperty('--shine-y', `${y * 100}%`);
	}

	function handleModalMouseleave(e: MouseEvent) {
		const inner = (e.currentTarget as HTMLElement).querySelector('.ygo-card-inner') as HTMLElement;
		if (inner) {
			inner.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
			inner.style.removeProperty('--shine-x');
			inner.style.removeProperty('--shine-y');
		}
	}

	$effect(() => {
		const deck = parsedDeck;
		if (deck) {
			fetchCards([...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck]);
		}
	});
</script>

<div class="rounded-sm border border-border bg-surface">
	<div class="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
		<div class="flex items-center gap-2">
			<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">Deck Viewer</h2>
			{#if loadingCards}<Spinner size="sm" />{/if}
		</div>
		<div class="flex gap-1.5">
			<Button size="sm" variant="secondary" onclick={downloadYdk}
				><i class="fas fa-download text-[10px]"></i> Export</Button
			>
			<button
				type="button"
				class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm bg-muted px-3 text-xs font-medium text-fg-subdued hover:bg-border hover:text-fg"
				onclick={onEdit}
				aria-label="Edit"><i class="fas fa-pen text-[10px]"></i></button
			>
			<button
				type="button"
				class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm bg-error/15 px-3 text-xs font-medium text-error hover:bg-error/25"
				onclick={onDelete}
				aria-label="Delete"><i class="fas fa-trash text-[10px]"></i></button
			>
		</div>
	</div>
	<div class="p-4 sm:p-5">
		{#if parsedDeck}
			{@const deck = parsedDeck!}
			{#each [['Main Deck', deck.mainDeck], ['Extra Deck', deck.extraDeck], ['Side Deck', deck.sideDeck]] as [label, cards] (label)}
				{#if cards.length > 0}
					<div class="mb-5">
						<h3 class="mb-2 text-[11px] font-bold tracking-wider text-fg-subdued uppercase">
							{label} · {cards.length}
						</h3>
						<div
							class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12"
						>
							{#each getUniqueCards(cards) as cardId (cardId)}
								{@const count = getCardCounts(cards).get(cardId)}
								{@const card = cardCache.get(cardId)}
								<div
									class="ygo-card relative cursor-pointer"
									role="button"
									tabindex="0"
									onclick={() => card?.card_images?.[0] && (enlargedCard = card)}
									onkeydown={(e) => {
										if ((e.key === 'Enter' || e.key === ' ') && card?.card_images?.[0])
											enlargedCard = card;
									}}
								>
									{#if card?.card_images?.[0]}
										<div class="ygo-card-inner">
											<img
												src={card.card_images[0].image_url_small}
												alt={card.name}
												loading="lazy"
												class="w-full rounded-sm"
											/>
										</div>
									{:else}
										<div
											class="flex aspect-[2.5/3.5] w-full items-center justify-center rounded-sm bg-muted"
										>
											<span class="px-0.5 text-center font-mono text-[8px] text-fg-subdued"
												>{cardId}</span
											>
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

	{#if assignedTags.length > 0}
		<div class="border-t border-border px-4 py-3 sm:px-5">
			<div class="flex flex-wrap gap-1">
				{#each assignedTags as t}
					<span
						class="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white"
						style="background: {t.color || '#5A31F4'}">{t.name}</span
					>
				{/each}
			</div>
		</div>
	{/if}
</div>

{#if enlargedCard}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="card-modal-backdrop fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
		onclick={() => (enlargedCard = null)}
		onmousemove={handleModalMousemove}
		onmouseleave={handleModalMouseleave}
	>
		<div class="ygo-card-enlarged card-modal-content">
			<div class="ygo-card-inner">
				<img
					src={enlargedCard.card_images[0].image_url}
					alt={enlargedCard.name}
					class="max-h-[75vh] rounded-md"
					draggable="false"
				/>
			</div>
		</div>
		<div class="mt-5 text-center">
			<p class="text-sm font-semibold text-white">{enlargedCard.name}</p>
			<p class="mt-1 text-[10px] text-white/50">
				{enlargedCard.type} · {enlargedCard.race}
				{enlargedCard.attribute ? `· ${enlargedCard.attribute}` : ''}
			</p>
		</div>
	</div>
{/if}
