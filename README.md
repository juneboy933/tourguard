# TourGuard

TourGuard is an SMS-based tourist separation reporting and coordination platform for tour operators. The approved product and technical scope are documented in [`PRD.md`](./PRD.md) and [`TRD.md`](./TRD.md).

## Project status

- M0 infrastructure setup: partially complete.
- M1 application foundation: complete and verified.
- M2 identity and authorization: complete and verified.
- M3 tours and guests: complete and verified.
- M4 SMS adapter and inbound inbox: sandbox foundation complete and verified.
- M5 incident workflow and dashboard are implemented and verified through the sandbox.
- Africa's Talking provider discovery remains open for sender configuration, webhook authentication/payloads, retry behavior, and delivery semantics.

## Technology baseline

- NestJS + TypeScript API
- Next.js dashboard
- PostgreSQL + Prisma
- Africa's Talking SMS adapter
- Jest tests
- Docker and GitHub Actions

## Local setup

1. Copy `.env.example` to `.env` and fill in local values. Never commit `.env`. When the dashboard runs on port `3002`, set `WEB_ORIGIN=http://localhost:3002`; keep `PUBLIC_BASE_URL` set to the public API/ngrok URL used by provider callbacks.
2. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

3. Install dependencies and verify the foundation:

   ```bash
   npm install
   npm run db:validate
   npm run db:generate
   npm run db:migrate:deploy
   npm run db:seed
   npm run typecheck
   npm run build
   ```

PostgreSQL is exposed on host port `5435` and listens on `5432` inside the container. Production will use a separate managed PostgreSQL instance and Render environment variables.

API health checks are available at `/api/v1/health/live` (process liveness) and `/api/v1/health/ready` (database readiness).

`db:seed` creates local-only demo data: `admin@tourguard.local`, tour `TG482`, guest `GUEST829`, and an assigned guide. Set `SEED_ADMIN_PASSWORD` in `.env` before running it; never use this seed or its default password in production.

## Documentation

- [`PRD.md`](./PRD.md) — approved product requirements
- [`TRD.md`](./TRD.md) — approved technical requirements
- [`AGENTS.md`](./AGENTS.md) — repository and implementation constraints
- [`implementation-plan.md`](./implementation-plan.md) — milestone plan and delivery status

M5 currently includes incident state transitions, sender/tour authorization for inbound reports, append-only incident and audit history, queued SMS notification intents, and operator incident API endpoints. Africa's Talking provider authentication and delivery behavior remain explicitly provider-confirmation items; this milestone does not invent those details.

The dashboard is available on the configured web port with separate Overview, Incidents, Incident History, and Tours & guests pages. It uses a calm navy/teal safety theme, operator sign-in, clear status states, and focused action flows.
