<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let email = $state('');
	let password = $state('');
</script>

<div class="flex min-h-screen items-center justify-center bg-bg p-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-sm bg-primary text-lg font-bold text-white"
				>
					M
				</div>
			</div>
			<h1 class="text-lg font-semibold text-fg-accent">Sign in to MegaOrganize</h1>
		</div>

		<div class="rounded-sm border border-border bg-surface p-6">
			<form method="post" action="?/signInEmail" use:enhance class="space-y-4">
				<Input
					label="Email"
					type="email"
					id="email"
					name="email"
					bind:value={email}
					required
					placeholder="you@example.com"
				/>

				<Input
					label="Password"
					type="password"
					id="password"
					name="password"
					bind:value={password}
					required
					placeholder="••••••••"
				/>

				{#if form?.message}
					<p class="text-xs text-error">{form.message}</p>
				{/if}

				<Button type="submit" class="w-full">Sign In</Button>
			</form>
		</div>

		<p class="mt-4 text-center text-xs text-fg-subdued">
			Don't have an account?
			<a href="/auth/register" class="font-medium text-primary hover:text-primary-hover">
				Create one
			</a>
		</p>
	</div>
</div>
