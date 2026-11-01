import { locales, type Locale } from "./index";
export const languageLabels: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  gu: "ગુજરાતી",
};
export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
export type StoreRoute =
  | { kind: "home" | "collection" | "visit" | "not-found" }
  | { kind: "category" | "product"; slug: string };
export function routePath(locale: Locale, route: StoreRoute): string {
  if (route.kind === "home") return `/${locale}/`;
  if (route.kind === "product" || route.kind === "category") {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route.slug))
      throw new Error("Invalid route slug");
    return `/${locale}/${route.kind}/${route.slug}/`;
  }
  return `/${locale}/${route.kind}/`;
}
export function parseRoute(pathname: string): StoreRoute | null {
  const parts = pathname.split("/").filter(Boolean);
  if (!isLocale(parts[0] ?? "")) return null;
  if (parts.length === 1) return { kind: "home" };
  if (
    parts.length === 2 &&
    ["collection", "visit", "not-found"].includes(parts[1])
  )
    return { kind: parts[1] as "collection" | "visit" | "not-found" };
  if (
    parts.length === 3 &&
    ["product", "category"].includes(parts[1]) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[2])
  )
    return { kind: parts[1] as "product" | "category", slug: parts[2] };
  return null;
}
export function equivalentPath(
  pathname: string,
  locale: Locale,
  variantId?: string | null,
): string {
  const route = parseRoute(pathname) ?? { kind: "home" };
  const base = routePath(locale, route);
  return route.kind === "product" && variantId && /^[a-z0-9-]+$/.test(variantId)
    ? `${base}?variant=${encodeURIComponent(variantId)}`
    : base;
}
