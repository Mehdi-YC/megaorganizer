<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Dashboard - MegaOrganize</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6">
		<h1 class="text-xl font-semibold text-fg-accent">Dashboard</h1>
		<p class="mt-1 text-sm text-fg-subdued">Your personal knowledge & activity operating system</p>
	</div>

	<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
		<a
			href="/app/training"
			class="group flex items-center gap-4 rounded-sm border border-border bg-surface p-5 transition-all hover:border-primary/50"
		>
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary-subdued">
				<i class="fas fa-dumbbell text-primary"></i>
			</div>
			<div>
				<h2 class="text-sm font-semibold text-fg-accent group-hover:text-primary">Training</h2>
				<p class="text-xs text-fg-subdued mt-0.5">Calendar, sessions, exercises, running</p>
			</div>
		</a>

		<a
			href="/app/library"
			class="group flex items-center gap-4 rounded-sm border border-border bg-surface p-5 transition-all hover:border-primary/50"
		>
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary-subdued">
				<i class="fas fa-cubes text-primary"></i>
			</div>
			<div>
				<h2 class="text-sm font-semibold text-fg-accent group-hover:text-primary">Item Library</h2>
				<p class="text-xs text-fg-subdued mt-0.5">All your reusable items in one place</p>
			</div>
		</a>
	</div>

	{#if data.categories && data.categories.length > 0}
		<div class="mt-8">
			<h2 class="mb-3 text-sm font-semibold text-fg-accent uppercase tracking-wide">Categories</h2>
			<div class="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
				{#each data.categories as cat}
					<a
						href="/app/category/{cat.id}"
						class="flex items-center gap-3 rounded-sm border border-border bg-surface p-3 transition-all hover:border-primary/50"
					>
						{#if cat.icon}
							<i
								class="fas {cat.icon} text-sm"
								style="color: {cat.iconColor || 'var(--color-primary)'}"
							></i>
						{:else}
							<i class="fas fa-folder text-sm text-fg-subdued"></i>
						{/if}
						<span class="text-sm text-fg truncate">{cat.name}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
