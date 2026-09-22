/**
 * Get a human-readable label for a recurrence type and config
 */
export function getRecurrenceLabel(type: string, config?: string | null): string {
	if (!config) return getRecurrenceTypeLabel(type);

	try {
		const parsed = JSON.parse(config);
		const time =
			parsed.hour !== undefined
				? ` at ${parsed.hour.toString().padStart(2, '0')}:${(parsed.minute ?? 0).toString().padStart(2, '0')}`
				: '';

		switch (type) {
			case 'daily':
				return `Daily${time}`;

			case 'weekly': {
				if (parsed.days && parsed.days.length > 0) {
					const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
					const days = parsed.days.map((d: number) => dayNames[d]).join(', ');
					return `Weekly (${days})${time}`;
				}
				return `Weekly${time}`;
			}

			case 'monthly': {
				if (parsed.dayOfMonth) {
					return `Monthly (${parsed.dayOfMonth}${getOrdinalSuffix(parsed.dayOfMonth)})${time}`;
				}
				return `Monthly${time}`;
			}

			case 'yearly':
				return `Yearly${time}`;

			case 'yearly_date': {
				const months = [
					'Jan',
					'Feb',
					'Mar',
					'Apr',
					'May',
					'Jun',
					'Jul',
					'Aug',
					'Sep',
					'Oct',
					'Nov',
					'Dec'
				];
				const month = parsed.month !== undefined ? months[parsed.month] : '?';
				const day = parsed.day ?? '?';
				return `${month} ${day}${getOrdinalSuffix(day)} every year${time}`;
			}

			case 'monthly_relative': {
				const dayNames = [
					'Sunday',
					'Monday',
					'Tuesday',
					'Wednesday',
					'Thursday',
					'Friday',
					'Saturday'
				];
				const weekday = parsed.weekday !== undefined ? dayNames[parsed.weekday] : '?';
				const ordinal = getOrdinalLabel(parsed.weekdayOrdinal);
				return `${ordinal} ${weekday} of every month${time}`;
			}

			default:
				return getRecurrenceTypeLabel(type);
		}
	} catch {
		return getRecurrenceTypeLabel(type);
	}
}

/**
 * Get a simple label for recurrence type
 */
export function getRecurrenceTypeLabel(type: string): string {
	const labels: Record<string, string> = {
		daily: 'Daily',
		weekly: 'Weekly',
		monthly: 'Monthly',
		yearly: 'Yearly',
		yearly_date: 'Yearly (Specific Date)',
		monthly_relative: 'Monthly (Relative)'
	};
	return labels[type] || type;
}

/**
 * Get ordinal suffix (st, nd, rd, th)
 */
export function getOrdinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Get ordinal label (First, Second, Last, etc.)
 */
export function getOrdinalLabel(ordinal: number | undefined): string {
	if (ordinal === -1) return 'Last';
	if (ordinal === 1) return 'First';
	if (ordinal === 2) return 'Second';
	if (ordinal === 3) return 'Third';
	if (ordinal === 4) return 'Fourth';
	return `${ordinal}${getOrdinalSuffix(ordinal ?? 0)}`;
}
