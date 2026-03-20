# CLAUDE.md

## What

Chrome Manifest v3 extension — single background service worker architecture (no popup, no options, no content scripts). The icon activates only on `*.github.com` via the declarativeContent API; on other sites it is greyed out.

## Why

One-click LGTM image pasting for GitHub PR reviews. Clicking the extension icon on GitHub fetches a random LGTM image ID from the API, generates an HTML tag, and copies it to the clipboard.

The LGTM image backend is in a separate repository (`kkhys/lgtm`).

## Project Map

| File | Role |
|------|------|
| `src/background.ts` | Single entry point — API fetch, random selection, HTML generation, clipboard copy, badge feedback |
| `src/config/constants.ts` | API base URL, endpoints, image format constants |
| `manifest.config.ts` | Chrome manifest via `@crxjs/vite-plugin` (reads version from `package.json`) |
| `vite.config.ts` | Build config with path alias and ZIP plugin |
| `src/__tests__/background.test.ts` | Vitest tests with mocked Chrome APIs |

## Conventions

- pnpm exclusively (environment: Nix Flakes + direnv)
- Path alias `#/*` maps to `src/*` — use for all internal imports
- TypeScript strict mode with `noUncheckedIndexedAccess` — always handle possible `undefined` from array indexing
- Export functions from `background.ts` for testability; write tests for new functions
- Version lives in `package.json` only — manifest and release ZIP derive from it

## External API

Endpoint: `GET https://lgtm.kkhys.me/api/ids.json` returns `{ "ids": ["id1", "id2", ...] }`

Generated HTML: `<a href="https://lgtm.kkhys.me/{id}"><img src="https://lgtm.kkhys.me/{id}.avif" alt="LGTM!!" width="400" /></a>`

## Build Output

- `dist/` — Unpacked extension for development and Chrome loading
- `release/` — ZIP for Chrome Web Store
