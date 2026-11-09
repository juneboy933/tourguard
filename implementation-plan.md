# TourGuard implementation plan

**Status:** M1 complete; ready for M2  
**Inputs:** Approved `PRD.md` v0.1.0 and `TRD.md` v0.1.0  
**Scope:** Hackathon MVP; no application code is included in this document.

## Current delivery status

| Milestone | Status | Evidence / remaining work |
|---|---|---|
| M0 — Repository and provider discovery | Partially complete | GitHub repository is active; local PostgreSQL Compose service is healthy on host port `5435`; Render is selected; Africa's Talking sender, webhook authentication, payload, retry, and delivery semantics still require confirmation. |
| M1 — Application foundation | Complete | NestJS API, Next.js dashboard shell, Prisma package, npm workspace, lockfile, health endpoint, type-checks, Prisma validation/generation, and production builds pass. |
| M2 — Identity and authorization | Not started | Sessions, password hashing, roles, tenant guards, CSRF protection, and rate limiting remain. |
| M3 — Tours and guests | Not started | Domain models, migrations, tour/guest APIs, references, lifecycle rules, and dashboard screens remain. |
| M4 — SMS adapter and inbound inbox | Blocked on provider confirmation | Adapter, webhook verification, canonical mapping, inbox persistence, parser, and idempotency remain. |
| M5 — Incidents and operator workflow | Not started | Incident state machine, notifications, audit events, and operator workflow remain. |
| M6 — Hardening and release | Not started | Security review, retention jobs, end-to-end tests, Render deployment, TLS, monitoring, and runbooks remain. |

### Completed commits

- `f774411` — documentation baseline
- `10a609c` — local PostgreSQL development setup
- `4d16920` — application foundation scaffold

The M1 commit is ready to push. Do not commit `.env` or any real provider/database credentials.

## 1. Delivery principles

- Implement the smallest vertical slice that proves the core report-to-acknowledgement workflow.
- Keep PostgreSQL as the source of truth and enforce invariants with database constraints plus application services.
- Make inbound SMS processing idempotent before adding secondary notification features.
- Keep Africa's Talking behind an adapter and use a mock/fake provider in automated tests.
- Treat provider-specific details as a discovery gate, not as assumptions in code.
- Preserve the approved PRD scope; record scope changes as decisions.

## 2. Milestones

### M0 — Repository and provider discovery

**Current state:** Infrastructure setup is complete; provider discovery is still open.

1. Confirm repository package/tooling choice and workspace layout.
2. Confirm Africa's Talking account, sender configuration, inbound payload fields, authentication mechanism, delivery callbacks, retry behavior, and outbound response shape.
3. Decide production host, domain/TLS termination, operator password recovery, and final SMS copy.
4. Create development/test environment configuration without committing secrets.

**Exit criteria:** U-01 through U-04 are documented from provider sources/configuration; U-05 has an owner and target date; no provider signature or delivery guarantee is invented.

### M1 — Application foundation

**Current state:** Complete and verified.

1. Initialize NestJS API and Next.js dashboard with TypeScript.
2. Add configuration validation, structured logging, correlation IDs, health endpoints, and Prisma connection management.
3. Create Docker development setup and isolated PostgreSQL test setup.
4. Add GitHub Actions for formatting/lint, type-check, unit tests, Prisma validation, and Docker build.

**Exit criteria:** clean application boot, readiness/liveness behavior, repeatable migrations, and green CI on an empty baseline.

### M2 — Identity and authorization

1. Implement operator, user, role, and guide identity records.
2. Implement password hashing and server-managed HTTP-only Secure cookie sessions with CSRF protection.
3. Add owner/operator tenant scoping and deny-by-default guards.
4. Add rate limiting and generic authentication errors.

**Exit criteria:** authenticated operator can access only their operator's resources; guides remain SMS-only in the MVP; authorization tests cover cross-tenant and role violations.

### M3 — Tours and guests

