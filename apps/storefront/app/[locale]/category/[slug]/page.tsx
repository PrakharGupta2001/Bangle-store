import { getStrings } from "@/lib/strings";
import { routePath, resolveParams, pageMetadata } from "@/lib/page";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogueRepository } from "@daya/catalogue/repository";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
export const dynamicParams = false;
export async function generateStaticParams() {
  return (await catalogueRepository.listCategories()).map((c) => ({
    slug: c.slug,
  }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await resolveParams(params);
  const t = getStrings(locale);
  const c = (await catalogueRepository.listCategories()).find(
    (c) => c.slug === slug,
  );
  return pageMetadata(
    locale,
    { kind: "category", slug },
    c?.content[locale]?.name ?? t.notFound.title,
    c?.content[locale]?.description ?? t.notFound.body,
  );
}
export default async function Category({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await resolveParams(params);
  const t = getStrings(locale);
  const [products, categories] = await Promise.all([
    catalogueRepository.listProducts(),
    catalogueRepository.listCategories(),
  ]);
  const c = categories.find((c) => c.slug === slug);
  if (!c) notFound();
  return (
    <main id="main" className="container section">
      <nav aria-label={t.global.breadcrumb} className="breadcrumbs">
        <Link href={routePath(locale, { kind: "home" })}>{t.nav.home}</Link>
        <span>/</span>
        <Link href={routePath(locale, { kind: "collection" })}>
          {t.global.collection}
        </Link>
        <span>/</span>
        <span aria-current="page">{c.content[locale]!.name}</span>
      </nav>
      <div className="page-heading">
        <p className="eyebrow">{t.collection.categoryEyebrow}</p>
        <h1>{c.content[locale]!.name}</h1>
        <p>{c.content[locale]!.description}</p>
      </div>
      <CatalogueBrowser
        products={products}
        categories={categories}
        initialCategory={c.id}
        locale={locale}
      />
    </main>
  );
}
