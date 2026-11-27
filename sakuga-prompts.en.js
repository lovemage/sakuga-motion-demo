/* Click animation demo: design prompts for AI agents (English). Keys are the original card titles; '總覽' is the master prompt. */
(window.SK_PROMPTS_I18N = window.SK_PROMPTS_I18N || {}).en = {
'總覽': `You are a front-end animation engineer. Build a "sakuga-style" click-feedback system for a website, without any animation library:
1. Springs: class Spring(x, k, d); step(dt) integrates F = -k(x - to) - d·v in 8ms sub-steps. Animations only change the target to; to make something "get hit", add directly to its velocity v. Keep damping deliberately low so it overshoots and bounces back.
2. Component body: springs drive the individual CSS properties scale / rotate (never overwrite the element's existing transform). Preserve volume when squashing: sx = 1 + (1 - sy) × 0.55.
3. Shared clock: the whole page runs a single requestAnimationFrame loop, with dt capped at 34ms and an optional timeScale for slow motion; stop the loop when nothing is moving. All delays use the clock's later(), never setTimeout.
4. Effects layer: one canvas with position: fixed and pointer-events: none, drawn at devicePixelRatio (capped at 2). While a modal dialog is open, move the canvas into the dialog so the top layer doesn't cover it. For effects that must be drawn "behind" a component, use an evenodd clip to cut out the component's area.
5. Effect functions: two-tone cel-shaded smoke (outline → shadow color → highlight shifted toward the top-left), spiky bursts, emphasis lines, speed lines, crescent slashes, four-point sparkles, stop lines, smoke rings, crystal shards, water splashes, colored confetti, swirling arcs, and a check mark. They appear quickly with easeOutBack in the first phase, and in the second phase disappear by "shrinking and thinning", not by fading out; add a little randomness to position, size and angle.
6. English onomatopoeia lettering (THUD! BANG! SWISH! DING! WHAP! ZIP! RUMBLE CLICK! POP! SNAP! WHIRR!): use fontTools to convert Bangers glyphs into a single SVG path, with each glyph individually rotated and offset. At runtime, pre-render each color scheme only once to an offscreen canvas, then just drawImage every frame. It first drops in enlarged, wobbles slightly, and finally shrinks and fades out.
7. All colors are read from CSS variables (--sk-spike, --sk-pop, --sk-sfx-dong…); never hard-code colors.
8. Accessibility: controls remain native <button> / <a> / <input> and are keyboard operable; under prefers-reduced-motion, draw no effects and apply no movement, keeping only a single opacity confirmation feedback. Links delay navigation by 180–340ms, and dispatch a cancelable sakuga:navigate event before navigating.
9. Button shadows: a hard-edged offset shadow is driven by the CSS variable --sk-lift (the spring's sy - 1). On press the shadow shrinks to 0, on release it stretches longer, giving a tangible feel of "pressing into the paper and springing off the paper".
10. Binding: event delegation on document (capture phase); default presets are applied automatically by class, and individual elements can override with data-sakuga="name|off".`,

'主要按鈕': `Primary button (spin): <a class="btn btn-primary">.
- Press: squash vertically to 82%, with width compensation 0.55 (spring k 520, d 15).
- Release: invert colors for one frame (filter: invert(1), removed after two rAFs); set the rotation spring's target to +360° (k 150, d 12) so the whole button spins one full turn, overshoots, then settles upright, while also bouncing upward (sq.v += 3).
- Effects: three elliptical swirling arcs around the button (radius about 0.66× the button width and 1.05× its height; fast head with a trailing tail, line width tapering, expanding outward as they spin, cycling through the --sk-pop colors), plus two thin arcs on an outer ring; colored confetti bursting in all directions; two sparkles at the top-right and bottom-left; the lettering "WHIRR!" drops in from the top-right.
- After it stops, reset the angle to zero so the next press still spins clockwise. The link delays navigation by 320ms.
- Shadow: add .sk-shadow: white background, black border, and a solid black 5px shadow toward the bottom-right. Each frame the spring writes sy - 1 into the CSS variable --sk-lift; CSS uses clamp to compute the press depth (up to 5px: the button moves toward the bottom-right and the shadow shrinks to 0) and the lift amount (up to 8px: the shadow stretches longer). On hover the button rises 2px and the shadow grows 2px longer; disable the shadow's transition while the spring is active.`,

'行動按鈕': `Call-to-action button (impact): <a class="cta-btn">, clearly different from the Primary button's spin.
- Press: squash to 82% (k 520, d 15), with width compensation 0.55.
- Release: invert colors for one frame, knock it askew randomly to the left or right (tilt.v ±120), and bounce upward (sq.v += 4).
- Effects: a 12-point spiky burst behind the button (spike color + offset shadow star + highlight star; the points thin out as it disappears), cel-shaded smoke at the four corners (drawn behind the button), three emphasis lines above, colored confetti and crystal shards, and after 0.28 seconds three donut-shaped smoke rings floating upward; the lettering "THUD!".
- The link delays navigation by 260ms.
- Shadow: add .sk-shadow: white background, black border, and a solid black 5px shadow toward the bottom-right. Each frame the spring writes sy - 1 into the CSS variable --sk-lift; CSS uses clamp to compute the press depth (up to 5px: the button moves toward the bottom-right and the shadow shrinks to 0) and the lift amount (up to 8px: the shadow stretches longer). On hover the button rises 2px and the shadow grows 2px longer; disable the shadow's transition while the spring is active.`,

'次要按鈕': `Secondary button: <a class="btn btn-outline-light">; its hit should be quieter than the Primary button's.
- Press squashes to 88% (k 520, d 16); release gives a small bounce (sq.v += 2.6) and a slight tilt.
- Effects: two four-point sparkles at the top-right and bottom-left; stop lines on the left and right sides (two small concentric arcs that open and then close); a small amount of confetti sprayed toward the top-right; a small halftone lettering "DING!".
- The link delays navigation by 180ms.
- Shadow: add .sk-shadow: white background, black border, and a solid black 5px shadow toward the bottom-right. Each frame the spring writes sy - 1 into the CSS variable --sk-lift; CSS uses clamp to compute the press depth (up to 5px: the button moves toward the bottom-right and the shadow shrinks to 0) and the lift amount (up to 8px: the shadow stretches longer). On hover the button rises 2px and the shadow grows 2px longer; disable the shadow's transition while the spring is active.`,

'送出完成': `Submit button (letter flies off): <button data-sakuga="send" data-done-label="Sent">Submit form</button>.
- Press: squash to 84% (k 520, d 15); on release, bounce upward with a slight tilt.
- A letter pops out of the button's top edge (0.2 seconds, easeOutBack scaling up to 1.08× while rising 20px), then flies off toward the top-right along a quadratic Bézier curve: the control point is first pulled in the opposite direction, creating a "pull back, then dash off" arc; the progress is raised to the power of 1.5 so it speeds up as it flies, while shrinking to about 46%, and the body tilts slightly along the tangent direction.
- The envelope is drawn on canvas: a white rectangle with a black outline, a V-shaped flap and two bottom fold lines, and a pink wax seal in the center. A three-segment feathered wing grows from each side of the top edge (drawn behind the envelope), flapping continuously at an angle of sin(t × 30) × 0.55.
- Behind it, keep the last 16 positions and draw them as a colored trail that tapers and fades. On takeoff, smoke puffs out on the left and right above the button and five speed lines shoot downward; "ZIP!" appears after 0.12 seconds; at 1.15 seconds, when it reaches the distance, a sparkle plus a little confetti; it fades out over the last 12%.
- After 0.5 seconds the button label changes to "Sent", and it reverts after 2.6 seconds; repeated clicks don't swap the label again.
- Shadow: add .sk-shadow: white background, black border, and a solid black 5px shadow toward the bottom-right. Each frame the spring writes sy - 1 into the CSS variable --sk-lift; CSS uses clamp to compute the press depth (up to 5px: the button moves toward the bottom-right and the shadow shrinks to 0) and the lift amount (up to 8px: the shadow stretches longer). On hover the button rises 2px and the shadow grows 2px longer; disable the shadow's transition while the spring is active.`,

'核取方塊': `Checkbox: the native <input type="checkbox"> is visually hidden (still focusable), with a custom box and SVG check mark drawn next to it.
- Check: the box squashes, bounces back, and tilts randomly; two crescents sweep about 200° each along the outside of the box from opposite directions (the head dashes ahead and the tail catches up; one in the primary color, one in pink); crystal shards scatter; the check mark draws itself using stroke-dashoffset; after 0.22 seconds a sparkle appears at the corner; the halftone lettering "SNAP!" lands to the right of the whole label and must not overlap the text.
- Uncheck: just a small puff of smoke.
- The focus ring is drawn on the custom box.`,

'單選': `Radio: the native <input type="radio"> is visually hidden, with a custom circle and inner dot.
- Select: the inner dot springs from 0 to 1 (k 420, d 11, overshoots); the circle gives a small bounce; five fan-shaped emphasis lines above the dot; a puff of smoke drifting outward on each side; the outlined white lettering "POP!" appears to the right of the option label.
- Arrow-key switching keeps the native radio behavior, and screen readers announce it as usual.`,

'評分': `Rating: five <button role="radio"> inside a role="radiogroup" wrapper; only the button for the current score is tab-focusable.
- Clicking star n: the first n stars bounce one after another every 0.06 seconds (stretch first, then spring back) and turn yellow.
- The last star to light up gets five fan-shaped emphasis lines, a sparkle, and the outlined white lettering "POP!"; at a full 5 stars, add a spiky burst behind it and colored confetti.
- Clicking the same star again clears the score to 0 with a small puff of smoke. The left/right arrow keys decrease/increase the score and move focus.`,

'開關': `Switch: <button role="switch" aria-checked>, containing a flood-color layer and a thumb.
- The thumb position uses a spring (k 380, d 26); it stretches along the direction of travel according to velocity (scaleX up to 1.85, with Y compensated by 1/√stretch), and transform-origin is set on the leading side so it looks like it's dragging an afterimage.
- On click, draw speed lines trailing backward from the starting point.
- Hitting the end: a water splash (tongues of water rise from the line and fall back, white foam at the tips, droplets flying off in parabolas); the track color fills from the left using an underdamped spring (k 160, d 7), wobbling with a skew driven by the spring's velocity; a sparkle after 0.3 seconds.
- Turning off: plays in reverse, the track drains, and smoke puffs next to the thumb.`,

'滑桿': `Slider: a native <input type="range"> sits transparently over a custom track; keyboard, touch and screen readers all use the native control.
- The custom thumb uses a spring (k 260, d 20) to chase the real value, so it lags half a beat behind; it stretches horizontally into a droplet shape according to velocity; a value bubble follows the thumb and tilts opposite to the velocity (up to ±24°).
- When the drag speed exceeds 0.9 track widths per second: every 70ms, cumulus smoke puffs behind the thumb, speed lines are drawn trailing backward, and debris occasionally sprays out; the lettering "ZIP!" appears at most once every 0.9 seconds.
- If it's still moving on release: a crescent flies forward, a small burst ahead of it, and two puffs of smoke are left in place.`,

'輸入框': `Text input: a native <input>, with the frame being the <label> that wraps it.
- Focus: three emphasis lines fly outward from the top-right corner; the frame switches to the primary color and gains a 4px light-colored glow.
- On each character typed: use canvas measureText to compute the caret's x position (password fields measure with •, minus scrollLeft), kick up a small puff of smoke at the caret, with about a 28% chance of spraying a shard; the frame squashes slightly (in the opposite direction when deleting).`,

'分頁': `Tabs: role="tab" buttons inside a role="tablist", plus an absolutely positioned selection block.
- The selection block's x and width each use a spring (k 300, d 19) to move to the new tab; while moving it lengthens and squashes slightly according to velocity, as if being dragged along.
- On arrival (distance < 3px): three emphasis lines above, smoke on the side it came from, and speed lines trailing backward.
- Arrow keys cycle through tabs, Home / End jump to either end; only the selected tab is tab-focusable.`,

'進度條': `Progress bar: role="progressbar", exposing set(0–1) and reset().
- The displayed value chases the target at 12%–90% per second, so even a big jump is "ridden" over rather than snapped.
- A storm cloud permanently sits at the leading edge: made of 5 stacked cel-shaded blobs, it grows as the bar fills, its upper half drags backward when dashing, and it keeps wobbling slightly. While moving, it tears off wisps of smoke every 0.12 seconds, and trails speed lines when fast.
- The ground line underneath draws itself at the start; when the leading edge passes pre-scattered pebble positions it kicks up debris; past 15%, "RUMBLE" appears.
- At 100%: the cloud disappears, the bar turns green, a burst behind it, "THUD!", a check mark above, one cloud left on each side of the ground, and sakuga:done is dispatched.`,

'通知': `Toast: role="status", exposing show(text) / hide().
- Enter: dashes in from -140% on the left using a spring (k 300, d 17), stretching horizontally into an afterimage according to velocity, with parallel speed lines drawn behind it pointing left.
- Landing (near the end point): dust kicks up at the bottom-left and the middle, a halftone "SNAP!", and the rotation spring gets kicked so it wobbles left and right.
- Exits after 2.6 seconds: the scale spring switches to critical damping (d = 2√k) and shrinks to 0 without bouncing. The ✕ is a real button.`,

'提示': `Tooltip: a "?" button plus a role="tooltip" bubble, linked with aria-describedby.
- Open: the bubble scales up from its bottom-center origin using a spring (k 380, d 13, overshoots); the button gets knocked askew; smoke puffs on both sides of the bubble, a flat elliptical smoke ring floats up from the top of the button, three emphasis lines at the button's top-right corner, and the outlined white lettering "CLICK!".
- Close: switches to critical damping and shrinks back; closes on Esc or an outside click.`,

'選單': `Hamburger menu: <button class="mobile-menu"> opens a full-screen <dialog> menu.
- Button: squashes, gets knocked askew (tilt.v ±110), shoots 7 speed lines downward (echoing the menu dropping from above), two puffs of smoke left and right, confetti sprayed downward, and the lettering "SWISH!".
- Menu panel: two color panels drop from top to bottom in sequence (430ms / 620ms, cubic-bezier(.76,0,.24,1)), and the items fade in and move up one after another.
- While the dialog is open, the effects canvas moves into the dialog (top layer); otherwise it would be covered.
- Close button: a diagonal slash cuts across, smoke, confetti, "WHAP!". Clicking a menu item shoots speed lines to the right.`,

'下拉選單': `Dropdown: the trigger button carries aria-expanded, with a panel below it.
- Expand: the panel spring goes 0→1 (k 380, d 13, underdamped), applying translateY(-14px → 0) and scaleY(0.55 → 1) with the origin at the top, so it drops, overshoots a little, and springs back; the arrow rotates 180°; each item is delayed by 35ms and springs in from 12px below with its own spring.
- Collapse: uses critical damping (d = 2√k) instead, clean with no wobble and faster than expanding.
- ↑↓ move focus, Esc closes and returns focus to the trigger button, and an outside click closes it.`,

'語言切換': `Language switch: a single button containing two text labels (the Chinese label and "EN") and a selection block.
- Click: a swap spring goes 0→1 (k 300, d 15); the left label travels along an upper arc and the right label along a lower arc as they swap positions (horizontal offset = the distance between the two labels' centers, arc height sin(πp) × 13px).
- After a 0.32-second pause, switch the language state; the selection block slides to the new language with a separate spring, while the two labels return to their original positions.
- When done, dispatch a sakuga:lang event and let the page decide whether to navigate to /en/. The aria-label states the current language and the language it will switch to.`,

'日夜切換': `Day/night toggle: the button contains a sky, a horizon (a ground-colored block at the bottom), and a wheel whose center sits below the horizon; the sun is mounted at the top of the wheel and the moon at the bottom (the moon is pre-rotated 180° so it is upright when it rotates up).
- Click: the wheel's target angle +180° (k 170, d 12), always clockwise: the sun sets to the right below the horizon and the moon rises from the left; clicking again makes the moon set and the sun rise. Once at rest, take the angle modulo 360.
- The sky and ground colors switch to the night palette with CSS transitions, and stars fade in at night; body.day-mode is toggled at the same time.
- Simultaneously around the button: a smoke ring, two sparkles, colored confetti, "WHAP!".`,

'分類標籤': `Filter tags: a row of .filter-btn (aria-pressed).
- Click: squash to 86% (k 560, d 16) with a small bounce; stop lines on the left and right; three short emphasis lines above.
- These buttons get clicked often, so no lettering and no burst; keep it light and snappy.`,

'選文章': `Article card: the whole card is a single link <a class="article-card-link">.
- Press: the whole card only squashes to 97.5%, with width compensation 0.3 (large elements need restraint).
- Release: a slight tilt; a crescent slash cuts across the cover from bottom-left to top-right; six parallel speed lines shoot out to the right from the card's right side; colored confetti sprays from the cover's top-right; the lettering "ZIP!" lands above the title.
- Navigation is delayed by 340ms: two color panels cover the page from bottom to top, then exit upward, revealing the article page.`,

'返回上一頁': `Back button: <a data-sakuga="back">.
- Press squashes to 86%; on release it falls back to the left (tilt.v -120) and bounces upward.
- Effects: parallel speed lines shoot out to the left from the button's left side, smoke puffs on the right side (as if left behind), confetti sprays to the left, "ZIP!".
- Navigation is delayed by 240ms, and the page-transition curtain moves in the opposite direction from entering an article (top to bottom).
- Shadow: add .sk-shadow: white background, black border, and a solid black 5px shadow toward the bottom-right. Each frame the spring writes sy - 1 into the CSS variable --sk-lift; CSS uses clamp to compute the press depth (up to 5px: the button moves toward the bottom-right and the shadow shrinks to 0) and the lift amount (up to 8px: the shadow stretches longer). On hover the button rises 2px and the shadow grows 2px longer; disable the shadow's transition while the spring is active.`,

'文章 Dock': `Article dock: a row of icon buttons (Home, All articles, Share, Back to top).
- Click: squash to 82%, small bounce and a random tilt; three short emphasis lines above, a sparkle at the top-right, and a little confetti.
- No lettering, to avoid distracting from reading.`,

'音效字': `English onomatopoeia lettering assets:
- Use Python fontTools to read Bangers (SIL OFL 1.1); apply each glyph's own scale, rotation (±12°) and offset, then merge them into a single SVG path (fill="currentColor") that doesn't depend on browser fonts.
- Word set: THUD! BANG! SWISH! DING! WHAP! ZIP! RUMBLE CLICK! POP! SNAP! WHIRR!
- At runtime, pre-render each word × each color scheme only once to an offscreen canvas: first draw the extruded depth layer offset toward the bottom-right, then a 15px rounded outline stroke, then the fill; the halftone variant tiles dots inside the glyph shapes.
- Entrance: first drops in at 1.35× scale (easeOutBack), wobbles with sin while holding, and shrinks and fades out over the last 18%.`,
};
