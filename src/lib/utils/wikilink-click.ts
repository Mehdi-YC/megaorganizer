import { goto } from '$app/navigation';

// Click-to-resolve for wikilinks rendered without a resolution map (list
// cards) or whose target dangles. One delegated listener at the app layout
// level covers every markdown surface. Resolved targets navigate; unknown
// targets offer to create the page or item.
export function initWikilinkClicks(): () => void {
	const onClick = async (event: MouseEvent) => {
		const el = (event.target as HTMLElement | null)?.closest?.('[data-wikilink]');
		if (!(el instanceof HTMLElement)) return;
		event.preventDefault();
		const target = el.dataset.wikilink;
		if (!target) return;

		const res = await fetch(`/api/links?target=${encodeURIComponent(target)}`);
		if (!res.ok) return;
		const { href } = (await res.json()) as { href: string | null };
		if (href) {
			// Server-built absolute paths; resolve() only handles route patterns.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(href);
			return;
		}

		if (!confirm(`Nothing named "${target}" exists yet. Create it?`)) return;
		const create = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'create', type: 'item', name: target })
		});
		if (!create.ok) return;
		const item = await create.json();
		const id = item?.id ?? item?.item?.id;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		if (id) await goto(`/app/item/${id}`);
	};

	document.addEventListener('click', onClick);
	return () => document.removeEventListener('click', onClick);
}
