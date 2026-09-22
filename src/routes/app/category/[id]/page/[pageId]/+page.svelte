<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { renderMarkdown } from '$lib/utils/markdown';
	import {
		parseMetadata,
		getNodeColor,
		getNodeIcon,
		checkSmallImages,
		searchTree,
		NODE_COLORS,
		NODE_ICONS
	} from '$lib/utils';
	import {
		GridItemImage,
		Button,
		Input,
		Textarea,
		EmptyState,
		Spinner,
		ConfirmButton,
		Dialog
	} from '$lib/components/ui';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let category = $state(data.category);
	// svelte-ignore state_referenced_locally
	let pageData = $state(data.pageData);
	// svelte-ignore state_referenced_locally
	let treeElements = $state(data.treeElements ?? []);
	// svelte-ignore state_referenced_locally
	let pageContent = $state(data.pageData?.markdown ?? '');
	let showAddMenu = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<Array<{ id: string; name: string; type: string; imageUrl?: string }>>(
		[]
	);
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
	let addMenuSearchInput = $state<HTMLInputElement | null>(null);
	let nodeMarkdownHtml = $state<Record<string, string>>({});

	// Attachments state
	// svelte-ignore state_referenced_locally
	let attachments = $state<any[]>(data.attachments ?? []);
	let selectedAttachments = $state<Set<string>>(new Set());
	let uploading = $state(false);
	let uploadError = $state('');
	let dragOverAttachments = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let previewFile = $state<any>(null);

	async function renderNodeMarkdown() {
		const entries: [string, string][] = [];
		for (const node of treeElements) {
			if (node.type === 'node' && node.markdown) {
				const html = await renderMarkdown(node.markdown);
				entries.push([node.id, html]);
			}
		}
		nodeMarkdownHtml = Object.fromEntries(entries);
	}

	$effect(() => {
		renderNodeMarkdown();
	});

	function toggleNode(id: string) {
		const next = new Set(expandedNodes);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedNodes = next;
	}

	onMount(() => {
		checkSmallImages(treeElements, (ids) => (smallImages = ids), smallImages);
		if (topLevelNodes.length > 0 && expandedNodes.size === 0) {
			const next = new Set(expandedNodes);
			next.add(topLevelNodes[0].id);
			expandedNodes = next;
			loadNodeChildren(topLevelNodes[0].id);
		}
	});

	let topLevelNodes = $derived(treeElements.filter((el: any) => el.type === 'node'));
	let topLevelItems = $derived(treeElements.filter((el: any) => el.type === 'item'));
	let renderedContent = $state('');

	$effect(() => {
		renderMarkdown(pageContent).then((html) => {
			renderedContent = html;
		});
	});

	async function searchItems() {
		if (!searchQuery.trim() || searchQuery.trim().length < 3) {
			searchResults = [];
			return;
		}
		searchResults = await searchTree(searchQuery, 'item');
	}

	async function createAndAddItem() {
		if (!newItemName.trim()) return;
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'create', type: 'item', name: newItemName })
		});
		if (res.ok) {
			const item = await res.json();
			await linkToPage(item.id, 'item');
			newItemName = '';
			showAddMenu = false;
		}
	}

	async function createAndAddNode() {
		if (!newNodeName.trim()) return;
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'create', type: 'node', name: newNodeName })
		});
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
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'addChild',
				parentType: 'page',
				parentId: pageData?.id,
				childType,
				childId
			})
		});
		if (res.ok) {
			const el = await fetch(`/api/tree?id=${childId}`).then((r) => r.json());
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
		const res = await fetch('/api/tree', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'removeChild',
				parentType: 'page',
				parentId: pageData?.id,
				childId: id
			})
		});
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
			checkSmallImages(children, (ids) => (smallImages = ids), smallImages);
		}
	}

	async function addChildToNode(nodeId: string, childId: string, childType: string) {
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'addChild',
				parentType: 'node',
				parentId: nodeId,
				childType,
				childId
			})
		});
		if (res.ok) {
			const el = await fetch(`/api/tree?id=${childId}`).then((r) => r.json());
			const existing = nodeChildrenCache[nodeId] || [];
			nodeChildrenCache = { ...nodeChildrenCache, [nodeId]: [...existing, el] };
		}
	}

	async function createChildForNode(nodeId: string, name: string) {
		const res = await fetch('/api/tree', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'create', type: 'item', name })
		});
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
		const res = await fetch('/api/tree', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: nodeId,
				metadata: JSON.stringify(meta),
				markdown: editNodeMarkdown || null
			})
		});
		if (res.ok) {
			treeElements = treeElements.map((el: any) =>
				el.id === nodeId
					? { ...el, metadata: JSON.stringify(meta), markdown: editNodeMarkdown || null }
					: el
			);
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

	$effect(() => {
		if (showAddMenu && addMenuSearchInput) {
			addMenuSearchInput.focus();
		}
	});

	async function searchForNode(nodeId: string, query: string) {
		if (!query.trim() || query.trim().length < 3) {
			nodeSearchResults = { ...nodeSearchResults, [nodeId]: [] };
			return;
		}
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
		hoverTimeout = setTimeout(() => {
			hoverItem = null;
			hoverItemChildren = [];
		}, 150);
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
		const res = await fetch('/api/pages', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pageData.id, markdown: pageContent })
		});
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
		const res = await fetch('/api/pages', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: pageData.id,
				name: editPageName,
				description: editPageDescription || null
			})
		});
		if (res.ok) {
			pageData = { ...pageData, name: editPageName, description: editPageDescription || null };
			editingPage = false;
		}
	}

	async function deletePage() {
		if (!pageData || !confirm('Delete this page and all its content?')) return;
		const res = await fetch('/api/pages', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pageData.id })
		});
		if (res.ok) goto(`/app/category/${category?.id}`);
	}

	async function persistNodeReorder(fromIdx: number, toIdx: number) {
		const moved = topLevelNodes[fromIdx];
		const target = topLevelNodes[toIdx];
		if (!moved || !target) return;
		await fetch('/api/tree', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'move',
				parentType: 'page',
				parentId: pageData?.id,
				childId: moved.id,
				position: toIdx
			})
		});
		await fetch('/api/tree', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'move',
				parentType: 'page',
				parentId: pageData?.id,
				childId: target.id,
				position: fromIdx
			})
		});
	}

	function handleNodeDragStart(e: DragEvent, idx: number) {
		nodeDragIdx = idx;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(idx));
		}
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

	function handleNodeDragEnd() {
		nodeDragIdx = null;
	}

	// Attachment functions
	async function uploadFiles(files: FileList | File[]) {
		if (!pageData) return;
		uploading = true;
		uploadError = '';

		for (const file of Array.from(files)) {
			if (file.size > 100 * 1024 * 1024) {
				uploadError = `${file.name} exceeds 100MB limit`;
				uploading = false;
				return;
			}

			const formData = new FormData();
			formData.append('pageId', pageData.id);
			formData.append('file', file);

			try {
				const res = await fetch('/api/attachments', { method: 'POST', body: formData });
				if (res.ok) {
					const attachment = await res.json();
					attachments = [...attachments, attachment];
				} else {
					const err = await res.json();
					uploadError = err.error || 'Upload failed';
				}
			} catch {
				uploadError = 'Upload failed';
			}
		}

		uploading = false;
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) uploadFiles(input.files);
		input.value = '';
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOverAttachments = false;
		if (e.dataTransfer?.files) uploadFiles(e.dataTransfer.files);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOverAttachments = true;
	}

	function handleDragLeave() {
		dragOverAttachments = false;
	}

	function toggleSelectAttachment(id: string) {
		const next = new Set(selectedAttachments);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedAttachments = next;
	}

	function selectAllAttachments() {
		if (selectedAttachments.size === attachments.length) {
			selectedAttachments = new Set();
		} else {
			selectedAttachments = new Set(attachments.map((a) => a.id));
		}
	}

	async function deleteSelectedAttachments() {
		for (const id of selectedAttachments) {
			await fetch('/api/attachments', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
		}
		attachments = attachments.filter((a) => !selectedAttachments.has(a.id));
		selectedAttachments = new Set();
	}

	async function shareSelectedAttachments() {
		const files: File[] = [];
		for (const id of selectedAttachments) {
			const att = attachments.find((a) => a.id === id);
			if (!att) continue;
			try {
				const res = await fetch(att.url);
				const blob = await res.blob();
				files.push(new File([blob], att.originalName, { type: att.mimeType }));
			} catch {
				// Skip failed files
			}
		}

		if (files.length === 0) return;

		if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
			try {
				await navigator.share({ files, title: pageData?.name || 'Attachments' });
			} catch {
				// User cancelled or share failed
			}
		} else if (files.length === 1) {
			// Fallback: download single file
			const url = URL.createObjectURL(files[0]);
			const a = document.createElement('a');
			a.href = url;
			a.download = files[0].name;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} else {
			// Fallback: download all as individual files
			for (const file of files) {
				const url = URL.createObjectURL(file);
				const a = document.createElement('a');
				a.href = url;
				a.download = file.name;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}
		}
	}

	function openPreview(att: any) {
		previewFile = att;
	}

	function closePreview() {
		previewFile = null;
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function getFileIcon(mimeType: string): string {
		if (mimeType.startsWith('image/')) return 'fa-image';
		if (mimeType.startsWith('video/')) return 'fa-video';
		if (mimeType === 'application/pdf') return 'fa-file-pdf';
		if (mimeType.startsWith('audio/')) return 'fa-file-audio';
		if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fa-file-zipper';
		if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-file-word';
		if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fa-file-excel';
		return 'fa-file';
	}
</script>

<svelte:head><title>{pageData?.name || 'Page'} - MegaOrganize</title></svelte:head>

{#if !category || !pageData}
	<div class="flex h-full items-center justify-center">
		<EmptyState icon="fa-exclamation-triangle" message="Page not found">
			<Button href="/app" variant="primary" size="sm">Back to Dashboard</Button>
		</EmptyState>
	</div>
{:else}
	<div class="border-b border-border bg-bg-subdued px-4 py-2 sm:px-6">
		<div class="flex items-center gap-1.5 text-[11px] text-fg-subdued">
			<a
				href="/app/category/{category.id}"
				class="max-w-[120px] truncate hover:text-primary sm:max-w-none">{category.name}</a
			>
			<i class="fas fa-chevron-right shrink-0 text-[8px]"></i>
			<span class="truncate text-fg">{pageData.name}</span>
		</div>
	</div>

	<div class="p-4 sm:p-6">
		<div class="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
			<div class="min-w-0">
				{#if editingPage}
					<input
						type="text"
						bind:value={editPageName}
						class="w-full border-b-2 border-primary bg-transparent text-xl font-semibold text-fg-accent focus:outline-none"
					/>
					<input
						type="text"
						bind:value={editPageDescription}
						class="mt-1 w-full border-b border-border bg-transparent text-sm text-fg-subdued focus:border-primary focus:outline-none"
						placeholder="Description (optional)"
					/>
				{:else}
					<h1 class="truncate text-xl font-semibold text-fg-accent">{pageData.name}</h1>
					{#if pageData.description}
						<p class="mt-1 text-sm text-fg-subdued">{pageData.description}</p>
					{/if}
				{/if}
			</div>
			<div class="flex shrink-0 gap-1.5">
				{#if !editingPage}
					<div class="relative">
						<Button variant="secondary" onclick={() => (showAddMenu = !showAddMenu)}>
							<i class="fas fa-plus text-xs"></i> Add
						</Button>
						{#if showAddMenu}
							<div
								class="fixed top-16 right-4 left-4 z-50 max-h-[70vh] overflow-y-auto rounded-sm border border-border bg-surface p-3 sm:absolute sm:top-12 sm:right-0 sm:w-80 sm:p-4"
							>
								<input
									type="search"
									placeholder="Search existing items..."
									bind:this={addMenuSearchInput}
									bind:value={searchQuery}
									oninput={searchItems}
									class="mb-3 h-9 w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued focus:border-primary focus:ring-0 focus:outline-none"
								/>
								{#if searchResults.length > 0}
									<div class="mb-3 max-h-40 overflow-y-auto">
										{#each searchResults as result (result.id)}
											<button
												type="button"
												class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-muted"
												onclick={() => linkToPage(result.id, result.type)}
											>
												{#if result.imageUrl}
													<img
														src={result.imageUrl}
														alt={result.name}
														class="h-8 w-8 shrink-0 rounded-sm object-cover"
													/>
												{:else}
													<div
														class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted"
													>
														<i
															class="fas {result.type === 'node'
																? 'fa-folder'
																: 'fa-cube'} text-[10px] text-fg-subdued"
														></i>
													</div>
												{/if}
												<span class="truncate">{result.name}</span>
											</button>
										{/each}
									</div>
								{/if}
								<div class="space-y-2 border-t border-border pt-3">
									<p class="mb-2 text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
										Create New
									</p>
									<div class="flex items-center gap-2">
										<Input
											size="sm"
											class="min-w-0 flex-1"
											placeholder="Section title"
											bind:value={newNodeName}
										/>
										<Button size="sm" class="shrink-0" onclick={createAndAddNode}>Section</Button>
									</div>
									<div class="flex items-center gap-2">
										<Input
											size="sm"
											class="min-w-0 flex-1"
											placeholder="Item name"
											bind:value={newItemName}
										/>
										<Button size="sm" class="shrink-0" onclick={createAndAddItem}>Item</Button>
									</div>
									<Button
										size="sm"
										variant="secondary"
										class="w-full"
										onclick={() => {
											showAddMenu = false;
											searchQuery = '';
											newItemName = '';
											newNodeName = '';
										}}>Cancel</Button
									>
								</div>
							</div>
						{/if}
					</div>
				{/if}
				{#if editingPage}
					<Button onclick={savePage}><i class="fas fa-check text-xs"></i> Save</Button>
					<Button variant="secondary" onclick={() => (editingPage = false)}>Cancel</Button>
				{:else}
					<Button variant="secondary" onclick={startEditPage}
						><i class="fas fa-pen text-xs"></i> Edit</Button
					>
					<Button variant="danger" class="w-[36px] px-0" aria-label="Delete" onclick={deletePage}
						><i class="fas fa-trash text-xs"></i></Button
					>
				{/if}
			</div>
		</div>

		{#if treeElements.length === 0 && !pageContent}
			<EmptyState
				icon="fa-sitemap"
				message="This page is empty"
				submessage="Add sections, items, or content to get started"
			/>
		{:else}
			{#if treeElements.length > 0}
				<div class="space-y-0">
					{#each topLevelNodes as node, nodeIdx (node.id)}
						{#if nodeIdx > 0}
							<hr class="my-3 border-border" />
						{/if}
						{@const isExpanded = expandedNodes.has(node.id)}
						{@const nodeColor = getNodeColor(node)}
						{@const nodeIcon = getNodeIcon(node)}
						{@const children = nodeChildrenCache[node.id] ?? []}
						{@const childItems = children.filter((c: any) => c.type === 'item')}
						{@const childNodes = children.filter((c: any) => c.type === 'node')}
						{@const results = nodeSearchResults[node.id] ?? []}

						<div
							role="listitem"
							class="group/node"
							draggable="true"
							ondragstart={(e) => handleNodeDragStart(e, nodeIdx)}
							ondragover={(e) => handleNodeDragOver(e, nodeIdx)}
							ondragend={handleNodeDragEnd}
						>
							<div
								role="button"
								tabindex="0"
								class="group flex cursor-pointer items-center gap-2 sm:gap-2.5"
								onclick={() => toggleNode(node.id)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') toggleNode(node.id);
								}}
							>
								<i
									class="fas fa-grip-vertical shrink-0 cursor-move text-[8px] text-fg-subdued/30 transition-opacity sm:opacity-0 sm:group-hover/node:opacity-100"
								></i>
								<i
									class="fas fa-chevron-right text-[8px] transition-transform duration-150 {isExpanded
										? 'rotate-90'
										: ''}"
									style="color: {nodeColor}"
								></i>
								<i class="fas {nodeIcon} text-[11px]" style="color: {nodeColor}"></i>
								<span class="truncate text-sm font-semibold" style="color: {nodeColor}"
									>{node.name}</span
								>
								<span class="text-[11px] text-fg-subdued"
									>{childItems.length + childNodes.length} items</span
								>
								<div class="flex-1"></div>
								<button
									type="button"
									aria-label="Add"
									class="h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:text-fg sm:opacity-0 sm:group-hover:opacity-100"
									onclick={(e) => {
										e.stopPropagation();
										nodeAddOpen = { ...nodeAddOpen, [node.id]: true };
									}}
								>
									<i class="fas fa-plus text-[10px]"></i>
								</button>
								<button
									type="button"
									aria-label="Edit"
									class="h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:text-fg sm:opacity-0 sm:group-hover:opacity-100"
									onclick={(e) => {
										e.stopPropagation();
										startEditNode(node);
									}}
								>
									<i class="fas fa-pen text-[10px]"></i>
								</button>
								<ConfirmButton
									confirmId={confirmDeleteId ?? ''}
									targetId={node.id}
									icon="fa-times"
									onconfirm={() => removeElement(node.id, true)}
								/>
							</div>
							<hr style="border-color: {nodeColor}40" />

							{#if isExpanded}
								<div class="space-y-2 py-2">
									{#each childNodes as subNode (subNode.id)}
										<div class="flex items-center gap-2 py-1.5">
											<i
												class="fas {getNodeIcon(subNode)} text-[10px]"
												style="color: {getNodeColor(subNode)}"
											></i>
											<span class="text-xs font-medium" style="color: {getNodeColor(subNode)}"
												>{subNode.name}</span
											>
										</div>
									{/each}

									{#if node.markdown}
										<div class="markdown-content text-xs leading-relaxed text-fg">
											{@html nodeMarkdownHtml[node.id] || ''}
										</div>
									{/if}

									<div class="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
										{#each childItems as item (item.id)}
											<a
												href="/app/item/{item.id}"
												class="group rounded-sm border {item.favorite
													? 'border-yellow-400/40 bg-yellow-500/5'
													: 'border-border bg-surface'} p-1.5 transition-all hover:border-primary/50"
												onmouseenter={(e) => onItemHover(e, item)}
												onmousemove={onItemHoverMove}
												onmouseleave={onItemHoverLeave}
											>
												<div class="mb-1">
													<GridItemImage
														src={item.imageUrl}
														alt={item.name}
														height="h-14"
														icon={item.ydkData ? 'fa-layer-group' : 'fa-cube'}
													/>
												</div>
												<div class="flex items-center gap-0.5">
													<p
														class="flex-1 truncate text-[9px] font-medium text-fg-accent group-hover:text-primary"
													>
														{item.name}
													</p>
													{#if item.favorite}
														<i class="fas fa-star shrink-0 text-[8px] text-yellow-400"></i>
													{/if}
												</div>
											</a>
										{/each}
									</div>

									{#if nodeAddOpen[node.id]}
										<div class="space-y-1.5 pt-1">
											<div class="relative">
												<i
													class="fas fa-search pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[9px] text-fg-subdued"
												></i>
												<input
													type="text"
													placeholder="Search or create item..."
													value={nodeAddName[node.id] || ''}
													oninput={(e) => {
														const v = (e.target as HTMLInputElement).value;
														nodeAddName = { ...nodeAddName, [node.id]: v };
														searchForNode(node.id, v);
													}}
													onkeydown={(e) => {
														if (e.key === 'Enter' && !results.length) addItemToNode(node.id);
													}}
													class="h-7 w-full rounded-sm border border-border bg-bg pr-2 pl-6 text-[11px] text-fg placeholder:text-fg-subdued focus:border-primary focus:ring-0 focus:outline-none"
												/>
											</div>
											{#if results.length > 0}
												<div
													class="max-h-28 overflow-y-auto rounded-sm border border-border bg-surface"
												>
													{#each results.slice(0, 5) as result (result.id)}
														<button
															type="button"
															class="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-muted"
															onclick={() => addExistingToNode(node.id, result.id)}
														>
															{#if result.imageUrl}
																<img
																	src={result.imageUrl}
																	alt={result.name}
																	class="h-6 w-6 shrink-0 rounded-sm object-cover"
																/>
															{:else}
																<i class="fas fa-cube w-3 shrink-0 text-center text-fg-subdued"></i>
															{/if}
															{result.name}
														</button>
													{/each}
												</div>
											{/if}
											{#if nodeAddName[node.id]?.trim() && !results.length}
												<button
													type="button"
													class="h-7 w-full cursor-pointer rounded-sm text-[11px] font-medium text-white hover:brightness-110"
													style="background: {nodeColor}"
													onclick={() => addItemToNode(node.id)}
												>
													<i class="fas fa-plus mr-1 text-[8px]"></i> Create "{nodeAddName[
														node.id
													]}"
												</button>
											{/if}
											<button
												type="button"
												class="h-6 w-full cursor-pointer rounded-sm text-[10px] text-fg-subdued hover:bg-muted hover:text-fg"
												onclick={() => {
													nodeAddOpen = { ...nodeAddOpen, [node.id]: false };
													nodeAddName = { ...nodeAddName, [node.id]: '' };
													nodeSearchResults = { ...nodeSearchResults, [node.id]: [] };
												}}>Cancel</button
											>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}

					{#if topLevelItems.length > 0}
						<hr class="my-3 border-border" />
						<div class="mt-4">
							<h3 class="mb-2 text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
								Items
							</h3>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{#each topLevelItems as item (item.id)}
									<a
										href="/app/item/{item.id}"
										class="group flex items-center gap-2.5 rounded-sm border {item.favorite
											? 'border-yellow-400/40 bg-yellow-500/5'
											: 'border-border bg-surface'} p-2.5 transition-all hover:border-primary/50"
									>
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted"
										>
											<i
												class="fas {item.ydkData
													? 'fa-layer-group'
													: item.favorite
														? 'fa-star text-yellow-400'
														: 'fa-cube text-fg-subdued'} text-[10px]"
											></i>
										</div>
										<div class="min-w-0 flex-1">
											<p
												class="truncate text-xs font-medium text-fg-accent group-hover:text-primary"
											>
												{item.name}
											</p>
										</div>
										{#if item.favorite}
											<i class="fas fa-star shrink-0 text-[10px] text-yellow-400"></i>
										{/if}
										<button
											type="button"
											aria-label="Remove"
											class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:text-error sm:hidden sm:group-hover:flex"
											onclick={(e) => {
												e.preventDefault();
												removeElement(item.id);
											}}
										>
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
						<Textarea
							class="font-mono"
							bind:value={pageContent}
							rows={30}
							placeholder="Write page content (markdown supported)..."
						/>
						<div class="mt-2 flex gap-2">
							<Button size="sm" onclick={savePageContent}>Save</Button>
							<Button
								size="sm"
								variant="secondary"
								onclick={() => {
									editingPageContent = false;
									pageContent = pageData?.markdown ?? '';
								}}>Cancel</Button
							>
						</div>
					</div>
				{:else if pageContent}
					<div class="rounded-sm border border-border bg-surface p-4">
						<div class="mb-3 flex items-center justify-end">
							<Button size="sm" variant="secondary" onclick={() => (editingPageContent = true)}>
								<i class="fas fa-pen text-[8px]"></i> Edit
							</Button>
						</div>
						<div class="markdown-content text-sm leading-relaxed text-fg">
							{@html renderedContent}
						</div>
					</div>
				{:else}
					<button
						type="button"
						class="w-full cursor-pointer rounded-sm border border-dashed border-border bg-surface py-6 text-center transition-colors hover:border-primary/50"
						onclick={() => (editingPageContent = true)}
					>
						<i class="fas fa-file-alt mb-2 text-xl text-fg-subdued/40"></i>
						<p class="text-xs text-fg-subdued">Add page content</p>
					</button>
				{/if}
			</div>

			<!-- Attachments -->
			<div class="mt-6">
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
						Attachments ({attachments.length})
					</h3>
					<div class="flex items-center gap-2">
						{#if selectedAttachments.size > 0}
							<span class="text-[10px] text-fg-subdued">{selectedAttachments.size} selected</span>
							<Button size="sm" onclick={shareSelectedAttachments}>
								<i class="fas fa-share-nodes text-[9px]"></i> Share
							</Button>
							<Button size="sm" variant="danger" onclick={deleteSelectedAttachments}>
								<i class="fas fa-trash text-[9px]"></i> Delete
							</Button>
							<Button
								size="sm"
								variant="secondary"
								onclick={() => (selectedAttachments = new Set())}
							>
								Cancel
							</Button>
						{:else if attachments.length > 1}
							<Button size="sm" variant="secondary" onclick={selectAllAttachments}>
								<i class="fas fa-check-double text-[9px]"></i> Select All
							</Button>
						{/if}
					</div>
				</div>

				<input
					type="file"
					multiple
					class="hidden"
					bind:this={fileInput}
					onchange={handleFileInput}
				/>

				{#if uploadError}
					<div class="mb-3 rounded-sm border border-error/30 bg-error/10 px-3 py-2">
						<p class="text-[11px] text-error">{uploadError}</p>
					</div>
				{/if}

				{#if uploading}
					<div
						class="mb-3 flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2"
					>
						<Spinner size="sm" />
						<span class="text-[11px] text-fg-subdued">Uploading...</span>
					</div>
				{/if}

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="rounded-sm border border-dashed transition-colors {dragOverAttachments
						? 'border-primary bg-primary/5'
						: 'border-border'}"
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
				>
					{#if attachments.length === 0}
						<button
							type="button"
							class="w-full cursor-pointer py-8 text-center"
							onclick={() => fileInput?.click()}
						>
							<i class="fas fa-paperclip mb-2 text-xl text-fg-subdued/40"></i>
							<p class="text-xs text-fg-subdued">Drop files here or click to upload</p>
							<p class="mt-1 text-[10px] text-fg-subdued/60">Max 100MB per file</p>
						</button>
					{:else}
						<div class="grid grid-cols-1 gap-1.5 p-2 sm:grid-cols-2 lg:grid-cols-3">
							{#each attachments as att (att.id)}
								<div
									class="group flex items-center gap-2.5 rounded-sm border border-border bg-surface p-2.5 transition-all hover:border-primary/50 {selectedAttachments.has(
										att.id
									)
										? 'border-primary bg-primary/5'
										: ''}"
								>
									<button
										type="button"
										aria-label={selectedAttachments.has(att.id) ? 'Deselect' : 'Select'}
										class="shrink-0 cursor-pointer"
										onclick={() => toggleSelectAttachment(att.id)}
									>
										<div
											class="flex h-5 w-5 items-center justify-center rounded-sm border transition-all {selectedAttachments.has(
												att.id
											)
												? 'border-primary bg-primary text-white'
												: 'border-border bg-bg'}"
										>
											{#if selectedAttachments.has(att.id)}
												<i class="fas fa-check text-[8px]"></i>
											{/if}
										</div>
									</button>
									<button
										type="button"
										class="flex min-w-0 flex-1 items-center gap-2 text-left"
										onclick={() => openPreview(att)}
									>
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted"
										>
											<i class="fas {getFileIcon(att.mimeType)} text-[10px] text-fg-subdued"></i>
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate text-[11px] font-medium text-fg-accent">
												{att.originalName}
											</p>
											<p class="text-[9px] text-fg-subdued">{formatFileSize(att.size)}</p>
										</div>
									</button>
									<button
										type="button"
										aria-label="Delete"
										class="h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
										onclick={async () => {
											await fetch('/api/attachments', {
												method: 'DELETE',
												headers: { 'Content-Type': 'application/json' },
												body: JSON.stringify({ id: att.id })
											});
											attachments = attachments.filter((a) => a.id !== att.id);
											selectedAttachments.delete(att.id);
											selectedAttachments = selectedAttachments;
										}}
									>
										<i class="fas fa-times text-[9px]"></i>
									</button>
								</div>
							{/each}
						</div>
						<div class="border-t border-border px-3 py-2">
							<button
								type="button"
								class="cursor-pointer text-[10px] text-fg-subdued hover:text-fg"
								onclick={() => fileInput?.click()}
							>
								<i class="fas fa-plus mr-1 text-[8px]"></i> Add more files
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if editingNode}
		{@const node = treeElements.find((el: any) => el.id === editingNode)}
		{#if node}
			<Dialog open={true} onclose={() => (editingNode = null)} title="Edit Section: {node.name}">
				{#snippet children()}
					<div class="mb-4">
						<p class="mb-2 text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
							Color
						</p>
						<div class="flex flex-wrap gap-2">
							{#each NODE_COLORS as c, i (c)}
								<button
									type="button"
									aria-label="Color {i + 1}"
									class="h-7 w-7 cursor-pointer rounded-sm border-2 transition-all {editColor === c
										? 'scale-110 border-fg'
										: 'border-transparent hover:border-fg-subdued'}"
									style="background: {c}"
									onclick={() => (editColor = c)}
								></button>
							{/each}
							<input
								type="color"
								bind:value={editColor}
								class="h-7 w-9 cursor-pointer rounded-sm border-0 bg-transparent"
							/>
						</div>
					</div>
					<div class="mb-4">
						<p class="mb-2 text-[10px] font-bold tracking-widest text-fg-subdued uppercase">Icon</p>
						<div class="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
							{#each NODE_ICONS as icon (icon)}
								<button
									type="button"
									aria-label={icon}
									class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border transition-all {editIcon ===
									icon
										? 'border-primary bg-primary/10 text-primary'
										: 'border-border bg-bg text-fg-subdued hover:bg-muted hover:text-fg'}"
									onclick={() => (editIcon = icon)}
								>
									<i class="fas {icon} text-xs"></i>
								</button>
							{/each}
						</div>
					</div>
					<div class="mb-3 flex items-center gap-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-sm"
							style="background: {editColor}25"
						>
							<i class="fas {editIcon} text-sm" style="color: {editColor}"></i>
						</div>
						<span class="text-sm font-medium" style="color: {editColor}">{node.name}</span>
					</div>
					<div class="mb-4">
						<p class="mb-2 text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
							Content (Markdown)
						</p>
						<Textarea
							class="font-mono"
							bind:value={editNodeMarkdown}
							rows={6}
							placeholder="Optional markdown content..."
						/>
					</div>
				{/snippet}
				{#snippet footer()}
					<Button variant="secondary" onclick={() => (editingNode = null)}>Cancel</Button>
					<Button onclick={() => saveNodeMeta(node.id)}>Save</Button>
				{/snippet}
			</Dialog>
		{/if}
	{/if}

	{#if hoverItem}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed z-50 w-56 rounded-sm border border-border bg-surface p-3 shadow-xl"
			style="left: {Math.min(hoverPos.x + 12, window.innerWidth - 240)}px; top: {Math.min(
				hoverPos.y + 12,
				window.innerHeight - 200
			)}px"
			onmouseenter={onPopoverEnter}
			onmouseleave={onPopoverLeave}
		>
			<p class="mb-1.5 truncate text-xs font-semibold text-fg-accent">{hoverItem.name}</p>
			{#if hoverItemChildren.length > 0}
				<p class="mb-1 text-[9px] font-bold tracking-widest text-fg-subdued uppercase">
					Children ({hoverItemChildren.length})
				</p>
				<div class="max-h-32 space-y-0.5 overflow-y-auto">
					{#each hoverItemChildren as child (child.id)}
						<a
							href="/app/item/{child.id}"
							class="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-[10px] text-fg hover:bg-muted"
						>
							<i class="fas fa-cube w-3 text-center text-[8px] text-fg-subdued"></i>
							<span class="truncate">{child.name}</span>
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-[10px] text-fg-subdued italic">No children</p>
			{/if}
		</div>
	{/if}

	<!-- File Preview Modal -->
	{#if previewFile}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay"
			role="presentation"
			onclick={closePreview}
			onkeydown={(e) => e.key === 'Escape' && closePreview()}
		>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center rounded-sm border border-border bg-surface shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-label={previewFile.originalName}
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && closePreview()}
			>
				<div class="flex w-full items-center justify-between border-b border-border px-4 py-2">
					<p class="max-w-[70%] truncate text-xs font-medium text-fg-accent">
						{previewFile.originalName}
					</p>
					<div class="flex items-center gap-2">
						<Button
							size="sm"
							variant="secondary"
							href={previewFile.url}
							download={previewFile.originalName}
						>
							<i class="fas fa-download text-[9px]"></i> Download
						</Button>
						<button
							type="button"
							aria-label="Close preview"
							class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-fg-subdued hover:bg-muted hover:text-fg"
							onclick={closePreview}
						>
							<i class="fas fa-times text-xs"></i>
						</button>
					</div>
				</div>
				<div class="flex-1 overflow-auto p-4">
					{#if previewFile.category === 'image'}
						<img
							src={previewFile.url}
							alt={previewFile.originalName}
							class="max-h-[75vh] max-w-full rounded-sm object-contain"
						/>
					{:else if previewFile.category === 'video'}
						<video src={previewFile.url} controls class="max-h-[75vh] max-w-full rounded-sm">
							<track kind="captions" />
						</video>
					{:else if previewFile.category === 'audio'}
						<div class="flex flex-col items-center gap-4 py-8">
							<div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
								<i class="fas fa-file-audio text-2xl text-fg-subdued"></i>
							</div>
							<audio src={previewFile.url} controls class="w-80"></audio>
						</div>
					{:else if previewFile.category === 'pdf'}
						<iframe
							src={previewFile.url}
							class="h-[75vh] w-[70vw] rounded-sm border-0"
							title={previewFile.originalName}
						></iframe>
					{:else}
						<div class="flex flex-col items-center gap-4 py-12">
							<div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
								<i class="fas {getFileIcon(previewFile.mimeType)} text-2xl text-fg-subdued"></i>
							</div>
							<p class="text-xs text-fg-subdued">Preview not available for this file type</p>
							<Button href={previewFile.url} download={previewFile.originalName}>
								<i class="fas fa-download text-[10px]"></i> Download to view
							</Button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}
