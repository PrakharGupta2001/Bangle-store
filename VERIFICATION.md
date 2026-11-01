# Phase 3 verification

Verified on 24 October 2026 on macOS with Node.js 24.19.0, npm 12.2.1, Next.js 16.4.3, React 19.3.1, Express 5.3.0, Sharp 0.35.5 and Playwright 1.64.1/Chromium. Work remained inside this personal project. Nothing was deployed, sent to a contact or connected to MySQL/company services.

## Baseline and preservation

Before Phase 3 changes, `npm run check` passed all 16 Phase 2 data/bootstrap tests. `npm run build:demo` passed with 97 expected routes, three languages and 547 public files. The existing framework/design, fixture records, product/SKU/variant identities and bundled SVGs were preserved. Runtime initialization copied those fixtures and added only admin metadata/private fields. The working dataset remains the original 24 demonstrations with optional contacts unset; workflow edits/uploads were confined to temporary datasets.

## Automated checks

- **`npm run check`: PASS.** Storefront and admin TypeScript, route type generation, 23 data tests and one bootstrap test (24 total). This includes the existing 15 catalogue/language/contact tests plus eight new storage/export/image/backup tests. Invalid money, unknown categories, duplicate identities, null versus zero, string sizes, multilingual variant enquiries, unknown image paths and malformed contacts are checked.
- **`npm run test:admin`: 9 PASS.** Eight storage tests plus one live loopback HTTP test. Authentication is required; incorrect codes, hostile Host/Origin values, missing/invalid CSRF protection and cross-site mutations are rejected. Tests cover immutable IDs/SKUs/demo identity, stale revisions, unauthorized images, rejected disguised executable uploads, validated raster upload and server restart persistence. Sessions do not survive restart/logout.
- **JSON reliability: PASS.** New repository instances read saved changes, initialization preserves edits, two writes from the same revision yield one success and one conflict, and corrupt data is preserved/reported. Published export rejects incomplete translations and leaves the prior valid export pointer unchanged. Drafts/archives are excluded; duplicates get new product/SKU/variant IDs and remain drafts.
- **Images and public boundary: PASS.** PNG upload and WebP processing, size/dimension limits, unsupported SVG/executable rejection, metadata removal and safe references are tested. Referenced public WebP bytes match the export; removing an association leaves shared image bytes available. Nested public projection excludes unexpected private properties, notes/storage, stock and review/publication metadata.
- **Backup/restore: PASS.** Tests use isolated source/destination datasets. Restored products, settings, private notes and image references/bytes match the backup. Prior runtime remains available. Authentication secrets are absent from the portable ZIP. Unsafe ZIP paths and altered checksums are rejected. Restoring a verified backup recovers a corrupt state while retaining the corrupt original.
- **Admin Chromium browser tests: 2 PASS.** Full workflow and focused form workflow, described below. The product list and mobile editor passed automated axe checks; mobile editor had no horizontal overflow. Desktop and mobile screenshots were visually inspected. No runtime errors occurred during the complete workflow.
- **`npm run build:demo`: PASS.** Normal working export: 97 expected routes and 547 public files. The isolated workflow export after archiving one product: 94 expected routes. Export verification checks local navigation/assets, expected locale documents, titles/descriptions, noindex, known private/secret patterns and omitted production metadata when the origin is unset. Every generated HTML file is checked for noindex. No application backend, real business details, paid service or secrets are required.

## Complete workflow actually exercised

The browser test creates a fresh temporary dataset, starts the real admin in a child Node process, signs in and edits the Gulabi product's English/Hindi/Gujarati names, price, private details and cover image. A synthetic PNG is uploaded, processed and given three-language alt text. The product is saved.

The test terminates that admin process, starts a new one, signs in again and confirms the name, price, private field and image association persisted. It archives a different product, duplicates the edited product as a new draft, changes homepage introduction text, exports through the UI and creates a local backup.

The admin is then stopped. `npm run build:demo` runs against that dataset's export. The saved state is compared before/after the build to establish that building did not reset edits. A separate file-only preview shows the updated product name, rupee price and decoded uploaded image; Hindi/Gujarati content and selected-variant language switching work. The enquiry contains the edited product, original SKU and selected size. The archived product returns 404. Private-note/location sentinels and the actual test access code are absent from public HTML/JSON/JS/text. All exported HTML remains noindex.

