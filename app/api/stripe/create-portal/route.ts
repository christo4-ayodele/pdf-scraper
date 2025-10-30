import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server-utils"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Create Stripe customer if they don't have one yet
    let customerId = user.stripeCustomerId
    
    if (!customerId) {
      console.log(`Creating Stripe customer for user ${user.id}`)
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

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXTAUTH_URL}/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error("Billing portal error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create billing portal session" },
      { status: 500 }
    )
  }
}

