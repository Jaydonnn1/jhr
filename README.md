# joshhaydonrowe.com

A personal site built around an interactive 3D Earth. The globe flies between
real locations as you scroll (or click the nav), telling the story of founding,
travels, and experiences.

Static site, no build step — deployed via GitHub Pages (`CNAME` →
`joshhaydonrowe.com`).

## Stack

- **Three.js** (r128) — the globe: photoreal earth, atmosphere glow, starfield, markers
- **GSAP + ScrollTrigger** — scroll-synced globe orientation and the hero text effect
- **Lenis** — smooth scrolling
- All loaded from CDNs; the only local assets are the earth textures in `assets/`.

## Files

| File | What it does |
|------|--------------|
| `index.html`   | Page structure: hero + Founding + Travels (9 countries) + Experiences + Contact |
| `styles.css`   | All styling (layout, scrim, nav, chips, responsive) |
| `globe.js`     | The `Globe` class — renders the earth and orients it to any lat/lon |
| `locations.js` | **Coordinates + labels for every place the globe flies to** |
| `main.js`      | Smooth scroll, scroll-driven globe travel, nav/chip interactions |
| `assets/`      | Earth day / specular / cloud textures |

## Editing content

- **Your words:** every paragraph marked `class="placeholder"` (and `[ bracketed ]`)
  in `index.html` is a spot for you to write. Replace the text, drop the
  `placeholder` class, done.
- **Add / move a location:** edit `locations.js`. Each entry is
  `key: { lat, lon, label, sub }`. The globe automatically flies to whatever
  `data-loc="key"` a section carries.
- **Re-order travel countries:** they're plain `<section class="step travel-stop">`
  blocks in document order — reorder the blocks (and the chips above them).

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(A static server is needed so the browser can load the texture files.)

## Tuning a pin

If a marker ever looks slightly off a coastline, nudge its `lat`/`lon` in
`locations.js`. The orientation math lives in `Globe.orientFor()`.
