# TourGuard Technical Requirements Document (TRD)

**Version:** 0.1.0
**Status:** Approved for implementation planning
**Date:** 9 November 2026
**Product baseline:** PRD v0.1.0
**Scope:** Hackathon MVP

## 1. Purpose and design baseline

This document translates the approved PRD into an implementation-ready technical design. It covers the operator dashboard, NestJS API, PostgreSQL persistence, Africa's Talking SMS integration, and the operational controls needed to receive and track tourist-separation reports.

The approved technology baseline is:

| Area | Decision |
|---|---|
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| SMS | Africa's Talking |
| Dashboard | Next.js |
| Tests | Jest |
| Packaging | Docker |
| CI/CD | GitHub Actions |

The system is a coordination tool, not an emergency-response provider. It must never imply that receiving an SMS dispatches police, ambulance, or rescue services.

## 2. Scope, assumptions, and unresolved decisions

### 2.1 In scope

- Operator authentication and role-based dashboard access.
- Manual guest registration and guide assignment.
- Tour lifecycle management.
- Unique non-sensitive tour, guest, and incident references.
- Inbound SMS commands for tourist, group-member, and guide reports.
- Operator notifications and acknowledgement/resolution tracking.
- Audit history, idempotent message processing, and Docker deployment.

GPS tracking, live location, mobile apps, payments, public booking, automated emergency dispatch, multi-country operation, and AI detection remain out of scope.

### 2.2 Explicit assumptions

- **A-01:** One MVP tenant is an operator account; the schema nevertheless includes an operator ownership boundary so tenant isolation is explicit.
- **A-02:** An operator may have multiple users, tours, and guides. Guides are registered identities for SMS authorization in the MVP and do not receive dashboard accounts.
- **A-03:** A phone number is normalized to E.164 before lookup. The selected country default and exact normalization library are configuration decisions.
- **A-04:** A guest can belong to one active tour at a time for the MVP. Re-registration history is retained rather than overwritten.
- **A-05:** The dashboard uses server-managed sessions in HTTP-only, Secure cookies with CSRF protection appropriate to the chosen framework.
- **A-06:** SMS delivery is asynchronous and best-effort. A request accepted by the provider is not treated as proof of handset delivery.
- **A-07:** Incoming callbacks may be retried, duplicated, delayed, reordered, or delivered more than once. The application must tolerate all of these.
- **A-08:** A report must identify a tour reference; `LOST TG482` identifies the sender as the reported guest, while `REPORT TG482 GUEST829` and `MISSING TG482 GUEST829` identify the target explicitly.

### 2.3 Unresolved/provider-specific decisions

- **U-01:** Confirm the exact Africa's Talking account product, sender type/short code, country configuration, callback URL configuration, and required request fields.
- **U-02:** Confirm Africa's Talking's current webhook authentication/signature mechanism, if enabled for the selected product. This TRD does **not** invent a signature format. Implement verification only from the provider's current documentation or account configuration; until confirmed, the endpoint must be treated as untrusted and protected with the strongest supported mechanism plus rate limiting.
- **U-03:** Confirm the provider's retry policy, timeout expectations, callback ordering, delivery-report fields, and delivery-report semantics. Do not promise delivery guarantees not documented by the provider.
- **U-04:** Confirm whether outbound API failures are retryable, which error codes are transient, and whether provider message IDs are returned for every send.
- **U-05:** Decide operator password reset flow, production hosting, and domain/TLS termination. The MVP retention default is 12 months, and PostgreSQL is expected to be managed.

### 2.4 Accepted MVP defaults

- Operator acknowledgement is dashboard-only; `ACK <incidentRef>` is not part of the MVP SMS grammar.
- Guides are SMS-only identities in the MVP; dashboard guide accounts may be added later.
- A guest may belong to only one active tour at a time.
- Dashboard authentication uses server-managed sessions in HTTP-only, Secure cookies with CSRF protection.
- Personal/message data is retained for 12 months by default, subject to legal and operational review.
- PostgreSQL is deployed as a managed service in environments that support it.

## 3. System architecture

