Skewed parallelogram button with upright text. The face and label lift on hover and settle when pressed. The hit area stays fixed, and each variant uses the same label colour for its default, hover and pressed states. Use one `primary` for the main action, `light` for secondary actions on dark surfaces, and `dark` on light surfaces. Keyboard focus uses a white outline on dark and red surfaces and a black outline on light surfaces.

Group buttons with `.p5r-button-row` so their skewed faces, echo plates and focus outlines have room. For a custom layout, use `--space-button-inline` (40px) between buttons on the same line and `--space-button-block` (24px) between rows. Allow wrapping in narrow containers. Dialog actions use these gaps automatically.

```jsx
<div className="p5r-button-row">
  <Button>Shuffle letters</Button>
  <Button variant="primary" type="submit">Send the card</Button>
</div>
```
