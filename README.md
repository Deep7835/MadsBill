# Madskraft Flex & Advertising — Quotation & Billing

Lightweight quotation and invoicing app for a printing business. Quote flex work
per square foot, print jobs per piece, convert quotations to invoices, and send a
branded A4 PDF over WhatsApp.

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind v4 · Radix/shadcn-style UI ·
Supabase (Postgres + Auth) · React Hook Form + Zod · jsPDF

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, in order:
   - [`supabase/schema.sql`](supabase/schema.sql) — tables, enums, triggers, RLS policies, the
     `MK-0001…` quote-number sequence.
   - [`supabase/seed.sql`](supabase/seed.sql) — company settings row and the 13 seed products.
3. Create your login under **Authentication → Users → Add user** (email + password,
   "Auto Confirm User" on). A `profiles` row is created automatically by trigger.

### Data model

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user (self-access only) |
| `customers` | Business name, contact, mobile, email, GSTIN, address |
| `products` | Rate card: `rate_type` = `sqft` \| `piece`, default rate, GST % |
| `quotations` | `quote_number` (auto), customer, dates, `status`, `payment_status`, totals |
| `quotation_items` | Line items with width/height/area or qty, rate, GST, amount |
| `settings` | Single row (`id = 1`) — company details printed on every PDF |

RLS is enabled on all six tables. This is a single-tenant back office: any
authenticated staff user can read and write the business data; `profiles` is
restricted to the owning user. Anonymous access is denied everywhere.

## 2. Local development

```bash
cp .env.example .env.local
```

Fill in the two values from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Until the env vars are set, every route shows a setup
screen instead of a stack trace.

## 3. Project structure

```
src/
├── app/
│   ├── (app)/                  # authenticated shell: sidebar + topbar
│   │   ├── dashboard/          # stat cards, recent quotations, quick actions
│   │   ├── customers/          # list + [id] history
│   │   ├── products/           # rate card
│   │   ├── quotations/         # list, new, [id] detail, [id]/edit
│   │   └── settings/           # company details used by the PDF
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── ui/                     # Button, Input, Select, Dialog, Table, …
│   ├── shared/                 # PageHeader, SearchInput, EmptyState, skeletons
│   ├── auth|customers|products|quotations|settings|dashboard|layout/
├── hooks/use-async-data.ts     # loading / error / refresh for every page
├── lib/
│   ├── supabase/               # browser, server and middleware clients
│   ├── validations/            # Zod schemas (form input → DB payload)
│   ├── calc.ts                 # area + amount + totals (pure, unit-testable)
│   ├── format.ts               # currency, dates, amount-in-words
│   ├── pdf/quotation-pdf.ts    # A4 document (jsPDF, lazy-loaded)
│   └── whatsapp.ts             # wa.me link + message builder
└── middleware.ts               # session refresh + route protection
```

## 4. How the numbers work

`src/lib/calc.ts` is the single source of truth, shared by the builder, the
on-screen preview and the PDF:

| Rate type | Inputs shown | Formula |
| --- | --- | --- |
| `sqft` | Width, Height, Qty, Rate | `area = W × H`, `amount = area × qty × rate` |
| `piece` | Qty, Rate | `amount = qty × rate` |

GST is per line item. Subtotal, GST and grand total are recomputed on save and
stored on the quotation, so a later rate-card change never rewrites history.

## 5. Documents

- **PDF** — A4 portrait: logo, company block, quote/invoice meta, bill-to, item
  table, totals, amount in words, notes, bank details, terms, signature block,
  page footer. Title flips between *QUOTATION* and *INVOICE* with `status`.
  Amounts print as `Rs.` because jsPDF's core fonts have no ₹ glyph.
- **Print** — generates the same PDF and opens the browser print dialog. Requires
  pop-ups to be allowed.
- **WhatsApp** — the share dialog pre-fills a message (editable) and opens
  `wa.me/<mobile>`. WhatsApp cannot attach a file from a link, so download the PDF
  first and attach it in the chat; the message carries a link back to the document.
- **Invoice conversion** — one click flips `status` to `invoice` and keeps the same
  number; payment status (`unpaid` / `partial` / `paid`) then becomes editable.

## 6. Deploy to Vercel

1. Push the repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repo. Framework preset
   **Next.js** is detected; no build overrides are needed.
3. Add both environment variables under **Settings → Environment Variables** for
   *Production*, *Preview* and *Development*:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |

   Both are `NEXT_PUBLIC_*` and safe to expose — RLS is what protects the data.
   Never add the `service_role` key.
4. Deploy, then in Supabase set **Authentication → URL Configuration → Site URL**
   to your Vercel domain.

```bash
npm run build   # verify locally first
```

## 7. Scripts

```bash
npm run dev     # dev server
npm run build   # production build (type-checks and lints)
npm run start   # serve the production build
npm run lint    # eslint
```