The MVP is a modular monolith with one deployable NestJS API and one Next.js dashboard. PostgreSQL is the source of truth. A provider adapter isolates Africa's Talking from domain logic.

```text
Browser -> Next.js dashboard -> NestJS REST API -> Prisma -> PostgreSQL
                                          |
                                          +-> SMS application service -> Africa's Talking
Africa's Talking callback -> webhook controller -> inbox/idempotency -> domain commands
                                                        |
                                                        +-> incident, audit, outbound message records
```

The webhook controller must acknowledge only after the inbound request has been validated enough to persist an inbox record safely. Domain processing may be completed synchronously for MVP or via a worker later; the persistence model must support both. No external provider call is made inside a database transaction.

### 3.1 Repository/application layout

```text
apps/api       NestJS application
apps/web       Next.js dashboard
packages/      shared DTO/schema/types only where useful
prisma/        schema, migrations, seed data
docker/        development and production container assets
.github/       GitHub Actions workflows
```

The exact monorepo tooling is an implementation choice. It must not duplicate domain rules between the web client and API.

## 4. NestJS module boundaries

| Module | Owns | Must not own |
|---|---|---|
| `AuthModule` | Login, password hashing, token/session issuance, current-user context | Tour business rules |
| `UsersModule` | Operator/guide profiles, roles, phone normalization | SMS parsing |
| `ToursModule` | Tour CRUD, lifecycle transitions, assignments, guest membership | Provider calls |
| `GuestsModule` | Guest registration, references, phone identity within a tour | Authentication tokens |
| `IncidentsModule` | Incident creation, transitions, acknowledgement, resolution, history | Raw webhook parsing |
| `SmsModule` | Provider adapter, outbound message records, delivery updates | Deciding whether a report is valid |
| `WebhooksModule` | Provider callback authentication, normalization, inbox persistence | Direct database-wide business logic |
| `AuditModule` | Append-only audit events and redacted metadata | Authorization decisions |
| `HealthModule` | Liveness/readiness and dependency checks | Domain state |
| `PrismaModule` | Database client lifecycle and transaction boundary utilities | Business policy |

Controllers validate transport DTOs and delegate to application services. Domain services enforce invariants. Repositories or Prisma accessors isolate persistence. Guards/policies enforce the authenticated operator's tenant and role scope on every dashboard route.

## 5. Domain model and relationships

All IDs are opaque UUIDs (or equivalent generated identifiers); public references are separate, human-readable, non-sequential-safe identifiers.

### 5.1 Core entities

| Entity | Key fields and constraints |
|---|---|
| `Operator` | `id`, `name`, `status`, `createdAt`, `updatedAt`; tenant root. |
| `User` | `id`, `operatorId`, `name`, normalized `phone`, `email`, `passwordHash` (nullable for SMS-only guide if allowed), `role` (`OWNER`, `ADMIN`, `STAFF`, `GUIDE`), `status`, timestamps. Unique `(operatorId,email)` and normalized phone policy must be explicit. |
| `Tour` | `id`, `operatorId`, unique `reference`, name, destination/description, start/end or expected duration, `status`, `guideUserId` nullable, timestamps. Unique `(operatorId,reference)`. |
| `Guest` | `id`, `operatorId`, name, normalized phone, optional consent/notice metadata, timestamps. Do not log raw phone numbers. |
| `TourGuest` | `id`, `tourId`, `guestId`, unique `reference`, membership status, registered/removed timestamps. Unique `(tourId,guestId)` and `(tourId,reference)`. |
| `Incident` | `id`, `operatorId`, `tourId`, unique `reference`, `reportedGuestMembershipId`, `reporterIdentity` (guest membership, guide user, or unknown), `source` (`SMS`, `DASHBOARD`), `status`, summary/category, acknowledged/resolved actor and timestamps, resolution notes, created/updated timestamps. |
| `IncidentEvent` | Append-only incident history: `incidentId`, event type, actor type/id, safe metadata, createdAt. Never edit prior events. |
| `InboundMessage` | Provider message ID where available, request fingerprint, sender phone, destination/short code, raw payload encrypted or redacted per policy, normalized command fields, processing status, rejection reason, linked incident, received/processed timestamps. Unique provider ID when present; unique fingerprint fallback. |
| `OutboundMessage` | Recipient reference, message type, provider message ID, body hash/redacted preview, status (`QUEUED`, `SUBMITTED`, `DELIVERED`, `FAILED`, `UNKNOWN`), provider response metadata redacted, attempt count, timestamps. |
| `AuditEvent` | Operator scope, actor, action, entity type/id, outcome, correlation ID, safe metadata, timestamp. Append-only. |

