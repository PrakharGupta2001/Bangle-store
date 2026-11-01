import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
const projectRoot = process.cwd();
const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const ended = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  child.kill();
  await ended;
};
const ready = (child: ChildProcess) =>
  new Promise<string>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Server did not start: " + output));
    }, 15000);
    child.stdout?.on("data", (b) => {
      output += b.toString();
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) {
        clearTimeout(timer);
        resolve(url);
      }
    });
    child.stderr?.on("data", (b) => {
      output += b.toString();
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Server exited " + code + ": " + output));
    });
  });
const execute = promisify(execFile);
const npmCli = process.env.npm_execpath;
if (!npmCli)
  throw new Error("Run this suite through npm run test:admin:browser");
test("edit → save → restart → export → build → standalone storefront, including uploaded photo", async ({
  page,
  browser,
}) => {
  const dir = await mkdtemp(path.join(projectRoot, ".test-tmp-browser-"));
  const accessFile = path.join(dir, "auth/access-code.txt"),
    stateFile = path.join(dir, "runtime/state.json");
  let app: ChildProcess | undefined;
  let preview: ChildProcess | undefined;
  let adminOrigin = "";
  const start = async () => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "apps/admin/src/server.ts"],
      {
        cwd: projectRoot,
        env: { ...process.env, DVS_DATA_DIR: dir, ADMIN_PORT: "0" },
        stdio: "pipe",
      },
    );
    adminOrigin = await ready(child);
    return child;
  };
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  try {
    app = await start();
    const login = async () => {
      await page.goto(adminOrigin + "/");
      await page
        .getByLabel("Local access code")
        .fill((await readFile(accessFile, "utf8")).trim());
      await page.getByRole("button", { name: "Unlock admin" }).click();
      await expect(
        page.getByRole("heading", {
          name: "Make room for the little details.",
        }),
      ).toBeVisible();
    };
    await login();
    await page.screenshot({
      path: "artifacts/phase-3-admin-list.png",
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByLabel("Search products").fill("DVS-B001");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByLabel("English product name")
      .fill("Gulabi saved workflow demo");
    await page.getByLabel("Price in rupees (empty = unknown)").fill("123.45");
    await page.getByLabel("Storage location").fill("PRIVATE_BOX_WORKFLOW");
    await page.getByLabel("Internal notes").fill("PRIVATE_NOTES_WORKFLOW");
    const upload = await sharp({
      create: { width: 480, height: 320, channels: 3, background: "#b99050" },
    })
      .png()
      .toBuffer();
    await page.getByLabel("Upload product image").setInputFiles({
      name: "demo-photo.png",
      mimeType: "image/png",
      buffer: upload,
    });
    await expect(page.getByRole("status")).toContainText(
      "Image uploaded privately",
    );
    await page
      .getByLabel("Image 2 alt text (en)")
      .fill("Uploaded gold demo photo");
    await page
      .locator(".image-edit")
      .nth(1)
      .getByRole("button", { name: "Make cover" })
      .click();
    await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
    await page.getByLabel("हिन्दी product name").fill("सहेजा गया गुलाबी नमूना");
    await page
      .getByLabel("Image 1 alt text (hi)")
      .fill("अपलोड किया गया सुनहरा नमूना");
    await page.getByRole("button", { name: "ગુજરાતી", exact: true }).click();
    await page.getByLabel("ગુજરાતી product name").fill("સાચવેલો ગુલાબી નમૂનો");
    await page
      .getByLabel("Image 1 alt text (gu)")
      .fill("અપલોડ કરેલો સોનેરી નમૂનો");
    await page
      .getByRole("button", { name: "Save product locally", exact: true })
      .first()
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Product saved locally",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: "artifacts/phase-3-admin-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await stop(app);
    app = await start();
    await login();
    await page.getByLabel("Search products").fill("DVS-B001");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByLabel("English product name")).toHaveValue(
      "Gulabi saved workflow demo",
    );
    await expect(
      page.getByLabel("Price in rupees (empty = unknown)"),
    ).toHaveValue("123.45");
    await expect(page.getByLabel("Storage location")).toHaveValue(
      "PRIVATE_BOX_WORKFLOW",
    );
    await expect(
      page.locator(".image-edit").first().locator("img"),
    ).toHaveAttribute("src", /catalogue-images/);
    await page.screenshot({
      path: "artifacts/phase-3-admin-editor.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "← Product list" }).click();
    await page.getByLabel("Search products").fill("DVS-B002");
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Archived locally");
    await page.getByLabel("Search products").fill("DVS-B001");
    await page.getByRole("button", { name: "Duplicate", exact: true }).click();
    await expect(page.getByLabel("Publication status")).toHaveValue("draft");
    await expect(page.getByLabel("Reference / SKU")).not.toHaveValue(
      "DVS-B001",
    );
    await page.getByRole("button", { name: "← Product list" }).click();
    await page
      .getByRole("button", { name: "Store & homepage", exact: true })
      .click();
    await page
      .getByLabel("home.aboutBody (en)")
      .fill("Saved local introduction for the workflow demonstration.");
    await page
      .getByRole("button", { name: "Save store & homepage locally" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Store settings and homepage text saved",
    );
    await page
      .getByRole("button", { name: "Export & backup", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Export saved catalogue", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("23 products");
    await page
      .getByRole("button", { name: "Create local catalogue backup" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Local backup created",
    );
    const saved = JSON.parse(await readFile(stateFile, "utf8"));
    const auth = (await readFile(accessFile, "utf8")).trim();
    await stop(app);
    app = undefined;
    const result = await execute(
      process.execPath,
      [npmCli, "run", "build:demo"],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          DVS_DATA_DIR: dir,
          NEXT_TELEMETRY_DISABLED: "1",
        },
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    expect(result.stdout).toContain("Verified 94 static routes");
    expect(JSON.parse(await readFile(stateFile, "utf8"))).toEqual(saved);
    const output = path.join(projectRoot, "apps/storefront/out");
    for (const file of await readdir(output, { recursive: true })) {
      if (!/\.(html|json|js|txt)$/.test(file)) continue;
      const text = await readFile(path.join(output, file), "utf8");
      for (const secret of [
        "PRIVATE_BOX_WORKFLOW",
        "PRIVATE_NOTES_WORKFLOW",
        auth,
        '"stock":',
        '"reviewStatus":',
      ])
        expect(text).not.toContain(secret);
      if (file.endsWith(".html")) expect(text).toContain("noindex");
    }
    preview = spawn(process.execPath, ["scripts/preview.mjs"], {
      cwd: projectRoot,
      env: { ...process.env, PORT: "0" },
      stdio: "pipe",
    });
    const previewOrigin = await ready(preview);
    await page.goto(previewOrigin + "/en/product/gulabi-bangle-set/");
    await expect(
      page.getByRole("heading", {
        name: "Gulabi saved workflow demo",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Sample price · ₹123.45")).toBeVisible();
    const photo = page.locator(".detail-gallery img").first();
    await expect(photo).toHaveAttribute("src", /^\/catalogue-images\//);
    expect(
      await photo.evaluate(
        (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
      ),
    ).toBe(true);
    await page.locator('input[value="size-2-8"]').check();
    await page.getByRole("button", { name: "Preview an enquiry" }).click();
    await expect(page.getByRole("dialog").locator("textarea")).toHaveValue(
      /Gulabi saved workflow demo.*DVS-B001.*2-8/,
    );
    await page.keyboard.press("Escape");
    await page
      .locator(".language-selector")
      .getByRole("link", { name: "हिन्दी", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "सहेजा गया गुलाबी नमूना",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('input[value="size-2-8"]')).toBeChecked();
    await page.goto(previewOrigin + "/gu/product/gulabi-bangle-set/");
    await expect(
      page.getByRole("heading", { name: "સાચવેલો ગુલાબી નમૂનો", exact: true }),
    ).toBeVisible();
    await page.goto(previewOrigin + "/en/");
    await expect(
      page.getByText(
        "Saved local introduction for the workflow demonstration.",
      ),
    ).toBeVisible();
    expect(
      (
        await page.goto(
          previewOrigin + "/en/product/champagne-shimmer-bangles/",
        )
      )?.status(),
    ).toBe(404);
    expect(errors).toEqual([]);
  } finally {
    if (preview) await stop(preview);
    if (app) await stop(app);
    // Restore only generated storefront outputs, never mutate the working admin data.
    await execute(process.execPath, [npmCli, "run", "build:demo"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        DVS_DATA_DIR: "data/local",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      maxBuffer: 8 * 1024 * 1024,
    });
    await rm(dir, { recursive: true, force: true });
  }
});
test("new drafts, variant controls, filters, archive/restore and category editing are functional", async ({
  page,
}) => {
  const dir = await mkdtemp(path.join(projectRoot, ".test-tmp-forms-"));
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "apps/admin/src/server.ts"],
    {
      cwd: projectRoot,
      env: { ...process.env, DVS_DATA_DIR: dir, ADMIN_PORT: "0" },
      stdio: "pipe",
    },
  );
  page.on("dialog", (d) => d.accept());
  try {
    const origin = await ready(child);
    await page.goto(origin);
    await page
      .getByLabel("Local access code")
      .fill(
        (await readFile(path.join(dir, "auth/access-code.txt"), "utf8")).trim(),
      );
    await page.getByRole("button", { name: "Unlock admin" }).click();
    await page
      .getByRole("button", { name: "Add product", exact: true })
      .click();
    await expect(page.getByLabel("Publication status")).toHaveValue("draft");
    await page.getByLabel("English product name").fill("New incomplete draft");
    await page.getByLabel("Variant 1 size").fill("2-8");
    await page
      .getByLabel("Variant 1 pair / set quantity")
      .fill("Pair of bangles");
    await page.getByLabel("Variant 1 stock (empty = unknown)").fill("0");
    await page
      .getByLabel("Review status", { exact: true })
      .selectOption("needs_photos");
    await page
      .getByRole("button", { name: "Add variant", exact: true })
      .click();
    await expect(page.locator(".variant-edit")).toHaveCount(2);
    await page
      .locator(".variant-edit")
      .last()
      .getByRole("button", { name: "Remove variant" })
      .click();
    await expect(page.locator(".variant-edit")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Save product locally", exact: true })
      .first()
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Product saved locally",
    );
    await page.getByRole("button", { name: "← Product list" }).click();
    await page.getByLabel("Publication", { exact: true }).selectOption("draft");
    await page
      .getByLabel("Review", { exact: true })
      .selectOption("needs_photos");
    await page.getByLabel("Category", { exact: true }).selectOption("bangles");
    await page.getByLabel("Missing translations").check();
    await expect(page.locator(".product-row")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "New incomplete draft" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await page
      .getByLabel("Publication", { exact: true })
      .selectOption("archived");
    await expect(page.locator(".product-row")).toHaveCount(1);
    await page.getByRole("button", { name: "Restore as draft" }).click();
    await page.getByLabel("Publication", { exact: true }).selectOption("draft");
    await expect(page.locator(".product-row")).toHaveCount(1);
    await page.getByRole("button", { name: "Categories", exact: true }).click();
    await page
      .getByLabel("Category 1 name (en)")
      .fill("Bangles local category edit");
    await page.getByLabel("Category 1 slug").fill("bangles-local");
    await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
    await page.getByLabel("Category 1 name (hi)").fill("स्थानीय चूड़ियाँ");
    await page.getByRole("button", { name: "Save categories locally" }).click();
    await expect(page.getByRole("status")).toContainText("Categories saved");
    await page
      .getByRole("button", { name: "Export & backup", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Export saved catalogue", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("24 products");
    const state = JSON.parse(
      await readFile(path.join(dir, "runtime/state.json"), "utf8"),
    );
    const draft = state.products.find(
      (p: any) => p.content.en.name === "New incomplete draft",
    );
    expect(draft.pricePaise).toBeNull();
    expect(draft.variants[0].stock).toBe(0);
    expect(draft.variants[0].size).toBe("2-8");
    expect(draft.isDemo).toBe(true);
    const pointer = JSON.parse(
      await readFile(path.join(dir, "exports/current.json"), "utf8"),
    );
    const exported = JSON.parse(
      await readFile(
        path.join(dir, "exports", pointer.generation, "public.json"),
        "utf8",
      ),
    );
    expect(exported.catalogue.categories[0].slug).toBe("bangles-local");
    expect(
      exported.catalogue.products.some((p: any) => p.id === draft.id),
    ).toBe(false);
  } finally {
    await stop(child);
    await rm(dir, { recursive: true, force: true });
  }
});
