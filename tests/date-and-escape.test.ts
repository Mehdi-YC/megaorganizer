import { describe, it, expect } from 'bun:test';
import { escapeHtml } from '$lib/utils/html';
import { toDateKey, dateKeyWithOffset } from '$lib/utils/date';

describe('escapeHtml', () => {
	it('neutralises markup in invoice fields', () => {
		expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
		expect(escapeHtml('Ben <b>Ali</b> & "Fils"')).toBe(
			'Ben &lt;b&gt;Ali&lt;/b&gt; &amp; &quot;Fils&quot;'
		);
		expect(escapeHtml("l'atelier")).toBe('l&#39;atelier');
	});

	it('renders null and undefined as empty', () => {
		expect(escapeHtml(null)).toBe('');
		expect(escapeHtml(undefined)).toBe('');
	});
});

describe('date keys', () => {
	it('uses the local calendar date, not UTC', () => {
		// 00:30 local time: toISOString() would report the previous day for
		// any timezone east of UTC.
		const justAfterMidnight = new Date(2026, 2, 4, 0, 30);
		expect(toDateKey(justAfterMidnight)).toBe('2026-03-04');

		const lateEvening = new Date(2026, 2, 4, 23, 30);
		expect(toDateKey(lateEvening)).toBe('2026-03-04');
	});

	it('pads month and day', () => {
		expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
	});

	it('offsets by whole local days', () => {
		const today = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(today.getDate() + 1);
		expect(dateKeyWithOffset(1)).toBe(toDateKey(tomorrow));
		expect(dateKeyWithOffset(0)).toBe(toDateKey(today));
	});
});
