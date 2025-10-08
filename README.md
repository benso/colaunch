# 🚀 CoLaunch - AI-Powered Partnership Matching Platform

CoLaunch is an intelligent platform that helps founders discover and forge strategic partnerships. Using AI-powered matching algorithms, semantic search, and automated outreach tools, CoLaunch makes finding the perfect business partner effortless.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## ✨ Features

### Core Functionality
- 🔐 **Authentication** - Email/password + Google OAuth via Supabase
- 🧭 **Smart Onboarding** - 5-step wizard with AI-powered profile analysis
- 🤖 **AI Matching** - Semantic search using OpenAI embeddings + Pinecone
- 📊 **Match Scoring** - Multi-factor algorithm (similarity, tags, audience, offers)
- 💬 **Smart Messaging** - AI-generated personalized outreach messages
- 📧 **Invitation System** - Email invites with referral tracking
- 📈 **Analytics** - PostHog integration for user behavior tracking

### User Experience
- ✅ Beautiful, responsive UI with Tailwind CSS v4
- ✅ Real-time updates with TanStack Query
- ✅ Smooth animations with Framer Motion
- ✅ Optimistic UI updates for instant feedback
- ✅ Dark mode support (system-based)

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with Server Components
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **Framer Motion** - Animations
- **TanStack Query** - Data fetching & caching
- **Radix UI** - Accessible component primitives

### Backend
- **Next.js API Routes** - Serverless functions
- **Supabase** - PostgreSQL database + Auth
- **OpenAI API** - GPT-4o-mini for AI features
- **Pinecone** - Vector database for semantic search
- **Resend** - Transactional email delivery

### DevOps
- **Vercel** - Hosting & deployment
- **PostHog** - Analytics
- **Zod** - Runtime validation

---

## 📦 Prerequisites

