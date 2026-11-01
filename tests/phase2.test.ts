import { test } from "node:test";
import assert from "node:assert/strict";
import fixture from "../data/fixtures/catalogue.json";
import {
  locales,
  toPublicProduct,
  buildEnquiryMessage,
  browseProducts,
  priceLabel,
} from "../packages/catalogue/src/index";
import {
  catalogueSchema,
  assertTranslationCoverage,
} from "../packages/catalogue/src/schema";
import {
  routePath,
  equivalentPath,
  parseRoute,
} from "../packages/catalogue/src/routes";
import {
  internationalPhone,
  localizedSetting,
  publicOrigin,
  directionsLink,
  buildWhatsAppLink,
  enquiryLink,
  validateStoreSettings,
} from "../packages/catalogue/src/contact";
import {
  seoAlternates,
  productionSitemap,
} from "../packages/catalogue/src/seo";
import { getStrings } from "../apps/storefront/lib/strings";
import { store } from "../apps/storefront/config/default-store";
const catalogue = catalogueSchema.parse(fixture);
const products = catalogue.products.map(toPublicProduct);
const p = products[0];
// Reserved fictional NANP number, used only to exercise pure functions; never written to store settings or opened.
const testPhone = "+12025550123";
test("route mapping preserves product identity and selected variant in every direction", () => {
  for (const from of locales)
    for (const to of locales) {
      const path = routePath(from, { kind: "product", slug: p.slug });
      assert.equal(
        equivalentPath(path, to, "size-2-8"),
        `/${to}/product/${p.slug}/?variant=size-2-8`,
      );
      assert.deepEqual(
        parseRoute(routePath(to, { kind: "category", slug: "bangles" })),
        { kind: "category", slug: "bangles" },
      );
      for (const kind of ["home", "collection", "visit", "not-found"] as const)
        assert.equal(
          equivalentPath(routePath(from, { kind }), to),
          routePath(to, { kind }),
        );
    }
  assert.throws(() => routePath("en", { kind: "product", slug: "../private" }));
  assert.equal(parseRoute("/fr/collection/"), null);
});
test("all dictionary keys and published catalogue translations are complete", () => {
  function keys(o: object, prefix = ""): string[] {
    return Object.entries(o)
      .flatMap(([k, v]) =>
        typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      )
      .sort();
  }
  const base = keys(getStrings("en"));
  for (const locale of locales) {
    assert.deepEqual(keys(getStrings(locale)), base);
    for (const product of products) {
      assert(product.content[locale]?.name);
      assert(product.variants.every((v) => v.content[locale]?.label));
      assert(product.images.every((i) => i.alt[locale]));
    }
  }
  assertTranslationCoverage(catalogue);
  const broken = structuredClone(catalogue);
  delete broken.products[0].content.hi;
  assert.throws(() => assertTranslationCoverage(broken), /Missing hi/);
});
test("localized search, names, sort and price labels", () => {
  assert.equal(
    browseProducts(products, "गुलाबी", "", "featured", "hi")[0].id,
    p.id,
  );
  assert.equal(
    browseProducts(products, "ગુલાબી", "", "featured", "gu")[0].id,
    p.id,
  );
  for (const l of locales) {
    const results = browseProducts(products, "", "bangles", "name", l);
    assert.equal(results.length, 12);
    for (let i = 1; i < results.length; i++)
      assert(
        results[i - 1].content[l]!.name.localeCompare(
          results[i].content[l]!.name,
          l,
        ) <= 0,
      );
  }
  assert.equal(priceLabel(null, "hi"), "कीमत पूछें");
  assert.equal(priceLabel(null, "gu"), "કિંમત પૂછો");
  assert.match(priceLabel(18000, "gu"), /^કિંમત ·/);
});
test("enquiry messages and URL encoding preserve translated names, SKU, size and quantity", () => {
  for (const locale of locales) {
    const message = buildEnquiryMessage(p, "size-2-8", locale);
    assert(message.includes(p.content[locale]!.name));
    assert(message.includes(p.sku));
    assert(message.includes(p.variants[2].content[locale]!.label));
    assert(message.includes("2-8"));
    const link = buildWhatsAppLink(testPhone, p, "size-2-8", locale)!;
    const url = new URL(link);
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/" + testPhone.slice(1));
    assert.equal(url.searchParams.get("text"), message);
    assert(!link.includes("localhost"));
    assert.equal(enquiryLink(testPhone, p, "size-2-8", locale), null);
    assert(enquiryLink(testPhone, { ...p, isDemo: false }, "size-2-8", locale));
  }
  assert.throws(() => buildEnquiryMessage(p, "bad", "gu"));
  const local = structuredClone(p);
  local.content.en.name = "See http://localhost:3000/private";
  assert.equal(buildWhatsAppLink(testPhone, local, "size-2-4", "en"), null);
});
test("phone and contact settings reject malformed or unsafe values", () => {
  for (const bad of [
    null,
    "",
    "12345",
    "+0123456789",
    "+91 1234567890",
    "+11111111111",
    "https://wa.me/123",
    "+1234567890123456",
  ])
    assert.equal(internationalPhone(bad), null);
  assert.equal(internationalPhone(testPhone), testPhone);
  assert.equal(validateStoreSettings(store), store);
  assert.equal(localizedSetting(null, "hi"), null);
  assert.equal(
    localizedSetting({ en: "", hi: "समय की पुष्टि बाकी है", gu: "" }, "en"),
    null,
  );
  assert.equal(localizedSetting({ en: "English only" }, "gu"), null);
  assert.equal(localizedSetting(" Shared address ", "gu"), "Shared address");
  assert.throws(() => validateStoreSettings({ ...store, whatsapp: "fake" }));
  assert.throws(() =>
    validateStoreSettings({ ...store, mapUrl: "javascript:alert(1)" }),
  );
  assert.throws(() =>
    validateStoreSettings({ ...store, publicWebsiteUrl: "http://example.com" }),
  );
  assert.equal(publicOrigin("https://example.com/"), "https://example.com");
  for (const url of [
    null,
    "http://127.0.0.1:4173",
    "https://localhost",
    "https://192.168.1.1",
    "https://shop.local",
    "https://name:password@example.com",
    "https://example.com/path",
    "https://example.com/?a=1",
  ])
    assert.equal(publicOrigin(url), null);
});
test("directions allow destination links, reject insecure links and unrelated hosts", () => {
  assert(
    directionsLink("https://www.google.com/maps/search/?api=1&query=Vadodara"),
  );
  assert(directionsLink("https://www.openstreetmap.org/node/12345"));
  assert(directionsLink("https://maps.app.goo.gl/TestReference"));
  for (const url of [
    null,
    "https://www.google.com/maps",
    "javascript:alert(1)",
    "http://maps.google.com/?q=Vadodara",
    "https://google.com.evil.invalid/maps?q=Vadodara",
    "https://www.google.com/url?q=https://evil.invalid",
    "https://localhost/maps?q=Vadodara",
  ])
    assert.equal(directionsLink(url), null);
});
test("SEO omits absent/local origins and reciprocal alternates share route mapping", () => {
  const route = { kind: "product" as const, slug: p.slug };
  for (const base of [null, "http://localhost:3000", "https://127.0.0.1"])
    assert.equal(seoAlternates(base, "hi", route), undefined);
  for (const locale of locales) {
    const meta = seoAlternates("https://example.com", locale, route)!;
    assert.equal(
      meta.canonical,
      "https://example.com" + routePath(locale, route),
    );
    assert.deepEqual(Object.keys(meta.languages), ["en", "hi", "gu"]);
    for (const l of locales)
      assert.equal(
        meta.languages[l],
        "https://example.com" + routePath(l, route),
      );
  }
});
test("production sitemap stays empty for demo/unapproved data and excludes sample products", () => {
  assert.deepEqual(
    productionSitemap(
      "https://example.com",
      products,
      catalogue.categories,
      true,
    ),
    [],
  );
  assert.deepEqual(
    productionSitemap(
      "https://example.com",
      [{ ...p, isDemo: false }],
      catalogue.categories,
    ),
    [],
  );
  assert.deepEqual(
    productionSitemap(
      null,
      [{ ...p, isDemo: false }],
      catalogue.categories,
      true,
    ),
    [],
  );
  const links = productionSitemap(
    "https://example.com",
    [{ ...p, isDemo: false }, products[1]],
    catalogue.categories,
    true,
  );
  assert.equal(links.length, 15);
  assert(links.every((l) => !l.url.includes(products[1].slug)));
  assert.equal(links.filter((l) => l.url.includes("/product/")).length, 3);
});
test("current contact values stay unset and all sample messaging gates remain closed", () => {
  for (const field of [
    "whatsapp",
    "phone",
    "exactAddress",
    "openingHours",
    "mapUrl",
    "publicWebsiteUrl",
  ] as const)
    assert.equal(store[field], null);
  for (const product of products)
    for (const locale of locales)
      assert.equal(
        enquiryLink(testPhone, product, product.variants[0].id, locale),
        null,
      );
});
