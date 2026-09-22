export const EARTH_RADIUS_KM = 6371;
export const MS_TO_KMH = 3.6;
export const MAX_GPS_SPEED_MS = 50; // 180 km/h — supports cycling descents
export const TIMER_INTERVAL_MS = 1000;
export const GPS_WATCH_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	// Fixes older than 5s are stale for a moving runner, and a tighter
	// window keeps the 10s timeout from eating real updates mid-run.
	maximumAge: 5000,
	timeout: 8000
};

export interface GpsPoint {
	latitude: number;
	longitude: number;
	altitude?: number;
	accuracy?: number;
	speed?: number;
	timestamp: number;
}

export interface GpsTrackingState {
	lastPoint: GpsPoint | null;
	distance: number;
	currentSpeed: number;
	maxSpeed: number;
	// Last accepted speed (km/h) for spike rejection. Optional so state from
	// older builds / inline callers keeps working (falls back to currentSpeed).
	lastAcceptedSpeedKmh?: number;
	gpsPoints: GpsPoint[];
}

// Minimum distance (meters) between points to consider for pace calculation.
// Prevents GPS jitter from creating false "fastest" pace readings.
export const MIN_PACE_DISTANCE_M = 5;

// Fixes worse than this are dropped from the track entirely.
export const MAX_TRACK_ACCURACY_M = 100;
// Fixes worse than this never contribute to distance or speed.
export const MAX_DISTANCE_ACCURACY_M = 50;
// Hop floor in meters; increments below it wait for the next fix so slow
// movement is amortized instead of discarded, while standing jitter stays out.
export const MIN_DISTANCE_COUNT_M = 2;

// Segments shorter than this don't update speed: two fixes can arrive ~0.2s
// apart while each carries meters of jitter, and dist/timeDiff over such a
// window synthesizes huge speeds (the 178 km/h "jogging" bug).
export const MIN_SPEED_INTERVAL_S = 0.8;

// A new segment speed is only accepted if it is within `max(last * 2.5,
// last + 15)` km/h of the last accepted speed (e.g. a 20 → 60 jump is
// dropped). From standstill, anything above 25 km/h is dropped. A rejected
// hop is swallowed: the baseline moves to it so its phantom displacement
// can't inflate the next segment's distance or speed.
export const SPEED_JUMP_FACTOR = 2.5;
export const SPEED_JUMP_MIN_KMH = 15;
export const SPEED_COLD_START_MAX_KMH = 25;

export function handleGpsPosition(
	position: GeolocationPosition,
	state: GpsTrackingState
): { updatedState: GpsTrackingState; newPoint: GpsPoint; accepted: boolean } {
	const point: GpsPoint = {
		latitude: position.coords.latitude,
		longitude: position.coords.longitude,
		altitude: position.coords.altitude ?? undefined,
		accuracy: position.coords.accuracy,
		speed: position.coords.speed ?? undefined,
		timestamp: position.timestamp
	};

	if (point.accuracy !== undefined && point.accuracy > MAX_TRACK_ACCURACY_M) {
		return { updatedState: state, newPoint: point, accepted: false };
	}

	let { distance, currentSpeed, maxSpeed } = state;
	let lastAcceptedSpeedKmh = state.lastAcceptedSpeedKmh ?? state.currentSpeed;
	let baseline = state.lastPoint;

	if (baseline && point.accuracy !== undefined && point.accuracy <= MAX_DISTANCE_ACCURACY_M) {
		const dist = calculateDistance(
			baseline.latitude,
			baseline.longitude,
			point.latitude,
			point.longitude
		);
		const timeDiff = (point.timestamp - baseline.timestamp) / 1000;
		const noiseFloorM = Math.max(MIN_DISTANCE_COUNT_M, point.accuracy * 0.5);
		if (timeDiff > 0 && dist >= noiseFloorM) {
			const speed = dist / timeDiff;
			const speedKmh = speed * MS_TO_KMH;
			const jumpCeiling =
				lastAcceptedSpeedKmh < 1
					? SPEED_COLD_START_MAX_KMH
					: Math.max(
							lastAcceptedSpeedKmh * SPEED_JUMP_FACTOR,
							lastAcceptedSpeedKmh + SPEED_JUMP_MIN_KMH
						);
			if (speed >= MAX_GPS_SPEED_MS || speedKmh > jumpCeiling) {
				// Outlier hop (jitter teleport or impossible acceleration):
				// swallow it so its displacement can't inflate the next segment.
				baseline = point;
			} else if (timeDiff >= MIN_SPEED_INTERVAL_S) {
				distance += dist;
				baseline = point;
				if (dist >= MIN_PACE_DISTANCE_M) {
					currentSpeed = speedKmh;
					maxSpeed = Math.max(maxSpeed, currentSpeed);
					lastAcceptedSpeedKmh = speedKmh;
				}
			} else {
				// Too short to trust for speed; keep the distance, hold the pace.
				distance += dist;
				baseline = point;
			}
		}
	} else if (!baseline) {
		baseline = point;
	}

	// Mutate the array instead of spreading — avoids O(n) copy on every GPS tick.
	// The array reference is replaced only when Svelte needs to re-render (via the $state setter in the component).
	state.gpsPoints.push(point);

	const updatedState: GpsTrackingState = {
		lastPoint: baseline,
		distance,
		currentSpeed,
		maxSpeed,
		lastAcceptedSpeedKmh,
		gpsPoints: state.gpsPoints
	};

	return { updatedState, newPoint: point, accepted: true };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
	return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

export function computeRunStats({
	distance,
	elapsed,
	currentSpeed
}: {
	distance: number;
	elapsed: number;
	currentSpeed: number;
}): {
	averageSpeed: number;
	averagePace: number;
	currentPace: number;
} {
	let averageSpeed = 0;
	let averagePace = 0;
	let currentPace = 0;
	if (distance > 0 && elapsed > 0) {
		averageSpeed = (distance / elapsed) * MS_TO_KMH;
		averagePace = elapsed / (distance / 1000);
		currentPace = currentSpeed > 0 ? 3600 / currentSpeed : 0;
	}
	return { averageSpeed, averagePace, currentPace };
}

export function buildRunPayload({
	gpsPoints,
	distance,
	elapsedDuration,
	averageSpeed,
	maxSpeed,
	averagePace,
	bestPace,
	title,
	notes
}: {
	gpsPoints: Array<{
		latitude: number;
		longitude: number;
		altitude?: number;
		accuracy?: number;
		speed?: number;
		timestamp: number;
	}>;
	distance: number;
	elapsedDuration: number;
	averageSpeed: number;
	maxSpeed: number;
	averagePace: number;
	bestPace: number;
	title?: string;
	notes?: string;
}) {
	return {
		distance,
		elapsedDuration,
		averageSpeed,
		maxSpeed,
		averagePace,
		bestPace,
		title,
		notes,
		gpsPoints: gpsPoints.map((p, i) => ({
			sequence: i,
			timestamp: new Date(p.timestamp),
			latitude: p.latitude,
			longitude: p.longitude,
			altitude: p.altitude,
			accuracy: p.accuracy,
			speed: p.speed
		}))
	};
}

export async function saveRunApi(
	runData: ReturnType<typeof buildRunPayload>
): Promise<{ sessionId?: string; activityId?: string }> {
	const res = await fetch('/api/running', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'saveRun', ...runData })
	});
	const data = await res.json().catch(() => null);
	if (!res.ok || !data) {
		throw new Error(data?.error || 'Failed to save run. Please try again.');
	}
	return data;
}
