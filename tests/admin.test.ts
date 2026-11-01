import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { unzipSync, zipSync } from "fflate";
import { dataPaths, projectRoot } from "../apps/admin/src/paths";
import {
  JsonRepository,
  createProduct,
  duplicateProduct,
} from "../apps/admin/src/repository";
import { stateSchema, missingTranslations } from "../apps/admin/src/model";
import { exportCatalogue, readExport } from "../apps/admin/src/export";
import { saveUpload, processImage, imageBytes } from "../apps/admin/src/images";
import {
  backupCatalogue,
  restoreCatalogue,
  validateBackup,
} from "../apps/admin/src/backup";
import {
  toPublicProduct,
  buildEnquiryMessage,
} from "../packages/catalogue/src/index";
async function setup() {
  const directory = await mkdtemp(path.join(projectRoot, ".test-tmp-admin-"));
  const paths = dataPaths(directory);
  const repo = new JsonRepository(paths);
  await repo.initialize();
  return { directory, paths, repo };
}
const raster = () =>
  sharp({
    create: { width: 320, height: 240, channels: 3, background: "#b79043" },
  })
    .png()
    .toBuffer();
test("unknown bangle size stays null through save, export and restore", async () => {
  const { repo, paths, directory } = await setup();
  try {
    assert.equal(createProduct("bangles").variants[0].size, null);
    const initial = await repo.read();
    const saved = await repo.update(initial.revision, (s) => {
      s.products[0].variants[0].size = null;
    });
    assert.equal(
      (await new JsonRepository(paths).read()).products[0].variants[0].size,
      null,
    );
    await exportCatalogue(repo);
    const snapshot = await readExport(paths);
    assert.equal(snapshot.catalogue.products[0].variants[0].size, null);
    const backup = await backupCatalogue(repo);
    await repo.update(saved.revision, (s) => {
      s.products[0].variants[0].size = "2-6";
    });
    await restoreCatalogue(repo, backup);
    assert.equal((await repo.read()).products[0].variants[0].size, null);
    const invalid = await repo.read();
    invalid.products[0].variants[0].size = "unknown";
    assert.equal(stateSchema.safeParse(invalid).success, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("JSON changes persist across repository restarts; concurrent tabs cannot overwrite", async () => {
  const { repo, paths, directory } = await setup();
  try {
    const s = await repo.read();
    const id = s.products[0].id,
      sku = s.products[0].sku;
    await repo.update(s.revision, (d) => {
      d.products[0].content.hi!.name = "सहेजा गया नमूना";
      d.products[0].private.notes = "PRIVATE_SENTINEL";
      d.products[0].pricePaise = 12345;
      d.products[0].variants[0].stock = 0;
    });
    const reopened = new JsonRepository(paths);
    await reopened.initialize();
    const after = await reopened.read();
    assert.equal(after.products[0].content.hi!.name, "सहेजा गया नमूना");
    assert.equal(after.products[0].pricePaise, 12345);
    assert.equal(after.products[0].variants[0].stock, 0);
    assert.equal(after.products[0].id, id);
    assert.equal(after.products[0].sku, sku);
    await assert.rejects(
      repo.update(s.revision, (d) => {
        d.products = [];
      }),
      /another tab/,
    );
    const attempts = await Promise.allSettled([
      repo.update(after.revision, (d) => {
        d.products[0].private.notes = "first";
      }),
      repo.update(after.revision, (d) => {
        d.products[0].private.notes = "second";
      }),
    ]);
    assert.equal(attempts.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal((await repo.read()).revision, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("incomplete drafts save, duplicates have new identities, archive and restore are distinct", async () => {
  const { repo, directory } = await setup();
  try {
    const s = await repo.read(),
      original = structuredClone(s.products[0]);
    const duplicate = duplicateProduct(original),
      draft = createProduct("earrings");
    assert.notEqual(duplicate.id, original.id);
    assert.notEqual(duplicate.sku, original.sku);
    assert.notEqual(duplicate.variants[0].id, original.variants[0].id);
    assert.equal(duplicate.publicationStatus, "draft");
    assert(duplicate.isDemo);
    assert.equal(duplicate.private.notes, "");
    assert.deepEqual(s.products[0], original);
    await repo.update(s.revision, (d) => {
      d.products.push(duplicate, draft);
      d.products[0].publicationStatus = "archived";
    });
    assert(
      missingTranslations((await repo.read()).products.at(-1)!).includes("gu"),
    );
    await exportCatalogue(repo);
    let exported = await readExport(repo.paths);
    assert.equal(exported.catalogue.products.length, 23);
    assert(!exported.catalogue.products.some((p) => p.id === original.id));
    assert(!exported.catalogue.products.some((p) => p.id === duplicate.id));
    let saved = await repo.read();
    await repo.update(saved.revision, (d) => {
      d.products[0].publicationStatus = "draft";
    });
    await exportCatalogue(repo);
    assert.equal((await readExport(repo.paths)).catalogue.products.length, 23);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("published export enforces translations, category references and previous valid snapshot", async () => {
  const { repo, directory } = await setup();
  try {
    await exportCatalogue(repo);
    const pointer = await readFile(
      path.join(repo.paths.exports, "current.json"),
      "utf8",
    );
    let saved = await repo.read();
    await assert.rejects(
      repo.update(saved.revision, (d) => {
        d.products[0].categoryId = "missing-category";
      }),
      /Unknown category/,
    );
    await repo.update(saved.revision, (d) => {
      d.products[0].content.gu!.description = "";
    });
    await assert.rejects(exportCatalogue(repo));
    assert.equal(
      await readFile(path.join(repo.paths.exports, "current.json"), "utf8"),
      pointer,
    );
    saved = await repo.read();
    await repo.update(saved.revision, (d) => {
      d.products[0].publicationStatus = "draft";
    });
    await exportCatalogue(repo);
    assert.equal((await readExport(repo.paths)).catalogue.products.length, 23);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("explicit nested public allowlist excludes private data and keeps exact variants and price", async () => {
  const { repo, directory } = await setup();
  try {
    await repo.update(0, (d) => {
      d.products[0].private = {
        notes: "SECRET_NOTES_SENTINEL",
        storageLocation: "SECRET_BOX_SENTINEL",
      };
      d.products[0].variants[0].stock = 17;
      d.products[0].pricePaise = null;
      d.products[0].featuredOrder = 0;
    });
    await exportCatalogue(repo);
    const out = await readExport(repo.paths);
    const json = JSON.stringify(out.catalogue);
    for (const forbidden of [
      "SECRET_NOTES_SENTINEL",
      "SECRET_BOX_SENTINEL",
      "storageLocation",
      "notes",
      "reviewStatus",
      "stock",
      "publicationStatus",
      "auth",
      "access-code",
    ])
      assert(
        !json.includes('"' + forbidden + '"') && !json.includes("SENTINEL"),
      );
    const p = out.catalogue.products[0];
    assert.equal(p.pricePaise, null);
    assert.equal(p.variants[0].size, "2-4");
    assert(buildEnquiryMessage(p, "size-2-8", "gu").includes("2-8"));
    const custom = structuredClone(p);
    custom.variants[2].content = {
      en: { label: "Set" },
      hi: { label: "सेट" },
      gu: { label: "સેટ" },
    };
    custom.variants[2].colour = { en: "Red", hi: "लाल", gu: "લાલ" };
    for (const l of ["en", "hi", "gu"] as const) {
      const msg = buildEnquiryMessage(custom, "size-2-8", l);
      assert(msg.includes("2-8"));
      assert(msg.includes(custom.variants[2].colour![l]!));
    }
    const poisoned: any = structuredClone((await repo.read()).products[0]);
    poisoned.images[0].privatePath = "/private/secret";
    poisoned.variants[0].content.en.internalNotes = "SECRET";
    poisoned.content.en.storageBoxLocation = "SECRET";
    const projected = JSON.stringify(toPublicProduct(poisoned));
    assert(!projected.includes("SECRET") && !projected.includes("privatePath"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("uploads validate bytes and dimensions, strip metadata and export only public referenced images", async () => {
  const { repo, directory } = await setup();
  try {
    const input = await raster();
    let src = "";
    await repo.update(0, async (d) => {
      src = await saveUpload(repo.paths, d, input);
      d.products[0].images.unshift({
        src,
        alt: {
          en: "Uploaded demo",
          hi: "अपलोड किया गया नमूना",
          gu: "અપલોડ કરેલો નમૂનો",
        },
      });
    });
    const state = await repo.read();
    const processed = await imageBytes(repo.paths, state, src);
    const m = await sharp(processed).metadata();
    assert.equal(m.format, "webp");
    assert(!m.exif);
    assert((m.width ?? 0) <= 1600);
    await exportCatalogue(repo);
    const out = await readExport(repo.paths);
    assert.deepEqual(await readFile(path.join(out.dir, src)), processed);
    assert(out.catalogue.products[0].images[0].src === src);
    await assert.rejects(
      processImage(Buffer.from("<script>alert(1)</script>")),
    );
    await assert.rejects(
      processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    );
    await assert.rejects(processImage(Buffer.alloc(8 * 1024 * 1024 + 1)));
    await assert.rejects(
      processImage(
        await sharp({
          create: { width: 6001, height: 2, channels: 3, background: "white" },
        })
          .png()
          .toBuffer(),
      ),
    );
    for (const unsafe of [
      "../state.json",
      "/images/../../auth/access-code.txt",
      "https://example.com/photo.jpg",
      "/catalogue-images/unknown.webp",
    ])
      await assert.rejects(imageBytes(repo.paths, state, unsafe));
    await repo.update(state.revision, (d) => {
      d.products[1].images.push(d.products[0].images[0]);
      d.products[0].images.shift();
    });
    assert((await imageBytes(repo.paths, await repo.read(), src)).length > 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("backup and restore retain records and image references, exclude auth, preserve prior data", async () => {
  const a = await setup(),
    b = await setup();
  try {
    const input = await raster();
    await a.repo.update(0, async (d) => {
      const src = await saveUpload(a.paths, d, input);
      d.products[0].images[0] = {
        src,
        alt: { en: "Demo photo", hi: "नमूना चित्र", gu: "નમૂનાનું ચિત્ર" },
      };
      d.products[0].private.notes = "PRIVATE_BACKUP_NOTE";
    });
    await mkdir(a.paths.auth, { recursive: true });
    await writeFile(
      path.join(a.paths.auth, "access-code.txt"),
      "SECRET_AUTH_SENTINEL",
    );
    const file = await backupCatalogue(a.repo);
    const entries = unzipSync(await readFile(file));
    assert(!Object.keys(entries).some((k) => k.includes("auth")));
    assert(
      !Buffer.from(entries["state.json"])
        .toString()
        .includes("SECRET_AUTH_SENTINEL"),
    );
    const before = await b.repo.read();
    const result = await restoreCatalogue(b.repo, file);
    assert(result.previousRuntime);
    const restored = await b.repo.read(),
      source = await a.repo.read();
    assert.deepEqual(restored.products, source.products);
    assert.deepEqual(restored.assets, source.assets);
    assert(restored.revision > before.revision);
    assert.deepEqual(
      await imageBytes(a.paths, source, source.products[0].images[0].src),
      await imageBytes(b.paths, restored, restored.products[0].images[0].src),
    );
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(result.previousRuntime!, "state.json"),
          "utf8",
        ),
      ).revision,
      before.revision,
    );
    await exportCatalogue(b.repo);
    const unsafe = path.join(a.directory, "unsafe.zip");
    await writeFile(unsafe, zipSync({ "../outside.txt": Buffer.from("bad") }));
    await assert.rejects(restoreCatalogue(b.repo, unsafe), /Unsafe/);
    assert.deepEqual(await b.repo.read(), restored);
    const tampered = unzipSync(await readFile(file));
    tampered["state.json"] = Buffer.from(
      Buffer.from(tampered["state.json"])
        .toString()
        .replace("PRIVATE_BACKUP_NOTE", "TAMPERED"),
    );
    await writeFile(unsafe, zipSync(tampered));
    await assert.rejects(validateBackup(unsafe), /checksum/);
  } finally {
    await rm(a.directory, { recursive: true, force: true });
    await rm(b.directory, { recursive: true, force: true });
  }
});
test("corrupt saved data is preserved on startup; verified restore recovers it without resetting", async () => {
  const { repo, paths, directory } = await setup();
  try {
    const backup = await backupCatalogue(repo);
    const corrupt = "{not valid json";
    await writeFile(paths.state, corrupt);
    await assert.rejects(repo.initialize(), /preserved/);
    assert.equal(await readFile(paths.state, "utf8"), corrupt);
    const result = await restoreCatalogue(repo, backup);
    assert.equal(
      await readFile(path.join(result.previousRuntime!, "state.json"), "utf8"),
      corrupt,
    );
    assert.equal((await repo.read()).products.length, 24);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("nullable values, duplicate identities, unsafe image refs and malformed settings fail validation", async () => {
  const { repo, directory } = await setup();
  try {
    const base = await repo.read();
    assert.equal(base.products[0].variants[0].stock, null);
    assert.equal(base.settings.phone, null);
    for (const mutate of [
      (s: typeof base) => {
        s.products.push(s.products[0]);
      },
      (s: typeof base) => {
        s.products[0].pricePaise = 1.5;
      },
      (s: typeof base) => {
        s.products[0].variants[0].size = "2.4";
      },
      (s: typeof base) => {
        s.products[0].images[0].src = "../../private.jpg";
      },
      (s: typeof base) => {
        s.settings.mapUrl = "javascript:alert(1)";
      },
      (s: typeof base) => {
        s.settings.whatsapp = "123";
      },
    ]) {
      const copy = structuredClone(base);
      mutate(copy);
      assert(!stateSchema.safeParse(copy).success);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