A second browser test adds an incomplete draft, edits quantities/nullable stock and string size, adds/removes a variant, saves, filters by category/publication/review/missing translations, archives/restores the draft, and edits translated category names/slug. Export includes the complete published records and excludes the incomplete draft.

Tests use automatically assigned loopback ports and clean temporary datasets. The full workflow restores generated storefront output from the working export afterward; it never writes test edits into the working catalogue.

## Packaging and remaining regression checks

- **Existing storefront Chromium regression: 16 PASS.** English, Hindi and Gujarati pages; equivalent language/variant links; search/filter/sort; translated copy dialogs and focus; missing contacts; noindex/404; JavaScript-disabled content; reduced motion; 45 page/viewport combinations at 320, 390 and 1440px with automated accessibility checks. The working export was restored before these checks.
- **Development startup: PASS.** The preserved `npm run dev` command uses the project-local framework wrapper and `--hostname 127.0.0.1`. Port 3000 was already occupied, so Next chose 3001; the other process was left untouched. All three development homepages returned HTTP 200, correct document language and noindex. The test development server was stopped afterward.
- **Working admin startup: PASS.** `npm run admin` bound to 127.0.0.1:4310, generated its own private access-code file and preserved the saved demo dataset. Unauthenticated catalogue access returned HTTP 401. No code value was written to documentation, source or public output.
- **Source packaging: PASS.** The 107-file allowlisted archive includes code, lockfile, tests, immutable fixtures, 24 SVG illustrations and docs. Entry inspection confirms it excludes runtime data, uploads, authentication, backups, generated data/assets, dependencies and Git history. The archive was regenerated after completing the verification notes.
- **Clean extraction: PASS.** Extracted into a new project-local directory without dependencies or generated data. Installation from the cached public registry packages, `npm run check` (24 tests), `npm run build:demo` (97 routes/547 files), and `npm run package:source` all passed. A normal `npm ci --offline` with project postinstall enabled and all nine admin HTTP/storage tests also passed there. npm 12 blocked esbuild/fsevents install scripts under its default policy; no policy was bypassed, and the installed platform packages worked. Windows is still unverified.

## Limits

- Windows, Safari, Firefox, physical phones and full assistive-technology user testing were not performed. Check the destination Windows laptop, including Sharp/esbuild installation and Indic fonts.
- Hindi and Gujarati remain drafts requiring native-speaker review before public launch.
- No real phone ownership, WhatsApp delivery, business map destination or production domain was verified. No external message was sent. All Phase 3 storefront WhatsApp actions remain disabled; noindex remains independent of settings.
- This is single-user local authentication, not internet-hosting security. OS account access can read local data/code; keep the computer and backup files private. Sessions are in memory by design; catalogue persistence is JSON.
- Atomic writes and conflict handling were exercised, but power-loss/crash-at-every-instruction behavior was not simulated. A crash can leave a stale lock; recovery instructions require stopping all relevant processes first.
- Originals, revision history, unused uploads, old snapshots and backups are retained. There is no permanent deletion or automatic garbage collection. Backup size limits are documented in BACKUP_RESTORE.md.
- `globalNotFound` remains an experimental pinned-Next feature. A future static host needs matching localized 404 routing. No deployment/production indexing switch is implemented.
- The storefront regression suite intentionally uses the original demo fixture names/counts. After deliberate catalogue edits, run it against a clean demo installation or update the affected expectations; do not reset saved data just to satisfy those fixture-specific assertions.
- Private-pattern scans support the explicit schema allowlist; they are not a general-purpose secret-detection guarantee.

## Rerun and evidence

Run `npm run check`, `npm run test:admin`, `npm run test:admin:browser`, `npm run build:demo` and `npm run test:browser` sequentially after installing Playwright Chromium. Tests live in `tests/`. Screenshots and reports under `artifacts/`/`test-results/` are excluded from the source ZIP. See README.md and BACKUP_RESTORE.md for normal editing and transfer commands.

## Photo catalogue addition — 26 October 2026

Added one working-data product, DVS-B6B52B86, with managed AI-preview and original-photo uploads. Confirmed deep equality of all 24 previous products, settings, categories and homepage data after registration. Saved revision 1, explicitly exported and rebuilt with 25 products. A pre-change backup and a post-change catalogue backup were created under `data/local/backups/`.

Checks actually run for this addition:

