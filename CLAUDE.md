# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use Node.js 22.18 or later. The test runner uses built-in TypeScript type stripping, not a downloaded transpiler.

```bash
npm run dev      # Start Vite dev server for local development
npm test         # Run dependency-free Node.js regression tests
npm run typecheck # Check types with the installed TypeScript compiler
npm run build    # Check types, then build production assets to docs/
npm run preview  # Preview production build locally on port 4173
```

Do not install or add dependencies without approval. Type checking and building require the existing TypeScript and Vite development dependencies. Tests do not require them.

## Architecture

This is a clickjacking educational demo built with TypeScript and Vite. Both attack modes use elements in the same HTML document. The iframe-labeled mode is an illustration made with ordinary `div` elements, not a real iframe or a cross-origin attack laboratory.

- `src/main.ts`: DOM interactions, tabs, overlay display, and text-only logs
- `src/demo-state.ts`: Mode, tab, and cancellable simulated-action state
- `index.html`: Demo panels and escaped educational code examples
- `style.css`: Layout, overlay hit area, and accessible visual states
- `test/`: State, HTML, DOM-stub UI, documentation, contrast, and formatting tests
- `vite.config.ts`: Build output in `docs/`, using the `/invisible-clicks/` base path

## Behavior and safety constraints

- Deletion is a log message only. Do not add real destructive operations, arbitrary target URLs, external iframes, camera requests, or microphone requests.
- The 300 ms delay is an educational effect. Cancel pending results when the mode or tab changes or the log is cleared.
- In both modes, keyboard activation of the visible Like button remains a normal Like action. Transparent targets demonstrate pointer input, not a universal property of all input methods.
- Keep the latest 100 log entries in memory only, oldest first and newest last. Use text nodes, not concatenated `innerHTML`.
- Escape HTML shown inside `pre`/`code`. A placeholder URL does not make an iframe inert.
- Keep the transparent hit area aligned with the visible button, including its edges, and inactive outside the demo tab.
- Preserve keyboard navigation, visible focus, mobile readability, and reduced-motion support.
- Keep explanations aligned with `CLICKJACKING-GUIDE.md`. Do not claim CSRF tokens prevent clickjacking of legitimate forms. `frame-ancestors` and X-Frame-Options require HTTP response headers; meta tags do not enforce those embedding restrictions.
- Do not describe the demo as a vulnerability detector or proof that another site is protected.

## Build and verification

Edit source files, then regenerate `docs/`; do not hand-edit bundled output. GitHub Pages serves `docs/` from the main branch. Use HTTP for development and preview; opening either HTML entry point through `file://` is unsupported.

The development server disables HMR and Vite client injection to preserve `connect-src 'none'`. Reload the browser manually after editing files.

Run `npm test`, `npm run typecheck`, and `npm run build`. Type stripping in the test runner does not check types. DOM-stub tests do not verify browser layout or hit testing; follow the real-browser checklist in `DEVELOPMENT.md` before reporting those checks as passed.
