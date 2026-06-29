# ZNF-Portal Governance

## L4 Authority

L4 is the project governance approver for changes that affect architecture, schema, authentication, deployment, runtime behavior, or blocking CI behavior.

For this repository, L4 approval may be granted by:

- the repository owner
- a maintainer with merge permission
- an explicitly delegated reviewer named in the Pull Request

## Requesting L4 Approval

When L4 approval is required, the Pull Request must include:

- the affected decision
- why L4 approval is required
- risk level
- rollback plan
- validation evidence

The requester must add `Approval Required: L4` to the PR body.

## Recording L4 Approval

L4 approval must be recorded in one of these ways:

- an approving GitHub PR review from an L4 approver
- a PR comment containing `L4 approved`
- a linked Issue comment containing `L4 approved`

The PR body should link to the approval record when possible.

## Default Rule

If L4 approval is required and no approval record exists, the default decision is deny.

## Bootstrap Rule

The initial multi-agent and L5 governance PR may be treated as a bootstrap exception if the exception is recorded in:

```text
docs/l5/AGENT_REWRITE_LOG.md
```
