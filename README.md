# QuoteCompare — Insurance Quote Comparison Tool

AI-powered insurance quote comparison tool that extracts data from PDF quotes and generates professional side-by-side comparisons with recommendations.

## Tech Stack

- **Next.js 15** (App Router)
- **Convex** (real-time backend, file storage, serverless actions)
- **Clerk** (authentication)
- **Google Gemini 2.0 Flash** (PDF extraction + comparison generation)
- **Tailwind CSS + shadcn/ui** (professional, minimalistic styling)
- **@react-pdf/renderer** (PDF export)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Clerk

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Copy your publishable key and secret key

### 3. Set up Convex

1. Go to [convex.dev](https://convex.dev) and create an account
2. Run the following to create a new Convex project:

```bash
npx convex dev --once --configure=new
```

3. In the Convex dashboard, go to **Settings > Environment Variables** and add:
   - `CLERK_JWT_ISSUER_DOMAIN` — your Clerk JWT issuer URL (found in Clerk dashboard under JWT Templates; create a "Convex" template)
   - `GEMINI_API_KEY` — your Google AI API key from [aistudio.google.com](https://aistudio.google.com)

### 4. Configure environment variables

Create a `.env.local` file (see `.env.local.example`):

```
NEXT_PUBLIC_CONVEX_URL=<your convex deployment url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your clerk publishable key>
CLERK_SECRET_KEY=<your clerk secret key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 5. Run the development server

In one terminal, start Convex:

```bash
npx convex dev
```

In another terminal, start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Contacts Management** — Searchable contacts list, add/edit clients
- **Quote Upload** — Drag-and-drop PDF upload for insurance quotes
- **AI Extraction** — Gemini extracts structured data from each PDF
- **Side-by-Side Comparison** — Premium, cover, excess, conditions tables
- **Professional Recommendation** — AI-generated recommendation with compliance
- **Email Draft** — Copy-paste-ready client email with full comparison
- **PDF Export** — Downloadable PDF report
- **Real-time Updates** — Live processing status via Convex subscriptions

## Project Structure

```
├── app/
│   ├── (authenticated)/
│   │   ├── dashboard/          # Dashboard with stats + recent comparisons
│   │   ├── contacts/           # Contacts list + detail pages
│   │   └── comparison/         # New comparison + results pages
│   ├── sign-in/                # Clerk sign-in
│   ├── sign-up/                # Clerk sign-up
│   └── layout.tsx              # Root layout with providers
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── navbar.tsx              # Navigation bar
│   ├── providers.tsx           # Clerk + Convex providers
│   ├── comparison-result.tsx   # Full comparison renderer
│   ├── email-preview.tsx       # Email draft with copy button
│   ├── pdf-export.tsx          # PDF generation
│   ├── file-upload.tsx         # Drag-and-drop file upload
│   ├── contact-selector.tsx    # Searchable contact dropdown
│   ├── contact-card.tsx        # Contact list card
│   ├── comparison-card.tsx     # Comparison list card
│   └── add-contact-dialog.tsx  # New contact form dialog
├── convex/
│   ├── schema.ts               # Database schema
│   ├── contacts.ts             # Contact CRUD + search
│   ├── comparisons.ts          # Comparison CRUD
│   ├── documents.ts            # Document/file management
│   ├── processQuotes.ts        # Gemini AI processing action
│   └── auth.config.ts          # Clerk auth config for Convex
└── middleware.ts                # Clerk auth middleware
```
