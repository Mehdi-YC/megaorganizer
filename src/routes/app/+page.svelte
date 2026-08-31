<script lang="ts">
	let { data } = $props();

	const activityIcons: Record<string, { icon: string; color: string }> = {
		strength: { icon: 'fa-dumbbell', color: 'text-blue-500' },
		running: { icon: 'fa-person-running', color: 'text-green-500' },
		cycling: { icon: 'fa-bicycle', color: 'text-orange-500' },
		walking: { icon: 'fa-person-walking', color: 'text-yellow-500' },
		swimming: { icon: 'fa-person-swimming', color: 'text-cyan-500' },
		other: { icon: 'fa-circle-dot', color: 'text-fg-subdued' }
	};

	function getSessionIcon(activityTypes: string[]) {
		if (!activityTypes || activityTypes.length === 0) return activityIcons.other;
		return activityIcons[activityTypes[0]] ?? activityIcons.other;
	}

	function formatDuration(seconds: number) {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}
</script>

<svelte:head>
	<title>Dashboard - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8">
	<div class="mb-6">
		<h1 class="text-xl font-semibold text-fg-accent">Dashboard</h1>
		<p class="mt-1 text-sm text-fg-subdued">Your personal knowledge & activity operating system</p>
	</div>

	<!-- Stats -->
	<div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
		<a href="/app/library" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10">
				<i class="fas fa-cubes text-sm text-primary"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{data.stats?.itemCount ?? 0}</p>
			<p class="text-xs text-fg-subdued">Items</p>
		</a>

		<a href="/app/training" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-green-500/10">
				<i class="fas fa-calendar-check text-sm text-green-600"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{data.stats?.sessionCount ?? 0}</p>
			<p class="text-xs text-fg-subdued">Sessions</p>
		</a>

		<a href="/app/training/history" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-orange-500/10">
				<i class="fas fa-clock text-sm text-orange-600"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{formatDuration(data.stats?.totalDuration ?? 0)}</p>
			<p class="text-xs text-fg-subdued">Total Time</p>
		</a>

		<a href="/app/tags" class="group rounded-sm border border-border bg-surface p-4 transition-all hover:border-primary/50">
			<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-sm bg-purple-500/10">
				<i class="fas fa-tags text-sm text-purple-600"></i>
			</div>
			<p class="text-xl font-semibold text-fg">{data.categories?.length ?? 0}</p>
			<p class="text-xs text-fg-subdued">Categories</p>
		</a>
	</div>

	<div class="mt-6 grid gap-6 lg:grid-cols-3">
		<!-- Recent Items -->
		<div class="lg:col-span-2">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Recent Items</h2>
				<a href="/app/library" class="text-xs text-primary hover:text-primary-hover">View All</a>
			</div>
			{#if data.recentItems && data.recentItems.length > 0}
				<div class="grid gap-2 grid-cols-2 sm:grid-cols-3">
					{#each data.recentItems as item}
						<a href="/app/item/{item.id}" class="group flex items-center gap-3 rounded-sm border border-border bg-surface p-3 transition-all hover:border-primary/50">
							{#if item.imageUrl}
								<img src={item.imageUrl} alt="" class="h-10 w-10 rounded-sm object-cover shrink-0" />
							{:else}
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted">
									<i class="fas fa-cube text-sm text-fg-subdued"></i>
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-fg group-hover:text-primary">{item.name}</p>
								<p class="text-[10px] text-fg-subdued capitalize">{item.type}</p>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="rounded-sm border border-dashed border-border py-8 text-center">
					<i class="fas fa-cube mb-2 text-2xl text-fg-subdued/30"></i>
					<p class="text-sm text-fg-subdued">No items yet</p>
					<a href="/app/library" class="mt-2 inline-block text-xs text-primary hover:text-primary-hover">Create your first item</a>
				</div>
			{/if}
		</div>

		<!-- Categories -->
		<div>
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Categories</h2>
				<a href="/app/category/new" class="text-xs text-primary hover:text-primary-hover">Add New</a>
			</div>
			{#if data.categories && data.categories.length > 0}
				<div class="space-y-1.5">
					{#each data.categories as cat}
						<a href="/app/category/{cat.id}" class="flex items-center gap-2.5 rounded-sm border border-border bg-surface px-3 py-2.5 transition-all hover:border-primary/50">
							{#if cat.icon}
								<i class="fas {cat.icon} text-sm" style="color: {cat.iconColor || 'var(--color-primary)'}"></i>
							{:else}
								<i class="fas fa-folder text-sm text-fg-subdued"></i>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm text-fg">{cat.name}</p>
								{#if cat.pages && cat.pages.length > 0}
									<p class="text-[10px] text-fg-subdued">{cat.pages.length} page{cat.pages.length !== 1 ? 's' : ''}</p>
								{/if}
							</div>
							<i class="fas fa-chevron-right text-[9px] text-fg-subdued/50"></i>
						</a>
					{/each}
				</div>
			{:else}
				<div class="rounded-sm border border-dashed border-border py-8 text-center">
					<i class="fas fa-folder mb-2 text-2xl text-fg-subdued/30"></i>
					<p class="text-sm text-fg-subdued">No categories yet</p>
					<a href="/app/category/new" class="mt-2 inline-block text-xs text-primary hover:text-primary-hover">Create your first category</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- Recent Training -->
	<div class="mt-6">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-fg-accent uppercase tracking-wide">Recent Training</h2>
			<div class="flex gap-3">
				<a href="/app/training/session/new" class="text-xs text-primary hover:text-primary-hover">New Session</a>
				<a href="/app/training/history" class="text-xs text-primary hover:text-primary-hover">View All</a>
			</div>
		</div>
		{#if data.recentSessions && data.recentSessions.length > 0}
			<div class="space-y-1.5">
				{#each data.recentSessions as session}
					{@const icon = getSessionIcon(session.activityTypes)}
					<a href="/app/training/session/{session.id}" class="flex items-center justify-between rounded-sm border border-border bg-surface p-3 transition-all hover:border-primary/50">
						<div class="flex items-center gap-3">
							<div class="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10">
								<i class="fas {icon.icon} {icon.color} text-sm"></i>
							</div>
							<div>
								<p class="text-sm font-medium text-fg">{session.title || 'Training Session'}</p>
								<p class="text-[10px] text-fg-subdued">
									{new Date(session.startedAt).toLocaleDateString()}
									{#if session.duration} · {formatDuration(session.duration)}{/if}
								</p>
							</div>
						</div>
						<i class="fas fa-chevron-right text-[9px] text-fg-subdued/50"></i>
					</a>
				{/each}
			</div>
		{:else}
			<div class="rounded-sm border border-dashed border-border py-8 text-center">
				<i class="fas fa-dumbbell mb-2 text-2xl text-fg-subdued/30"></i>
				<p class="text-sm text-fg-subdued">No training sessions yet</p>
				<a href="/app/training/session/new" class="mt-2 inline-block text-xs text-primary hover:text-primary-hover">Start your first session</a>
			</div>
		{/if}
	</div>
</div>
