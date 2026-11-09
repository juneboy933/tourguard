# TourGuard

TourGuard is an SMS-based tourist separation reporting and coordination platform for tour operators. The approved product and technical scope are documented in [`PRD.md`](./PRD.md) and [`TRD.md`](./TRD.md).

## Project status

- M0 infrastructure setup: partially complete.
- M1 application foundation: complete and verified.
- M2 identity and authorization: complete and verified.
- M3 tours and guests: complete and verified.
- Next milestone: M4 SMS adapter and inbound inbox.
- Africa's Talking provider discovery remains open for sender configuration, webhook authentication/payloads, retry behavior, and delivery semantics.

## Technology baseline

- NestJS + TypeScript API
- Next.js dashboard
- PostgreSQL + Prisma
- Africa's Talking SMS adapter
- Jest tests
- Docker and GitHub Actions

## Local setup

1. Copy `.env.example` to `.env` and fill in local values. Never commit `.env`.
2. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

3. Install dependencies and verify the foundation:

   ```bash
   npm install
   npm run db:validate
   npm run db:generate
   npm run typecheck
   npm run build
   ```

PostgreSQL is exposed on host port `5435` and listens on `5432` inside the container. Production will use a separate managed PostgreSQL instance and Render environment variables.

## Documentation

- [`PRD.md`](./PRD.md) — approved product requirements
- [`TRD.md`](./TRD.md) — approved technical requirements
- [`AGENTS.md`](./AGENTS.md) — repository and implementation constraints
- [`implementation-plan.md`](./implementation-plan.md) — milestone plan and delivery status
