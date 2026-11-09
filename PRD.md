# Product Requirements Document (PRD)

## TourGuard

**Version:** 0.1.0  
**Status:** Initial Draft  
**Date:** 9 November 2026  
**Product Type:** B2B SaaS  
**Initial Market:** Kenya  
**Hackathon:** Africa's Talking Open Hackathon — Hospitality & Tourism

---

## 1. Product Overview

TourGuard is an SMS-based tourist separation reporting and coordination platform designed for tour operators managing guided tours.

The platform enables tourists, fellow group members and assigned tour guides to report when a tourist becomes separated from their group.

TourGuard notifies the responsible tour operator, records the incident, tracks acknowledgement and maintains an incident history.

The initial product will use Africa's Talking SMS as its primary communication channel.

## 2. Problem Statement

During guided tours, tourists may become separated from their groups.

When this happens, communication and coordination between tourists, guides and tour operators may be difficult.

A tourist may not know how to contact the responsible operator. A guide may not immediately know that a guest is missing. An operator may lack a structured process for receiving and tracking such reports.

TourGuard aims to provide a simple, accessible and traceable reporting mechanism.

**Core problem:** Tour operators need a reliable way to receive, acknowledge and coordinate tourist separation reports during active tours.

## 3. Product Vision

To provide a practical safety coordination layer for guided tourism, beginning with tourist separation reporting and expanding into broader tour assistance and accountability services.

## 4. Target Users

### 4.1 Primary Customer: Tour Operators

Responsibilities:
- Create and manage tours.
- Register tourists.
- Assign guides.
- Activate and complete tours.
- Receive and acknowledge incidents.
- Track incident resolution.

### 4.2 Tourists

Responsibilities:
- Receive tour registration confirmation.
- Keep their tour and guest references.
- Report when separated from their group.
- Receive notification that their report has been received.

### 4.3 Group Members

Responsibilities:
- Report when another registered tourist becomes separated.
- Provide the relevant guest reference.

### 4.4 Tour Guides

Responsibilities:
- Manage assigned tour groups.
- Report separated tourists.
- Receive and respond to relevant coordination notifications.

## 5. Product Objectives

The MVP must:

1. Allow operators to create and manage tours.
2. Allow operators to register guests manually.
3. Generate unique tour and guest references.
4. Allow operators to assign guides.
5. Support tour activation and completion.
6. Receive separation reports through SMS.
7. Identify and authenticate reporting phone numbers.
8. Notify the responsible operator.
9. Support incident acknowledgement.
10. Track incident status and resolution.
11. Maintain an auditable incident history.

## 6. Core User Workflows

### 6.1 Tour Creation and Registration

1. Operator logs into TourGuard.
2. Operator creates a tour.
3. Operator provides tour details, date and expected duration.
4. Operator registers guests with names and phone numbers.
5. Operator assigns a guide.
6. System generates:
   - Unique tour reference.
   - Unique guest reference for each registered tourist.
7. System sends registration confirmation SMS to each guest.
8. Operator activates the tour when ready.

### 6.2 Tourist Separation Reporting

A registered tourist sends:

`LOST TG482`

The backend:

1. Receives the incoming SMS.
2. Identifies the sender's phone number.
3. Finds the corresponding registered guest.
4. Validates the tour reference.
5. Confirms that the tour is active.
6. Creates an incident.
7. Notifies the responsible operator.
8. Sends the tourist an SMS confirming receipt of the report.

### 6.3 Group Member Reporting

A registered group member sends:

`REPORT TG482 GUEST829`

The backend verifies that:
- The reporting number belongs to a registered guest on the tour.
- The reported guest belongs to the same tour.
- The tour is active.

It then creates an incident and notifies the operator.

### 6.4 Guide Reporting

An assigned guide sends:

`MISSING TG482 GUEST829`

The backend verifies the guide's identity and assignment before creating the incident.

### 6.5 Incident Acknowledgement

The operator can acknowledge an incident through the dashboard or an authorized SMS command:

`ACK INC4821`

The system:
- Records the acknowledgement.
- Records the acknowledgement timestamp.
- Identifies the responsible operator.
- Updates the incident status.
- Notifies the reporting tourist where appropriate.

### 6.6 Incident Resolution

The operator updates the incident when coordination is complete.

The system records:
- Final status.
- Resolution notes.
- Resolving operator.
- Resolution timestamp.

## 7. Functional Requirements

### FR-01: Authentication and Authorization

The system must support authenticated operator accounts.

Users must only access resources they are authorized to manage.

### FR-02: Tour Management

Operators must be able to:
- Create tours.
- View tours.
- Update tour details.
- Assign guides.
- Activate tours.
- Complete or cancel tours.

### FR-03: Guest Management

Operators must be able to:
- Register guests.
- View registered guests.
- Assign guests to tours.
- View guest references.
- Prevent duplicate registrations within the same tour.

### FR-04: Reference Generation

The system must generate unique tour and guest references.

References must not expose sensitive personal information.

### FR-05: SMS Notifications

The system must use Africa's Talking SMS to:
- Send guest registration confirmations.
- Notify operators of incidents.
- Confirm receipt of reports.
- Communicate incident acknowledgements where appropriate.

