The Phantom Thieves calling card: red concentric rings, ransom-note letters, the official hat logo in the corner, and a logo bullseye on the back. Width follows the parent (max 900px); the aspect ratio is fixed at 3:2. The text is read by screen readers from a hidden paragraph; with `onFlip` the card is a toggle button named "Show the logo side".

```jsx
<CallingCard to="The Distorted King of Procrastination," body="We will steal your distorted desire." flipped={f} onFlip={() => setF(!f)} />
```
