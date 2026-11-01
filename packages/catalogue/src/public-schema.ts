import { z } from "zod";
import {
  productSchema,
  categorySchema,
  assertTranslationCoverage,
  catalogueSchema,
} from "./schema";
export const publicProductSchema = productSchema
  .omit({ publicationStatus: true, reviewStatus: true, variants: true })
  .extend({
    variants: z
      .array(productSchema.shape.variants.element.omit({ stock: true }))
      .min(1),
  })
  .strict();
export const publicCatalogueSchema = z
  .object({
    schemaVersion: z.literal(1),
    categories: z.array(categorySchema).min(1),
    products: z.array(publicProductSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const full = {
      ...data,
      products: data.products.map((p) => ({
        ...p,
        publicationStatus: "published",
        reviewStatus: "verified",
        variants: p.variants.map((v) => ({ ...v, stock: null })),
      })),
    };
    const checked = catalogueSchema.safeParse(full);
    if (!checked.success) {
      for (const issue of checked.error.issues)
        ctx.addIssue({ code: "custom", message: issue.message });
      return;
    }
    try {
      assertTranslationCoverage(checked.data);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
  });
