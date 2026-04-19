/**
 * Tradovate REST API client.
 *
 * Docs: https://api.tradovate.com/
 *
 * Endpoints used:
 *  - POST /auth/accessTokenRequest        → obtain accessToken + mdAccessToken + expiration
 *  - POST /auth/renewAccessToken          → refresh before expiry
 *  - GET  /fillPair/list                  → round-tripped trade pairs (entry + exit + PnL)
 *  - GET  /contract/item?id={id}          → contract metadata (symbol, tickSize, pointValue)
 *  - GET  /cashBalance/list               → account balances (for validation on connect)
 */

export type TradovateEnv = 'LIVE' | 'DEMO'

export const BASE_URLS: Record<TradovateEnv, string> = {
  LIVE: 'https://live.tradovateapi.com/v1',
  DEMO: 'https://demo.tradovateapi.com/v1',
}

export interface TradovateCredentials {
  name: string // username
  password: string
  cid: string // application cid (integer as string OK)
  sec: string // application secret
  appId?: string
  deviceId?: string
}

export interface AccessTokenResponse {
  accessToken: string
  mdAccessToken?: string
  expirationTime: string // ISO
  userStatus: string
  userId: number
  name: string
  hasLive: boolean
  errorText?: string
  'p-ticket'?: string
  'p-time'?: number
  'p-captcha'?: boolean
}

export interface TradovateFillPair {
  id: number
  positionId: number
  buyFillId: number
  sellFillId: number
  // qty tracked on fills, not here
}

export interface TradovateFill {
  id: number
  orderId: number
  contractId: number
  timestamp: string // ISO
  tradeDate: { year: number; month: number; day: number }
  action: 'Buy' | 'Sell'
  qty: number
  price: number
  active: boolean
  commission?: { value: number; currency: number }
}

export interface TradovateContract {
  id: number
  name: string // e.g. "NQZ5", "ESH6"
  contractMaturityId: number
  status: string
}

export interface TradovateContractMaturity {
  id: number
  productId: number
}

export interface TradovateProduct {
  id: number
  name: string // "NQ", "ES", "GC", "CL", ...
  currencyId: number
  valuePerPoint: number
  tickSize: number
  priceFormatType: string
}

export class TradovateAPIError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message)
    this.name = 'TradovateAPIError'
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Authenticate with Tradovate and obtain an access token. */
export async function requestAccessToken(
  env: TradovateEnv,
  creds: TradovateCredentials
): Promise<AccessTokenResponse> {
  const base = BASE_URLS[env]
  const body = {
    name: creds.name,
    password: creds.password,
    appId: creds.appId || 'JK Trading Journal',
    appVersion: '1.0',
    cid: creds.cid,
    sec: creds.sec,
    deviceId: creds.deviceId || undefined,
  }
  const res = await fetch(`${base}/auth/accessTokenRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await parseJson(res)) as AccessTokenResponse
  if (!res.ok) {
    throw new TradovateAPIError(
      `Auth failed (${res.status}): ${data && typeof data === 'object' && 'errorText' in data ? (data as { errorText: string }).errorText : 'unknown error'}`,
      res.status,
      data
    )
  }
  if (data && data.errorText) {
    throw new TradovateAPIError(`Auth rejected: ${data.errorText}`, res.status, data)
  }
  if (!data?.accessToken) {
    throw new TradovateAPIError('Auth response missing accessToken', res.status, data)
  }
  return data
}

/** Renew a near-expiry access token without sending credentials again. */
export async function renewAccessToken(
  env: TradovateEnv,
  accessToken: string
): Promise<AccessTokenResponse> {
  const base = BASE_URLS[env]
  const res = await fetch(`${base}/auth/renewAccessToken`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  const data = (await parseJson(res)) as AccessTokenResponse
  if (!res.ok) {
    throw new TradovateAPIError(`Renew failed (${res.status})`, res.status, data)
  }
  return data
}

async function authedGet<T>(env: TradovateEnv, path: string, accessToken: string): Promise<T> {
  const base = BASE_URLS[env]
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  const data = await parseJson(res)
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'errorText' in (data as Record<string, unknown>)
        ? String((data as { errorText: string }).errorText)
        : `HTTP ${res.status}`
    throw new TradovateAPIError(`GET ${path} failed: ${msg}`, res.status, data)
  }
  return data as T
}

export function listFillPairs(env: TradovateEnv, token: string): Promise<TradovateFillPair[]> {
  return authedGet<TradovateFillPair[]>(env, '/fillPair/list', token)
}

export function listFills(env: TradovateEnv, token: string): Promise<TradovateFill[]> {
  return authedGet<TradovateFill[]>(env, '/fill/list', token)
}

export function getFill(env: TradovateEnv, token: string, id: number): Promise<TradovateFill> {
  return authedGet<TradovateFill>(env, `/fill/item?id=${id}`, token)
}

export function getContract(
  env: TradovateEnv,
  token: string,
  id: number
): Promise<TradovateContract> {
  return authedGet<TradovateContract>(env, `/contract/item?id=${id}`, token)
}

export function getContractMaturity(
  env: TradovateEnv,
  token: string,
  id: number
): Promise<TradovateContractMaturity> {
  return authedGet<TradovateContractMaturity>(env, `/contractMaturity/item?id=${id}`, token)
}

export function getProduct(
  env: TradovateEnv,
  token: string,
  id: number
): Promise<TradovateProduct> {
  return authedGet<TradovateProduct>(env, `/product/item?id=${id}`, token)
}

export function listCashBalances(env: TradovateEnv, token: string): Promise<unknown[]> {
  return authedGet<unknown[]>(env, '/cashBalance/list', token)
}

/**
 * Extract the root symbol ("NQ") from a contract name ("NQZ5", "NQH2026").
 * Stops at the first digit, which is where the maturity code begins.
 */
export function extractRootSymbol(contractName: string): string {
  const m = contractName.match(/^([A-Z]+)/i)
  return m ? m[1].toUpperCase() : contractName.toUpperCase()
}
