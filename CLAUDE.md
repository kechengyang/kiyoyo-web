# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KIYOYO is a bilingual (EN/ZH) tea & lifestyle commerce platform for 6 stores in Nairobi, Kenya. It has a customer-facing storefront and an admin operations panel, both served from the same Next.js static export deployed to Firebase Hosting. The backend is a Fastify API on Cloud Run with Cloud SQL PostgreSQL and Cloud Storage for product images.

- **Customer + Admin**: https://kiyoyo-dev.web.app
- **API**: Cloud Run `kiyoyo-dev-api`
- **Database**: Cloud SQL PostgreSQL `kiyoyo-dev-db`
- **Media**: Cloud Storage `gs://kiyoyo-dev-media`
- **Currency**: KES · **Timezone**: Africa/Nairobi

## Repository Layout

```
web/           Next.js static-export app (customer storefront + admin)
  app/           App Router pages, shared types, platform layer, catalog hook
    components/    Customer-facing views and dialogs, organized by domain
    admin/         Admin views and dialogs, organized by domain
  db/            Drizzle ORM schema (local dev only, not used in production)
  tests/         Node test runner SSR smoke tests (*.test.mjs)
api/           Fastify Cloud Run API
  src/           Route handlers, auth middleware, DB queries, config
  migrations/    SQL migration files
  test/          API tests
docs/          Architecture, data model, API design, deployment, security docs
infra/terraform/ GCP resource definitions (kiyoyo-dev)
scripts/       Deployment and utility scripts
```

## Commands

All commands run from `web/` unless noted.

```bash
# Development (runs on localhost:3000; customer at /, admin at /admin)
cd web && npm run dev

# Lint
cd web && npm run lint

# Type check (no emit)
cd web && npm run check

# Full verify (lint + typecheck + test + build)
cd web && npm run verify

# Build for Firebase Hosting (outputs to web/out/)
cd web && npm run build

# Build preview only (local vinext preview, NOT for Firebase)
cd web && npm run build:preview

# Run SSR smoke tests (builds preview first)
cd web && npm test

# Drizzle schema generation (local dev only)
cd web && npm run db:generate

# API development
cd api && npm run dev

# API build, migrate, seed
cd api && npm run build
cd api && npm run migrate
cd api && npm run seed

# API tests
cd api && npm test
```

## Architecture

### Frontend (web/)

A Next.js App Router app configured with `output: "export"` for static hosting. Uses `vinext` (Vite + Next.js integration) as the dev server and build tool, with Cloudflare's Vite plugin for local D1/R2 bindings (Codex platform compatibility). The production build produces static HTML/JS/CSS in `web/out/`.

**Two entry points, one codebase:**
- `/` → `KiyoyoApp` (customer storefront: home, shop, saved, cart, account)
- `/admin` → `AdminApp` (operations: overview, orders, products, coupons, redeem, customers, stores)

**State management:** No global state library. `KiyoyoApp` and `AdminApp` are thick parent components that own all state via `useState` + `useStoredState` (a custom hook that syncs state to `localStorage`). State and callbacks are passed down as props to view/dialog components. Catalog data uses `useCatalog()` / `useProductTags()` hooks that hydrate from localStorage first, then fetch from the API.

**Data flow:**
- `web/app/types.ts` — shared domain types (`Product`, `Order`, `CartItem`, `Coupon`, `Store`, `Address`, `UserProfile`, etc.)
- `web/app/platform.ts` — Firebase Auth initialization, `apiFetch()` wrapper (attaches Firebase ID token as Bearer), API type mappings (snake_case API → camelCase app types), and all API call functions
- `web/app/catalog.ts` — `useCatalog()` and `useProductTags()` hooks with localStorage persistence and cross-tab sync
- `web/app/data.ts` — static seed data (stores, goods products, utility functions) used as offline fallback
- `web/app/menu.ts` — drink menu product definitions and category ordering (the "menu" data)
- `web/app/components/customer/core/copy.ts` — all bilingual UI strings keyed by `{en, zh}`

