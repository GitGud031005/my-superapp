The calling card combines concentric rings with cutout letters in the heading and signature. The message wraps in body type on a solid light surface. The card becomes portrait below 560px and grows with the message. An accessible text equivalent contains the full message. With `onFlip`, the card is a toggle button named "Show the logo side".

Pass `assetBase={null}` to display an original CSS mark. The same mark appears if the logo image fails to load.

```jsx
<CallingCard to="The Distorted King of Procrastination," body="We will steal your distorted desire." flipped={f} onFlip={() => setF(!f)} />
```
