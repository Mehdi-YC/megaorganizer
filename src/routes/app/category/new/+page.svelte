<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

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
	<div class="mb-4 flex items-center gap-3 sm:mb-6">
		<a href="/app" aria-label="Go back" class="text-fg-subdued transition-colors hover:text-fg">
			<i class="fas fa-arrow-left text-sm"></i>
		</a>
		<h1 class="text-lg font-semibold text-fg-accent">Create Category</h1>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			createCategory();
		}}
		class="max-w-2xl"
	>
		<div class="rounded-sm border border-border bg-surface">
			<div class="border-b border-border px-6 py-3">
				<h2 class="text-xs font-semibold tracking-wide text-fg-accent uppercase">
					Category Details
				</h2>
			</div>

			<div class="space-y-5 px-6 py-5">
				<Input
					name="name"
					label="Name *"
					bind:value={name}
					required
					placeholder="e.g., Training, Programming, Learning"
				/>

				<Textarea
					name="description"
					label="Description"
					bind:value={description}
					rows={3}
					placeholder="What will you organize here?"
				/>

				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-semibold tracking-wide text-fg-accent" id="icon-label"
						>Icon</span
					>
					<div class="grid grid-cols-5 gap-1.5" role="radiogroup" aria-labelledby="icon-label">
						{#each iconOptions as opt (opt.value)}
							<button
								type="button"
								class="flex cursor-pointer flex-col items-center gap-1 rounded-sm border p-2.5 transition-all {icon ===
								opt.value
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

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<label for="iconColor" class="text-xs font-semibold tracking-wide text-fg-accent"
							>Icon Color</label
						>
						<div class="flex gap-2">
							<input
								type="color"
								id="iconColor"
								bind:value={iconColor}
								class="h-[36px] w-10 cursor-pointer rounded-sm border border-border bg-bg"
							/>
							<input
								type="text"
								bind:value={iconColor}
								class="flex-1 rounded-sm border border-border bg-bg px-3 font-mono text-sm text-fg"
							/>
						</div>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="accentColor" class="text-xs font-semibold tracking-wide text-fg-accent"
							>Accent Color</label
						>
						<div class="flex gap-2">
							<input
								type="color"
								id="accentColor"
								bind:value={accentColor}
								class="h-[36px] w-10 cursor-pointer rounded-sm border border-border bg-bg"
							/>
							<input
								type="text"
								bind:value={accentColor}
								class="flex-1 rounded-sm border border-border bg-bg px-3 font-mono text-sm text-fg"
							/>
						</div>
					</div>
				</div>

				<Input
					type="url"
					name="imageUrl"
					label="Image URL"
					bind:value={imageUrl}
					placeholder="https://..."
				/>
			</div>
		</div>

		<div class="mt-4 flex justify-end gap-2">
			<Button variant="secondary" href="/app">Cancel</Button>
			<Button type="submit" loading={saving} disabled={!name.trim()}>
				{saving ? 'Creating...' : 'Create Category'}
			</Button>
		</div>
	</form>
</div>
