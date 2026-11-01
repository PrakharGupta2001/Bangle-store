# Windows setup — Phase 3

1. Transfer `daya-variety-store-phase-3-source.zip` to the personal Windows laptop and extract into a short personal path, such as `C:\Users\YourName\Projects`.
2. Open the extracted `daya-variety-store` folder in PowerShell or Command Prompt.
3. Install official Node.js **24 LTS** if needed. Check `node --version` (24.x) and `npm --version` (10 or newer).
4. Run:

```text
npm ci
npm run admin
```

Open **http://127.0.0.1:4310/**. In another terminal in the same folder:

```text
npm run admin:access
```

Use the generated code in the local login form. Never paste it into frontend code or public configuration. Sessions expire after eight hours and end on restart. Stop servers with Ctrl+C.

## Edit and view the result

Edit a product in the admin, choose a language tab, upload/reorder an image if desired, then **Save product locally**. Restart and sign in again to confirm persistence. Choose **Export saved catalogue** in the admin, or use the command below. Then build and preview:

```text
npm run catalogue:export
npm run check
npm run build:demo
npm run preview
```

- English: http://127.0.0.1:4173/en/
- Hindi: http://127.0.0.1:4173/hi/
- Gujarati: http://127.0.0.1:4173/gu/

The preview serves files only. The admin can be stopped; no database or application backend is needed by the exported storefront. For storefront code editing use `npm run dev` and the same locale paths on port 3000 (or the printed port if busy). Restart development after a new catalogue export. All binds remain `127.0.0.1`.

## Transfer saved catalogue edits separately

The source ZIP intentionally excludes mutable data and uploaded photographs. On the original computer run:

```text
npm run catalogue:backup
```

Copy the resulting `data/local/backups/catalogue-....zip` into the destination project, for example `transfer/catalogue-backup.zip`. Stop the destination admin and run:

```text
npm run catalogue:restore -- transfer/catalogue-backup.zip
npm run catalogue:export
npm run build:demo
npm run preview
```

The previous runtime is preserved before replacement. Authentication is initialized separately; the source computer's access code is not part of the backup. Backups contain private notes/storage locations and original images, so keep them private. Read BACKUP_RESTORE.md before restoration.

For the latest 31 October catalogue, transfer `data/local/backups/catalogue-2026-10-31T13-36-11-826Z-5279744e.zip` (also recorded in `photo-previews/import-2026-10-31/registration.json`): it includes 115 saved records (91 published photo products and 24 archived samples) and 159 uploads (68 original photos and 91 presentation covers). Shared tray originals are stored once and used by several design entries; four existing products have extra source views. A source-only installation starts with the 24 bundled demos. After restoring, open a photo product in the admin: Image 1 is the cover and the original views follow. Keep existing IDs/SKUs when confirming prices, sizes and stock later.

## Practical notes

- Mutable catalogue/settings: `data/local/runtime/state.json`; uploads: `data/local/runtime/uploads/`; snapshots: `data/local/exports/`; backups: `data/local/backups/`. Do not edit generated build inputs as the source of truth.
- Leave unconfirmed contacts empty. Entering contacts does not deploy anything or enable live messaging/indexing. All current records and pages remain demonstrations.
- New uploads require valid single-frame JPEG, PNG or WebP, up to 8 MiB, 6000px per side and 24 megapixels. Sharp creates public WebP derivatives; originals remain private.
- A corrupt/missing state in an existing runtime directory is a recovery error, not a reset instruction. See BACKUP_RESTORE.md for stale locks and restoring a verified backup.
- If PowerShell blocks `npm.ps1`, use `npm.cmd` or Command Prompt; do not change execution policy or bypass device restrictions.
- Dependencies install locally from public npm. Sharp/esbuild use platform-specific packages supplied through the lockfile; do not transfer `node_modules` from macOS. No global npm installation is required.
- Set a different admin port in the current terminal if needed: PowerShell `$env:ADMIN_PORT = '4312'`; Command Prompt `set ADMIN_PORT=4312`. Preview uses `PORT` similarly. Restart and open the exact printed loopback address so Host/Origin checks match.
- Optional browser checks: `npx playwright install chromium`, `npm run test:admin`, `npm run test:admin:browser`, then `npm run test:browser`. Run browser suites sequentially and follow local installation policies. The full admin workflow restores the working static output after using an isolated dataset.
- To regenerate the clean code ZIP: `npm run package:source`. Make a separate catalogue backup for current data.

Windows and physical-device execution have not been verified on this macOS host. Run the checks on the destination laptop and review Indic font rendering. Hindi and Gujarati require native-speaker review before public launch. MySQL integration is Phase 4 and has not been implemented.

## Complete Windows transfer ZIP — 31 October 2026

`artifacts/daya-variety-store-complete-2026-10-31.zip` combines the clean source tree with a fresh complete catalogue backup under `daya-variety-store/transfer/catalogue-backup.zip`, photo provenance records and `START_HERE_WINDOWS.txt`. It contains no dependencies, caches, Git history or admin access code. Use Node.js 24.x and `npm.cmd` in PowerShell. The included guide supplies extraction, first-time restore/export/build, customer preview and admin commands. Only restore the bundled backup during initial transfer; later startups use the saved Windows catalogue.

The source-only ZIP remains separate. Historical absolute paths in photo-provenance reports describe the source computer; working photos are restored to managed uploads and the website uses portable relative image URLs. Generated output is rebuilt locally. MySQL and Docker are not needed for the current JSON-backed version. This archive is validated on macOS; Windows execution remains unverified.
