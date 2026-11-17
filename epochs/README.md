# ЭПОХИ — Последний правитель

Standalone browser strategy game. Open `index.html` through a static web server in a modern browser. The 2D game remains available as a fallback; the interactive 3D layer loads Three.js 0.187.0 from jsDelivr.

## Gameplay
- Develop food, timber, stone, gold and research.
- Build farms, sawmills, quarries, markets, academies, barracks and walls.
- Expand into neutral regions, negotiate with the rival kingdom of Veyr, or wage war.
- Unlock technologies, respond to events and advance through seasons.
- Progress, achievements and archive reading status are saved locally in the browser.

## Historical content
- Four campaign dossiers: the late Western Roman Empire, Justinian, Charlemagne and the First Crusade.
- Thirteen dated historical events with context and consequences.
- Search and filters for historical periods.
- Thirty illustrated SVG atlas sheets with stylized regional topography, rivers, relief, settlements and map labels.
- Atlas illustrations are schematic artwork, not precise geographic or navigation maps. Images are lazy-loaded in the archive gallery.

## Project files
- `index.html` — app markup
- `style.css` — responsive interface, atlas gallery and 3D viewport
- `three-world.js` — live 3D terrain, settlements, flags, weather, animated troops and siege engines
- Three.js 0.187.0 — external ES module dependency, distributed under the MIT license
- `game-loader.js` — compressed game engine loader
- `game-expansion.js` — achievements, objectives and ruler's chronicle
- `campaign-archive.js` — historical dossiers, event encyclopedia and atlas gallery
- `atlas/map-01.svg` … `atlas/map-30.svg` — 30 cartographic illustrations (about 30 MB total)

Version 1.1.0 — Interactive 3D world.
