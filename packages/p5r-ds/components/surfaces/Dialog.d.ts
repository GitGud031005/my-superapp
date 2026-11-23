export interface DialogProps {
  open: boolean;
  title: string;
  /** Called on Escape, on the native close event and when the host decides to close */
  onClose: () => void;
  /** Buttons rendered right-aligned in the footer */
  actions?: React.ReactNode;
  /** Accessible name of the close button in the header corner. Default "Close"; pass the translated word */
  closeLabel?: string;
  children: React.ReactNode;
}