- `npm run check`: both TypeScript projects and 25 tests passed (24 catalogue/Phase 2/admin tests plus bootstrap). New test covers null bangle size through save, repository reopening, export and backup restore while rejecting malformed entered sizes.
- `npm run test:admin`: 10 storage/HTTP tests passed, including authentication and process restart.
- `npm run build:demo`: passed; verifier checked 100 static routes, 404/noindex, links/assets and 564 public files.
- Focused Chromium browser check of the actual new record: English/Hindi/Gujarati at 320, 390 and 1440px; both images loaded, no horizontal overflow, correct titles/languages/noindex, translated photo captions and enquiry with stable SKU/variant. Homepage and SKU-search navigation, reciprocal language switching with variant, a JavaScript-disabled product page, and authenticated admin editor with both photos and empty price/size/stock fields passed. No browser page errors; saved revision remained unchanged by the checks.
- Desktop English and mobile Gujarati screenshots were visually inspected.

The original full storefront browser suite was not rerun for this addition: several cases intentionally assume exactly the original 24-product fixture and 12 bangles. The new working catalogue contains 25 products and 13 bangles. Windows and physical devices were not retested. Hindi/Gujarati wording still needs native-speaker review. The AI image is a disclosed presentation preview, not a verified exact rendering of jewellery details. No deployment or real customer messaging was performed.

## Earring catalogue addition — 26 October 2026

Registered ten earring photographs as nine separate products, provisionally grouping photo-index entries 4 and 8 as alternate views of one design. Preserved all previous 25 product records, settings, categories and homepage text by deep-equality checks. Runtime revision 2 contains 34 products and 12 uploaded originals in total. Created pre-import and post-import backups.

- `npm run check`: TypeScript and all 25 tests passed.
- `npm run build:demo`: passed; 127 static routes and 709 public files verified, with noindex and valid local links/assets.
- Focused Chromium checks completed for all nine products in three locales at 390px and 1440px (54 page checks), plus all six locale/viewport category combinations: correct names, loaded complete photos with `object-fit: contain`, no overflow, noindex, translated enquiry names/references and no WhatsApp links. Category includes nine uploaded-photo records and four original demos. Homepage features and SKU search/navigation passed.
- All nine records opened in the authenticated admin with correct reference, images, review/publication state, and unknown price/stock. The initial browser harness stopped at the existing return-to-list confirmation; the admin checks passed when the harness explicitly accepted that confirmation. No application fix or runtime edit was needed.
- Verified the post-import backup contains all 34 products and 12 originals and excludes access credentials. Browser page errors were absent and verification did not change the saved revision. Visually inspected the earrings category screenshot.

Full fixture-based browser suite, physical-device and Windows checks were not repeated. Translations and the provisional duplicate grouping need review before real inventory accounting. Earring images are original supplied photographs without AI retouching. No deployment occurred.

## Complete ZIP coverage — 26 October 2026

All 24 original JPEGs from the user ZIP now map to 23 published local photo-product records. Imported the remaining 13 originals into ten new bangle records and three new Jewellery sets records; added that translated category without modifying existing category definitions. Deep-equality checks confirmed preservation of the previous 34 products, settings and homepage text. Working revision 3 has 47 products and 25 upload originals (the 24 JPEGs plus the earlier AI bangle preview).

- `npm run check`: TypeScript and 25 tests passed.
- `npm run build:demo`: final build passed after updating photo category alt text/display; 169 static routes and 932 public files verified, including noindex, 404 and links/assets.
- SHA-256 checks matched every one of the 24 ZIP entries to its retained original in the complete backup. Every photo is referenced by exactly one published product and has an exported WebP. Coverage maps to 23 distinct products because two earring views share one record.
- Chromium: 78 new-product page checks (13 products × 3 languages × 2 widths, 390/1440), correct titles/languages, loaded uncropped photos, no horizontal overflow, noindex and correct SKU/variant enquiries with no external WhatsApp actions. New category links from the homepage, category filters, SKU search and language switching passed.
- Opened all 23 photo-product records in the authenticated admin and verified references, images and unknown price/size/stock. The saved revision did not change during browser verification; no browser page errors occurred.
- Complete backup verified: 47 records and 25 uploaded originals; no auth/access-code files. Desktop English and mobile Hindi Jewellery sets screenshots were visually inspected.

