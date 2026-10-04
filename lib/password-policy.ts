/**
 * JK TRADING — قواعد كلمة المرور
 *
 * One policy for every place a password is set: the mentor resetting a locked-out
 * student's password, and a user changing their own. Shared by the browser and
 * the server so both give the same answer.
 *
 * Passwords are only ever stored as a bcrypt hash, so a forgotten one cannot be
 * looked up by anyone — it can only be replaced.
 */

export const PASSWORD_MIN_LENGTH = 8

/** bcrypt reads only the first 72 bytes; anything longer would be silently cut. */
export const PASSWORD_MAX_BYTES = 72

export type PasswordProblem = 'too_short' | 'too_long' | 'edge_whitespace'

export const PASSWORD_PROBLEM_TEXT: Record<PasswordProblem, string> = {
  too_short: `كلمة المرور قصيرة — ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`,
  too_long: 'كلمة المرور طويلة جداً.',
  edge_whitespace: 'كلمة المرور لا يجوز أن تبدأ أو تنتهي بمسافة.',
}

/** Null when the password is acceptable, otherwise what is wrong with it. */
export function checkPassword(password: unknown): PasswordProblem | null {
  if (typeof password !== 'string') return 'too_short'
  // A pasted password with a stray space is the classic "it doesn't work" report.
  if (password !== password.trim()) return 'edge_whitespace'
  if (Array.from(password).length < PASSWORD_MIN_LENGTH) return 'too_short'
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'too_long'
  return null
}

/** No 0/O, 1/l/I or o — characters that get misread when a password is typed from a message. */
const TEMP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/**
 * A random temporary password such as "Kx7m-Pq4W-9hTz".
 *
 * Generated where it is called — in the mentor's browser — so it is seen only by
 * the mentor and travels once to the server to be hashed.
 */
export function generateTempPassword(groups = 3, groupSize = 4): string {
  const need = groups * groupSize
  const chars: string[] = []
  // Rejection sampling: bytes past the last full multiple of the alphabet would
  // make the first few letters slightly more likely, so they are discarded.
  const limit = 256 - (256 % TEMP_ALPHABET.length)
  while (chars.length < need) {
    const bytes = new Uint8Array(need * 2)
    crypto.getRandomValues(bytes)
    for (let i = 0; i < bytes.length && chars.length < need; i++) {
      if (bytes[i] < limit) chars.push(TEMP_ALPHABET[bytes[i] % TEMP_ALPHABET.length])
    }
  }
  const parts: string[] = []
  for (let i = 0; i < need; i += groupSize) parts.push(chars.slice(i, i + groupSize).join(''))
  return parts.join('-')
}
