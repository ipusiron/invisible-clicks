# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
```bash
npm run dev      # Start Vite dev server for local development
npm run build    # Build production assets to docs/ folder
npm run preview  # Preview production build locally on port 4173
```

## Architecture

This is a clickjacking educational demo tool built with TypeScript and Vite. The application demonstrates clickjacking attacks through transparent overlays and iframe embedding.

**Key Components:**
- **src/main.ts**: Core application logic handling UI interactions, overlay toggling, and attack simulation
- **index.html**: Main demo page with dual panels showing legitimate and malicious UI overlays
- **vite.config.ts**: Build configuration outputting to docs/ folder for GitHub Pages deployment with base path "/invisible-clicks/"

**Build Output:**
The production build outputs to the `docs/` folder which is served via GitHub Pages from the main branch.