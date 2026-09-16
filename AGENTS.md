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

### UI system: shadcn/ui is the default

- The application UI system is shadcn/ui **Base Nova** (`base-nova`) on Tailwind CSS 4. It is the
  visual and interaction baseline for every frontend change. Preserve its default sizing, radius,
  spacing, typography, focus states, hover states, motion, and accessibility behavior.
- Before building a control, check `apps/web/src/components/ui`. Use an existing shadcn component
  whenever one fits (for example, `Button`, `Input`, `Dialog`, `Field`, `Table`, or `Combobox`).
  Compose those components in feature code; do not recreate their primitive HTML, styling, or
  interaction behavior locally.
- If a required component is missing, add the official `base-nova` component through the shadcn
  CLI and use it as generated. Do not introduce a second component library or hand-roll an
  equivalent when shadcn provides one.
- Treat files in `apps/web/src/components/ui` as generated design-system source. Customization
  belongs at the call site through composition, props, and narrowly scoped `className` overrides.
  Do not change a component's default implementation merely to satisfy one screen.
- **Before changing any file in `src/components/ui`, `src/styles.css`, `components.json`, the
  Tailwind/Vite styling setup, design tokens, or the active shadcn style, stop and tell the user:**
  identify the component or token, why call-site composition is insufficient, the visible impact,
  and the proposed change. Implement it only after the user explicitly approves.
- Keep shadcn's Tailwind 4 setup intact: use the Vite Tailwind plugin and the imports, custom
  variants, and theme tokens in `src/styles.css`. Do not reintroduce Tailwind 3 directives,
  legacy PostCSS Tailwind configuration, or incompatible utility syntax.
- Maintain accessibility already provided by shadcn/Base UI: use labels, semantic button types,
  descriptive accessible names, and keyboard-operable controls. Never replace a shadcn control
  with a visually similar but less accessible custom version.
- When a frontend change touches UI components or styling, validate it with at least the relevant
  frontend tests, `pnpm lint`, and a production build. Inspect the rendered behavior when the
  change affects layout, interaction, states, or motion.

## Database

PostgreSQL is accessed through Drizzle ORM. Structural schema changes require a matching Drizzle
migration. Never silently change a SQL schema without creating and reviewing its migration.

## Testing

Add tests for meaningful logic and behavior. Do not add trivial tests solely to increase coverage.

## Commands

- `pnpm dev`: start web and API together.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`: validate all applicable workspaces.
- `pnpm db:generate`, `pnpm db:migrate`: manage database migrations.
