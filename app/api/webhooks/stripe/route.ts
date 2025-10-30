import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    console.log(`[Webhook] Received event: ${event.type} (id: ${event.id})`)
    
    switch (event.type) {
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case "checkout.session.completed":
        // Handle initial subscription creation
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === "subscription" && session.subscription) {
          console.log(`[Webhook] Checkout session completed for subscription ${session.subscription}`)
          await handleCheckoutCompleted(session)
        }
        break

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    console.log(`[Webhook] Successfully processed event ${event.type}`)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error(`[Webhook] Error processing event ${event.type}:`, error)
    return NextResponse.json(
      { error: "Webhook handler failed", message: error.message },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Processing checkout.session.completed for session ${session.id}`)
  
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan
  const credits = parseInt(session.metadata?.credits || "0")

  if (!userId || !plan || credits === 0) {
    console.error(`[Webhook] Missing userId, plan, or credits in checkout session ${session.id}`)
    return
  }

  // Check if user already has this plan to avoid duplicate credit additions
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user && user.planType === plan) {
    console.log(`[Webhook] User ${userId} already has ${plan} plan, skipping duplicate credit addition`)
    return
  }

  console.log(`[Webhook] Updating user ${userId} with plan ${plan} and ${credits} credits from checkout`)
  
  try {
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: credits },
        planType: plan,
        stripeSubscriptionId: subscriptionId || null,
      },
    })
    console.log(`[Webhook] Successfully added ${credits} credits to user ${userId}`)
  } catch (error: any) {
    console.error(`[Webhook] Error updating user ${userId}:`, error.message)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log(`[Webhook] Processing invoice.paid event for invoice ${invoice.id}`)
  
  if (!invoice.subscription) {
    console.log(`[Webhook] Invoice ${invoice.id} has no subscription, skipping`)
    return
  }

  const subscriptionId = typeof invoice.subscription === "string" 
    ? invoice.subscription 
    : invoice.subscription.id

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  // Get metadata from subscription or try to find from checkout session
  let userId = subscription.metadata?.userId || ""
  let plan = subscription.metadata?.plan || ""
  let credits = parseInt(subscription.metadata?.credits || "0")

  // Fallback: get from checkout session if subscription metadata is missing
  if (!userId) {
    const sessions = await stripe.checkout.sessions.list({
      subscription: subscription.id,
      limit: 1,
    })
    
    if (sessions.data.length > 0) {
      const checkoutSession = sessions.data[0]
      userId = checkoutSession.metadata?.userId || ""
      plan = checkoutSession.metadata?.plan || plan
      credits = parseInt(checkoutSession.metadata?.credits || "0")
    }
  }

  // If still no userId, get from customer
  if (!userId && subscription.customer) {
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    })

    if (user) {
      userId = user.id
      // For recurring payments, determine credits from plan type
      const currentPlan = user.planType || "FREE"
      if (currentPlan === "BASIC") {
        credits = 10000
        plan = "BASIC"
      } else if (currentPlan === "PRO") {
        credits = 20000
        plan = "PRO"
      }
    }
  }

  if (userId && credits > 0) {
    // Check if user already has this plan to avoid duplicate credit additions
    // The checkout.session.completed event already adds credits for initial subscription
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user && user.planType !== plan) {
      // Only add credits if this is a recurring payment (not initial subscription)
      console.log(`[Webhook] Processing recurring payment for user ${userId}, adding ${credits} credits`)
      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: { increment: credits },
          planType: plan,
          stripeSubscriptionId: subscription.id,
        },
      })
      console.log(`[Webhook] Successfully updated user ${userId}`)
    } else if (!user) {
      console.error(`[Webhook] User ${userId} not found in database`)
    } else {
      console.log(`[Webhook] Credits already added for initial subscription, skipping duplicate`)
    }
  } else {
    console.error(`[Webhook] Missing userId or credits for invoice ${invoice.id}`)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[Webhook] Processing customer.subscription.updated event for subscription ${subscription.id}`)
  
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!user) {
    console.error(`[Webhook] No user found for customer ${customerId}`)
    return
  }

  // Get plan from subscription metadata or price
  let plan = subscription.metadata?.plan || user.planType || "FREE"
  
  // Determine plan from price if not in metadata
  if (subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0].price.id
    if (priceId === process.env.STRIPE_PRICE_BASIC) {
      plan = "BASIC"
    } else if (priceId === process.env.STRIPE_PRICE_PRO) {
      plan = "PRO"
    }
  }

  // Handle plan changes and adjust credits if needed
  const currentPlan = user.planType || "FREE"
  let creditsToAdd = 0

  // If upgrading from BASIC to PRO, add the difference
  if (currentPlan === "BASIC" && plan === "PRO") {
    creditsToAdd = 20000 // Pro plan credits
    console.log(`[Webhook] User ${user.id} upgrading from BASIC to PRO, adding ${creditsToAdd} credits`)
  } else if (currentPlan === "FREE" && plan !== "FREE") {
    // New subscription
    creditsToAdd = plan === "BASIC" ? 10000 : 20000
    console.log(`[Webhook] User ${user.id} subscribing to ${plan}, adding ${creditsToAdd} credits`)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      planType: plan,
      stripeSubscriptionId: subscription.id,
      ...(creditsToAdd > 0 && { credits: { increment: creditsToAdd } }),
    },
  })

  console.log(`[Webhook] Successfully updated subscription for user ${user.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[Webhook] Processing customer.subscription.deleted event for subscription ${subscription.id}`)
  
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!user) {
    console.error(`[Webhook] No user found for customer ${customerId}`)
    return
  }

  console.log(`[Webhook] Deactivating subscription for user ${user.id}, setting plan to FREE`)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      planType: "FREE",
      stripeSubscriptionId: null,
    },
  })

  console.log(`[Webhook] Successfully deactivated subscription for user ${user.id}`)
}

