English · [日本語](README.md)

# Invisible Clicks - Clickjacking Attack Experience Tool

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/invisible-clicks?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/invisible-clicks?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/invisible-clicks)
![GitHub license](https://img.shields.io/github/license/ipusiron/invisible-clicks)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/invisible-clicks/)

**Day058 - 100 Security Tools with Generative AI**

Invisible Clicks is an educational browser demo for learning how clickjacking works.
A transparent click target and a schematic illustration of iframe-based attacks let you compare visible controls with the elements that receive clicks.
Actions only produce log entries: the demo does not delete real data or load external iframes.

The interface and screenshots are currently in Japanese. This README provides the English explanation.

---

## 🌐 Demo

👉 **[https://ipusiron.github.io/invisible-clicks/](https://ipusiron.github.io/invisible-clicks/)**

Try it directly in your browser.

---

## 📸 Screenshots

> ![Transparent overlay attack demonstration](assets/screenshot.png)
>
> *Transparent overlay attack demonstration (Japanese interface)*

---

## ✨ Features and usage

### The four tabs

- 📚 Basics (基礎学習): concepts and attack techniques
- 🎯 Attack demo (攻撃体験デモ): observe click targets using elements in the same page
- 🧠 Attack theory (攻撃理論): conditions required for attacks and code examples, in expandable sections
- 🛡️ Defenses (対策): roles, limitations, and an implementation checklist, in expandable sections

### Using the attack demo

1. Open the Attack demo tab and select a mode.
   - Transparent overlay attack: places a transparent click target over the visible “👍 いいね！” (Like) button.
   - Iframe embedding (schematic demo): displays a same-page illustration representing controls inside an iframe.
   - Disable attack: hides the fake-site panel and shows only the legitimate-UI illustration.
2. Press the fake site's Like button with a mouse or touch input and check the simulated action in the log.
3. Compare this with pressing the delete button directly in the legitimate UI. No mode deletes real data.
4. Use “ログを消す” (Clear log), then try another mode.

The log keeps the latest 100 entries, with older entries at the top and new entries appended at the bottom.
Closing the page discards the log.
The 300 ms delay before an attack's simulated result is an educational effect for observing the order of events.
Changing mode, switching tabs, or clearing the log cancels pending display updates.
This does not mean that an action already performed on a real website can be undone.

### Keyboard controls

Switch tabs with the Left/Right arrow keys and Home/End.
Use Tab to focus buttons and Enter or Space to activate them.
The transparent overlay receives mouse and touch clicks, so activating the Like button with the keyboard is logged as a normal Like.
This illustrates a difference between input methods in this demo; it does not imply that keyboard input prevents every form of clickjacking.

## ⚠️ Scope and limitations of the demo

The iframe mode is a schematic demo built from ordinary `div` elements.
It does not reproduce a real iframe, a cross-origin page, login state, or embedding restrictions enforced by HTTP response headers.
Operating this demo cannot determine whether another website is vulnerable or correctly protected.

Demo interactions do not transmit data externally, load external iframes, or request camera or microphone permission.
Logs are kept only in page memory, without persistent browser storage.
Opening a reference link takes you to the linked website.

The page's meta CSP restricts resource sources and similar behavior; it does not prohibit other sites from embedding this page.
Embedding restrictions using `frame-ancestors` and X-Frame-Options require HTTP response headers.
Putting those restrictions in meta tags does not enforce them.

## 📖 Technical guide

See the dedicated guide for the conditions that enable clickjacking and the roles of defenses.

👉 [Clickjacking technical guide (Japanese)](CLICKJACKING-GUIDE.md)

### Topics covered

- Attack techniques: classic clickjacking, likejacking, and cursorjacking
- HTTP-header embedding restrictions and how their role differs from CSRF protection
- Limitations of SameSite, frame-busting code, and confirmation dialogs
- Implementation checklist and observations using developer tools

For exercises using real iframes, see the [PortSwigger Web Security Academy clickjacking material](https://portswigger.net/web-security/learning-paths/clickjacking).

## 🎯 Use cases

- Classes and self-study: compare visible buttons with the elements receiving clicks, and observe how transparent elements can remain interactive.
- UI design and internal training: explain mouse, touch, and keyboard differences. This is not a tool for assessing a real service's vulnerabilities.
- Learning about internet use at home: use the built-in mock screens to explore cases where an apparent action differs from its result.
- Understanding technical articles: distinguish CSRF protection, embedding restrictions, and authentication using the guide and primary sources, then proceed to external labs if needed.

## 🛠 Development

### Technology stack

- TypeScript: UI and demo-state management
- Vite: development HTTP server and production build
- HTML: expandable sections using `<details>`
- CSS: grid, flexbox, and custom properties
- Node.js built-in test runner: regression tests
- GitHub Pages: static hosting

### Setup

Use Node.js 22.18 or later.
If dependencies are not installed, review the packages before installing them.

```bash
npm install
npm run dev
```

Open the local HTTP URL shown by the server.
Automatic updates are disabled to preserve the CSP's network restrictions during development.
Reload the browser manually after editing.
Neither the root `index.html` nor the built `docs/index.html` supports direct opening through `file://`.

### Validation and build

```bash
npm test
npm run typecheck
npm run build
npm run preview
```

`npm test` runs regression tests using Node.js built-ins and does not require development dependencies.
`npm run typecheck` checks TypeScript types.
`npm run build` also checks types before generating production files in `docs/`.
Inspect the generated site through the preview HTTP server at `http://localhost:4173/invisible-clicks/`.
GitHub Pages serves the `docs/` directory on the main branch.

Automated tests and real-browser checks are separate.
Also check click targets, keyboard behavior, layouts at different widths, and console errors in a browser using the [development procedure (Japanese)](DEVELOPMENT.md).

### Development notes

Implementation constraints and verification steps are documented in [DEVELOPMENT.md (Japanese)](DEVELOPMENT.md).

---

## 🧪 Tests

Run `npm test` with Node.js 22.18 or later.
The tests use only Node.js built-ins, so installing dependencies is unnecessary.
They check state and cancellation, UI events, educational HTML, documentation, colors, and formatting.
GitHub Actions runs the same tests on push and pull_request.
Actual browser rendering and tap behavior are checked separately from these automated tests.

## 📁 Directory structure

```text
invisible-clicks/                 # Project root
├── .gitignore                   # Generated files and local settings
├── .github/                     # GitHub configuration
│   └── workflows/               # Automated checks
│       └── test.yml             # Node.js regression tests
├── src/                         # TypeScript sources
│   ├── main.ts                  # Tabs, controls, and log rendering
│   └── demo-state.ts            # Modes and pending simulated actions
├── test/                        # Node.js built-in regression tests
│   ├── support/                 # Test support
│   │   └── dom.js               # DOM stub and UI test helpers
│   ├── state.test.js            # Mode changes and cancellation
│   ├── html.test.js             # Educational HTML and CSP structure
│   ├── readme.test.js           # Documentation/implementation consistency
│   ├── readme-en.test.js        # Japanese/English README consistency
│   ├── contrast.test.js         # Foreground/background combinations
│   ├── format.test.js           # Source formatting
│   └── ui.test.js               # UI actions and display state
├── docs/                        # Production build for GitHub Pages
│   ├── .nojekyll                # Disable Jekyll processing
│   ├── index.html               # Production HTML
│   └── assets/                  # Generated static files
│       ├── index-*.js           # Bundled JavaScript
│       └── index-*.css          # Bundled CSS
├── public/                      # Files copied unchanged during build
│   └── .nojekyll                # Jekyll-disable file for deployment
├── assets/                      # README images
│   └── screenshot.png          # Transparent overlay demo
├── index.html                   # UI and educational code examples
├── style.css                    # Layout and colors
├── vite.config.ts               # Base path and build configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
├── package-lock.json            # Locked npm dependencies
├── CLAUDE.md                    # Development-agent constraints
├── DEVELOPMENT.md               # Maintenance and verification procedure
├── CLICKJACKING-GUIDE.md         # Attack mechanisms and defenses
├── LICENSE                      # MIT license
├── README.en.md                 # English README
└── README.md                    # Japanese README
```

---

## 💻 Requirements

- Display and interaction: a browser supporting JavaScript and ES Modules, accessed through HTTP or HTTPS
- Local tests: Node.js 22.18 or later
- Development and build: TypeScript and Vite as recorded in the lockfile

Direct `file://` access is unsupported.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🛠 About this tool

This tool is part of the “100 Security Tools with Generative AI” project.
The project creates and publishes security-related tools over 100 days with AI assistance.

For project details and other tools, see:

🔗 [Project overview (Japanese)](https://akademeia.info/?page_id=42163)
