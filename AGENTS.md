# AGENTS.md

Slidev is a Markdown-to-slides tool: a Node CLI starts a Vite server that turns `slides.md` into a Vue app. This is the pnpm monorepo for the CLI, the client app, the parser, the VS Code extension and the docs. Human-facing guide: `CONTRIBUTING.md`.

## Layout

- `packages/slidev` (`@slidev/cli`): Node side. CLI in `node/cli.ts`, Vite plugins in `node/vite/`, markdown-it syntax in `node/syntax/`, `#slidev/*` virtual modules in `node/virtual/`. The bin runs `dist/`.
- `packages/client` (`@slidev/client`): the browser Vue app. It has no build: it ships as raw `.ts`/`.vue`, which users' Vite compiles. Every file is public surface, so it must stay browser-safe (no Node APIs). `client/setup/` is browser-side; `slidev/node/setups/` is Node-side, and some file names repeat.
- `packages/parser`: parses `slides.md`. `core`/`utils` are browser-safe; `fs` adds Node file I/O.
- `packages/types`: shared types. `packages/vscode`: the extension. `packages/create-app`, `create-theme`: `npm init slidev` scaffolds.
- `demo/starter`: the deck `pnpm demo:dev` serves. `docs/`: VitePress site. `test/`: cross-package tests and fixtures. `cypress/`: e2e.

## Commands (pnpm only; Node LTS like CI, >= 22.12)

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
- `pnpm test <path>` does not narrow the run (the script is `vitest test`, and `test` already matches everything). Use `pnpm vitest run <path>`.
- On non-LTS Node (e.g. 25), `pnpm verify` exits 1 on one PlantUML inline snapshot in `packages/slidev/node/syntax/integration.test.ts`: `plantuml-encoder` uses Node's bundled zlib, so the encoded string differs. That is the environment, not your change. Switch to LTS; don't update that snapshot.
- `pnpm dev` only watch-builds packages and serves nothing. To see slides, use `pnpm demo:dev`. For the docs site use `pnpm run docs`: plain `pnpm docs` is a pnpm built-in and never reaches the script.
- E2E: `pnpm cy:fixture` (serves `cypress/fixtures/basic` on :3041), then `pnpm cy`.

## Conventions

- Tests sit next to the code as `<module>.test.ts` (Vitest, mostly `toMatchInlineSnapshot`). Cross-package tests and the `.snap` files are in `test/`, with fixtures in `test/fixtures/`. A fix or feature in `parser`, `slidev/node` or `vscode` comes with a colocated test case. `client` UI has no component tests, so check it in `pnpm demo:dev`.
- `test/api-snapshots.test.ts` snapshots the built public API of `@slidev/parser` and `@slidev/types` (tsnapi). If you changed exports on purpose, rebuild and then run `pnpm vitest run test/api-snapshots.test.ts -u`.
- Dependencies go through pnpm catalogs in `pnpm-workspace.yaml`: write `"catalog:<name>"` (`prod`, `frontend`, `dev`, `types`, …), never a semver range, and use `workspace:*` for sibling packages. Runtime deps must not use `catalog:dev`.
- Node-side paths use `pathe`, not `node:path`. CI runs on Windows too.
- A new `#slidev/*` virtual module takes three edits: a file in `packages/slidev/node/virtual/`, an entry in `node/virtual/index.ts`, and a `declare module` in `packages/types/client.d.ts`.
- Adding or removing a layout in `packages/client/layouts/` means regenerating `packages/types/src/builtin-layouts.ts` with `pnpm tsx scripts/gen-layouts.ts`, then running `pnpm lint --fix`.
- A user-facing feature or behavior change updates both `docs/` and the matching `skills/slidev/references/*.md`. The skill ships inside `@slidev/cli`.
- Commits and PR titles use Conventional Commits with a package scope, e.g. `fix(client): ...` or `feat(parser): ...`. The pre-commit hook runs `eslint --fix` on staged files.

## Guardrails

- Don't hand-edit generated files. Edit the source, then regenerate:
  - `packages/*/dist`: `pnpm build`
  - `pnpm-lock.yaml`: `pnpm install` / `pnpm add`
  - `test/__snapshots__/**`: `pnpm vitest run <file> -u`
  - `packages/types/src/builtin-layouts.ts`: see Conventions
  - `packages/vscode/schema/*.json`, from `packages/types/src/frontmatter.ts`: `pnpm -C packages/vscode run prepare`
  - `docs/components.d.ts`: rewritten by `pnpm run docs`
- `patches/` is applied through `patchedDependencies`; change it only with `pnpm patch`. Leave the commented `overrides` in `pnpm-workspace.yaml` alone.
- `version` fields and the `@slidev/*` ranges in `create-*/template/package.json` are bumped by `pnpm release`, which is maintainer-only. Never run `pnpm release`, `pnpm ci:publish`, or `scripts/pack.mjs` (it rewrites every `packages/*/package.json` to `file:` deps).
- Don't use npm or yarn, and don't create a `package-lock.json`. The `catalog:` protocol only resolves under pnpm.
- Treat decks (`slides.md`, headmatter, themes, addons) as untrusted input. A new deck-driven file read or write must check `isPathInsideRoots` (`packages/slidev/node/utils.ts`; in the parser, `packages/parser/src/fs.ts`), and every `parser.load` call must pass `allowedRoots`. Add an escape-path case to `test/import-guard.test.ts` or `packages/slidev/node/utils.test.ts`.
- The dev server has no server-side auth, and `--remote` binds `0.0.0.0`. Don't add HTTP, WebSocket or `/__mcp` handlers that touch arbitrary paths, and don't widen `server.fs.allow`. Spawn processes with `execFile` and an argv array, as `node/cli.ts` does, never a shell string.
- `plans/` holds design plans for maintainers and isn't product code. Edit a plan file only when executing that plan.
