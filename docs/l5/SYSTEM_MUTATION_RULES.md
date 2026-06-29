# L5 System Mutation Rules

## Allowed Mutations

L5 may propose changes to:

- Agent instructions
- Issue templates
- PR templates
- CI steps
- Documentation structure
- Review checklists
- Workflow rules

## Restricted Mutations

L5 may not directly change the following without L4 approval:

- Database schema
- API architecture
- Authentication
- Deployment
- Core domain model
- Major module boundaries

## Mutation Levels

| Level | Description | Approval |
|---|---|---|
| L5-A | Documentation or wording update | Reviewer approval |
| L5-B | Agent instruction update | Reviewer approval |
| L5-C | CI rule update | L4 approval if blocking behavior changes |
| L5-D | Architecture or schema change | L4 approval required |
| L5-E | Production behavior change | L4 approval required |

## Rollback Rule

Every mutation PR must describe how to roll back the change.
