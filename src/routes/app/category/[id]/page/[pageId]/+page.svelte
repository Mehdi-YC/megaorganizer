<script lang="ts">
	import snarkdown from 'snarkdown';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { parseMetadata, getNodeColor, getNodeIcon, checkSmallImages, searchTree, NODE_COLORS, NODE_ICONS } from '$lib/utils';
	import { GridItemImage } from '$lib/components/ui';

	let { data } = $props();
	let category = $state(data.category);
	let pageData = $state(data.pageData);
	let treeElements = $state(data.treeElements ?? []);
	let pageContent = $state(data.pageData?.markdown ?? '');
	let showAddMenu = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<Array<{ id: string; name: string; type: string; imageUrl?: string }>>([]);
	let newItemName = $state('');
	let newNodeName = $state('');
	let expandedNodes = $state<Set<string>>(new Set());
	let nodeChildrenCache = $state<Record<string, any[]>>({});
	let editingNode = $state<string | null>(null);
	let editColor = $state('');
	let editIcon = $state('');
	let editNodeMarkdown = $state('');
	let nodeAddName = $state<Record<string, string>>({});
	let nodeSearchResults = $state<Record<string, any[]>>({});
	let editingPageContent = $state(false);
	let confirmDeleteId = $state<string | null>(null);
	let nodeAddOpen = $state<Record<string, boolean>>({});
	let hoverItem = $state<any>(null);
	let hoverItemChildren = $state<any[]>([]);
	let hoverPos = $state({ x: 0, y: 0 });
	let hoverTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
	let editingPage = $state(false);
	let editPageName = $state('');
	let editPageDescription = $state('');
	let smallImages = $state(new Set<string>());
	let nodeDragIdx = $state<number | null>(null);

	function toggleNode(id: string) {
		const next = new Set(expandedNodes);
		if (next.has(id)) next.delete(id); else next.add(id);
		expandedNodes = next;
	}

	onMount(() => {
		checkSmallImages(treeElements, (ids) => smallImages = ids, smallImages);
		if (topLevelNodes.length > 0 && expandedNodes.size === 0) {
			const next = new Set(expandedNodes);
			next.add(topLevelNodes[0].id);
			expandedNodes = next;
			loadNodeChildren(topLevelNodes[0].id);
		}
	});

	let topLevelNodes = $derived(treeElements.filter((el: any) => el.type === 'node'));
	let topLevelItems = $derived(treeElements.filter((el: any) => el.type === 'item'));
	let renderedContent = $derived(pageContent ? snarkdown(pageContent) : '');

	async function searchItems() {
		if (!searchQuery.trim()) { searchResults = []; return; }
		searchResults = await searchTree(searchQuery, 'item');
	}

	async function createAndAddItem() {
		if (!newItemName.trim()) return;
		const res = await fetch('/api/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', type: 'item', name: newItemName }) });
		if (res.ok) {
			const item = await res.json();
			await linkToPage(item.id, 'item');
			newItemName = '';
			showAddMenu = false;
		}
	}

	async function createAndAddNode() {
		if (!newNodeName.trim()) return;
		const res = await fetch('/api/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', type: 'node', name: newNodeName }) });
		if (res.ok) {
			const node = await res.json();
			await linkToPage(node.id, 'node');
			const next = new Set(expandedNodes);
			next.add(node.id);
			expandedNodes = next;
			newNodeName = '';
			showAddMenu = false;
		}
	}

	async function linkToPage(childId: string, childType: string) {
		const res = await fetch('/api/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addChild', parentType: 'page', parentId: pageData?.id, childType, childId }) });
		if (res.ok) {
			const el = await fetch(`/api/tree?id=${childId}`).then(r => r.json());
			treeElements = [...treeElements, el];
			searchQuery = '';
			searchResults = [];
		}
	}

	async function removeElement(id: string, isNode: boolean = false) {
		if (isNode && confirmDeleteId !== id) {
			confirmDeleteId = id;
			return;
		}
		confirmDeleteId = null;
		const res = await fetch('/api/tree', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'removeChild', parentType: 'page', parentId: pageData?.id, childId: id }) });
		if (res.ok) {
			treeElements = treeElements.filter((el: any) => el.id !== id);
		}
	}

	async function loadNodeChildren(nodeId: string) {
		if (nodeChildrenCache[nodeId]) return;
		const res = await fetch(`/api/tree?parentType=node&parentId=${nodeId}`);
		if (res.ok) {
			const children = await res.json();
			nodeChildrenCache = { ...nodeChildrenCache, [nodeId]: children };
			checkSmallImages(children, (ids) => smallImages = ids, smallImages);
		}
	}

	async function addChildToNode(nodeId: string, childId: string, childType: string) {
		const res = await fetch('/api/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addChild', parentType: 'node', parentId: nodeId, childType, childId }) });
		if (res.ok) {
			const el = await fetch(`/api/tree?id=${childId}`).then(r => r.json());
			const existing = nodeChildrenCache[nodeId] || [];
			nodeChildrenCache = { ...nodeChildrenCache, [nodeId]: [...existing, el] };
		}
	}

	async function createChildForNode(nodeId: string, name: string) {
		const res = await fetch('/api/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', type: 'item', name }) });
		if (res.ok) {
			const item = await res.json();
			await addChildToNode(nodeId, item.id, 'item');
		}
	}

	async function saveNodeMeta(nodeId: string) {
		const node = treeElements.find((el: any) => el.id === nodeId);
		if (!node) return;
		const meta = parseMetadata(node.metadata);
		meta.color = editColor;
		meta.icon = editIcon;
		const res = await fetch('/api/tree', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: nodeId, metadata: JSON.stringify(meta), markdown: editNodeMarkdown || null }) });
		if (res.ok) {
			treeElements = treeElements.map((el: any) => el.id === nodeId ? { ...el, metadata: JSON.stringify(meta), markdown: editNodeMarkdown || null } : el);
			editingNode = null;
		}
	}

	function startEditNode(node: any) {
		const meta = parseMetadata(node.metadata);
		editColor = meta.color || getNodeColor(node);
		editIcon = meta.icon || 'fa-folder';
		editNodeMarkdown = node.markdown ?? '';
		editingNode = node.id;
	}

	$effect(() => {
		for (const node of topLevelNodes) {
			if (expandedNodes.has(node.id)) loadNodeChildren(node.id);
		}
	});

	async function searchForNode(nodeId: string, query: string) {
		if (!query.trim()) { nodeSearchResults = { ...nodeSearchResults, [nodeId]: [] }; return; }
		const results = await searchTree(query, 'item');
		nodeSearchResults = { ...nodeSearchResults, [nodeId]: results };
	}

	async function addItemToNode(nodeId: string) {
		const name = nodeAddName[nodeId];
		if (!name?.trim()) return;
		await createChildForNode(nodeId, name.trim());
		nodeAddName = { ...nodeAddName, [nodeId]: '' };
		nodeSearchResults = { ...nodeSearchResults, [nodeId]: [] };
	}

	async function addExistingToNode(nodeId: string, childId: string) {
		await addChildToNode(nodeId, childId, 'item');
		nodeAddName = { ...nodeAddName, [nodeId]: '' };
		nodeSearchResults = { ...nodeSearchResults, [nodeId]: [] };
	}

	async function onItemHover(e: MouseEvent, item: any) {
		if (hoverTimeout) clearTimeout(hoverTimeout);
		hoverPos = { x: e.clientX, y: e.clientY };
		hoverItem = item;
		hoverItemChildren = [];
		if (item.id) {
			const res = await fetch(`/api/tree?parentType=item&parentId=${item.id}`);
			if (res.ok) hoverItemChildren = await res.json();
		}
	}

	function onItemHoverMove(e: MouseEvent) {
		hoverPos = { x: e.clientX, y: e.clientY };
	}

	function onItemHoverLeave() {
		hoverTimeout = setTimeout(() => { hoverItem = null; hoverItemChildren = []; }, 150);
	}

	function onPopoverEnter() {
		if (hoverTimeout) clearTimeout(hoverTimeout);
	}

	function onPopoverLeave() {
		hoverItem = null;
		hoverItemChildren = [];
	}

	async function savePageContent() {
		if (!pageData) return;
		const res = await fetch('/api/pages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pageData.id, markdown: pageContent }) });
		if (res.ok) {
			pageData = { ...pageData, markdown: pageContent };
			editingPageContent = false;
		}
	}

	function startEditPage() {
		editPageName = pageData?.name ?? '';
		editPageDescription = pageData?.description ?? '';
		editingPage = true;
	}

	async function savePage() {
		if (!pageData) return;
		const res = await fetch('/api/pages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pageData.id, name: editPageName, description: editPageDescription || null }) });
		if (res.ok) {
			pageData = { ...pageData, name: editPageName, description: editPageDescription || null };
			editingPage = false;
		}
	}

	async function deletePage() {
		if (!pageData || !confirm('Delete this page and all its content?')) return;
		const res = await fetch('/api/pages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pageData.id }) });
		if (res.ok) goto(`/app/category/${category?.id}`);
	}

	async function persistNodeReorder(fromIdx: number, toIdx: number) {
		const moved = topLevelNodes[fromIdx];
		const target = topLevelNodes[toIdx];
		if (!moved || !target) return;
		await fetch('/api/tree', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move', parentType: 'page', parentId: pageData?.id, childId: moved.id, position: toIdx }) });
		await fetch('/api/tree', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move', parentType: 'page', parentId: pageData?.id, childId: target.id, position: fromIdx }) });
	}

	function handleNodeDragStart(e: DragEvent, idx: number) {
		nodeDragIdx = idx;
		if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); }
	}

	function handleNodeDragOver(e: DragEvent, idx: number) {
		e.preventDefault();
		if (nodeDragIdx === null || nodeDragIdx === idx) return;
		const topLevel = treeElements.filter((el: any) => el.type === 'node');
		const moved = topLevel[nodeDragIdx];
		const target = topLevel[idx];
		const allIdx = treeElements.map((el: any) => el.id);
		const movedAllIdx = allIdx.indexOf(moved.id);
		const targetAllIdx = allIdx.indexOf(target.id);
		if (movedAllIdx === -1 || targetAllIdx === -1) return;
		const next = [...treeElements];
		const [movedEl] = next.splice(movedAllIdx, 1);
		next.splice(targetAllIdx, 0, movedEl);
		treeElements = next;
		persistNodeReorder(nodeDragIdx, idx);
		nodeDragIdx = idx;
	}

	function handleNodeDragEnd() { nodeDragIdx = null; }
</script>

<svelte:head><title>{pageData?.name || 'Page'} - MegaOrganize</title></svelte:head>

{#if !category || !pageData}
	<div class="flex h-full items-center justify-center">
		<div class="rounded-sm border border-border bg-surface py-16 text-center px-8">
			<i class="fas fa-exclamation-triangle mb-3 text-3xl text-fg-subdued"></i>
			<p class="text-sm text-fg-subdued">Page not found</p>
			<a href="/app" class="mt-3 inline-block text-sm text-primary hover:text-primary-hover">Back to Dashboard</a>
		</div>
	</div>
{:else}
	<div class="border-b border-border bg-bg-subdued px-4 sm:px-6 py-2">
		<div class="flex items-center gap-1.5 text-[11px] text-fg-subdued">
			<a href="/app/category/{category.id}" class="hover:text-primary truncate max-w-[120px] sm:max-w-none">{category.name}</a>
			<i class="fas fa-chevron-right text-[8px] shrink-0"></i>
			<span class="text-fg truncate">{pageData.name}</span>
		</div>
	</div>

	<div class="p-4 sm:p-6">
		<div class="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
			<div class="min-w-0">
				{#if editingPage}
					<input type="text" bind:value={editPageName} class="w-full border-b-2 border-primary bg-transparent text-xl font-semibold text-fg-accent focus:outline-none" />
					<input type="text" bind:value={editPageDescription} class="mt-1 w-full border-b border-border bg-transparent text-sm text-fg-subdued focus:outline-none focus:border-primary" placeholder="Description (optional)" />
				{:else}
					<h1 class="text-xl font-semibold text-fg-accent truncate">{pageData.name}</h1>
					{#if pageData.description}
						<p class="mt-1 text-sm text-fg-subdued">{pageData.description}</p>
					{/if}
				{/if}
			</div>
			<div class="flex gap-1.5 shrink-0">
				{#if !editingPage}
					<div class="relative">
						<button type="button" class="inline-flex h-[36px] items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-muted" onclick={() => (showAddMenu = !showAddMenu)}>
							<i class="fas fa-plus text-xs"></i> Add
						</button>
						{#if showAddMenu}
							<div class="absolute right-0 top-12 z-50 w-72 sm:w-80 rounded-sm border border-border bg-surface p-3 sm:p-4 max-h-[70vh] overflow-y-auto">
								<input type="search" placeholder="Search existing items..." bind:value={searchQuery} oninput={searchItems} class="mb-3 h-9 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
								{#if searchResults.length > 0}
									<div class="mb-3 max-h-40 overflow-y-auto">
									{#each searchResults as result}
										<button type="button" class="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-muted" onclick={() => linkToPage(result.id, result.type)}>
											{#if result.imageUrl}
												<img src={result.imageUrl} alt={result.name} class="h-8 w-8 rounded-sm object-cover shrink-0" />
											{:else}
												<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted">
													<i class="fas {result.type === 'node' ? 'fa-folder' : 'fa-cube'} text-[10px] text-fg-subdued"></i>
												</div>
											{/if}
											<span class="truncate">{result.name}</span>
										</button>
									{/each}
									</div>
								{/if}
								<div class="border-t border-border pt-3 space-y-2">
									<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-fg-subdued">Create New</p>
									<div class="flex items-center gap-2">
										<input type="text" placeholder="Section title" bind:value={newNodeName} class="flex-1 min-w-0 h-8 rounded-sm border border-border bg-bg px-2.5 text-sm text-fg placeholder:text-fg-subdued" />
										<button type="button" class="h-8 shrink-0 rounded-sm bg-primary px-3 text-sm text-white hover:bg-primary-hover" onclick={createAndAddNode}>Section</button>
									</div>
									<div class="flex items-center gap-2">
										<input type="text" placeholder="Item name" bind:value={newItemName} class="flex-1 min-w-0 h-8 rounded-sm border border-border bg-bg px-2.5 text-sm text-fg placeholder:text-fg-subdued" />
										<button type="button" class="h-8 shrink-0 rounded-sm bg-primary px-3 text-sm text-white hover:bg-primary-hover" onclick={createAndAddItem}>Item</button>
									</div>
									<button type="button" class="w-full h-8 rounded-sm bg-muted text-xs font-medium text-fg hover:bg-border" onclick={() => { showAddMenu = false; searchQuery = ''; newItemName = ''; newNodeName = ''; }}>Cancel</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
				{#if editingPage}
					<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover" onclick={savePage}><i class="fas fa-check text-xs"></i> Save</button>
					<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={() => (editingPage = false)}>Cancel</button>
				{:else}
					<button type="button" class="inline-flex h-[36px] items-center gap-1.5 rounded-sm bg-muted px-4 text-sm font-medium text-fg hover:bg-border" onclick={startEditPage}><i class="fas fa-pen text-xs"></i> Edit</button>
					<button type="button" class="inline-flex h-[36px] w-[36px] items-center justify-center rounded-sm bg-error/15 text-sm font-medium text-error hover:bg-error/25" onclick={deletePage}><i class="fas fa-trash text-xs"></i></button>
				{/if}
			</div>
		</div>

		{#if treeElements.length === 0 && !pageContent}
			<div class="rounded-sm border border-border bg-surface py-16 text-center">
				<i class="fas fa-sitemap mb-3 text-3xl text-fg-subdued"></i>
				<p class="text-sm text-fg-subdued">This page is empty</p>
				<p class="mt-1 text-xs text-fg-subdued">Add sections, items, or content to get started</p>
			</div>
		{:else}
			{#if treeElements.length > 0}
				<div class="space-y-0">
					{#each topLevelNodes as node, nodeIdx (node.id)}
						{@const isExpanded = expandedNodes.has(node.id)}
						{@const nodeColor = getNodeColor(node)}
						{@const nodeIcon = getNodeIcon(node)}
						{@const children = nodeChildrenCache[node.id] ?? []}
						{@const childItems = children.filter((c: any) => c.type === 'item')}
						{@const childNodes = children.filter((c: any) => c.type === 'node')}
						{@const results = nodeSearchResults[node.id] ?? []}

						<div
							class="group/node"
							draggable="true"
							ondragstart={(e) => handleNodeDragStart(e, nodeIdx)}
							ondragover={(e) => handleNodeDragOver(e, nodeIdx)}
							ondragend={handleNodeDragEnd}
						>
							<div
								role="button"
								tabindex="0"
								class="group flex items-center gap-2 sm:gap-2.5 cursor-pointer"
								onclick={() => toggleNode(node.id)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleNode(node.id); }}
							>
								<i class="fas fa-grip-vertical text-[8px] text-fg-subdued/30 opacity-0 group-hover/node:opacity-100 transition-opacity cursor-move shrink-0"></i>
								<i class="fas fa-chevron-right text-[8px] transition-transform duration-150 {isExpanded ? 'rotate-90' : ''}" style="color: {nodeColor}"></i>
								<i class="fas {nodeIcon} text-[11px]" style="color: {nodeColor}"></i>
								<span class="text-sm font-semibold truncate" style="color: {nodeColor}">{node.name}</span>
								<span class="text-[11px] text-fg-subdued">{childItems.length + childNodes.length} items</span>
								<div class="flex-1"></div>
							<button type="button" class="h-7 w-7 shrink-0 items-center justify-center rounded-sm text-fg-subdued hover:text-fg opacity-0 group-hover:opacity-100" onclick={(e) => { e.stopPropagation(); nodeAddOpen = { ...nodeAddOpen, [node.id]: true }; }}>
								<i class="fas fa-plus text-[10px]"></i>
							</button>
							<button type="button" class="h-7 w-7 shrink-0 items-center justify-center rounded-sm text-fg-subdued hover:text-fg opacity-0 group-hover:opacity-100" onclick={(e) => { e.stopPropagation(); startEditNode(node); }}>
								<i class="fas fa-pen text-[10px]"></i>
							</button>
							<button type="button" class="h-7 w-7 shrink-0 items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 {confirmDeleteId === node.id ? 'text-error' : 'text-fg-subdued hover:text-error'}" onclick={(e) => { e.stopPropagation(); removeElement(node.id, true); }}>
								{#if confirmDeleteId === node.id}
									<i class="fas fa-check text-[11px]"></i>
								{:else}
									<i class="fas fa-times text-[11px]"></i>
								{/if}
							</button>
							</div>
							<hr style="border-color: {nodeColor}40" />

							{#if isExpanded}
								<div class="py-2 space-y-2">
								{#each childNodes as subNode}
									<div class="flex items-center gap-2 py-1.5">
										<i class="fas {getNodeIcon(subNode)} text-[10px]" style="color: {getNodeColor(subNode)}"></i>
										<span class="text-xs font-medium" style="color: {getNodeColor(subNode)}">{subNode.name}</span>
									</div>
								{/each}

							{#if node.markdown}
								<div class="markdown-content text-xs text-fg leading-relaxed">{@html snarkdown(node.markdown)}</div>
							{/if}

								<div class="grid gap-1.5 grid-cols-4 sm:grid-cols-6 md:grid-cols-8">
										{#each childItems as item}
											<a
												href="/app/item/{item.id}"
												class="group rounded-sm border border-border bg-surface p-1.5 transition-all hover:border-primary/50"
												onmouseenter={(e) => onItemHover(e, item)}
												onmousemove={onItemHoverMove}
												onmouseleave={onItemHoverLeave}
											>
											<div class="mb-1">
												<GridItemImage src={item.imageUrl} alt={item.name} height="h-14" icon={item.ydkData ? 'fa-layer-group' : 'fa-cube'} />
											</div>
												<p class="truncate text-[9px] font-medium text-fg-accent group-hover:text-primary">{item.name}</p>
											</a>
										{/each}
									</div>

									{#if nodeAddOpen[node.id]}
										<div class="pt-1 space-y-1.5">
											<div class="relative">
												<i class="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-fg-subdued pointer-events-none"></i>
												<input type="text" placeholder="Search or create item..." value={nodeAddName[node.id] || ''} oninput={(e) => { const v = (e.target as HTMLInputElement).value; nodeAddName = { ...nodeAddName, [node.id]: v }; searchForNode(node.id, v); }} onkeydown={(e) => { if (e.key === 'Enter' && !results.length) addItemToNode(node.id); }} class="w-full h-7 rounded-sm border border-border bg-bg pl-6 pr-2 text-[11px] text-fg placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0" />
											</div>
											{#if results.length > 0}
												<div class="max-h-28 overflow-y-auto rounded-sm border border-border bg-surface">
													{#each results.slice(0, 5) as result}
														<button type="button" class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-muted" onclick={() => addExistingToNode(node.id, result.id)}>
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
											{#if nodeAddName[node.id]?.trim() && !results.length}
												<button type="button" class="w-full h-7 rounded-sm text-[11px] font-medium text-white hover:brightness-110" style="background: {nodeColor}" onclick={() => addItemToNode(node.id)}>
													<i class="fas fa-plus text-[8px] mr-1"></i> Create "{nodeAddName[node.id]}"
												</button>
											{/if}
											<button type="button" class="w-full h-6 rounded-sm text-[10px] text-fg-subdued hover:text-fg hover:bg-muted" onclick={() => { nodeAddOpen = { ...nodeAddOpen, [node.id]: false }; nodeAddName = { ...nodeAddName, [node.id]: '' }; nodeSearchResults = { ...nodeSearchResults, [node.id]: [] }; }}>Cancel</button>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}

					{#if topLevelItems.length > 0}
						<div class="mt-4">
							<h3 class="mb-2 text-[10px] font-bold uppercase tracking-widest text-fg-subdued">Items</h3>
							<div class="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
								{#each topLevelItems as item}
									<a href="/app/item/{item.id}" class="group flex items-center gap-2.5 rounded-sm border border-border bg-surface p-2.5 transition-all hover:border-primary/50">
										<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted">
											<i class="fas {item.ydkData ? 'fa-layer-group' : 'fa-cube'} text-[10px] text-fg-subdued"></i>
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate text-xs font-medium text-fg-accent group-hover:text-primary">{item.name}</p>
										</div>
										<button type="button" class="h-5 w-5 shrink-0 items-center justify-center rounded-sm text-fg-subdued hover:text-error hidden group-hover:flex" onclick={(e) => { e.preventDefault(); removeElement(item.id); }}>
											<i class="fas fa-times text-[9px]"></i>
										</button>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Page content (markdown) below tree elements -->
			<div class="mt-6">
				{#if editingPageContent}
					<div class="rounded-sm border border-border bg-surface p-4">
						<textarea bind:value={pageContent} rows="30" class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 text-sm text-fg font-mono placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="Write page content (markdown supported)..."></textarea>
						<div class="mt-2 flex gap-2">
							<button type="button" class="h-8 rounded-sm bg-primary px-3 text-xs font-medium text-white hover:bg-primary-hover" onclick={savePageContent}>Save</button>
							<button type="button" class="h-8 rounded-sm bg-muted px-3 text-xs font-medium text-fg hover:bg-border" onclick={() => { editingPageContent = false; pageContent = pageData?.markdown ?? ''; }}>Cancel</button>
						</div>
					</div>
				{:else if pageContent}
					<div class="rounded-sm border border-border bg-surface p-4">
						<div class="flex items-center justify-end mb-3">
							<button type="button" class="inline-flex h-6 items-center gap-1 rounded-sm bg-muted px-2 text-[10px] font-medium text-fg-subdued hover:bg-border hover:text-fg" onclick={() => (editingPageContent = true)}>
								<i class="fas fa-pen text-[8px]"></i> Edit
							</button>
						</div>
						<div class="markdown-content text-sm text-fg leading-relaxed">{@html renderedContent}</div>
					</div>
				{:else}
					<button type="button" class="w-full rounded-sm border border-dashed border-border bg-surface py-6 text-center transition-colors hover:border-primary/50" onclick={() => (editingPageContent = true)}>
						<i class="fas fa-file-alt mb-2 text-xl text-fg-subdued/40"></i>
						<p class="text-xs text-fg-subdued">Add page content</p>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if editingNode}
		{@const node = treeElements.find((el: any) => el.id === editingNode)}
		{#if node}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-surface-overlay" role="button" tabindex="-1" onclick={() => (editingNode = null)} onkeydown={() => {}}>
				<div class="w-full sm:w-96 max-h-[80vh] overflow-y-auto rounded-t-sm sm:rounded-sm border border-border bg-surface p-4 sm:p-5 shadow-xl" role="button" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
					<h3 class="mb-4 text-sm font-semibold text-fg-accent">Edit Section: {node.name}</h3>
					<div class="mb-4">
						<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-fg-subdued">Color</p>
						<div class="flex flex-wrap gap-2">
							{#each NODE_COLORS as c}
								<button type="button" class="h-7 w-7 rounded-sm border-2 transition-all {editColor === c ? 'border-fg scale-110' : 'border-transparent hover:border-fg-subdued'}" style="background: {c}" onclick={() => (editColor = c)}></button>
							{/each}
							<input type="color" bind:value={editColor} class="h-7 w-9 cursor-pointer rounded-sm border-0 bg-transparent" />
						</div>
					</div>
					<div class="mb-4">
						<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-fg-subdued">Icon</p>
						<div class="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
							{#each NODE_ICONS as icon}
								<button type="button" class="flex h-8 w-8 items-center justify-center rounded-sm border transition-all {editIcon === icon ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-bg text-fg-subdued hover:bg-muted hover:text-fg'}" onclick={() => (editIcon = icon)}>
									<i class="fas {icon} text-xs"></i>
								</button>
							{/each}
						</div>
					</div>
					<div class="mb-3 flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-sm" style="background: {editColor}25">
							<i class="fas {editIcon} text-sm" style="color: {editColor}"></i>
						</div>
						<span class="text-sm font-medium" style="color: {editColor}">{node.name}</span>
					</div>
					<div class="mb-4">
						<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-fg-subdued">Content (Markdown)</p>
						<textarea bind:value={editNodeMarkdown} rows="6" class="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-fg font-mono placeholder:text-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none" placeholder="Optional markdown content..."></textarea>
					</div>
					<div class="flex justify-end gap-2">
						<button type="button" class="rounded-sm bg-muted px-4 py-2 text-xs font-medium text-fg hover:bg-border" onclick={() => (editingNode = null)}>Cancel</button>
						<button type="button" class="rounded-sm bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-hover" onclick={() => saveNodeMeta(node.id)}>Save</button>
					</div>
				</div>
			</div>
		{/if}
	{/if}

	{#if hoverItem}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed z-50 w-56 rounded-sm border border-border bg-surface p-3 shadow-xl"
			style="left: {Math.min(hoverPos.x + 12, window.innerWidth - 240)}px; top: {Math.min(hoverPos.y + 12, window.innerHeight - 200)}px"
			onmouseenter={onPopoverEnter}
			onmouseleave={onPopoverLeave}
		>
			<p class="mb-1.5 text-xs font-semibold text-fg-accent truncate">{hoverItem.name}</p>
			{#if hoverItemChildren.length > 0}
				<p class="mb-1 text-[9px] font-bold uppercase tracking-widest text-fg-subdued">Children ({hoverItemChildren.length})</p>
				<div class="space-y-0.5 max-h-32 overflow-y-auto">
					{#each hoverItemChildren as child}
						<a href="/app/item/{child.id}" class="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[10px] text-fg hover:bg-muted">
							<i class="fas fa-cube w-3 text-center text-fg-subdued text-[8px]"></i>
							<span class="truncate">{child.name}</span>
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-[10px] text-fg-subdued italic">No children</p>
			{/if}
		</div>
	{/if}
{/if}
