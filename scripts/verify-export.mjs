import { locales } from "../packages/catalogue/src/index.ts";
import { routePath } from "../packages/catalogue/src/routes.ts";
import { publicOrigin } from "../packages/catalogue/src/contact.ts";
import { store } from "../apps/storefront/config/store.ts";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../apps/storefront/out/", import.meta.url));
const fixture = JSON.parse(
  await readFile(
    new URL("../packages/catalogue/generated/catalogue.json", import.meta.url),
    "utf8",
  ),
);
const routes = [
  "",
  ...locales.flatMap((locale) => [
    ...["home", "collection", "visit", "not-found"].map((kind) =>
      routePath(locale, { kind }),
    ),
    ...fixture.categories.map((c) =>
      routePath(locale, { kind: "category", slug: c.slug }),
    ),
    ...fixture.products.map((p) =>
      routePath(locale, { kind: "product", slug: p.slug }),
    ),
  ]),
];
const titles = new Set();
for (const route of routes) {
  const html = await readFile(path.join(root, route, "index.html"), "utf8");
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
  assert.match(html, /<h1/);
  assert.match(html, /<title>/);
  const locale = route.split("/").filter(Boolean)[0] || "en";
  assert(
    html.includes(`<html lang="${locale}"`),
    `Wrong HTML language at ${route}`,
  );
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert(!titles.has(title), `Duplicate title: ${title}`);
  titles.add(title);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  if (!publicOrigin(store.publicWebsiteUrl)) {
    assert(!html.includes('rel="canonical"'));
    assert(!html.includes('rel="alternate"'));
  }
  assert(!html.includes("application/ld+json"));
}
assert.match(await readFile(path.join(root, "404.html"), "utf8"), /noindex/);
const forbidden = [
  /storageBoxLocation/,
  /internalNotes/,
  /reviewStatus/,
  /"stock"\s*:/,
  /mysql:\/\//,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[A-Z0-9]{16}/,
];
let files = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else {
      files++;
      if (/\.(html|js|json|txt|css)$/.test(file)) {
        const content = await readFile(file, "utf8");
        for (const pattern of forbidden)
          assert(
            !pattern.test(content),
            `Unexpected private/sensitive data pattern ${pattern} in ${file}`,
          );
        if (file.endsWith(".html")) {
          assert.match(content, /noindex/, `Missing noindex in ${file}`);
          for (const [, url] of content.matchAll(
            /(?:src|href)="(\/[^"?#]*)/g,
          )) {
            await stat(
              path.join(
                root,
                decodeURIComponent(url),
                url.endsWith("/") ? "index.html" : "",
              ),
            );
          }
        }
      }
    }
  }
}
await walk(root);
console.log(
  `Verified ${routes.length} static routes, 404, noindex, local HTML asset/link targets and ${files} public files for known private/secret patterns.`,
);
