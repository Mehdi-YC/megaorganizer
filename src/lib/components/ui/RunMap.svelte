<script lang="ts">
	// Named Leaflet, not L: the component holds the runtime module in a variable
	// called `L`, and a type-only import of the same name collides.
	import type * as Leaflet from 'leaflet';
	import { onMount, onDestroy } from 'svelte';
	import { splitTrackSegments } from '$lib/utils/gps';

	let {
		points = [],
		center = undefined,
		zoom = 15,
		followPosition = false,
		showRoute = true,
		className = ''
	}: {
		points?: Array<{
			latitude: number;
			longitude: number;
			timestamp?: number;
			gapBefore?: boolean;
		}>;
		center?: { latitude: number; longitude: number } | null;
		zoom?: number;
		followPosition?: boolean;
		showRoute?: boolean;
		className?: string;
	} = $props();

	let mapEl: HTMLDivElement;
	let map: Leaflet.Map | null = null;
	let marker: Leaflet.CircleMarker | null = null;
	let routeLine: Leaflet.Polyline | null = null;
	let startMarker: Leaflet.CircleMarker | null = null;
	let endMarker: Leaflet.CircleMarker | null = null;
	let L: typeof import('leaflet') | null = null;
	let mounted = false;

	onMount(async () => {
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		if (!mapEl) return; // guard against unmount race

		const initialCenter: Leaflet.LatLngTuple = center
			? [center.latitude, center.longitude]
			: points.length > 0
				? [points[0].latitude, points[0].longitude]
				: [48.8566, 2.3522];

		map = L.map(mapEl, {
			center: initialCenter,
			zoom,
			zoomControl: false
		});

		L.control.zoom({ position: 'topright' }).addTo(map);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19
		}).addTo(map);

		if (points.length > 0 && showRoute) {
			drawRoute(points);
		} else if (center) {
			marker = L.circleMarker([center.latitude, center.longitude], {
				radius: 8,
				fillColor: '#3b82f6',
				color: '#fff',
				weight: 2,
				fillOpacity: 1
			}).addTo(map);
		}

		mounted = true;
		setTimeout(() => map?.invalidateSize(), 100);
	});

	onDestroy(() => {
		mounted = false;
		if (map) {
			map.remove();
			map = null;
		}
	});

	function drawRoute(
		pts: Array<{
			latitude: number;
			longitude: number;
			timestamp?: number;
			gapBefore?: boolean;
		}>
	) {
		if (!map || !L || pts.length < 2) return;

		// Each segment is drawn separately. A gap gets no line at all, so a
		// screen-off period cannot look like a straight sprint across the map.
		const latLngSegments: Leaflet.LatLngTuple[][] = splitTrackSegments(pts)
			.map((segment) => segment.map((p) => [p.latitude, p.longitude] as Leaflet.LatLngTuple))
			.filter((segment) => segment.length >= 2);

		if (latLngSegments.length === 0) {
			if (routeLine) {
				routeLine.remove();
				routeLine = null;
			}
		} else if (routeLine) {
			routeLine.setLatLngs(latLngSegments);
		} else {
			routeLine = L.polyline(latLngSegments, {
				color: '#3b82f6',
				weight: 4,
				opacity: 0.8,
				lineJoin: 'round',
				lineCap: 'round'
			}).addTo(map);
		}

		const start: Leaflet.LatLngTuple = [pts[0].latitude, pts[0].longitude];
		const end: Leaflet.LatLngTuple = [pts[pts.length - 1].latitude, pts[pts.length - 1].longitude];

		// Update or create start marker
		if (startMarker) {
			startMarker.setLatLng(start);
		} else {
			startMarker = L.circleMarker(start, {
				radius: 8,
				fillColor: '#22c55e',
				color: '#fff',
				weight: 2,
				fillOpacity: 1
			}).addTo(map);
		}

		// Update or create end marker
		if (endMarker) {
			endMarker.setLatLng(end);
		} else {
			endMarker = L.circleMarker(end, {
				radius: 8,
				fillColor: '#ef4444',
				color: '#fff',
				weight: 2,
				fillOpacity: 1
			}).addTo(map);
		}
	}

	$effect(() => {
		if (!mounted || !map || !L) return;

		if (followPosition && center) {
			map.setView([center.latitude, center.longitude], map.getZoom());

			if (marker) {
				marker.setLatLng([center.latitude, center.longitude]);
			} else {
				marker = L.circleMarker([center.latitude, center.longitude], {
					radius: 8,
					fillColor: '#3b82f6',
					color: '#fff',
					weight: 2,
					fillOpacity: 1
				}).addTo(map);
			}
		}

		if (points.length > 1 && showRoute) {
			drawRoute(points);
		}
	});
</script>

<!-- isolate + z-0: Leaflet panes stack at z-index 400-1000 and would
	otherwise paint over the sticky header, sidebar, and dialogs. -->
<div bind:this={mapEl} class="relative isolate z-0 h-full w-full overflow-hidden {className}"></div>
