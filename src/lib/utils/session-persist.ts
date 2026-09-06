export interface RunningSessionState {
	status: string;
	startTime: number;
	elapsed: number;
	distance: number;
	currentSpeed: number;
	averageSpeed: number;
	maxSpeed: number;
	currentPace: number;
	averagePace: number;
	bestPace: number;
	currentPosition: { latitude: number; longitude: number } | null;
	gpsPoints: Array<{
		latitude: number;
		longitude: number;
		altitude?: number;
		accuracy?: number;
		speed?: number;
		timestamp: number;
	}>;
}

const STORAGE_KEY_RUNNING = 'megorganize_running_state';
const STORAGE_KEY_SESSION = 'megorganize_session_state';

export function saveRunningState(state: RunningSessionState) {
	try {
		localStorage.setItem(STORAGE_KEY_RUNNING, JSON.stringify(state));
	} catch {
		// localStorage may be full or unavailable
	}
}

export function loadRunningState(): RunningSessionState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_RUNNING);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function clearRunningState() {
	try {
		localStorage.removeItem(STORAGE_KEY_RUNNING);
	} catch {
		// ignore
	}
}

export function saveSessionState(state: RunningSessionState) {
	try {
		localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(state));
	} catch {
		// ignore
	}
}

export function loadSessionState(): RunningSessionState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY_SESSION);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function clearSessionState() {
	try {
		localStorage.removeItem(STORAGE_KEY_SESSION);
	} catch {
		// ignore
	}
}
