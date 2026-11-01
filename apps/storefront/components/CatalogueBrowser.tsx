"use client";
import { useState } from "react";
import {
  browseProducts,
  type SortOrder,
  type PublicProduct,
  type Category,
} from "@daya/catalogue";
import { ProductCard } from "./ProductCard";
import { getStrings } from "@/lib/strings";
import type { Locale } from "@daya/catalogue";
import { routePath } from "@daya/catalogue/routes";
export function CatalogueBrowser({
  products,
  categories,
  initialCategory = "",
  locale,
}: {
  products: PublicProduct[];
  categories: Category[];
  initialCategory?: string;
  locale: Locale;
}) {
  const t = getStrings(locale);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortOrder>("featured");
  const results = browseProducts(products, query, category, sort, locale);
  function clear() {
    setQuery("");
    setCategory("");
    setSort("featured");
  }
  return (
    <>
      <div className="filters">
        <label className="search-label">
          {t.collection.search}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.collection.searchPlaceholder}
          />
        </label>
        <label>
          {t.collection.category}
          <select
            aria-label={t.collection.category}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t.collection.all}</option>
            {categories.filter((c) => c.id === initialCategory || products.some((p) => p.categoryId === c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.content[locale]!.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.collection.sort}
          <select
            aria-label={t.collection.sort}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
          >
            <option value="featured">{t.collection.featured}</option>
            <option value="name">{t.collection.name}</option>
            <option value="price-asc">{t.collection.low}</option>
            <option value="price-desc">{t.collection.high}</option>
          </select>
        </label>
      </div>
      <div className="results-line">
        <p role="status" aria-live="polite">
          {results.length}{" "}
          {results.length === 1 ? t.collection.design : t.collection.designs}
        </p>
        {(query || category || sort !== "featured") && (
          <button className="text-button" onClick={clear}>
            {t.collection.clear} ×
          </button>
        )}
      </div>
      <h2 className="visually-hidden">{t.collection.heading}</h2>
      {results.length ? (
        <div className="product-grid">
          {results.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              categories={categories}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">✧</span>
          <h2>{t.collection.empty}</h2>
          <p>{t.collection.emptyBody}</p>
          <button className="button" onClick={clear}>
            {t.collection.clear}
          </button>
        </div>
      )}
    </>
  );
}
