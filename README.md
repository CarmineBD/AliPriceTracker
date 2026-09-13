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
```

`apps/web/.env`:

```dotenv
VITE_API_URL=http://localhost:3000
```

`DATABASE_URL` is optional until a database-backed feature is introduced, but is required for
Drizzle migration commands. Do not commit real `.env` files.

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

## Deployment

Connect this same GitHub repository to both platforms.

### Vercel

- Root Directory: `apps/web`
- Set `VITE_API_URL` to the public Railway API URL.

### Railway API

- Root Directory: `apps/api`
- Set `DATABASE_URL` to the Railway PostgreSQL private connection URL and configure `CORS_ORIGIN`
  with the Vercel frontend URL.
- Recommended watch paths: `/apps/api/**` and `/packages/shared/**`.

### Railway PostgreSQL

Create a PostgreSQL service in the same Railway project. The API can use its private network
connection string through `DATABASE_URL`.

A change in `packages/shared` can require redeploying both web and API. Configure a corresponding
watch path for the web deployment if shared code is consumed there.
