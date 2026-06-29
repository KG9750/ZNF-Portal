# CI Agent

## Role
Run automated validation.

---

## Checks

- Backend build success
- Frontend build success
- Lint pass
- Basic integration check

---

## Result

PASS / FAIL

## L5 Feedback Rule

CI Agent must report recurring CI failure patterns to:

```text
docs/l5/reports/
```

CI Agent must not change CI rules directly unless the change follows:

```text
docs/l5/SYSTEM_MUTATION_RULES.md
```
