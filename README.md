# Public Transport Planner

A minimal static site for planning public transport routes and viewing schedules.

Live demo: https://sanduleonard31.github.io/PublicTransportPlanner/

## Demo

Open the demo in your browser:

- Live demo (hosted on GitHub Pages): https://sanduleonard31.github.io/PublicTransportPlanner/

Optional preview image:

![Demo preview](assets/demo.png)

> Replace `assets/demo.png` with a real screenshot if you want a preview image in the README.

## Files

Top-level files and folders:

- `index.html` — main page
- `header.html`, `footer.html` — header/footer fragments
- `css/` — styles (layout, responsive, utilities, etc.)
- `js/` — site JavaScript (main, header, footer)
- `assets/` — images and other static assets

## Quick local preview

You can preview the site locally by serving the folder. From the project root run one of the following (works on macOS):

```bash
# Python 3 built-in server (port 8000)
python3 -m http.server 8000

# Or, using Node's http-server if you have it installed:
# npx http-server -c-1 -p 8000
```

Then open http://localhost:8000 in your browser.

## Development notes

- The site is static HTML/CSS/JS—no build step is required.
- Use the files in `css/` and `js/` to modify layout and behaviors.

## Contributing

1. Fork the repository
2. Make changes on a feature branch
3. Open a pull request describing your changes

## License

This project is provided without an explicit license. Add a LICENSE file if you want to specify reuse terms.

---

If you'd like, I can also:

- Add a small badge linking to the live demo
- Add an actual screenshot into `assets/` and embed it in the README
- Add a one-line netlify/gh-pages deployment note if you want continuous deployment instructions

If you want any of those, tell me which and I'll add them.