Relationships: `Operator 1—N User`, `Operator 1—N Tour`, `Operator 1—N Guest`, `Tour N—N Guest` through `TourGuest`, `Tour 0—1 Guide User` per assignment policy, `Tour 1—N Incident`, `Incident 1—N IncidentEvent`, and inbound/outbound messages link to their domain records where applicable.

### 5.2 Database requirements

- Use PostgreSQL timestamps in UTC; render in the dashboard's configured locale.
- Use foreign keys and restrictive deletes for audit, incidents, and message records.
- Use database unique constraints for references and idempotency keys; application checks alone are insufficient.
- Index `Tour(operatorId,status)`, `TourGuest(tourId,reference)`, normalized phone lookup, `Incident(operatorId,status,createdAt)`, and inbound processing status.
- Store only the minimum personal data needed. Encrypt sensitive fields at rest where the deployment provides it; application-level encryption for raw webhook payloads is a decision tied to the retention policy.

## 6. State machines and business invariants

### 6.1 Tour

```text
DRAFT -> ACTIVE -> COMPLETED
  |        |
  +------> CANCELLED
```

- `DRAFT -> ACTIVE` requires required tour details, at least one guest, and an assigned guide if the product decision makes a guide mandatory.
- `ACTIVE -> COMPLETED` is allowed by an authorized operator; it rejects new reports thereafter.
- `DRAFT -> CANCELLED` and `ACTIVE -> CANCELLED` are allowed by authorized operators.
- No transition out of `COMPLETED` or `CANCELLED`.
- Only `ACTIVE` tours accept report incidents.

### 6.2 Incident

```text
OPEN -> ACKNOWLEDGED -> RESOLVED
  |          |
  +--------> DISMISSED
```

`OPEN` is created only after sender, command, target membership, and active-tour checks pass. `ACKNOWLEDGED` records the operator actor and timestamp. `RESOLVED` requires a resolution outcome/notes appropriate to the UI. `DISMISSED` is an authorized terminal outcome for invalid/non-actionable reports that were accepted for audit. Terminal states cannot be silently reopened; a new report creates a new incident and may link to the prior one later.

## 7. API contracts

The API is versioned under `/api/v1`. JSON responses use a stable envelope for errors and resource representations. UUIDs and public references are strings. Validation failures return field-safe messages without revealing whether another tenant's record exists.

### 7.1 Authentication and dashboard endpoints

| Method | Route | Contract |
|---|---|---|
| `POST` | `/api/v1/auth/login` | `{email,password}` -> session/access result; rate limited; generic invalid-credential error. |
| `POST` | `/api/v1/auth/logout` | Revokes/clears session. |
| `GET` | `/api/v1/auth/me` | Current user, operator, and roles; no password/hash. |
| `GET` | `/api/v1/tours` | Paginated operator-scoped tours with status filters. |
| `POST` | `/api/v1/tours` | Create draft; validates dates and ownership. |
| `GET/PATCH` | `/api/v1/tours/:id` | Read/update permitted fields, tenant scoped. |
| `POST` | `/api/v1/tours/:id/activate` | Performs guarded transition and emits audit event. |
| `POST` | `/api/v1/tours/:id/complete` | Performs guarded transition. |
| `POST` | `/api/v1/tours/:id/cancel` | Performs guarded transition with reason. |
| `POST` | `/api/v1/tours/:id/guests` | Register guest, generate membership reference, queue confirmation SMS. Idempotency key recommended. |
| `GET` | `/api/v1/tours/:id/guests` | Paginated guest view; phone masked by default. |
| `PUT` | `/api/v1/tours/:id/guide` | Assign/unassign guide with role and operator checks. |
| `GET` | `/api/v1/incidents` | Paginated, filterable operator-scoped incidents. |
| `GET` | `/api/v1/incidents/:id` | Incident plus authorized event history. |
| `POST` | `/api/v1/incidents/:id/acknowledge` | Dashboard-only; `expectedVersion`/idempotency key; OPEN -> ACKNOWLEDGED. |
| `POST` | `/api/v1/incidents/:id/resolve` | Outcome and notes; ACKNOWLEDGED -> RESOLVED. |

