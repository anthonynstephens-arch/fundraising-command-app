export const REPORTING_TIME_ZONE = 'America/Detroit'
export function reportingDay(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: REPORTING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return ['year','month','day'].map(type => parts.find(p => p.type === type)!.value).join('-')
}
export function validReportingDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '1970-01-01' && Number.isFinite(Date.parse(value + 'T12:00:00Z')) &&
    new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value &&
    value <= reportingDay()
}
export function inReportingPeriod(placedAt: string, start: string | null, today = reportingDay()) {
  const day = reportingDay(placedAt)
  return !!day && (!start || day >= start) && day <= today
}
