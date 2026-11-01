import { z } from "zod";
import {
  productSchema,
  categorySchema,
  catalogueSchema,
  assertTranslationCoverage,
} from "../../../packages/catalogue/src/schema";
import { validateStoreSettings } from "../../../packages/catalogue/src/contact";
import en from "../../storefront/lib/translations/en.json";
import hi from "../../storefront/lib/translations/hi.json";
import gu from "../../storefront/lib/translations/gu.json";
export const locales = ["en", "hi", "gu"] as const;
const text = z.string().trim().max(12000);
const content = z.object({ name: text, description: text }).strict();
const translated = <T extends z.ZodType>(item: T) =>
  z.object({ en: item, hi: item.optional(), gu: item.optional() }).strict();
const adminVariant = productSchema.shape.variants.element.extend({
  content: translated(z.object({ label: text }).strict()),
  colour: translated(text).optional(),
});
export const adminProductSchema = productSchema
  .extend({
    content: translated(content),
    images: z.array(
      productSchema.shape.images.element.extend({ alt: translated(text) }),
    ),
    variants: z.array(adminVariant).min(1),
    private: z.object({ storageLocation: text, notes: text }).strict(),
  })
  .strict();
const category = categorySchema.extend({ content: translated(content) });
const localized = z.union([text, translated(text)]).nullable();
export const settingsSchema = z
  .object({
    name: z.string().min(1).max(150),
    location: z.string().min(1).max(150),
    exactAddress: localized,
    openingHours: localized,
    phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    mapUrl: z.string().nullable(),
    publicWebsiteUrl: z.string().nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    try {
      validateStoreSettings(v);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
  });
const shape = (obj: Record<string, string>) =>
  Object.fromEntries(
    Object.keys(obj).map((k) => [k, z.string().trim().min(1).max(12000)]),
  );
const editorial = z
  .object({
    home: z.object(shape(en.home)).strict(),
    hero: z.object(shape(en.hero)).strict(),
  })
  .strict();
export const homeSchema = z
  .object({ en: editorial, hi: editorial, gu: editorial })
  .strict();
export const defaultHome = {
  en: { home: en.home, hero: en.hero },
  hi: { home: hi.home, hero: hi.hero },
  gu: { home: gu.home, hero: gu.hero },
};
export const assetSchema = z
  .object({
    id: z.string().uuid(),
    originalExtension: z.enum(["jpeg", "png", "webp"]),
    width: z.number().int().positive().max(6000),
    height: z.number().int().positive().max(6000),
    bytes: z
      .number()
      .int()
      .positive()
      .max(8 * 1024 * 1024),
  })
  .strict();
export const stateSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    categories: z.array(category).min(1),
    products: z.array(adminProductSchema),
    settings: settingsSchema,
    home: homeSchema,
    assets: z.array(assetSchema),
  })
  .strict()
  .superRefine((d, ctx) => {
    for (const [kind, items] of [
      ["products", d.products],
      ["categories", d.categories],
    ] as const)
      for (const key of ["id", "slug"] as const)
        if (new Set(items.map((x) => x[key])).size !== items.length)
          ctx.addIssue({ code: "custom", message: `Duplicate ${kind} ${key}` });
    if (new Set(d.products.map((p) => p.sku)).size !== d.products.length)
      ctx.addIssue({ code: "custom", message: "Duplicate SKU" });
    if (new Set(d.assets.map((a) => a.id)).size !== d.assets.length)
      ctx.addIssue({ code: "custom", message: "Duplicate asset ID" });
    for (const p of d.products) {
      if (!d.categories.some((c) => c.id === p.categoryId))
        ctx.addIssue({
          code: "custom",
          message: `Unknown category for ${p.id}`,
        });
      if (new Set(p.variants.map((v) => v.id)).size !== p.variants.length)
        ctx.addIssue({
          code: "custom",
          message: `Duplicate variant ID: ${p.id}`,
        });
      if (
        p.categoryId === "bangles" &&
        p.variants.some((v) => v.size !== null && !/^\d+-\d+$/.test(v.size))
      )
        ctx.addIssue({
          code: "custom",
          message: `Bangle sizes must be empty when unknown or strings such as 2-4: ${p.id}`,
        });
    }
  });
export type AdminState = z.infer<typeof stateSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;
export function publishedCatalogue(state: AdminState) {
  const products = state.products
    .filter((p) => p.publicationStatus === "published")
    .map(({ private: ignored, ...product }) => product);
  const catalogue = catalogueSchema.parse({
    schemaVersion: 1,
    products,
    categories: state.categories,
  });
  assertTranslationCoverage(catalogue);
  return catalogue;
}
export function missingTranslations(p: AdminProduct) {
  return locales.filter(
    (l) =>
      !p.content[l]?.name.trim() ||
      !p.content[l]?.description.trim() ||
      p.variants.some(
        (v) =>
          !v.content[l]?.label.trim() || (v.colour && !v.colour[l]?.trim()),
      ) ||
      p.images.some((i) => !i.alt[l]?.trim()),
  );
}
export class AdminError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
