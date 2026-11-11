<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import MindMap from '$lib/components/ui/MindMap.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { TreeElementNode } from '$lib/types';

	let tree = $state<TreeElementNode[]>([]);
	let loading = $state(true);
	let loadError = $state(false);
	let selectedNode = $state<TreeElementNode | null>(null);

	async function loadData() {
		loading = true;
		loadError = false;
		try {
			const res = await fetch('/api/tree/hierarchy');
			if (!res.ok) {
				loadError = true;
			} else {
				const data = await res.json();
				tree = Array.isArray(data) ? data : [];
			}
		} catch {
			loadError = true;
		}
		loading = false;
	}

	onMount(loadData);

	function handleNodeClick(node: TreeElementNode) {
		selectedNode = node;
	}

	function navigateToNode() {
		if (!selectedNode) return;
		if (selectedNode.type === 'item') {
			goto(resolve('/app/item/[id]', { id: selectedNode.id }));
		}
	}
</script>

<svelte:head>
	<title>Mind Map - MegaOrganize</title>
</svelte:head>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between border-b border-border px-4 py-3">
		<div class="flex items-center gap-3">
			<h1 class="text-sm font-semibold text-fg-accent">Mind Map</h1>
			<span class="text-xs text-fg-subdued">{tree.length} root nodes</span>
		</div>
		{#if selectedNode}
			<div class="flex items-center gap-2">
				<span class="text-xs text-fg-subdued">{selectedNode.name}</span>
				<Button size="sm" onclick={navigateToNode}>Open</Button>
			</div>
		{/if}
	</div>

	<div class="flex-1 p-2">
		{#if loading}
			<div class="flex h-full items-center justify-center">
				<Spinner size="md" />
			</div>
		{:else if loadError}
			<EmptyState
				icon="fa-triangle-exclamation"
				message="Couldn't load the mind map"
				submessage="Check your connection and try again."
			>
				<Button variant="secondary" onclick={loadData}>Retry</Button>
			</EmptyState>
		{:else}
			<MindMap {tree} onNodeClick={handleNodeClick} />
		{/if}
	</div>
</div>
