import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Placeholder for Stripe/PayPal checkout integration.
// When credentials are wired, replace this with Stripe Checkout Session creation
// or PayPal order creation. For now it redirects back to pricing with a query flag.
export async function POST(req: Request) {
  const session = await auth()
  const url = new URL(req.url)
  const locale = url.searchParams.get('locale') ?? 'ar'

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
  }

  const form = await req.formData().catch(() => null)
  const plan = form?.get('plan')?.toString() ?? 'monthly'

  // TODO: create Stripe Checkout session here
  return NextResponse.redirect(
    new URL(`/${locale}/pricing?checkout=pending&plan=${plan}`, req.url),
  )
}