All mutating dashboard requests create an audit event with a correlation ID. A resource not belonging to the caller's operator is returned as not found or a generic authorization error according to the API policy, never with existence leakage.

### 7.2 Webhook endpoints

| Method | Route | Contract |
|---|---|---|
| `POST` | `/api/v1/webhooks/africas-talking/inbound-sms` | Accept provider content type and field names only after account/provider confirmation; verify supported authentication; normalize to `InboundMessage`; return provider-compatible success response. |
| `POST` | `/api/v1/webhooks/africas-talking/delivery` | Optional delivery callback; exact payload and authentication are provider-specific TBD. Persist status transitions without treating them as proof beyond provider semantics. |

Webhook payloads are mapped through a provider adapter. The domain layer receives a canonical object such as `{providerMessageId?, sender, recipient?, text, receivedAt, rawMetadata}` and never depends on Africa's Talking field names.

## 8. SMS workflows

### 8.1 Outbound registration and notification

1. The operator registers a guest or the system creates an operator notification.
2. The application commits the domain change and an `OutboundMessage` intent in one database transaction.
3. A dispatcher sends through `SmsProvider`; it uses a bounded retry policy for known transient failures only.
4. The provider response is stored with redacted metadata and provider message ID when available.
5. Delivery callbacks, if configured and documented, update status idempotently.
6. Dashboard status distinguishes queued/submitted from delivered, failed, or unknown.

### 8.2 Inbound report processing

1. Receive the callback over HTTPS; apply body-size and rate limits.
2. Verify the provider mechanism that is actually configured. If verification cannot be performed, do not treat the request as authenticated; persist a rejected/held record according to the operating policy.
3. Normalize sender phone, text, provider ID, and received time.
4. Compute a deterministic fallback fingerprint from provider, sender, destination, normalized text, and provider timestamp/window when no provider ID exists. The fingerprint window must be documented and tested.
5. Insert `InboundMessage` under a uniqueness constraint. A duplicate returns success without creating another incident.
6. Parse a strict, case-insensitive command grammar: `LOST <tourRef>`, `REPORT <tourRef> <guestRef>`, and `MISSING <tourRef> <guestRef>`. Operator acknowledgement is dashboard-only in the MVP. Reject extra/ambiguous tokens.
7. Resolve sender identity and target membership within the same operator/tour boundary; verify tour is `ACTIVE`.
8. In one transaction, create the incident, initial event, audit event, and linkage from inbound message. A unique business idempotency key prevents duplicate incidents on concurrent delivery.
9. Queue acknowledgement SMS and operator notification as outbound intents after commit.
10. Return the provider-compatible success response. User-visible text must distinguish “report received” from “operator acknowledged.”

Unauthorized, malformed, unknown-reference, and inactive-tour messages are recorded with a safe reason and receive a generic response that does not disclose private records. The exact response text is configurable and must not reveal whether a phone number or reference exists.

### 8.3 Provider verification and delivery boundaries

No Africa's Talking signature header, hash, secret, retry count, or delivery guarantee is specified here because it has not been confirmed. The adapter must have contract tests built from the selected account's official documentation/configuration before production use. Secrets are injected at runtime and rotated without code changes.

## 9. Identity, roles, and authorization

Roles:

- `OWNER`: full operator administration, users, tours, incidents, configuration.
- `ADMIN`: manage tours, guests, guides, incidents; no owner credential administration unless explicitly granted.
- `STAFF`: operate assigned/tenant tours and incidents according to policy.
- `GUIDE`: SMS identity for assigned tours; no dashboard login in the MVP.

