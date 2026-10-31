<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title = undefined,
		description = undefined,
		icon = undefined,
		iconColor = undefined,
		iconBg = undefined,
		headerAction = undefined,
		footer = undefined,
		children,
		class: className = '',
		hoverable = false,
		onclick = undefined
	}: {
		title?: string;
		description?: string;
		icon?: string;
		iconColor?: string;
		iconBg?: string;
		headerAction?: Snippet;
		footer?: Snippet;
		children?: Snippet;
		class?: string;
		hoverable?: boolean;
		onclick?: (e: MouseEvent) => void;
	} = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group relative flex flex-col rounded-xl border border-border bg-surface text-fg transition-all duration-200 {hoverable
		? 'cursor-pointer hover:border-border-strong hover:shadow-sm'
		: ''} {className}"
	{onclick}
>
	{#if title || description || icon || headerAction}
		<div class="flex items-start justify-between gap-4 p-5 pb-3">
			<div class="flex min-w-0 items-start gap-3.5">
				{#if icon}
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base shadow-xs {iconBg ??
							(iconColor ? `${iconColor} bg-muted` : 'bg-primary text-white')}"
					>
						<i class={icon}></i>
					</div>
				{/if}
				<div class="min-w-0">
					{#if title}
						<h3
							class="truncate text-base font-semibold tracking-tight text-fg {description
								? 'cursor-help'
								: ''}"
							title={description}
						>
							{title}
						</h3>
					{/if}
					{#if description}
						<p class="mt-0.5 line-clamp-2 hidden text-xs text-fg-subdued sm:block">
							{description}
						</p>
					{/if}
				</div>
			</div>
			{#if headerAction}
				<div class="shrink-0">
					{@render headerAction()}
				</div>
			{/if}
		</div>
	{/if}

	{#if children}
		<div class="flex-1 px-5 py-3">
			{@render children()}
		</div>
	{/if}

	{#if footer}
		<div
			class="mt-auto flex items-center justify-between gap-3 rounded-b-xl border-t border-border/60 bg-muted/20 px-5 py-3.5"
		>
			{@render footer()}
		</div>
	{/if}
</div>
