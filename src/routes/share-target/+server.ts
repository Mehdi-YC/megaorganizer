import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PWA share_target endpoint: the Android share sheet POSTs here and lands
// in the app with QuickCapture prefilled (see QuickCapture.svelte).
export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const params = new URLSearchParams();
	const title = form.get('title')?.toString().trim();
	const text = form.get('text')?.toString().trim();
	const url = form.get('url')?.toString().trim();
	if (title) params.set('share_title', title);
	if (text) params.set('share_text', text);
	if (url) params.set('share_url', url);
	return redirect(303, `/app${params.size > 0 ? `?${params.toString()}` : ''}`);
};

export const GET: RequestHandler = () => redirect(303, '/app');
