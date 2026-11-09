# TourGuard repository guidance

## Product and documentation baseline

- `PRD.md` v0.1.0 is the approved product baseline. Do not modify it without an explicit product decision.
- `TRD.md` v0.1.0 is approved for implementation planning. Keep implementation aligned with its module boundaries, state machines, privacy controls, and acceptance criteria.
- This repository is documentation-first until the implementation plan is approved. Do not add application code, dependencies, migrations, provider credentials, or infrastructure as part of documentation work.

## Architecture constraints

- Backend: NestJS + TypeScript.
- Database: PostgreSQL with Prisma migrations.
- Dashboard: Next.js.
- SMS: Africa's Talking behind a provider adapter.
- Tests: Jest. Packaging: Docker. CI/CD: GitHub Actions.
- Keep business rules in application/domain services, not controllers or the Next.js client.
- Preserve tenant and role authorization on every operator-facing resource.
- Treat inbound SMS as untrusted input. Normalize, verify, persist for idempotency, and process with database uniqueness constraints.

## Safety and privacy

- TourGuard coordinates reports; it is not an emergency-response service.
- Do not claim that an SMS dispatches emergency services.
- Never log passwords, tokens, provider secrets, raw phone numbers, or raw SMS bodies.
- Mask phone numbers in user interfaces and logs.
- Do not add GPS tracking, live location, public booking, payments, or automated emergency dispatch without an explicit scope decision.

## Provider boundary

- Do not invent Africa's Talking webhook signatures, field names, retry policies, or delivery guarantees.
- Confirm provider-specific behavior from the selected account configuration/documentation before implementing the adapter.
- Keep provider payload mapping inside the SMS/webhook adapter; domain services consume canonical message objects.

## Verification expectations

Before documentation changes are handed off, check Markdown formatting, confirm `PRD.md` is unchanged, and report changed files and unresolved decisions. Before implementation changes are handed off, run the relevant Jest, type-check, Prisma, Docker, and CI checks defined by the approved plan.
