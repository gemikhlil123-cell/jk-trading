import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia',
  })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error'
    console.error('Stripe webhook error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.customer && session.metadata?.userId) {
        await prisma.user.update({
          where: { id: session.metadata.userId },
          data: { stripeCustomerId: session.customer as string },
        })
      }
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status === 'active') {
        await prisma.user.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            subscriptionTier: 'PRO',
            stripeSubscriptionId: sub.id,
          },
        })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await prisma.user.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { subscriptionTier: 'BASIC', stripeSubscriptionId: null },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