Physical-device, Windows, full original-fixture browser and native-speaker review were not repeated. Product identities and set contents remain provisional, with no fabricated stock, prices, material claims or inferred package quantities. The existing noindex/local-only restrictions remain. The source ZIP excludes personal uploads; the separate catalogue backup contains all photos and records.

## Coordinated studio covers — 26 October 2026

Added 22 ivory-background AI presentation covers to existing photo-product records, preserving the earlier gold-tone bangle cover. All 23 photo-products now have a studio cover and retained original views. Category cards reuse three covers. Revision 4 contains the same 47 products and 47 managed uploads: 24 original JPEGs plus 23 generated cover originals. Pre-change and post-change backups were created. Registration assertions confirmed unchanged product IDs/SKUs/variants, names, price/size/stock, review/publication fields, original image associations, settings and homepage content; description disclosures and private provenance were appended without replacing existing text. The 24 demo products were deep-equal before/after.

Checks actually run for this update:

- `npm run check`: both TypeScript projects and all 25 automated tests passed.
- `npm run build:demo`: passed; 169 static routes and 954 public files verified, including noindex on every HTML document, local links/assets, 404 output and known private-data patterns.
- Focused Chromium check (`.photo-review/verify-studio-covers.mjs`): 138 product-page checks (23 products × 3 languages × 390/1440px), correct translated names/captions, cover order, all gallery images loaded with contain sizing, no horizontal overflow, correct document language/noindex and SKU/variant enquiry previews without live WhatsApp links. Category homepage navigation/filtering, SKU search and language switching passed.
- Authenticated admin: opened all 23 photo-product editors; confirmed cover alt text/image count, stable SKU, review/publication state and empty price/size/stock. No saved-data changes or browser page errors occurred during verification.
- All 24 ZIP source hashes matched originals in the complete 47-upload backup and their published product associations. Backup state has 47 products; authentication/access-code files are absent. Private studio provenance does not appear in the public catalogue.
- All selected generated covers were visually inspected. Desktop English and mobile Hindi Jewellery sets screenshots were inspected; no clipping/overflow observed. Fine-detail accuracy is not guaranteed: hoop fittings, stones, motifs and other small details can differ, and captions/descriptions disclose AI editing.
- `lsof` confirmed the running admin and static preview listen only on `127.0.0.1:4310` and `127.0.0.1:4173`. No deployment or external messaging occurred.

Complete catalogue backup: `data/local/backups/catalogue-2026-10-26T09-20-38-768Z-7012ba1f.zip`. The source ZIP is regenerated separately and excludes all personal uploads, runtime data, access credentials and generated previews. Physical-device, Windows, full original-fixture browser suite, exact physical product matching and native-speaker review were not repeated. No database/accounting feature was added.

## Temporary sample removal — 26 October 2026

At the user's request, revision 5 archives all 24 illustrated samples and exports only the 23 existing photo products. Deep-equality assertions verified that only the samples' publication status changed; all photo products, images, categories, settings and homepage editorial data remained intact. Empty category cards/filter options are hidden, and the homepage hero now selects a photo cover when available. Archived records remain recoverable in the admin. Direct empty-category pages remain translated empty states.

- `npm run check`: TypeScript and all 25 tests passed.
- `npm run build:demo`: passed; 97 static routes and 594 files, including noindex and local link/asset verification.
- Focused Chromium: English/Hindi/Gujarati homepage and collection at 390/1440px; exactly 23 photo cards, three populated categories, no visible SVG placeholders, no horizontal overflow, photo hero loaded, category counts 11/9/3, removed-sample search empty, photo SKU search/navigation working. All 72 archived product URLs returned HTTP 404. No browser page errors or saved-data changes. Gujarati mobile homepage screenshot visually inspected.
- Pre/post archival backups created. Latest complete backup: `data/local/backups/catalogue-2026-10-26T09-35-25-457Z-d1e58c5c.zip`. It retains all 47 records and 47 uploads; 24 records are archived. Clean source package regenerated separately.

No deployment, indexing change, live messaging or permanent deletion. Windows/physical-device and full original-fixture browser tests were not rerun.

## Customer wording cleanup — 27 October 2026

The user requested removal of customer-facing demo/sample/AI sentences while preserving every image and the presentation. Updated English/Hindi/Gujarati UI copy, saved homepage text, 23 published product descriptions/captions/alt text, two category descriptions and metadata. Cover captions use “The signature look”; original photographs use “A closer look” and “Another angle”. Runtime revision 7 retains 23 published photo products and 24 archived samples. Private generation notes remain intact.

