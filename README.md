# Craft2Market AI

**AI-Driven Market Linkage and Smart Cataloging Mobile Application for Marginalized Artisans**

Built for SIH 2026 Problem Statement SIH26090

## Overview

Craft2Market AI helps marginalized artisans create professional product listings from photos and voice/text descriptions, receive transparent pricing suggestions, and share catalogs with buyers.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone and install dependencies
cd Craft2Market-ai

# Install backend dependencies
cd backend
npm install
cp .env.example .env

# Install frontend dependencies
cd ../frontend
npm install
```

### Run the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Artisan | artisan@demo.com | demo123 |
| Buyer | buyer@demo.com | demo123 |
| Admin | admin@demo.com | demo123 |

## Environment Variables

### Backend (.env)

```env
PORT=3001
JWT_SECRET=Craft2Market-demo-secret-key-2026
DATABASE_URL=file:./dev.db

# AI Integration (optional)
AI_API_KEY=

# If AI_API_KEY is not set, local deterministic fallbacks are used
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001
```

## Architecture

```
Craft2Market-ai/
├── frontend/                     # React 18 + Vite + TypeScript + Tailwind
│   ├── public/
│   │   └── placeholder.svg       # Bundled fallback image for photo-less listings
│   └── src/
│       ├── components/           # Navbar, Layout, ProductCard, QRCodePreview, ExportListing…
│       ├── lib/
│       │   ├── api.ts            # axios client, typed API modules (auth/products/enquiries/users/admin/ai)
│       │   ├── store.ts          # zustand auth store (token persistence)
│       │   ├── utils.ts          # currency/date formatting, image URL helpers, cn()
│       │   └── constants.ts      # languages, categories, materials, statuses
│       └── pages/                # 14 routes (landing, welcome, dashboard, create-product, marketplace…)
├── backend/                      # Express + TypeScript (ESM)
│   ├── prisma/
│   │   ├── schema.prisma         # User / Product / Enquiry models
│   │   └── dev.db                # SQLite database (seeded demo data)
│   ├── src/
│   │   ├── index.ts              # App entry point, /api index route, error mapping
│   │   ├── seed.ts               # Idempotent demo data seeder
│   │   ├── lib/
│   │   │   ├── prisma.ts         # Shared PrismaClient
│   │   │   └── aiService.ts      # Deterministic catalog, pricing and image services
│   │   ├── middleware/auth.ts    # authenticate / requireRole / optionalAuth
│   │   └── routes/               # auth, products, enquiries, users, admin, ai
│   ├── vitest.config.ts
│   └── uploads/                  # Uploaded product images
├── README.md
├── QUICK_START.md
├── IMPLEMENTATION.md
├── COMPLETE_REPORT.md
└── FIXES.md                      # Change log of the bug-fix pass
```

## Features

### Artisan Features
- Multi-language support (English, Hindi, Tamil, Telugu, Bengali, Marathi)
- Voice & text input for product descriptions
- AI Image Studio for product photo enhancement
- Auto-generated catalog listings
- Dynamic pricing assistant
- Public catalog sharing

### Buyer Features
- Browse artisan products
- Search and filter by category, craft, location, price
- Send enquiries to artisans
- View artisan profiles

### Admin Features
- Approve/reject artisans and products
- View analytics dashboard

## AI Functionality

### Image Studio
- Background removal simulation
- Brightness/contrast enhancement
- Centered product presentation
- Local browser-based processing (no API required)

### Multilingual Auto-Cataloger
- Generates title, descriptions, keywords from voice/text
- Translates to Hindi and English
- Local deterministic fallback when no AI API key

### Pricing Assistant
- Transparent formula-based calculation
- Suggested minimum, market, and premium prices
- Profit margin estimates
- Adjustable parameters

## Demo Flow

1. Login as artisan (artisan@demo.com / demo123)
2. Select preferred language
3. Upload a product image
4. Enter or speak product description
5. Generate AI-powered catalog listing
6. Review and edit generated content
7. View pricing suggestions
8. Publish product
9. Switch to buyer account
10. Browse marketplace and send enquiry

## Testing

Both packages use [Vitest](https://vitest.dev). Tests run entirely offline — no database, no API keys.

```bash
# Backend: 36 tests
cd backend
npm test          # vitest run  (watch mode: npm run test:watch)

