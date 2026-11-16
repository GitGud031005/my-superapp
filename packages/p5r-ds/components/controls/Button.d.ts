export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** primary = red fill, light = white fill, dark = black fill with white keyline */
  variant?: 'primary' | 'light' | 'dark';
  size?: 'md' | 'sm';
  children: React.ReactNode;
}
