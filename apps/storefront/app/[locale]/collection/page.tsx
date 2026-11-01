import type { Metadata } from "next";
import { catalogueRepository } from "@daya/catalogue/repository";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import { getStrings } from "@/lib/strings";
import { routePath, resolveParams, pageMetadata } from "@/lib/page";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  const t = getStrings(locale);
  return pageMetadata(
    locale,
    { kind: "collection" },
    t.nav.collection,
    t.collection.meta,
  );
}
export default async function Collection({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  const t = getStrings(locale);
  const [products, categories] = await Promise.all([
    catalogueRepository.listProducts(),
    catalogueRepository.listCategories(),
  ]);
  return (
    <main id="main" className="container section">
      <div className="page-heading">
        <p className="eyebrow">{t.collection.eyebrow}</p>
        <h1>{t.collection.title}</h1>
        <p>{t.collection.body}</p>
      </div>
      <CatalogueBrowser
        products={products}
        categories={categories}
        locale={locale}
      />
    </main>
  );
}
