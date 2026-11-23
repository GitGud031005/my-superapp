White field with a thick black border and a hard offset shadow. A black inset underline marks focus on every surface. Errors keep their yellow shadow and explanatory message while the field has focus. Describe what the user can do next, for example “Write a message for the card.” The error is linked through `aria-describedby`. On submit, move focus to the first invalid field.

Extra `aria-describedby` IDs and classes are added to the component defaults. Use `errorPrefix` to translate the error prefix.

```jsx
<TextField label="To" value={to} onChange={(e) => setTo(e.target.value)} maxLength={80} />
<TextField label="Your message" multiline value={msg} onChange={...} error="Write a message for the card" />
```
