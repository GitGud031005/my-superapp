export interface DateStickerProps {
  month: number | string;
  day: number | string;
  /** Full or abbreviated weekday, shown in the black strip */
  weekday: string;
  /** Optional time of day such as "After school" */
  period?: string;
}
