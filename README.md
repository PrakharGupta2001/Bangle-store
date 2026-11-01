# Daya Variety Store

Phase 3 adds a working, authenticated **local admin** with persistent JSON storage to the existing white-and-gold English/Hindi/Gujarati static storefront. The 24 original demo products, IDs, variants and illustrations are preserved. Nothing is deployed, no MySQL connection is used, and public pages remain noindex.

## Start locally

Use Node.js **24 LTS (24.x)** and npm 10 or newer, from the extracted `daya-variety-store` folder. Tested with Node 24.19.0 and npm 12.2.1.

```text
npm ci
npm run admin
```

Admin: **http://127.0.0.1:4310/**. In a second terminal in the same project:

```text
npm run admin:access
```

Copy the generated access code into the sign-in form. There is no universal/default password. The code is stored in `data/local/auth/access-code.txt`, outside source and public files. Sessions last up to eight hours and end on server restart. Never share the code. On a fresh computer, access is initialized separately from catalogue restoration.

All servers bind to `127.0.0.1`. Stop a server with Ctrl+C. Keep the admin local; no tunnel, router exposure or hosting service is configured.

## Edit → save → export → build → preview

1. Sign in, search for a product, and select **Edit**. Change the details, language tabs, variants, image order/cover, price or private notes. **Save product locally** persists a new revision to disk.
2. Restart `npm run admin`, sign in again, and confirm the saved edit remains. Normal restarts and builds do not reset the runtime catalogue.
3. In **Export & backup**, choose **Export saved catalogue**, or run:

```text
npm run catalogue:export
```

4. Rebuild and serve the independent static files:

```text
npm run build:demo
npm run preview
```

Open:

- English: http://127.0.0.1:4173/en/
- हिन्दी: http://127.0.0.1:4173/hi/
- ગુજરાતી: http://127.0.0.1:4173/gu/

The storefront works with the admin stopped. “Published” in the admin means **eligible for export**, not published on the internet. Saving, exporting, rebuilding and future deployment are separate actions. Export reads saved changes only; the UI shows the saved revision. No deploy action exists.

For storefront code editing, use `npm run dev`: http://127.0.0.1:3000/en/, `/hi/`, `/gu/` (or the port printed if 3000 is occupied). It prepares from the last successful export at startup. After exporting new catalogue changes, restart development or rebuild the static preview. The build explicitly disables framework telemetry without changing global settings.

## Commands

