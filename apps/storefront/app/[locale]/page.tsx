import { bangleSlug } from "@/lib/site";
import Link from "next/link";
import { catalogueRepository } from "@daya/catalogue/repository";
import { ProductCard } from "@/components/ProductCard";
import { getStrings } from "@/lib/strings";
import { routePath, resolveParams, pageMetadata } from "@/lib/page";
export default async function Home({
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
  const activeCategories = categories.filter((c) =>
    products.some((p) => p.categoryId === c.id),
  );
  const heroProduct = products.find((p) => !p.isDemo && p.featured && p.categoryId === "bangles")
    ?? products.find((p) => !p.isDemo);
  return (
    <main id="main">
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="gold-line" />
            {t.hero.eyebrow}
          </p>
          <h1>
            {t.home.titleOne}
            <br />
            {t.home.titleTwo} <em>{t.home.titleAccent}</em>
          </h1>
          <p className="hero-description">{t.hero.body}</p>
          <Link
            href={routePath(locale, { kind: "collection" })}
            className="button"
          >
            {t.browse} <span aria-hidden="true">↗</span>
          </Link>
          <Link
            href={routePath(locale, { kind: "category", slug: bangleSlug })}
            className="hero-secondary"
          >
            {t.home.startBangles} <span aria-hidden="true">→</span>
          </Link>
          <div className="hero-foot">
            <span aria-hidden="true">✧</span>
            <span>{t.home.littleDetails}</span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src={heroProduct?.images[0].src ?? "/images/bangles-01.svg"}
            alt={heroProduct?.images[0].alt[locale] ?? t.home.heroAlt}
            style={heroProduct ? { objectFit: "contain" } : undefined}
            width="600"
            height="500"
            fetchPriority="high"
          />
          <div className="hero-stamp">
            <span>{t.home.stamp}</span>
            <span aria-hidden="true">✧</span>
          </div>
          <div className="hero-caption">
            <span>{heroProduct?.content[locale]?.name ?? t.home.caption}</span>
            <span>{heroProduct ? t.photoPreview : t.home.illustrated}</span>
          </div>
        </div>
      </section>
      <div className="value-strip">
        <div className="container">
          <span>{t.home.banglesHeart}</span>
          <span aria-hidden="true">✧</span>
          <span>{t.home.everyday}</span>
          <span aria-hidden="true">✧</span>
          <span>{t.home.findUs}</span>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.home.categoryEyebrow}</p>
            <h2>{t.home.explore}</h2>
          </div>
          <Link
            className="text-link"
            href={routePath(locale, { kind: "collection" })}
          >
            {t.home.viewAll} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="category-grid">
          {activeCategories.map((c, i) => (
            <Link
              className="category-card"
              href={routePath(locale, { kind: "category", slug: c.slug })}
              key={c.id}
            >
              <div className="category-art">
                <img
                  src={c.image}
                  alt={`${c.image.startsWith("/catalogue-images/") ? t.photoPreview : t.sample}: ${c.content[locale]!.name}`}
                  width="600"
                  height="500"
                  loading="lazy"
                />
              </div>
              <div className="category-caption">
                <span>
                  <small>0{i + 1} /</small> {c.content[locale]!.name}
                </span>
                <span aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="featured section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.home.featuredEyebrow}</p>
              <h2>{t.home.favourites}</h2>
            </div>
            <p className="section-note">{t.home.featuredNote}</p>
          </div>
          <div className="product-grid">
            {products
              .filter((p) => p.featured)
              .slice(0, 4)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  categories={categories}
                  locale={locale}
                />
              ))}
          </div>
        </div>
      </section>
      <section className="container section about">
        <div className="about-symbol" aria-hidden="true">
          <span>✧</span>
          <p>{t.home.aboutSymbol}</p>
        </div>
        <div>
          <p className="eyebrow">{t.home.aboutEyebrow}</p>
          <h2>
            {t.home.aboutTitle}
            <br />
            <em>{t.home.aboutAccent}</em>
          </h2>
          <p>{t.home.aboutBody}</p>
          <p>{t.home.aboutNote}</p>
          <Link
            className="text-link"
            href={routePath(locale, { kind: "visit" })}
          >
            {t.home.aboutLink} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="visit-band">
        <div className="container visit-inner">
          <div>
            <p className="eyebrow">{t.home.visitEyebrow}</p>
            <h2>
              {t.home.visitTitle}
              <br />
              {t.home.visitAccent}
            </h2>
            <p>
              {t.global.location}
              <br />
              {t.home.visitNote}
            </p>
          </div>
          <Link
            className="button button-light"
            href={routePath(locale, { kind: "visit" })}
          >
            {t.home.visitLink} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  const t = getStrings(locale);
  return pageMetadata(
    locale,
    { kind: "home" },
    `${t.global.brand} · ${t.global.shortLocation}`,
    t.home.meta,
  );
}