- `npm run check`: TypeScript and all 25 tests passed. Price-label assertions were updated to the requested neutral wording.
- Final `npm run build:demo`: passed, verifying 97 routes and 594 files, noindex and static links/assets.
- All 94 stored image files (47 originals and 47 WebP derivatives) matched their pre-edit SHA-256 hashes. Product image source/order, names, IDs, SKU, variants, prices, availability, review state, private notes and archived products were deep-equal before/after except for the specifically edited customer text fields. No CSS or gallery component edits were made.
- The first browser run found old sample wording in two category descriptions. Those descriptions were corrected, exported and rebuilt; the expanded rerun passed all 192 locale/page/viewport checks (three languages, 390/1440px, homepage, collection, visit, not-found, all five categories and all 23 product pages). No demo/sample/AI wording remained in checked visible text, alt text, titles or metadata. Gallery order/source references and original-photo captions matched saved data; all gallery images loaded without horizontal overflow. Enquiries retained SKU and no-send behavior; external WhatsApp actions stayed disabled. No browser page errors or runtime changes during verification.
- English mobile product screenshot visually inspected. Both local servers confirmed bound to 127.0.0.1. No deployment or indexing change.

Latest complete backup: `data/local/backups/catalogue-2026-10-27T13-00-53-518Z-b3aebbc0.zip`; source ZIP regenerated separately. Physical-device, Windows, full fixture-specific browser tests and native-speaker review were not repeated. Image fidelity was not re-evaluated because image bytes were unchanged.

## New bangle photographs — 28 October 2026

Imported all 14 JPEGs from the new user ZIP as 14 separate bangle records with matching ivory-background presentation covers and retained originals. Runtime revision 8 contains 61 saved records: 37 published photo products and 24 archived samples. There are 75 managed uploads (38 supplied originals and 37 generated covers). Registration assertions confirmed all previous 47 records, category/home/settings data and 94 stored image files remained unchanged. Similar colours remain separate pending physical identity review.

- `npm run check`: TypeScript and all 25 automated tests passed.
- `npm run build:demo`: passed; 139 static routes and 832 public files verified, including noindex, not-found output, local links/assets and known private-data patterns.
- Focused Chromium verification (`.photo-review/import-2026-10-28/verify.mjs`) passed 84 product-page checks: 14 products × English/Hindi/Gujarati × 390/1440px. Verified translated names, image order and captions, complete loaded images, document language, noindex, no customer-facing demo/sample/AI wording, SKU/variant enquiry text and disabled external messaging. No horizontal overflow or browser page errors.
- Verified 25 bangle cards and 37 collection cards, sorting, SKU search, product navigation and equivalent-page language switching. All 14 authenticated admin editors showed the correct references, images, publication/review state and unset price, size and stock. Browser checks did not change the saved revision. Desktop category and Hindi mobile product screenshots were visually inspected.
- Every backup manifest hash passed. All 14 retained originals match the source ZIP; generated covers and exported derivatives match their backed-up assets. Complete backup contains 61 records and 75 upload originals, without auth/access-code files: `data/local/backups/catalogue-2026-10-28T02-13-45-636Z-d920e1ad.zip`.

Physical-device, Windows and the full original-fixture browser suite were not rerun. Hindi/Gujarati drafts still need native-speaker review. Exact colours, physical product identities, set counts and fine details in generated covers need owner review before inventory accounting; unknown prices, sizes and stock remain unset. Original photographs are retained for comparison. No deployment or live customer messaging occurred. The clean source ZIP is regenerated separately and excludes personal photos/runtime data; the catalogue backup preserves them.

## Earring photo import — 28 October 2026, evening

All 18 supplied JPEGs are retained across 17 new published earring records. Photos 13 and 18 provisionally share one tiered-bell identity; photo 3's repeated display-card pairs use one design record. Seventeen ivory covers were generated and visually inspected; the silver-tone cluster was regenerated once to correct a missing stone. Revision 9 contains 78 saved records (54 published photo products, 24 archived samples) and 110 registered upload originals (56 supplied photographs, 54 covers). Before/after assertions confirmed all previous 61 records, category/home/settings data and 150 stored original/derivative files were unchanged.

Checks actually completed:

