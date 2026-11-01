import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, routePath, type StoreRoute } from "@daya/catalogue/routes";
import { seoAlternates } from "@daya/catalogue/seo";
import { store } from "@/config/store";
import { getStrings } from "./strings";
import type { Locale } from "@daya/catalogue";
export async function resolveParams<T extends { locale: string }>(
  params: Promise<T>,
) {
  const value = await params;
  if (!isLocale(value.locale)) notFound();
  return { ...value, locale: value.locale as Locale };
}
export function pageMetadata(
  locale: Locale,
  route: StoreRoute,
  title: string,
  description: string,
): Metadata {
  return {
    title: `${title} | ${getStrings(locale).global.brand}`,
    description,
    robots: { index: false, follow: false },
    alternates: seoAlternates(store.publicWebsiteUrl, locale, route),
  };
}
export { routePath };
