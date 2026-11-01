# Architecture

## Two separate applications

The public app remains Next.js App Router + TypeScript with `output: 'export'`, `trailingSlash: true`, bundled images and the existing white-and-gold CSS. `apps/admin` is a separate Express 5/Node/TypeScript service with a React interface bundled locally by esbuild. It does not add endpoints to the public Next application. Every server binds to `127.0.0.1`.

```text
immutable fixtures + translation/settings defaults
               | initialize once
               v
AdminRepository -> JsonRepository -> data/local/runtime/state.json
               | authenticated save (revision check, lock, atomic replacement)
               v
explicit export action -> new immutable public snapshot + referenced public images
               | atomically replace exports/current.json only after success
               v
prepare:storefront -> generated public build inputs / image staging
               v
Next static export -> apps/storefront/out -> independent file-only preview
```

Saving never deploys or rebuilds. Exporting never runs deployment. Builds read the selected snapshot, not mutable admin state or a live admin API. If no runtime/export exists, the first build initializes demos once. Existing runtime without an export requires an explicit export. Corrupt state is reported and preserved rather than reseeded.

## Catalogue model and persistence

Shared schema/types remain in `packages/catalogue`. IDs, SKU, category references, prices, availability, sizes and variants are shared across languages. Prices are integer paise; null means unknown. Variants retain nullable stock, string sizes and quantities, and optionally localized colours. Featured ordering is a nonnegative integer.

The admin wraps each record with `private: { storageLocation, notes }`; these fields never belong to public DTOs. Publication, review, availability and demo identity remain distinct. Stable product IDs/SKUs are enforced by server mutation routes. Duplicates receive new product/SKU/variant IDs and draft status; shared images remain associated without copying originals. Existing demo identity cannot be removed. Archive/restore changes status and never deletes records. Category identity/removal guards protect references.

`AdminRepository` exposes `read` and revision-checked `update`. `JsonRepository` initializes only when runtime is absent, validates the whole state, serializes operations in-process and uses a directory lock across processes. Each write saves the previous revision, writes a new sibling temporary file, flushes it, and renames it over the state file. Revision conflicts return HTTP 409; invalid state is rejected server-side. A stale crash lock requires the documented stopped-process recovery procedure. No browser storage is used as the database. Filesystem permissions are restricted where supported; the admin is designed for one trusted OS user, not hostile local multi-user isolation.

Draft translations and empty image lists can be saved. Export validates published records against the strict shared catalogue schema and requires all three product/category/variant/alt translations. A failed export does not replace the prior pointer. Invalid published content is an actionable export error, not silently skipped or replaced by English. Drafts and archived records are excluded.

## Authentication and request protection

First startup generates a random access code in `data/local/auth/access-code.txt`; `admin:access` reads it for the local operator. The code is never embedded in the browser bundle or source. Login uses a timing-safe digest comparison and rate-limited failures. Sessions are random, server-side, expire after eight hours, and disappear on process restart. Cookies use HttpOnly and SameSite=Strict. HTTP is loopback-only; production HTTPS authentication is outside this phase.

Every API route except login requires a session, including image previews and catalogue reads. All requests validate the exact configured Host; provided Origins must match the local admin origin. Mutations also require the expected Origin, a custom same-origin header and a session CSRF token (login requires Origin/custom header before a session exists). Cross-site fetches/preflights have no CORS allowance. The server, not hidden controls, enforces access. Responses use no-store, nosniff, frame denial and a restrictive CSP. Only the sign-in shell, bundled JS and CSS are unauthenticated static routes.

## Images

Uploads are raw binary bodies after authentication/CSRF checks. Sharp validates actual decoded single-frame JPEG/PNG/WebP contents with a byte limit of 8 MiB, 6000px per side and 24 million pixels. It rotates for orientation, resizes inside 1600×1600, strips metadata by default and encodes WebP. Safe random UUID filenames are generated; client filenames and paths are never used. New SVG, remote URL, arbitrary-path and executable uploads are rejected.

The image registry is part of saved state. Originals and public derivatives live under the private runtime uploads directory. Exact authenticated image routes resolve registry IDs; no directory is served wholesale. Trusted bundled SVGs are accepted only at paths present in the immutable fixture. Reordering changes associations; image zero is the cover. Removing an association never deletes a shared image. Orphan originals are retained for recovery; garbage collection is future work.

Export copies only images referenced by public products/categories. Original uploads, EXIF metadata, private paths and the registry do not enter the public snapshot. Staging prepares only referenced uploaded derivatives. Bundled demo SVGs remain source assets for clean demo installations. When photo products exist, the homepage hero uses a featured photo-based bangle cover (or another photo product). Homepage category cards and collection filters omit categories without published products; admin definitions and direct translated empty-category routes remain intact.

