import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { type Paths, projectRoot } from "./paths";
import { JsonRepository } from "./repository";
import {
  publishedCatalogue,
  stateSchema,
  settingsSchema,
  homeSchema,
  AdminError,
} from "./model";
import {
  toPublicProduct,
  pickLocales,
} from "../../../packages/catalogue/src/index";
import { publicCatalogueSchema } from "../../../packages/catalogue/src/public-schema";
import {
  withLock,
  atomicWrite,
  readJson,
  exists,
  regularFile,
} from "./storage";
import { imageBytes } from "./images";
export async function exportCatalogue(
  repo: JsonRepository,
  expectedRevision?: number,
) {
  return withLock(repo.paths, async () => {
    const state = await repo.read();
    if (expectedRevision !== undefined && expectedRevision !== state.revision)
      throw new AdminError(
        "Saved revision changed. Reload before exporting.",
        409,
      );
    const validated = publishedCatalogue(state);
    const catalogue = publicCatalogueSchema.parse({
      schemaVersion: 1,
      products: validated.products
        .map(toPublicProduct)
        .sort((a, b) => (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999)),
      categories: validated.categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        image: c.image,
        content: pickLocales(c.content, (v) => ({
          name: v.name,
          description: v.description,
        })),
      })),
    });
    const settings = settingsSchema.parse(state.settings); // Strict allowlist; no auth/private fields accepted.
    const home = homeSchema.parse(state.home);
    const references = new Set([
      ...catalogue.categories.map((c) => c.image),
      ...catalogue.products.flatMap((p) => p.images.map((i) => i.src)),
    ]);
    const generation = "snapshot-" + randomUUID();
    const dir = path.join(repo.paths.exports, generation);
    // All work happens in a new immutable generation; only the final pointer makes it active.
    await mkdir(dir, { recursive: true, mode: 0o700 });
    for (const src of references) {
      const bytes = await imageBytes(repo.paths, state, src);
      const file = path.join(dir, src);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: "wx" });
    }
    await writeFile(
      path.join(dir, "public.json"),
      JSON.stringify({ catalogue, settings, home }, null, 2) + "\n",
      { flag: "wx" },
    );
    await atomicWrite(
      path.join(repo.paths.exports, "current.json"),
      JSON.stringify({
        generation,
        revision: state.revision,
        createdAt: new Date().toISOString(),
      }) + "\n",
    );
    return {
      revision: state.revision,
      products: catalogue.products.length,
      generation,
    };
  });
}
export async function readExport(paths: Paths) {
  const pointer = await readJson(path.join(paths.exports, "current.json"));
  if (!/^snapshot-[a-f0-9-]{36}$/.test(pointer.generation))
    throw new Error("Invalid export pointer; preserved");
  const dir = path.join(paths.exports, pointer.generation);
  const raw = await readJson(path.join(dir, "public.json"));
  const catalogue = publicCatalogueSchema.parse(raw.catalogue),
    settings = settingsSchema.parse(raw.settings),
    home = homeSchema.parse(raw.home);
  return { dir, catalogue, settings, home, revision: pointer.revision };
}
export async function prepareStorefront(paths: Paths) {
  if (!(await exists(path.join(paths.exports, "current.json")))) {
    if (await exists(paths.state))
      throw new Error(
        "Saved admin data exists but has no public snapshot. Run npm run catalogue:export explicitly, then rebuild.",
      );
    const repo = new JsonRepository(paths);
    await repo.initialize();
    await exportCatalogue(repo);
  }
  const result = await readExport(paths);
  // Export images are immutable and public. Old uploads are never copied wholesale.
  const target = path.join(
    projectRoot,
    "apps/storefront/public/catalogue-images",
  );
  const { rm } = await import("node:fs/promises");
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  const references = new Set([
    ...result.catalogue.categories.map((c) => c.image),
    ...result.catalogue.products.flatMap((p) => p.images.map((i) => i.src)),
  ]);
  for (const src of references) {
    const bytes = await regularFile(path.join(result.dir, src));
    if (src.startsWith("/catalogue-images/"))
      await writeFile(path.join(target, path.basename(src)), bytes);
  }
  await atomicWrite(
    path.join(projectRoot, "packages/catalogue/generated/catalogue.json"),
    JSON.stringify(result.catalogue, null, 2) + "\n",
  );
  await atomicWrite(
    path.join(projectRoot, "apps/storefront/generated/settings.json"),
    JSON.stringify(result.settings, null, 2) + "\n",
  );
  await atomicWrite(
    path.join(projectRoot, "apps/storefront/generated/site.json"),
    JSON.stringify({
      productCount: result.catalogue.products.length,
      categorySlugs: Object.fromEntries(
        result.catalogue.categories.map((c) => [c.id, c.slug]),
      ),
    }) + "\n",
  );
  await atomicWrite(
    path.join(projectRoot, "apps/storefront/generated/home.json"),
    JSON.stringify(result.home, null, 2) + "\n",
  );
  console.log(
    `Prepared storefront from saved public export revision ${result.revision} (${result.catalogue.products.length} products). Admin data was not changed.`,
  );
}
