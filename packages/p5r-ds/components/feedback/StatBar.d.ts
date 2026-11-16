export interface StatBarProps {
  /** Short caps label, doubles as the accessible name */
  label: string;
  value: number;
  max: number;
  /** hp = red, sp = cyan, progress = yellow. These are the only places non-red color is allowed for data */
  kind?: 'hp' | 'sp' | 'progress';
}
