# Daya Variety Store — Phase 3

A local personal project for Daya Variety Store in Vadodara, Gujarat, India. Bangles remain the primary category, alongside earrings, mangalsutras, clips and hair bands. The existing white, ivory and restrained-gold design, 24 demo products, stable identities and English/Hindi/Gujarati static pages are preserved.

Phase 3 delivers the complete local workflow: edit a product, save to persistent JSON, restart and confirm persistence, export a validated public catalogue, rebuild the static storefront and see the update with the admin stopped.

The separate admin under apps/admin provides authenticated local management of products, variants, images, translations, categories, featured ordering and store/homepage settings. Public exports use explicit field allowlists and cannot contain private notes, storage locations, stock, review metadata or authentication secrets. Upload originals and mutable data remain outside public folders. Backups transfer saved catalogue data/images separately from the clean source ZIP.

All servers bind to 127.0.0.1. All Phase 3 public output remains a demonstration with noindex; entering contacts does not enable live enquiries, indexing or deployment. No real information is required, and missing contacts stay unset. Hindi and Gujarati need native-speaker review before launch.

Keep persistent storage behind an admin repository interface for Phase 4 MySQL on the personal Windows laptop. The public app must remain independent of the admin/database. No company code, settings, credentials, services or packages are used. No checkout, payments, customer accounts, MySQL connection or public deployment belongs in this milestone.

See README.md for exact commands, ARCHITECTURE.md for boundaries, BACKUP_RESTORE.md for transfer/recovery, VERIFICATION.md for checks, and ROADMAP.md for later phases. Stop after completing Phase 3.
