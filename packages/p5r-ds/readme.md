# Persona 5 Royal design system

A design system for web pages in the Persona 5 Royal style: tokens, 16 React components, a page starter, a page checker, and a `SKILL.md` that tells Claude how to use it all.

Fan-made, for personal and local use only. Persona belongs to Atlus and Sega. The logo and tarot sprites in `assets/` come from the game and must not be published.

## Look at it first

Serve this folder over http and open `index.html`. It shows every component and guideline.

```bash
python -m http.server 8000
```

Then open http://localhost:8000/index.html. Opening the file directly (`file://`) does not work: the browser blocks Babel from loading `_ds_bundle.jsx`.

- [Interaction States](components/controls/interaction-states.card.html) compares button states and includes a Vietnamese form with validation.
- [Data States](components/feedback/data-states.card.html) shows loading, empty and error compositions with a retry flow.

## Scope

The tokens live on the `.p5r-scope` class, not on `:root`, so the theme cannot leak into other parts of an app. Every page or React subtree that uses this design system must sit inside an element with that class:

- Plain pages: `<html class="p5r-scope">` (every demo and `starter.html` already does this).
- Vite + React: wrap the module's root, `<div className="p5r-scope">...</div>`. Anything rendered outside that element, such as a React portal into `document.body`, loses the tokens.

Without the class, components render unstyled: every `var(--...)` is empty.

## Put it in a project

1. Outside this repo: copy this whole folder into the project and rename it `p5r-ds`. The option A instructions assume that name. In `my-superapp` it already lives at `packages/p5r-ds/`.
2. Delete `p5r-ds/reference/` unless you want the old prototypes. Nothing uses it, and it is 45 MB of the folder's 49 MB.
3. Pick how the project loads the components: option A or option B.
4. Tell Claude about it (see "Let Claude use it").

### Option A: plain HTML, no build step

Best for a small site or a quick page. React, ReactDOM and Babel load from unpkg, so pages need a network connection.

```
my-site/
├── p5r-ds/        ← this folder
└── index.html     ← a copy of p5r-ds/starter.html
```

1. Copy `p5r-ds/starter.html` to `my-site/index.html`.
2. Find the four lines marked `P5R-PATH` and add `p5r-ds/` to each path:
   - `assets/brand/phantom-thieves-logo.png` → `p5r-ds/assets/brand/phantom-thieves-logo.png`
   - `styles.css` → `p5r-ds/styles.css`
   - `_ds_bundle.jsx` → `p5r-ds/_ds_bundle.jsx`
   - `const ASSETS = 'assets'` → `const ASSETS = 'p5r-ds/assets'`

   For a page one folder deeper (`my-site/pages/about.html`), use `../p5r-ds/` instead.
3. Replace the demo content inside `function App()`. Page-only CSS goes between `PAGE LAYOUT` and `PAGE LAYOUT END`.
4. Serve `my-site/` (`python -m http.server 8000`) and open the page.

### Option B: a Vite + React app

In this repo the design system is used only by `modules/phantom-ledger/web`. It needs React 18 or newer.

```
my-superapp/
├── packages/
│   └── p5r-ds/            ← this folder
└── modules/
    └── phantom-ledger/
        └── web/
            ├── public/
            │   └── p5r-assets/    ← a local copy of packages/p5r-ds/assets
            └── src/
```

1. Copy `packages/p5r-ds/assets/` to `modules/phantom-ledger/web/public/p5r-assets/`. Vite only serves images it can see at a fixed URL, and `TarotCard` and `CallingCard` build their image URLs at runtime. Both folders are gitignored: the game art is never committed or deployed.
2. Load the styles once, in the module's entry:

   ```jsx
   import '../../../packages/p5r-ds/styles.css';
   ```

3. Wrap the module root in `.p5r-scope` (see "Scope") and import components from there:

   ```jsx
   import { Banner, Panel, Button, TarotCard } from '../../../packages/p5r-ds/index.js';

   export function Arcana() {
     return (
       <div className="p5r-scope">
         <Panel title="Arcana">
           <TarotCard index={1} name="The Fool" assetBase="/p5r-assets" />
           <Button variant="primary">Draw a card</Button>
         </Panel>
       </div>
     );
   }
   ```

   The import paths above are placeholders until the module exists; the workspace package name is decided in Phase 2.

TypeScript picks up prop types from `index.d.ts`.

Option B has not been run in a real Vite app yet. The entry file and its paths are checked, but the full build is not.

### Let Claude use it

Add this to the project's `CLAUDE.md`:

