const fallbackTransportOptions = [
	{
		mode: '{{MODE}}',
	title: '{{TITLE}}',
	detail: '{{DETAIL}}',
	provider: '{{PROVIDER}}',
	eta: '{{ETA}}',
	status: '{{STATUS}}'
	}
];


const fallbackNearbyPlaces = [
	{
		category: '{{CATEGORY}}',
		description: '{{DESCRIPTION}}',
		items: [
			{
			name: '{{PLACE_NAME}}',
			address: '{{ADDRESS}}',
			rating: '{{RATING}}',
			distance: '{{DISTANCE}}',
			highlights: '{{HIGHLIGHTS}}'
		}
	]
	}
];

const renderTransportCard = (option) => `
	<article class="card">
		<div class="card-header">
			<span class="card-badge">${option.mode}</span>
			<span class="card-status">${option.status}</span>
		</div>
		<h4 class="card-title">${option.title}</h4>
		<p class="card-text">${option.detail}</p>
		<div class="card-tags">
			<span class="card-tag">${option.provider}</span>
			<span class="card-tag">${option.eta}</span>
		</div>
	</article>
`;

const renderNearbyPlaceCard = (group) => {
	const items = group.items
		.map((item) => `
			<li>
				<div class="card-header">
					<strong>${item.name}</strong>
					<span class="card-tag">${item.rating}</span>
				</div>
				<p class="card-text">${item.address} - ${item.distance}</p>
				<small>${item.highlights}</small>
			</li>
		`)
		.join('');

	return `
		<article class="card">
			<h4 class="card-title">${group.category}</h4>
			<p class="card-text">${group.description}</p>
			<ul class="card-list">${items}</ul>
		</article>
	`;
};

const renderList = (targetId, data, renderer) => {
	const container = document.getElementById(targetId);
	if (!container) return;
	container.innerHTML = data.map(renderer).join('');
};

const toRadians = (value) => (value * Math.PI) / 180;

const distanceBetween = (origin, target) => {
	if (!origin || !target) return Number.NaN;
	const { latitude: lat1, longitude: lon1 } = origin;
	const { latitude: lat2, longitude: lon2 } = target;
	if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.NaN;
	const dLat = toRadians(lat2 - lat1);
	const dLon = toRadians(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return 6371000 * c;
};

const formatDistance = (meters) => {
	if (!Number.isFinite(meters)) return 'Distance unavailable';
	if (meters < 1000) return `${Math.round(meters)} m`;
	return `${(meters / 1000).toFixed(1)} km`;
};

const estimateWalkingTime = (meters) => {
	if (!Number.isFinite(meters)) return '—';
	const minutes = Math.max(1, Math.round(meters / 80));
	return `~${minutes} min walk`;
};

const determineMode = (tags = {}) => {
	if (['station', 'halt', 'stop'].includes(tags.railway)) return 'Train';
	if (tags.railway === 'tram_stop') return 'Tram';
	if (tags.railway === 'subway_entrance' || tags.subway === 'yes') return 'Metro';
	if (tags.highway === 'bus_stop' || tags.bus === 'yes') return 'Bus';
	if (tags.aerialway) return 'Cable';
	if (tags.route === 'ferry' || tags.ferry === 'yes') return 'Ferry';
	return 'Transit';
};

const formatAddress = (tags = {}) => {
	const parts = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean);
	if (parts.length) return parts.join(' ');
	if (tags['addr:full']) return tags['addr:full'];
	if (tags['addr:city']) return tags['addr:city'];
	return 'Address unavailable';
};

const formatHighlights = (tags = {}) => {
	const features = [];
	if (tags.cuisine) features.push(tags.cuisine.split(';').slice(0, 2).map((item) => item.trim()).join(', '));
	if (tags.opening_hours) features.push(`Hours: ${tags.opening_hours}`);
	if (tags.wheelchair === 'yes') features.push('Wheelchair accessible');
	if (tags.website) features.push('Website available');
	return features.slice(0, 2).join(' • ') || 'Local favorite';
};

const fetchOverpassData = async (query) => {
	const response = await fetch('https://overpass-api.de/api/interpreter', {
		method: 'POST',
		headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
		body: query
	});
	if (!response.ok) throw new Error(`Overpass request failed with ${response.status}`);
	return response.json();
};

const buildTransportData = (elements = [], coords) => {
	const enriched = elements
		.map((element) => {
			const tags = element.tags || {};
			const latitude = element.lat ?? element.center?.lat;
			const longitude = element.lon ?? element.center?.lon;
			if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
			const distance = distanceBetween(coords, { latitude, longitude });
			const mode = determineMode(tags);
			const detailParts = [];
			if (tags.ref) detailParts.push(`Line ${tags.ref}`);
			if (tags.route_ref && tags.route_ref !== tags.ref) detailParts.push(`Routes ${tags.route_ref}`);
			detailParts.push(formatDistance(distance));
			return {
				mode,
				title: tags.name || tags.ref || `${mode} stop`,
				detail: detailParts.filter(Boolean).join('  '),
				provider: tags.operator || tags.network || 'Public transport',
				eta: estimateWalkingTime(distance),
				status: 'Nearby',
				_key: `${mode}-${tags.name || tags.ref || latitude.toFixed(3)}-${longitude.toFixed(3)}`,
				_distance: distance
			};
		})
		.filter(Boolean)
		.sort((a, b) => a._distance - b._distance);

	const deduped = [];
	const seen = new Set();
	for (const item of enriched) {
		if (seen.has(item._key)) continue;
		seen.add(item._key);
		deduped.push(item);
		if (deduped.length === 3) break;
	}

	return deduped.map(({ _distance, _key, ...rest }) => rest);
};

