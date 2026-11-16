Modal built on the native `<dialog>`, so focus is trapped and Escape works. Red header bar, black body, white outline, hard red shadow.

```jsx
<Dialog open={open} title="Send the card?" onClose={() => setOpen(false)}
  actions={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary">Send the card</Button></>}>
  The target will receive it tomorrow.
</Dialog>
```
