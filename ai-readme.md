# AI Learnings: iOS PWA Fullscreen & Safe Area

## The Problem

In PWA standalone mode on iOS, a "chin" (small gap / different-colored bar) appears at the bottom of the screen, even though `viewport-fit=cover` and `apple-mobile-web-app-status-bar-style=black-translucent` are set. The same page looks correct in desktop Safari.

## Root Cause: The Height Declaration Trap

The single most common cause of the bottom chin in iOS PWA is using `height: 100%` on `html` and `body`.

| Declaration | Behaviour in iOS PWA |
|---|---|
| `height: 100%` | **Broken** — content never extends behind the safe areas (notch, home indicator). The background leaves a gap at the bottom. |
| `height: 100dvh` | **Wrong on cold start** — reports viewport height **excluding** the bottom safe area inset (~34px). Only corrects itself after rotating portrait ↔ landscape. |
| `height: 100vh` | **Correct** — fills the full physical screen including safe areas from cold start. |

**Fix:** `html, body { height: 100vh; }` instead of `height: 100%`.

Reference: [iPhone PWA Game Guide (gist)](https://gist.github.com/fozzedout/5e77925381991a9570151550992baf14)

## Why This Matters

- `viewport-fit=cover` tells iOS to extend the viewport behind the notch/home indicator, but **`height: 100%` prevents the background from actually covering those areas** because `100%` resolves to the "safe" viewport height, not the physical screen height.
- `100vh` resolves to the physical screen height in PWA mode, so the background extends edge-to-edge correctly.
- `100dvh` (dynamic viewport height) is unreliable in PWA mode — it reports wrong values on cold start.

## How Other PWAs Handle This

The established pattern for iOS PWA fullscreen is:

1. `viewport-fit=cover` in the viewport meta tag
2. `apple-mobile-web-app-status-bar-style: black-translucent` for edge-to-edge status bar
3. `html, body { height: 100vh; }` to cover the full physical screen
4. `env(safe-area-inset-*)` only on interactive/padded elements (not on the root background elements)

## Tab Bar & Safe Area Pattern

- The floating tab bar uses `position: fixed; bottom: 12px` — no `env(safe-area-inset-bottom)` is needed because the body background already extends behind the home indicator.
- The 12px gap below the tab bar is intentional visual float space, not a chin.
- Content is allowed to scroll behind the tab bar (no `padding-bottom` on the content area).

## Meta Tags Required for iOS PWA

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#1a2645" />
```

## Potential Pitfalls

- **Duplicate viewport meta tags** — multiple viewport tags cause iOS to ignore `viewport-fit=cover`. Only one `<meta name="viewport">` must exist.
- **`env()` not defined on older iOS** — `env(safe-area-inset-bottom)` is undefined (not `0px`) on iOS < 11.2. Always provide a fallback: `env(safe-area-inset-bottom, 0px)`.
- **`constant()` vs `env()`** — iOS 11.0–11.1 used `constant(safe-area-inset-bottom)`. `env()` was added in iOS 11.2. Both may be needed for full backward compatibility, though iOS 11 is now rare.
- **Auto-injection of manifest/`<link>` in dev mode** — `@vite-pwa/sveltekit` auto-injects the manifest link via `virtual:pwa-info`, but SvelteKit's dev server bypasses Vite's HTML transform, so it only works in production builds. Add the `<link rel="manifest">` tag manually in `app.html` for dev.
- **Chrome PWA installability** — Chrome requires PNG icons (not SVG) for the manifest `icons` array. `purpose: "any maskable"` is also required for the adaptive icon on Android.
