<script lang="ts">
	import { searchTree } from '$lib/utils';

	let { parentType, parentId, children = [], onAdd, onRemove, onReorder }: {
		parentType: string;
		parentId: string;
		children?: any[];
		onAdd?: (child: any) => void;
		onRemove?: (childId: string) => void;
		onReorder?: (fromIdx: number, toIdx: number) => void;
	} = $props();

	let showAdd = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let newChildName = $state('');
	let dragIdx = $state<number | null>(null);

	async function searchToAdd() {
		if (!searchQuery.trim()) { searchResults = []; return; }
		const results = await searchTree(searchQuery, 'item');
		searchResults = results.filter((r: any) => r.id !== parentId && !children.some((c) => c.id === r.id));
	}

	async function addExisting(childId: string) {
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'addChild', parentType, parentId, childType: 'item', childId })
		});
		if (res.ok) {
			const el = await fetch(`/api/tree?id=${childId}`).then(r => r.json());
			onAdd?.(el);
			searchQuery = '';
			searchResults = [];
			showAdd = false;
		}
	}

	async function addNew() {
		if (!newChildName.trim()) return;
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
				body: JSON.stringify({ action: 'addChild', parentType, parentId, childType: 'item', childId: child.id })
			});
			if (linkRes.ok) { onAdd?.(child); newChildName = ''; showAdd = false; }
		}
	}

	async function persistReorder(fromIdx: number, toIdx: number) {
		const moved = children[fromIdx];
		const target = children[toIdx];
		if (!moved || !target) return;
		await fetch('/api/tree', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'move', parentType, parentId, childId: moved.id, position: toIdx })
		});
		await fetch('/api/tree', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'move', parentType, parentId, childId: target.id, position: fromIdx })
		});
	}

	function handleDragStart(e: DragEvent, idx: number) {
		dragIdx = idx;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(idx));
		}
	}

	function handleDragOver(e: DragEvent, idx: number) {
		e.preventDefault();
		if (dragIdx === null || dragIdx === idx) return;
		onReorder?.(dragIdx, idx);
		persistReorder(dragIdx, idx);
		dragIdx = idx;
	}

	function handleDragEnd() {
		dragIdx = null;
	}
</script>

<div class="rounded-sm border border-border bg-surface p-4 sm:p-5">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Child Items ({children.length})</h3>
		<button type="button" class="inline-flex h-7 items-center gap-1.5 rounded-sm bg-primary px-2.5 text-[11px] font-medium text-white hover:bg-primary-hover" onclick={() => (showAdd = !showAdd)}>
			<i class="fas fa-plus text-[9px]"></i> Add
		</button>
	</div>

	{#if showAdd}
		<div class="mb-3 space-y-2">
			<input type="search" bind:value={searchQuery} oninput={searchToAdd} placeholder="Search existing items..." class="w-full h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
			{#if searchResults.length > 0}
				<div class="max-h-32 overflow-y-auto space-y-0.5">
					{#each searchResults.slice(0, 5) as result}
						<button type="button" class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] hover:bg-muted" onclick={() => addExisting(result.id)}>
							<i class="fas fa-cube w-3 text-center text-fg-subdued"></i> {result.name}
						</button>
					{/each}
				</div>
			{/if}
			<div class="flex gap-1.5">
				<input type="text" bind:value={newChildName} placeholder="Or create new item" class="flex-1 min-w-0 h-8 rounded-sm border border-border bg-bg px-2 text-xs text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
				<button type="button" class="h-8 shrink-0 rounded-sm bg-primary px-2 text-xs text-white hover:bg-primary-hover" onclick={addNew}>Create</button>
				<button type="button" class="h-8 shrink-0 rounded-sm bg-muted px-2 text-xs text-fg hover:bg-border" onclick={() => { showAdd = false; newChildName = ''; searchQuery = ''; }}>Cancel</button>
			</div>
		</div>
	{/if}

	{#if children.length > 0}
		<div class="space-y-0.5">
			{#each children as child, idx}
				<div
					class="group flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted cursor-move"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, idx)}
					ondragover={(e) => handleDragOver(e, idx)}
					ondragend={handleDragEnd}
				>
					<i class="fas fa-grip-vertical w-3 text-center text-fg-subdued/40 opacity-0 group-hover:opacity-100 transition-opacity"></i>
					<a href="/app/item/{child.id}" class="flex flex-1 items-center gap-2 text-fg">
						{#if child.imageUrl}
							<img src={child.imageUrl} alt="" class="h-5 w-5 rounded-sm object-cover shrink-0" />
						{:else}
							<i class="fas fa-cube w-3 text-center text-fg-subdued"></i>
						{/if}
						{child.name}
					</a>
					<button type="button" class="h-5 w-5 items-center justify-center rounded-sm text-fg-subdued hover:text-error hidden group-hover:flex" onclick={() => onRemove?.(child.id)}>
						<i class="fas fa-times text-[9px]"></i>
					</button>
				</div>
			{/each}
		</div>
	{:else if !showAdd}
		<p class="text-xs text-fg-subdued text-center py-4">No child items yet.</p>
	{/if}
</div>
