import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
async function create(relative, content) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  try {
    await writeFile(file, content, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}
const categories = [
  {
    id: "bangles",
    slug: "bangles",
    content: {
      en: {
        name: "Bangles",
        description:
          "Colour, texture and a little everyday sparkle. Explore our sample bangle collection.",
      },
    },
    image: "/images/bangles-01.svg",
  },
  {
    id: "earrings",
    slug: "earrings",
    content: {
      en: {
        name: "Earrings",
        description:
          "Small finishing touches, from simple studs to statement shapes.",
      },
    },
    image: "/images/earrings-01.svg",
  },
  {
    id: "mangalsutras",
    slug: "mangalsutras",
    content: {
      en: {
        name: "Mangalsutras",
        description: "Explore illustrative pendant and black-bead designs.",
      },
    },
    image: "/images/mangalsutras-01.svg",
  },
  {
    id: "hair-accessories",
    slug: "hair-accessories",
    content: {
      en: {
        name: "Hair accessories",
        description:
          "Clips and bands to bring a little colour to your routine.",
      },
    },
    image: "/images/hair-accessories-01.svg",
  },
];
const names = {
  bangles: [
    "Gulabi bangle set",
    "Champagne shimmer bangles",
    "Emerald accent bangles",
    "Classic ruby bangles",
    "Ivory dot bangles",
    "Midnight blue bangles",
    "Marigold bangle set",
    "Rose detail bangles",
    "Lilac glow bangles",
    "Teal accent bangles",
    "Everyday gold-tone bangles",
    "Festive colour stack",
  ],
  earrings: [
    "Petal drop earrings",
    "Everyday round studs",
    "Chand shape earrings",
    "Pearl-style drop earrings",
  ],
  mangalsutras: [
    "Petal pendant mangalsutra",
    "Double-bead mangalsutra",
    "Oval pendant mangalsutra",
    "Simple arc mangalsutra",
  ],
  "hair-accessories": [
    "Blush claw clip",
    "Classic bow clip",
    "Satin-style hair band",
    "Everyday scrunchie pair",
  ],
};
const colours = [
  "#B85F77",
  "#C39C49",
  "#446F60",
  "#9B4346",
  "#D7CDAA",
  "#405776",
  "#D39939",
  "#B97870",
  "#9B84AB",
  "#3F817B",
  "#BE984A",
  "#AC5570",
];
function svg(category, i) {
  const c = colours[i % colours.length];
  const ring = (x, y, rx, ry, stroke, w = 12) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`;
  let shape = "";
  if (category === "bangles") {
    shape = `<g transform="rotate(-24 300 280)">${Array.from({ length: 6 }, (_, j) => `${ring(250 + j * 19, 266 + j * 8, 100, 130, j % 2 === 0 ? c : "url(#gold)", 15)}${ring(250 + j * 19, 266 + j * 8, 100, 130, "#FFF2CC", 2)}`).join("")}</g>`;
  } else if (category === "earrings") {
    shape = [205, 395]
      .map(
        (x) =>
          `<circle cx="${x}" cy="153" r="15" fill="url(#gold)"/><path d="M${x} 170 Q${x - 80} 240 ${x - 58} 303 Q${x} 368 ${x + 58} 303 Q${x + 80} 240 ${x} 170Z" fill="url(#gold)"/><path d="M${x} 209 Q${x - 38} 265 ${x - 25} 293 Q${x} 320 ${x + 25} 293 Q${x + 38} 265 ${x} 209Z" fill="${c}"/><circle cx="${x}" cy="351" r="16" fill="#F9F1DC" stroke="#C3A05F" stroke-width="3"/>`,
      )
      .join("");
  } else if (category === "mangalsutras") {
    shape = `<path d="M165 100 Q140 350 300 345 Q460 350 435 100" fill="none" stroke="url(#gold)" stroke-width="9"/><path d="M165 100 Q140 350 300 345 Q460 350 435 100" fill="none" stroke="#37302A" stroke-width="12" stroke-linecap="round" stroke-dasharray="1 18"/><path d="M245 343 Q300 418 355 343 Q300 320 245 343Z" fill="url(#gold)"/><circle cx="300" cy="355" r="16" fill="${c}"/><circle cx="300" cy="398" r="9" fill="#F4E8C9"/>`;
  } else if (i < 2) {
    shape = `<g transform="rotate(-20 300 270)"><rect x="165" y="212" width="270" height="96" rx="35" fill="${c}" stroke="#8B6956" stroke-width="4"/>${Array.from({ length: 7 }, (_, j) => `<rect x="185" y="${220 + j * 11}" width="230" height="3" rx="2" fill="#FFF2DD" opacity=".4"/>`).join("")}<circle cx="300" cy="260" r="23" fill="url(#gold)"/></g>`;
  } else {
    shape = `<path d="M185 370 C75 70 525 70 415 370" fill="none" stroke="${c}" stroke-width="45"/><path d="M185 370 C75 70 525 70 415 370" fill="none" stroke="#EAD2BF" stroke-width="3"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#F5EDE0"/><stop offset="1" stop-color="#E9DECC"/></linearGradient><linearGradient id="gold" x2="1" y2=".7"><stop stop-color="#8C641D"/><stop offset=".32" stop-color="#EFDA99"/><stop offset=".55" stop-color="#B88B36"/><stop offset=".8" stop-color="#F3DDA0"/><stop offset="1" stop-color="#9E7429"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#5E442A" flood-opacity=".18"/></filter></defs><rect width="600" height="500" fill="url(#bg)"/><path d="M0 420 Q300 300 600 430V500H0" fill="#FFFEFB" opacity=".3"/><circle cx="510" cy="70" r="190" fill="#FFFEFB" opacity=".2"/><g filter="url(#shadow)">${shape}</g></svg>`;
}
let products = [];
for (const category of categories)
  for (const [i, name] of names[category.id].entries()) {
    const ref = `${category.id}-${String(i + 1).padStart(2, "0")}`;
    const quantity =
      category.id === "bangles"
        ? "Set of 6 bangles"
        : category.id === "earrings"
          ? "Pair of earrings"
          : category.id === "hair-accessories" && i === 3
            ? "Pair of scrunchies"
            : "1 piece";
    const variants =
      category.id === "bangles"
        ? ["2-4", "2-6", "2-8"].map((size) => ({
            id: `size-${size}`,
            content: { en: { label: `Size ${size} · ${quantity}` } },
            size,
            quantity,
            stock: null,
          }))
        : ["Standard"].map(() => ({
            id: "standard",
            content: { en: { label: quantity } },
            size: null,
            quantity,
            stock: null,
          }));
    products.push({
      id: ref,
      slug: name.toLowerCase().replaceAll(" ", "-"),
      categoryId: category.id,
      sku: `DVS-${{ bangles: "B", earrings: "E", mangalsutras: "M", "hair-accessories": "H" }[category.id]}${String(i + 1).padStart(3, "0")}`,
      isDemo: true,
      publicationStatus: "published",
      availability: "confirm_on_enquiry",
      reviewStatus: "needs_identification",
      content: {
        en: {
          name,
          description: `An illustrative ${name.toLowerCase()} design for browsing this demo collection. ${quantity}. Colours, materials, measurements and actual stock need confirmation with the shop.`,
        },
      },
      pricePaise:
        i % 4 === 3
          ? null
          : {
              bangles: 18000,
              earrings: 12000,
              mangalsutras: 25000,
              "hair-accessories": 6000,
            }[category.id] +
            i * 3500,
      images: [
        {
          src: `/images/${ref}.svg`,
          alt: { en: `Sample illustration of ${name.toLowerCase()}` },
        },
      ],
      variants,
      featured: i === 0 || (category.id === "bangles" && i === 1),
    });
    await create(
      `apps/storefront/public/images/${ref}.svg`,
      svg(category.id, i),
    );
  }
await create(
  "data/fixtures/catalogue.json",
  JSON.stringify({ schemaVersion: 1, categories, products }, null, 2) + "\n",
);
console.log("Demo inputs ready; existing files preserved.");

// Add only missing draft translations. Never overwrite an existing catalogue value.
const { readFile } = await import("node:fs/promises");
const translationSeed = JSON.parse(
  await readFile(new URL("./demo-translations.json", import.meta.url), "utf8"),
);
const catalogueFile = path.join(root, "data/fixtures/catalogue.json");
const catalogue = JSON.parse(await readFile(catalogueFile, "utf8"));
let translationsAdded = false;
function fillMissing(target, additions) {
  for (const [locale, value] of Object.entries(additions ?? {})) {
    if (!(locale in target)) {
      target[locale] = value;
      translationsAdded = true;
    }
  }
}
for (const category of catalogue.categories)
  fillMissing(category.content, translationSeed.categories[category.id]);
for (const product of catalogue.products) {
  const seed = translationSeed.products[product.id];
  if (!seed) continue;
  fillMissing(product.content, seed.content);
  for (const variant of product.variants)
    fillMissing(variant.content, seed.variants[variant.id]);
  for (const image of product.images) fillMissing(image.alt, seed.alt);
}
if (translationsAdded)
  await writeFile(catalogueFile, JSON.stringify(catalogue, null, 2) + "\n");
