@RTK.md
@HEADROOM.md
@CAVEMAN.md
@PONYTAIL.md

@.agents/skills/caveman/SKILL.md

# AGENTS.md

**Usage**: Context routing for Codex-powered AI agents.

## File Structure

- `AGENTS.md`: Global routing rules
- `<agent>.md`: Agent-specific instructions
- `skills/<skill>/SKILL.md`: Reusable skill instructions

## Routing Rules

| Prefix | Behavior |
|--------|----------|
| `@`    | Load file as context |
| `!`    | Load file as executable prompt |
| `##`   | Load file as tool definition |

## Working Phase and Scope Rules

The agent must keep work phases separate and must not switch phases without completing the current phase, receiving permission, or receiving a new request.

1. During planning, do not write production code or create unit tests.
2. During implementation, do not modify the plan or create tests.
3. During configuration work, do not modify unrelated code.
4. During a request to create unit tests or other tests, do not modify production code, except to test code that the agent has just written in the same session.
5. If an issue belongs to another phase, record it and report it to Caveman; do not resolve it automatically.

### Scope Control

6. Modify only files and components required by the task.
7. Do not refactor, optimize, restructure, or otherwise improve code outside the task. Report discovered opportunities to Caveman.
8. Do not fix pre-existing defects unless they directly block the current task.
9. Do not change architecture, conventions, directory structure, or system design without explicit approval.
10. Do not add dependencies, libraries, packages, or tools unless explicitly requested.
11. Do not infer or add unrequested features or behavior.

### Standards and Test Integrity

12. Never delete, disable, skip, weaken, or bypass tests to make them pass.
13. Never change assertions, expected values, mocks, or test data solely to fit an implementation.
14. Never change ESLint, TypeScript, compiler, build, or runtime configuration to avoid an error.
15. Do not use `any`, `@ts-ignore`, `eslint-disable`, suppression, or equivalent error-hiding mechanisms unless explicitly requested.
16. Do not change API contracts, validation, or business rules to avoid an implementation problem.
17. Do not claim completion while any requirement or verification criterion is skipped.

### Problems and Approval Boundaries

18. Stop and report when an error is outside the task scope; do not fix it automatically.
19. If the request conflicts with the current implementation, explain the conflict and wait for a decision.
20. If the task cannot be completed within scope, report completed work, incomplete work, and the reason.
21. Do not introduce workarounds that change system behavior to bypass an obstacle.
22. Obtain user approval before making changes beyond the original scope.

### File Location

Files are searched in this order:

1. Current directory
2. `.agents/`
3. `.agents/skills/<skill>/`

## Example

```markdown
# AGENTS.md

@RTK.md
@knowledge-base.md

## Code Agent

@.agents/skills/caveman/SKILL.md
```
