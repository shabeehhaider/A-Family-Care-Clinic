/**
 * Dates in the clinic's time zone, regardless of where the server runs.
 * (Vercel runs in UTC: without this, sales between midnight and 5am
 * Pakistan time would get the previous day's receipt number and month.)
 */

export const DEFAULT_TIME_ZONE = process.env.APP_TIMEZONE || 'Asia/Karachi'

const formatters = new Map()

function partsIn(date, timeZone) {
  let fmt = formatters.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, fmt)
  }
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]))
  return { y: p.year, m: p.month, d: p.day }
}

/** "2026-11" */
export function monthKey(date, timeZone = DEFAULT_TIME_ZONE) {
  const { y, m } = partsIn(date, timeZone)
  return `${y}-${m}`
}

/** "20261108" (used in receipt numbers) */
export function dayKey(date, timeZone = DEFAULT_TIME_ZONE) {
  const { y, m, d } = partsIn(date, timeZone)
  return `${y}${m}${d}`
}

/** "2026-11-08" (backup labels) */
export function dayStamp(date, timeZone = DEFAULT_TIME_ZONE) {
  const { y, m, d } = partsIn(date, timeZone)
  return `${y}-${m}-${d}`
}

/** Printed on the receipt: "Nov 8, 2026" and "06:18 PM" */
export function receiptDate(date, timeZone = DEFAULT_TIME_ZONE) {
  return date.toLocaleDateString('en-US', { timeZone, year: 'numeric', month: 'short', day: 'numeric' })
}

export function receiptTime(date, timeZone = DEFAULT_TIME_ZONE) {
  return date.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit' })
}

/** The previous calendar month's key, e.g. "2026-10" for "2026-11". */
export function previousMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  return `${py}-${String(pm).padStart(2, '0')}`
}

export const isMonthKey = (key) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key)

/** RC-20261108-001 → "2026-11" */
export function monthFromReceipt(receiptNumber) {
  const m = /^RC-(\d{4})(\d{2})\d{2}-\d+$/.exec(receiptNumber || '')
  return m ? `${m[1]}-${m[2]}` : null
}
