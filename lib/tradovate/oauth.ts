/**
 * JK TRADING — ربط Tradovate عبر OAuth
 *
 * الطريقة القديمة كانت بتخلّي الطالب يكتب اسم المستخدم وكلمة السر تبعت Tradovate
 * جوّا اليوميّات، وإحنا نخزّنهم (مشفّرين) عندنا. هاي الطريقة بتخلّي مفتاح حساب
 * التداول تبعه بإيدنا، وهاد شي ما لازم نحمله أصلاً.
 *
 * مع OAuth الطالب بيسجّل دخوله عند Tradovate نفسها، وإحنا بس بناخد توكن.
 * ولا مرّة بنشوف كلمة السر تبعته، وهو بيقدر يقطع الوصول من عندهم بأي لحظة.
 *
 * Everything downstream is unchanged: sync already works from an access token,
 * so this only replaces how that token is obtained.
 *
 * Flow (per Tradovate's own example app):
 *   1. send the user to  https://trader.tradovate.com/oauth
 *   2. they sign in there and are returned to our redirect_uri with ?code=
 *   3. we POST that code to /auth/oauthtoken and get an access_token back
 */
import type { TradovateEnv } from './client'

/** Host roots. The OAuth token endpoint sits outside the /v1 API prefix. */
export const OAUTH_HOSTS: Record<TradovateEnv, string> = {
  LIVE: 'https://live.tradovateapi.com',
  DEMO: 'https://demo.tradovateapi.com',
}

/** Tradovate serves the consent screen from the trader app, for both envs. */
export const AUTHORIZE_URL = 'https://trader.tradovate.com/oauth'

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  /** Must match a redirect URI registered with Tradovate, character for character. */
  redirectUri: string
}

/**
 * Read the OAuth configuration from the environment.
 * Returns null when it is not configured, which is how the UI decides whether
 * to offer the OAuth button or fall back to the manual credential form.
 */
export function getOAuthConfig(): OAuthConfig | null {
  const clientId = process.env.TRADOVATE_CLIENT_ID
  const clientSecret = process.env.TRADOVATE_CLIENT_SECRET
  const redirectUri =
    process.env.TRADOVATE_REDIRECT_URI ??
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')}/api/tradovate/oauth/callback`
      : undefined)

  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function isOAuthConfigured(): boolean {
  return getOAuthConfig() !== null
}

/**
 * The URL to send the user to.
 *
 * `state` is not in Tradovate's example, but it is what stops an attacker from
 * feeding a victim's browser their own authorization code. We send it and check
 * it on the way back; see the callback route for what happens if it does not
 * come back.
 */
export function buildAuthorizeUrl(config: OAuthConfig, state: string): string {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  })
  return `${AUTHORIZE_URL}?${q.toString()}`
}

export interface OAuthTokenResponse {
  accessToken: string
  /** Absolute expiry, derived from the `expires_in` seconds Tradovate returns. */
  expiresAt: Date
  /** Present only if Tradovate returns one; the documented flow does not. */
  refreshToken?: string
}

export class TradovateOAuthError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'TradovateOAuthError'
  }
}

/** Exchange the single-use code from the callback for an access token. */
export async function exchangeCodeForToken(
  config: OAuthConfig,
  code: string,
  env: TradovateEnv,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  })

  const res = await fetch(`${OAUTH_HOSTS[env]}/auth/oauthtoken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const text = await res.text()
  let json: Record<string, unknown>
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    // Never echo the raw body: it can carry the code or fragments of the secret.
    throw new TradovateOAuthError('Tradovate returned a non-JSON response', res.status)
  }

  if (!res.ok || json.error) {
    const detail = typeof json.error_description === 'string' ? json.error_description
      : typeof json.error === 'string' ? json.error
      : 'unknown error'
    throw new TradovateOAuthError(`Tradovate rejected the token exchange: ${detail}`, res.status)
  }

  const accessToken = json.access_token
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new TradovateOAuthError('Tradovate returned no access token', res.status)
  }

  // Fall back to an hour when expires_in is missing; the sync path re-checks
  // expiry before every call, so a short guess is safe and a long one is not.
  const expiresIn = typeof json.expires_in === 'number' && json.expires_in > 0
    ? json.expires_in
    : 3600

  return {
    accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    ...(typeof json.refresh_token === 'string' ? { refreshToken: json.refresh_token } : {}),
  }
}

/** Cryptographically random state value for the authorization request. */
export function generateState(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time comparison, so a mismatch cannot be found by timing the check. */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
