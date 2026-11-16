export interface MenuItem {
  id: string;
  label: string;
  /** Right-aligned info such as a price or count. Not selectable on its own */
  meta?: string | number;
  disabled?: boolean;
}

export interface MenuListProps {
  items: MenuItem[];
  /** id of the highlighted item */
  value: string | null;
  onChange: (id: string) => void;
  /** Called on Enter, Space or click */
  onActivate?: (id: string) => void;
  /** Accessible name of the list */
  label?: string;
}
