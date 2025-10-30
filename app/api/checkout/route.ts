import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server-utils"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

const PRICES = {
  BASIC: process.env.STRIPE_PRICE_BASIC || "",
  PRO: process.env.STRIPE_PRICE_PRO || "",
}

const CREDITS = {
  BASIC: 10000,
  PRO: 20000,
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { plan } = await request.json()

    if (!plan || (plan !== "BASIC" && plan !== "PRO")) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      )
    }

    const priceId = PRICES[plan as keyof typeof PRICES]
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured" },
        { status: 500 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Handle upgrades: cancel existing subscription if upgrading
    if (user.planType === "BASIC" && plan === "PRO") {
      // For upgrade: cancel current subscription first
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId)
        } catch (error) {
          console.error("Error canceling existing subscription:", error)
        }
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/settings?success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/settings?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
        credits: CREDITS[plan as keyof typeof CREDITS].toString(),
        currentPlan: user.planType || "FREE",
        currentCredits: user.credits.toString(),
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
          credits: CREDITS[plan as keyof typeof CREDITS].toString(),
        },
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("session_id")
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      )
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    // Check if payment was successful
    if (session.payment_status === "paid" && session.mode === "subscription") {
      const userId = session.metadata?.userId
      const plan = session.metadata?.plan
      const credits = parseInt(session.metadata?.credits || "0")
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

      if (userId && plan && credits > 0) {
        // Check if user already has this plan to avoid duplicate credit additions
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (user && user.planType !== plan) {
          console.log(`[Checkout] Processing successful payment for user ${userId}, adding ${credits} credits`)
          
          try {
            await prisma.user.update({
              where: { id: userId },
              data: {
                credits: { increment: credits },
                planType: plan,
                stripeSubscriptionId: subscriptionId || null,
              },
            })
            console.log(`[Checkout] Successfully added ${credits} credits to user ${userId}`)
          } catch (error: any) {
            console.error(`[Checkout] Error updating user ${userId}:`, error.message)
          }
        } else if (user && user.planType === plan) {
          console.log(`[Checkout] User ${userId} already has ${plan} plan, skipping duplicate credit addition`)
        }
      }
    }

    return NextResponse.json({ 
      status: session.payment_status,
      success: session.payment_status === "paid"
    })
  } catch (error: any) {
    console.error("Checkout status error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check checkout status" },
      { status: 500 }
    )
  }
}

