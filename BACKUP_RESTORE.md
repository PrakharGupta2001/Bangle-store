# Catalogue backup and restore

## Source ZIP and catalogue backup are different

- `artifacts/daya-variety-store-phase-3-source.zip` contains application source, the lockfile, immutable demo fixtures/assets, tests and documentation. It excludes saved admin changes, uploads, exports, backups and authentication secrets.
- A catalogue backup ZIP contains saved products, categories, store/homepage settings, image registry, uploaded originals and their public WebP derivatives. **It includes private storage locations and internal notes. Keep it private.** It excludes access codes, sessions, application dependencies and generated storefront output.

Copying the source ZIP alone will start with bundled demonstrations. Transfer a separate catalogue backup to carry saved edits and photographs to another computer. There is no automatic upload or cloud backup.

## Create a backup

From the project folder:

```text
npm run catalogue:backup
```

Or select **Export & backup → Create local catalogue backup** in the authenticated admin. The command/UI reports a timestamped file in `data/local/backups/`. Backups read a consistent saved revision under the write lock; unsaved form changes are not included. Uploaded files retained after association removal are included so existing references can be recovered.

The backup contains `state.json`, `uploads/<asset-id>/original.<extension>`, `uploads/<asset-id>/public.webp`, and `manifest.json` with SHA-256 checksums. It contains no `auth` directory. Keep the code/source ZIP alongside it for compatible restoration. No MySQL dump is used.

## Transfer to the personal Windows laptop

1. Extract the Phase 3 source ZIP into a personal folder.
2. Install Node.js 24 LTS and run `npm ci` there.
3. Copy the catalogue backup into a directory inside that project, for example `transfer/catalogue-backup.zip`.
4. Stop the admin process before restoring. Run:

```text
npm run catalogue:restore -- transfer/catalogue-backup.zip
npm run catalogue:export
npm run build:demo
npm run preview
```

5. Open http://127.0.0.1:4173/en/, `/hi/` or `/gu/` and verify the restored content/images.
6. Run `npm run admin`, then in another terminal `npm run admin:access`. The destination installation generates its own access code. The old computer's code and sessions are not transferred.

## Restore safeguards

Restore validates the ZIP format, paths, entry count, expanded size, checksums, JSON schema, image contents/dimensions and associations before replacing anything. Only expected catalogue and image entries are accepted. Limits: 256 MiB compressed, 512 MiB expanded, 5,000 entries. Larger datasets need a reviewed backup strategy before reaching those limits; do not split or alter the ZIP manually.

For a healthy existing dataset, restore first creates a regular catalogue backup. The entire previous runtime directory is also retained at `data/local/backups/before-restore-<id>/`. A corrupt saved state is preserved there too; it is never silently reseeded. New data is staged, then the runtime directories are swapped under the shared write lock. A failed swap attempts to restore the previous directory. The restored revision is increased so old browser tabs cannot overwrite it.

Existing authentication files are preserved on the same computer; exported snapshots remain unchanged until you explicitly export again. Stop/restart the admin and reload browser tabs after restoration. Then export and rebuild. Keep the pre-restore copies until you have checked the result.

The automated restore test uses separate temporary datasets and compares product records, private fields and image bytes. It does not overwrite the working catalogue. Restore was tested on macOS; verify the procedure on the destination Windows laptop as well.

## Recovery and local files

If `state.json` is corrupt, startup reports the error and leaves it untouched. Restore a verified backup; do not delete it to trigger initialisation. If the runtime directory exists but `state.json` is missing, startup also refuses to reset it.

Writes are serialized in-process and protected across processes by `data/local/.write-lock/`. An interrupted process can leave a stale lock. First stop **all** admin, export, backup and restore commands; confirm none is running. Then remove only that empty `.write-lock` directory and retry. Never remove a lock while a write is active. Do not delete the runtime directory as a workaround.

The app records previous saved revisions under `data/local/runtime/history/`. These are local recovery copies, not a replacement for explicit portable backups. Originals, history, old exports and backups are retained; permanent deletion/automatic garbage collection is deliberately absent in this phase. Monitor local disk space.

For an access-code reset, stop the admin and rename `data/local/auth/access-code.txt` to a private recovery location outside source packaging, then restart. A new random code is generated. Restarting invalidates all sessions. Do not copy access codes into frontend code or public settings.
