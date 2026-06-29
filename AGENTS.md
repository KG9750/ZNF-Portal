# ZNF-Portal Agent Runtime Entry

## Purpose

This file is the repository entrypoint for human operators and AI coding agents.

Agents must read this file before working on Issues, Pull Requests, reviews, or workflow changes.

## Required Read Order

1. `README.md`
2. `docs/GIT_CODEx_STANDARDS.md`
3. Role-specific agent file:
   - Planner: `docs/agents/PLANNER.md`
   - Builder: `docs/agents/BUILDER.md`
   - Reviewer: `docs/agents/REVIEWER.md`
   - CI: `docs/agents/CI_AGENT.md`
4. L5 governance files:
   - `docs/l5/L5_OPERATING_POLICY.md`
   - `docs/l5/SYSTEM_MUTATION_RULES.md`
   - `docs/l5/AGENT_REWRITE_LOG.md`

## Runtime Mapping

- Codex or Claude acting as Planner must only decompose Issues.
- Codex or Claude acting as Builder must only implement approved scope.
- Codex or Claude acting as Reviewer must only evaluate changes and request fixes.
- GitHub Actions acts as the CI Agent and must only run validation checks.

## Development Gate

Formal product development must start from a GitHub Issue with acceptance criteria.

Every implementation PR must include:

- Issue link
- Scope
- Not included
- Validation
- Risk level
- Rollback plan

## L5 Gate

L5 proposals may improve the engineering workflow, but they must not directly change product behavior, database schema, deployment, authentication, or architecture without L4 approval.
