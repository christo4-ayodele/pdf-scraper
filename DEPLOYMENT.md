# Deployment Guide - PDF Scraper

This guide covers deploying the PDF Scraper application to Vercel with Supabase.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase account (free tier works)
- OpenAI API key

## Step-by-Step Deployment

### 1. Set Up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be created (takes ~1 minute)
3. Go to Settings → Database
4. Copy the "Connection string" under "Connection string" tab
5. Use the "URI" format (e.g., `postgresql://postgres.xxxx:xxxx@aws-0-us-east-1.pooler.supabase.com:5432/postgres`)

### 2. Create GitHub Repository

1. Initialize git (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub
3. Push your code:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

### 3. Set Up Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New" → "Import Project"
3. Select your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 4. Configure Environment Variables

In Vercel project settings → Environment Variables, add:

**Required:**
```
DATABASE_URL="your-supabase-connection-string"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
OPENAI_API_KEY="your-openai-api-key"
```

**Optional (for OAuth):**
```
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Optional (for Stripe):**
```
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_BASIC="price_..."
STRIPE_PRICE_PRO="price_..."
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4.1. (Optional) Set Up OAuth Providers

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: Your app name
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Authorization callback URL**: `https://your-app.vercel.app/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret**
6. Add them to your Vercel environment variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the consent screen (if not done):
   - User type: External
   - App name, email, etc.
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: Your app name
   - **Authorized redirect URIs**: `https://your-app.vercel.app/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**
8. Add them to your Vercel environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

**For local development**, use:
- GitHub: `http://localhost:3000/api/auth/callback/github`
- Google: `http://localhost:3000/api/auth/callback/google`

### 5. Run Database Migrations

After the first deployment, run migrations:

1. Go to your Vercel deployment
2. Or run locally:
   ```bash
   npx prisma migrate deploy
   ```

### 6. Configure Supabase Database

Run the Prisma schema in Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy the generated SQL from `prisma/migrations/` folder
4. Or run from terminal:
   ```bash
   DATABASE_URL="your-supabase-url" npx prisma migrate deploy
   ```

### 7. (Optional) Set Up Stripe

#### Create Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Products → Add Product
3. Create Basic Plan:
   - Name: "Basic Plan"
   - Price: $10
   - Billing: One time
   - Copy Price ID

4. Create Pro Plan:
   - Name: "Pro Plan"
   - Price: $20
   - Billing: One time
   - Copy Price ID

#### Configure Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events:
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret

Add these to Vercel environment variables.

## Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] Test sign-in functionality
- [ ] Test PDF upload
- [ ] Test credit deduction
- [ ] (Optional) Test Stripe checkout
- [ ] (Optional) Test Stripe webhooks

## Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL format
- Ensure Supabase project is running
- Check IP restrictions in Supabase

### "OpenAI API key invalid"
- Verify OPENAI_API_KEY is correct
- Check if you have API credits
- Ensure key has correct permissions

### "NEXTAUTH_SECRET missing"
- Generate a new secret with `openssl rand -base64 32`
- Add to Vercel environment variables
- Redeploy

### Upload fails with large files
- Vercel has 4.5MB limit on serverless functions
- Files larger than 4MB should use Supabase Storage (see README for implementation)

## Monitoring

### Vercel Logs
- Check deployment logs in Vercel dashboard
- Monitor function execution times
- Check for errors in real-time

### Supabase Logs
- Check Database → Logs for queries
- Monitor connection pool usage
- Review slow queries

### Application Logs
- OpenAI API responses
- PDF processing errors
- User activity

## Scaling Considerations

### For Production

1. **Database**: Upgrade Supabase plan for better performance
2. **Storage**: Implement Supabase Storage for PDF files
3. **Caching**: Add Redis for session management
4. **Rate Limiting**: Implement rate limiting on upload endpoint
5. **Queue System**: Use a job queue for long-running extractions
6. **Monitoring**: Add Sentry or similar for error tracking
7. **CDN**: Use Vercel Edge for static assets

### Cost Estimates

- **Vercel Hobby**: Free (suitable for development)
- **Supabase Free**: 500MB database, unlimited API requests
- **OpenAI**: ~$0.01-0.10 per extraction (GPT-4o)
- **Stripe**: 2.9% + $0.30 per transaction (only when using payments)

Total monthly cost for small usage: $0 (free tier) + OpenAI usage

## Success Criteria

Your deployment is successful when:
1. ✅ Users can sign in
2. ✅ Users can upload PDFs
3. ✅ Data extraction works correctly
4. ✅ Credits are deducted properly
5. ✅ History is displayed
6. ✅ (Optional) Stripe payments work
7. ✅ No critical errors in logs

## Support

For issues or questions:
- Check the [README.md](./README.md)
- Review Vercel logs
- Check Supabase dashboard
- Contact: umur@undetectable.ai or baris@undetectable.ai

