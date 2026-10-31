import type { NodeMetadata, Tag, Taggable, TreeElement } from '$lib/types';

export const NODE_COLORS = [
	'#5a31f4',
	'#e35169',
	'#ffa439',
	'#2ec46d',
	'#3b82f6',
	'#a855f7',
	'#ec4899',
	'#14b8a6'
];
export const NODE_ICONS = [
	'fa-folder',
	'fa-book',
	'fa-flask',
	'fa-code',
	'fa-graduation-cap',
	'fa-tasks',
	'fa-bolt',
	'fa-star',
	'fa-heart',
	'fa-gamepad',
	'fa-dumbbell',
	'fa-music',
	'fa-palette',
	'fa-cube',
	'fa-layer-group',
	'fa-brain',
	'fa-lightbulb',
	'fa-rocket',
	'fa-shield',
	'fa-gem'
];
export const SMALL_IMAGE_THRESHOLD = { width: 200, height: 150 };

export function parseMetadata(raw: string | null | undefined): NodeMetadata {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		// The column is free-form JSON, so anything can be in it. Only an object
		// is meaningful here; a string or array would break the .color reads.
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

export function getNodeColor(node: Pick<TreeElement, 'name' | 'metadata'>): string {
	const meta = parseMetadata(node.metadata);
	if (meta.color) return meta.color;
	let hash = 0;
	for (let i = 0; i < node.name.length; i++) hash = node.name.charCodeAt(i) + ((hash << 5) - hash);
	return NODE_COLORS[Math.abs(hash) % NODE_COLORS.length];
}

export function getNodeIcon(node: Pick<TreeElement, 'metadata'>): string {
	const meta = parseMetadata(node.metadata);
	return meta.icon || 'fa-folder';
}

export function getAssignedTags(item: Taggable, allTags: Tag[]): Tag[] {
	let ids: string[] = [];
	try {
		ids = item.tags ? JSON.parse(item.tags) : [];
	} catch {
		ids = [];
	}
	return allTags.filter((t) => ids.includes(t.id));
}

export function getTagIds(item: Taggable): string[] {
	try {
		return item.tags ? JSON.parse(item.tags) : [];
	} catch {
		return [];
	}
}

export function isSmallImage(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () =>
			resolve(
				img.naturalWidth < SMALL_IMAGE_THRESHOLD.width ||
					img.naturalHeight < SMALL_IMAGE_THRESHOLD.height
			);
		img.onerror = () => resolve(false);
		img.src = url;
	});
}

export async function checkSmallImages(
	items: Pick<TreeElement, 'id' | 'imageUrl'>[],
	onUpdate: (ids: Set<string>) => void,
	existing?: Set<string>
) {
	const small = new Set(existing ?? []);
	await Promise.all(
		items.map(async (item) => {
			if (!item.imageUrl || small.has(item.id)) return;
			if (await isSmallImage(item.imageUrl)) small.add(item.id);
		})
	);
	onUpdate(small);
}

export async function searchTree(
	query: string,
	typeFilter?: TreeElement['type']
): Promise<TreeElement[]> {
	if (!query.trim() || query.trim().length < 3) return [];
	const res = await fetch(`/api/tree?search=${encodeURIComponent(query)}`);
	if (!res.ok) return [];
	let results: TreeElement[] = await res.json();
	if (typeFilter) results = results.filter((r) => r.type === typeFilter);
	return results;
}

export function formatTime(totalSeconds: number | null | undefined): string {
	if (!totalSeconds) return '--';
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = Math.floor(totalSeconds % 60);
	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatPace(secondsPerKm: number | null | undefined): string {
	if (!secondsPerKm || !isFinite(secondsPerKm) || secondsPerKm <= 0) return '--:--';
	const m = Math.floor(secondsPerKm / 60);
	const s = Math.floor(secondsPerKm % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

export function toggleArrayItem(arr: string[], id: string): string[] {
	return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

export function getContrastTextColor(hexColor?: string | null): string {
	if (!hexColor || typeof hexColor !== 'string') return '#ffffff';
	const clean = hexColor.trim().replace(/^#/, '');
	if (clean.length !== 3 && clean.length !== 6 && clean.length !== 8) return '#ffffff';
	const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.slice(0, 2), 16);
	const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.slice(2, 4), 16);
	const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.slice(4, 6), 16);
	if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;
	return yiq >= 160 ? '#111827' : '#ffffff';
}

export function formatIconClass(icon?: string | null): string {
	if (!icon || !icon.trim()) return 'fas fa-folder';
	const trimmed = icon.trim();
	if (
		trimmed.startsWith('fa-solid ') ||
		trimmed.startsWith('fas ') ||
		trimmed.startsWith('far ') ||
		trimmed.startsWith('fab ')
	) {
		return trimmed;
	}
	const clean = trimmed.startsWith('fa-') ? trimmed : `fa-${trimmed}`;
	return `fas ${clean}`;
}
