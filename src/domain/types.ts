/** Календарная дата без времени и часового пояса: 'YYYY-MM-DD'. */
export type CalendarDate = string

/** ISO 3166-1 alpha-2, например 'RU', 'FR'. */
export type CountryCode = string

export interface Stay {
  id: string
  country: CountryCode
  entry: CalendarDate
  /** null — открытое пребывание, тянется до сегодня. */
  exit: CalendarDate | null
}

export interface DateRange {
  start: CalendarDate
  end: CalendarDate
}