1. Implement tour, guest, and tour-guest persistence with references and constraints.
2. Implement tour creation, editing, guide assignment, activation, completion, and cancellation transitions.
3. Enforce one active tour per guest.
4. Implement dashboard APIs and screens for tour and guest management.
5. Create outbound SMS intents for registration confirmations without requiring a live provider.

**Exit criteria:** an operator can create a tour, register multiple guests, assign a guide, activate the tour, and inspect masked guest data; transition and uniqueness tests pass.

### M4 — SMS adapter and inbound inbox

1. Implement the `SmsProvider` interface and a test fake.
2. Implement the configured Africa's Talking outbound mapping and error classification.
3. Implement webhook authentication exactly as confirmed in M0.
4. Persist inbound messages before domain processing, with provider-ID and fallback-fingerprint uniqueness.
5. Add strict parsing for `LOST`, `REPORT`, and `MISSING` commands.
6. Record rejected, duplicate, held, and processed outcomes without leaking private information.

**Exit criteria:** provider contract tests use confirmed payloads/configuration; duplicate/concurrent callbacks are safe; no raw secrets or message content appear in logs.

### M5 — Incidents and operator workflow

1. Implement incident creation and append-only incident events.
2. Enforce `OPEN -> ACKNOWLEDGED -> RESOLVED` and authorized dismissal rules.
3. Implement operator notification and reporter acknowledgement SMS intents.
4. Implement dashboard incident list, detail, acknowledgement, resolution, and history.
5. Add audit events for every report, rejection, assignment, acknowledgement, resolution, and status change.

**Exit criteria:** all three reporting workflows work end to end in a test environment; inactive tours and unauthorized senders are rejected; duplicate reports do not create duplicate incidents.

### M6 — Hardening and release

1. Complete privacy redaction, configurable 365-day retention default, and operational runbooks.
2. Add integration and end-to-end tests against isolated PostgreSQL.
3. Run dependency/security checks, migration-drift checks, Docker vulnerability checks, and CI verification.
4. Perform a provider sandbox/manual SMS test and document observed callback/delivery behavior.
5. Deploy to the selected environment with TLS, secret injection, health checks, and rollback procedure.

**Exit criteria:** PRD acceptance criteria are demonstrated, deployment is repeatable, monitoring is usable, and unresolved provider behavior is documented rather than overstated.

## 3. Test matrix

| Area | Required coverage |
|---|---|
| Parser | Valid commands, case/whitespace, extra tokens, malformed references |
| Authorization | Roles, tenant isolation, guide SMS identity, inactive tour |
| State machines | Valid/invalid tour and incident transitions, concurrent acknowledgement |
| Idempotency | Same provider ID, fallback fingerprint, concurrent duplicate callbacks, safe replay |
| SMS adapter | Confirmed request mapping, provider IDs, transient/permanent/unknown failures |
| API | DTO validation, generic errors, pagination, audit events, session/CSRF behavior |
| Privacy | Redacted logs, masked phones, no secret leakage, retention behavior |
| Deployment | Migrations, health endpoints, Docker startup, CI parity |

## 4. Implementation order and dependencies

`M0 -> M1 -> M2 -> M3 -> M4 -> M5 -> M6`

M4 cannot be completed against a real provider until the Africa's Talking discovery items are confirmed. M5 depends on M3 and M4 because incident creation requires active tour membership and a normalized inbound message. M6 is blocked from production release until hosting/TLS and provider behavior are documented.

## 5. Definition of done for the MVP

- All PRD acceptance criteria pass in automated or documented end-to-end tests.
- No application secrets or personal message content are committed or logged.
- `PRD.md`, `TRD.md`, `AGENTS.md`, and this plan agree on scope and defaults.
- Database constraints enforce references, ownership, and inbound idempotency.
- Provider-specific behavior is verified or clearly marked as unavailable; no unsupported guarantee is presented.
- Docker deployment, migrations, health checks, CI, and rollback instructions are tested.
