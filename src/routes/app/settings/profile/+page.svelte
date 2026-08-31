<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let name = $state(data.user?.name ?? '');
</script>

<svelte:head>
	<title>Edit Profile - MegaOrganize</title>
</svelte:head>

<div class="p-4 sm:p-8 max-w-2xl">
	<div class="mb-6">
		<a href="/app" class="text-sm text-fg-subdued hover:text-fg transition-colors">
			<i class="fas fa-arrow-left mr-1"></i> Back to Dashboard
		</a>
	</div>

	<h1 class="text-lg font-semibold text-fg-accent mb-6">Edit Profile</h1>

	<div class="rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Profile</h2>
		</div>
		<div class="px-6 py-5">
			<form method="post" action="?/updateProfile" use:enhance class="space-y-4">
				<div class="flex flex-col gap-1.5">
					<label for="name" class="text-xs font-semibold text-fg-accent tracking-wide">Name</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						required
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="email" class="text-xs font-semibold text-fg-accent tracking-wide">Email</label>
					<input
						type="email"
						id="email"
						value={data.user?.email}
						disabled
						class="h-[36px] w-full rounded-sm border border-border bg-muted px-3 text-sm text-fg-subdued cursor-not-allowed"
					/>
					<p class="text-[10px] text-fg-subdued">Email cannot be changed</p>
				</div>

				{#if form?.profileMessage}
					<p class="text-xs {form.profileMessage.includes('success') ? 'text-green-600' : 'text-error'}">{form.profileMessage}</p>
				{/if}

				<button
					type="submit"
					class="h-[36px] rounded-sm bg-primary px-6 font-medium text-white text-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
				>
					Save Changes
				</button>
			</form>
		</div>
	</div>

	<div class="mt-6 rounded-sm border border-border bg-surface">
		<div class="border-b border-border px-6 py-3">
			<h2 class="text-xs font-semibold text-fg-accent uppercase tracking-wide">Change Password</h2>
		</div>
		<div class="px-6 py-5">
			<form method="post" action="?/changePassword" use:enhance class="space-y-4">
				<div class="flex flex-col gap-1.5">
					<label for="currentPassword" class="text-xs font-semibold text-fg-accent tracking-wide">Current Password</label>
					<input
						type="password"
						id="currentPassword"
						name="currentPassword"
						required
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="••••••••"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="newPassword" class="text-xs font-semibold text-fg-accent tracking-wide">New Password</label>
					<input
						type="password"
						id="newPassword"
						name="newPassword"
						required
						minlength="8"
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="••••••••"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="confirmPassword" class="text-xs font-semibold text-fg-accent tracking-wide">Confirm New Password</label>
					<input
						type="password"
						id="confirmPassword"
						name="confirmPassword"
						required
						minlength="8"
						class="h-[36px] w-full rounded-sm border border-border bg-bg px-3 text-sm text-fg placeholder:text-fg-subdued transition-colors hover:border-fg-subdued focus:border-primary focus:outline-none focus:ring-0"
						placeholder="••••••••"
					/>
				</div>

				{#if form?.passwordMessage}
					<p class="text-xs {form.passwordMessage.includes('success') ? 'text-green-600' : 'text-error'}">{form.passwordMessage}</p>
				{/if}

				<button
					type="submit"
					class="h-[36px] rounded-sm bg-primary px-6 font-medium text-white text-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
				>
					Change Password
				</button>
			</form>
		</div>
	</div>
</div>
