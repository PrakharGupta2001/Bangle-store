import { store } from "@/config/store";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogueRepository } from "@daya/catalogue/repository";
import { priceLabel } from "@daya/catalogue";
import { ProductCard } from "@/components/ProductCard";
import { ProductOptions } from "@/components/ProductOptions";
import { getStrings } from "@/lib/strings";
import { routePath, resolveParams, pageMetadata } from "@/lib/page";
export const dynamicParams = false;
export async function generateStaticParams() {
  return (await catalogueRepository.listProducts()).map((p) => ({
    slug: p.slug,
  }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await resolveParams(params);
  const t = getStrings(locale);
  const p = await catalogueRepository.findProduct(slug);
  return pageMetadata(
    locale,
    { kind: "product", slug },
    p?.content[locale]?.name ?? t.notFound.title,
    p?.content[locale]?.description ?? t.notFound.body,
  );
}
export default async function Product({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await resolveParams(params);
  const t = getStrings(locale);
  const p = await catalogueRepository.findProduct(slug);
  if (!p) notFound();
  const [products, categories] = await Promise.all([
    catalogueRepository.listProducts(),
    catalogueRepository.listCategories(),
  ]);
  const c = categories.find((c) => c.id === p.categoryId)!;
  return (
    <main id="main" className="container section">
      <nav aria-label={t.global.breadcrumb} className="breadcrumbs">
        <Link href={routePath(locale, { kind: "home" })}>{t.nav.home}</Link>
        <span>/</span>
        <Link href={routePath(locale, { kind: "collection" })}>
          {t.global.collection}
        </Link>
        <span>/</span>
        <Link href={routePath(locale, { kind: "category", slug: c.slug })}>
          {c.content[locale]!.name}
        </Link>
        <span>/</span>
        <span aria-current="page">{p.content[locale]!.name}</span>
      </nav>
      <div className="product-detail">
        <div className="detail-gallery">
          {p.images.map((image) => (
            <figure key={image.src}>
              <img
                src={image.src}
                alt={image.alt[locale]!}
                width="600"
                height="500"
              />
              <figcaption>
                {image.src.startsWith("/catalogue-images/")
                  ? image.alt[locale]
                  : t.detail.imageNote}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {c.content[locale]!.name} /{" "}
            {p.isDemo ? t.detail.demoDesign : t.photoPreview}
          </p>
          <h1>{p.content[locale]!.name}</h1>
          <p className="sku">
            {t.detail.reference} · {p.sku}
          </p>
          <p className="detail-price">{priceLabel(p.pricePaise, locale)}</p>
          <p>{p.content[locale]!.description}</p>
          <ProductOptions
            key={p.id}
            product={p}
            locale={locale}
            whatsapp={null}
          />
          <div className="detail-note">{t.detail.priceNote}</div>
        </div>
      </div>
      <section className="related section">
        <div className="section-heading">
          <h2>{t.detail.related}</h2>
          <Link
            className="text-link"
            href={routePath(locale, { kind: "category", slug: c.slug })}
          >
            {t.detail.explore} {c.content[locale]!.name} ↗
          </Link>
        </div>
        <div className="product-grid">
          {products
            .filter((q) => q.categoryId === p.categoryId && q.id !== p.id)
            .slice(0, 4)
            .map((q) => (
              <ProductCard
                key={q.id}
                product={q}
                categories={categories}
                locale={locale}
              />
            ))}
        </div>
      </section>
    </main>
  );
}
