# Craft2Market AI - Quick Start Guide

## ✅ Project Status: READY TO RUN

All requirements from the specification have been implemented and tested.

---

## 🚀 Start the Application (2 Commands)

### Terminal 1 - Backend API
```bash
cd backend
npm run dev
```
**Output:** `Server running on http://localhost:3001`

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
**Output:** `Local: http://localhost:5173`

---

## 🎯 5-Minute Demo Flow

1. **Visit** http://localhost:5173
2. **Click** "Get Started" → Language selection page
3. **Hover** over languages to hear audio
4. **Toggle** accessibility mode (larger text)
5. **Select** any language
6. **Click** 🎨 "Login as Artisan" (quick login)
7. **View** dashboard with sample products
8. **Click** "Create New Product"
9. **Upload** any image → Click "AI Enhance Image"
10. **Type or speak** product description
11. **Click** "Generate AI Catalog" → Review the bilingual listing (Hindi + English)
12. **Enter** costs → "Calculate Suggested Prices"
13. **Click** "Save Draft" (stays private) or "Publish Product" (goes live immediately)
14. **View** product detail → Export JSON/CSV → Download QR code
15. **Logout** → Click 🛍️ "Login as Buyer"
16. **Search** the marketplace or filter by category, price range and location → open a product → "Send Enquiry"
17. **Logout** → Click 🎨 "Login as Artisan" → the new enquiry is on the dashboard

✅ **Complete demo in under 5 minutes!**

---

## 🔑 Demo Accounts

Click the emoji buttons on login page for instant access:

| Button | Email | Role | Access |
|--------|-------|------|--------|
| 🎨 | artisan@demo.com | Artisan | Create products, pricing, dashboard |
| 🛍️ | buyer@demo.com | Buyer | Browse, search, send enquiries |
| 👤 | admin@demo.com | Admin | Approve products, analytics |

**Password for all:** `demo123`

---

## 📋 Implemented Features Checklist

### Onboarding & Accessibility
- ✅ Language selection (6 Indian languages)
- ✅ Voice guidance (text-to-speech)
- ✅ Accessibility mode (2x larger text)
- ✅ Large touch targets
- ✅ Icon-based navigation
- ✅ High contrast UI

### Product Creation
- ✅ Image upload (drag & drop)
- ✅ AI Image Studio (enhancement)
- ✅ Voice input (Web Speech API)
- ✅ AI catalog generation
- ✅ Bilingual descriptions (Hindi + English)
- ✅ Category & material detection

### Pricing
- ✅ Cost input (material, labour, packaging)
- ✅ Fair pricing calculation
- ✅ 3 pricing tiers (min/suggested/premium)
- ✅ Transparent formula
- ✅ Never below cost floor

### Listing & Sharing
- ✅ Product preview card
- ✅ Save Draft (private) / Publish Product (live) workflow
- ✅ Status badges: Draft / Pending / Approved / Rejected
- ✅ Export as JSON
- ✅ Export as CSV (absolute image URLs)
- ✅ QR code generation
- ✅ Share link

### Marketplace
- ✅ Product search across title, description and keywords
- ✅ Category, price-range and artisan-location filters (server-side)
- ✅ Product detail pages with bilingual description
- ✅ Send enquiries to artisans
- ✅ 6 realistic sample products

### Dashboard
- ✅ Product statistics (`published · draft/pending` breakdown)
- ✅ Draft and published counts
- ✅ Total inventory value
- ✅ Recent listings grid with status badges
- ✅ Enquiry management

### Technical
- ✅ Demo mode indicator (always visible)
- ✅ Mobile-responsive design
- ✅ Loading/error/success states
- ✅ Service abstractions for AI
- ✅ Mock implementations (no API keys needed)
- ✅ Production-ready architecture

---

## 📁 Sample Products Included

1. **Handwoven Silk Saree** - Banarasi with gold zari work (₹7,150)
2. **Terracotta Vase** - Hand-painted traditional designs (₹858)
3. **Bamboo Basket Set** - Eco-friendly storage (₹1,040)
4. **Brass Diya Set** - Traditional oil lamps (₹780)
5. **Organic Cotton Bedsheet** - Handloom block print (₹1,105)
6. **Wooden Jewelry Box** - Hand-carved sheesham wood (₹1,105)

All with Hindi descriptions and realistic pricing!

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite + Prisma ORM
- **AI**: Mock services (ready for Claude API integration)
- **Voice**: Browser Web Speech API
- **Images**: Canvas API enhancement

---

## ✨ Beyond Requirements

- **Quick login buttons** - Faster demo experience
- **QR code preview** - Shareable product links
- **JSON/CSV export** - Data portability
- **Demo mode badge** - Always visible reminder
- **Voice guidance** - Audio for each language
- **6 diverse products** - Realistic artisan catalog

---

## 📝 Known Limitations

1. Voice input requires Chrome/Edge
2. Image enhancement uses Canvas in the browser (the API endpoint is an integration point)
3. Pricing is an estimate only
4. Authentication is demo-only
5. No payment integration
6. QR code is a simulated pattern (use the `qrcode.react` package in production)
7. Hindi copy comes from a template dictionary — connect Bhashini/an LLM for fluent translation
8. `Publish Product` publishes immediately; admins can still reject from the dashboard

---

## 🔗 Production Integrations

When deploying to production, integrate:

- **AI**: Anthropic Claude API for catalog generation
- **Images**: Cloudinary or Remove.bg for enhancement
- **Translation**: Bhashini API for Indian languages
- **Marketplace**: ONDC for nationwide reach
- **Payment**: Razorpay for Indian payments
- **Storage**: AWS S3 for images
- **Auth**: OAuth 2.0 with 2FA

---

## 📊 Build Status (verified locally)

| Check | Command | Result |
|-------|---------|--------|
| Backend types | `cd backend && npx tsc --noEmit` | ✅ exit 0 |
| Backend tests | `cd backend && npm test` | ✅ 36/36 passing (2 files) |
| Backend build | `cd backend && npm run build` | ✅ exit 0 (ESM output runs with `npm start`) |
| Frontend types | `cd frontend && npx tsc --noEmit` | ✅ exit 0 |
| Frontend tests | `cd frontend && npm test` | ✅ 12/12 passing |
| Frontend build | `cd frontend && npm run build` | ✅ 333.07 kB JS + 26.51 kB CSS (100.5 kB / 4.9 kB gzipped) |
| Database | `cd backend && npm run db:seed` | ✅ 6 products, idempotent on re-run |

---

## 🎉 Ready for SIH 2026!

This is a **complete, functional prototype** demonstrating:
- AI-powered cataloging (deterministic, from the artisan's own words)
- Fair pricing transparency
- Multi-language support (Hindi + English listings)
- Accessibility for low-literacy users
- Direct artisan-buyer marketplace

**Start the servers and demo in 5 minutes!** 🚀

---

Built for **SIH 2026 Problem Statement SIH26090**  
*Empowering Marginalized Artisans with AI*
