# Persona 5 Royal design system: phase 1 research notes

Status: reference research only. Nothing in this file was downloaded; it is read from public articles and measured from the 14 sprites already in `reference/phansite-prototype/assets/`.

## 1. Colors measured from real game assets

Measured with a pixel count on the downloaded sheets (exact RGB, not guessed).

| Role | Value | Where it was measured |
|---|---|---|
| Signature red | `#ff0000` | Phantom Thieves logo, title banner |
| Card red | `#e20000` to `#f20000` | Tycoon card faces |
| Tarot pink | `#f60257` | Tarot card backgrounds |
| Tarot deep rose | `#e00139` | Tarot card shading |
| Black | `#000000` (near `#040404`) | Logo, buttons, tarot |
| White | `#ffffff` (near `#fcfcfc`) | Buttons, tarot |
| Banner dark | `#140c0c` | Title banner background |
| Highlight blue | `#00aeff`, darker `#0050c3` | Skill and item icons |
| Highlight gold | `#ffff00` to `#ffff31` | Award notifications |

What the sources say about the system:

- The theme is red, black and white. Other colors appear mostly for HP/SP and small highlights.
- The red was chosen to feel like a warning light or siren, not romantic and not burgundy (Persona 5 Royal art book excerpt, via a search summary).
- The selected menu item gets a small splash of blue so it stands out against red/black/white.

Note: the card and Phansite pages currently use `#e3001b`. The measured signature red is pure `#ff0000`. Decide in phase 2 whether to switch.

## 2. Layout and shape language

- Actions in battle circle the active character, like manga speech bubbles. The four most-used actions sit on the right.
- Battle screen zones: enemy name and level top left, party comments top right, secondary actions bottom left, party HP/SP bottom right.
- Menu items stack vertically. The selected item grows and gets a color. Nonselectable info (for example yen) is aligned in the same stack.
- Pause menu uses a large figure in the background that changes pose with the selected item.
- Style roots: cut-out, DIY collage with a punk and "Noise" feel. Persona 5 Tactica shifts toward Constructivism (bold sans, angular grids, geometric layouts).

## 3. Typography

- The logo and the numeral 5 are custom artwork, not an installable font.
- No source confirms the in-game menu font. Free look-alikes suggested by one design blog: Oswald, Bebas Neue (unverified).
- The Royal chat-bubble font changed from the original (forum report, name not given).
- Readability warning: one critic says Persona 5's UI uses moving baselines, tight tracking and an extra bold face that reads poorly in English. Tactica fixes this with a more readable sans. The design system should keep the style for display text and use a readable face for body text.

## 4. Motion data

- Day-change animation (fan analysis): about 12 seconds in total. The current date holds for about 6 seconds, the date changes over about 2 seconds, and the new date holds about 4 seconds. The new date is shown in a different color.
- Menus use animated transitions and a 3D figure that spins and ends in a pose.
- Not yet measured: menu open and close timing, selection easing, screen wipes. Needs video references.

## 5. Component inventory to build

Buttons, tabs, menu list with selected state, form fields, tags, dialogs, toasts and award notifications, HP/SP bar, percent bar, meter, panel, speech bubble, ransom-letter title, calling card, tarot card, playing card, wanted-style poster frame, date wipe, loading screen, button glyphs.

Screens to document: main menu, status, battle command ring, shop, results, calendar, chat, Phan-Site.

## 6. Gaps for phase 3 (assets to pull)

1. UI textures and patterns: halftone, stripe wipes, torn paper edges, ring backgrounds.
2. HUD sprites from other games in the series (Strikers, Tactica, The Phantom X) for variants.
3. Screens of Royal menus for exact angles and spacing. Not available as sprites, so use reference screenshots and measure.
4. Font: no confirmed source. Pick licensed look-alikes.

Non-character assets only, listed for approval before any download.

## 7. Round 2 research (real screenshots and font search)

Viewed in the browser only; no files downloaded. Screens inspected from the RPGFan gallery (ss-055, ss-062, ss-063, plus Screenshot-163 and -150).

### Observed in real screens (eyeballed, not pixel-measured)

- **Palace select (ss-055):** menu entries are black parallelograms with white bold text. The selected entry flips to a white panel with a cyan accent strip. A red slanted banner carries the "targets in this Palace" count. Background is a red disc with black torn silhouettes and thin red cracks. Button prompts sit bottom left as small round glyphs.
- **Results (ss-063):** layout is built from jagged red lightning-bolt ribbons crossing a grayscale halftone illustration. Numbers sit on a white spiky starburst (EXP) and a yellow label with a black outline ("MONEY BONUS!"). A gray bar holds item names. Vertical outlined text runs down the left edge.
- **Upgrade menu (ss-062):** a different mood: starfield, crescent moons, curved text. The selected line is a yellow slanted highlight, other lines are plain white text rotated slightly. Small point badges are round and black. Shows that each system screen has its own scene, with the red/black/white rule loosened.
- **Field HUD (Screenshot-163):** the date is a white sticker with a black outline, rotated about 10 degrees, with the weekday in a black strip. Location name sits in a black box with a white border. Minimap is a black polygon with white lines. Party icons are black torn-edge strips with a cyan and magenta underline.
- **Dialogue (ss-056 to ss-059):** speech bubbles are white boxes with black outline and a sharp triangular tail, name tag is a yellow/black tab on top left.
- **Day-change letterbox (Screenshot-150):** black bars at top and bottom carry a repeating pattern of tiny black-on-dark motifs.

