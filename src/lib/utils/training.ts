export const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
	strength: { icon: 'fa-dumbbell', color: 'text-blue-500' },
	running: { icon: 'fa-person-running', color: 'text-green-500' },
	cycling: { icon: 'fa-bicycle', color: 'text-orange-500' },
	walking: { icon: 'fa-person-walking', color: 'text-yellow-500' },
	swimming: { icon: 'fa-person-swimming', color: 'text-cyan-500' },
	hiit: { icon: 'fa-fire', color: 'text-error' },
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
