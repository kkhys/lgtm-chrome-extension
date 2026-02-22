# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Manager
**Use pnpm exclusively** - Node.js version is managed by `.tool-versions` (asdf/mise).

### Essential Commands
```bash
# Development
pnpm dev              # Start Vite dev server with hot reload

# Build
pnpm build            # Production build → dist/ + release/lgtm-chrome-extension-{version}.zip

# Quality Checks
pnpm check            # TypeScript type checking (tsc --noEmit)
pnpm lint             # Biome check (read-only)
pnpm lint:fix         # Biome check + auto-fix

# Testing
pnpm test             # Run all Vitest tests
pnpm test:coverage    # Run tests with coverage report

# Full Pipeline
pnpm all              # Build + type check + lint fix + test with coverage
```

### Running Specific Tests
```bash
# Single test file
pnpm vitest run src/__tests__/background.test.ts

# Watch mode for development
pnpm vitest watch

# Specific test pattern
pnpm vitest run -t "fetchLgtmIds"
```

## Code Architecture

### Chrome Extension Structure
This is a Chrome Manifest v3 extension with a **single background service worker** architecture - no popup, no options page, no content scripts. The entire functionality is triggered by clicking the extension icon.

**GitHub-Only Activation**: The extension icon is enabled only on GitHub domains (*.github.com). On other websites, the icon is greyed out and non-functional.

### Execution Flow
```
Extension installed/updated
  ↓
chrome.runtime.onInstalled listener (background.ts:56-75)
  ↓
Set declarativeContent rule: Enable action only on GitHub
  ↓
User clicks extension icon (on GitHub)
  ↓
chrome.action.onClicked listener (background.ts:77)
  ↓
handleIconClick() orchestrates:
  1. fetchLgtmIds() - GET https://lgtm.kkhys.me/api/ids.json
  2. getRandomId() - Random selection from array
  3. generateLgtmHtml() - Generate <a><img></a> HTML
  4. copyToClipboard() - chrome.scripting.executeScript → navigator.clipboard
  5. showSuccessBadge() - Display "✓" badge on icon for 2 seconds
```

### Key Files

**src/background.ts** (93 lines)
- Main entry point with all core logic
- Exports 6 testable pure functions + 1 side-effect handler
- Chrome API usage: `chrome.tabs.query`, `chrome.scripting.executeScript`, `chrome.action.onClicked`, `chrome.action.setBadgeText`, `chrome.action.setBadgeBackgroundColor`, `chrome.runtime.onInstalled`, `chrome.declarativeContent`
- Implements GitHub-only activation using declarativeContent API

**src/config/constants.ts** (10 lines)
- Centralized API configuration
- `LGTM_BASE_URL`: Base URL for LGTM image service
- `API_PATHS`: API endpoints
- `IMAGE_FORMAT`: Image file extensions

**manifest.config.ts** (31 lines)
- Chrome manifest definition using `@crxjs/vite-plugin`
- Permissions: `scripting` (clipboard access), `declarativeContent` (conditional icon activation)
- Host Permissions: `*://*.github.com/*` (GitHub domains only)
- Background service worker: `src/background.ts` as ES module
- Icons: 4 sizes (16px, 32px, 48px, 128px) for various display contexts

### Path Alias Configuration
TypeScript and Vite are configured with `#/*` alias:
```typescript
import { LGTM_BASE_URL } from "#/config/constants";
```
Maps to `src/*` directory. Use this consistently for internal imports.

### External API Integration
**Endpoint**: `https://lgtm.kkhys.me/api/ids.json`
**Response Format**:
```json
{
  "ids": ["image-id-1", "image-id-2", ...]
}
```
**Generated HTML**:
```html
<a href="https://lgtm.kkhys.me/{id}">
  <img src="https://lgtm.kkhys.me/{id}.avif" alt="LGTM!!" width="400" />
</a>
```

The LGTM backend service is maintained in a sibling repository at `/Users/kkhys/projects/lgtm`.

### Build Output
- **dist/**: Unpacked Chrome extension (manifest.json, assets/, etc.)
- **release/**: ZIP file ready for Chrome Web Store (`lgtm-chrome-extension-{version}.zip`)

### TypeScript Configuration
**Extremely strict mode enabled**:
- `strict: true` (all strict family checks)
- `noUncheckedIndexedAccess: true` (array access returns `T | undefined`)
- `exactOptionalPropertyTypes: true` (no `undefined` assignment to optional properties)
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `useUnknownInCatchVariables: true` (catch variables are `unknown`, not `any`)

When accessing arrays, handle `undefined` explicitly:
```typescript
const id = ids[randomIndex];
if (id === undefined) {
  throw new Error("Unexpected error: Failed to get ID");
}
return id;
```

### Testing Strategy
**Framework**: Vitest with jsdom environment

**Mocking Pattern**: All Chrome APIs are mocked globally in tests:
```typescript
const mockChrome = {
  tabs: { query: vi.fn() },
  scripting: { executeScript: vi.fn() },
  action: {
    onClicked: { addListener: vi.fn() },
    disable: vi.fn(),
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  },
  runtime: {
    onInstalled: { addListener: vi.fn() }
  },
  declarativeContent: {
    onPageChanged: { removeRules: vi.fn(), addRules: vi.fn() },
    PageStateMatcher: class {},
    ShowAction: class {}
  }
};
globalThis.chrome = mockChrome as any;
```

**Test Coverage**: 433 lines covering 20 test cases:
- API success/failure scenarios
- Network errors
- Empty arrays
- Tab detection failures
- Badge display and auto-clear functionality
- Integration flow (fetchLgtmIds → getRandomId → generateLgtmHtml → copyToClipboard → showSuccessBadge)

When adding new functions, export them for testability and write corresponding test cases.

## Code Quality Standards

### Biome Configuration
- Formatter: 2-space indentation
- VCS integration enabled (respects .gitignore)
- No custom linting rules - using Biome defaults

### Error Handling Pattern
All async operations use try-catch with console.error:
```typescript
export const handleIconClick = async () => {
  try {
    const ids = await fetchLgtmIds();
    // ... rest of the flow
  } catch (error) {
    console.error("Copy error:", error);
  }
};
```

Individual functions throw errors; top-level handler catches them.

### Commit Guidelines
Follow Conventional Commits:
```
feat(scope): add new feature
fix(scope): fix bug
refactor(scope): refactor code
test(scope): add tests
chore(scope): update tooling
```

Examples from this project:
- `feat(script): add background worker`
- `refactor(config): extract LGTM constants`
- `chore(test): add Vitest tests`

## Chrome Extension Development Notes

### Loading in Chrome
1. Run `pnpm build` to generate dist/
2. Chrome → Extensions → Enable Developer Mode
3. Load Unpacked → Select dist/ directory
4. Navigate to GitHub (e.g., https://github.com) to test - icon will be enabled
5. Navigate to non-GitHub site - icon will be greyed out

### Development Workflow
- Use `pnpm dev` for hot reload during development
- Vite dev server serves the extension with automatic rebuilds
- Refresh extension in chrome://extensions/ after manifest changes
- **Important**: Test on GitHub domains (*.github.com) as the extension only activates there

### Debugging
- Check service worker logs: chrome://extensions/ → Inspect service worker
- Tab console shows clipboard operation results
- Network errors appear in service worker console
- Icon state (enabled/greyed out) changes automatically when navigating between GitHub and non-GitHub sites

### Version Updates
Update version in `package.json` only - manifest.config.ts reads from it automatically. The ZIP filename is also generated from package.json version.
