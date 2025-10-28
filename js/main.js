// Placeholder data sources to be swapped with live integrations.
const transportOptions = [
	{
		mode: 'Metro',
		title: 'North Loop Express',
		detail: 'Direct service to Central Station via 5 stops.',
		provider: 'MetroLink',
		eta: 'Arrives in 7 min',
		status: 'On time'
	},
	{
		mode: 'Bus',
		title: 'Route 42 Crosstown',
		detail: 'Connects the waterfront district with the innovation hub.',
		provider: 'City Transit',
		eta: 'Next departure 12:10',
		status: 'Boarding soon'
	},
	{
		mode: 'Bike Share',
		title: 'Dock 8 — Riverside',
		detail: '12 bikes available, 4 electric. Perfect for short trips.',
		provider: 'SwiftCycle',
		eta: 'Unlock in 2 min',
		status: 'Plenty available'
	}
];

const nearbyPlaces = [
	{
		category: 'Cafés',
		description: 'Third-wave coffee and quiet corners to recharge.',
		items: [
			{
				name: 'Roastery on Elm',
				address: '218 Elm Street',
				rating: '4.8 ★',
				distance: '3 min walk',
				highlights: 'Locally roasted beans & pastries'
			},
			{
				name: 'Morning Transit Brew',
				address: '14 Transit Plaza',
				rating: '4.6 ★',
				distance: '2 min walk',
				highlights: 'Workspace-friendly seating'
			}
		]
	},
	{
		category: 'Restaurants',
		description: 'Popular picks with dependable lunch and dinner service.',
		items: [
			{
				name: 'Platform 9 Bistro',
				address: '52 Junction Avenue',
				rating: '4.7 ★',
				distance: '5 min walk',
				highlights: 'Seasonal tasting menu'
			},
			{
				name: 'Harvest Street Kitchen',
				address: '301 Market Row',
				rating: '4.5 ★',
				distance: '7 min walk',
				highlights: 'Farm-to-table comfort dishes'
			}
		]
	},
	{
		category: 'Hotels',
		description: 'Stay options with flexible check-in for transit travelers.',
		items: [
			{
				name: 'Grand Exchange Hotel',
				address: '89 Exchange Lane',
				rating: '4.6 ★',
				distance: '6 min walk',
				highlights: 'Late checkout, skyline views'
			}
		]
	},
	{
		category: 'Grocery',
		description: 'Quick stops for essentials and fresh produce.',
		items: [
			{
				name: 'Metro Fresh Market',
				address: '610 Greenway Blvd',
				rating: '4.4 ★',
				distance: '4 min walk',
				highlights: 'Ready-to-go meals & organic produce'
			}
		]
	},
	{
		category: 'Gas Stations',
		description: 'Top-rated fueling stations along major connectors.',
		items: [
			{
				name: 'FuelHub Centerpoint',
				address: '12 Connector Drive',
				rating: '4.5 ★',
				distance: '9 min drive',
				highlights: 'Rapid EV chargers & service bay'
			}
		]
	}
];