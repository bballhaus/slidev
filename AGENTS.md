# AGENTS.md

Slidev is a Markdown-to-slides tool: a Node CLI starts a Vite server that turns `slides.md` into a Vue app. This is the pnpm monorepo for the CLI, the client app, the parser, the VS Code extension and the docs. Human-facing guide: `CONTRIBUTING.md`.

## Layout

- `packages/slidev` (`@slidev/cli`): Node side. CLI in `node/cli.ts`, Vite plugins in `node/vite/`, markdown-it syntax in `node/syntax/`, `#slidev/*` virtual modules in `node/virtual/`. The bin runs `dist/`.
- `packages/client` (`@slidev/client`): the browser Vue app. It has **no build**: it ships as raw `.ts`/`.vue`, which users' Vite compiles. Every file is public surface, so it must stay browser-safe (no Node APIs). `client/setup/` is browser-side; `slidev/node/setups/` is Node-side, and some file names repeat.
- `packages/parser`: parses `slides.md`. `core`/`utils` are browser-safe; `fs` adds Node file I/O.
- `packages/types`: shared types. `packages/vscode`: the extension. `packages/create-app`, `create-theme`: `npm init slidev` scaffolds.
- `demo/starter`: the deck `pnpm demo:dev` serves. `docs/`: VitePress site. `test/`: cross-package tests and fixtures. `cypress/`: e2e.

## Commands (pnpm only; Node >= 22.12)

```bash
CYPRESS_INSTALL_BINARY=0 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install   # skip browser downloads unless doing e2e/export
pnpm build                                           # turbo -> tsdown, writes packages/*/dist
pnpm test                                            # all Vitest projects (packages/* + test/)
pnpm vitest run packages/parser/src/utils.test.ts    # one file; add -u to update snapshots
pnpm typecheck                                       # vue-tsc --noEmit
pnpm lint --fix                                      # ESLint also formats, Markdown included
pnpm verify                                          # build -> typecheck -> lint -> test, the full gate
pnpm demo:dev                                        # run a real deck from demo/starter
```

- Build before testing or typechecking. Workspace packages resolve to `dist/`, so tests fail with `Cannot find package '@slidev/parser/utils'` if it's missing and run stale code if it's old. Rebuild after editing `slidev`, `parser` or `types` (not needed for `client`).
- `pnpm test <path>` does **not** narrow the run (the script is `vitest test`, and `test` already matches everything). Use `pnpm vitest run <path>`.
- `pnpm dev` only watch-builds packages and serves nothing. To see slides, use `pnpm demo:dev`.
- E2E: `pnpm cy:fixture` (serves `cypress/fixtures/basic` on :3041), then `pnpm cy`.

## Conventions

- Tests sit next to the code as `<module>.test.ts` (Vitest, mostly `toMatchInlineSnapshot`). Cross-package tests and the `.snap` files are in `test/`, with fixtures in `test/fixtures/`.
- `test/api-snapshots.test.ts` snapshots the built public API of `@slidev/parser` and `@slidev/types` (tsnapi). If you changed exports on purpose, rebuild and then run `pnpm vitest run test/api-snapshots.test.ts -u`.
- Dependencies go through pnpm catalogs in `pnpm-workspace.yaml`: write `"catalog:<name>"` (`prod`, `frontend`, `dev`, `types`, …), never a semver range, and use `workspace:*` for sibling packages. Runtime deps must not use `catalog:dev`.
- Node-side paths use `pathe`, not `node:path`. CI runs on Windows too.
- A new `#slidev/*` virtual module takes three edits: a file in `packages/slidev/node/virtual/`, an entry in `node/virtual/index.ts`, and a `declare module` in `packages/types/client.d.ts`.
- Adding or removing a layout in `packages/client/layouts/` means regenerating `packages/types/src/builtin-layouts.ts` with `pnpm tsx scripts/gen-layouts.ts`, then running `pnpm lint --fix`.
- A user-facing feature or behavior change updates `docs/` **and** the matching `skills/slidev/references/*.md`. The skill ships inside `@slidev/cli`.
- Commits and PR titles use Conventional Commits with a package scope, e.g. `fix(client): ...` or `feat(parser): ...`. The pre-commit hook runs `eslint --fix` on staged files.

## Guardrails

- Don't hand-edit: `packages/*/dist`, `pnpm-lock.yaml`, `test/__snapshots__/**`, `packages/types/src/builtin-layouts.ts`, `packages/vscode/schema/*.json`, `docs/components.d.ts`. Edit the source or generator and regenerate.
- `patches/` is applied through `patchedDependencies`; change it only with `pnpm patch`. Leave the commented `overrides` in `pnpm-workspace.yaml` alone.
- `version` fields and the `@slidev/*` ranges in `create-*/template/package.json` are bumped by `pnpm release`, which is maintainer-only. Never run `pnpm release`, `pnpm ci:publish`, or `scripts/pack.mjs` (it rewrites every `packages/*/package.json` to `file:` deps).
- Don't use npm or yarn, and don't create a `package-lock.json`. The `catalog:` protocol only resolves under pnpm.
- The PlantUML case in `packages/slidev/node/syntax/integration.test.ts` fails on Node 25, which bundles a different zlib. It passes on LTS, which CI uses. Don't update that snapshot unless you're on Node LTS.
- `plans/` holds design plans for maintainers and isn't product code. Edit a plan file only when executing that plan.
