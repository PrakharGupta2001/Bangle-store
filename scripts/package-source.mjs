import { readdir, readFile, mkdir, writeFile, lstat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { zipSync, unzipSync } from "fflate";
const root = fileURLToPath(new URL("../", import.meta.url));
const files = {};
// An allowlist, never an archive of the working directory. Symlinks are rejected.
const rootFiles = [
  "package.json",
  "package-lock.json",
  ".npmrc",
  ".prettierignore",
  ".gitignore",
  ".env.example",
  "PROJECT_BRIEF.md",
  "README.md",
  "ARCHITECTURE.md",
  "ROADMAP.md",
  "WINDOWS_SETUP.md",
  "ASSET_PROVENANCE.md",
  "VERIFICATION.md",
  "BACKUP_RESTORE.md",
  "playwright.admin.config.ts",
  "playwright.config.ts",
];
const trees = [
  "apps/admin/src",
  "apps/admin/ui",
  "apps/storefront/app",
  "apps/storefront/components",
  "apps/storefront/config",
  "apps/storefront/lib",
  "apps/storefront/public",
  "packages/catalogue/src",
  "data/fixtures",
  "scripts",
  "tests",
];
const extra = [
  "apps/admin/package.json",
  "apps/admin/tsconfig.json",
  "apps/storefront/package.json",
  "apps/storefront/next.config.mjs",
  "apps/storefront/next-env.d.ts",
  "apps/storefront/tsconfig.json",
  "packages/catalogue/package.json",
];
async function add(relative) {
  if (
    relative === "apps/storefront/public/catalogue-images" ||
    relative.startsWith("apps/storefront/public/catalogue-images/")
  )
    return;
  const file = path.join(root, relative);
  const info = await lstat(file);
  if (info.isSymbolicLink()) throw new Error("Refusing symlink: " + relative);
  if (info.isDirectory()) {
    for (const entry of await readdir(file)) await add(relative + "/" + entry);
  } else {
    if (
      /(?:^|\/)(?:\.env(?!\.example$)|node_modules|\.git|\.next|runtime)(?:\/|$)|\.(?:zip|log|sql|tsbuildinfo)$/.test(
        relative,
      )
    )
      throw new Error("Unexpected file in source allowlist: " + relative);
    files["daya-variety-store/" + relative] = new Uint8Array(
      await readFile(file),
    );
  }
}
for (const relative of [...rootFiles, ...extra, ...trees]) await add(relative);
const zipped = zipSync(files, { level: 9 });
const entries = Object.keys(unzipSync(zipped));
if (entries.length !== Object.keys(files).length)
  throw new Error("ZIP verification failed");
await mkdir(path.join(root, "artifacts"), { recursive: true });
const output = path.join(
  root,
  "artifacts/daya-variety-store-phase-3-source.zip",
);
await writeFile(output, zipped);
console.log(
  `Packaged ${entries.length} source files (${zipped.length} bytes): ${output}`,
);
