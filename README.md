# sjpahomes2go.com

Website for The Morales Group (Raul Morales, Keller Williams Realty), hosted on GitHub Pages from the `/docs` folder of the `main` branch.

## How it is built
- `src/pages/` holds each page's content (`index.html`, `privacy.html`, `404.html`).
- `tools/build.py` wraps them in the shared header, footer, SEO tags and structured data, inlines the coverage map, and writes `docs/` plus `sitemap.xml`, `robots.txt` and `site.webmanifest`.
- `docs/assets/site.css` and `docs/assets/site.js` are edited directly. `docs/images/` holds the logo, icons and headshot.
- `tools/mkmap.py` regenerates `docs/assets/coverage-map.svg` from US county shapes (`npm i us-atlas@3.0.1`).

After editing anything in `src/pages/`, run `python3 tools/build.py` and commit `docs/`.

## Settings in `docs/assets/site.js`
- `formspreeId`: paste a free Formspree form ID to have the contact form email you directly. While it is empty, the form opens the visitor's email app with the message filled in.
- Google Analytics ID (`G-WDJJZKH1QP`) is set as `GA_ID` in `tools/build.py`. Pages carry it in a `ga-id` meta tag, and `site.js` loads Google's script only after a visitor clicks Accept in the cookie banner (the choice is saved in the browser under `tmg-cookies`).
- `COUNTIES`: average property tax rates used by the calculators and the map. They are approximate county averages; check them yearly.

## Launch checklist
- [x] Logo and headshot
- [x] GitHub Pages from `main` / `/docs`
- [x] Namecheap DNS: four A records for `@` and CNAME `www` → `rmoraleskw-stack.github.io`
- [ ] Enforce HTTPS in Pages settings
- [ ] Formspree form ID (optional; the email fallback already works)
- [ ] Brokerage office address and phone (NJ advertising rules)
- [ ] Replace stock photos with your own
