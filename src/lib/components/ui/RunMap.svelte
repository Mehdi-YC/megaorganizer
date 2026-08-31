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
	let L: any;

	onMount(async () => {
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

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
			const latLngs = points.map((p) => [p.latitude, p.longitude] as [number, number]);
			routeLine = L.polyline(latLngs, {
				color: '#3b82f6',
				weight: 4,
				opacity: 0.8,
				lineJoin: 'round',
				lineCap: 'round'
			}).addTo(map);

			L.circleMarker(latLngs[0], {
				radius: 8,
				fillColor: '#22c55e',
				color: '#fff',
				weight: 2,
				fillOpacity: 1
			}).addTo(map);

			L.circleMarker(latLngs[latLngs.length - 1], {
				radius: 8,
				fillColor: '#ef4444',
				color: '#fff',
				weight: 2,
				fillOpacity: 1
			}).addTo(map);

			map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
		} else if (center) {
			marker = L.circleMarker([center.latitude, center.longitude], {
				radius: 8,
				fillColor: '#3b82f6',
				color: '#fff',
				weight: 2,
				fillOpacity: 1
			}).addTo(map);
		}

		setTimeout(() => map.invalidateSize(), 100);
	});

	onDestroy(() => {
		if (map) map.remove();
	});

	$effect(() => {
		if (!map || !L) return;

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
			const latLngs = points.map((p) => [p.latitude, p.longitude] as [number, number]);
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
		}
	});
</script>

<div bind:this={mapEl} class="w-full h-full {className}"></div>
