<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import QuickCapture from '$lib/components/QuickCapture.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { page } from '$app/state';
	import { startReminderPolling } from '$lib/utils/notifications';
	import { initWikilinkClicks } from '$lib/utils/wikilink-click';
	import { themeState } from '$lib/utils/theme.svelte';
	import type { CategoryWithPages, EnabledFeatures } from '$lib/types';

	let {
		children,
		data
	}: {
		children: Snippet;
		data: {
			categories?: CategoryWithPages[];
			invoiceYears?: number[];
			enabledFeatures?: EnabledFeatures;
			user?: { name: string; email: string; image?: string | null };
		};
	} = $props();
	let sidebarOpen = $state(false);
	let drawerEl = $state<HTMLDivElement | null>(null);
	let isMobile = $state(false);

	// Track the breakpoint so the off-canvas drawer can be made inert while it
	// is closed. Without this the translated-off-screen nav stays in the tab
	// order on phones.
	$effect(() => {
		const query = window.matchMedia('(max-width: 1023px)');
		isMobile = query.matches;
		const onChange = (e: MediaQueryListEvent) => (isMobile = e.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	});

	// On open: focus the first item inside the drawer. On close: give focus back
	// to whatever had it (usually the menu button).
	$effect(() => {
		if (!isMobile || !sidebarOpen) return;
		const previous = document.activeElement as HTMLElement | null;
		const first = [...(drawerEl?.querySelectorAll<HTMLElement>('a[href], button') ?? [])].find(
			(el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0
		);
		(first ?? drawerEl)?.focus();
		return () => previous?.focus?.();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && sidebarOpen) sidebarOpen = false;
	}

	onMount(() => {
		const stopWikilinks = initWikilinkClicks();
		// While the app is open: poll for due reminders and notify
		const stopReminders = data.user ? startReminderPolling() : null;
		return () => {
			stopWikilinks();
			stopReminders?.();
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-full w-full overflow-hidden bg-bg text-fg">
	<a
		href="#main-content"
		class="sr-only rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
	>
		Skip to content
	</a>

	{#if sidebarOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-40 bg-surface-overlay/80 backdrop-blur-xs lg:hidden"
			onclick={() => (sidebarOpen = false)}
		></div>
	{/if}

	<div
		bind:this={drawerEl}
		inert={isMobile && !sidebarOpen}
		tabindex="-1"
		class="no-print fixed z-50 h-full lg:static lg:z-auto {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full lg:translate-x-0'} transition-transform duration-200"
	>
		<Sidebar
			categories={data.categories ?? []}
			invoiceYears={data.invoiceYears ?? []}
			enabledFeatures={data.enabledFeatures}
			user={data.user}
			onNavigate={() => (sidebarOpen = false)}
		/>
	</div>

	<main
		id="main-content"
		tabindex="-1"
		class="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-bg"
	>
		<!-- Modern Mobile Top Bar -->
		<div
			class="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-md lg:hidden"
		>
			<div class="flex items-center gap-3">
				<button
					type="button"
					aria-label="Toggle sidebar"
					class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					onclick={() => (sidebarOpen = !sidebarOpen)}
				>
					<i class="fas fa-bars text-sm"></i>
				</button>
				<a href={resolve('/app')} class="flex items-center gap-2">
					<div
						class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-xs"
					>
						<i class="fas fa-layer-group text-xs"></i>
					</div>
					<span class="text-sm font-semibold tracking-tight text-fg">MegaOrganize</span>
				</a>
			</div>

			<div class="flex items-center gap-1.5">
				<button
					type="button"
					aria-label="Toggle theme"
					class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-subdued transition-colors hover:bg-muted hover:text-fg"
					onclick={() => themeState.toggle()}
				>
					<i class="fas {themeState.resolved === 'dark' ? 'fa-moon' : 'fa-sun'} text-xs"></i>
				</button>
			</div>
		</div>

		<div class="min-h-full">
			{#key page.url.pathname}
				{@render children()}
			{/key}
		</div>
	</main>
</div>

<QuickCapture enabledFeatures={data.enabledFeatures} />
<ConfirmDialog />
