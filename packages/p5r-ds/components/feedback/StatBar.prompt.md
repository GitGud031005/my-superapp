Skewed bar with a white keyline and the numbers on the right. Use `hp` or `sp` for a meter, and `progress` for task completion. The bar, visible number and accessible value share the same range.

```jsx
<StatBar label="HP" value={120} max={200} />
<StatBar label="SP" value={48} max={90} kind="sp" />
<StatBar label="Files processed" value={3} max={5} kind="progress" />
```
