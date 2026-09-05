import { redirect } from '@sveltejs/kit';
import { getCategoriesWithPages } from '$lib/server/services/category.service';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const categories = await getCategoriesWithPages(locals.user.id);

	return {
		categories,
		user: {
			name: locals.user.name,
			email: locals.user.email,
			image: locals.user.image
		}
	};
};
