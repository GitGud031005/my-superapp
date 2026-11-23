export interface KeyHintsProps {
  /** Keep action labels distinct. Use familiar key names such as Enter or Ctrl + K. */
  items: readonly { keys: string; action: string }[];
  /** Accessible name for the list. Supply localized text when needed. */
  label?: string;
}
