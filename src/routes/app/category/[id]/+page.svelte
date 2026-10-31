<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import { formatIconClass, getContrastTextColor } from '$lib/utils';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	let category = $state(data.category);
	// svelte-ignore state_referenced_locally
	let pages = $state(data.pages ?? []);
	let showNewPage = $state(false);
	let newPageName = $state('');
	let dragIdx = $state<number | null>(null);

	let showEditWorkspace = $state(false);
	// svelte-ignore state_referenced_locally
	let editName = $state(data.category?.name || '');
	// svelte-ignore state_referenced_locally
	let editDescription = $state(data.category?.description || '');
	// svelte-ignore state_referenced_locally
	let editIcon = $state(data.category?.icon || '');
	// svelte-ignore state_referenced_locally
	let editIconColor = $state(data.category?.iconColor || '#5A31F4');
	// svelte-ignore state_referenced_locally
	let editAccentColor = $state(data.category?.accentColor || '#5A31F4');
	let savingWorkspace = $state(false);

	const iconOptions = [
		{ value: 'fa-folder', label: 'Folder' },
		{ value: 'fa-briefcase', label: 'Work' },
		{ value: 'fa-code', label: 'Code' },
		{ value: 'fa-rocket', label: 'Rocket' },
		{ value: 'fa-dumbbell', label: 'Training' },
		{ value: 'fa-graduation-cap', label: 'Learning' },
		{ value: 'fa-bookmark', label: 'Bookmarks' },
		{ value: 'fa-lightbulb', label: 'Ideas' },
		{ value: 'fa-bolt', label: 'Energy' },
		{ value: 'fa-heart', label: 'Health' },
		{ value: 'fa-book', label: 'Notes' },
		{ value: 'fa-gamepad', label: 'Gaming' },
		{ value: 'fa-wrench', label: 'Tools' },
		{ value: 'fa-chart-line', label: 'Stats' },
		{ value: 'fa-shield-halved', label: 'Security' }
	];

	async function updateWorkspace() {
		if (!editName.trim() || !category) return;
		savingWorkspace = true;
		try {
			const res = await fetch('/api/categories', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: category.id,
					name: editName.trim(),
					description: editDescription.trim(),
					icon: editIcon,
					iconColor: editIconColor,
					accentColor: editAccentColor
				})
			});
			if (res.ok) {
				const updated = await res.json();
				category = updated;
				showEditWorkspace = false;
				showToast('Workspace updated', 'success');
				await invalidateAll();
			} else {
				showToast('Failed to update workspace', 'error');
			}
		} catch {
			showToast('Error updating workspace', 'error');
		} finally {
			savingWorkspace = false;
		}
	}

	async function createPage() {
		if (!newPageName.trim() || !category) return;
		const response = await fetch('/api/pages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: category.id, name: newPageName })
		});
		if (response.ok) {
			const pg = await response.json();
			pages = [...pages, pg];
			newPageName = '';
			showNewPage = false;
		}
	}

	async function persistPageReorder(fromIdx: number, toIdx: number) {
		const moved = pages[fromIdx];
		const target = pages[toIdx];
		if (!moved || !target) return;
		await fetch('/api/pages', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: moved.id, position: toIdx })
		});
		await fetch('/api/pages', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: target.id, position: fromIdx })
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
		const next = [...pages];
		const [moved] = next.splice(dragIdx, 1);
		next.splice(idx, 0, moved);
		pages = next;
		persistPageReorder(dragIdx, idx);
		dragIdx = idx;
	}

	function handleDragEnd() {
		dragIdx = null;
	}
</script>

