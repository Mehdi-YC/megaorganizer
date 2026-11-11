/** Locale-aware date and number formatting, shared by every module. */

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

export function formatMoney(amount: number, currency: string): string {
	return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}
