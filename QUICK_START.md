# Quick Start Guide - PDF Scraper

Get up and running in 10 minutes!

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Set Up Database

#### Option A: Local PostgreSQL
```bash
# Update DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/pdfscraper"
```

#### Option B: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string from Settings → Database
4. Update DATABASE_URL in .env

### 3. Configure Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
# Database
DATABASE_URL="your-database-url"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth Providers (Optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe (Test Mode Only - Optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLIC_KEY="pk_test_..."
NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_BASIC="price_..."
STRIPE_PRICE_PRO="price_..."
```

**Generate NEXTAUTH_SECRET:**
```bash
# Mac/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 4. Run Migrations
```bash
npx prisma migrate dev
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎯 First Steps

1. **Sign In**: Enter any email address
2. **Upload PDF**: Click or drag a PDF file (max 10MB)
3. **Wait**: Processing takes 10-30 seconds
4. **View**: See extracted data in the dashboard

## 📝 Test with Sample Data

Create a test resume PDF with:
- Name, email, phone number
- At least one work experience
- Education details
- Skills list
- Languages (optional)
- Awards/achievements (optional)

Upload it and verify the extraction!

## 🔐 Default Credits

New users receive **1,000 credits**:
- Each extraction costs 100 credits
- That's 10 free extractions per user

## ⚠️ Troubleshooting

### "Cannot find module 'pdf-parse'"
```bash
npm install pdf-parse --legacy-peer-deps
```

### "Prisma Client not generated"
```bash
npx prisma generate
```

### "Database connection failed"
- Check DATABASE_URL format
- Ensure database is running
- Try connection string in format:
  `postgresql://user:password@host:port/database`

### "OpenAI API error"
- Check OPENAI_API_KEY is correct
- Verify you have API credits
- Ensure key has access to GPT-4o

### TypeScript errors
```bash
npx tsc --noEmit
```

## 🌐 Deploying

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

## 📊 Architecture Overview

```
User → Upload PDF → Extract Text → OpenAI GPT-4o
  ↓                      ↓
Check Credits      Parse Text
  ↓                      ↓
Deduct Credits → Store in Database → Display Results
```

## 🎨 Customization

### Change Credit Costs
Edit `lib/server-utils.ts`:
```typescript
export async function checkCredits(userId: string, requiredCredits: number = 100) {
  // Change 100 to your desired amount
}
```

### Modify Extraction Prompt
Edit `lib/openai.ts`:
```typescript
const RESUME_EXTRACTION_PROMPT = `
  // Your custom prompt here
`
```

### Add New Subscription Plan
1. Create in Stripe Dashboard
2. Add to `app/api/checkout/route.ts`:
```typescript
const PRICES = {
  BASIC: "...",
  PRO: "...",
  NEW_PLAN: "..."
}
```

## 📚 Additional Resources

- [Full Documentation](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Project Summary](./PROJECT_SUMMARY.md)

## 💡 Tips

1. **Start Small**: Test with simple text-based PDFs first
2. **Check Logs**: Monitor console for errors
3. **Use Test Mode**: Stripe test mode for development
4. **Monitor Credits**: Keep track of user balances
5. **Backup Data**: Regular database backups recommended

## 🆘 Need Help?

- Check the [README](./README.md)
- Review [DEPLOYMENT.md](./DEPLOYMENT.md)
- Check console logs in browser
- Check terminal output for errors

**Contact**: umur@undetectable.ai or baris@undetectable.ai

Happy coding! 🚀

