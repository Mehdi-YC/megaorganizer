import { describe, expect, test } from 'bun:test';
import {
	MAX_TRACK_GAP_S,
	handleGpsPosition,
	splitTrackSegments,
	type GpsTrackingState
} from '../src/lib/utils/gps';

function pos(lat: number, lon: number, timestamp: number, accuracy = 5): GeolocationPosition {
	return {
		coords: {
			latitude: lat,
			longitude: lon,
			altitude: null,
			accuracy,
			altitudeAccuracy: null,
			heading: null,
			speed: null
		},
		timestamp
	} as GeolocationPosition;
}

function emptyState(): GpsTrackingState {
	return {
		lastPoint: null,
		distance: 0,
		currentSpeed: 0,
		maxSpeed: 0,
		gpsPoints: []
	};
}

describe('gps gap handling', () => {
	test('marks a long interruption and keeps only a lower-bound distance', () => {
		let state = emptyState();
		state = handleGpsPosition(pos(0, 0, 0), state).updatedState;

		const result = handleGpsPosition(pos(0, 0.001, (MAX_TRACK_GAP_S + 5) * 1000), state);

		expect(result.accepted).toBe(true);
		expect(result.newPoint.gapBefore).toBe(true);
		expect(result.gap).toBeDefined();
		expect(result.gap?.seconds).toBeGreaterThan(MAX_TRACK_GAP_S);
		expect(result.updatedState.distance).toBeGreaterThan(0);
		expect(result.updatedState.gpsPoints).toHaveLength(2);
	});

	test('keeps normal fixes connected', () => {
		let state = emptyState();
		state = handleGpsPosition(pos(0, 0, 0), state).updatedState;

		const result = handleGpsPosition(pos(0, 0.0001, 10_000), state);

		expect(result.gap).toBeUndefined();
		expect(result.newPoint.gapBefore).toBeUndefined();
		expect(result.updatedState.distance).toBeGreaterThan(0);
	});

	test('splits an explicit gap and a timestamp gap', () => {
		const points = [
			{ latitude: 0, longitude: 0, timestamp: 0 },
			{ latitude: 0, longitude: 0.001, timestamp: 10_000 },
			{ latitude: 0, longitude: 0.002, timestamp: 20_000, gapBefore: true },
			{ latitude: 0, longitude: 0.003, timestamp: 80_000 },
			{ latitude: 0, longitude: 0.004, timestamp: 85_000 }
		];

		expect(splitTrackSegments(points).map((segment) => segment.length)).toEqual([2, 1, 2]);
	});

	test('splits old saved tracks by timestamp alone', () => {
		const points = [
			{ latitude: 0, longitude: 0, timestamp: 0 },
			{ latitude: 0, longitude: 0.001, timestamp: 10_000 },
			{ latitude: 0, longitude: 0.002, timestamp: 45_000 },
			{ latitude: 0, longitude: 0.003, timestamp: 55_000 }
		];

		expect(splitTrackSegments(points).map((segment) => segment.length)).toEqual([2, 2]);
	});
});
