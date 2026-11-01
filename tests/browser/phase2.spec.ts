import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { locales } from "../../packages/catalogue/src/index";
import { languageLabels } from "../../packages/catalogue/src/routes";
import { getStrings } from "../../apps/storefront/lib/strings";
import fixture from "../../data/fixtures/catalogue.json";
const product = fixture.products[0];
test("switching languages keeps product, variant, and local enquiry state correct", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/en/product/gulabi-bangle-set/");
  await page.locator('input[value="size-2-8"]').check();
  for (const locale of ["hi", "gu", "en"] as const) {
    await page
      .locator(".language-selector")
      .getByRole("link", { name: languageLabels[locale], exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/product/gulabi-bangle-set/\\?variant=size-2-8$`),
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('input[value="size-2-8"]')).toBeChecked();
    const t = getStrings(locale);
    const trigger = page.getByRole("button", { name: t.enquiry });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(t.dialog.message)).toHaveValue(
      new RegExp(product.sku),
    );
    await expect(page.getByLabel(t.dialog.message)).toHaveValue(/2-8/);
    await expect(page.getByLabel(t.dialog.message)).toHaveValue(
      new RegExp(product.content[locale].name),
    );
    await page.getByRole("button", { name: t.dialog.copy }).click();
    await expect(page.getByRole("status")).toHaveText(t.dialog.copied);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      product.content[locale].name,
    );
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  await page.reload();
  await expect(page.locator('input[value="size-2-8"]')).toBeChecked();
});
test("language selector preserves category, collection and visit route", async ({
  page,
}) => {
  for (const suffix of ["category/earrings/", "collection/", "visit/"]) {
    await page.goto("/en/" + suffix);
    for (const locale of ["hi", "gu", "en"] as const) {
      await page
        .locator(".language-selector")
        .getByRole("link", { name: languageLabels[locale], exact: true })
        .click();
      await expect(page).toHaveURL(`http://127.0.0.1:4173/${locale}/${suffix}`);
    }
  }
});
for (const locale of ["hi", "gu"] as const) {
  test(`${locale}: localized search, category, sort, product links and empty state`, async ({
    page,
  }) => {
    const t = getStrings(locale);
    await page.goto(`/${locale}/collection/`);
    await page
      .getByLabel(t.collection.search)
      .fill(locale === "hi" ? "गुलाबी" : "ગુલાબી");
    await expect(page.getByRole("status")).toHaveText(
      `2 ${t.collection.designs}`,
    );
    await page
      .getByLabel(t.collection.category, { exact: true })
      .selectOption("bangles");
    await expect(page.getByRole("status")).toHaveText(
      `1 ${t.collection.design}`,
    );
    await page.locator(".product-card").getByRole("link").click();
    await expect(page).toHaveURL(
      `http://127.0.0.1:4173/${locale}/product/gulabi-bangle-set/`,
    );
    await page.goto(`/${locale}/collection/`);
    await page
      .getByLabel(t.collection.category, { exact: true })
      .selectOption("earrings");
    await page
      .getByLabel(t.collection.sort, { exact: true })
      .selectOption("price-desc");
    await expect(page.locator(".product-card h3").first()).toHaveText(
      fixture.products.find((p) => p.id === "earrings-03")!.content[locale]
        .name,
    );
    await page.getByLabel(t.collection.search).fill("zzz-no-product");
    await expect(
      page.getByRole("heading", { name: t.collection.empty }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: t.collection.clear, exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      `24 ${t.collection.designs}`,
    );
  });
  test(`${locale}: mobile and desktop layouts, translated modal and automated accessibility`, async ({
    page,
  }) => {
    const t = getStrings(locale);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const suffix of [
        "",
        "collection/",
        "category/bangles/",
        "product/gulabi-bangle-set/",
        "visit/",
      ]) {
        const response = await page.goto(`/${locale}/${suffix}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("h1")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        if (suffix === "") {
          await page.screenshot({
            path: `artifacts/phase-2-${locale}-${width}.png`,
            fullPage: true,
          });
          if (width === 1440)
            await page.screenshot({
              path: `artifacts/phase-2-${locale}-preview.png`,
            });
        }
        if (suffix.startsWith("product/")) {
          await page.getByRole("button", { name: t.enquiry }).click();
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();
          expect(
            await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth),
          ).toBe(true);
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
          );
          await page.keyboard.press("Escape");
        }
      }
    }
    expect(errors).toEqual([]);
  });
  test(`${locale}: honest contact states, localized HTTP 404 and no external actions`, async ({
    page,
  }) => {
    const t = getStrings(locale);
    const outward: string[] = [];
    await page.route("**/*", (route) => {
      if (!route.request().url().startsWith("http://127.0.0.1:4173/")) {
        outward.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(`/${locale}/visit/`);
    await expect(page.getByText(t.visit.addressMissing)).toBeVisible();
    await expect(page.getByText(t.visit.hoursMissing)).toBeVisible();
    await expect(page.getByRole("link", { name: t.visit.openMap })).toHaveCount(
      0,
    );
    await expect(page.locator('a[href^="https://wa.me"]')).toHaveCount(0);
    const response = await page.goto(`/${locale}/missing-product/`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(
      page.getByRole("heading", { name: t.notFound.title }),
    ).toBeVisible();
    expect(outward).toEqual([]);
  });
}
test("every locale exports core product content without JavaScript and omits production URL metadata", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const locale of locales) {
    await page.goto(
      `http://127.0.0.1:4173/${locale}/product/gulabi-bangle-set/`,
    );
    await expect(
      page.getByRole("heading", {
        name: product.content[locale].name,
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(
      page.locator('link[rel="canonical"],link[rel="alternate"]'),
    ).toHaveCount(0);
    await expect(page.locator(".language-selector a")).toHaveCount(3);
  }
  await context.close();
});
