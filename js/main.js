// Clonable templates that make swapping in live data straightforward.
const transportTemplate = {
	mode: '{{MODE}}',
	title: '{{TITLE}}',
	detail: '{{DETAIL}}',
	provider: '{{PROVIDER}}',
	eta: '{{ETA}}',
	status: '{{STATUS}}'
};

const nearbyPlaceTemplate = {
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
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const transportOptions = Array.from({ length: 3 }, () => clone(transportTemplate));
const nearbyPlaces = Array.from({ length: 3 }, () => clone(nearbyPlaceTemplate));

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

document.addEventListener('DOMContentLoaded', () => {
	renderList('transport-cards', transportOptions, renderTransportCard);
	renderList('places-cards', nearbyPlaces, renderNearbyPlaceCard);
});