const buildPlaceData = (elements = [], coords) => {
	const groups = [
		{
			key: 'food',
			category: 'Food & Drink',
			description: 'Quick bites within a short walk.',
			match: (tags) => ['cafe', 'restaurant', 'fast_food', 'pub', 'bar', 'ice_cream', 'biergarten'].includes(tags.amenity),
			items: []
		},
		{
			key: 'services',
			category: 'Mobility & Services',
			description: 'Helpful stops while you travel.',
			match: (tags) => ['bicycle_rental', 'charge', 'charging_station', 'car_sharing', 'taxi', 'fuel'].includes(tags.amenity) || ['convenience', 'supermarket', 'travel_agency', 'bicycle', 'bakery', 'pharmacy'].includes(tags.shop),
			items: []
		},
		{
			key: 'recreation',
			category: 'Parks & Recreation',
			description: 'Places to unwind near your route.',
			match: (tags) => ['park', 'pitch', 'fitness_centre', 'sports_centre', 'garden', 'swimming_pool'].includes(tags.leisure) || tags.tourism === 'museum',
			items: []
		}
	];

	const byKey = new Map(groups.map((group) => [group.key, group]));

	elements.forEach((element) => {
		const tags = element.tags || {};
		const latitude = element.lat ?? element.center?.lat;
		const longitude = element.lon ?? element.center?.lon;
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
		const group = groups.find((item) => item.match(tags));
		if (!group) return;
		const distance = distanceBetween(coords, { latitude, longitude });
		group.items.push({
			name: tags.name || 'Unnamed place',
			address: formatAddress(tags),
			rating: estimateWalkingTime(distance),
			distance: formatDistance(distance),
			highlights: formatHighlights(tags),
			_distance: distance
		});
	});

	return groups
		.map((group) => {
			const sorted = group.items.sort((a, b) => a._distance - b._distance).slice(0, 3);
			return sorted.length
				? {
					category: group.category,
					description: group.description,
					items: sorted.map(({ _distance, ...rest }) => rest)
				}
				: null;
		})
		.filter(Boolean);
};

const loadTransportData = async (coords) => {
	const radius = 1500;
	const { latitude, longitude } = coords;
	const query = `[out:json][timeout:25];
(
  node["highway"="bus_stop"](around:${radius},${latitude},${longitude});
  node["railway"="tram_stop"](around:${radius},${latitude},${longitude});
  node["railway"="station"](around:${radius},${latitude},${longitude});
  node["railway"="subway_entrance"](around:${radius},${latitude},${longitude});
);
out center 60;`;
	const data = await fetchOverpassData(query);
	return buildTransportData(data.elements, coords);
};

const loadPlaceData = async (coords) => {
	const radius = 1200;
	const { latitude, longitude } = coords;
	const query = `[out:json][timeout:25];
(
  node["amenity"~"cafe|restaurant|fast_food|pub|bar|ice_cream|biergarten"](around:${radius},${latitude},${longitude});
  way["amenity"~"cafe|restaurant|fast_food|pub|bar|ice_cream|biergarten"](around:${radius},${latitude},${longitude});
  node["amenity"~"bicycle_rental|charging_station|car_sharing|taxi|fuel"](around:${radius},${latitude},${longitude});
  way["amenity"~"bicycle_rental|charging_station|car_sharing|taxi|fuel"](around:${radius},${latitude},${longitude});
  node["shop"~"convenience|supermarket|travel_agency|bicycle|bakery|pharmacy"](around:${radius},${latitude},${longitude});
  way["shop"~"convenience|supermarket|travel_agency|bicycle|bakery|pharmacy"](around:${radius},${latitude},${longitude});
  node["leisure"~"park|pitch|fitness_centre|sports_centre|garden|swimming_pool"](around:${radius},${latitude},${longitude});
  way["leisure"~"park|pitch|fitness_centre|sports_centre|garden|swimming_pool"](around:${radius},${latitude},${longitude});
  node["tourism"="museum"](around:${radius},${latitude},${longitude});
  way["tourism"="museum"](around:${radius},${latitude},${longitude});
);
out center 80;`;
	const data = await fetchOverpassData(query);
	return buildPlaceData(data.elements, coords);
};

const updateCardsWithLocation = async (coords) => {
	try {
		const [transportData, placeData] = await Promise.all([
			loadTransportData(coords),
			loadPlaceData(coords)
		]);
		if (transportData.length) {
			renderList('transport-cards', transportData, renderTransportCard);
		}
		if (placeData.length) {
			renderList('places-cards', placeData, renderNearbyPlaceCard);
		}
	} catch (error) {
		console.error('Failed to load live data', error);
	}
};

document.addEventListener('DOMContentLoaded', () => {
	renderList('transport-cards', fallbackTransportOptions, renderTransportCard);
	renderList('places-cards', fallbackNearbyPlaces, renderNearbyPlaceCard);

	if (!navigator.geolocation) {
		console.warn('Geolocation is not supported on this device.');
		return;
	}

	navigator.geolocation.getCurrentPosition(
		({ coords }) => updateCardsWithLocation(coords),
		(error) => console.warn('Unable to retrieve current position', error),
		{ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
	);
});