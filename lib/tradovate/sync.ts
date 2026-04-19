/**
 * Tradovate → JK Trading Journal sync.
 *
 * Flow per account:
 *   1. Ensure a valid access token (refresh if expired or missing)
 *   2. Fetch all fillPairs (round-tripped trades)
 *   3. For each fillPair: fetch both fills, derive direction/entry/exit/pnl
 *   4. Upsert into Trade table using externalFillId = `pair-${fillPairId}`
 *   5. Skip pairs already imported (idempotent)
 *   6. Mark needsReview=true so the user completes entry reasons / screenshots
 */

import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/encryption'
import { computeKillzone, computeCyclePhase } from '@/lib/autoTag'
import {
  requestAccessToken,
  renewAccessToken,
  listFillPairs,
  getFill,
  getContract,
  getContractMaturity,
  getProduct,
  extractRootSymbol,
  TradovateAPIError,
  type TradovateEnv,
  type TradovateFill,
} from './client'
import type { Symbol as PrismaSymbol, TradovateAccount } from '@prisma/client'

const SYMBOL_MAP: Record<string, PrismaSymbol> = {
  NQ: 'NQ',
  MNQ: 'NQ',
  ES: 'ES',
  MES: 'ES',
  BTC: 'BTC',
  MBT: 'BTC',
  GC: 'GC',
  MGC: 'GC',
  XAU: 'XAU',
  CL: 'CL',
  MCL: 'CL',
  EURUSD: 'EURUSD',
  '6E': 'EURUSD',
}

function mapSymbol(root: string): PrismaSymbol {
  return SYMBOL_MAP[root.toUpperCase()] ?? 'OTHER'
}

// Simple in-process cache for contract → product metadata (avoids N+1 lookups per sync).
const contractMetaCache = new Map<number, { root: string; valuePerPoint: number }>()

async function getContractMeta(
  env: TradovateEnv,
  token: string,
  contractId: number
): Promise<{ root: string; valuePerPoint: number }> {
  const cached = contractMetaCache.get(contractId)
  if (cached) return cached
  const contract = await getContract(env, token, contractId)
  let valuePerPoint = 1
  let root = extractRootSymbol(contract.name)
  try {
    const maturity = await getContractMaturity(env, token, contract.contractMaturityId)
    const product = await getProduct(env, token, maturity.productId)
    valuePerPoint = product.valuePerPoint || 1
    root = product.name || root
  } catch {
    // fallback on contract name only
  }
  const meta = { root, valuePerPoint }
  contractMetaCache.set(contractId, meta)
  return meta
}

/**
 * Ensure the stored access token is valid. Refresh via renew endpoint if stale,
 * or re-authenticate from encrypted credentials if renew fails.
 * Returns the current (possibly refreshed) access token.
 */
export async function ensureValidToken(account: TradovateAccount): Promise<string> {
  const env = account.env as TradovateEnv
  const now = new Date()
  const buffer = 2 * 60 * 1000 // 2-minute buffer before expiry

  if (
    account.accessToken &&
    account.tokenExpiresAt &&
    account.tokenExpiresAt.getTime() - now.getTime() > buffer
  ) {
    return account.accessToken
  }

  // Try renew first (cheap)
  if (account.accessToken) {
    try {
      const renewed = await renewAccessToken(env, account.accessToken)
      if (renewed?.accessToken) {
        await prisma.tradovateAccount.update({
          where: { id: account.id },
          data: {
            accessToken: renewed.accessToken,
            mdAccessToken: renewed.mdAccessToken ?? account.mdAccessToken,
            tokenExpiresAt: renewed.expirationTime ? new Date(renewed.expirationTime) : null,
          },
        })
        return renewed.accessToken
      }
    } catch {
      // fall through to full re-auth
    }
  }

  // Full re-auth with stored credentials
  const creds = {
    name: decrypt(account.usernameEnc),
    password: decrypt(account.passwordEnc),
    cid: decrypt(account.cidEnc),
    sec: decrypt(account.secretEnc),
    appId: account.appId || undefined,
    deviceId: account.deviceId || undefined,
  }
  const fresh = await requestAccessToken(env, creds)
  await prisma.tradovateAccount.update({
    where: { id: account.id },
    data: {
      accessToken: fresh.accessToken,
      mdAccessToken: fresh.mdAccessToken ?? null,
      tokenExpiresAt: fresh.expirationTime ? new Date(fresh.expirationTime) : null,
    },
  })
  return fresh.accessToken
}

export interface SyncResult {
  imported: number
  skipped: number
  errors: number
  errorMessages: string[]
}

/**
 * Sync trades for a single Tradovate account.
 * Returns counts. Updates lastSyncAt / lastSyncStatus on the account row.
 */
