export const DEFAULT_TAG_COLOR = '#5A31F4';
export const NODE_COLORS = ['#5a31f4', '#e35169', '#ffa439', '#2ec46d', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
export const NODE_ICONS = ['fa-folder', 'fa-book', 'fa-flask', 'fa-code', 'fa-graduation-cap', 'fa-tasks', 'fa-bolt', 'fa-star', 'fa-heart', 'fa-gamepad', 'fa-dumbbell', 'fa-music', 'fa-palette', 'fa-cube', 'fa-layer-group', 'fa-brain', 'fa-lightbulb', 'fa-rocket', 'fa-shield', 'fa-gem'];
export const SMALL_IMAGE_THRESHOLD = { width: 200, height: 150 };

export function parseMetadata(raw: string | null | undefined): Record<string, any> {
	if (!raw) return {};
	try { return JSON.parse(raw); } catch { return {}; }
}

export function getNodeColor(node: any): string {
	const meta = parseMetadata(node.metadata);
	if (meta.color) return meta.color;
	let hash = 0;
	for (let i = 0; i < node.name.length; i++) hash = node.name.charCodeAt(i) + ((hash << 5) - hash);
	return NODE_COLORS[Math.abs(hash) % NODE_COLORS.length];
}

export function getNodeIcon(node: any): string {
	const meta = parseMetadata(node.metadata);
	return meta.icon || 'fa-folder';
}

export function getAssignedTags(item: any, allTags: any[]): any[] {
	let ids: string[] = [];
	try { ids = item.tags ? JSON.parse(item.tags) : []; } catch { ids = []; }
	return allTags.filter((t) => ids.includes(t.id));
}

export function getTagIds(item: any): string[] {
	try { return item.tags ? JSON.parse(item.tags) : []; } catch { return []; }
}

export function isSmallImage(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(img.naturalWidth < SMALL_IMAGE_THRESHOLD.width || img.naturalHeight < SMALL_IMAGE_THRESHOLD.height);
		img.onerror = () => resolve(false);
		img.src = url;
	});
}

export async function checkSmallImages(items: any[], onUpdate: (ids: Set<string>) => void, existing?: Set<string>) {
	const small = new Set(existing ?? []);
	await Promise.all(items.map(async (item: any) => {
		if (!item.imageUrl || small.has(item.id)) return;
		if (await isSmallImage(item.imageUrl)) small.add(item.id);
	}));
	onUpdate(small);
}

export async function searchTree(query: string, typeFilter?: string): Promise<any[]> {
	const res = await fetch(`/api/tree?search=${encodeURIComponent(query)}`);
	if (!res.ok) return [];
	let results = await res.json();
	if (typeFilter) results = results.filter((r: any) => r.type === typeFilter);
	return results;
}

export function formatTime(totalSeconds: number | null | undefined): string {
	if (!totalSeconds) return '--';
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = Math.floor(totalSeconds % 60);
	return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`;
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
