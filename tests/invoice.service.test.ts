import { describe, expect, test } from 'bun:test';
import {
	formatDZD,
	formatDateDZ,
	numberToFrenchWords
} from '../src/lib/server/services/invoice.service';

describe('Algerian law invoice formatting', () => {
	test('formatDZD formats Algerian Dinars with space separator and 2 decimals', () => {
		expect(formatDZD(405000)).toBe('405 000,00 DA');
		expect(formatDZD(205000)).toBe('205 000,00 DA');
		expect(formatDZD(0)).toBe('0,00 DA');
		expect(formatDZD(1234.5)).toBe('1 234,50 DA');
	});

	test('formatDateDZ formats date string into DD/MM/YYYY', () => {
		expect(formatDateDZ('2026-08-09')).toBe('09/08/2026');
		expect(formatDateDZ('2026-10-30')).toBe('30/10/2026');
	});

	test('numberToFrenchWords converts numeric amounts to French words with Dinar currency', () => {
		// Test the exact amount from reference invoice: 405 000,00 DA
		expect(numberToFrenchWords(405000)).toBe('Quatre Cent Cinq Mille Dinar');

		// 1 DA
		expect(numberToFrenchWords(1)).toBe('Un Dinar');

		// 0 DA
		expect(numberToFrenchWords(0)).toBe('Zéro');

		// With centimes
		expect(numberToFrenchWords(405000.5)).toBe(
			'Quatre Cent Cinq Mille Dinar et Cinquante Centimes'
		);

		// Common Algerian business amounts
		expect(numberToFrenchWords(200000)).toBe('Deux Cents Mille Dinar');
	});
});
