Modal built on the native `<dialog>`, so focus is trapped and Escape works. Red header bar with a square close button in its corner, black body, white outline, hard red shadow. The close button calls `onClose`, like Escape; give it a translated name with `closeLabel` (default "Close").

Pass adjacent buttons directly to `actions`. The footer handles button spacing and wraps them on narrow screens.

```jsx
<Dialog open={open} title="Send the card?" onClose={() => setOpen(false)} closeLabel="Close"
  actions={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary">Send the card</Button></>}>
  The target will receive it tomorrow.
</Dialog>
```
