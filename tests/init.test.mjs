import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  copyFile,
  readFile,
  writeFile,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
test("bootstrap restores missing demo files and preserves existing edits", async () => {
  const root = await mkdtemp(path.resolve(".test-tmp-"));
  try {
    await mkdir(path.join(root, "scripts"));
    await copyFile(
      "scripts/demo-translations.json",
      path.join(root, "scripts/demo-translations.json"),
    );
    await copyFile(
      "scripts/init-demo.mjs",
      path.join(root, "scripts/init-demo.mjs"),
    );
    const run = () =>
      execFileSync(process.execPath, ["scripts/init-demo.mjs"], { cwd: root });
    run();
    const fixture = path.join(root, "data/fixtures/catalogue.json");
    const original = await readFile(fixture, "utf8");
    assert.equal(JSON.parse(original).products.length, 24);
    const edited = original
      .replace("Gulabi bangle set", "Edited bangle set")
      .replace("गुलाबी चूड़ी सेट", "संपादित नाम")
      .replace("ગુલાબી બંગડી સેટ", "બદલેલું નામ");
    await writeFile(fixture, edited);
    const missing = path.join(
      root,
      "apps/storefront/public/images/bangles-01.svg",
    );
    await rm(missing);
    run();
    assert.equal(await readFile(fixture, "utf8"), edited);
    assert.match(await readFile(missing, "utf8"), /<svg/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