Shape rules these suggest: shapes are polygons with straight, sharp cuts; rotation is applied to whole elements (about 5 to 12 degrees) rather than only skewed text; torn or jagged edges come from irregular polygons, not curves; outlines are thick and black on white elements.

### Font (still unconfirmed)

- No primary source names the Western UI font. Inverse says Tactica moved to a more readable sans but names none.
- One fan blog names A-OTF Gothic MB101 Pr6N (Japanese commercial face) for the dominant UI font. Single source, unverified, and a license purchase would be needed.
- Another blog claims Oswald or Bebas Neue as free look-alikes (generic, not identification).
- Chat bubbles: a DaFont forum thread identifies Korean font KoreanKRSM (Charisma) for the Instant Messenger style. Not for menus.
- Practical choice: display text uses the ransom tile engine; headings use a heavy condensed sans (Anton or Oswald, already used on the card); body uses a readable sans. Decide in phase 2.

### Motion

- Only confirmed numbers are still the day-change timing from the itch.io study. The same study counts the animation as 12 x 60 frames.
- CEDEC + KYUSHU 2017 (via Siliconera): menu 3D figure spins then ends in a pose, made with a dedicated tool; battle UI specs were passed from designer to programmer and checked frame by frame. No frame counts or easing values were published in anything found.
- A GitHub project recreates the day progression in Unity (Jack-Pettigrew/Persona-5-Day-Progression) and a Persona 3 Reload menu replica uses CSS `skew`, `rotate`, `clip-path`. Both are possible references for technique, not for exact values.
- Conclusion: motion values cannot be extracted from text sources. They need to be measured from video frames, or we choose our own values and document them as inspired, not measured.

### Asset sources

- The Spriters Resource Persona 5 Royal page (`/playstation_4/persona5royal/`) is behind a Cloudflare check in the Chrome extension tab, so the sheet list could not be read. It is not bypassed. The 14 sheets already downloaded came from there.
- The Amicitia wiki (Battle (P5R) page) documents the battle data folder, but is a stub.
- The Cutting Room Floor "Persona 5/Unused Textures" page may list unused UI textures. Not opened yet.
- Next step for assets: ask the user to open the Spriters Resource list in their own Chrome and paste or screenshot the sheet names, then pick non-character ones for approval.

### Open questions for phase 2

1. Red: switch to measured `#ff0000` or keep `#e3001b` (used by the card and Phansite).
2. Font plan: Anton or Oswald for headings plus a readable body face, or buy the Gothic MB101.
3. Motion: use our own values or measure from video.

## 8. Phase 3: asset coverage (2026-11-16)

Tokens were approved. The Spriters Resource list is still behind a Cloudflare check (tried again, not bypassed), so no new sheet names were verified.

Already in `reference/phansite-prototype/assets` (14 sheets, 36.8 MB), mapped to components:

| Component | Existing sheet |
|---|---|
| Tarot card | `misc/tarot-cards.png` (25 faces sliced in `web/`) |
| Playing card | `thieves-den/tycoon-cards.png` |
| Toast, award notification | `thieves-den/award-notifications.png` |
| Button glyph | `ui/buttons-icons.png` (19 sliced) |
| Skill and item icon | `ui/skill-item-icons.png` |
| Trophy / badge | `misc/trophies.png` |
| Loading screen | `misc/loading-screens.png`, `thieves-den/loading-screen-jp.png` |
| Gallery | `thieves-den/interior-previews.png` (12 sliced) |

Not covered by any sheet, and buildable without sprites (CSS clip-path, gradients, SVG): menu list, panel, banner, speech bubble, date sticker, HP/SP bar, meter, tabs, form fields, tags, dialog, ransom title, torn paper, halftone, bullseye.

Real gaps that sprites would fill: calendar and date art, results-screen ribbons and starburst, Palace/Mementos select backgrounds, minimap pieces. Names of matching sheets need the user to open the Spriters Resource list in their own Chrome.

## Sources

- [RPGFan Persona 5 Royal screenshots](https://www.rpgfan.com/gallery/persona-5-royal-screenshots/) (screens inspected)
- [Siliconera CEDEC 2017 coverage](https://www.siliconera.com/?p=668266) (3D menu figure, color rule)
- [Persona 5 Day Progression (GitHub)](https://www.github.com/Jack-Pettigrew/Persona-5-Day-Progression) (technique reference)
- [Cutting Room Floor: Persona 5 Unused Textures](https://tcrf.net/Persona_5/Unused_Textures) (possible asset lead, not opened)

- [Visual Design of Games: Persona 5](https://mechanicsofmagic.com/2022/04/23/visual-design-of-games-persona-5/) (menu and battle layout)
- [Making UI come to life: study of Persona 5](https://itch.io/blog/533534/making-ui-come-to-life-study-of-persona-5) (day-change timing)
- [The Best Tactical RPG of 2023 Borrows a Trick From Soviet Propaganda](https://www.inverse.com/gaming/persona-5-tactica-user-interface) (style roots, readability)
- [What Makes the UI and Menus in Persona Games So Good?](https://www.siliconera.com/what-makes-the-ui-and-menus-in-persona-games-so-good/) (action ring and menu consistency)
- [What Font Does Persona 5 Use?](https://madegooddesigns.com/persona-5-font/) (font claims, unverified)
