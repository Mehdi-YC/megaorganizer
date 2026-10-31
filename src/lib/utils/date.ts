/**
 * Format a date as the `YYYY-MM-DD` key used for date-only fields (todo due
 * dates, invoice dates, "today" comparisons).
 *
 * Uses the local calendar, not `toISOString()`: the ISO form is UTC, so a
 * user in UTC+1 opening the app at 00:30 local would see yesterday's date,
 * and a UTC-5 user would see tomorrow's after 19:00.
 */
export function toDateKey(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` key for today plus an offset in days (local calendar). */
export function dateKeyWithOffset(offsetDays: number): string {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);
	return toDateKey(date);
}