The 26 October photo catalogue uses this same pipeline: 23 existing photo-product records have AI-edited ivory presentation covers followed by their 24 source photographs. No additional image service, runtime AI dependency or separate inventory record is introduced. Translated captions/descriptions disclose AI editing; private notes retain source provenance and outstanding review. Category images reuse three product covers. Future edits use the normal admin image order and save/export/build workflow. Fine-detail accuracy and physical stock are not established by an image edit.

## Public export boundary

`public-schema.ts` validates the public snapshot. `toPublicProduct` constructs explicit nested fields for product content, images, variants and language keys. It excludes private notes/storage, stock, review/publication metadata and unexpected nested fields. Settings/homepage data are strict allowlisted schemas. Authentication and backups are not input to the exporter at all.

An export reads one saved revision under the same write lock. It writes a new `snapshot-<id>` directory, verifies required images, and atomically advances `current.json` only after the data and assets are ready. Old valid snapshots remain intact. `prepare:storefront` validates the selected snapshot and stages generated inputs; the static application only consumes those public inputs. Re-running normal builds cannot reset saved edits or silently substitute bundled fixtures for a valid export.

## Languages and SEO

Locale layouts generate `/en/`, `/hi/` and `/gu/` and set the document language. Shared route helpers drive equivalent-page language links and canonical/hreflang URLs. Product variant selection survives language switching via the stable query ID. Category navigation uses the exported category slug, so editing a slug does not leave fixed bangle links behind. Collection counts follow the export.

UI dictionaries live in `apps/storefront/lib/translations`; catalogue translations live in admin JSON after initialization. Exported home/hero overrides support the admin homepage editor. Translation identity is shared rather than duplicated inventory. Indic system font fallbacks require no network downloads. Hindi/Gujarati drafts still need native-speaker review.

Every Phase 3 page remains noindex/nofollow independent of public URL configuration or product demo status. Live WhatsApp actions are disabled at the storefront boundary; local variant-aware copy previews and pure future link helpers remain. Missing contacts stay honest placeholders. A genuine configured map link opens only after a visitor click. No automatic external messaging, indexing or deployment is introduced.

Public origin helpers omit canonical/alternate metadata when unset/local. The future sitemap helper remains readiness-gated and excludes demos; no sitemap endpoint or fabricated structured data is emitted. Per-locale not-found pages are served with HTTP 404 by the static preview. Global unmatched routes have a multilingual fallback using the existing experimental Next `globalNotFound` support. A future host needs equivalent error routing.

## Backups, recovery and portability

Portable catalogue ZIPs contain saved state and registered uploads with a checksum manifest, excluding all authentication/session secrets. Restore validates paths, schema, checksums, image contents and references before staging data. It preserves the previous dataset and advances the revision; existing exports remain unchanged until explicit re-export. See BACKUP_RESTORE.md for exact commands, size limits, corrupt-state recovery and transfer.

The source ZIP is a separate explicit allowlist of application code, lockfile, fixtures, trusted assets, tests and docs. Mutable state, uploads, generated images/snapshots, backups, secrets, actual environment files, dependencies, caches, Git and reports are excluded. Scripts use portable Node APIs. Framework commands disable telemetry in the child process rather than touching global configuration. No company dependencies/services or MySQL are used.

Phase 4 can implement `AdminRepository` using MySQL with adapter parity tests and migration procedures. Public DTOs, export validation and the independent static site remain the same.

Implementation references: [Express API](https://expressjs.com/en/5x/api/), [Sharp input limits](https://sharp.pixelplumbing.com/api-constructor/), [Sharp output processing](https://sharp.pixelplumbing.com/api-output/), and the installed Next.js static-export documentation. Dependency versions are recorded in package-lock.json.

## Photo catalogue update — 28 October 2026 evening

The existing JSON/upload/export pipeline now holds 54 published photo products and 24 archived samples, with 110 registered assets (56 supplied originals, 54 generated presentation covers). The evening import adds 17 earring records from 18 photographs; two provisional alternate views share one identity. Image references and order remain part of each product, and originals remain in managed storage/backups. Public gallery captions use the neutral wording requested on 27 October; generation provenance stays in private notes. No new image service or backend/database dependency was introduced.

## Photo catalogue update — 31 October 2026

The existing repository/upload/export flow now holds 91 published photo products, 24 archived samples and 159 registered assets (68 supplied originals, 91 covers). Thirty-seven new bangle design records use individual studio covers and shared original tray references. Four existing records gain an alternate source view and provenance notes, with their cover, product/SKU/variant identity and inventory fields preserved. The import caches originals by SHA-256 so every source is saved once even when used by several designs. All 220 previously stored original/derivative files remain byte-identical. No schema or application code change is needed.

The tray-to-design selection is provisional editorial classification, not a stock ledger. No quantity is derived from pictured repeats and no colour/size variants are invented. Physical identity, sale-unit contents and image fidelity remain owner review tasks. All source JPEGs and processed covers are covered by the existing private backup and static-export boundaries.