### FR-06: Incoming SMS Processing

The system must:
- Receive incoming SMS callbacks.
- Parse supported commands.
- Validate sender identity.
- Validate tour and guest references.
- Reject unauthorized commands.
- Handle duplicate messages safely.

### FR-07: Incident Management

The system must support:
- Incident creation.
- Incident acknowledgement.
- Incident status updates.
- Incident resolution.
- Incident history.

### FR-08: Audit Trail

Important actions must be recorded with timestamps and the responsible actor.

### FR-09: Tour Lifecycle

Tours must have controlled lifecycle states:

- DRAFT
- ACTIVE
- COMPLETED
- CANCELLED

Reports must only be accepted for active tours.

### FR-10: Error Handling

Invalid commands, unknown references, unauthorized senders and inactive tours must produce appropriate responses without exposing private information.

## 8. Non-Functional Requirements

### Security
- Validate all incoming SMS senders against registered phone numbers.
- Enforce role-based authorization.
- Hash passwords securely.
- Protect API credentials using environment variables.
- Validate incoming webhook requests according to Africa's Talking's supported security mechanisms.
- Prevent unauthorized access to guest and incident records.

### Reliability
- Prevent duplicate incident creation from repeated messages.
- Track SMS delivery outcomes where supported.
- Record failed notification attempts.
- Avoid silently losing accepted reports.

### Performance
- Process incoming SMS requests promptly.
- Keep API response times reasonable under expected MVP traffic.

### Maintainability
- Use modular NestJS architecture.
- Separate business logic from external SMS integration.
- Maintain automated tests for critical business rules.
- Document APIs and configuration.

### Privacy
- Collect only information necessary for tour coordination.
- Restrict access to guest phone numbers and incident records.
- Define appropriate data retention and deletion policies.
- Avoid continuous location tracking.

## 9. MVP Scope

### Included

- Operator authentication.
- Tour management.
- Guest registration.
- Guide assignment.
- Tour and guest reference generation.
- Tour activation and completion.
- Africa's Talking SMS integration.
- Incoming SMS command processing.
- Tourist, group member and guide reporting.
- Operator notifications.
- Incident acknowledgement.
- Incident resolution tracking.
- Operator dashboard.
- Audit records.

### Excluded

- GPS tracking.
- Live location sharing.
- Mobile applications.
- AI-based threat detection.
- Automated police or ambulance dispatch.
- Public tourist booking marketplace.
- Payment processing.
- Multi-country operations.
- Automated emergency escalation to third parties.

## 10. Safety Considerations

TourGuard is a coordination and reporting tool, not an emergency response provider.

The system must:
- Clearly distinguish message receipt from acknowledgement and resolution.
- Never claim that an SMS automatically summons emergency services.
- Provide appropriate guidance to contact established emergency services when immediate danger exists.
- Avoid unnecessary disclosure of guest identities.
- Prevent unauthorized incident reporting.
- Maintain accountability for operator actions.
- Avoid presenting any community or destination as inherently dangerous.

## 11. MVP Acceptance Criteria

The MVP will be considered functionally complete when:

1. An operator can create a tour.
2. An operator can register multiple guests.
3. The system generates unique references.
4. Guests receive registration SMS notifications.
5. An operator can assign a guide and activate a tour.
6. A registered tourist can submit a separation report through SMS.
7. A registered group member can report another guest.
8. An assigned guide can report a missing guest.
9. Unauthorized senders are rejected.
10. Reports for inactive tours are rejected.
11. The operator receives incident notifications.
12. The operator can acknowledge incidents.
13. Incidents can be marked resolved.
14. Duplicate incoming messages do not create duplicate incidents.
15. Incident history is available to authorized operators.
16. Automated tests cover critical workflows.
17. The application can be deployed using Docker.

## 12. Success Metrics

For the hackathon MVP, we will measure:

- Successful tour registrations.
- Successful guest SMS notifications.
- Successful incoming SMS processing.
- Time from report receipt to operator acknowledgement.
- Duplicate incident prevention.
- Successful incident resolution tracking.
- End-to-end demonstration reliability.

These are product and engineering metrics, not claims of improved real-world safety.

## 13. Assumptions and Future Validation

The initial implementation assumes:

- Tour operators can register guests before tours begin.
- Guests have access to a phone number capable of sending and receiving SMS.
- Operators maintain accurate guest and guide information.
- Operators can receive and act on incident notifications.
- Africa's Talking supports the required incoming and outgoing SMS workflows for our selected account configuration.

These assumptions must be validated with actual operators before commercial deployment.

## 14. Future Product Opportunities

Beyond the MVP, TourGuard may expand into:

- Tour group accountability.
- Optional location-assisted reconnection.
- Multiple emergency and assistance categories.
- Community tourism coordination.
- Tourism organization oversight.
- Integration with established tourism safety organizations.
- Multilingual guest communication.

These features are not part of the initial hackathon commitment.

---

**Document status:** Initial PRD draft pending engineering and product review.

**Product principle:** Solve one problem exceptionally well before expanding the product.