Tarot card from the game's own sprite sheet, with a hard shadow that follows the card outline and a 3D flip between face and back.

Pass `assetBase={null}` to use the original CSS faces. The same faces appear if an image fails to load.

```jsx
<TarotCard index={7} name="The Chariot" tilt="-4deg" back={flipped} onFlip={() => setFlipped(!flipped)} />
```
