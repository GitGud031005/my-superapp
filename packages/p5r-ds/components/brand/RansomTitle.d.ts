export interface RansomTitleProps {
  text: string;
  /** Same text and seed always give the same letters. Change the seed to shuffle */
  seed?: number;
  /** Element to render, default span. Use h1/h2 for headings. The plain text is exposed to screen readers */
  as?: React.ElementType;
  /** message = mostly white tiles with some black, paper and red. logo = white and black only */
  skin?: 'message' | 'logo';
  /** Font size in px when fit is false. Default 32 */
  size?: number;
  /** Shrink the text until it fits the box. The box needs a width, and a fixed height to fit vertically */
  fit?: boolean;
  /** Upper limit in px when fit is true. Default 96 */
  maxSize?: number;
  /** Keep everything on one line (signatures, logos) */
  singleLine?: boolean; // always shrinks to fit the width, capped at `size` (or `maxSize` with fit)
  align?: 'center' | 'end';
  /** Randomly swap letter case. Default true for the message skin, false for logo */
  flipCase?: boolean;
  /** Size variation between letters, 0 to 0.5 */
  jitter?: number;
  /** Max rotation per letter in degrees */
  tilt?: number;
  /** Entry animation: offset and total span in ms */
  delay?: number;
  duration?: number;
}
