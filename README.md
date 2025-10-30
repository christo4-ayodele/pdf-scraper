# PDF Scraper - Resume Data Extraction App

A production-ready Next.js application that allows users to upload PDF resumes and extract structured data using OpenAI. Features authentication, credit-based system, and optional Stripe subscription integration.

## 🚀 Features

- **PDF Upload & Processing**: Upload PDF files up to 10MB and extract structured data
- **AI-Powered Extraction**: Uses OpenAI GPT-4 to extract detailed resume information
- **User Authentication**: Secure authentication with NextAuth
- **Credit System**: Track and manage user credits for each extraction
- **Dashboard**: View upload history and extracted data
- **Optional Stripe Integration**: Subscription plans for additional credits
- **Toast Notifications**: Real-time feedback for all user actions
- **Responsive Design**: Modern, clean UI built with TailwindCSS

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with database sessions
- **AI**: OpenAI GPT-4o for data extraction
- **UI**: React, TailwindCSS, React Hot Toast
- **Payment**: Stripe (optional)

### Database Schema

```prisma
model User {
  id              String
  email           String  @unique
  credits         Int     @default(1000)
  planType        String  @default("FREE")
  stripeCustomerId String?
  stripeSubscriptionId String?
  resumeHistory   ResumeHistory[]
}

model ResumeHistory {
  id          String
  userId      String
  fileName    String
  uploadedAt  DateTime
  resumeData  Json
}
```

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or Supabase)
- OpenAI API key
- (Optional) Stripe account for subscriptions

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pdf-scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: A random secret key (generate with `openssl rand -base64 32`)
   - `OPENAI_API_KEY`: Your OpenAI API key

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Run the development server**
```bash
npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### OpenAI Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com)
2. Add `OPENAI_API_KEY` to your `.env` file
3. The app uses GPT-4o for optimal extraction quality

### Stripe Integration (Optional)

To enable the subscription system:

1. Create a Stripe account and get your API keys
2. Create products and prices in Stripe Dashboard:
   - Basic Plan: $10, 10,000 credits
   - Pro Plan: $20, 20,000 credits
3. Set up webhooks at `https://your-domain.com/api/webhooks/stripe`
4. Add all Stripe variables to `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLIC_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_BASIC`
   - `STRIPE_PRICE_PRO`

## 📄 Large File Handling

Vercel serverless functions have a 4.5MB payload limit. For files larger than 4MB:

**Current Implementation**: The app accepts files up to 10MB using server actions and direct buffer processing. For production use with larger files:

1. Use Supabase Storage for file uploads
2. Process files asynchronously with a background job
3. Stream file contents in chunks

**Recommended Approach** (not implemented):
```typescript
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('resumes')
  .upload(fileName, file, { contentType: 'application/pdf' })

// Process asynchronously
await processResumeFromStorage(storagePath)
```

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy!

### Deploy to Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Run migrations in Supabase SQL editor:
   ```bash
   npx prisma migrate deploy
   ```
3. Get your connection string from Supabase settings
4. Update `DATABASE_URL` in Vercel

## 📊 API Endpoints

- `POST /api/upload` - Upload and process PDF
- `GET /api/resumes` - Get user's resume history
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhooks
- `POST /api/stripe/create-portal` - Create billing portal session

## 🎯 Usage

1. **Sign in** with your email address
2. **Upload a PDF** resume (max 10MB)
3. **Wait for processing** - extraction takes 10-30 seconds
4. **View results** in the dashboard
5. **Manage credits** and subscribe from Settings page

### Credit System

- Each PDF extraction costs **100 credits**
- New users receive **1,000 credits** (10 free extractions)
- Upgrade plans for more credits:
  - **Basic**: $10 for 10,000 credits (100 extractions)
  - **Pro**: $20 for 20,000 credits (200 extractions)

## 🧪 Testing

### Test PDF Extraction

1. Create a test PDF resume with the following information:
   - Name, email, phone
   - Work experience
   - Education
   - Skills
2. Upload it through the app
3. Verify extracted data matches the PDF content

### Test Credit System

1. Sign in with a test email
2. Upload a PDF (should succeed with initial 1000 credits)
3. Check credit balance decreases by 100
4. Try uploading more than you have credits for (should show error)

### Test Stripe (Optional)

1. Use Stripe test mode credentials
2. Create a checkout session
3. Complete test payment
4. Verify credits are added to account
5. Check subscription status in database

## 📝 License

This project is created as a technical assignment.

## 👨‍💻 Author

Built with Next.js, OpenAI, and modern web technologies.

## 📧 Contact

For questions or API keys:
- umur@undetectable.ai
- baris@undetectable.ai
