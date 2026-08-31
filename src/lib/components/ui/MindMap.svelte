<script lang="ts">
	import { onMount, untrack } from 'svelte';

	type TreeNode = {
		id: string;
		name: string;
		type: 'item' | 'node';
		description?: string;
		imageUrl?: string;
		tags?: string;
		children: TreeNode[];
	};

	let {
		tree = [],
		onNodeClick = () => {}
	}: {
		tree: TreeNode[];
		onNodeClick?: (node: TreeNode) => void;
	} = $props();

	let svgEl: SVGSVGElement;
	let nodePositions = $state<Record<string, { x: number; y: number }>>({});

	let vbX = $state(0);
	let vbY = $state(0);
	let vbW = $state(800);
	let vbH = $state(600);

	let draggedNodeId = $state<string | null>(null);
	let hasDragged = $state(false);
	let dragOffset = $state({ x: 0, y: 0 });
	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0 });
	let vbStart = $state({ x: 0, y: 0 });

	const NODE_W = 140;
	const NODE_H = 56;
	const H_GAP = 24;
	const V_GAP = 60;

	function computeLayout() {
		const positions: Record<string, { x: number; y: number }> = {};
		if (tree.length === 0) {
			nodePositions = positions;
			return;
		}

		layoutTree(tree, 0, 0, positions);
		nodePositions = positions;

		const allPos = Object.values(positions);
		if (allPos.length > 0) {
			const minX = Math.min(...allPos.map((p) => p.x));
			const maxX = Math.max(...allPos.map((p) => p.x + NODE_W));
			const minY = Math.min(...allPos.map((p) => p.y));
			const maxY = Math.max(...allPos.map((p) => p.y + NODE_H));
			vbX = minX - 40;
			vbY = minY - 40;
			vbW = maxX - minX + 80;
			vbH = maxY - minY + 80;
		}
	}

	function layoutTree(treeNodes: TreeNode[], startX: number, depth: number, positions: Record<string, { x: number; y: number }>): number {
		let totalWidth = 0;

		for (let i = 0; i < treeNodes.length; i++) {
			const node = treeNodes[i];
			const childWidth = layoutTree(node.children, startX + totalWidth, depth + 1, positions);
			const subtreeWidth = Math.max(NODE_W + H_GAP, childWidth);

			const x = startX + totalWidth + subtreeWidth / 2 - NODE_W / 2;
			const y = depth * (NODE_H + V_GAP) + 40;

			positions[node.id] = { x, y };

			totalWidth += subtreeWidth;
		}

		return totalWidth || NODE_W + H_GAP;
	}

	const edges = $derived.by(() => {
		const result: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];

		function walk(nodes: TreeNode[]) {
			for (const node of nodes) {
				const parentPos = nodePositions[node.id];
				if (parentPos) {
					for (const child of node.children) {
						const childPos = nodePositions[child.id];
						if (childPos) {
							result.push({
								from: { x: parentPos.x + NODE_W / 2, y: parentPos.y + NODE_H },
								to: { x: childPos.x + NODE_W / 2, y: childPos.y }
							});
						}
					}
				}
				walk(node.children);
			}
		}

		walk(tree);
		return result;
	});

	const flatNodes = $derived.by(() => {
		const result: Array<{
			id: string;
			name: string;
			type: string;
			node: TreeNode;
		}> = [];

		function walk(treeNodes: TreeNode[]) {
			for (const node of treeNodes) {
				result.push({ id: node.id, name: node.name, type: node.type, node });
				walk(node.children);
			}
		}

		walk(tree);
		return result;
	});

	function screenToSvg(clientX: number, clientY: number) {
		const svgRect = svgEl.getBoundingClientRect();
		return {
			x: vbX + ((clientX - svgRect.left) / svgRect.width) * vbW,
			y: vbY + ((clientY - svgRect.top) / svgRect.height) * vbH
		};
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		e.stopPropagation();
		const factor = e.deltaY > 0 ? 1.1 : 0.9;
		const svgRect = svgEl.getBoundingClientRect();
		const mouseX = e.clientX - svgRect.left;
		const mouseY = e.clientY - svgRect.top;
		const svgX = vbX + (mouseX / svgRect.width) * vbW;
		const svgY = vbY + (mouseY / svgRect.height) * vbH;
		const newW = vbW * factor;
		const newH = vbH * factor;
		vbX = svgX - (mouseX / svgRect.width) * newW;
		vbY = svgY - (mouseY / svgRect.height) * newH;
		vbW = newW;
		vbH = newH;
	}

	function handleNodeMouseDown(e: MouseEvent, nodeId: string) {
		e.stopPropagation();
		if (e.button !== 0) return;
		const pos = nodePositions[nodeId];
		if (!pos) return;
		const svgPos = screenToSvg(e.clientX, e.clientY);
		draggedNodeId = nodeId;
		hasDragged = false;
		dragOffset = { x: svgPos.x - pos.x, y: svgPos.y - pos.y };
	}

	function handleSvgMouseDown(e: MouseEvent) {
		if (draggedNodeId) return;
		if (e.button !== 0) return;
		isPanning = true;
		panStart = { x: e.clientX, y: e.clientY };
		vbStart = { x: vbX, y: vbY };
	}

	function handleMouseMove(e: MouseEvent) {
		if (draggedNodeId) {
			hasDragged = true;
			const svgPos = screenToSvg(e.clientX, e.clientY);
			const newX = svgPos.x - dragOffset.x;
			const newY = svgPos.y - dragOffset.y;
			nodePositions = { ...nodePositions, [draggedNodeId]: { x: newX, y: newY } };
		} else if (isPanning) {
			const svgRect = svgEl.getBoundingClientRect();
			const dx = ((e.clientX - panStart.x) / svgRect.width) * vbW;
			const dy = ((e.clientY - panStart.y) / svgRect.height) * vbH;
			vbX = vbStart.x - dx;
			vbY = vbStart.y - dy;
		}
	}

	function handleMouseUp() {
		draggedNodeId = null;
		isPanning = false;
	}

	function fitView() {
		computeLayout();
	}

	onMount(() => {
		computeLayout();
	});

	$effect(() => {
		tree;
		untrack(() => computeLayout());
	});

	function truncateName(name: string, maxLen = 20): string {
		return name.length > maxLen ? name.slice(0, maxLen - 1) + '...' : name;
	}
