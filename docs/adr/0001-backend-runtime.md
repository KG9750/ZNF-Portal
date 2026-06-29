# ADR 0001: Backend Runtime

## Status

Proposed for L4 approval in TASK-01.

## Context

TASK-01 requires a runnable Node.js backend scaffold with:

- NestJS preferred or Express
- `src/modules`, `src/config`, and `src/prisma` structure
- database connection initialization
- Prisma ORM

ZNF-Portal V1 must keep architecture minimal and modular.

## Decision

Use Express + TypeScript + Prisma for the initial backend scaffold.

## Rationale

- Express satisfies the allowed backend runtime option in TASK-01.
- TypeScript provides compile-time validation without introducing a larger framework surface.
- Prisma establishes the ORM path needed by TASK-01 and TASK-02.
- The scaffold remains small enough for the first Issue and leaves V1 domain models to TASK-02.

## Consequences

- Future backend modules should be mounted under `src/modules`.
- Prisma schema changes require L4 approval when they affect V1 data model boundaries.
- If NestJS is later required, that migration must be a separate L4-approved architecture change.
