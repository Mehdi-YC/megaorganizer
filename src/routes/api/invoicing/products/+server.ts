import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getProducts,
	getProduct,
	createProduct,
	updateProduct,
	deleteProduct
} from '$lib/server/services/invoice.service';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const id = url.searchParams.get('id');
	if (id) {
		const product = await getProduct(locals.user.id, id);
		if (!product) return json({ error: 'Product not found' }, { status: 404 });
		return json(product);
	}

	const products = await getProducts(locals.user.id);
	return json(products);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		if (!body.name || !body.name.trim()) {
			return json({ error: 'Product name is required' }, { status: 400 });
		}
		const product = await createProduct(locals.user.id, body);
		return json(product, { status: 201 });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to create product';
		return json({ error: msg }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		if (!body.id) {
			return json({ error: 'Product id is required' }, { status: 400 });
		}
		const product = await updateProduct(locals.user.id, body.id, body);
		return json(product);
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to update product';
		return json({ error: msg }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const id = url.searchParams.get('id') || (await request.json().catch(() => ({}))).id;
		if (!id) return json({ error: 'Product id is required' }, { status: 400 });

		await deleteProduct(locals.user.id, id);
		return json({ success: true });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to delete product';
		return json({ error: msg }, { status: 400 });
	}
};
