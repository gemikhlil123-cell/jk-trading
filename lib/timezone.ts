/**
 * Asia/Jerusalem timezone utilities.
 * Handles IDT (UTC+3, summer) / IST (UTC+2, winter) with DST transitions
 * via Intl.DateTimeFormat (no external deps).
 */

const TZ = 'Asia/Jerusalem'

/**
 * Returns the offset (in minutes) of Asia/Jerusalem vs UTC at the given instant.
 * Positive = ahead of UTC (so UTC + offset = Jerusalem wall-clock).
 */
export function getJerusalemOffsetMinutes(atInstant: Date): number {
  // Get Jerusalem wall-clock parts at this instant
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(atInstant)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || '0', 10)
  let hour = get('hour')
  if (hour === 24) hour = 0
  const jerusalemAsUTC = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    hour, get('minute'), get('second')
  )
  return Math.round((jerusalemAsUTC - atInstant.getTime()) / 60000)
}

/**
 * Converts a "wall-clock" datetime string (as entered in Jerusalem) to a
 * real UTC Date. Input format: "YYYY-MM-DDTHH:mm" (from <input type="datetime-local">).
 * The user types 14:30 in Jerusalem → we return the UTC instant that reads
 * 14:30 in Jerusalem.
 */
export function jerusalemWallToUTC(localStr: string): Date {
  if (!localStr || !localStr.includes('T')) return new Date(localStr)
  const [datePart, timePart] = localStr.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  // First guess — treat the input as if it were UTC
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi))
  // Find what Jerusalem offset applies at that instant
  const offsetMin = getJerusalemOffsetMinutes(guess)
  // The real UTC instant is the guess shifted back by the offset
  return new Date(guess.getTime() - offsetMin * 60000)
}

/**
 * Converts a UTC Date to a "YYYY-MM-DDTHH:mm" string representing
 * Jerusalem wall-clock time. Useful for prefilling <input type="datetime-local">.
 */
export function utcToJerusalemWall(date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00'
  let hour = get('hour')
  if (hour === '24') hour = '00'
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

/**
 * Formats a UTC Date as a Jerusalem-local string (for display).
 */
export function formatJerusalem(
  date: Date | string,
  opts: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: TZ,
    ...opts,
  }).format(d)
}

export function formatJerusalemDate(date: Date | string): string {
  return formatJerusalem(date, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatJerusalemTime(date: Date | string): string {
  return formatJerusalem(date, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatJerusalemDateTime(date: Date | string): string {
  return formatJerusalem(date, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
