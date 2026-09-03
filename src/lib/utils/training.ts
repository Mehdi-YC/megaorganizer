export const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
	strength: { icon: 'fa-dumbbell', color: 'text-blue-500' },
	running: { icon: 'fa-person-running', color: 'text-green-500' },
	cycling: { icon: 'fa-bicycle', color: 'text-orange-500' },
	walking: { icon: 'fa-person-walking', color: 'text-yellow-500' },
	swimming: { icon: 'fa-person-swimming', color: 'text-cyan-500' },
	other: { icon: 'fa-circle-dot', color: 'text-fg-subdued' }
};

export function getSessionIcon(activityTypes: string[]): { icon: string; color: string } {
	if (!activityTypes || activityTypes.length === 0) return ACTIVITY_ICONS.other;
	return ACTIVITY_ICONS[activityTypes[0]] ?? ACTIVITY_ICONS.other;
}