```markdown
## UI
The Persona 5 Royal design system in `packages/p5r-ds/` is only for `modules/phantom-ledger`. The shell and other modules do not use it.
Read `packages/p5r-ds/SKILL.md` before building or changing that module's UI, render it inside `.p5r-scope`, and follow its workflow and hard rules.
```

`SKILL.md` covers the workflow, the 11 hard rules, which component to use for what, page recipes, and what to do when no component fits.

## Check a page

Serve the page, then run:

```bash
node p5r-ds/scripts/check-page.mjs http://localhost:8000/index.html
```

It loads the page in headless Chrome at 1280, 375 and 320px wide. These count as errors:

- the page scrolls sideways
- console errors and exceptions
- 404s and images that fail to load
- images without `alt`
- buttons, links or fields with no accessible name

It warns about raw colors in page styles and tap targets under 24px. It also saves a full-page screenshot at each width. It exits with 1 when there are errors.

It needs Node 22 or newer and Chrome or Edge installed. Set `CHROME_PATH` if the browser is somewhere unusual. Options: `--out <dir>` for the screenshots, `--wait <ms>` if the page needs longer to render (default 3000).

## Folder layout

| Path | Contents |
|---|---|
| `SKILL.md` | Rules and workflow, written for Claude |
| `starter.html` | Page shell for option A |
| `index.js`, `index.d.ts` | Entry point and types for option B |
| `styles.css` | The one stylesheet to load: fonts, tokens, component styles |
| `tokens/` | Colors, fonts, typography, spacing, effects (shapes, shadows, motion) |
| `components/components.css` | Styles for every component, prefix `p5r-` |
| `components/{controls,navigation,surfaces,feedback,brand}/` | 16 components, each with `.jsx`, `.d.ts` (props) and `.prompt.md` (usage), plus `*.card.html` demos |
| `guidelines/` | Demo pages for color roles, type scale, shape language, motion |
| `index.html` | Showcase of all demos |
| `assets/` | Logo, 26 tarot cards, 3 button glyphs |
| `scripts/check-page.mjs` | Page checker |
| `build.mjs` | Regenerates `_ds_bundle.jsx` and `_ds_manifest.json` |
| `_ds_bundle.jsx`, `_ds_manifest.json` | Generated, do not edit |
| `research/` | Notes behind the color, shape and type choices |
| `tokens-preview.html`, `thumbnail.html` | The approved token sheet and a preview thumbnail |
| `reference/` | The two earlier prototypes: `calling-card/` and `phansite-prototype/` (the Phansite page plus 14 raw sprite sheets). Safe to delete |

## Change the design system

Make changes here, in `packages/p5r-ds/`. In this repo it is the only copy; the module imports it directly.

- **Change a component:** edit its `.jsx`, `.d.ts` and `.prompt.md`, and its styles in `components/components.css`. Then run `node build.mjs`.
- **Add a component:**
  1. Create the `.jsx`, `.d.ts` and `.prompt.md` in the right `components/<group>/`.
  2. Add its styles to `components/components.css`.
  3. Export it from `index.js` and `index.d.ts`.
  4. Add a demo to the group's `.card.html`.
  5. Run `node build.mjs`.
  6. Run `scripts/check-page.mjs` on the card.
- **Change a token:** edit the file in `tokens/`, then check `index.html`. Every component reads tokens, so one change reaches all of them.

`build.mjs` needs only Node; there are no packages to install.

## Decisions and what is not confirmed

- **Red.** The measured signature red is `#ff0000`; the earlier card and Phansite used `#e3001b`. Both are kept: `#ff0000` for surfaces and red text on black, `#e3001b` behind small white text (4.9:1 versus 4.0:1).
- **Font.** No primary source confirms the game's UI font. Anton (display) and Archivo (body) are free look-alikes. One blog names A-OTF Gothic MB101 Pr6N, which is unverified and commercial.
- **Motion.** Durations and easing are chosen, not measured. The only sourced number is the day-change timing (6s hold, 2s change, 4s hold), from a fan study.
- **Shapes.** Polygons and tilt angles were judged by eye from screenshots, not measured in pixels.
- **Tarot names.** The sprite sheet carries no arcana names, so `TarotCard` takes a `name` prop. Card 1 is The Fool (Le Mat).

## Known limits

- Fonts load from Google Fonts. Offline, pages fall back to Impact and the system sans-serif.
- Option A compiles JSX in the browser with Babel standalone. That is fine for a personal site, but too slow for anything public; use option B there.
- There is no Checkbox, Radio, Switch, Select, Table, Tooltip or icon set yet. Add them through "Change the design system" when a page needs one.
- No assets beyond the 14 sprite sheets already downloaded. The Spriters Resource list was blocked by a bot check, which was not bypassed.
