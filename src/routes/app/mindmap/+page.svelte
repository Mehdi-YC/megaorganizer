<script lang="ts">
	import { goto } from '$app/navigation';
	import MindMap from '$lib/components/ui/MindMap.svelte';

	let tree = $state<any[]>([]);
	let loading = $state(true);
	let selectedNode = $state<any>(null);

	$effect(() => {
		fetch('/api/tree/hierarchy')
			.then((r) => r.json())
			.then((data) => {
				tree = Array.isArray(data) ? data : [];
				loading = false;
			})
			.catch(() => {
				tree = [];
				loading = false;
			});
	});

	function handleNodeClick(node: any) {
		selectedNode = node;
	}

	function navigateToNode() {
		if (!selectedNode) return;
		if (selectedNode.type === 'item') {
			goto(`/app/item/${selectedNode.id}`);
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
				<button
					type="button"
					class="h-7 px-3 rounded-sm bg-primary text-xs font-medium text-white hover:bg-primary-hover transition-colors"
					onclick={navigateToNode}
				>
					Open
				</button>
			</div>
		{/if}
	</div>

	<div class="flex-1 p-2">
		{#if loading}
			<div class="flex h-full items-center justify-center">
				<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
			</div>
		{:else}
			<MindMap {tree} onNodeClick={handleNodeClick} />
		{/if}
	</div>
</div>
