export interface AwardToastProps {
  /** Short headline in yellow display caps */
  title: string;
  /** One line of detail */
  children?: React.ReactNode;
  /** Optional image URL, decorative */
  icon?: string;
}
