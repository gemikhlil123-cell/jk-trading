import { Killzone, CyclePhase } from '@prisma/client'

/**
 * Determines which trading session (killzone) a UTC timestamp falls into.
 *
 * ASIA:    01:00 – 07:00 UTC
 * LONDON:  07:00 – 13:00 UTC
 * NY_AM:   13:00 – 19:00 UTC
 * NY_PM:   19:00 – 00:00 UTC (midnight)
 */
export function computeKillzone(entryTime: Date): Killzone {
  const utcHour = entryTime.getUTCHours()
  const utcMin = entryTime.getUTCMinutes()
  const totalMinutes = utcHour * 60 + utcMin

  if (totalMinutes >= 60 && totalMinutes < 420) return 'ASIA'       // 01:00–07:00
  if (totalMinutes >= 420 && totalMinutes < 780) return 'LONDON'    // 07:00–13:00
  if (totalMinutes >= 780 && totalMinutes < 1140) return 'NY_AM'    // 13:00–19:00
  if (totalMinutes >= 1140 || totalMinutes < 60) return 'NY_PM'     // 19:00–01:00
  return 'OFF_HOURS'
}

// Session open times in minutes from midnight UTC
const SESSION_OPENS: Record<Exclude<Killzone, 'OFF_HOURS'>, number> = {
  ASIA:   60,   // 01:00 UTC
  LONDON: 420,  // 07:00 UTC
  NY_AM:  780,  // 13:00 UTC
  NY_PM:  1140, // 19:00 UTC
}

/**
 * Determines which 90-minute cycle within a session the trade was entered.
 * CYCLE_1: first 90 min of session
 * CYCLE_2: 90–180 min
 * CYCLE_3: 180–270 min
 */
export function computeCyclePhase(entryTime: Date, killzone: Killzone): CyclePhase {
  if (killzone === 'OFF_HOURS') return 'OFF_CYCLE'

  const utcMinutes = entryTime.getUTCHours() * 60 + entryTime.getUTCMinutes()
  const sessionOpen = SESSION_OPENS[killzone as Exclude<Killzone, 'OFF_HOURS'>]

  let minutesIntoSession = utcMinutes - sessionOpen

  // Handle NY_PM wrapping past midnight
  if (killzone === 'NY_PM' && minutesIntoSession < 0) {
    minutesIntoSession += 24 * 60
  }

  const cycleIndex = Math.floor(minutesIntoSession / 90)
  if (cycleIndex === 0) return 'CYCLE_1'
  if (cycleIndex === 1) return 'CYCLE_2'
  if (cycleIndex === 2) return 'CYCLE_3'
  return 'OFF_CYCLE'
}

export const KILLZONE_LABELS: Record<Killzone, string> = {
  ASIA:      'آسيا (01:00–07:00 UTC)',
  LONDON:    'لندن (07:00–13:00 UTC)',
  NY_AM:     'نيويورك صباح (13:00–19:00 UTC)',
  NY_PM:     'نيويورك مساء (19:00–01:00 UTC)',
  OFF_HOURS: 'خارج الجلسات',
}
