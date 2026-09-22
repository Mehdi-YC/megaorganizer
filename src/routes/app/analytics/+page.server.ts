import { getAnalytics } from '$lib/server/services/analytics.service';
import { getUserSettings } from '$lib/server/services/finance.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return {
			analytics: null,
			settings: { currency: 'DZD' }
		};
	}

	const [analytics, settings] = await Promise.all([
		getAnalytics(locals.user.id),
		getUserSettings(locals.user.id)
	]);

	return {
		analytics,
		settings
	};
};
