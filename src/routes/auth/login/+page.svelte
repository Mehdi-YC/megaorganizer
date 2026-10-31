<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import type { ActionData } from './$types';
	import { onMount } from 'svelte';
	import { clearAppCaches } from '$lib/utils/cache';

	let { form }: { form: ActionData } = $props();
	let email = $state('');
	let password = $state('');

	onMount(() => {
		void clearAppCaches();
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-bg p-4 sm:p-6">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-md shadow-primary/25"
				>
					<i class="fas fa-layer-group"></i>
				</div>
			</div>
			<h1 class="text-xl font-bold tracking-tight text-fg">Welcome back</h1>
			<p class="mt-1 text-xs text-fg-subdued">Sign in to your MegaOrganize workspace</p>
		</div>

		<div class="rounded-2xl border border-border bg-surface p-7 shadow-xl">
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
					<p class="text-xs font-medium text-error">{form.message}</p>
				{/if}

				<Button type="submit" class="w-full">Sign In</Button>
			</form>
		</div>

		<p class="mt-5 text-center text-xs text-fg-subdued">
			Don't have an account?
			<a
				href={resolve('/auth/register')}
				class="ml-1 font-semibold text-primary-text hover:underline"
			>
				Create one
			</a>
		</p>
	</div>
</div>