| Command                                            | Purpose                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npm ci`                                           | Install exact lockfile dependencies; initialise only missing bundled demo inputs |
| `npm run admin`                                    | Start the separate authenticated local admin on 127.0.0.1:4310                   |
| `npm run admin:access`                             | Show this installation's generated private access code                           |
| `npm run catalogue:export`                         | Prepare an immutable public snapshot from a saved revision                       |
| `npm run catalogue:backup`                         | Make a private, timestamped catalogue/images backup                              |
| `npm run catalogue:restore -- transfer/backup.zip` | Validate and restore a backup; preserve the previous runtime                     |
| `npm run prepare:storefront`                       | Stage public data/images from the last successful export                         |
| `npm run dev`                                      | Start loopback-only storefront development, normally port 3000                   |
| `npm run check`                                    | TypeScript checks and focused catalogue/storage/bootstrap tests                  |
| `npm run build:demo`                               | Static build and public output verification                                      |
| `npm run preview`                                  | File-only preview on 127.0.0.1:4173                                              |
| `npm run test:admin`                               | Storage plus live local HTTP authentication/security tests                       |
| `npm run test:admin:browser`                       | Isolated browser edit/save/restart/export/build workflow                         |
| `npm run test:browser`                             | Existing multilingual storefront browser regression tests                        |
| `npm run package:source`                           | Clean `artifacts/daya-variety-store-phase-3-source.zip`                          |
| `npm run format`                                   | Format project source with project-local Prettier                                |

Optional browser tests need `npx playwright install chromium`. Run browser suites sequentially: the admin workflow temporarily rebuilds generated output from an isolated dataset and restores the working export afterward. Saved working data is not edited. The public tests expect the original demo catalogue; see VERIFICATION.md before running them against intentional catalogue changes.

## Where data lives

| Location                                                      | Contents                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `data/fixtures/`                                              | Bundled demo fixtures, used to initialize a new installation only                         |
| `apps/storefront/public/images/`                              | Trusted bundled SVG illustrations                                                         |
| `data/local/runtime/state.json`                               | Mutable products, private details, categories, settings, homepage text and asset registry |
| `data/local/runtime/uploads/<id>/`                            | Private uploaded original and processed public WebP                                       |
| `data/local/runtime/history/`                                 | Previous saved revisions                                                                  |
| `data/local/auth/`                                            | Installation access code; excluded from backups/source/public output                      |
| `data/local/exports/snapshot-<id>/`                           | Immutable prepared public catalogue and referenced images                                 |
| `data/local/exports/current.json`                             | Pointer to the last successful export                                                     |
| `data/local/backups/`                                         | Timestamped catalogue backups and pre-restore runtime copies                              |
| `packages/catalogue/generated/`, `apps/storefront/generated/` | Generated build inputs; not source or primary storage                                     |
| `apps/storefront/public/catalogue-images/`                    | Only referenced processed images staged for the build                                     |
| `apps/storefront/out/`                                        | Independent static HTML, public payloads and assets                                       |

A first storefront build can initialize a demo dataset/export if neither exists. If saved admin data exists but no export exists yet, the build asks for `npm run catalogue:export`; it does not silently publish saved edits. A missing/corrupt runtime state is reported and preserved. `DVS_DATA_DIR` optionally selects a dedicated directory **inside this project** for isolated tests; normal use needs no environment file. Never point it at a source directory. See BACKUP_RESTORE.md for stale locks and recovery.

## Catalogue editing

Products can be added, edited, duplicated into a separate draft, archived and restored as drafts. Duplicate creates new product/SKU/variant identifiers and retains shared image associations; it clears private notes/storage location. Existing IDs and SKUs are immutable; slugs are unique. Variants support stable IDs, string sizes such as `2-4`, translated labels/colours, pair/set quantities and nullable known stock. Rupee inputs are converted to integer paise. Empty price/stock remains unknown, distinct from zero.

Publication, review, availability and demo identity are separate. Existing samples cannot be converted into genuine inventory by toggling a checkbox. New records default to demo drafts; a separately chosen genuine draft still needs review and remains subject to Phase 3 demo/noindex restrictions. Featured products use numeric display order (lower first). Category IDs remain stable; deletion is unavailable, and invalid references are rejected.

The list supports name/SKU/ID search and category, publication, review and missing-translation filters. Incomplete drafts can be saved. Export requires complete English, Hindi and Gujarati product names/descriptions, variant labels/colours where present, image alt text, and category translations. A saved “published” record with missing requirements blocks export with validation errors rather than silently falling back to English.

Images accept actual single-frame JPEG, PNG and WebP contents only: up to 8 MiB, 6000px per side and 24 megapixels. Sharp decodes and produces metadata-stripped WebP up to 1600px. The first image is the cover; reorder or remove associations in the editor. Originals stay private. Removing an association does not delete a file still used elsewhere. Arbitrary paths, remote fetch URLs, executable uploads and new SVG uploads are rejected. Trusted bundled demo SVGs remain supported.

## Translations, settings and restrictions

Edit catalogue translations in the admin's English/हिन्दी/ગુજરાતી tabs. Edit homepage headings/descriptions/introduction and optional contacts under **Store & homepage**. Empty contact fields stay null. Existing configuration defaults in `apps/storefront/config/default-store.ts` and locale dictionaries seed a new dataset; once initialized, admin JSON is the source of truth. Do not edit the generated files.

UI dictionary source remains `apps/storefront/lib/translations/{en,hi,gu}.json`; shared enquiry/price wording lives in `packages/catalogue/src/index.ts`. These code-level strings can be edited locally and rebuilt. Hindi and Gujarati are drafts requiring native-speaker review before launch. System font fallbacks need no build-time font download.

Configured phones require an international `+` and 8–15 digits. Directions require a destination-specific HTTPS Google Maps/OpenStreetMap URL. Format validation cannot establish ownership, reachability or the correct business destination. Unknown details remain unset; the known location is Vadodara, Gujarat, India.

Every Phase 3 page remains noindex, including with a configured public origin. Demo enquiry dialogs remain local and clearly say nothing was sent. Live WhatsApp links remain disabled in the Phase 3 storefront, including for newly created genuine drafts; the pure future link builder remains tested. No localhost URL is added to outward-facing messages. Conditional canonical/hreflang helpers and future guarded sitemap support remain; no fabricated structured business/product data or production sitemap is emitted.

## Handover and next phase

Run `npm run package:source` for the clean application ZIP. **This ZIP does not contain your saved admin edits or uploaded photographs.** Transfer a separate catalogue backup using BACKUP_RESTORE.md. Dependencies, caches, Git history, actual environment files, mutable data, uploads, exports, backups, secrets and logs are excluded from the source archive.

See ARCHITECTURE.md, WINDOWS_SETUP.md, VERIFICATION.md, ASSET_PROVENANCE.md and ROADMAP.md. Phase 4 is an admin-only MySQL adapter on the personal Windows laptop, with migration, backup and restore verification. MySQL, checkout, payments, customer accounts and internet deployment are not implemented here.

## Photo product added on 26 October 2026

The working local catalogue includes **Gold-tone stone bangles**, reference **DVS-B6B52B86**, at `/en/product/gold-tone-stone-bangles-photo/` (also `/hi/` and `/gu/`). It is featured on the homepage and searchable in the collection. This is a separate photo-based record; all 24 demo records remain intact. It is eligible for the local export, with review status `ready_for_review`, unknown price/stock/size, and no verified availability claim. Existing local preview/noindex restrictions still apply.

In the admin, search **DVS-B6B52B86** and choose **Edit** to manage its translations, images, price, variants, stock and internal notes. Keep its ID, SKU and variant ID when confirming details later. This enables future catalogue/inventory tracking; it is not a sales ledger or accounting system. Bangle sizes may now be empty when unknown; entered sizes must still use strings such as `2-4`. New products and variants no longer assume a size.

The cover is an AI-edited presentation preview and the second image is the original supplied photograph. Customer descriptions and captions explain the distinction in all three languages. The original files are retained in managed uploads; the private notes record provenance and outstanding checks. Uploaded image captions use their translated alt text; illustrated sample products retain their existing captions.

As with all admin uploads, this record and its images are transferred in a **catalogue backup**, not the clean source ZIP. Run `npm run catalogue:backup` after further edits, and use BACKUP_RESTORE.md to transfer it. Save → export → build → preview remains the workflow for customer-visible updates.

## Earring photographs added on 26 October 2026

Nine additional photo-based earring records are now available under `/en/category/earrings/`, `/hi/category/earrings/` and `/gu/category/earrings/`. Ten supplied photographs were registered: photos 4 and 8 appear to show the same leaf/arch/fan design and are provisionally grouped as two views of one item. Confirm this identification before physical inventory accounting. The original photographs remain in each gallery; the later studio-cover update described below adds ivory-background AI previews. Hoop and butterfly jhumkas are also featured on the homepage.

In the admin, filter **Category → Earrings**, then search a name or reference and choose **Edit**. Prices, dimensions and stock remain unknown; each record has review status `ready_for_review`. These records are included in catalogue backups, not the clean source ZIP. The working catalogue now has 34 products, including the original 24 demos, the earlier bangle record and these nine earrings.

| Earring record | Reference |
| --- | --- |
| Hoop jhumka earrings | DVS-02B832E0 |
| Butterfly jhumka earrings | DVS-5E35EA59 |
| Teardrop fan earrings | DVS-2679C95A |
| Circle jhumka drop earrings | DVS-3F1152EA |
| Leaf and arch fan earrings | DVS-F1C58B1C |
| Round filigree fringe earrings | DVS-B988D7F8 |
| Flower and crescent earrings | DVS-86CCE961 |
| Peacock fan earrings | DVS-364F0E9C |
| Tiered fan drop earrings | DVS-B0AB96F4 |

## Complete ZIP photo import — 26 October 2026

All **24 original photographs** from the supplied ZIP are now used by **23 photo-based catalogue records**: 11 bangle records, 9 earring records and 3 jewellery-set records. The two alternate earring views share one record. A further 13 records were added in the final import, preserving all previously saved records and existing category definitions. The original 24 demo records remain, giving **47 products** in the working catalogue.

Browse `/en/collection/`, `/en/category/bangles/`, `/en/category/earrings/` and the new `/en/category/jewellery-sets/` category, with matching Hindi and Gujarati paths. The new category appears on the homepage and in the customer/admin category filters. Uploaded product/category photos are displayed without cropping and identified as photo previews. Every photo-based record now has a labelled ivory-background AI presentation cover, followed by the supplied originals (see the studio-cover update below).

In the admin, select the category, search by name or SKU and choose **Edit**. Every photo-based record has a stable product/SKU/variant identity, translated text and source-photo notes. Prices, stock and size are unset; pictured packs and printed labels are not treated as confirmed sale quantities or inventory. Verify details before real accounting.

The local `photo-previews/all-photos-index.txt` maps every ZIP filename to its product and customer URL; `all-photos-registration.json` records SHA-256 coverage and the complete backup path. These private working files and all uploaded originals are excluded from source packaging. The latest catalogue backup contains all 47 records and all 47 uploaded files (24 source photos plus 23 AI presentation covers). Use the catalogue backup, together with the source ZIP, when transferring the project.

## Studio covers — 26 October 2026

All **23 photo-based products** now have coordinated ivory-background covers: 11 bangles, 9 earrings and 3 jewellery sets. The existing gold-tone bangle cover is preserved; 22 covers were added to their existing records. Category cards for Bangles, Earrings and Jewellery sets now use matching covers. All 24 original supplied photographs remain in the product galleries and managed backups. The original 24 demo records and their illustrations remain unchanged.

These are **AI-edited presentation previews**, not verified exact product photographs. English, Hindi and Gujarati descriptions and image captions disclose this; details such as stones, fittings, motifs, colours and counts can differ. Confirm the actual jewellery and set contents against the originals before launch or inventory accounting. Hindi/Gujarati drafts still need native-speaker review.

In the admin, filter by category, search the existing product name or SKU, and select **Edit**. Image 1 is the new cover; original views follow it. Change the image order to choose another cover, then save, export and rebuild. Product IDs, SKUs, variants, existing private notes, review status and unknown price/size/stock are preserved. The working catalogue is revision 4 with 47 products and 47 managed uploads.

The private generation manifest is `photo-previews/studio-covers/manifest.json`; the registration report is `photo-previews/studio-covers-registration.json`. The report records the before/after backup paths and cover-to-record associations. Use the latest catalogue backup together with the clean source ZIP when transferring; source packaging intentionally excludes these personal photographs and generated covers.

## Temporary sample cleanup — 26 October 2026

At the user's request, all 24 illustrated demonstration products are now archived in the working admin catalogue. The customer export contains only the 23 photo-based products (11 bangles, 9 earrings, 3 jewellery sets). Product data and all photos are preserved; admin users can find the samples using the Archived publication filter and restore them as drafts if needed. The earlier 47-product customer counts above describe previous snapshots.

Empty categories are hidden from homepage cards and the collection filter; their definitions remain available in the admin. Direct empty-category pages retain their translated empty state. The homepage uses the first featured photo-based bangle cover (or another photo product), with translated product name/alt text; the bundled illustration remains a fallback only for a clean demo installation. Rebuild after exporting catalogue changes. Noindex and preview disclosures remain enabled.

Revision 5 backup: `data/local/backups/catalogue-2026-10-26T09-35-25-457Z-d1e58c5c.zip`. It retains 47 records (24 archived, 23 published) and all 47 managed uploads. `photo-previews/demo-archive-registration.json` records the archived identities and before/after backup paths. Use this latest backup with the source ZIP when transferring.

## Customer wording update — 27 October 2026

At the user's request, customer-facing demo/sample/AI presentation wording has been replaced with collection copy in English, Hindi and Gujarati. Product covers use “The signature look”; original-photo views use “A closer look” and “Another angle”, with translated equivalents and the product name retained in captions/alt text. Descriptions and metadata now focus on the design and practical product enquiries. Existing dictionary keys are retained for compatibility.

This is a text-only update: image files, source paths, cover/gallery order, CSS, product names, IDs, SKUs, variants, prices, stock, archived records, settings and private provenance are unchanged. The image processing history remains in private notes and ASSET_PROVENANCE.md. Local-only operation, noindex, unknown contact fallbacks and enquiry copy/no-send behavior remain in place. The visible wording change does not publish the site or verify product details.

Working revision 7 contains the same 23 published photo products and 24 archived samples. Latest backup: `data/local/backups/catalogue-2026-10-27T13-00-53-518Z-b3aebbc0.zip`. The private report `photo-previews/customer-copy-registration.json` records the pre/post backups and image preservation checks. Transfer this latest backup with the clean source ZIP.

## New bangle photographs — 28 October 2026

All 14 photos in `WhatsApp Unknown 2026-10-28 at 7.29.45 AM.zip` now have separate bangle records, each with an ivory-background cover followed by its original photo. Captions follow the existing “The signature look” / “A closer look” wording in all three languages. The existing image treatment, layout, homepage features, category images, user edits and archived samples are unchanged. No matching original-file hashes were already registered. Similar colour/design identities remain provisional until checked against the physical products.

The customer catalogue has **37 products**: 25 bangles, 9 earrings and 3 jewellery sets. The admin retains **61 records**, including 24 archived samples. Revision 8 has **75 managed uploads**: 38 supplied original photos and 37 generated covers. New records have stable IDs/SKUs/variant IDs, translated names/descriptions, pending review and unknown size, sale-unit quantity, price and stock. No material or stock count was inferred from the photos.

In the admin, choose Bangles and search the product name or SKU. The private `photo-previews/import-2026-10-28/product-index.txt` lists all 14 names, references, source filenames and customer links. `manifest.json` in that folder records each generated cover and its full built-in imagegen prompt; `registration.json` records source hashes and before/after backups. Exact small details can differ, especially where the supplied photos were blurred or wrapped; originals remain available for comparison.

Latest complete backup: `data/local/backups/catalogue-2026-10-28T02-13-45-636Z-d920e1ad.zip`. Transfer it with the clean source ZIP; the source archive excludes all personal uploads. Normal save → export → build → preview commands are unchanged.

## Earring photographs — 28 October 2026, evening

All 18 photos from `WhatsApp Unknown 2026-10-28 at 5.50.23 PM.zip` are retained across **17 new earring records**, each with an ivory-background presentation cover. Photos 13 and 18 provisionally share the segmented tiered-bell record as alternate views; confirm that grouping against the physical stock. The repeated heart studs on photo 3's display card are represented by one design record and a cover showing one pair. Package numbers are not treated as confirmed prices or quantities.

Revision 9 has **54 published photo products** (25 bangles, 26 earrings, 3 jewellery sets), **78 saved records** including 24 archived samples, and **110 uploads** (56 supplied originals plus 54 covers). The previous 61 records and 150 original/derivative files are unchanged. New items can be found in the admin by Category → Earrings, then name or SKU. Size, price, sale quantity and stock remain unconfirmed. Captions continue to use “The signature look”, “A closer look” and “Another angle”, with Hindi/Gujarati equivalents.

The private `photo-previews/import-2026-10-28-evening/manifest.json` contains source hashes, selected covers and full built-in imagegen prompts. `product-index.txt` maps names/SKUs/URLs to source filenames; `registration.json` records preservation checks and backup paths. Review physical details and translations before launch; generated fine details can differ from the retained originals.

Latest complete backup: `data/local/backups/catalogue-2026-10-28T12-33-50-153Z-479712e3.zip`. Transfer this with the regenerated source ZIP; source packaging excludes personal photos and runtime data. The normal save → export → build → preview flow is unchanged. No database migration or deployment was added.

## Bangle trays and original views — 31 October 2026

All 12 photos from `WhatsApp Unknown 2026-10-31 at 6.43.03 PM.zip` are retained. Following the user's choice, clearly visible tray designs have separate entries; partly hidden designs remain in the original gallery. This update adds **37 new bangle entries with ivory studio covers** and adds original views to **four existing records**, preserving their covers and identities. Three individual photos match the red scattered-stone and rainbow/pastel faceted ranges; one tray also shows the existing gold-tone stone design. These visual groupings still need physical confirmation before inventory accounting. A tray photograph is not a sale set or a stock count.

Revision 10 contains **91 published photo products** (62 bangles, 26 earrings, 3 jewellery sets), **115 saved records** including 24 archived samples, and **159 managed uploads** (68 supplied originals, 91 presentation covers). Shared tray photos are stored once and referenced by multiple products. Existing images, layout, homepage/category imagery, settings, IDs and inventory fields are preserved. Four existing galleries and their private notes are extended; all other existing records are unchanged. New prices, sizes, stock and sale-unit quantities remain unconfirmed.

Find the new items through **Admin → Products → Bangles**, using their name or SKU. English/Hindi/Gujarati names, descriptions, variant prompts and image captions are saved together under each stable product identity. Captions retain “The signature look”, “A closer look” and “Another angle”. The private `photo-previews/import-2026-10-31/product-index.txt` maps new names/SKUs/URLs to source photographs; `manifest.json` records all selected covers and full built-in imagegen prompts, and `registration.json` records the import and backup paths. Generated fine details and draft translations require review against the original photographs and physical items.

**Current complete catalogue backup:** `data/local/backups/catalogue-2026-10-31T13-36-11-826Z-5279744e.zip`. Transfer it with `artifacts/daya-variety-store-phase-3-source.zip`; the source ZIP deliberately excludes personal photos and mutable data. Restore/export/build commands above and in WINDOWS_SETUP.md remain unchanged. Earlier catalogue counts and “latest” backup references in this document describe historical snapshots. No database, Docker, deployment or customer messaging backend was added.
