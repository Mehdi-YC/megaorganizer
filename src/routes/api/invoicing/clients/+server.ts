import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getClients,
	getClient,
	createClient,
	updateClient,
	deleteClient
} from '$lib/server/services/invoice.service';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const id = url.searchParams.get('id');
	if (id) {
		const client = await getClient(locals.user.id, id);
		if (!client) return json({ error: 'Client not found' }, { status: 404 });
		return json(client);
	}

	const clients = await getClients(locals.user.id);
	return json(clients);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		if (!body.name || !body.name.trim()) {
			return json({ error: 'Client name is required' }, { status: 400 });
		}
		const client = await createClient(locals.user.id, body);
		return json(client, { status: 201 });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to create client';
		return json({ error: msg }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		if (!body.id) {
			return json({ error: 'Client id is required' }, { status: 400 });
		}
		const client = await updateClient(locals.user.id, body.id, body);
		return json(client);
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to update client';
		return json({ error: msg }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const id = url.searchParams.get('id') || (await request.json().catch(() => ({}))).id;
		if (!id) return json({ error: 'Client id is required' }, { status: 400 });

		await deleteClient(locals.user.id, id);
		return json({ success: true });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to delete client';
		return json({ error: msg }, { status: 400 });
	}
};
