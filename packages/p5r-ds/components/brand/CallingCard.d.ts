export interface CallingCardProps {
  /** Addressee line, for example "The Distorted King of Procrastination," */
  to: string;
  /** The message, up to about 200 characters. The letters shrink to fit; below 560px wide the card turns portrait to keep them readable. A word too long to fit at a readable size breaks between its letter tiles */
  body: string;
  /** Defaults to "The Phantom Thieves of Hearts" */
  signature?: string;
  /** Show the logo side */
  flipped?: boolean;
  /** When given, the whole card becomes a toggle button named "Show the logo side"; aria-pressed follows `flipped` */
  onFlip?: () => void;
  /** Change to reshuffle the letters */
  seed?: number;
  /** Rotate the card -3deg like a card thrown on a table. Default true */
  tilted?: boolean;
  /** Folder that contains brand/. Default "../../assets" works from a components/<group>/ card */
  assetBase?: string;
}
