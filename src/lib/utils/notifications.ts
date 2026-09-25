// Browser-side reminder notifications.
//
// Display goes through the service worker whenever possible. The page-side
// `new Notification()` constructor is not implemented by Chrome on Android or
// by iOS Safari, so it silently fails on phones — `registration.showNotification`
// is the only path that works there. Clicks on service-worker notifications are
// handled in static/sw.js (which navigates to `data.url` and runs the
// Done/Snooze actions).

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!('Notification' in window)) {
		console.warn('This browser does not support notifications');
		return 'denied';
	}

	if (Notification.permission === 'granted') {
		return 'granted';
	}

	if (Notification.permission !== 'denied') {
		const permission = await Notification.requestPermission();
		return permission;
	}

	return Notification.permission;
}

/** The service worker registration, waiting for it when it is still starting. */
async function resolveRegistration(): Promise<ServiceWorkerRegistration | undefined> {
	const existing = await navigator.serviceWorker.getRegistration();
	if (existing) return existing;
	return Promise.race([
		navigator.serviceWorker.ready,
		new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000))
	]);
}

export interface NotificationPayload {
	body?: string;
	tag?: string;
	/** Page to open when the notification is clicked. */
	url?: string;
	/** Enables the Done/Snooze actions and the reminder API callbacks. */
	reminderId?: string;
	/** Only honoured by the page-side fallback (service worker clicks navigate to `url`). */
	onClick?: () => void;
}

/**
 * Show a browser notification. Resolves once it has been displayed (or
 * silently skipped when notifications are unavailable or not permitted).
 */
export async function showNotification(
	title: string,
	options: NotificationPayload = {}
): Promise<void> {
	if (!('Notification' in window) || Notification.permission !== 'granted') return;

	const { onClick, url, reminderId, body, tag } = options;
	const icon = '/icons/icon-96.png';
	const data = { url: url ?? '/app/reminders', reminderId };
	const actions = reminderId
		? [
				{ action: 'done', title: 'Done' },
				{ action: 'snooze', title: 'Snooze 10m' }
			]
		: [];

	if ('serviceWorker' in navigator) {
		try {
			// The service worker registers on page load, so the first reminder
			// can fire before it exists; wait briefly for it instead of falling
			// back to the constructor, which mobile browsers do not implement.
			const registration = await resolveRegistration();
			if (registration) {
				// `actions` is part of the Notifications API but missing from
				// the DOM lib's NotificationOptions.
				const swOptions: NotificationOptions & {
					actions?: Array<{ action: string; title: string }>;
				} = {
					body: body ?? '',
					icon,
					badge: icon,
					tag: tag ?? 'megareminder',
					data,
					actions
				};
				await registration.showNotification(title, swOptions);
				return;
			}
		} catch {
			// Fall through to the page-side constructor.
		}
	}

	let notification: Notification;
	try {
		notification = new Notification(title, {
			body: body ?? '',
			icon,
			badge: icon,
			tag: tag ?? 'megareminder'
		});
	} catch {
		// The constructor is unsupported on some mobile browsers.
		return;
	}

	notification.onclick = () => {
		window.focus();
		if (onClick) onClick();
		else window.location.href = data.url;
		notification.close();
	};

	// Auto close after 10 seconds
	setTimeout(() => notification.close(), 10000);
}

/**
 * Show a reminder notification
 * @param reminder The reminder object
 */
export async function showReminderNotification(reminder: {
	id: string;
	title: string;
	description?: string;
	dueAt: Date | string;
	todos?: Array<{ text: string; completed: boolean }>;
}): Promise<void> {
	const dueTime = new Date(reminder.dueAt);
	const timeStr = dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	const pendingTodos = reminder.todos?.filter((t) => !t.completed) ?? [];
	const todoText =
		pendingTodos.length > 0
			? `${pendingTodos.length} todo${pendingTodos.length !== 1 ? 's' : ''} remaining`
			: '';

	await showNotification(reminder.title, {
		body: [reminder.description, `Due at ${timeStr}`, todoText].filter(Boolean).join('\n'),
		tag: `reminder-${reminder.id}`,
		url: `/app/reminders/${reminder.id}`,
		reminderId: reminder.id
	});
}

/**
 * Check for due reminders and show notifications
 * This should be called on page load
 */
export async function checkAndNotifyReminders(): Promise<void> {
	// Permission is requested only from a user gesture (the notification
	// prompt or the settings toggle). Chrome and Safari silently ignore
	// gesture-less prompts, so asking here would never grant anything.
	if (!('Notification' in window) || Notification.permission !== 'granted') return;

	try {
		// `tz` lets the server compute template recurrences in the user's
		// timezone (and backfill it onto templates saved before it existed).
		const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
		const res = await fetch(`/api/reminders?mode=due&tz=${tz}`);
		if (!res.ok) return;

		const reminders = await res.json();
		if (!Array.isArray(reminders) || reminders.length === 0) return;

		// Check if we've already notified for these reminders in this session
		const notifiedKey = 'notified_reminders';
		const notified: string[] = JSON.parse(sessionStorage.getItem(notifiedKey) ?? '[]');

		const newReminders = reminders.filter((r: any) => !r.completed && !notified.includes(r.id));

		if (newReminders.length > 0) {
			// Notify for every new due reminder, not just the first
			for (const reminder of newReminders) {
				await showReminderNotification(reminder);
			}

			// Mark as notified
			const updatedNotified = [...notified, ...newReminders.map((r: any) => r.id)];
			sessionStorage.setItem(notifiedKey, JSON.stringify(updatedNotified));
		}
	} catch (error) {
		console.error('Failed to check reminders:', error);
	}
}

/**
 * Keep checking for due reminders while the app is open. Returns a stop
 * function for cleanup.
 */
export function startReminderPolling(intervalMs = 60_000): () => void {
	void checkAndNotifyReminders();
	const id = setInterval(() => {
		void checkAndNotifyReminders();
	}, intervalMs);
	return () => clearInterval(id);
}
