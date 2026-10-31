import { redirect } from '@sveltejs/kit';
import { getCategoriesWithPages } from '$lib/server/services/category.service';
import { getInvoiceYears } from '$lib/server/services/invoice.service';
import { getUserSettings } from '$lib/server/services/finance.service';
import type { EnabledFeatures } from '$lib/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const [categories, invoiceYears, settings] = await Promise.all([
		getCategoriesWithPages(locals.user.id),
		getInvoiceYears(locals.user.id),
		getUserSettings(locals.user.id)
	]);

	let enabledFeatures: EnabledFeatures = {
		todos: true,
		reminders: true,
		finance: true,
		invoicing: true,
		training: true,
		ydk: true
	};

	if (settings?.enabledFeatures) {
		try {
			enabledFeatures = { ...enabledFeatures, ...JSON.parse(settings.enabledFeatures) };
		} catch {
			// ignore
		}
	}

	return {
		categories,
		invoiceYears,
		enabledFeatures,
		user: {
			name: locals.user.name,
			email: locals.user.email,
			image: locals.user.image
		}
	};
};
