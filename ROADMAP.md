# Roadmap

## Phase 1 — completed storefront demo

Static English storefront, 24 validated demonstration products, original bundled illustrations, working search/filter/sort, variant-aware local enquiry, honest contact placeholders, noindex, tests and portable packaging. These remain intact.

## Phase 2 — completed languages, enquiries, directions and SEO foundation

- Real static English, Hindi and Gujarati pages; translated UI, catalogue, metadata, breadcrumbs and errors; correct document language and font fallbacks.
- Equivalent-page language switching with stable product/variant IDs and selected variant preservation.
- Accessible translated local enquiry previews; copy feedback; tested reusable WhatsApp link generation, with external messaging disabled for every demo product regardless of configuration.
- Central nullable contact settings and validated future directions links; honest current placeholders.
- Shared route/SEO mapping, conditional canonical/hreflang generation, guarded future sitemap helper, and noindex retained independently of public URL configuration.
- Static export, focused automated tests, Chromium interaction/accessibility/mobile checks and source handover. See VERIFICATION.md for evidence and limits.

Hindi and Gujarati are draft translations awaiting native-speaker review before public launch. Real contact details, real products and production indexing remain later work. Phase 3 continues below.

## Phase 3 — completed local admin and persistent JSON

- Separate loopback-only Express/TypeScript + React admin, generated local access code, sessions, Host/Origin and CSRF protection.
- Product search/filtering, add/edit, duplicate-as-draft with new IDs, archive/restore, stable categories, variants, nullable prices/stock, featured ordering and private fields.
- English/Hindi/Gujarati editing, incomplete draft saves and strict published-export translation checks.
- Validated raster uploads, private originals, processed public WebP, cover/reordering and safe association removal.
- JSON repository with serialized writes, atomic replacement, revision conflicts, preserved corrupt data and local history.
- Explicit public export with nested field allowlists, immutable snapshots and previous-export preservation; storefront rebuilds from the selected snapshot with admin offline.
- Separate portable catalogue backup/validated restore and clean source packaging. See VERIFICATION.md for actual checks and known limits.

**Stop after Phase 3.** No MySQL, checkout, payments, customer accounts, external messaging automation or deployment is implemented. Permanent deletion, upload garbage collection and production launch/indexing remain outside this phase.

26 October catalogue update: all 24 supplied shop photographs are represented by 23 photo-product records, each with a coordinated AI presentation cover and retained original views. Existing identities, unknown inventory fields and demo records are preserved. Before actual inventory accounting or launch, confirm physical products/set contents, the provisional alternate-view grouping, image fidelity and translations. This content update does not implement a sales ledger or advance the database phase.

28 October evening catalogue update: 18 more supplied photos are retained across 17 new earring records, with matching covers. The public catalogue has 54 photo products; the admin has 78 records including 24 archived samples. Product identity review remains pending. This is a catalogue update within Phase 3; MySQL, Java backend migration and Docker were not implemented.

## Phase 4 — MySQL on the personal Windows laptop

- Design schema/migrations for products, variants, translations, images and private inventory.
- Add an admin-only adapter with parity tests against JSON storage.
- Keep credentials outside source and public builds.
- Verify migration, backup and restore on the destination laptop and document recovery.

## Phase 5 — final review and deployment preparation

- Replace or remove all demo products, images and illustrative prices; review translations with native speakers.
- Confirm genuine business/contact details, directions destination, accessibility, performance, dependencies and asset rights.
- Confirm production origin, static-host routing, localized 404 behavior, sitemap and canonical/hreflang links.
- Verify that the storefront works with admin/database offline.
- Enable indexing only after explicit production-readiness approval and content verification.
- Prepare deployment handover; publication requires a separate instruction. Checkout and payments are outside the current roadmap.

## Catalogue maintenance — 31 October 2026

Completed content import within Phase 3: 12 source photographs, 37 new bangle design entries and four alternate-view updates to existing products. The public catalogue now contains 91 photo products; the admin retains 115 records including the archived samples. Studio covers, three-language copy, shared source galleries and stable references use the existing JSON workflow. Physical design matching, exact sale quantities, image fidelity and translation review remain pending. This does not advance the MySQL phase or introduce Docker, deployment, customer accounts or a messaging inbox.
