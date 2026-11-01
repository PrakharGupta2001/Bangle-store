import Link from "next/link";
import { priceLabel, type PublicProduct, type Category } from "@daya/catalogue";
import { getStrings } from "@/lib/strings";
import type { Locale } from "@daya/catalogue";
import { routePath } from "@daya/catalogue/routes";
export function ProductCard({
  product: p,
  categories,
  locale,
}: {
  product: PublicProduct;
  categories: Category[];
  locale: Locale;
}) {
  const t = getStrings(locale);
  return (
    <article className="product-card">
      <Link
        href={routePath(locale, { kind: "product", slug: p.slug })}
        className="product-link"
      >
        <div className="product-image">
          <img
            src={p.images[0].src}
            alt={p.images[0].alt[locale]!}
            width="600"
            height="500"
            loading="lazy"
          />
          <span className="sample-tag">
            {p.images[0].src.startsWith("/catalogue-images/")
              ? t.photoPreview
              : t.sample}
          </span>
          <span className="card-arrow" aria-hidden="true">
            ↗
          </span>
        </div>
        <div className="product-info">
          <p className="eyebrow">
            {
              categories.find((c) => c.id === p.categoryId)?.content[locale]!
                .name
            }
          </p>
          <h3>{p.content[locale]!.name}</h3>
          <p className="price">{priceLabel(p.pricePaise, locale)}</p>
        </div>
      </Link>
    </article>
  );
}
