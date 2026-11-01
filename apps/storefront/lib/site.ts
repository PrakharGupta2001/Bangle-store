import site from "../generated/site.json";
export const productCount = site.productCount;
export const bangleSlug = (site.categorySlugs as Record<string, string>)
  .bangles;
