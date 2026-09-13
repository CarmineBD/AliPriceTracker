# AliTracker

AliTracker is a personal MVP web application for managing products, product combos, purchases,
stock, sales, FIFO allocation, real costs, and profit. Only the architectural foundation exists at
this stage; do not assume unimplemented business requirements.

## Architecture

- `apps/web`: React and Vite frontend.
- `apps/api`: Express REST API and Drizzle database integration.
- `packages/shared`: deliberately small package for genuinely shared Zod schemas, derived types,
  and constants. It must not become a catch-all or hold backend business logic.

## Principles

- Keep the architecture simple and avoid premature abstraction.
- Reuse code only when there is genuine duplication.
- Keep TypeScript strict and avoid `any` except for an exceptional, documented reason.
- Do not change the main technologies or add dependencies without a clear justification.
- Validate all external input with Zod.
- Never commit secrets. The frontend is never a trusted boundary; sensitive logic stays in the API.

## Backend

New API modules follow this direction:

`route -> controller -> service -> repository -> database`

- Routes define HTTP endpoints and middleware.
- Controllers translate HTTP requests and responses only; they contain no business logic.
- Services contain business logic.
- Repositories are the only layer that accesses the database.
- Schemas validate input with Zod.

Keep all routes under `/api`. Use accurate HTTP status codes and normalize errors through the
central error middleware.

## Frontend

- Prefer small components and organize by feature when a feature grows enough to need it.
- Use TanStack Query for server state.
- Avoid unnecessary global state.
- Keep HTTP requests in `src/api`, not scattered as direct `fetch` calls in pages.

## Database

PostgreSQL is accessed through Drizzle ORM. Structural schema changes require a matching Drizzle
migration. Never silently change a SQL schema without creating and reviewing its migration.

## Testing

Add tests for meaningful logic and behavior. Do not add trivial tests solely to increase coverage.

## Commands

- `pnpm dev`: start web and API together.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`: validate all applicable workspaces.
- `pnpm db:generate`, `pnpm db:migrate`: manage database migrations.

