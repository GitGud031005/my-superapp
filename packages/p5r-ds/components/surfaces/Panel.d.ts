export interface PanelProps {
  tone?: 'dark' | 'light' | 'red';
  /** Yellow tab straddling the top edge */
  title?: string;
  /** CSS angle such as "-2deg". Whole-panel rotation, keep within 3deg for content panels */
  tilt?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
