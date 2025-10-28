# Public Transport Planner

Hey there! This is my lightweight web project for mapping public transport routes and peeking at schedules. It is all static files, so you can open it straight in a browser or toss it onto any basic host.

## Try It Out

- Live page (GitHub Pages): https://sanduleonard31.github.io/PublicTransportPlanner/
- Works best on a modern browser. I mostly tested in Chrome because that is what my classmates use.

## Project Tour

Here is how the repo is laid out so you can jump in without getting lost:

- `index.html` - the main landing page
- `header.html`, `footer.html` - reusable page fragments
- `css/` - all the styles (layout, responsive tweaks, utility classes, etc.)
- `js/` - scripts for the header, footer, map drawing, and location lookups
- `assets/` - images plus any other static goodies
- `data/location.json` - sample data that feeds the map

## How I Work On It

- No build tools. Just open the HTML files or run a tiny local server if you want live reload.
- Styling is split into multiple CSS files so I can swap pieces in and out while studying.
- JavaScript is vanilla so you can read it without importing frameworks.

## Notes To Future Me (and You)

- `css/global.css` and `css/layout.css` are the usual first stops if something looks off.
- `js/main.js` initializes the page; map logic lives in `js/draw-map.js`.
- Feel free to fork and experiment. If you break it, git checkout saves the day.

