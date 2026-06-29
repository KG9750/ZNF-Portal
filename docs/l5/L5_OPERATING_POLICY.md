# L5 Operating Policy

## Purpose

This policy governs the Self-Evolution System.

## Core Principle

L5 improves the development system, not the product directly.

## Approval Rules

- Documentation improvements may be approved by Reviewer.
- Agent prompt changes may be approved by Reviewer.
- CI behavior changes require L4 approval if they block merging.
- Schema, architecture, auth, deployment, or runtime behavior changes require L4 approval.

L4 authority, request flow, and approval records are defined in:

```text
docs/GOVERNANCE.md
```

## Audit Rule

Every accepted L5 change must be recorded in:

```text
docs/l5/AGENT_REWRITE_LOG.md
```

## Non-Negotiable V1 Boundaries

For ZNF-Portal V1:

- No CRM expansion
- No ERP system
- No IoT platform
- No AI product features
- No microservice architecture
- No unified Reservation abstraction
