---
name: persona5royal-design
description: Build web UI and pages in the Persona 5 Royal style: red, black and white, sharp polygons, tilted elements, hard shadows, ransom-note lettering, calling cards and tarot cards. Use when someone asks for a Persona 5 / P5R / Phantom Thieves look, a Phansite, a calling card, or a menu, HUD or dashboard in that style, even if they don't name the design system. Personal, local use only.
---

# Persona 5 Royal design system: web pages and React UI

This folder is a self-contained design system: CSS tokens, 15 React components and a page starter. Every path below is relative to this folder. In `my-superapp` it is `packages/p5r-ds/`; in other projects it usually sits at `p5r-ds/`. Check where it actually is before writing paths.

| Path | What it is |
|---|---|
| `starter.html` | Page shell with every script and stylesheet wired. **Every no-build page starts as a copy of this file.** |
| `index.js` / `index.d.ts` | Entry point for bundlers (Vite): all 15 components and their prop types. |
| `styles.css` | The one stylesheet to load. It pulls in fonts, tokens and `components/components.css`. |
| `_ds_bundle.jsx` | All components in one file for no-build pages, exposed as `window.PersonaFiveRoyalDS`. Generated: never edit. |
| `components/<group>/<Name>.prompt.md` | Usage and examples for each component. Read it before using the component. |
| `components/<group>/<Name>.d.ts` | Props for each component. |
| `index.html` | Showcase of every component and guideline. Open it to see the target look. |
| `scripts/check-page.mjs` | Checker: loads a page at 1280, 375 and 320px and reports sideways scroll, console errors, 404s, broken images, missing alt and unnamed controls. |
| `tokens/` | Token sources. Read them to find a token; do not edit them from a project. |
| `assets/` | Logo, 26 tarot cards, 3 button glyphs. |
| `reference/` | The two earlier prototypes. Not used by anything; may be absent. |

## Workflow

1. **Get the content first.** Ask what the page is for and pull real text from the user or the repo. Do not invent data; mark unknowns as `[TBD: what]` and list them for the user.
2. **Plan the page as a table**: section, component(s), one-line purpose. Use the recipes below. Show it to the user before building when they are available.
3. **Build.**
   - **No build step:** copy `starter.html` to the page's location. Every line marked `P5R-PATH` holds a path relative to this folder; prefix each one with the path from the page to this folder (for a page next to `p5r-ds/`: `p5r-ds/styles.css`, `p5r-ds/_ds_bundle.jsx`, `p5r-ds/assets`). Replace the demo content inside `App`. Put page-only CSS between `PAGE LAYOUT` and `PAGE LAYOUT END`.
   - **Vite / React app:** `import` `styles.css` once in the entry file, wrap the module root in `<div className="p5r-scope">`, then `import { Button, Panel } from` this folder's `index.js`. Images must be served: the project keeps a copy of `assets/` in `public/p5r-assets/`, and `TarotCard` / `CallingCard` get `assetBase="/p5r-assets"`.
4. **Check.** Serve the page over http and run `node <this folder>/scripts/check-page.mjs <url>`. Fix every ERROR, then look at the screenshots it saves, at 375 and 320 too. When text overflows, shorten or reflow it; never shrink type below its token.
5. **Deliver** the page and say what you checked and what you could not.

## Hard rules

