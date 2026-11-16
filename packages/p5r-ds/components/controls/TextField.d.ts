type NativeFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'children'>;

/** Any other prop (name, autoComplete, required, inputMode...) goes to the input or textarea */
export interface TextFieldProps extends NativeFieldProps {
  /** Shown above the field in red display caps. Always required for accessibility */
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Render a textarea instead of a single-line input */
  multiline?: boolean;
  hint?: string;
  /** Message text without the "Error:" prefix, which the component adds */
  error?: string;
}
