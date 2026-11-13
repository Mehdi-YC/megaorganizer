import type { PersonalRecord } from '$lib/types';

export const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
	strength: { icon: 'fa-dumbbell', color: 'text-accent-blue-text' },
	running: { icon: 'fa-person-running', color: 'text-accent-green-text' },
	cycling: { icon: 'fa-bicycle', color: 'text-accent-orange-text' },
	walking: { icon: 'fa-person-walking', color: 'text-accent-yellow-text' },
	swimming: { icon: 'fa-person-swimming', color: 'text-accent-cyan-text' },
	hiit: { icon: 'fa-fire', color: 'text-error-text' },
	other: { icon: 'fa-circle-dot', color: 'text-fg-subdued' }
};

/** Display labels for exercise muscle groups, shared by all training pages. */
export const MUSCLE_GROUP_LABELS: Record<string, string> = {
	chest: 'Chest',
	back: 'Back',
	shoulders: 'Shoulders',
	biceps: 'Biceps',
	triceps: 'Triceps',
	forearms: 'Forearms',
	abs: 'Abs',
	glutes: 'Glutes',
	quadriceps: 'Quadriceps',
	hamstrings: 'Hamstrings',
	calves: 'Calves',
	full_body: 'Full body',
	cardio: 'Cardio',
	other: 'Other'
};

export function getSessionIcon(activityTypes: string[]): { icon: string; color: string } {
	if (!activityTypes || activityTypes.length === 0) return ACTIVITY_ICONS.other;
	return ACTIVITY_ICONS[activityTypes[0]] ?? ACTIVITY_ICONS.other;
}

/** "6 × 60 kg" — the two PR values shown next to an exercise. */
export function formatPr(pr: PersonalRecord | null | undefined): string | null {
	if (!pr || (pr.maxWeight === null && pr.maxReps === null)) return null;
	if (pr.maxWeight !== null) {
		return `${pr.maxReps ?? '–'} × ${pr.maxWeight} ${pr.unit ?? 'kg'}`;
	}
	return `${pr.maxReps} reps`;
}