- `npm run check`: TypeScript and all 25 automated tests passed before import. Application source was not changed by this catalogue update.
- `npm run build:demo`: passed after import; 190 static routes, 1122 public files, noindex, not-found output, local asset/link checks and known private-data pattern checks.
- Focused Chromium script `.photo-review/import-2026-10-28-evening/verify.mjs`: 102 product-page checks (17 products × 3 languages × 390/1440px) passed. Correct names, language, noindex, gallery references/order/captions, loaded uncropped images, no horizontal overflow and no customer-facing demo/sample/AI wording. Enquiries retained product reference and variant; external WhatsApp actions remained disabled.
- Category and collection showed 26 and 54 cards respectively. Name sorting, SKU search, product navigation and equivalent-language links passed. All 17 authenticated admin editors opened with correct identities, gallery captions, publication/review status and unset price, size and stock. No browser page errors or saved revision changes.
- Every complete-backup manifest hash passed. All 18 ZIP originals, 17 covers and their public derivatives matched stored/backed-up bytes. The backup contains 78 records and 110 original uploads, with no auth/access-code entries. Desktop earring category and Hindi mobile product screenshots were visually inspected.

Latest complete backup: `data/local/backups/catalogue-2026-10-28T12-33-50-153Z-479712e3.zip`. Clean source packaging is regenerated separately and excludes personal images/runtime data. Both local servers use 127.0.0.1. No deployment, database migration or live messaging was performed.

The full fixture-specific browser suite, Windows and physical-device checks were not rerun. Native-speaker translation review, physical product identity/grouping, sale quantities and exact generated-image fidelity remain for owner review. Handwritten package labels were not treated as confirmed prices or stock.

## Bangle tray import — 31 October 2026

Retained all 12 source JPEGs. Added 37 published bangle design records with selected ivory covers; appended alternate original views to four existing records. Shared source trays use one managed upload each. Revision 10 contains 115 records (91 published photo products and 24 archived samples) and 159 uploads (68 supplied photos, 91 covers). All prior 220 image files remain byte-identical. Seventy-four existing records are deep-equal; four retain all previous fields/images and gain only one image association and appended private provenance. Categories, homepage content and store settings are unchanged.

Checks completed:

- `npm run check` passed before and after import: both TypeScript projects and all 25 automated tests.
- Baseline `npm run build:demo` passed with 190 routes. Post-import build passed with 301 static routes and 1726 public files, including noindex, localized not-found output, local HTML assets/links and known private-data/secret-pattern checks. No application backend or database is needed by these exported files.
- `.photo-review/import-2026-10-31/verify.mjs` passed 246 Chromium product checks (41 changed records × 3 languages × 390/1440px). Verified titles, document language, noindex, exact gallery references/order/captions, loaded images with contain sizing, no horizontal overflow, no unwanted preview wording, product/SKU/variant enquiry text and disabled external WhatsApp links.
- Browser checks confirmed 62 bangle cards and 91 collection cards, alphabetical sorting, SKU search, product navigation and equivalent-language links. All 41 authenticated admin editors displayed the expected identities, captions, publication/review state and unset price/size/stock. Saved revision remained 10; no browser page errors.
- The first browser run stopped on a test false positive: the Gujarati word for patterned contains the prefix used by the old sample-notice matcher. The matcher was narrowed to standalone sample terms; customer text was preserved and the entire suite rerun successfully.
- Every backup manifest checksum passed. All 12 source JPEG hashes match the supplied ZIP. All 37 selected cover originals and referenced public derivatives match the managed/backup/exported files. The application's `validateBackup` also passed its schema, image, reference, checksum and extraction-limit checks for the complete roughly 207 MiB backup. No auth/access-code files are present.
- Both running listeners were confirmed at 127.0.0.1:4173 and 127.0.0.1:4310. No deployment, database migration or live messaging occurred.

Complete backup: `data/local/backups/catalogue-2026-10-31T13-36-11-826Z-5279744e.zip`. Clean source ZIP is regenerated separately using `npm run package:source`; personal photos/runtime data remain excluded, so both archives are needed to transfer this catalogue. Generation prompts and selected image paths are recorded in `photo-previews/import-2026-10-31/manifest.json`; import details are in `registration.json`.

All selected generated covers were visually reviewed; source photographs remain available because exact fine details and physical identities are not verified. Hindi/Gujarati drafts still need native-speaker review. Windows, real mobile devices and the full fixture-specific browser suites were not rerun. No inventory count, price, material or sale-unit quantity was inferred from a tray or package.
