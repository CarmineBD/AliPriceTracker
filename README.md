# AliTracker

AliTracker is a personal MVP application for managing products, purchases, stock, product combos,
sales, real costs, and profit. FIFO stock allocation will be added in a later phase.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, and Vitest.
- Backend: Node.js, Express, TypeScript, Zod, Drizzle ORM, and Vitest.
- Database: PostgreSQL on Railway.
- Deployment: Vercel for the frontend and Railway for the API and PostgreSQL.

## Architecture

This is one pnpm monorepo:

```text
apps/
  web/       React frontend
  api/       Express REST API
packages/
  shared/    only schemas, types, and constants that are truly shared
```

The API is organized as `route -> controller -> service -> repository -> database` as modules are
introduced. The current scaffold only exposes `GET /api/health`.

## Requirements

- Node.js 22
- pnpm 9 or newer

## Installation

```bash
pnpm install
```

## Environment variables

Copy the examples before development:

```bash
copy apps\\api\\.env.example apps\\api\\.env
copy apps\\web\\.env.example apps\\web\\.env
```

`apps/api/.env`:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/alitracker
CORS_ORIGIN=http://localhost:5173
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=your-r2-bucket-name
R2_PUBLIC_URL=https://media.example.com
ALIEXPRESS_COOKIE=full-Cookie-header-copied-from-an-authenticated-Chrome-MTop-request
ALIEXPRESS_SESSION_ENCRYPTION_KEY=a-long-random-secret-created-by-you
DEBUG_API_KEY=a-long-random-secret
```

`apps/web/.env`:

```dotenv
VITE_API_URL=http://localhost:3000
```

`DATABASE_URL` is optional until a database-backed feature is introduced, but is required for
Drizzle migration commands. Do not commit real `.env` files.

R2 is required by the API. `R2_PUBLIC_URL` must be the public bucket domain (custom domain or R2
development URL) without an object key. The API stores object keys only, and `getPublicUrl(key)`
builds their public URL.

## Development

```bash
pnpm dev
```

The web app runs at `http://localhost:5173` and the API at `http://localhost:3000`. The home page
queries `GET /api/health` and displays the connection state.

## Quality checks

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

## Database

Set `DATABASE_URL` in `apps/api/.env`, then run:

```bash
pnpm db:generate
pnpm db:migrate
```

Drizzle schemas live in `apps/api/src/db/schema` and generated migrations in
`apps/api/drizzle`.

Product images are stored in R2 and their relative object key is stored in `products.image_key`.
Apply migrations before deploying the API changes that use product images.

## Deployment

Connect this same GitHub repository to both platforms.

### Vercel

- Root Directory: `apps/web`
- Set `VITE_API_URL` to the public Railway API URL.

### Railway API

- Root Directory: `apps/api`
- Set `DATABASE_URL` to the Railway PostgreSQL private connection URL and configure `CORS_ORIGIN`
  with the Vercel frontend URL.
- Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and
  `R2_PUBLIC_URL` with the Cloudflare R2 bucket configuration.
- Recommended watch paths: `/apps/api/**` and `/packages/shared/**`.

### AliExpress debug check (temporary)

To test Railway's outgoing request to AliExpress MTop, configure these API service variables in
Railway:

- `ALIEXPRESS_COOKIE`: the complete `Cookie` header from an authenticated MTop request copied from
  Chrome. It is only used to create the initial persisted session; later restarts use the encrypted
  database session instead.
- `ALIEXPRESS_SESSION_ENCRYPTION_KEY`: a long secret phrase you create and store only in Railway.
  It encrypts the persisted Cookie Jar and must not be changed while that session is in use.
- `DEBUG_API_KEY`: a separate secret used in the `x-debug-api-key` request header.

Call the API route with:

```bash
curl -H "x-debug-api-key: TU_DEBUG_API_KEY" https://TU_DOMINIO/api/debug/aliexpress/product/1005010519851506
```

This is only a temporary diagnostic endpoint. Remove it, or replace it with production-grade
access controls, before deploying to production.

## R2 connection check

After adding the R2 variables to `apps/api/.env`, run:

```bash
pnpm --filter @alitracker/api r2:test
```

This temporary manual check uploads a small text object and deletes it immediately. It does not
expose a debug endpoint.

### Railway PostgreSQL

Create a PostgreSQL service in the same Railway project. The API can use its private network
connection string through `DATABASE_URL`.

A change in `packages/shared` can require redeploying both web and API. Configure a corresponding
watch path for the web deployment if shared code is consumed there.
