export interface SpeechBubbleProps {
  /** Name tag on the top-left corner */
  speaker?: string;
  /** Horizontal position of the tail tip, 12 to 88 (percent of width). Default 50 */
  tailX?: number;
  children: React.ReactNode;
}
