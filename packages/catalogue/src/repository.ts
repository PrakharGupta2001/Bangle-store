// Build-time adapter only. Future JSON/MySQL adapters implement this interface in apps/admin.
import snapshot from "../generated/catalogue.json";
import { publicCatalogueSchema } from "./public-schema";
import { catalogueSchema, assertTranslationCoverage } from "./schema";
import { toPublicProduct, type PublicProduct, type Category } from "./index";
export interface PublicCatalogueRepository {
  listProducts(): Promise<PublicProduct[]>;
  listCategories(): Promise<Category[]>;
  findProduct(slug: string): Promise<PublicProduct | undefined>;
}
export function createFixtureRepository(
  input: unknown,
): PublicCatalogueRepository {
  const catalogue = catalogueSchema.parse(input);
  assertTranslationCoverage(catalogue);
  const products = catalogue.products
    .filter((p) => p.publicationStatus === "published")
    .map(toPublicProduct);
  return {
    async listProducts() {
      return structuredClone(products);
    },
    async listCategories() {
      return structuredClone(catalogue.categories);
    },
    async findProduct(slug) {
      return structuredClone(products.find((p) => p.slug === slug));
    },
  };
}
export function createPublicRepository(
  input: unknown,
): PublicCatalogueRepository {
  const data = publicCatalogueSchema.parse(input);
  return {
    async listProducts() {
      return structuredClone(data.products);
    },
    async listCategories() {
      return structuredClone(data.categories);
    },
    async findProduct(slug: string) {
      return structuredClone(data.products.find((p) => p.slug === slug));
    },
  };
}
export const catalogueRepository = createPublicRepository(snapshot);
