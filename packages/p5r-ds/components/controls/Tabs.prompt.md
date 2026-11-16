Row of black skewed tabs; the selected one turns white with a cyan strip. Wraps onto a second row on narrow screens. Arrow keys, Home and End move the selection. Give each item a `panelId` and render the matching panel, so `aria-controls` points at something real.

```jsx
<Tabs value={tab} onChange={setTab} items={[
  { id: 'targets', label: 'Targets', panelId: 'panel-targets' },
  { id: 'board', label: 'Board', panelId: 'panel-board' },
]} />
<section role="tabpanel" id="panel-targets" aria-labelledby="panel-targets-tab" hidden={tab !== 'targets'}>…</section>
```
