import type { Product, Category } from "./schema";
export type { Product, Category, Catalogue } from "./schema";
export const locales = ["en", "hi", "gu"] as const;
export type Locale = (typeof locales)[number];
// The export boundary is an explicit allowlist. Operational review/stock fields never reach UI payloads.
export type PublicProduct = Omit<
  Product,
  "publicationStatus" | "reviewStatus" | "variants"
> & { variants: Omit<Product["variants"][number], "stock">[] };
export function toPublicProduct(p: Product): PublicProduct {
  return {
    id: p.id,
    slug: p.slug,
    categoryId: p.categoryId,
    sku: p.sku,
    isDemo: p.isDemo,
    availability: p.availability,
    content: pickLocales(p.content, (v) => ({
      name: v.name,
      description: v.description,
    })),
    pricePaise: p.pricePaise,
    images: p.images.map((i) => ({
      src: i.src,
      alt: pickLocales(i.alt, (v) => v),
    })),
    featured: p.featured,
    ...(p.featuredOrder !== undefined
      ? { featuredOrder: p.featuredOrder }
      : {}),
    variants: p.variants.map((v) => ({
      id: v.id,
      content: pickLocales(v.content, (c) => ({ label: c.label })),
      ...(v.colour ? { colour: pickLocales(v.colour, (c) => c) } : {}),
      size: v.size,
      quantity: v.quantity,
    })),
  };
}
export function localize<T>(
  content: { en: T; hi?: T; gu?: T },
  locale: Locale = "en",
): T {
  return content[locale] ?? content.en;
}
export function priceLabel(
  paise: number | null,
  locale: Locale = "en",
): string {
  const words = {
    en: ["Ask for price", "Price"],
    hi: ["कीमत पूछें", "कीमत"],
    gu: ["કિંમત પૂછો", "કિંમત"],
  }[locale];
  return paise === null
    ? words[0]
    : `${words[1]} · ${new Intl.NumberFormat(`${locale}-IN`, { style: "currency", currency: "INR", maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100)}`;
}
export type SortOrder = "featured" | "name" | "price-asc" | "price-desc";
export function browseProducts(
  products: PublicProduct[],
  query = "",
  categoryId = "",
  sort: SortOrder = "featured",
  locale: Locale = "en",
): PublicProduct[] {
  const terms = query
    .trim()
    .toLocaleLowerCase("en")
    .split(/\s+/)
    .filter(Boolean);
  const result = products.filter(
    (p) =>
      (!categoryId || p.categoryId === categoryId) &&
      terms.every((term) =>
        `${localize(p.content, locale).name} ${localize(p.content, locale).description} ${p.content.en.name} ${p.sku}`
          .toLocaleLowerCase("en")
          .includes(term),
      ),
  );
  return result.sort((a, b) => {
    if (sort === "name")
      return localize(a.content, locale).name.localeCompare(
        localize(b.content, locale).name,
        locale,
      );
    if (sort === "price-asc" || sort === "price-desc") {
      if (a.pricePaise === null) return b.pricePaise === null ? 0 : 1;
      if (b.pricePaise === null) return -1;
      return (a.pricePaise - b.pricePaise) * (sort === "price-desc" ? -1 : 1);
    }
    return (
      Number(b.featured) - Number(a.featured) ||
      (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999)
    );
  });
}
export function buildEnquiryMessage(
  product: PublicProduct,
  variantId: string,
  locale: Locale = "en",
): string {
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error("Select a valid product variant");
  const name = localize(product.content, locale).name;
  let label = localize(variant.content, locale).label;
  if (variant.size && !label.includes(variant.size))
    label += ` · ${{ en: "Size", hi: "आकार", gu: "માપ" }[locale]} ${variant.size}`;
  if (variant.colour) label += ` · ${localize(variant.colour, locale)}`;
  if (locale === "hi")
    return `नमस्ते दया वैरायटी स्टोर, मुझे ${name}, उत्पाद कोड ${product.sku}, विकल्प ${label} के बारे में जानकारी चाहिए। कृपया कीमत और उपलब्धता की पुष्टि करें।`;
  if (locale === "gu")
    return `નમસ્તે દયા વેરાયટી સ્ટોર, મને ${name}, વસ્તુનો કોડ ${product.sku}, વિકલ્પ ${label} વિશે માહિતી જોઈએ છે. કૃપા કરીને કિંમત અને ઉપલબ્ધતાની ખાતરી કરો.`;
  return `Hello Daya Variety Store, I would like to enquire about ${localize(product.content, locale).name}, reference ${product.sku}, variant ${label}. Please confirm the price and availability.`;
}

export function pickLocales<T, U>(
  record: { en: T; hi?: T; gu?: T },
  pick: (v: T) => U,
): { en: U; hi?: U; gu?: U } {
  const result = { en: pick(record.en) } as { en: U; hi?: U; gu?: U };
  for (const l of ["hi", "gu"] as const)
    if (record[l] !== undefined) result[l] = pick(record[l]!);
  return result;
}
