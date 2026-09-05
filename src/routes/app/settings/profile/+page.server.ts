import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { handleAuthError } from '$lib/server/api-helpers';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}
	return {
		user: {
			name: locals.user.name,
			email: locals.user.email
		}
	};
};

export const actions: Actions = {
	updateProfile: async (event) => {
		if (!event.locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString() ?? '';

		if (!name) {
			return fail(400, { profileMessage: 'Name is required' });
		}

		try {
			await auth.api.updateUser({
				body: { name },
				headers: event.request.headers
			});
		} catch (error) {
			const { status, message } = handleAuthError(error, 'Failed to update profile');
			return fail(status, { profileMessage: message });
		}

		return { profileMessage: 'Profile updated successfully' };
	},

	changePassword: async (event) => {
		if (!event.locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await event.request.formData();
		const currentPassword = formData.get('currentPassword')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		if (!currentPassword || !newPassword) {
			return fail(400, { passwordMessage: 'All fields are required' });
		}

		if (newPassword.length < 8) {
			return fail(400, { passwordMessage: 'New password must be at least 8 characters' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { passwordMessage: 'New passwords do not match' });
		}

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword },
				headers: event.request.headers
			});
		} catch (error) {
			const { status, message } = handleAuthError(error, 'Failed to change password');
			return fail(status, { passwordMessage: message });
		}

		return { passwordMessage: 'Password changed successfully' };
	}
};
