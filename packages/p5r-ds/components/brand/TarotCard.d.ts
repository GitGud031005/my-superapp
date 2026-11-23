export interface TarotCardProps {
  /** 1 to 25, the order of the sliced sheet in assets/tarot. 0 is the card back */
  index: number;
  /** Show the back instead of the face */
  back?: boolean;
  /** Accessible name. The sheet carries no arcana names, so supply one */
  name?: string;
  /** Card height in px, default 320 */
  height?: number;
  /** CSS angle such as "-4deg" */
  tilt?: string;
  /** When given, the card becomes a toggle button named "Show the back of {name}"; aria-pressed follows `back` */
  onFlip?: () => void;
  /** Folder that contains tarot/. Pass null to use the original CSS card faces. */
  assetBase?: string | null;
}
