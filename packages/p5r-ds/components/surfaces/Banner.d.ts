export interface BannerProps {
  tone?: 'red' | 'black' | 'white';
  /** CSS angle, default -2deg */
  tilt?: string;
  /** Element to render, default div. Use h2 for a heading */
  as?: React.ElementType;
  children: React.ReactNode;
}
