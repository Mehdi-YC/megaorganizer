<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	let name = $state('');
	let description = $state('');
	let icon = $state('');
	let iconColor = $state('#5A31F4');
	let accentColor = $state('#5A31F4');
	let imageUrl = $state('');
	let saving = $state(false);

	const iconOptions = [
		{ value: 'fa-dumbbell', label: 'Training' },
		{ value: 'fa-code', label: 'Code' },
		{ value: 'fa-graduation-cap', label: 'Learning' },
		{ value: 'fa-bookmark', label: 'Bookmarks' },
		{ value: 'fa-gamepad', label: 'Gaming' },
		{ value: 'fa-wrench', label: 'Tools' },
		{ value: 'fa-folder', label: 'Folder' },
		{ value: 'fa-lightbulb', label: 'Ideas' },
		{ value: 'fa-briefcase', label: 'Work' },
		{ value: 'fa-heart', label: 'Health' }
	];

	async function createCategory() {
		if (!name.trim()) return;
		saving = true;
		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description, icon, iconColor, accentColor, imageUrl })
			});
			if (response.ok) {
				await invalidateAll();
				goto('/app');
			}
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>New Category - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6">
	<div class="mb-4 sm:mb-6 flex items-center gap-3">
		<a href="/app" class="text-fg-subdued hover:text-fg transition-colors">
			<i class="fas fa-arrow-left text-sm"></i>
		</a>
		<h1 class="text-lg font-semibold text-fg-accent">Create Category</h1>
	</div>

	<form
		onsubmit={(e) => { e.preventDefault(); createCategory(); }}
		class="max-w-2xl"
	>
		<div class="rounded-sm border border-border bg-surface">
			<div class="border-b border-border px-6 py-3">
				<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Category Details</h2>
			</div>

			<div class="px-6 py-5 space-y-5">
				<div class="flex flex-col gap-1.5">
					<label for="name" class="text-xs font-semibold text-fg-accent tracking-wide">Name *</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						required
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="e.g., Training, Programming, Learning"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="description" class="text-xs font-semibold text-fg-accent tracking-wide">Description</label>
					<textarea
						id="description"
						bind:value={description}
						rows="3"
						class="w-full rounded-sm border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0 resize-none"
						placeholder="What will you organize here?"
					></textarea>
				</div>

				<div class="flex flex-col gap-1.5">
					<label class="text-xs font-semibold text-fg-accent tracking-wide">Icon</label>
					<div class="grid grid-cols-5 gap-1.5">
						{#each iconOptions as opt}
							<button
								type="button"
								class="flex flex-col items-center gap-1 rounded-sm border p-2.5 transition-all {icon === opt.value
									? 'border-primary bg-primary-subdued text-primary'
									: 'border-border bg-bg text-fg-subdued hover:border-fg-subdued hover:text-fg'}"
								onclick={() => (icon = opt.value)}
							>
								<i class="fas {opt.value} text-sm"></i>
								<span class="text-[10px] font-medium">{opt.label}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="iconColor" class="text-xs font-semibold text-fg-accent tracking-wide">Icon Color</label>
						<div class="flex gap-2">
							<input type="color" id="iconColor" bind:value={iconColor} class="h-[36px] w-10 cursor-pointer rounded-sm border border-border bg-bg" />
							<input type="text" bind:value={iconColor} class="flex-1 rounded-sm border border-border bg-bg px-3 text-sm text-fg font-mono" />
						</div>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="accentColor" class="text-xs font-semibold text-fg-accent tracking-wide">Accent Color</label>
						<div class="flex gap-2">
							<input type="color" id="accentColor" bind:value={accentColor} class="h-[36px] w-10 cursor-pointer rounded-sm border border-border bg-bg" />
							<input type="text" bind:value={accentColor} class="flex-1 rounded-sm border border-border bg-bg px-3 text-sm text-fg font-mono" />
						</div>
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="imageUrl" class="text-xs font-semibold text-fg-accent tracking-wide">Image URL</label>
					<input type="url" id="imageUrl" bind:value={imageUrl} class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0" placeholder="https://..." />
				</div>
			</div>
		</div>

		<div class="mt-4 flex justify-end gap-2">
			<a href="/app" class="inline-flex h-[36px] items-center justify-center rounded-sm bg-muted px-4 text-sm font-medium text-fg transition-colors hover:bg-border">Cancel</a>
			<button type="submit" disabled={saving || !name.trim()} class="inline-flex h-[36px] items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-white transition-all hover:bg-primary-hover disabled:opacity-40">
				{saving ? 'Creating...' : 'Create Category'}
			</button>
		</div>
	</form>
</div>