# Frontend: 12 tests
cd frontend
npm test
```

What is covered:

| Suite | File | Focus |
|-------|------|-------|
| Catalog generation | `backend/src/lib/aiService.test.ts` | Category/material/craft detection, deterministic output, real Devanagari Hindi, artisan wording preserved |
| Fair pricing | `backend/src/lib/aiService.test.ts` | Tier maths, 15% cost floor, zero-packaging handling, FormData string inputs, tier ordering |
| Auth guards | `backend/src/middleware/auth.test.ts` | 401 without/with a bad token, 403 for a wrong role, `optionalAuth` falling through anonymously |
| Client helpers | `frontend/src/lib/utils.test.ts` | Image URL resolution, placeholder fallback (incl. the asset existing on disk), currency/date/relative-time formatting |

## Known Limitations

- Voice input requires browser support (Chrome/Edge recommended)
- Image enhancement uses the browser Canvas API (not professional AI); the `/api/ai/image-enhance` endpoint is an integration point that returns the image unchanged
- Pricing is an estimate, not guaranteed market pricing
- Authentication is demo-only (not production-ready)
- No payment integration
- No real-time notifications
- QR codes are a deterministic simulated pattern — swap in `qrcode.react` for scannable codes
- Hindi copy is generated from a template dictionary; connect Bhashini or an LLM for fluent translation
- `Publish Product` sets the listing live immediately (no moderation queue) so the demo flow works end to end

## API Endpoints

Interactive index of everything below: `GET http://localhost:3001/api`

### Auth
- `POST /api/auth/register` - Register (artisan or buyer)
- `POST /api/auth/login` - Login, returns a 7-day JWT

### Products
- `GET /api/products` - Public catalogue (APPROVED only). Filters: `category`, `craftType`, `location`, `minPrice`, `maxPrice`, `search`
- `GET /api/products/mine` - Signed-in artisan's own listings, drafts included 🔒
- `GET /api/products/:id` - Product detail (drafts/pending visible to owner + admin only)
- `POST /api/products` - Create listing, multipart `image` upload, `status` = `DRAFT` | `APPROVED` | `PENDING` 🔒
- `PUT /api/products/:id` - Update own listing 🔒
- `DELETE /api/products/:id` - Delete own listing 🔒

### Enquiries
- `GET /api/enquiries` - Role-scoped: artisans see enquiries for their products, buyers see their own 🔒
- `POST /api/enquiries` - Create enquiry (buyers only, approved products only) 🔒
- `PATCH /api/enquiries/:id` - Update enquiry status (owning artisan or admin) 🔒

### Users
- `GET /api/users/me` - Profile + role-specific stats 🔒
- `PUT /api/users/me` - Update profile 🔒
- `PUT /api/users/password` - Change password 🔒
- `GET /api/users/artisan/:id` - Public artisan profile + approved products

### Admin
- `GET /api/admin/stats` - Dashboard statistics 🔒 (admin)
- `GET /api/admin/users` - List users 🔒 (admin)
- `PATCH /api/admin/users/:id/approve` - Approve/unapprove an artisan 🔒 (admin)
- `GET /api/admin/products` - All products incl. drafts/pending 🔒 (admin)
- `PATCH /api/admin/products/:id/status` - Approve/reject/restore a product 🔒 (admin)

### AI
- `POST /api/ai/generate-catalog` - Bilingual listing from a description 🔒
- `POST /api/ai/calculate-pricing` - Three-tier fair pricing from costs 🔒
- `POST /api/ai/image-enhance` - Enhancement integration point (see note in `aiService.ts`) 🔒
- `POST /api/ai/transcribe` - Speech-to-text integration point 🔒

🔒 = requires `Authorization: Bearer <token>`

## Listing statuses

| Status | Meaning |
|--------|---------|
| `DRAFT` | Saved privately by the artisan (`Save Draft`) |
| `APPROVED` | Published and visible in the buyer marketplace (`Publish Product`) |
| `PENDING` | Submitted for moderation (default for the API when no status is sent) |
| `REJECTED` | Declined by an admin; stays out of the marketplace |

Publishing from the app sets `APPROVED` directly so the end-to-end demo works without an
approval step; admins can still move any listing to `PENDING`/`REJECTED` from the dashboard.

## Known Limitations

- Voice input requires browser support (Chrome/Edge recommended)
- Image enhancement uses browser Canvas API (not professional AI)
- Pricing is an estimate, not guaranteed market pricing
- Authentication is demo-only (not production-ready)
- No payment integration
- No real-time notifications

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with Prisma ORM
- **Storage**: Local filesystem (uploads directory)

## License

MIT - For SIH 2026 Hackathon prototype
