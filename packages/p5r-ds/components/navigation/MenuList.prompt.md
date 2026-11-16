The signature Persona menu: a stack of black parallelograms. The highlighted item turns white with a cyan strip, scales up 18% and slides right. Items enter with a 40ms stagger. The list is one focus stop; Up/Down/Home/End move the highlight, Enter or Space activates.

```jsx
<MenuList
  label="Main menu"
  items={[{id:'skill',label:'Skill'},{id:'item',label:'Item',meta:'x12'},{id:'persona',label:'Persona'}]}
  value={sel} onChange={setSel} onActivate={open}
/>
```
