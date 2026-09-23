/**
 * Request notification permission from the user
 * @returns {Promise<NotificationPermission>} The permission status
 */
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

/**
 * Show a browser notification
 * @param title The notification title
 * @param options Notification options
 */
export function showNotification(
	title: string,
	options?: NotificationOptions & { onClick?: () => void }
): Notification | null {
	if (!('Notification' in window) || Notification.permission !== 'granted') {
		return null;
	}

	const { onClick, ...notificationOptions } = options ?? {};

	const notification = new Notification(title, {
		icon: '/icons/icon-96.png',
		badge: '/icons/icon-96.png',
		tag: 'megareminder',
		...notificationOptions
	});

	if (onClick) {
		notification.onclick = () => {
			window.focus();
			onClick();
			notification.close();
		};
	}

	// Auto close after 10 seconds
	setTimeout(() => notification.close(), 10000);

	return notification;
}

/**
 * Show a reminder notification
 * @param reminder The reminder object
 */
export function showReminderNotification(reminder: {
	id: string;
	title: string;
	description?: string;
	dueAt: Date | string;
	todos?: Array<{ text: string; completed: boolean }>;
}): Notification | null {
	const dueTime = new Date(reminder.dueAt);
	const timeStr = dueTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	const pendingTodos = reminder.todos?.filter((t) => !t.completed) ?? [];
	const todoText =
		pendingTodos.length > 0
			? `${pendingTodos.length} todo${pendingTodos.length !== 1 ? 's' : ''} remaining`
			: '';

	return showNotification(reminder.title, {
		body: [reminder.description, `Due at ${timeStr}`, todoText].filter(Boolean).join('\n'),
		onClick: () => {
			window.location.href = `/app/reminders/${reminder.id}`;
		}
	});
}

/**
 * Check for due reminders and show notifications
 * This should be called on page load
 */
export async function checkAndNotifyReminders(): Promise<void> {
	const permission = await requestNotificationPermission();
	if (permission !== 'granted') return;

	try {
		const res = await fetch('/api/reminders?mode=due');
		if (!res.ok) return;

		const reminders = await res.json();
		if (!Array.isArray(reminders) || reminders.length === 0) return;

		// Check if we've already notified for these reminders in this session
		const notifiedKey = 'notified_reminders';
		const notified: string[] = JSON.parse(sessionStorage.getItem(notifiedKey) ?? '[]');

		const newReminders = reminders.filter((r: any) => !r.completed && !notified.includes(r.id));

		if (newReminders.length > 0) {
			// Show notification for the first new reminder
			const reminder = newReminders[0];
			showReminderNotification(reminder);

			// Mark as notified
			const updatedNotified = [...notified, ...newReminders.map((r: any) => r.id)];
			sessionStorage.setItem(notifiedKey, JSON.stringify(updatedNotified));
		}
	} catch (error) {
		console.error('Failed to check reminders:', error);
	}
}
