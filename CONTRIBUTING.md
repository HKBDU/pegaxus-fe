# Contributing

## Workflow

1. Create a branch from `dev` using the naming rules in [RULESET.md](./RULESET.md).
2. Make focused changes and update documentation when needed.
3. Run lint and build locally.
4. Open a pull request targeting `dev`.
5. Wait for the Quality workflow to pass and address review feedback.

## Local checks

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
```

## Commit and pull request conventions

Use a Conventional Commits-style message, for example:

```text
feat: add transport booking page
fix(api): handle request timeout
```

Pull request titles must pass the validation described in [RULESET.md](./RULESET.md).
