<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let name = $state('');
	let email = $state('');
	let password = $state('');
</script>

<div class="flex min-h-screen items-center justify-center bg-bg p-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center">
				<div class="flex h-12 w-12 items-center justify-center rounded-sm bg-primary text-lg font-bold text-white">
					M
				</div>
			</div>
			<h1 class="text-lg font-semibold text-fg-accent">Create your account</h1>
		</div>

		<div class="rounded-sm border border-border bg-surface p-6">
			<form method="post" action="?/signUpEmail" use:enhance class="space-y-4">
				<div class="flex flex-col gap-1.5">
					<label for="name" class="text-xs font-semibold text-fg-accent tracking-wide">Name</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						required
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="Your name"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="email" class="text-xs font-semibold text-fg-accent tracking-wide">Email</label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={email}
						required
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="you@example.com"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="password" class="text-xs font-semibold text-fg-accent tracking-wide">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						bind:value={password}
						required
						minlength="8"
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="••••••••"
					/>
				</div>

				{#if form?.message}
					<p class="text-xs text-error">{form.message}</p>
				{/if}

				<button
					type="submit"
					class="h-[36px] w-full rounded-sm bg-primary font-medium text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
				>
					Create Account
				</button>
			</form>
		</div>

		<p class="mt-4 text-center text-xs text-fg-subdued">
			Already have an account?
			<a href="/auth/login" class="font-medium text-primary hover:text-primary-hover">
				Sign in
			</a>
		</p>
	</div>
</div>
