import { zipSync, unzipSync } from "fflate";
import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { stateSchema, AdminError, type AdminState } from "./model";
import { JsonRepository } from "./repository";
import { withLock, regularFile, exists, atomicWrite } from "./storage";
import { processImage, imageBytes } from "./images";
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
async function backupUnlocked(repo: JsonRepository) {
  const state = await repo.read();
  const entries: Record<string, Uint8Array> = {
    "state.json": Buffer.from(JSON.stringify(state, null, 2)),
  };
  for (const asset of state.assets)
    for (const name of ["original." + asset.originalExtension, "public.webp"])
      entries[`uploads/${asset.id}/${name}`] = await regularFile(
        path.join(repo.paths.uploads, asset.id, name),
      );
  entries["manifest.json"] = Buffer.from(
    JSON.stringify({
      format: "daya-catalogue-backup",
      version: 1,
      createdAt: new Date().toISOString(),
      sha256: Object.fromEntries(
        Object.entries(entries).map(([k, v]) => [k, hash(v)]),
      ),
    }),
  );
  const file = path.join(
    repo.paths.backups,
    `catalogue-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.zip`,
  );
  await atomicWrite(file, zipSync(entries, { level: 6 }));
  return file;
}
export async function backupCatalogue(repo: JsonRepository) {
  return withLock(repo.paths, () => backupUnlocked(repo));
}
export async function validateBackup(file: string) {
  const info = await stat(file);
  if (info.size > 256 * 1024 * 1024)
    throw new AdminError("Backup exceeds 256 MiB compressed limit");
  let size = 0;
  let count = 0;
  const entries = unzipSync(await regularFile(file), {
    filter(entry) {
      size += entry.originalSize;
      count++;
      if (size > 512 * 1024 * 1024 || count > 5000)
        throw new AdminError("Backup exceeds extraction limits");
      if (
        !/^(state\.json|manifest\.json|uploads\/[a-f0-9-]{36}\/(original\.(jpeg|png|webp)|public\.webp))$/.test(
          entry.name,
        )
      )
        throw new AdminError("Unsafe or unexpected backup path");
      return true;
    },
  });
  const manifest = JSON.parse(
    Buffer.from(entries["manifest.json"] ?? []).toString(),
  );
  if (
    manifest.format !== "daya-catalogue-backup" ||
    manifest.version !== 1 ||
    !manifest.sha256 ||
    typeof manifest.sha256 !== "object"
  )
    throw new AdminError("Invalid backup manifest");
  const state = stateSchema.parse(
    JSON.parse(Buffer.from(entries["state.json"] ?? []).toString()),
  );
  const expected = new Set([
    "state.json",
    "manifest.json",
    ...state.assets.flatMap((a) => [
      `uploads/${a.id}/original.${a.originalExtension}`,
      `uploads/${a.id}/public.webp`,
    ]),
  ]);
  if (Object.keys(entries).length !== expected.size)
    throw new AdminError("Backup files do not match saved image registry");
  for (const name of expected) {
    if (!entries[name]) throw new AdminError("Missing backup file: " + name);
    if (
      name !== "manifest.json" &&
      hash(entries[name]) !== manifest.sha256[name]
    )
      throw new AdminError("Backup checksum mismatch: " + name);
  }
  for (const a of state.assets) {
    const original = await processImage(
      Buffer.from(entries[`uploads/${a.id}/original.${a.originalExtension}`]),
    );
    if (
      original.extension !== a.originalExtension ||
      original.width !== a.width ||
      original.height !== a.height ||
      entries[`uploads/${a.id}/original.${a.originalExtension}`].length !==
        a.bytes
    )
      throw new AdminError("Image metadata mismatch");
    await processImage(Buffer.from(entries[`uploads/${a.id}/public.webp`]));
  }
  // Validate every association, including drafts, without allowing filesystem paths.
  const allowed = new Set(
    state.assets.map((a) => "/catalogue-images/" + a.id + ".webp"),
  );
  for (const src of [
    ...state.categories.map((c) => c.image),
    ...state.products.flatMap((p) => p.images.map((i) => i.src)),
  ]) {
    if (src.startsWith("/catalogue-images/") && !allowed.has(src))
      throw new AdminError("Backup has an unknown image reference");
    if (src.startsWith("/images/"))
      await imageBytes({} as Parameters<typeof imageBytes>[0], state, src);
  }
  return { state, entries };
}
export async function restoreCatalogue(repo: JsonRepository, file: string) {
  const checked = await validateBackup(file); // no writes until archive validation succeeds
  return withLock(repo.paths, async () => {
    const present = await exists(repo.paths.state);
    let current: AdminState | null = null;
    if (present) {
      try {
        current = await repo.read();
      } catch {
        /* Corrupt state is preserved intact by the directory swap below. */
      }
    }
    // Preserve a corrupt runtime too: rename it intact below, rather than reseed it.
    const backup = current ? await backupUnlocked(repo) : null;
    const state = {
      ...checked.state,
      revision:
        Math.max(
          current?.revision ?? (present ? Date.now() : 0),
          checked.state.revision,
        ) + 1,
    };
    const stage = path.join(repo.paths.base, "restore-" + randomUUID());
    await mkdir(stage, { recursive: true, mode: 0o700 });
    for (const [name, bytes] of Object.entries(checked.entries)) {
      if (name === "manifest.json" || name === "state.json") continue;
      const target = path.join(stage, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes, { mode: 0o600 });
    }
    await atomicWrite(
      path.join(stage, "state.json"),
      JSON.stringify(state, null, 2) + "\n",
    );
    const old = path.join(repo.paths.backups, "before-restore-" + randomUUID());
    await mkdir(repo.paths.backups, { recursive: true });
    const hadRuntime = await exists(repo.paths.runtime);
    if (hadRuntime) await rename(repo.paths.runtime, old);
    try {
      await rename(stage, repo.paths.runtime);
    } catch (e) {
      if (hadRuntime) await rename(old, repo.paths.runtime);
      throw e;
    }
    return {
      revision: state.revision,
      backup,
      previousRuntime: hadRuntime ? old : null,
    };
  });
}
