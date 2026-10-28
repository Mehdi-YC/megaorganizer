<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen items-center justify-center bg-bg p-4">
	<div class="w-full max-w-md rounded-sm border border-border bg-surface p-6 text-center">
		<p class="text-5xl font-bold text-fg-subdued">{page.status}</p>
		<h1 class="mt-3 text-lg font-semibold text-fg-accent">
			{page.status === 404 ? 'That page does not exist' : 'Something went wrong'}
		</h1>
		<p class="mt-2 text-sm text-fg-subdued">
			{page.status === 404
				? 'The address may be wrong, or the page was deleted.'
				: (page.error?.message ?? 'The request could not be completed.')}
		</p>
		<div class="mt-6 flex justify-center gap-2">
			<a
				href={resolve('/app')}
				class="rounded-sm bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
			>
				Back to app
			</a>
			<button
				type="button"
				class="cursor-pointer rounded-sm border border-border bg-surface px-3 py-2 text-sm text-fg transition-colors hover:bg-muted"
				onclick={() => location.reload()}
			>
				Reload
			</button>
		</div>
	</div>
</div>
