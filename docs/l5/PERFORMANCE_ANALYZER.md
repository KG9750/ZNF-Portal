# L5 Performance Analyzer

## Purpose

The Performance Analyzer tracks the health of the AI development workflow.

## Metrics

| Metric | Meaning |
|---|---|
| CI failure rate | How often PRs fail CI |
| PR rework count | How often Reviewer requests changes |
| Scope violation count | How often Builder exceeds Issue scope |
| Build failure category | Backend, frontend, dependency, lint, type error |
| Issue cycle time | Time from Issue start to merge |
| Reopened issue count | Signals incomplete implementation |

## Reporting Frequency

Generate a report after every 5 merged PRs or once per week.

## Output

Reports should be written to:

```text
docs/l5/reports/
```

Report filename format:

```text
YYYY-MM-DD-evolution-report.md
```
