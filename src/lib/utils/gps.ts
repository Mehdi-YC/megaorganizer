export const EARTH_RADIUS_KM = 6371;
export const MS_TO_KMH = 3.6;
export const MAX_GPS_SPEED_MS = 20;
export const TIMER_INTERVAL_MS = 1000;
export const GPS_WATCH_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	maximumAge: 1000,
	timeout: 10000
};

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) ** 2;
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
	bestPace
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
}) {
	return {
		distance,
		elapsedDuration,
		averageSpeed,
		maxSpeed,
		averagePace,
		bestPace,
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

export async function saveRunApi(runData: ReturnType<typeof buildRunPayload>): Promise<{ sessionId?: string; activityId?: string }> {
	const res = await fetch('/api/running', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'saveRun', ...runData })
	});
	return res.json();
}