<svelte:head>
	<title>{category?.name || 'Category'} - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8">
	{#if !category}
		<EmptyState icon="fa-exclamation-triangle" message="Category not found">
			<Button href="/app" variant="primary" size="sm">Back to Dashboard</Button>
		</EmptyState>
	{:else}
		<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
			<div class="flex min-w-0 items-center gap-3">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs"
					style="background-color: {category.iconColor ||
						category.accentColor ||
						'#6366f1'}; color: {getContrastTextColor(
						category.iconColor || category.accentColor || '#6366f1'
					)};"
				>
					<i class="{formatIconClass(category.icon)} text-lg"></i>
				</div>
				<div class="min-w-0">
					<h1
						class="cursor-help truncate text-xl font-bold text-fg-accent"
						title={category.description || category.name}
					>
						{category.name}
					</h1>
					{#if category.description}
						<p class="mt-0.5 hidden text-sm text-fg-subdued sm:block">{category.description}</p>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="secondary"
					size="sm"
					onclick={() => (showEditWorkspace = !showEditWorkspace)}
				>
					<i class="fas fa-pen mr-1.5 text-xs"></i> Edit Workspace
				</Button>
				<Button size="sm" onclick={() => (showNewPage = true)}>
					<i class="fas fa-plus mr-1.5 text-xs"></i> Page
				</Button>
			</div>
		</div>

		{#if showEditWorkspace}
			<div class="mb-6 rounded-xl border border-border bg-surface p-5 shadow-xs">
				<div class="mb-4 flex items-center justify-between border-b border-border pb-3">
					<h2 class="text-sm font-semibold text-fg">Edit Workspace Details</h2>
					<button
						type="button"
						aria-label="Close"
						class="text-fg-subdued hover:text-fg"
						onclick={() => (showEditWorkspace = false)}
					>
						<i class="fas fa-times text-xs"></i>
					</button>
				</div>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						updateWorkspace();
					}}
					class="space-y-4"
				>
					<Input
						name="editName"
						label="Name *"
						bind:value={editName}
						required
						placeholder="Workspace name"
					/>

					<Textarea
						name="editDescription"
						label="Description"
						bind:value={editDescription}
						rows={2}
						placeholder="What will you organize here?"
					/>

					<div class="flex flex-col gap-2.5">
						<span class="text-xs font-semibold tracking-wide text-fg-accent" id="edit-icon-label">
							Workspace Icon
						</span>

						<div class="flex items-center gap-3">
							<div
								class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-lg shadow-2xs"
								style="color: {editIconColor || 'var(--color-primary)'}"
							>
								{#if editIcon}
									<i
										class={editIcon.startsWith('fas ') || editIcon.startsWith('fa-solid ')
											? editIcon
											: `fas ${editIcon.startsWith('fa-') ? editIcon : `fa-${editIcon}`}`}
									></i>
								{:else}
									<i class="fas fa-folder text-fg-subdued/50"></i>
								{/if}
							</div>

							<div class="flex-1">
								<Input
									name="editIcon"
									bind:value={editIcon}
									placeholder="e.g. fa-folder, fa-briefcase, fa-code, fa-rocket, fa-bolt"
								/>
							</div>
						</div>

						<p class="text-[11px] text-fg-subdued">
							Type any FontAwesome icon name or pick from suggested presets:
						</p>

						<div
							class="grid grid-cols-5 gap-1.5 sm:grid-cols-5 md:grid-cols-5"
							role="radiogroup"
							aria-labelledby="edit-icon-label"
						>
							{#each iconOptions as opt (opt.value)}
								<button
									type="button"
									aria-pressed={editIcon === opt.value}
									class="flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 transition-all {editIcon ===
									opt.value
										? 'border-primary-text bg-primary-subdued text-primary-text shadow-xs'
										: 'border-border bg-bg text-fg-subdued hover:border-fg-subdued hover:text-fg'}"
									onclick={() => (editIcon = opt.value)}
								>
									<i class="fas {opt.value} text-xs"></i>
									<span class="truncate text-[9px] font-medium">{opt.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<label for="editIconColor" class="text-xs font-semibold tracking-wide text-fg-accent"
								>Icon Color</label
							>
							<div class="flex gap-2">
								<input
									type="color"
									id="editIconColor"
									bind:value={editIconColor}
									class="h-[36px] w-10 cursor-pointer rounded-lg border border-border bg-bg"
								/>
								<input
									type="text"
									aria-label="Icon color hex value"
									bind:value={editIconColor}
									class="flex-1 rounded-lg border border-border bg-bg px-3 font-mono text-xs text-fg focus:border-primary-text focus:outline-none"
								/>
							</div>
						</div>
						<div class="flex flex-col gap-1.5">
							<label
								for="editAccentColor"
								class="text-xs font-semibold tracking-wide text-fg-accent">Accent Color</label
							>
							<div class="flex gap-2">
								<input
									type="color"
									id="editAccentColor"
									bind:value={editAccentColor}
									class="h-[36px] w-10 cursor-pointer rounded-lg border border-border bg-bg"
								/>
								<input
									type="text"
									aria-label="Accent color hex value"
									bind:value={editAccentColor}
									class="flex-1 rounded-lg border border-border bg-bg px-3 font-mono text-xs text-fg focus:border-primary-text focus:outline-none"
								/>
							</div>
						</div>
					</div>

					<div class="flex justify-end gap-2 pt-2">
						<Button type="button" variant="secondary" onclick={() => (showEditWorkspace = false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={savingWorkspace}>
							{savingWorkspace ? 'Saving...' : 'Save Workspace'}
						</Button>
					</div>
				</form>
			</div>
		{/if}

		<h2 class="mb-3 text-[10px] font-bold tracking-widest text-fg-subdued uppercase">
			Pages ({pages.length})
		</h2>

		{#if showNewPage}
			<div class="mb-6 rounded-sm border border-border bg-surface p-4">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						createPage();
					}}
					class="flex flex-col gap-2 sm:flex-row"
				>
					<Input class="flex-1" bind:value={newPageName} placeholder="Page name" />
					<div class="flex gap-2">
						<Button type="submit">Create</Button>
						<Button
							type="button"
							variant="secondary"
							onclick={() => {
								showNewPage = false;
								newPageName = '';
							}}>Cancel</Button
						>
					</div>
				</form>
			</div>
		{/if}

		{#if pages.length === 0}
			<EmptyState
				icon="fa-file-alt"
				message="No pages yet"
				submessage="Create your first page to get started"
			/>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each pages as pg, idx (pg.id)}
					<a
						href={resolve('/app/category/[id]/page/[pageId]', {
							id: category.id,
							pageId: pg.id
						})}
						class="group relative flex cursor-move items-start gap-3 rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary-text/50"
						draggable="true"
						ondragstart={(e) => handleDragStart(e, idx)}
						ondragover={(e) => handleDragOver(e, idx)}
						ondragend={handleDragEnd}
					>
						<div
							class="absolute top-2 right-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
						>
							<i class="fas fa-grip-vertical text-[10px] text-fg-subdued/40"></i>
						</div>
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-xs"
							style="background-color: {pg.iconColor ||
								'var(--color-primary)'}; color: {getContrastTextColor(pg.iconColor || '#6366f1')};"
						>
							{#if pg.icon}
								<i class="fas {pg.icon} text-sm"></i>
							{:else}
								<i class="fas fa-file text-sm"></i>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<h3 class="truncate text-sm font-medium text-fg group-hover:text-primary-text">
								{pg.name}
							</h3>
							{#if pg.description}
								<p class="mt-0.5 line-clamp-2 text-xs text-fg-subdued">{pg.description}</p>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>
