<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import Toaster from '$lib/components/ui/Toaster.svelte';
	import { installFetchErrorToasts } from '$lib/utils/fetch-errors';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	onMount(() => installFetchErrorToasts());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<Toaster />
