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

<div class="flex h-dvh h-screen overflow-hidden bg-bg text-fg">
	{#if sidebarOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-40 bg-surface-overlay/80 backdrop-blur-xs lg:hidden"
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
			enabledFeatures={data.enabledFeatures}
			user={data.user}
			onNavigate={() => (sidebarOpen = false)}
		/>
	</div>

	<main class="flex-1 overflow-x-hidden overflow-y-auto bg-bg">
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

<QuickCapture />
<ConfirmDialog />
