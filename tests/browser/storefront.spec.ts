import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("catalogue search, category, price sorting and empty state", async ({
  page,
}) => {
  await page.goto("/en/collection/");
  await expect(page.getByRole("status")).toHaveText("24 sample designs");
  await page.getByLabel("Search products").fill("Gulabi");
  await expect(page.getByRole("status")).toHaveText("1 sample design");
  await page.getByLabel("Search products").fill("");
  await page.getByLabel("Category", { exact: true }).selectOption("earrings");
  await expect(page.getByRole("status")).toHaveText("4 sample designs");
  await page.getByLabel("Sort by").selectOption("price-desc");
  await expect(page.locator(".product-card h3").first()).toHaveText(
    "Chand shape earrings",
  );
  await expect(page.locator(".product-card .price").last()).toHaveText(
    "Ask for price",
  );
  await page.getByLabel("Search products").fill("not-a-product");
  await expect(
    page.getByRole("heading", { name: "No little favourites here just yet." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("24 sample designs");
});
test("direct static product URL, variants, modal focus, copy and Escape", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/en/product/gulabi-bangle-set/");
  await page
    .getByRole("radio", { name: "Size 2-8 · Set of 6 bangles" })
    .check();
  const trigger = page.getByRole("button", { name: "Preview an enquiry" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Enquiry message")).toHaveValue(/Size 2-8/);
  await expect(page.getByLabel("Enquiry message")).toHaveValue(/DVS-B001/);
  await expect(
    page.getByRole("button", { name: "Close preview" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Copy message" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close preview" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Copy message" }).click();
  await expect(page.getByRole("status")).toContainText("Message copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Size 2-8",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "Close preview" }).click();
  await expect(trigger).toBeFocused();
});
test("responsive pages have no horizontal overflow, load assets, and pass axe", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failed: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(r.url());
  });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/en/",
      "/en/collection/",
      "/en/category/bangles/",
      "/en/product/gulabi-bangle-set/",
      "/en/visit/",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      for (const img of await page.locator("img").all()) {
        await img.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            img.evaluate(
              (i) =>
                (i as HTMLImageElement).complete &&
                (i as HTMLImageElement).naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (route === "/en/") {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `artifacts/home-${width}.png`,
          fullPage: true,
        });
        if (width === 1440) {
          await page.screenshot({ path: "artifacts/home-preview.png" });
        }
      }
    }
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
test("mobile menu, category route, missing contact state, noindex and 404", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto("/en/");
  await page.getByRole("button", { name: "Menu" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Bangles", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("Bangles");
  await expect(page.getByRole("status")).toHaveText("12 sample designs");
  await page.goto("/en/visit/");
  await expect(
    page.getByText("Contact details not yet configured.").first(),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  expect(
    await page.locator('a[href*="wa.me"],a[href*="maps.google"]').count(),
  ).toBe(0);
  const response = await page.goto("/not-a-real-page/");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page isn’t in our collection." }),
  ).toBeVisible();
});
test("modal passes accessibility audit; reduced motion is respected", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/product/gulabi-bangle-set/");
  await page.getByRole("button", { name: "Preview an enquiry" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page
      .locator(".enquiry-button")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});
test("core catalogue and product content exists without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/en/collection/");
  await expect(page.locator(".product-card")).toHaveCount(24);
  await page.locator(".product-card").first().getByRole("link").click();
  await expect(page.locator("h1")).toHaveText("Gulabi bangle set");
  await expect(page.getByText("Product reference · DVS-B001")).toBeVisible();
  await context.close();
});
test("clipboard permission failure provides manual copy fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Permission denied");
        },
      },
    });
  });
  await page.goto("/en/product/gulabi-bangle-set/");
  await page.getByRole("button", { name: "Preview an enquiry" }).click();
  await page.getByRole("button", { name: "Copy message" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Select the message above and copy it manually.",
  );
  await expect(page.getByLabel("Enquiry message")).toHaveValue(/DVS-B001/);
});
