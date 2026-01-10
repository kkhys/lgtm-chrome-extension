# LGTM Chrome Extension

> One-click Chrome extension to copy LGTM images to your clipboard

## Overview

LGTM Chrome Extension is a browser extension that makes it easy to insert LGTM images during code reviews. Simply click the extension icon, and the HTML code for a randomly selected LGTM image is automatically copied to your clipboard.

## Features

- **One-Click Operation** - Just click the extension icon
- **Random Selection** - Randomly picks from a rich image library
- **Instant Copy** - Automatically copies HTML to clipboard
- **Visual Feedback** - Shows a checkmark badge on the icon for 2 seconds after copying
- **GitHub-Only Activation** - Works exclusively on GitHub.com domains for focused usage
- **Lightweight & Fast** - Simple design for quick performance
- **Privacy-Focused** - Uses only minimal required permissions

## Installation

### From Chrome Web Store (Coming Soon)

_Currently in preparation for Chrome Web Store publication_

### Manual Installation

1. Download the latest `.zip` file from [Releases](https://github.com/kkhys/lgtm-chrome-extension/releases)
2. Extract the file
3. Open `chrome://extensions/` in Chrome
4. Enable "Developer mode" in the top right
5. Click "Load unpacked"
6. Select the extracted folder

## Usage

1. Navigate to any GitHub page (e.g., pull request, issue, discussion)
2. Click the extension icon in the toolbar
3. A green checkmark (✓) badge appears on the icon for 2 seconds
4. LGTM image HTML code is automatically copied to your clipboard
5. Paste it into comments on GitHub

**Note**: The extension icon is only enabled on GitHub.com domains. On other websites, the icon will be greyed out.

**Generated HTML format:**
```html
<a href="https://lgtm.kkhys.me/{id}">
  <img src="https://lgtm.kkhys.me/{id}.avif" alt="LGTM!!" width="400" />
</a>
```

## Development

### Requirements

- Node.js 24.12.0 (automatically managed by Volta)
- pnpm 10.28.0

### Setup

```bash
# Clone the repository
git clone https://github.com/kkhys/lgtm-chrome-extension.git
cd lgtm-chrome-extension

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Loading the Extension for Development

1. Run `pnpm build` to generate the `dist/` folder
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder
5. Navigate to GitHub.com to test (icon will be enabled there)

### Available Commands

```bash
# Development
pnpm dev              # Start Vite dev server with hot reload

# Build
pnpm build            # Production build (dist/ + release ZIP)

# Code Quality
pnpm check            # TypeScript type checking
pnpm lint             # Biome linting
pnpm lint:fix         # Lint with auto-fix

# Testing
pnpm test             # Run all tests
pnpm test:coverage    # Run tests with coverage report

# All-in-One
pnpm all              # Build + type check + lint + test (full pipeline)
```

### Project Structure

```
lgtm-chrome-extension/
├── src/
│   ├── background.ts          # Main logic (Chrome extension background worker)
│   ├── config/
│   │   └── constants.ts       # API configuration constants
│   └── __tests__/
│       └── background.test.ts # Unit tests
├── public/
│   └── logo.png              # Extension icon
├── manifest.config.ts         # Chrome Manifest v3 configuration
├── vite.config.ts            # Vite build configuration
└── package.json              # Project configuration
```

## Tech Stack

- **Language**: TypeScript 5.9.3 (full strict mode enabled)
- **Build Tool**: Vite 7.3.1 + @crxjs/vite-plugin
- **Code Quality**: Biome 2.3.11 (formatter + linter)
- **Testing**: Vitest 4.0.16 + @vitest/coverage-v8
- **Runtime**: Node.js 24.12.0 (managed by Volta)
- **Package Manager**: pnpm 10.28.0

## API Integration

This Chrome extension integrates with the [LGTM Image Service](https://lgtm.kkhys.me).

- **Endpoint**: `https://lgtm.kkhys.me/api/ids.json`
- **Image Format**: AVIF (optimized next-generation image format)

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
pnpm vitest run src/__tests__/background.test.ts

# Watch mode (for development)
pnpm vitest watch
```

**Test Coverage**: 433 lines of test code covering 20 test cases:
- API communication success/failure scenarios
- Random selection logic
- HTML generation accuracy
- Clipboard operations
- Badge display and auto-clear functionality
- Error handling
- End-to-end integration flow

## License

MIT License - See [LICENSE.md](LICENSE.md) for details.

Copyright (c) 2026 Keisuke Hayashi

## Author

**Keisuke Hayashi** ([@kkhys](https://github.com/kkhys))

## Links

- [LGTM Image Service](https://lgtm.kkhys.me)
- [Issues](https://github.com/kkhys/lgtm-chrome-extension/issues)
- [Releases](https://github.com/kkhys/lgtm-chrome-extension/releases)
