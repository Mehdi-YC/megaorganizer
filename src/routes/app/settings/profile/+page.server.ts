import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { handleAuthError } from '$lib/server/api-helpers';
import { getUserSettings } from '$lib/server/services/finance.service';
import {
	getUserInvoiceProfile,
	updateUserInvoiceProfile,
	saveUserMediaFile
} from '$lib/server/services/invoice.service';
import type { EnabledFeatures } from '$lib/types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	const settings = await getUserSettings(locals.user.id);
	const invoicingProfile = await getUserInvoiceProfile(locals.user.id);

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
		user: {
			name: locals.user.name,
			email: locals.user.email
		},
		financeSettings: settings,
		enabledFeatures,
		invoicingProfile,
		mcpUrl: `${url.origin}/api/mcp`
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
			return fail(400, { profileMessage: { text: 'Name is required', ok: false } });
		}

		try {
			await auth.api.updateUser({
				body: { name },
				headers: event.request.headers
			});
		} catch (error) {
			const { status, message } = handleAuthError(error, 'Failed to update profile');
			return fail(status, { profileMessage: { text: message, ok: false } });
		}

		return { profileMessage: { text: 'Profile updated successfully', ok: true } };
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
			return fail(400, { passwordMessage: { text: 'All fields are required', ok: false } });
		}

		if (newPassword.length < 8) {
			return fail(400, {
				passwordMessage: { text: 'New password must be at least 8 characters', ok: false }
			});
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { passwordMessage: { text: 'New passwords do not match', ok: false } });
		}

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword },
				headers: event.request.headers
			});
		} catch (error) {
			const { status, message } = handleAuthError(error, 'Failed to change password');
			return fail(status, { passwordMessage: { text: message, ok: false } });
		}

		return { passwordMessage: { text: 'Password changed successfully', ok: true } };
	},

	updateFinanceSettings: async (event) => {
		if (!event.locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await event.request.formData();
		const currency = formData.get('currency')?.toString() || 'DZD';
		const currencyRate = parseFloat(formData.get('currencyRate')?.toString() || '1');
		const monthlyLimitStr = formData.get('monthlySpendingLimit')?.toString();
		const monthlySpendingLimit = monthlyLimitStr ? parseFloat(monthlyLimitStr) : null;

		try {
			const { updateUserSettings } = await import('$lib/server/services/finance.service');
			await updateUserSettings(event.locals.user.id, {
				currency,
				currencyRate: isNaN(currencyRate) ? 1 : currencyRate,
				monthlySpendingLimit:
					monthlySpendingLimit && !isNaN(monthlySpendingLimit) ? monthlySpendingLimit : null
			});
		} catch (error) {
			return fail(500, {
				financeMessage: { text: 'Failed to update finance settings', ok: false }
			});
		}

		return { financeMessage: { text: 'Finance settings updated successfully', ok: true } };
	},

	updateInvoicingProfile: async (event) => {
		if (!event.locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await event.request.formData();
		const brandName = formData.get('brandName')?.toString() || null;
		const brandTagline = formData.get('brandTagline')?.toString() || null;
		const address = formData.get('address')?.toString() || null;
		const phone = formData.get('phone')?.toString() || null;
		const nif = formData.get('nif')?.toString() || null;
		const anae = formData.get('anae')?.toString() || null;
		const rc = formData.get('rc')?.toString() || null;
		const nis = formData.get('nis')?.toString() || null;
		const ai = formData.get('ai')?.toString() || null;
		const rib = formData.get('rib')?.toString() || null;

		try {
			await updateUserInvoiceProfile(event.locals.user.id, {
				brandName,
				brandTagline,
				address,
				phone,
				nif,
				anae,
				rc,
				nis,
				ai,
				rib
			});
		} catch (error) {
			return fail(500, {
				invoicingMessage: {
					text: 'Erreur lors de la mise à jour des informations de facturation',
					ok: false
				}
			});
		}

		return {
			invoicingMessage: { text: 'Informations de facturation mises à jour avec succès', ok: true }
		};
	},

	uploadMedia: async (event) => {
		if (!event.locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await event.request.formData();
		const type = formData.get('type')?.toString() as 'signature' | 'stamp';
		const file = formData.get('file') as File | null;

		if (!file || file.size === 0 || (type !== 'signature' && type !== 'stamp')) {
			return fail(400, {
				mediaMessage: { text: 'Fichier invalide ou type incorrect', ok: false }
			});
		}

		try {
			await saveUserMediaFile(event.locals.user.id, type, file);
		} catch (error) {
			return fail(500, {
				mediaMessage: { text: 'Erreur lors du téléversement du fichier', ok: false }
			});
		}

		return {
			mediaMessage: {
				text: `${type === 'signature' ? 'Signature' : 'Cachet'} téléversé avec succès`,
				ok: true
			}
		};
	},

	updateFeatures: async (event) => {
		if (!event.locals.user) {
			throw redirect(302, '/auth/login');
		}

		const formData = await event.request.formData();
		const features: EnabledFeatures = {
			todos: formData.get('todos') === 'on',
			reminders: formData.get('reminders') === 'on',
			finance: formData.get('finance') === 'on',
			invoicing: formData.get('invoicing') === 'on',
			training: formData.get('training') === 'on',
			ydk: formData.get('ydk') === 'on'
		};

		try {
			const { updateUserSettings } = await import('$lib/server/services/finance.service');
			await updateUserSettings(event.locals.user.id, {
				enabledFeatures: JSON.stringify(features)
			});
		} catch {
			return fail(500, {
				featuresMessage: { text: 'Erreur lors de la mise à jour des fonctionnalités', ok: false }
			});
		}

		return {
			featuresMessage: { text: 'Fonctionnalités mises à jour avec succès', ok: true }
		};
	}
};
