# Unit tests

Unit tests are grouped by feature under this directory. Keep shared test
fixtures and helpers in `src/tests/support/` when they are reused by more than
one feature.

Naming convention:

- `src/tests/<feature>/<module>.test.ts` for pure TypeScript modules.
- `src/tests/<feature>/<component>.test.tsx` for React components.

Run all unit tests with `pnpm test:unit` or use `pnpm test:unit:watch` during
development.
