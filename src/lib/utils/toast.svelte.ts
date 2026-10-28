export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
	id: number;
	message: string;
	variant: ToastVariant;
}

export const toastState = $state<{ items: Toast[] }>({ items: [] });

let nextId = 0;

/** Show a short-lived message. Repeated identical messages are collapsed. */
export function showToast(message: string, variant: ToastVariant = 'info', duration = 4500) {
	const text = message.trim();
	if (!text) return;
	if (toastState.items.some((t) => t.message === text && t.variant === variant)) return;

	const id = ++nextId;
	toastState.items = [...toastState.items.slice(-3), { id, message: text, variant }];
	if (duration > 0) setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id: number) {
	toastState.items = toastState.items.filter((t) => t.id !== id);
}