Authorization is deny-by-default and checks both role and `operatorId` ownership. A guide's dashboard access is additionally restricted to assigned tours. SMS identity is not a substitute for dashboard authentication: a phone can act only through a supported command, and only when its normalized number maps to the required guest/guide assignment.

Passwords use a modern adaptive password hash. Login, webhook, and SMS-triggered paths are rate limited. Tokens/sessions are short-lived or revocable, protected from CSRF according to the chosen cookie/session approach, and never logged.

## 10. Idempotency, concurrency, and failure handling

- Provider message ID is the primary inbound idempotency key when present.
- A database uniqueness constraint and transaction determine the winner under concurrent duplicate callbacks.
- Dashboard mutating requests accept an idempotency key for create/send operations; key scope, request hash, response replay, and expiry must be defined in the implementation.
- Incident transitions use a transaction and optimistic version or row lock so two acknowledgements cannot produce conflicting histories.
- Outbound intent creation is transactionally coupled to the domain event; provider calls occur after commit. If a send fails, the record remains retryable/failed and the incident is not rolled back.
- Reprocessing an already completed inbound message is a safe no-op.
- Provider timeouts yield `UNKNOWN` rather than a false `FAILED` unless the provider response proves failure.
- Error responses are correlated internally but expose only a safe correlation ID.

## 11. Privacy, safety, and security controls

- Collect name, phone, tour membership, and incident data only as required by the PRD.
- Mask phone numbers in dashboard lists and all ordinary logs; prohibit raw SMS bodies and provider secrets in logs.
- Encrypt transport with TLS in deployed environments and restrict database/network access.
- Use environment/secret-manager configuration, never committed secrets.
- Apply least privilege to database and deployment identities.
- Implement configurable retention/deletion jobs with a 365-day MVP default; preserve legally/operationally required audit records separately from personal data where possible.
- Avoid continuous location collection and do not expose a guest list to another guest.
- Use generic SMS errors and avoid confirming private identity or membership to an unauthorized sender.
- Every acknowledgement, resolution, rejection, assignment, and status change is auditable.
- UI copy must say “report received,” “acknowledged,” or “resolved” precisely and include emergency guidance approved by the product owner.
- Consider consent/notice wording for registration SMS and local data-protection obligations before real-user launch; legal review is outside this TRD.

## 12. Observability and operations

- Structured JSON logs with timestamp, level, service, correlation ID, request ID, operator scope, route, outcome, and latency.
- Redact phone numbers, SMS bodies, access tokens, passwords, webhook secrets, and provider credentials.
- Metrics: request latency/error rate, inbound accepted/rejected/duplicate counts, incident creation/acknowledgement latency, outbound attempts by status, provider failures, queue age, database health, and webhook authentication failures.
- Health endpoints: liveness must not depend on PostgreSQL; readiness checks database connectivity and required configuration without exposing secrets.
- Alert-worthy conditions: sustained webhook rejection, growing outbound backlog, database unavailable, repeated provider failures, and unexpected incident transition errors.
- Distributed tracing is optional for the hackathon; correlation IDs are mandatory.
- Operational runbooks must cover provider outage, duplicate callback storm, secret rotation, failed migration, and replay/reconciliation.

## 13. Testing strategy

Jest is required for automated tests.

- **Unit:** command parser, phone normalization, reference generation, authorization policies, tour/incident transition guards, idempotency-key derivation, redaction.
- **Service/integration:** Prisma repositories against an isolated PostgreSQL database; transaction rollback/commit behavior; unique constraint races; tenant isolation.
- **Controller/API:** DTO validation, generic errors, authentication guards, role/ownership checks, pagination, optimistic concurrency, and audit emission.
- **Webhook contract:** canonical mapping for the exact configured Africa's Talking payload, verification mechanism, content type, duplicate handling, and provider-compatible response. No test may assume an unverified signature format.
- **SMS adapter contract:** outbound request mapping, provider ID handling, timeout/unknown semantics, delivery-status mapping, and retries based on confirmed provider behavior.
- **End-to-end:** register tour/guest -> outbound intent -> activate -> inbound report -> incident -> operator notification -> acknowledge -> resolve.
- **Security:** secrets absent from logs, webhook replay rejection/duplication safety, rate limits, SQL/DTO injection, CSRF/session behavior, and cross-tenant access attempts.
- **Operational:** Docker image starts, migrations run, readiness behaves correctly, and GitHub Actions executes the same required checks.

