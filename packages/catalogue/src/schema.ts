import { z } from "zod";
const translated = <T extends z.ZodType>(schema: T) =>
  z
    .object({ en: schema, hi: schema.optional(), gu: schema.optional() })
    .strict();
const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const imagePath = z
  .string()
  .regex(/^\/(?:images\/[a-z0-9-]+\.svg|catalogue-images\/[a-f0-9-]+\.webp)$/);
export const categorySchema = z
  .object({
    id: slug,
    slug,
    content: translated(z.object({ name: text, description: text }).strict()),
    image: imagePath,
  })
  .strict();
export const productSchema = z
  .object({
    id: slug,
    slug,
    categoryId: slug,
    sku: z.string().regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/),
    isDemo: z.boolean(),
    publicationStatus: z.enum(["draft", "published", "archived"]),
    availability: z.enum(["confirm_on_enquiry", "available", "unavailable"]),
    reviewStatus: z.enum([
      "needs_identification",
      "needs_photos",
      "ready_for_review",
      "verified",
    ]),
    content: translated(z.object({ name: text, description: text }).strict()),
    pricePaise: z.number().int().nonnegative().nullable(),
    images: z
      .array(z.object({ src: imagePath, alt: translated(text) }).strict())
      .min(1),
    variants: z
      .array(
        z
          .object({
            id: slug,
            content: translated(z.object({ label: text }).strict()),
            size: text.nullable(),
            colour: translated(text).optional(),
            quantity: text,
            stock: z.number().int().nonnegative().nullable(),
          })
          .strict(),
      )
      .min(1),
    featured: z.boolean(),
    featuredOrder: z.number().int().nonnegative().optional(),
  })
  .strict();
export const catalogueSchema = z
  .object({
    schemaVersion: z.literal(1),
    categories: z.array(categorySchema).min(1),
    products: z.array(productSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const [label, items] of [
      ["categories", data.categories],
      ["products", data.products],
    ] as const)
      for (const key of ["id", "slug"] as const) {
        const values = items.map((item) => item[key]);
        if (new Set(values).size !== values.length)
          ctx.addIssue({
            code: "custom",
            message: `Duplicate ${label} ${key}`,
          });
      }
    const skus = data.products.map((p) => p.sku);
    if (new Set(skus).size !== skus.length)
      ctx.addIssue({ code: "custom", message: "Duplicate SKU" });
    for (const p of data.products) {
      if (!data.categories.some((c) => c.id === p.categoryId))
        ctx.addIssue({
          code: "custom",
          message: `Unknown category for ${p.id}`,
        });
      if (new Set(p.variants.map((v) => v.id)).size !== p.variants.length)
        ctx.addIssue({
          code: "custom",
          message: `Duplicate variant for ${p.id}`,
        });
      if (
        p.categoryId === "bangles" &&
        p.variants.some((v) => v.size !== null && !/^\d+-\d+$/.test(v.size))
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Bangle sizes must be empty when unknown or strings such as 2-4",
        });
    }
  });
export type Catalogue = z.infer<typeof catalogueSchema>;
export type Product = z.infer<typeof productSchema>;
export type Category = z.infer<typeof categorySchema>;

export function assertTranslationCoverage(catalogue: Catalogue): void {
  for (const locale of ["en", "hi", "gu"] as const) {
    for (const c of catalogue.categories)
      if (!c.content[locale])
        throw new Error(`Missing ${locale} category translation: ${c.id}`);
    for (const p of catalogue.products.filter(
      (p) => p.publicationStatus === "published",
    )) {
      if (
        !p.content[locale] ||
        p.variants.some(
          (v) => !v.content[locale] || (v.colour && !v.colour[locale]),
        ) ||
        p.images.some((i) => !i.alt[locale])
      )
        throw new Error(`Missing ${locale} product translation: ${p.id}`);
    }
  }
}