1. **Color.** Red, black and white carry the whole UI. Cyan marks the selected item, yellow marks highlights and notifications. HP/SP bars are the only data colors. Never add green or purple. No smooth color-blend gradients; the only gradients are the hard-stop patterns in `effects.css` (`--bullseye`, `--bullseye-back`, `--select-strip`, `--halftone`). Pages and components use the semantic tokens (`--surface-*`, `--text-*`, `--accent-*`, `--status-*`, `--border-*`), never raw hex or the primitive palette.
2. **Two reds.** `--red-500` (`#ff0000`) for large surfaces and red text on black. `--red-600` (`#e3001b`) behind small white text, because white on `#ff0000` is only 4.0:1.
3. **Shape.** No rounded corners except round badges. Cut shapes with the `--clip-*` tokens. Tilt whole elements (`--tilt-sm/md/lg`), never body paragraphs.
4. **Shadow.** Hard offset only, never blurred. Use `filter: drop-shadow` so the shadow follows a clip-path.
5. **Type.** Display face (Anton) for short labels, titles and numerals. Everything longer than a line uses the body face (Archivo) with normal tracking and `--leading-normal`. Use `RansomTitle` for hero titles and short signatures, never for text people must read.
6. **Selection.** The selected item scales up (`--menu-select-scale`) and carries a cyan strip; the current nav link is cyan. Never use color alone for state.
7. **Motion.** Fast and snappy (`--ease-snap`; `--ease-slam` for things that land, like a dialog). Hover, press and selection use `--duration-fast` (90ms); entrances up to 320ms; only showpieces run longer (`--duration-pop` 450ms, `--duration-flip` 700ms). Use the `--duration-*` tokens; never invent durations. Gate hover styles with `@media (hover: hover)`. Everything stops under `prefers-reduced-motion` (handled in `components.css`; page CSS must do the same for its own motion).
8. **Accessibility.** Keep the focus ring (`--focus-ring`: cyan on dark; class `p5r-light` turns it black on light surfaces; red panels turn it white). Keyboard behavior is built into `MenuList`, `Tabs` and `Dialog`; never replace it with click-only handlers. Every page has `lang`, one `h1`, a skip link and a `<main id="main">`.
9. **Buttons by surface.** On dark surfaces: `primary` for the one main action, `light` for the rest. On light panels: `primary` and `dark`. A `light` button on a light panel disappears. One `primary` per view.
10. **Layout.** Page layout uses the spacing tokens (`--space-*`) and logical properties (`inset-inline-start`, `padding-inline`), wraps rows with `flex-wrap`, and never scrolls sideways at 320px.
11. **Scope.** All tokens live on `.p5r-scope`, not `:root`. The UI must render inside an element with that class (`<html class="p5r-scope">` for plain pages, a wrapper `<div className="p5r-scope">` around the module root in React); outside it every `var(--...)` is empty. In `my-superapp` only `modules/phantom-ledger` may import this design system. Never import it from `apps/web` or any other module, and never move tokens back to `:root`.

## Components

| Need | Component | Notes |
|---|---|---|
| Page or hero title | `RansomTitle` (`as="h1"`) | `skin="logo"` for titles; `fit` + a sized box for cards |
| Section heading | `Banner` (`as="h2"`) | `tone` red, black or white; alternate tones between sections |
| Content box | `Panel` | `tone` dark (default), light for long text, red for one callout; `title` adds the yellow tab |
| Action | `Button` | see rule 9 |
| Switch view in place | `Tabs` | pair each tab with a `role="tabpanel"` element via `panelId` |
| Pick from a list (game-menu style) | `MenuList` | a listbox, not site navigation; use links for navigation |
| Text input | `TextField` | always a `label`; `multiline` for long text; `error` shows next to the field |
| Small label | `Tag` | tones red, white, black, yellow, cyan |
| Bar value | `StatBar` | `kind` hp, sp or progress |
| Confirmation | `Dialog` | native `<dialog>`, focus and Escape handled |
| Short notice | `AwardToast` | yellow title, one line of detail |
| Quote or dialogue | `SpeechBubble` | `speaker` for the name tag |
| Date | `DateSticker` | |
| Showpiece | `CallingCard`, `TarotCard` | pass `assetBase`; `TarotCard` needs `name` (the sheet has no names) |

Site navigation is not a component: use the `.site-nav` links in `starter.html` (skewed white links, the current page `aria-current="page"` in cyan).

## Page recipes

- **Home / Phansite front page:** header with `RansomTitle` h1 on the `--bullseye` background, `.site-nav`, then sections each opened by a `Banner` h2: a dark `Panel` grid for news or targets, a `StatBar` for a running poll, a `CallingCard` as the showpiece, a short light `Panel` of text.
- **Board / list page:** `Banner` h2, `Tabs` for filters, a list of dark `Panel`s each with `Tag`s and one `Button`. Empty state: a light `Panel` saying what goes here and one action.
- **Form page:** one light `Panel` with `TextField`s stacked in a `.stack`, `primary` submit plus `dark` secondary, a `Dialog` to confirm anything that sends or deletes, an `AwardToast` after success.
- **Detail page:** `Banner` h2, `TarotCard` or image beside a light `Panel` of text; the `.grid` pattern stacks them on narrow screens.

## When no component fits

Build it in the page's `PAGE LAYOUT` block (or a page CSS file in an app) from tokens only, following the hard rules. Never edit `tokens/`, `components/` or `_ds_bundle.jsx` from a project. If a new piece will be needed on more than one page, add it to the design system instead: a `.jsx`, `.d.ts` and `.prompt.md` in `components/<group>/`, styles in `components/components.css`, an export in `index.js` and `index.d.ts`, a demo in that group's `.card.html`, then `node build.mjs`.

## Not in scope

Character art and logos belong to Atlus and Sega. This system is for personal, local use; never publish pages that use `assets/`.
