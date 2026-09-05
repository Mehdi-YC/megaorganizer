import { getDashboardData } from '$lib/server/services/dashboard.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { recentItems: [], recentSessions: [], stats: { itemCount: 0, sessionCount: 0, totalDuration: 0 } };
	}

	return getDashboardData(locals.user.id);
};
