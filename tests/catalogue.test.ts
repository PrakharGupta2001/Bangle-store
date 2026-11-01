import { test } from "node:test";
import assert from "node:assert/strict";
import fixture from "../data/fixtures/catalogue.json";
import {
  catalogueSchema,
  productSchema,
} from "../packages/catalogue/src/schema";
import {
  browseProducts,
  buildEnquiryMessage,
  toPublicProduct,
  priceLabel,
} from "../packages/catalogue/src/index";
import { createFixtureRepository } from "../packages/catalogue/src/repository";
const data = catalogueSchema.parse(fixture);
const products = data.products.map(toPublicProduct);
test("fixture has 24 honest demo products with required distribution", () => {
  assert.equal(products.length, 24);
  assert.deepEqual(
    data.categories.map(
      (c) => products.filter((p) => p.categoryId === c.id).length,
    ),
    [12, 4, 4, 4],
  );
  for (const p of data.products) {
    assert(p.isDemo);
    assert.equal(p.availability, "confirm_on_enquiry");
    assert(p.variants.every((v) => v.stock === null));
  }
});
test("schema rejects invalid money, numeric bangle sizes, duplicates and missing categories", () => {
  assert(
    !productSchema.safeParse({ ...data.products[0], pricePaise: 12.5 }).success,
  );
  assert(
    !catalogueSchema.safeParse({
      ...data,
      products: [...data.products, data.products[0]],
    }).success,
  );
  assert(!catalogueSchema.safeParse({ ...data, categories: [] }).success);
  assert(
    !productSchema.safeParse({
      ...data.products[0],
      variants: [{ ...data.products[0].variants[0], size: 2.4 }],
    }).success,
  );
});
test("public repository only exports published allowlisted data and returns isolated copies", async () => {
  const input = structuredClone(data);
  input.products[0].publicationStatus = "draft";
  input.products[1].publicationStatus = "archived";
  const repo = createFixtureRepository(input);
  const list = await repo.listProducts();
  assert.equal(list.length, 22);
  assert.equal(await repo.findProduct(input.products[0].slug), undefined);
  const json = JSON.stringify(list);
  for (const key of [
    "stock",
    "reviewStatus",
    "publicationStatus",
    "internalNotes",
    "storageBoxLocation",
  ])
    assert(!json.includes(JSON.stringify(key) + ":"));
  list[0].content.en.name = "Mutated";
  assert.notEqual((await repo.listProducts())[0].content.en.name, "Mutated");
  const extended = {
    ...data.products[0],
    internalNotes: "private",
    storageBoxLocation: "box",
  };
  assert(!("internalNotes" in toPublicProduct(extended)));
});
test("search handles case, whitespace, SKU, category and empty results", () => {
  assert.equal(browseProducts(products, "  GULABI  ").length, 1);
  assert.equal(browseProducts(products, "DVS-B001")[0].sku, "DVS-B001");
  assert.equal(browseProducts(products, "", "earrings").length, 4);
  assert.equal(browseProducts(products, "clip", "bangles").length, 0);
  assert.equal(browseProducts(products, "nonsense").length, 0);
});
test("price sorts keep unknown prices last without mutating original array", () => {
  for (const order of ["price-asc", "price-desc"] as const) {
    const sorted = browseProducts(products, "", "", order);
    assert.equal(sorted.at(-1)?.pricePaise, null);
    const known = sorted.filter((p) => p.pricePaise !== null);
    for (let i = 1; i < known.length; i++)
      assert(
        order === "price-asc"
          ? known[i - 1].pricePaise! <= known[i].pricePaise!
          : known[i - 1].pricePaise! >= known[i].pricePaise!,
      );
  }
  assert.equal(products[0].sku, "DVS-B001");
});
test("selected variant and SKU are included in enquiry; invalid variants fail", () => {
  const p = products[0];
  const msg = buildEnquiryMessage(p, "size-2-8");
  assert.match(msg, /Size 2-8 · Set of 6 bangles/);
  assert(msg.includes(p.sku));
  assert(msg.includes(p.content.en.name));
  assert.throws(() => buildEnquiryMessage(p, "invalid"));
  assert.equal(priceLabel(null), "Ask for price");
  assert.match(priceLabel(18000), /^Price ·/);
});
