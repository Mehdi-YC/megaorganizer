<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { showToast } from '$lib/utils/toast.svelte';
	import type { Todo } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let newTitle = $state('');
	let newDueDate = $state('');
	let newPriority = $state<'low' | 'medium' | 'high'>('medium');
	let isAdding = $state(false);
	let currentFilter = $state<'today' | 'upcoming' | 'nodate' | 'all' | 'completed'>('today');
	let searchQuery = $state('');

	const todayStr = new Date().toISOString().slice(0, 10);

	function setQuickDate(offsetDays: number | null) {
		if (offsetDays === null) {
			newDueDate = '';
			return;
		}
		const d = new Date();
		d.setDate(d.getDate() + offsetDays);
		newDueDate = d.toISOString().slice(0, 10);
	}

	const filteredTodos = $derived.by(() => {
		const list = data.todos || [];
		return list.filter((t: Todo) => {
			if (searchQuery.trim()) {
				if (!t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
					return false;
				}
			}

			switch (currentFilter) {
				case 'today':
					return !t.completed && (t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr));
				case 'upcoming':
					return !t.completed && t.dueDate && t.dueDate > todayStr;
				case 'nodate':
					return !t.completed && !t.dueDate;
				case 'completed':
					return t.completed;
				case 'all':
				default:
					return true;
			}
		});
	});

	const counts = $derived.by(() => {
		const list = data.todos || [];
		let todayCount = 0;
		let upcomingCount = 0;
		let noDateCount = 0;
		let completedCount = 0;

		for (const t of list) {
			if (t.completed) {
				completedCount++;
			} else if (t.dueDate === todayStr || (t.dueDate && t.dueDate < todayStr)) {
				todayCount++;
			} else if (t.dueDate && t.dueDate > todayStr) {
				upcomingCount++;
			} else {
				noDateCount++;
			}
		}

		return {
			today: todayCount,
			upcoming: upcomingCount,
			nodate: noDateCount,
			completed: completedCount,
			total: list.length
		};
	});

	async function handleAdd() {
		if (!newTitle.trim() || isAdding) return;
		isAdding = true;

		try {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newTitle.trim(),
					dueDate: newDueDate || null,
					priority: newPriority
				})
			});

			if (res.ok) {
				newTitle = '';
				newDueDate = '';
				newPriority = 'medium';
				showToast('Tâche ajoutée', 'success');
				await invalidateAll();
			} else {
				showToast("Erreur lors de l'ajout", 'error');
			}
		} catch {
			showToast("Erreur lors de l'ajout", 'error');
		} finally {
			isAdding = false;
		}
	}

	async function handleToggle(t: Todo) {
		// Optimistic update
		t.completed = !t.completed;
		try {
			const res = await fetch('/api/todos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'toggle',
					id: t.id
				})
			});
			if (!res.ok) {
				t.completed = !t.completed;
				showToast('Erreur', 'error');
			} else {
				await invalidateAll();
			}
		} catch {
			t.completed = !t.completed;
			showToast('Erreur', 'error');
		}
	}

	async function handleDelete(id: string) {
		try {
			const res = await fetch(`/api/todos?id=${id}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				showToast('Tâche supprimée', 'success');
				await invalidateAll();
			} else {
				showToast('Erreur lors de la suppression', 'error');
			}
		} catch {
			showToast('Erreur', 'error');
		}
	}

	function formatDueDate(dueDate: string | null | undefined): { text: string; isOverdue: boolean } {
		if (!dueDate) return { text: '', isOverdue: false };
		if (dueDate === todayStr) return { text: "Aujourd'hui", isOverdue: false };

		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const tomorrowStr = tomorrow.toISOString().slice(0, 10);
		if (dueDate === tomorrowStr) return { text: 'Demain', isOverdue: false };

		const [y, m, d] = dueDate.split('-');
		const formatted = `${d}/${m}/${y}`;
		const isOverdue = dueDate < todayStr;
		return { text: isOverdue ? `${formatted} (En retard)` : formatted, isOverdue };
	}
</script>

<svelte:head>
	<title>Tâches - MegaOrganize</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-4 sm:p-8">
	<PageHeader
		title="Tâches"
		subtitle="Gestion rapide et simple de vos to-dos et échéances"
		descriptionOnHover
	/>

	<!-- Quick Add Form -->
	<div class="mb-6 rounded-sm border border-border bg-surface p-4 shadow-xs">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleAdd();
			}}
			class="space-y-3"
		>
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={newTitle}
					placeholder="Ajouter une tâche... (ex: Envoyer devis client, Faire courses)"
					class="flex-1 rounded-sm border border-border-strong bg-bg px-3.5 py-2 text-sm text-fg placeholder:text-fg-subdued focus:border-primary-text focus:outline-none"
				/>
				<Button type="submit" disabled={!newTitle.trim() || isAdding}>
					<i class="fas fa-plus mr-1.5 text-xs"></i>
					<span>Ajouter</span>
				</Button>
			</div>

			<!-- Quick Options: Date & Priority -->
			<div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-fg-subdued">
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="mr-1 text-[11px] font-medium text-fg-subdued">Échéance :</span>
					<button
						type="button"
						class="cursor-pointer rounded-xs px-2 py-0.5 transition-colors {newDueDate === todayStr
							? 'bg-primary font-medium text-white'
							: 'bg-muted text-fg hover:bg-border'}"
						onclick={() => setQuickDate(0)}
					>
						Aujourd'hui
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-xs px-2 py-0.5 transition-colors {newDueDate ===
						new Date(Date.now() + 86400000).toISOString().slice(0, 10)
							? 'bg-primary font-medium text-white'
							: 'bg-muted text-fg hover:bg-border'}"
						onclick={() => setQuickDate(1)}
					>
						Demain
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-xs px-2 py-0.5 transition-colors {!newDueDate
							? 'bg-primary font-medium text-white'
							: 'bg-muted text-fg hover:bg-border'}"
						onclick={() => setQuickDate(null)}
					>
						Sans date
					</button>
					<input
						type="date"
						bind:value={newDueDate}
						class="ml-1 rounded-xs border border-border-strong bg-bg px-2 py-0.5 text-xs text-fg focus:outline-none"
					/>
				</div>

				<div class="flex items-center gap-2">
					<span class="text-[11px] font-medium text-fg-subdued">Priorité :</span>
					<select
						bind:value={newPriority}
						class="rounded-xs border border-border-strong bg-bg px-2 py-0.5 text-xs text-fg focus:outline-none"
					>
						<option value="low">Basse</option>
						<option value="medium">Moyenne</option>
						<option value="high">Haute</option>
					</select>
				</div>
			</div>
		</form>
	</div>

	<!-- Navigation Tabs -->
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
		<div class="flex flex-wrap items-center gap-1.5">
			<button
				type="button"
				class="cursor-pointer rounded-sm px-3 py-1.5 text-xs font-medium transition-colors {currentFilter ===
				'today'
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (currentFilter = 'today')}
			>
				Aujourd'hui <span class="ml-1 opacity-75">({counts.today})</span>
			</button>
			<button
				type="button"
				class="cursor-pointer rounded-sm px-3 py-1.5 text-xs font-medium transition-colors {currentFilter ===
				'upcoming'
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (currentFilter = 'upcoming')}
			>
				À venir <span class="ml-1 opacity-75">({counts.upcoming})</span>
			</button>
			<button
				type="button"
				class="cursor-pointer rounded-sm px-3 py-1.5 text-xs font-medium transition-colors {currentFilter ===
				'nodate'
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (currentFilter = 'nodate')}
			>
				Sans date <span class="ml-1 opacity-75">({counts.nodate})</span>
			</button>
			<button
				type="button"
				class="cursor-pointer rounded-sm px-3 py-1.5 text-xs font-medium transition-colors {currentFilter ===
				'all'
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (currentFilter = 'all')}
			>
				Toutes <span class="ml-1 opacity-75">({counts.total})</span>
			</button>
			<button
				type="button"
				class="cursor-pointer rounded-sm px-3 py-1.5 text-xs font-medium transition-colors {currentFilter ===
				'completed'
					? 'bg-primary text-white'
					: 'bg-muted text-fg hover:bg-border'}"
				onclick={() => (currentFilter = 'completed')}
			>
				Terminées <span class="ml-1 opacity-75">({counts.completed})</span>
			</button>
		</div>

		<div class="w-full sm:w-56">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Filtrer les tâches..."
				class="w-full rounded-sm border border-border bg-bg px-2.5 py-1 text-xs text-fg placeholder:text-fg-subdued focus:outline-none"
			/>
		</div>
	</div>

	<!-- Todos List -->
	{#if filteredTodos.length > 0}
		<div class="divide-y divide-border rounded-sm border border-border bg-surface">
			{#each filteredTodos as t (t.id)}
				{@const dueInfo = formatDueDate(t.dueDate)}
				<div
					class="group flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/40 {t.completed
						? 'opacity-60'
						: ''}"
				>
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<button
							type="button"
							class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-xs border transition-colors {t.completed
								? 'border-success bg-success text-white'
								: 'border-border-strong hover:border-fg-subdued'}"
							onclick={() => handleToggle(t)}
							aria-label="Toggle todo"
						>
							{#if t.completed}
								<i class="fas fa-check text-[10px]"></i>
							{/if}
						</button>

						<div class="min-w-0 flex-1">
							<span
								class="text-sm font-medium text-fg {t.completed
									? 'text-fg-subdued line-through'
									: ''}"
							>
								{t.title}
							</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						{#if t.priority === 'high'}
							<span
								class="rounded-xs bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-500"
							>
								Haute
							</span>
						{:else if t.priority === 'low'}
							<span class="rounded-xs bg-muted px-1.5 py-0.5 text-[10px] text-fg-subdued">
								Basse
							</span>
						{/if}

						{#if dueInfo.text}
							<span
								class="flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] {dueInfo.isOverdue &&
								!t.completed
									? 'bg-error/15 font-medium text-error'
									: 'bg-muted text-fg-subdued'}"
							>
								<i class="far fa-calendar text-[10px]"></i>
								{dueInfo.text}
							</span>
						{/if}

						<button
							type="button"
							class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs text-fg-subdued opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-error"
							onclick={() => handleDelete(t.id)}
							title="Supprimer"
						>
							<i class="fas fa-trash text-xs"></i>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<EmptyState
			message="Aucune tâche"
			submessage={currentFilter === 'today'
				? "Vous n'avez aucune tâche prévue pour aujourd'hui !"
				: 'Aucune tâche trouvée pour ce filtre.'}
			icon="fa-check-circle"
		/>
	{/if}
</div>
