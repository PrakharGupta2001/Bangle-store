import {
  locales,
  type Locale,
  type PublicProduct,
  type Category,
} from "./index";
import { publicOrigin } from "./contact";
import { routePath, type StoreRoute } from "./routes";
export function seoAlternates(
  website: string | null,
  locale: Locale,
  route: StoreRoute,
) {
  const origin = publicOrigin(website);
  if (!origin || route.kind === "not-found") return undefined;
  return {
    canonical: origin + routePath(locale, route),
    languages: Object.fromEntries(
      locales.map((l) => [l, origin + routePath(l, route)]),
    ),
  };
}
export function productionSitemap(
  website: string | null,
  products: PublicProduct[],
  categories: Category[],
  ready = false,
) {
  const origin = publicOrigin(website);
  if (!ready || !origin) return [];
  const real = products.filter((p) => !p.isDemo);
  if (!real.length) return [];
  const routes: StoreRoute[] = [
    { kind: "home" },
    { kind: "collection" },
    { kind: "visit" },
    ...categories
      .filter((c) => real.some((p) => p.categoryId === c.id))
      .map((c) => ({ kind: "category" as const, slug: c.slug })),
    ...real.map((p) => ({ kind: "product" as const, slug: p.slug })),
  ];
  return routes.flatMap((route) =>
    locales.map((locale) => ({
      url: origin + routePath(locale, route),
      alternates: {
        languages: seoAlternates(website, locale, route)!.languages,
      },
    })),
  );
}