export async function syncAccount(accountId: string): Promise<SyncResult> {
  const account = await prisma.tradovateAccount.findUnique({ where: { id: accountId } })
  if (!account) throw new Error(`TradovateAccount not found: ${accountId}`)
  if (!account.isActive) {
    return { imported: 0, skipped: 0, errors: 0, errorMessages: ['account inactive'] }
  }

  const result: SyncResult = { imported: 0, skipped: 0, errors: 0, errorMessages: [] }

  try {
    const token = await ensureValidToken(account)
    const env = account.env as TradovateEnv
    const pairs = await listFillPairs(env, token)

    // Pre-filter pairs already imported
    const externalIds = pairs.map((p) => `pair-${p.id}`)
    const existing = await prisma.trade.findMany({
      where: { externalFillId: { in: externalIds } },
      select: { externalFillId: true },
    })
    const existingSet = new Set(existing.map((e) => e.externalFillId))

    for (const pair of pairs) {
      const extId = `pair-${pair.id}`
      if (existingSet.has(extId)) {
        result.skipped++
        continue
      }

      try {
        const [buyFill, sellFill] = await Promise.all([
          getFill(env, token, pair.buyFillId),
          getFill(env, token, pair.sellFillId),
        ])

        // Determine direction: whichever came first is the entry.
        // LONG  = buy first (entry), sell second (exit)
        // SHORT = sell first (entry), buy second (exit)
        const buyTime = new Date(buyFill.timestamp)
        const sellTime = new Date(sellFill.timestamp)
        const isLong = buyTime.getTime() <= sellTime.getTime()

        const entryFill: TradovateFill = isLong ? buyFill : sellFill
        const exitFill: TradovateFill = isLong ? sellFill : buyFill
        const direction = isLong ? 'LONG' : 'SHORT'

        const meta = await getContractMeta(env, token, entryFill.contractId)
        const symbol = mapSymbol(meta.root)

        // PnL = points × valuePerPoint × qty × sign
        const points = isLong
          ? exitFill.price - entryFill.price
          : entryFill.price - exitFill.price
        const qty = Math.min(buyFill.qty, sellFill.qty) || 1
        const pnl = points * meta.valuePerPoint * qty
        const commission =
          (buyFill.commission?.value ?? 0) + (sellFill.commission?.value ?? 0)
        const netPnl = pnl - commission

        const entryTime = entryFill.timestamp ? new Date(entryFill.timestamp) : new Date()
        const exitTime = exitFill.timestamp ? new Date(exitFill.timestamp) : null
        const killzone = computeKillzone(entryTime)
        const cyclePhase = computeCyclePhase(entryTime, killzone)

        await prisma.trade.create({
          data: {
            userId: account.userId,
            symbol,
            direction,
            entryPrice: entryFill.price.toString(),
            exitPrice: exitFill.price.toString(),
            entryTime,
            exitTime,
            pnl: netPnl.toFixed(2),
            killzone,
            cyclePhase,
            source: 'TRADOVATE',
            externalFillId: extId,
            needsReview: true,
            isBacktest: false,
            notes: `استيراد تلقائي من Tradovate — ${meta.root} ${qty} عقد`,
          },
        })

        // Create alert prompting the user to complete the trade context
        await prisma.alert.create({
          data: {
            userId: account.userId,
            type: 'TRADOVATE_SYNC',
            message: `صفقة جديدة من Tradovate (${meta.root}) — أكمل أسباب الدخول والـ screenshot`,
          },
        })

        result.imported++
      } catch (err) {
        result.errors++
        const msg =
          err instanceof TradovateAPIError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'unknown error'
        result.errorMessages.push(`pair ${pair.id}: ${msg}`)
      }
    }

    await prisma.tradovateAccount.update({
      where: { id: account.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: result.errors === 0 ? 'ok' : `partial: ${result.errors} errors`,
        importedTradesCount: { increment: result.imported },
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    result.errors++
    result.errorMessages.push(msg)
    await prisma.tradovateAccount.update({
      where: { id: account.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: `error: ${msg.slice(0, 200)}`,
        lastErrorAt: new Date(),
        lastErrorMessage: msg.slice(0, 1000),
      },
    })
  }

  return result
}

/** Sync every active account in the system (used by the scheduled function). */
export async function syncAllAccounts(): Promise<Record<string, SyncResult>> {
  const accounts = await prisma.tradovateAccount.findMany({ where: { isActive: true } })
  const out: Record<string, SyncResult> = {}
  for (const acc of accounts) {
    try {
      out[acc.id] = await syncAccount(acc.id)
    } catch (err) {
      out[acc.id] = {
        imported: 0,
        skipped: 0,
        errors: 1,
        errorMessages: [err instanceof Error ? err.message : 'unknown error'],
      }
    }
  }
  return out
}

/** Helper for the connection form: validates creds and returns a short summary. */
export async function testAndStoreCredentials(input: {
  userId: string
  env: TradovateEnv
  username: string
  password: string
  cid: string
  secret: string
  appId?: string
  deviceId?: string
}): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  try {
    const auth = await requestAccessToken(input.env, {
      name: input.username,
      password: input.password,
      cid: input.cid,
      sec: input.secret,
      appId: input.appId || undefined,
      deviceId: input.deviceId || undefined,
    })
    if (!auth.accessToken) return { ok: false, error: 'No access token returned' }

    await prisma.tradovateAccount.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        env: input.env,
        usernameEnc: encrypt(input.username),
        passwordEnc: encrypt(input.password),
        cidEnc: encrypt(input.cid),
        secretEnc: encrypt(input.secret),
        appId: input.appId || null,
        deviceId: input.deviceId || null,
        accessToken: auth.accessToken,
        mdAccessToken: auth.mdAccessToken || null,
        tokenExpiresAt: auth.expirationTime ? new Date(auth.expirationTime) : null,
        isActive: true,
      },
      update: {
        env: input.env,
        usernameEnc: encrypt(input.username),
        passwordEnc: encrypt(input.password),
        cidEnc: encrypt(input.cid),
        secretEnc: encrypt(input.secret),
        appId: input.appId || null,
        deviceId: input.deviceId || null,
        accessToken: auth.accessToken,
        mdAccessToken: auth.mdAccessToken || null,
        tokenExpiresAt: auth.expirationTime ? new Date(auth.expirationTime) : null,
        isActive: true,
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    })

    return {
      ok: true,
      summary: `متصل كـ ${auth.name} — ${auth.hasLive ? 'حساب Live' : 'حساب Demo'}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return { ok: false, error: msg }
  }
}
