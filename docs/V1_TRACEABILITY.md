# ZNF-Portal V1 Requirements Traceability

## Purpose

This matrix maps V1 blueprint requirements to GitHub implementation Issues so Planner, Builder, Reviewer, and CI can verify scope coverage without expanding product boundaries.

## Source Boundaries

- Product blueprint: `docs/V1_BLUEPRINT.md`
- Database sketch: `docs/DATABASE.sql`
- API sketch: `docs/API.md`
- Conflict rule: `docs/CONFLICT.md`

## Traceability Matrix

| Blueprint Area | Requirement | Issue | Acceptance Focus |
|---|---|---|---|
| Foundation | Backend scaffold with runtime, modules, config, and ORM path | #1 TASK-01 | Backend starts from one framework path and keeps CI green |
| Foundation | Database model for all V1 entities | #2 TASK-02 | Prisma schema or migration source maps to V1 objects |
| Resource | Zone entity and CRUD | #3 TASK-03 | Create, list, detail, and update Zone |
| Resource | Device entity bound to Zone | #4 TASK-04 | Device has home zone, current zone, and valid status |
| Scheduling | Time overlap conflict detection | #5 TASK-05 | Conflict rule uses `start < existing.end AND end > existing.start` |
| Scheduling | ZoneBooking lifecycle | #6 TASK-06 | Create, list, and cancel ZoneBooking with conflict checks |
| Scheduling | DeviceBooking lifecycle | #7 TASK-07 | Create and list DeviceBooking with conflict checks |
| Scheduling | VisitBooking lifecycle | #8 TASK-08 | Create, list, and cancel VisitBooking without CRM expansion |
| Operations | VisitRecord execution result | #9 TASK-09 | Record actual visit timing and count linked to VisitBooking |
| Operations | WorkOrder management | #10 TASK-10 | Create, query, and update basic work orders |
| Operations | InquiryRecord lightweight records | #11 TASK-11 | Record source, organization, contact, and notes only |
| Reporting | Dashboard read API | #12 TASK-12 | Read-only aggregate for today bookings, faults, and work orders |
| Reporting | Basic analytics API | #13 TASK-13 | Basic utilization and count metrics only |
| Frontend Foundation | React + TypeScript frontend scaffold | #14 TASK-14 | Runnable app with pages, components, and services structure |
| Frontend Dashboard | Dashboard page | #15 TASK-15 | Uses dashboard API and displays V1 operational state |
| Frontend Resource | Zone management page | #16 TASK-16 | Displays Zone list, detail, and current bookings |
| Frontend Resource | Device management page | #17 TASK-17 | Displays Device list, status, and zone association |
| Frontend Scheduling | Booking management page | #18 TASK-18 | Manages ZoneBooking, DeviceBooking, and VisitBooking |
| Frontend Integration | API service layer | #19 TASK-19 | Centralizes frontend API calls and errors |
| Frontend UI | Shared UI components | #20 TASK-20 | Provides Timeline, Status Badge, and Table primitives |

## Dependency Order

1. #1 and #2 establish backend and schema foundations.
2. #3 and #4 establish resource models.
3. #5 establishes conflict logic before #6 and #7.
4. #6, #7, and #8 establish scheduling workflows.
5. #9, #10, #11, #12, and #13 complete operations and reporting APIs.
6. #14 and #19 establish frontend foundation and API integration.
7. #20 provides shared UI components before page-heavy work.
8. #15, #16, #17, and #18 complete V1 frontend pages.

## Non-Goals Guardrail

The 20 Issues must not introduce:

- CRM workflow expansion
- ERP features
- IoT integration
- AI product features
- microservice architecture
- a unified Reservation abstraction