</script>

<div class="relative w-full h-full overflow-hidden bg-bg-subdued rounded-sm border border-border">
	<div class="absolute top-2 right-2 z-10 flex gap-1">
		<button
			type="button"
			class="h-7 w-7 rounded-sm bg-surface border border-border text-fg-subdued hover:text-fg hover:bg-muted transition-colors flex items-center justify-center text-xs"
			onclick={fitView}
			title="Fit view"
		>
			<i class="fas fa-expand"></i>
		</button>
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svgEl}
		viewBox="{vbX} {vbY} {vbW} {vbH}"
		class="w-full h-full select-none"
		role="img"
		style="cursor: {draggedNodeId ? 'grabbing' : isPanning ? 'grabbing' : 'grab'}; pointer-events: auto;"
		onmousedown={handleSvgMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
	>
		<defs>
			<marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-auto">
				<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-border)" />
			</marker>
		</defs>

		{#each edges as edge (edge.from.x + edge.from.y + '-' + edge.to.x + edge.to.y)}
			<path
				d="M {edge.from.x} {edge.from.y} C {edge.from.x} {edge.from.y + 30}, {edge.to.x} {edge.to.y - 30}, {edge.to.x} {edge.to.y}"
				fill="none"
				stroke="var(--color-border)"
				stroke-width="2"
				marker-end="url(#arrow)"
			/>
		{/each}

		{#each flatNodes as nd (nd.id)}
			{@const pos = nodePositions[nd.id]}
			{#if pos}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<g
					transform="translate({pos.x}, {pos.y})"
					class="cursor-pointer"
					onmousedown={(e) => handleNodeMouseDown(e, nd.id)}
					onclick={(e) => { e.stopPropagation(); if (!hasDragged) onNodeClick(nd.node); }}
				>
					<rect
						width={NODE_W}
						height={NODE_H}
						rx="4"
						class="fill-surface stroke-border hover:stroke-primary transition-colors"
						stroke-width="1.5"
					/>

					{#if nd.type === 'node'}
						<rect width="4" height={NODE_H} rx="2" class="fill-primary" />
					{:else}
						<rect width="4" height={NODE_H} rx="2" class="fill-green-500" />
					{/if}

					{#if nd.node.imageUrl}
						<image href={nd.node.imageUrl} x="12" y="8" width="24" height="24" class="rounded-sm" preserveAspectRatio="xMidYMid slice" />
						<text x="44" y="24" class="fill-fg text-[11px] font-medium" dominant-baseline="middle">
							{truncateName(nd.name)}
						</text>
					{:else}
						<text x="14" y="24" class="fill-fg text-[11px] font-medium" dominant-baseline="middle">
							{truncateName(nd.name)}
						</text>
					{/if}

					<text x="14" y="40" class="fill-fg-subdued text-[9px]" dominant-baseline="middle">
						{nd.type === 'node' ? 'Folder' : 'Item'}
						{#if nd.node.children?.length}
							· {nd.node.children.length} children
						{/if}
					</text>
				</g>
			{/if}
		{/each}

		{#if flatNodes.length === 0}
			<text x={vbX + vbW / 2} y={vbY + vbH / 2} text-anchor="middle" class="fill-fg-subdued text-sm">
				No children to display
			</text>
		{/if}
	</svg>
</div>
