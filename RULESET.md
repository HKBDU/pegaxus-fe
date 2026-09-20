# Branching & Pull Request Ruleset

## Core branches

- `main`: production-ready code.
- `dev`: sprint integration branch.

Changes should be developed on a short-lived branch and merged into `dev`. Changes are promoted from `dev` to `main` when they are ready for release.

## Branch naming

Use one of the following prefixes:

```text
feat/<lowercase-name>
fix/<lowercase-name>
docs/<lowercase-name>
style/<lowercase-name>
refactor/<lowercase-name>
perf/<lowercase-name>
test/<lowercase-name>
build/<lowercase-name>
ci/<lowercase-name>
chore/<lowercase-name>
revert/<lowercase-name>
```

The branch suffix must contain only lowercase letters, numbers, dots, underscores, or hyphens. Use `feat/`, not `feature/`.

Valid examples:

```text
feat/login-page
fix/api-timeout
docs/setup-guide
```

Invalid examples:

```text
feature/login-page
Feat/login-page
feat/LoginPage
feat/login page
```

## Pull request titles

Pull request titles must use the Conventional Commits format:

```text
<type>: <description>
<type>(<scope>): <description>
<type>!: <description>
```

Examples:

```text
feat: add booking form
fix(auth): handle expired token
docs!: update setup instructions
```

The repository CI validates branch names and pull request titles automatically on every pull request.

## Required checks

Before merging, the pull request must pass:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
```

The CI workflow runs these checks on Node.js 20 and Node.js 22.

## Validation patterns

Branch name:

```regex
^(dev|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)/[a-z0-9]+([._-][a-z0-9]+)*)$
```

Pull request title:

```regex
^(dev|(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._-]+\))?!?: .+)
```
