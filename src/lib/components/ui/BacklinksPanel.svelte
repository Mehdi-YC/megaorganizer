<script lang="ts">
	import Button from './Button.svelte';
	import type { Backlink } from '$lib/server/services/wikilink.service';

	let { backlinks = [] }: { backlinks?: Backlink[] } = $props();
</script>

{#if backlinks.length > 0}
	<section class="mt-6 rounded-sm border border-border bg-surface p-4">
		<h3 class="mb-2 text-xs font-semibold tracking-wide text-fg-accent uppercase">
			Linked from ({backlinks.length})
		</h3>
		<div class="flex flex-col items-start gap-1.5">
			{#each backlinks as bl (bl.sourceId)}
				<Button href={bl.href} variant="secondary" size="sm">
					<i class="fas fa-link mr-2 text-xs"></i>
					{bl.title}
				</Button>
			{/each}
		</div>
	</section>
{/if}
