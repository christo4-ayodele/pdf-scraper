# Stripe Subscription Setup Guide

This guide will help you configure Stripe for the subscription-based credit system.

## Prerequisites

- Stripe Test Mode account (free)
- Stripe Dashboard access

## Step 1: Create Stripe Test Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Make sure you're in **Test Mode** (toggle in the top right)
3. Create two products with recurring subscriptions:

### Basic Plan Product
- **Name**: Basic Plan
- **Description**: 10,000 credits per month
- **Pricing**: 
  - Type: Recurring
  - Price: $10.00 USD
  - Billing period: Monthly
- Copy the **Price ID** (starts with `price_...`)

### Pro Plan Product
- **Name**: Pro Plan
- **Description**: 20,000 credits per month
- **Pricing**:
  - Type: Recurring
  - Price: $20.00 USD
  - Billing period: Monthly
- Copy the **Price ID** (starts with `price_...`)

## Step 2: Get Stripe API Keys

1. Go to [Stripe API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

## Step 3: Set Up Webhook Endpoint

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. Set endpoint URL:
   - Local: `http://localhost:3000/api/webhooks/stripe`
   - Production: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

## Step 4: Configure Customer Billing Portal

1. Go to [Stripe Dashboard - Customer Portal Settings](https://dashboard.stripe.com/test/settings/billing/portal)
2. Click **"Activate test link"** or **"Configure"**
3. Configure the portal settings:
   - **Business information**: Add your business name and support email
   - **Allowed features**: Enable "Cancel subscriptions" and "Update payment methods"
   - **Cancellation options**: Choose "Immediately" or "At period end"
   - **Custom cancellation reasons**: Optional (you can add reasons like "Too expensive", "Not using enough", etc.)
4. Click **"Save"** to activate the portal

**Important**: The portal must be configured before users can access it!

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```bash
# Stripe (Test Mode Only)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLIC_KEY="pk_test_..."
NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_BASIC="price_..."
STRIPE_PRICE_PRO="price_..."
```

**Important Notes:**
- Use the **same** publishable key for both `STRIPE_PUBLIC_KEY` and `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`
- The `NEXT_PUBLIC_` prefix makes it available to client-side code
- All keys should start with `test_` for test mode
- Never commit your `.env` file to git

## Step 6: Test the Integration

### Test Credit System
1. Sign up for a new account (gets 1,000 free credits)
2. Upload a PDF (costs 100 credits)
3. Verify credits are deducted correctly

### Test Subscription Flow
1. Go to `/settings` page
2. Click "Subscribe to Basic Plan"
3. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
4. Complete checkout
5. Verify:
   - Plan updates to "BASIC"
   - Credits increase by 10,000
   - Success toast appears

### Test Upgrade Flow
1. Subscribe to Basic Plan first
2. Click "Upgrade to Pro Plan"
3. Complete checkout
4. Verify:
   - Plan updates to "PRO"
   - Credits increase by 20,000
   - Old subscription is cancelled

### Test Manage Billing
1. Subscribe to a plan (Basic or Pro)
2. Go to Settings page
3. Click "Manage Billing"
4. Verify:
   - Stripe billing portal opens
   - You can see subscription details
   - You can cancel your subscription
   - You can update payment methods

### Test Webhooks (Local Development)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the webhook signing secret from the CLI output
5. Update `STRIPE_WEBHOOK_SECRET` in your `.env`

## Credit System Logic

- **Default**: New users receive 1,000 free credits
- **Cost**: 100 credits per PDF extraction
- **Deduction**: Credits are deducted after successful extraction
- **Insufficient Credits**: User sees friendly message with upgrade link

## Subscription Plans

| Plan | Price | Credits | Scrapes |
|------|-------|---------|---------|
| Basic | $10/month | 10,000 | 100 |
| Pro | $20/month | 20,000 | 200 |

## Webhook Events

The system handles these Stripe webhook events:

1. **`invoice.paid`**: Activates subscription and adds credits
2. **`customer.subscription.updated`**: Handles plan changes and upgrades
3. **`customer.subscription.deleted`**: Deactivates plan, sets user to FREE
4. **`checkout.session.completed`**: Logs initial subscription creation

All webhook events are logged with `[Webhook]` prefix for debugging.

## Troubleshooting

### Webhooks Not Firing
- Verify webhook endpoint URL is correct
- Check webhook secret matches
- Ensure events are selected in Stripe Dashboard
- For local dev, use Stripe CLI to forward events

### Credits Not Added
- Check webhook logs in Stripe Dashboard
- Verify server logs for `[Webhook]` messages
- Ensure subscription metadata contains userId and plan

### Checkout Not Working
- Verify `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` is set
- Check browser console for errors
- Ensure price IDs are correct

## Security Notes

- **Test Mode Only**: Never use live keys in development
- **Webhook Verification**: All webhooks are verified using signature
- **Metadata**: User IDs stored in subscription metadata for webhook processing
- **Credits**: Only added via verified webhook events

## Production Deployment

Before going live:

1. Switch to Stripe Live Mode
2. Create live products and prices
3. Update all environment variables with live keys
4. Set up production webhook endpoint
5. Test thoroughly with real payment methods
6. Monitor webhook logs for issues

## Support

For Stripe-related issues:
- Check [Stripe Documentation](https://stripe.com/docs)
- Review webhook logs in Stripe Dashboard
- Check server logs for `[Webhook]` messages

