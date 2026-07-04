# Project Journal: Budgie

## Stack
- SvelteKit 2 + TypeScript + Vite + `@vite-pwa/sveltekit`
- PWA (standalone, iOS + Android)
- Playwright for e2e tests
- Metagross color theme (dark navy/steel blues, teal accent)

## Key Decisions

### PWA Setup
- Used `@vite-pwa/sveltekit` over raw `vite-plugin-pwa` for SvelteKit integration
- Auto-injection of manifest/SW `<link>` doesn't work in dev mode (SvelteKit bypasses Vite HTML pipeline) — added `<link rel="manifest">` manually in `app.html`
- Chrome requires PNG icons (not SVG) for manifest `icons` array
- Service worker registered manually via `onMount` in layout (`/dev-sw.js?dev-sw` in dev, `/sw.js` in prod)

### Fullscreen / Safe Areas
- `viewport-fit=cover` + `apple-mobile-web-app-status-bar-style=black-translucent` for edge-to-edge
- **Critical:** `html, body { height: 100vh }` — NOT `height: 100%` or `100dvh`
  - `100%` breaks `viewport-fit=cover` in iOS PWA (background never extends behind safe areas)
  - `100dvh` reports wrong values on PWA cold start
  - `100vh` is the only value that works from cold start on iOS PWA
- Removed all `env(safe-area-inset-bottom)` usage — not needed when body extends to full screen
- Tab bar is position: fixed, bottom: 36px (floating pill), no safe-area offset

### Tab Bar
- Floating pill design: border-radius 28px, backdrop-filter blur, semi-transparent background
- Position: fixed at bottom: 36px, horizontally centered
- Gap: 48px between Home and Accounts tabs
- No safe-area padding — content can extend behind it naturally

### Accounts Page
- Sliver/parallax header with nature image + gradient overlay
- Cards stack with account icon, label, currency + formatted balance
- Top Up / Move buttons per card
- `formBalance()` formats with commas, 2 decimals, currency code prefix

## Open Issues / Nuances
- iOS PWA `env(safe-area-inset-bottom)` is 0 on cold start, updates unpredictably — avoid relying on it
- Manifest auto-injection broken in dev mode for SvelteKit
- Possible: duplicate viewport meta tags cause `viewport-fit=cover` to be ignored
- `env()` vs `constant()` for iOS < 11.2 (both may be needed for ancient iOS compat)

## Zed Integration
- opencode integrated via ACP in `~/.config/zed/settings.json`
- Launch with `agent: new thread` in Zed Command Palette

## Remote
- `git@github.com:SiegfredRodriguez/budgie.git` (master)
