The signature Persona menu: a stack of black parallelograms. The highlighted item turns white with a cyan strip, scales up 18% and slides right. Items enter with a 40ms stagger. The list is one focus stop; Up/Down/Home/End move the highlight, Enter or Space activates.

If a selected option becomes unavailable, keyboard focus points to the first enabled option. Enter or Space selects and activates that option.

```jsx
<MenuList
  label="Main menu"
  items={[{id:'skill',label:'Skill'},{id:'item',label:'Item',meta:'x12'},{id:'persona',label:'Persona'}]}
  value={sel} onChange={setSel} onActivate={open}
/>
```
