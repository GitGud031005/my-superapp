export interface DialogProps {
  open: boolean;
  title: string;
  /** Called on Escape, on the native close event and when the host decides to close */
  onClose: () => void;
  /** Buttons rendered right-aligned in the footer */
  actions?: React.ReactNode;
  children: React.ReactNode;
}
