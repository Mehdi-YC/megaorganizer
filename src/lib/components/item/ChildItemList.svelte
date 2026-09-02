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
	let addQuery = $state('');
	let addResults = $state<any[]>([]);
	let dragIdx = $state<number | null>(null);
	let addInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (showAdd && addInput) {
			addInput.focus();
		}
	});

	async function searchToAdd() {
		if (!addQuery.trim() || addQuery.trim().length < 3) { addResults = []; return; }
		const results = await searchTree(addQuery, 'item');
		addResults = results.filter((r: any) => r.id !== parentId && !children.some((c) => c.id === r.id));
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
			addQuery = '';
			addResults = [];
			showAdd = false;
		}
	}

	async function createAndAdd() {
		if (!addQuery.trim()) return;
		const createRes = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'create', type: 'item', name: addQuery })
		});
		if (createRes.ok) {
			const child = await createRes.json();
			const linkRes = await fetch('/api/tree', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'addChild', parentType, parentId, childType: 'item', childId: child.id })
			});
			if (linkRes.ok) { onAdd?.(child); addQuery = ''; showAdd = false; }
		}
	}

	function closeAdd() {
		showAdd = false;
		addQuery = '';
		addResults = [];
	}

	function handleAddKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && addQuery.trim() && addResults.length === 0) {
			createAndAdd();
		}
		if (e.key === 'Escape') {
			closeAdd();
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
		<div class="mb-3 space-y-1.5">
			<div class="relative">
				<i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-fg-subdued pointer-events-none"></i>
				<input
					type="text"
					placeholder="Search or create item..."
					bind:this={addInput}
					value={addQuery}
					oninput={(e) => { addQuery = (e.target as HTMLInputElement).value; searchToAdd(); }}
					onkeydown={handleAddKeydown}
					class="w-full h-7 rounded-sm border border-border bg-bg pl-6 pr-2 text-[11px] text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
				/>
			</div>
			{#if addResults.length > 0}
				<div class="max-h-28 overflow-y-auto rounded-sm border border-border bg-surface">
					{#each addResults.slice(0, 5) as result}
						<button type="button" class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-muted" onclick={() => addExisting(result.id)}>
							{#if result.imageUrl}
								<img src={result.imageUrl} alt={result.name} class="h-6 w-6 rounded-sm object-cover shrink-0" />
							{:else}
								<i class="fas fa-cube w-3 text-center text-fg-subdued shrink-0"></i>
							{/if}
							{result.name}
						</button>
					{/each}
				</div>
			{/if}
			{#if addQuery.trim() && addResults.length === 0}
				<button type="button" class="w-full h-7 rounded-sm bg-primary text-[11px] font-medium text-white hover:bg-primary-hover" onclick={createAndAdd}>
					<i class="fas fa-plus text-[8px] mr-1"></i> Create "{addQuery}"
				</button>
			{/if}
			<button type="button" class="w-full h-6 rounded-sm text-[10px] text-fg-subdued hover:text-fg hover:bg-muted" onclick={closeAdd}>Cancel</button>
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
