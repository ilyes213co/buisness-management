# GestApp — Offline-First Business Management

> Desktop + LAN multi-device management for **restaurants/snacks** and **retail boutiques**: point of sale, tables & orders, catalogue, stock, employees, purchases, cash register (*caisse*), history, reports, backups — with **thermal ticket printing** and a local network sync server. 100% offline, no cloud account, data stays on your machine.

![Status](https://img.shields.io/badge/status-v1.0.0-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Electron-blue)
![Offline](https://img.shields.io/badge/offline-100%25-success)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of contents

- [What is GestApp?](#what-is-gestapp)
- [Features](#features)
- [Screenshots](#screenshots)
- [Architecture &amp; project structure](#architecture--project-structure)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Packaging (Windows installer)](#packaging-windows-installer)
- [LAN multi-device setup](#lan-multi-device-setup)
- [Thermal printing](#thermal-printing)
- [Data, backup &amp; restore](#data-backup--restore)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Known limitations / roadmap](#known-limitations--roadmap)
- [Security &amp; licence tooling (private)](#security--licence-tooling-private)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)
- [Author](#author)

## What is GestApp?

**GestApp** is an **offline-first** management app for small businesses in Algeria (and anywhere cash + local network matters). One PC acts as the **server** (Electron app + embedded Express/WebSocket server on port `4000`); phones/tablets/other PCs on the same Wi-Fi open the same interface in a browser and work on **shared live data**. It targets two business modes selectable at setup:

| Mode | For | Includes |
|------|-----|----------|
| 🍽️ **Restaurant** (resto) | Restaurants, snacks, cafeterias | Tables &amp; orders, food menu, kitchen tickets, dine-in + takeaway flow |
| 👕 **Boutique** (retail) | Clothing / shoe / general stores | Boutique POS, product catalogue with sizes &amp; colors, barcodes, wholesale/retail prices |

Everything runs on **localhost / LAN** — no internet, no subscription, no cloud. Data is stored in a local JSON file (`gestapp-data.json`, git-ignored) with atomic writes.

## Features

- 📊 **Dashboard** — revenue, orders, attendance, low-stock alerts, charts (Recharts)
- 🪑 **Tables &amp; orders** *(resto)* — table plan, takeaway orders, discounts, validation → kitchen + client tickets
- 🍽️ **Menu management** *(resto)* — categories + dishes, prices, availability
- 🛍️ **Point of sale** *(boutique)* — cart, retail/wholesale pricing, stock decrement, sale tickets
- 👕 **Catalogue** *(boutique)* — products with variants (sizes/colors), barcodes, Excel import/export
- 📦 **Stock (advanced)** — catalogue, entries (*entrées*), internal exits (*sorties*: loss/breakage/donation…), physical inventory sessions with adjustments, full movement ledger (`gestapp_movements`), Excel templates
- 👥 **Employees** — roles (patron / gérant / serveur / caissier), PIN login, presence tracking, activity logs
- 🛒 **Purchases** (*achats*) — supplier purchases linked to catalogue stock
- 💰 **Cash register** (*caisse*) — open/close, cash in/out, per-order settlement, addition receipts
- 🕘 **History** — searchable order/payment log with reprint
- 📈 **Reports** — sales by day/category/product, exportable
- 💾 **Backup &amp; restore** — one-click JSON export/import of the whole database
- ⚙️ **Settings** — business name + type, theme (dark/light), ticket templates, printer selection, admin PIN
- 🖨️ **Thermal tickets** — 80mm templates (table / kitchen / addition / sale / takeaway), silent printing in Electron, iframe fallback in browsers
- 🌐 **LAN sync** — Express REST (`/api/data`) + WebSocket live broadcast; auto-detect server, QR/manual IP connect, offline queue tolerant
- 🔑 **Licence gate** — machine-bound offline keys (`GEST-…` perpetual, `DEMO-…` time-boxed) + one free trial per PC. *Seller tooling stays private — see [Security](#security--licence-tooling-private).*
- 🌙 **Dark / light themes**, French-first UI (fr-FR / fr-DZ formatting, DA currency)
## Screenshots

> Add real screenshots before sharing the repo publicly — they sell the app better than any paragraph.

```text
docs/screenshots/
├── 01-dashboard.png
├── 02-tables-orders.png
├── 03-pos-boutique.png
├── 04-stock.png
├── 05-caisse.png
└── 06-ticket-thermal.jpg
```

Then reference them here:

```md
![Dashboard](docs/screenshots/01-dashboard.png)
![Tables & orders](docs/screenshots/02-tables-orders.png)
![Boutique POS](docs/screenshots/03-pos-boutique.png)
```

## Architecture &amp; project structure

```text
GestApp/
├── electron.js          # Electron main process: window + auto-start of server.js + silent thermal printing IPC
├── server.js            # LAN server: Express REST (/api/status, /api/data[/:key]) + WebSocket broadcast, JSON file store
├── package.json         # Scripts + electron-builder (NSIS) config
├── start-gestapp.bat    # One-click Windows launcher (starts server, opens browser)
├── public/              # CRA template: index.html, manifest.json, icons (favicon.ico, logo*.png, logo.ico)
├── src/
│   ├── index.js         # React entry (StrictMode, no telemetry)
│   ├── index.css        # Global styles
│   ├── App.js           # ~3.7k-line app shell: themes, licence gate, network provider,
│   │                    #   roles/PIN auth, all pages (dashboard, tables, menu, POS, catalogue,
│   │                    #   employees, purchases, caisse, history, reports, backup, settings) + tickets
│   └── pages/
│       └── Stock.jsx    # Full stock module (catalogue, entries, exits, inventory, movements, Excel)
├── scripts/
│   └── prepare-dist.bat # Pre-packaging cleanup helper
├── tools/licence-admin/ # ⚠️ PRIVATE seller tooling (git-ignored, never published / never packaged)
└── gestapp-data.json    # Local runtime database (git-ignored, created at first run)
```

**Data flow (LAN mode):**

```text
┌──────────────┐      HTTP :4000/api/*       ┌──────────────────────┐
│  Server PC   │◄────────────────────────────►  Tablets / clients   │
│  Electron +  │      WS broadcast UPDATE     │  (browser, same WiFi)│
│  server.js   │ ──► INIT snapshot on join ──► │  live shared state   │
│  JSON store  │                              └──────────────────────┘
└──────────────┘
```

Shared keys (synced to every device): `gestapp_tables`, `gestapp_commandes`, `gestapp_employes`, `gestapp_achats`, `gestapp_menu`, `gestapp_menu_categories`, `gestapp_catalogue`, `gestapp_cat_categories`, `gestapp_comptes`, `gestapp_logs`, `gestapp_movements`, `gestapp_inventory_sessions`. Everything else (theme, printer choice, licence, server IP) stays per-device in `localStorage`.

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + Create React App (`react-scripts` 5), inline-style theming, Recharts 2 for dashboards |
| Desktop shell | Electron 28 (Node integration on for licence/printing IPC) |
| LAN server | Express 4 + `ws` 8 (REST + WebSocket), `cors`, atomic JSON file store |
| Import/export | `xlsx` (Excel templates, catalogue &amp; reports) |
| Packaging | `electron-builder` 24 → NSIS installer (`dist_final/`) |
| Language | French-first UI, `fr-FR`/`fr-DZ` formatting, prices in **DA** |
| Dev helpers | `concurrently`, `wait-on` |

## Requirements

- **Windows 10/11** (installer target) or any OS with Node for dev
- **Node.js 18+** and **npm 9+** — [download](https://nodejs.org/)
- Same **Wi-Fi / LAN** for multi-device mode (server + clients on one network)
- (Optional) **80mm thermal printer** for tickets
- Disk: ~300 MB free (Node modules + build)
## Quick start

### Option A — Run from source (developers)

```powershell
# 1. Clone
git clone https://github.com/<your-username>/gestapp.git
cd gestapp

# 2. Install
npm install

# 3. Start the web app (React dev server on :3000)
npm start
```

Open [http://localhost:3000](http://localhost:3000). On first launch pick the business type (🍽️ Restaurant / 👕 Boutique), then either start the **free trial** or enter a licence key.

To run the full desktop + LAN stack in dev:

```powershell
# Terminal 1 — React dev server
npm start

# Terminal 2 — LAN API server (http://<your-ip>:4000)
npm run server

# OR both + Electron window together:
npm run electron-dev
```

### Option B — Desktop app (Electron, production-like)

```powershell
npm install
npm run build     # → build/ (production React bundle)
npm run electron  # opens GestApp in an Electron window + auto-starts server.js on :4000
```

### Option C — One-click launcher (no Electron)

Just double-click **`start-gestapp.bat`**: it starts `node server.js` minimized and opens `http://localhost:4000` in your default browser. Close the `GestApp-Server` window to stop it.

> First run creates `gestapp-data.json` next to the project — your entire database. **Back it up** (or use in-app Backup).

## Packaging (Windows installer)

```powershell
npm run dist
# → dist_final/GestApp Setup 1.0.0.exe  (NSIS installer, per-machine, shortcuts included)
```

Notes:

- Config lives in `package.json → "build"` (appId `dz.gestapp`, icon `public/logo.ico`, output `dist_final/`).
- Before rebuilding, you can run `scripts/prepare-dist.bat` to clear a stale `dist/` lock.
- Ship **only** the `GestApp Setup *.exe` to clients (e.g. via USB + a `Lisez-moi - Installation.txt`). Never ship `tools/`, `src/`, or your `licences.json`.
- Windows may show a SmartScreen warning for unsigned builds → *More info → Run anyway*. Signing (`signAndEditExecutable`) is intentionally off for local builds.

## LAN multi-device setup

1. On the **server PC**, launch GestApp (Electron or `start-gestapp.bat`). Note the IP shown in the window title / server console, e.g. `192.168.1.20`.
2. Connect tablets/phones/PCs to the **same Wi-Fi**.
3. On each client open `http://192.168.1.20:4000` (or use the in-app server-IP field).
4. The client receives a full snapshot (`INIT`), then live updates over WebSocket (`UPDATE` per key).
5. If Windows Firewall prompts, **allow Node.js / GestApp** on private networks.

Troubleshooting:

| Symptom | Fix |
|---------|-----|
| Client can't reach server | Same Wi-Fi? Firewall rule? Try `http://<ip>:4000/api/status` — should return `{ok:true,…}` |
| Port 4000 busy | Another `node server.js` is running — close it, or change `PORT` in `server.js` + Electron `SERVER_PORT` |
| Data not syncing | Check the WS indicator in-app; a key outside `SHARED_KEYS` stays local by design |

## Thermal printing

- In Electron, tickets print **silently** via the `print-ticket` IPC handler (hidden `BrowserWindow`, `silent:true`, target printer = `gestapp_printer` in localStorage or OS default, 80mm CSS).
- In browsers (LAN clients), printing uses a hidden iframe → standard Windows print dialog.
- Configure templates (which ticket prints on validation/payment, header/footer, accent color) in **⚙️ Paramètres → Tickets**. List printers via the `get-printers` IPC channel.
- Ticket types: `table` (client), `cuisine` (kitchen), `addition` (payment receipt), `vente` (retail sale), `emporter_client` / `emporter_cuisine` (takeaway).
## Data, backup &amp; restore

- **Where:** `gestapp-data.json` (project root, git-ignored) — a flat `{ key: value }` store, written atomically (`.tmp` + rename).
- **Backup:** in-app **Sauvegarde** page → download JSON. Also just copy `gestapp-data.json` somewhere safe.
- **Restore:** in-app import, or replace the file while the server is stopped.
- **Never commit** this file: it contains real sales, employees, and PINs (demo PINs ship in code: change them in-app before production).
- Moving to a new PC? Copy `gestapp-data.json` next to the new install — done.

## Configuration

| Item | Where | Default |
|------|-------|---------|
| Server port | `server.js → PORT` + `electron.js → SERVER_PORT` | `4000` |
| Business type | In-app ⚙️ (Restaurant / Boutique), lockable | Restaurant |
| Trial length | `src/App.js → DEMO_TRIAL_JOURS` | 15 days |
| Demo key range | Encoded in key (`1..63` days) | — |
| Printer | In-app ⚙️ → stored as `gestapp_printer` (localStorage) | OS default |
| Installer output | `package.json → build.directories.output` | `dist_final/` |
| App icon | `public/logo.ico` (builder) + `public/favicon.ico` / `logo*.png` (web) | — |

Environment: no `.env` needed. Everything is local-first; LAN address is auto-detected (`os.networkInterfaces()`).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm start` | React dev server (`:3000`) |
| `npm run server` | LAN API + WS server (`:4000`) |
| `npm run electron` | Production Electron window (needs `npm run build` first; falls back to `:3000` in dev) |
| `npm run electron-dev` | Dev trio: React + wait-on + Electron together |
| `npm run build` | Production React bundle → `build/` (also served by `server.js` for LAN clients) |
| `npm run dist` | `build` + NSIS installer → `dist_final/` |

## Known limitations / roadmap

- **Monolith UI:** `src/App.js` (~3.7k lines) holds all pages except Stock. It works, but the natural next refactor is splitting into `src/pages/`, `src/components/`, `src/hooks/`, `src/contexts/`. PRs welcome — keep behaviour identical.
- **JSON store, not a DB:** perfect for 1 shop / LAN scale; for chains or heavy concurrency, migrate `server.js` to SQLite/Postgres.
- **No automated tests** (the CRA sample test was a stale copy of `App.js` and was removed). Adding Jest/RTL coverage for `Stock.jsx` + ticket generation would be a great first contribution.
- **Android scaffold removed** in this cleanup (orphaned `android/` + Capacitor config with no deps). To bring mobile back: `npm i @capacitor/core @capacitor/cli`, `npx cap init`, `npx cap add android`, `npx cap sync`.
- **Licence algo is obfuscation, not cryptography** (offline constraint). V2 idea: RSA-signed keys verified in `server.js`.
- Default demo data + PINs (`1234`, `5678`, `2468`…) must be changed per deployment.
- Windows-only installer today; macOS/Linux need `electron-builder` targets added.

## Security &amp; licence tooling (private)

> ⚠️ **`tools/licence-admin/` is intentionally git-ignored and must NEVER appear on GitHub, in the installer, or on a client USB key.**

It contains the offline key generator (`generate-licence.js`), verifier, visual admin (`admin.html`), and the **client registry** (`licences.json`). Keep it on your PC + private USB backup. The public repo documents only the *existence* of the licence gate, never the algorithm or registry.

If you fork: rotate/replace the licence code in `src/App.js` (`getMachineId`, `validerCle`, `DEMO_TRIAL_JOURS`) with your own scheme before distributing keys.

## Contributing

1. Fork → branch (`feat/stock-export`, `fix/ticket-margin`…).
2. `npm install` → `npm start` → make the change (French UI strings preferred).
3. Keep `npm run build` green; test Electron (`npm run electron`) + at least one LAN client (`http://<ip>:4000`).
4. Never commit `gestapp-data.json`, `build/`, `dist*/`, `tools/`, or binaries.
5. Open a PR describing the shop workflow you fixed (e.g. *"addition reprint after partial payment"*).

## FAQ

**Does it need internet?**
No. 100% offline. Internet is only needed once to `npm install`.

**One PC or many devices?**
Both. Solo: everything on one PC. Team: server PC + tablets/phones on the same Wi-Fi via `http://<server-ip>:4000`.

**Where is my data?**
`gestapp-data.json` next to the app + in-app JSON backup. No cloud copy exists.

**Which printer?**
Any 80mm thermal printer. In Electron it prints silently; on LAN browsers you confirm in the Windows dialog.

**Restaurant or boutique?**
Both — choose at first launch in ⚙️ Paramètres; navigation adapts (tables/menu vs POS/catalogue).

**I see a licence screen — is this a trial?**
Yes: one free trial per PC (default 15 days), then a perpetual (`GEST-…`) or extension (`DEMO-…`) key from your reseller.

**`npm run electron` shows a blank page?**
Run `npm run build` first (Electron loads `build/index.html`). In dev use `npm run electron-dev`.

## License

**MIT License** This repository is licensed under the MIT License. You may use, modify, and redistribute it freely, subject to the terms of the MIT License. See [LICENSE](LICENSE). (This project uses the MIT License.)

## Author

Built by **Ilyes** — offline-first management software for real shops. Issues and (behaviour-preserving) refactors welcome.
