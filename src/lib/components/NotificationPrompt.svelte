<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { requestNotificationPermission } from '$lib/utils/notifications';
	import { enablePush, getPushStatus } from '$lib/utils/push-client';

	const DISMISS_KEY = 'notification-prompt-dismissed';

	let visible = $state(false);
	let busy = $state(false);
	let error = $state('');
	let pushConfigured = $state(false);

	onMount(() => {
		if (!('Notification' in window)) return;
		if (localStorage.getItem(DISMISS_KEY)) return;

		void getPushStatus().then((status) => {
			pushConfigured = status.configured;
			// Fully set up when the permission is granted and, where the server
			// supports push, this device is subscribed.
			const done =
				Notification.permission === 'granted' && (status.subscribed || !status.configured);
			visible = !done;
		});
	});

	async function enable() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const permission = await requestNotificationPermission();
			if (permission !== 'granted') {
				error = 'Notifications are blocked for this site — allow them in your browser settings.';
				return;
			}
			const status = await getPushStatus();
			if (status.configured && !(await enablePush())) {
				error = 'Could not enable notifications on this device.';
				return;
			}
			visible = false;
		} finally {
			busy = false;
		}
	}

	function dismiss() {
		localStorage.setItem(DISMISS_KEY, '1');
		visible = false;
	}
</script>

{#if visible}
	<div
		class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-primary/40 bg-primary/5 px-3 py-2.5"
	>
		<i class="fas fa-bell text-sm text-primary"></i>
		<p class="min-w-0 flex-1 text-xs text-fg">
			Get notified when a reminder is due{pushConfigured ? ', even when the app is closed' : ''}.
		</p>
		<div class="flex items-center gap-2">
			<Button size="sm" variant="primary" loading={busy} onclick={enable}>Enable</Button>
			<Button size="sm" variant="ghost" onclick={dismiss}>Not now</Button>
		</div>
		{#if error}
			<p class="w-full text-xs text-error">{error}</p>
		{/if}
	</div>
{/if}
