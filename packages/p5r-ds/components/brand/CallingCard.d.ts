export interface CallingCardProps {
  /** Addressee line, for example "The Distorted King of Procrastination," */
  to: string;
  /** The message. It wraps in body type and the card grows to fit longer text. */
  body: string;
  /** Defaults to "The Phantom Thieves of Hearts" */
  signature?: string;
  /** Show the logo side */
  flipped?: boolean;
  /** When given, the whole card becomes a toggle button named "Show the logo side"; aria-pressed follows `flipped` */
  onFlip?: () => void;
  /** Change to reshuffle the letters */
  seed?: number;
  /** Rotate the card -3deg in wide containers. Default true. */
  tilted?: boolean;
  /** Folder that contains brand/. Pass null to use the original CSS mark. */
  assetBase?: string | null;
}
