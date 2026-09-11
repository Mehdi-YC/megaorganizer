<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		points = [],
		center = undefined,
		zoom = 15,
		followPosition = false,
		showRoute = true,
		className = ''
	}: {
		points?: Array<{ latitude: number; longitude: number; timestamp?: number }>;
		center?: { latitude: number; longitude: number } | null;
		zoom?: number;
		followPosition?: boolean;
		showRoute?: boolean;
		className?: string;
	} = $props();

	let mapEl: HTMLDivElement;
	let map: any;
	let marker: any;
	let routeLine: any;
	let startMarker: any;
	let endMarker: any;
	let L: any;
	let mounted = false;

	onMount(async () => {
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		if (!mapEl) return; // guard against unmount race

		const initialCenter = center
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

	function drawRoute(pts: Array<{ latitude: number; longitude: number }>) {
		if (!map || !L || pts.length < 2) return;

		const latLngs = pts.map((p) => [p.latitude, p.longitude] as [number, number]);

		if (routeLine) {
			routeLine.setLatLngs(latLngs);
		} else {
			routeLine = L.polyline(latLngs, {
				color: '#3b82f6',
				weight: 4,
				opacity: 0.8,
				lineJoin: 'round',
				lineCap: 'round'
			}).addTo(map);
		}

		// Update or create start marker
		if (startMarker) {
			startMarker.setLatLng(latLngs[0]);
		} else {
			startMarker = L.circleMarker(latLngs[0], {
				radius: 8,
				fillColor: '#22c55e',
				color: '#fff',
				weight: 2,
				fillOpacity: 1
			}).addTo(map);
		}

		// Update or create end marker
		if (endMarker) {
			endMarker.setLatLng(latLngs[latLngs.length - 1]);
		} else {
			endMarker = L.circleMarker(latLngs[latLngs.length - 1], {
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

<div bind:this={mapEl} class="w-full h-full {className}"></div>
