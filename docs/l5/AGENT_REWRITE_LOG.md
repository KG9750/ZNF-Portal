# Agent Rewrite Log

This file records all changes to agent instructions.

## 2026-06-29 - Bootstrap L5 Governance Exception

### Agent
Planner / Builder / Reviewer / CI / L5

### Reason
The repository needed an initial governance baseline before normal L5 mutation rules could govern future changes.

### Evidence
PR #21 introduced the first multi-agent instructions, L5 governance files, runtime entrypoint, workflow templates, and CI scaffolding before these rules existed on `main`.

### Change
Treat PR #21 as a bootstrap exception to the normal `1 Issue = 1 Branch = 1 PR` and `feature/task-*` branch policy. Future changes must follow the documented governance rules unless a new L4-approved exception is recorded.

### Risk
Medium

### Rollback
Revert PR #21 or replace this bootstrap entry with an L4-approved governance baseline.

## Format

```md
## YYYY-MM-DD - Change Title

### Agent
Planner / Builder / Reviewer / CI / L5

### Reason
Why the change was needed.

### Evidence
CI failure, review pattern, repeated issue, or manual decision.

### Change
What instruction was changed.

### Risk
Low / Medium / High

### Rollback
How to revert.
```
