// Promise-based confirmations backed by the ConfirmDialog host in the app
// layout, so call sites read like the native confirm() they replace.
let resolver: ((ok: boolean) => void) | null = null;

export const confirmState = $state({ open: false, message: '', confirmLabel: 'Delete' });

export function confirmAction(message: string, confirmLabel = 'Delete'): Promise<boolean> {
	confirmState.message = message;
	confirmState.confirmLabel = confirmLabel;
	confirmState.open = true;
	return new Promise((resolve) => {
		resolver = resolve;
	});
}

export function resolveConfirm(ok: boolean) {
	confirmState.open = false;
	resolver?.(ok);
	resolver = null;
}
