White field with a thick black border and a hard red shadow, label in red display caps. Errors turn the shadow yellow and add a text message, so color is never the only signal. Write the error as the fix ("Write a message for the card"), not the problem. The error is linked through `aria-describedby`; on submit, move focus to the first invalid field.

```jsx
<TextField label="To" value={to} onChange={(e) => setTo(e.target.value)} maxLength={80} />
<TextField label="Your message" multiline value={msg} onChange={...} error="Write a message for the card" />
```
