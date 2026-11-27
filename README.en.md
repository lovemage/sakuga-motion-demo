# Sakuga Motion Demo

[繁體中文](README.md) | **English**

A showcase of click-feedback animations by OceanAds. When you press a button it squashes and springs back like hand-drawn animation (*sakuga*), with canvas effects such as cel-shaded smoke, spiky bursts and speed lines, plus Chinese onomatopoeia lettering (visual sound-effect text; there's no audio).

**Live demo: https://lovemage.github.io/sakuga-motion-demo/**

Everything is plain JavaScript and CSS. There are no animation libraries and no build step.

---

## What's in the demo

Each card on the page is one component you can click:

| Group | Components |
| --- | --- |
| Buttons | Primary (spin), call-to-action (impact with a hard-edged shadow), secondary, submit (a winged letter flies away) |
| Forms | Checkbox, radio, star rating, switch, slider, text input |
| Feedback | Tabs, progress bar, toast, tooltip |
| Navigation | Hamburger menu (full-screen two-layer panel), dropdown, language switch, day/night toggle, filter tags, back button |
| Content | Article card, article dock (share / back to top) |
| Lettering | All Chinese onomatopoeia glyphs |

Every card has a **speed slider (0.1×–1×)** in its top-right corner, so you can slow an animation down and watch it frame by frame. Every card also has a **"提示詞" (prompt)** button that copies a design brief for an AI agent such as Claude Code, so it can rebuild the same effect on your own site.

## How it works

- **Springs**: `Spring(x, k, d)` integrates `F = -k(x - to) - d·v` in 8 ms sub-steps. Damping is kept low on purpose so motion overshoots and bounces back. To make an element look like it was hit, the engine adds velocity directly.
- **Only `scale` / `rotate`**: springs drive the individual CSS `scale` and `rotate` properties, so an element's own `transform` is never overwritten. Squash keeps the volume constant: `sx = 1 + (1 - sy) × 0.55`.
- **One clock**: the whole page runs on a single `requestAnimationFrame` loop. `dt` is capped at 34 ms, and the loop stops when nothing is moving. `timeScale` gives slow motion.
- **One effects canvas**: a `position: fixed`, `pointer-events: none` canvas drawn at `devicePixelRatio` (max 2). When a modal `<dialog>` is open, the canvas moves into it so the top layer doesn't cover it.
- **Effects**: two-tone cel smoke, spiky bursts, speed lines, crescent slashes, corner sparkles, smoke rings, crystal shards, splashes, confetti, swirls, check marks and more. Effects disappear by shrinking and thinning out, not by fading.
- **Colours**: all colours come from `--ex-*` CSS custom properties, so light and dark modes switch automatically.

## Accessibility

- Every control is a native `<button>`, `<a>` or `<input>`, so keyboards and screen readers work as usual.
- With `prefers-reduced-motion: reduce`, states still change but the spring movement and effects don't play.
- Links wait for their effect to finish before navigating, and fire a cancelable `sakuga:navigate` event on the element first.

## Using it on your own site

Copy the files you need into your project and load them in this order:

```html
<link rel="stylesheet" href="sakuga-motion.css">
<link rel="stylesheet" href="sakuga-controls.css">   <!-- dropdown, language, day/night -->
<link rel="stylesheet" href="sakuga-widgets.css">    <!-- form and feedback widgets -->
<link rel="stylesheet" href="navigation-motion.css"> <!-- full-screen menu, needs body.expo-theme -->

<script src="sakuga-sfx-paths.js" defer></script>
<script src="sakuga-motion.js" data-auto defer></script>
<script src="sakuga-controls.js" defer></script>
<script src="sakuga-widgets.js" defer></script>
```

`sakuga-motion.js` is the core. The other scripts depend on it and must come after it.

### Choose a button effect: `data-sakuga`

```html
<button data-sakuga="spin">Spin</button>
<button data-sakuga="send" data-done-label="Sent">Submit</button>
<a href="/blog" data-sakuga="card">Article card</a>
<button data-sakuga="off">No animation</button>
```

Values: `send` `spin` `impact` `spark` `menu` `close` `toggle` `tag` `card` `back` `dock` `menuitem` `off`

### Apply automatically: `data-auto`

With `data-auto` on the `<script>` tag, effects are applied by common class names, so you don't have to tag each element:

| Selector | Effect |
| --- | --- |
| `.btn-primary` | `spin` |
| `.cta-btn`, `.nav-cta` | `impact` |
| `.btn-outline`, `.btn-outline-light`, `.read-more-btn`, `.view-btn`, `.pf-btn`, `.demo-btn` | `spark` |
| `.filter-btn` | `tag` |
| `.article-card-link` | `card` |
| `.dock-item` | `dock` |
| `#mobile-menu-btn`, `.mobile-menu` | `menu` |
| `.oa-menu-close` | `close` |
| `dialog.mobile-nav li a` | `menuitem` |
| `.theme-toggle`, `[data-oa-theme]` | `toggle` |

When an element matches both a selector and a `data-sakuga` ancestor, the inner one wins. `data-sakuga="off"` turns the effect off for one element.

### Form and feedback widgets: `data-skw`

Put `data-skw` on the widget's root element:

`check` `radio` `rating` `switch` `slider` `input` `tabs` `progress` `toast` `tip` `done`

### Controls

```html
<div class="sk-dd" data-sk-dropdown>
  <button class="sk-dd-trigger">Services</button>
  <div class="sk-dd-panel" hidden>…</div>
</div>
<button class="sk-lang" data-sk-lang data-current="zh">…two .sk-lang-opt…</button>
<button class="sk-daynight" data-sk-daynight>…</button>
```

### JavaScript API

```js
const K = window.OASakuga;

K.set({ timeScale: 0.25 });   // slow motion
K.set({ reduce: true });      // force reduced motion; null follows the system setting
K.state;                      // { timeScale, reduce, auto, reduced }

K.fx;                         // effect functions: puff, burst, slash, kira, confetti, shards, splash, check, mail…
const stop = K.drive((dt) => { /* runs every frame; return false to remove */ });
```

There's also `window.OASakugaControls` (`dropdown`, `lang`, `daynight`) and `window.OASakugaWidgets` (`init`, `bump`).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The demo page |
| `sakuga-motion.js` / `.css` | Core: springs, shared clock, effects canvas, button presets |
| `sakuga-widgets.js` / `.css` | Checkbox, radio, rating, switch, slider, input, tabs, progress, toast, tooltip, done check |
| `sakuga-controls.js` / `.css` | Dropdown, language switch, day/night toggle |
| `navigation-motion.css` | Full-screen two-layer navigation menu |
| `sakuga-sfx-paths.js` | SVG paths for the Chinese lettering (generated; don't edit by hand) |
| `sakuga-prompts.js` | The per-card prompts for AI agents (in Chinese) |
| `fonts/` | Leon Sans font |
| `images/sfx/` | Lettering as SVG files |

## Run locally

Nothing to install. Serve the folder with any static server:

```bash
npx serve .
# or
python -m http.server 8000
```

After changing CSS or JS, bump the `?v=` query in `index.html` so browsers don't use a cached copy.

## Credits and licences

- Animation techniques based on [sakuga-vfx](https://github.com/finktheartist/sakuga-vfx) (MIT)
- Lettering glyphs from Noto Sans CJK TC Black (SIL OFL 1.1)
- Leon Sans licence: see `fonts/OFL-LeonSans.txt`

---

Made by [OceanAds](https://oceanads.org/).
