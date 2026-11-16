export interface TabItem {
  id: string;
  label: string;
  /**
   * id of the panel this tab shows. When given, the tab gets aria-controls={panelId} and its own id
   * becomes `${panelId}-tab`, so the panel can use aria-labelledby. Leave it out if there is no panel element.
   */
  panelId?: string;
}

export interface TabsProps {
  items: TabItem[];
  /** id of the selected tab */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name of the tab list */
  label?: string;
}
