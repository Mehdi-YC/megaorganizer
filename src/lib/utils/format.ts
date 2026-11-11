/** Locale-aware date and number formatting, shared by every module. */

/** Display order and labels for weekdays, Monday first (ISO). */
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Month names for display headers. */
export const MONTH_LABELS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const;

export function formatDate(
	value: Date | string | number,
	opts?: Intl.DateTimeFormatOptions
): string {
	const d = value instanceof Date ? value : new Date(value);
	return d.toLocaleDateString(
		undefined,
		opts ?? { year: 'numeric', month: 'short', day: 'numeric' }
	);
}

export function formatDateTime(value: Date | string | number): string {
	const d = value instanceof Date ? value : new Date(value);
	return d.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/** Clock time without seconds, e.g. "18:30". */
export function formatTimeOfDay(value: Date | string | number): string {
	const d = value instanceof Date ? value : new Date(value);
	return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Plain amount with locale separators (currency shown separately). */
export function formatAmount(amount: number): string {
	return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatMoney(amount: number, currency: string): string {
	return `${formatAmount(amount)} ${currency}`;
}
