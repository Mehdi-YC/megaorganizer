/**
 * Invoice utility helpers for Algerian law compliance:
 * - DZD currency formatting
 * - Algerian standard date formatting (DD/MM/YYYY)
 * - French amount-in-words conversion with Dinars and Centimes
 */

export function formatDZD(amount: number): string {
	const fixed = (Number(amount) || 0).toFixed(2);
	const parts = fixed.split('.');
	const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return `${intPart},${parts[1]} DA`;
}

export function formatDateDZ(dateInput: Date | string | number): string {
	const d = new Date(dateInput);
	if (isNaN(d.getTime())) return '';
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();
	return `${day}/${month}/${year}`;
}

/**
 * Converts a numeric amount to formal French words as required by Algerian fiscal law.
 * Example: 405000 -> "Quatre Cent Cinq Mille Dinar"
 */
export function numberToFrenchWords(n: number): string {
	if (n === 0) return 'Zéro';
	if (n < 0) return 'Moins ' + numberToFrenchWords(-n);

	const units = [
		'',
		'Un',
		'Deux',
		'Trois',
		'Quatre',
		'Cinq',
		'Six',
		'Sept',
		'Huit',
		'Neuf',
		'Dix',
		'Onze',
		'Douze',
		'Treize',
		'Quatorze',
		'Quinze',
		'Seize',
		'Dix-Sept',
		'Dix-Huit',
		'Dix-Neuf'
	];

	const tens = [
		'',
		'',
		'Vingt',
		'Trente',
		'Quarante',
		'Cinquante',
		'Soixante',
		'Soixante',
		'Quatre-Vingt',
		'Quatre-Vingt'
	];

	function convertUnder1000(num: number): string {
		if (num === 0) return '';
		if (num < 20) return units[num];

		if (num < 100) {
			const t = Math.floor(num / 10);
			const u = num % 10;
			if (t === 7 || t === 9) {
				const base = tens[t];
				const rest = num - t * 10 + 10;
				if (t === 7 && rest === 11) return `${base} et Onze`;
				return `${base}-${units[rest]}`;
			}
			if (u === 0) {
				return t === 8 ? 'Quatre-Vingts' : tens[t];
			}
			if (u === 1 && t !== 8) return `${tens[t]} et Un`;
			return `${tens[t]}-${units[u]}`;
		}

		const h = Math.floor(num / 100);
		const rest = num % 100;
		let hStr: string;
		if (h === 1) {
			hStr = 'Cent';
		} else {
			hStr = `${units[h]} ${rest === 0 ? 'Cents' : 'Cent'}`;
		}

		if (rest > 0) {
			return `${hStr} ${convertUnder1000(rest)}`;
		}
		return hStr;
	}

	const whole = Math.floor(n);
	const centimes = Math.round((n - whole) * 100);

	const chunks: string[] = [];

	const billions = Math.floor(whole / 1_000_000_000);
	const millions = Math.floor((whole % 1_000_000_000) / 1_000_000);
	const thousands = Math.floor((whole % 1_000_000) / 1_000);
	const remainder = whole % 1_000;

	if (billions > 0) {
		chunks.push(`${convertUnder1000(billions)} ${billions > 1 ? 'Milliards' : 'Milliard'}`);
	}
	if (millions > 0) {
		chunks.push(`${convertUnder1000(millions)} ${millions > 1 ? 'Millions' : 'Million'}`);
	}
	if (thousands > 0) {
		if (thousands === 1) {
			chunks.push('Mille');
		} else {
			chunks.push(`${convertUnder1000(thousands)} Mille`);
		}
	}
	if (remainder > 0) {
		chunks.push(convertUnder1000(remainder));
	}

	let result = chunks.join(' ').trim();
	result = `${result} Dinar`;

	if (centimes > 0) {
		result += ` et ${convertUnder1000(centimes)} Centimes`;
	}

	return result;
}