**Domain organization** (post-refactor):
- `customer/home/` — HomeView with campaigns, trending
- `customer/shop/` — ShopView, ProductDialog (drink customization)
- `customer/cart/` — CartView, CheckoutDialog
- `customer/account/` — AccountView, AuthDialog, ProfileDialog, AddressDialog
- `customer/orders/` — OrderDetailDialog, OrderSuccessDialog, OrderAddressDialog
- `customer/saved/` — SavedView (collections)
- `customer/fulfillment/` — StoreDialog (store selection)
- `customer/shell/` — Navigation (header, desktop, mobile), GlobalSearchDialog
- `customer/shared/` — Shared primitives, DialogBackdrop
- `customer/core/` — Foundation utilities (categorySlug, drinkCategoryAnchor, etc.), useStoredState, copy
- `admin/overview/`, `admin/orders/`, `admin/products/`, `admin/coupons/`, `admin/redeem/`, `admin/customers/`, `admin/stores/` — admin views + editor dialogs
- `admin/shell/` — AdminSidebar, AdminTopbar
- `admin/core/` — Admin-specific types and foundation utilities
- `admin/shared/` — Shared admin primitives

### Backend (api/)

Fastify server with modular route groups. Uses raw SQL via `pg` (no ORM in production — Drizzle in `web/db/` is for local dev only).

**Key modules in `api/src/`:**
- `server.ts` — all route handlers (single file, modular by route prefix)
- `auth.ts` — `authenticate` (Firebase token verification), `requireAdmin`, `requireProfile` middleware
- `db.ts` — PostgreSQL connection pool
- `config.ts` — environment config (port, project ID, CORS origins, media bucket)
- `crypto.ts` — pickup token creation/verification (HMAC-SHA256 signed tokens)
- `coupons.ts` — `calculateCouponDiscount()` logic (percent, fixed, free-size-upgrade)
- `migrate.ts` / `seed.ts` — database migration and seeding

**API route groups:**
- `GET /healthz`, `/health`, `/readyz` — health checks
- `GET /v1/app-config` — public config (currency, payment provider, timezone)
- `GET /v1/stores`, `/v1/products`, `/v1/search`, `/v1/media/:key` — public catalog
- `POST /v1/auth/bootstrap` — user upsert on login
- `/v1/me`, `/v1/me/addresses`, `/v1/me/favorites`, `/v1/me/coupons`, `/v1/me/orders` — customer profile
- `POST /v1/checkouts` — order creation with idempotency key, coupon validation, inventory check
- `POST /v1/me/orders/:id/pickup-token` — reissue pickup QR
- `/v1/admin/*` — admin CRUD for products, tags, coupons, orders, customers, stores, fulfillments, pickups

All write operations use database transactions with `FOR UPDATE` row locking. Idempotency keys prevent duplicate orders. Optimistic concurrency via `catalog_version` / coupon `version` fields.

### Authentication

Firebase Authentication (Identity Platform) with email/password, Google, and Facebook providers. The web app uses the Firebase JS SDK for client-side auth; the API verifies Firebase ID tokens server-side. Admin access is gated by the `requireAdmin` middleware which checks the user's role in the database.

### Key Design Decisions

- **Modular monolith**: Single Cloud Run service with domain-separated route groups — not microservices
- **Static export**: Next.js `output: "export"` means no SSR at runtime; all pages are pre-rendered at build time
- **Payment**: MOCK provider only (`test_ok`, `test_declined`, `test_timeout` tokens). Real payment adapter not yet implemented
- **Pickup QR**: HMAC-SHA256 signed tokens with 24-hour expiry. QR reissue invalidates old tokens. Redemption is atomic with `FOR UPDATE`
- **Catalog offline-first**: Products cached in localStorage; API fetch updates in background. Seed data serves as offline fallback
- **Refactor baseline**: `57a555e` is the pre-refactor checkpoint. Behavior contracts are documented in `docs/09-refactor-roadmap.md`

### Refactoring Constraints (from docs/09-refactor-roadmap.md)

- Structural changes and behavior fixes must be separate commits
- Never change component ownership, API format, and business rules simultaneously
- Do not remove mock payment until real payment adapter exists
- Do not remove local order cache until pickup QR has equivalent persistence
- Do not remove seed data until a shared/generated catalog source exists
- Each phase must independently build, verify, and be rollback-able
- Existing `/v1` paths and request/response formats must remain stable during structural refactoring
- Customer-facing text must always exist in both English and Chinese
