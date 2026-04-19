import crypto from 'crypto'

/**
 * AES-256-GCM encryption for sensitive credentials (Tradovate passwords, secrets).
 *
 * ENV: `ENCRYPTION_KEY` must be 32 bytes hex (64 hex chars). Generate once via:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Output format: `iv_hex:tag_hex:ciphertext_hex`
 */

const ALG = 'aes-256-gcm'
const IV_LEN = 12 // 96-bit IV (GCM standard)

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY env var is not set (need 64 hex chars)')
  }
  if (raw.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(raw, 'hex')
}

export function encrypt(plaintext: string): string {
  if (plaintext == null) return ''
  const key = getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(payload: string): string {
  if (!payload) return ''
  const parts = payload.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format')
  const [ivHex, tagHex, ctHex] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ct = Buffer.from(ctHex, 'hex')
  const decipher = crypto.createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(ct), decipher.final()])
  return out.toString('utf8')
}

/** Safe-preview a decrypted credential for UI (never show full value). */
export function maskCredential(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return '••••'
  return value.slice(0, 2) + '••••' + value.slice(-2)
}