Before setting up CoLaunch locally, you'll need accounts and API keys for these services:

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **npm/pnpm/yarn** - Package manager
3. **Supabase Account** - [Sign up](https://supabase.com)
4. **OpenAI Account** - [Sign up](https://platform.openai.com/)
5. **Pinecone Account** - [Sign up](https://www.pinecone.io/)
6. **Resend Account** (optional) - [Sign up](https://resend.com/)
7. **PostHog Account** (optional) - [Sign up](https://posthog.com/)

---

## 🚀 Local Development Setup

Follow these steps to get CoLaunch running on your machine:

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/crossfeed.git
cd crossfeed
```

### Step 2: Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### Step 3: Set Up Supabase

1. **Create a new project** at [supabase.com](https://supabase.com)
2. **Copy your credentials** from Settings → API:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public key (starts with `eyJ...`)
3. **Set up the database**:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase/schema.sql`
   - Paste and run in SQL Editor
   - Verify tables appear in Table Editor
4. **Configure OAuth** (optional for Google sign-in):
   - Go to Authentication → Providers
   - Enable Google OAuth
   - Add your redirect URLs

### Step 4: Set Up Pinecone

1. **Create an index** at [pinecone.io](https://www.pinecone.io/):
   - Name: `colaunch-profiles` (or your choice)
   - Dimensions: **1536** (for OpenAI text-embedding-3-small)
   - Metric: **cosine**
   - Pod type: Starter (free tier) or as needed
2. **Copy your API key** from API Keys section

### Step 5: Set Up OpenAI

1. **Get API key** from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Ensure billing is enabled** (required for API access)
3. Models used:
   - `text-embedding-3-small` - Embeddings
   - `gpt-4o-mini` - AI analysis and message generation

### Step 6: Configure Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials** in `.env.local`:
   ```env
   # Supabase (Required)
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key

   # OpenAI (Required)
   OPENAI_API_KEY=sk-...

   # Pinecone (Required)
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=colaunch-profiles

   # Resend (Optional - for email invitations)
   RESEND_API_KEY=re_...

   # PostHog (Optional - for analytics)
   NEXT_PUBLIC_POSTHOG_KEY=phc_...
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

   # Cron (For Vercel deployment)
   CRON_SECRET=your_random_secret_key
   ```

### Step 7: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 📁 Project Structure

```
crossfeed/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (serverless functions)
│   │   ├── ai/              # AI-powered features
│   │   ├── matches/         # Match generation and management
│   │   ├── messages/        # Messaging system
│   │   ├── profile/         # Profile CRUD operations
│   │   └── invitations/     # Email invitations
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # User dashboard
│   ├── matches/             # Match feed and details
│   ├── onboarding/          # 5-step onboarding wizard
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── auth/               # Auth forms
│   ├── invitations/        # Invite panels
│   ├── matches/            # Match cards and feeds
│   ├── messaging/          # Conversation views
│   └── onboarding/         # Onboarding wizard
├── lib/                     # Shared utilities
│   ├── auth.ts             # Auth helpers
│   ├── matching.ts         # Match scoring algorithm
│   ├── openai.ts           # OpenAI client config
│   ├── pinecone.ts         # Pinecone client config
│   ├── supabase/           # Supabase clients
│   ├── utils.ts            # General utilities
│   └── validations.ts      # Zod schemas
├── types/                   # TypeScript types
│   └── database.ts         # Supabase database types
├── supabase/               # Database
│   └── schema.sql          # Database schema
├── .env.local              # Environment variables (create from .env.example)
├── .env.example            # Environment variables template
├── middleware.ts           # Auth middleware
└── package.json            # Dependencies
```

---

## 🔌 API Routes

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Sign in user
- `POST /api/auth/logout` - Sign out user
- `POST /api/auth/reset` - Request password reset

### Profile & AI
- `GET /api/profile` - Get current user's profile
- `PUT /api/profile` - Update profile
- `POST /api/ai/analyze-profile` - AI analysis of product description
- `POST /api/ai/generate-embedding` - Generate vector embedding

### Matches
- `GET /api/matches` - Get user's matches (with filters)
- `GET /api/matches/[id]` - Get specific match details
- `POST /api/matches/generate` - Generate new matches (rate-limited)
- `PUT /api/matches/[id]` - Update match status

### Messages
- `GET /api/messages?match_id=xxx` - Get messages for a match
- `POST /api/messages` - Send a message
- `POST /api/messages/generate` - Generate AI outreach message

### Invitations
- `GET /api/invitations` - Get user's sent invitations
- `POST /api/invitations` - Send email invitation

---

## 🗄 Database Schema

The database consists of 6 main tables:

- **users** - Core user information (extends Supabase Auth)
- **profiles** - Detailed product/partnership information
- **matches** - Partnership matches with scores
- **messages** - Messages between matched users
- **invitations** - Email invitations sent by users
- **partnerships** - Formalized partnership agreements

See `supabase/schema.sql` for complete schema with indexes and RLS policies.

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework Preset: Next.js (auto-detected)

3. **Add Environment Variables**:
   - Copy all variables from `.env.local`
   - Paste in Vercel → Settings → Environment Variables
   - Add for Production, Preview, and Development

4. **Configure Supabase**:
   - Add Vercel production URL to Supabase redirect URLs
   - Format: `https://your-domain.vercel.app/auth/callback`

5. **Deploy**:
   - Vercel will automatically deploy on push to main
   - Visit your deployment URL

### Set Up Cron Job (Daily Match Refresh)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/refresh-matches",
    "schedule": "0 10 * * *"
  }]
}
```

---

## 🐛 Troubleshooting

### "Failed to fetch" or API errors
- Verify all environment variables are set correctly
- Check browser console for specific error messages
- Ensure Supabase RLS policies are active

### OpenAI API errors
- Verify API key is valid and billing is enabled
- Check API usage limits at platform.openai.com
- Ensure you're using correct model names

### Pinecone errors
- Verify index dimensions match (1536 for text-embedding-3-small)
- Check that index name matches environment variable
- Ensure API key has proper permissions

### Database errors
- Verify schema was run successfully in Supabase
- Check that RLS policies allow the operation
- Review Supabase logs in dashboard

### Authentication issues
- Clear browser cookies and localStorage
- Verify redirect URLs in Supabase Auth settings
- Check middleware is properly configured

### Match generation not working
- Ensure at least 2 complete profiles exist
- Verify embeddings were generated (check profiles.embedding_id)
- Check rate limiting (5-minute cooldown between generations)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [OpenAI](https://openai.com/) - AI capabilities
- [Pinecone](https://www.pinecone.io/) - Vector database
- [Vercel](https://vercel.com/) - Hosting platform

---

## 📧 Support

For questions or issues, please:
1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/crossfeed/issues)
3. Open a new issue with detailed description

---

**Built with ❤️ for founders by founders**