Critical PRD acceptance criteria must have named automated tests, especially inactive-tour rejection, unauthorized sender rejection, all three report commands, and duplicate inbound delivery.

## 14. Deployment and CI/CD

### 14.1 Containers

- Multi-stage Docker builds with pinned base/runtime versions.
- Separate API and web images; PostgreSQL is external or a development-only compose service.
- Run as a non-root user, use a minimal runtime image, expose only required ports, and define health checks.
- `prisma migrate deploy` runs as an explicit release step with backups/rollback procedure; application startup must not silently create schema changes.

### 14.2 Environments

`development`, `test`, and `production` have separate databases, provider credentials, callback URLs, and secrets. Production provider access must not be used in automated tests. A sandbox/test number or mocked adapter is required for CI.

### 14.3 Required configuration

```text
NODE_ENV, PORT, PUBLIC_BASE_URL
DATABASE_URL
SESSION_SECRET and session-store configuration
SMS_PROVIDER=africas-talking
AFRICAS_TALKING_USERNAME
AFRICAS_TALKING_API_KEY
AFRICAS_TALKING_SENDER_OR_SHORT_CODE (if applicable)
AFRICAS_TALKING_WEBHOOK_SECRET/verification settings (only if officially configured)
SMS_RETRY_LIMIT, SMS_TIMEOUT_MS
LOG_LEVEL, RETENTION_DAYS=365
```

Configuration is validated at startup, secrets are never given defaults in production, and logs print names/status only—not values.

### 14.4 GitHub Actions

Pull requests run formatting/lint, type-check, unit/integration/API tests, Prisma validation, dependency/security checks, Docker build, and `git diff --check`. The workflow must fail on test or migration drift. Main-branch delivery builds immutable images and deploys only after required checks and environment approvals; the target host/provider is unresolved.

## 15. Acceptance criteria for this TRD

The technical design is ready for implementation when:

1. The repository contains this TRD and the approved `PRD.md` is unchanged.
2. Every PRD MVP workflow maps to a module, persistence entity, API/SMS contract, and test scenario.
3. Tour and incident transition rules reject invalid transitions and inactive-tour reports.
4. Duplicate inbound callbacks cannot create duplicate incidents under concurrency.
5. Tenant, role, guest, guide, and SMS-sender authorization rules are testable.
6. Outbound delivery state is not represented as handset delivery unless provider semantics support it.
7. Provider-specific webhook fields, authentication, retry, and delivery behavior are confirmed before implementation of the adapter; no invented signature or guarantee is accepted.
8. Privacy, redaction, audit, health, metrics, Docker, and CI requirements have implementation owners before coding.
9. Remaining decisions U-01 through U-05 are either resolved or explicitly accepted as hackathon demo constraints; accepted MVP defaults are recorded in section 2.4.

## 16. Open decision register

| ID | Decision needed | Owner/when |
|---|---|---|
| U-01 | Africa's Talking product/account, sender, callback fields | Engineering + provider setup |
| U-02 | Webhook authentication/signature mechanism | Engineering after provider confirmation |
| U-03 | Retry, ordering, delivery callback semantics | Engineering after provider confirmation |
| U-04 | Outbound error classification and provider IDs | Engineering after provider confirmation |
| U-05 | Operator password reset flow, production hosting, domain/TLS termination | Product/operations before production |
| A-08 | Final SMS grammar and response copy | Product + operator usability test |

**Implementation gate:** Do not start application coding until the provider-specific items needed for the webhook and SMS adapter are verified and the product owner has accepted the unresolved MVP decisions above.
