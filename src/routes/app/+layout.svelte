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
	import type { CategoryWithPages } from '$lib/types';

	let {
		children,
		data
	}: {
		children: Snippet;
		data: {
			categories?: CategoryWithPages[];
			invoiceYears?: number[];
			user?: { name: string; email: string; image?: string | null };
		};
	} = $props();
	let sidebarOpen = $state(false);

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

<div class="flex h-dvh h-screen overflow-hidden bg-bg">
	{#if sidebarOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-40 bg-surface-overlay lg:hidden"
			onclick={() => (sidebarOpen = false)}
		></div>
	{/if}

	<div
		class="no-print fixed z-50 h-full lg:static lg:z-auto {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full lg:translate-x-0'} transition-transform duration-200"
	>
		<Sidebar
			categories={data.categories ?? []}
			invoiceYears={data.invoiceYears ?? []}
			user={data.user}
			onNavigate={() => (sidebarOpen = false)}
		/>
	</div>

	<main class="flex-1 overflow-x-hidden overflow-y-auto">
		<div
			class="no-print sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-bg-subdued px-4 lg:hidden"
		>
			<a
				href={resolve('/app')}
				class="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-xs font-bold text-white"
				>M</a
			>
			<button
				type="button"
				aria-label="Toggle sidebar"
				class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
				onclick={() => (sidebarOpen = !sidebarOpen)}
			>
				<i class="fas fa-bars text-sm"></i>
			</button>
			<span class="text-sm font-semibold text-fg-accent">MegaOrganize</span>
		</div>

		{#key page.url.pathname}
			{@render children()}
		{/key}
	</main>
</div>

<QuickCapture />
<ConfirmDialog />
