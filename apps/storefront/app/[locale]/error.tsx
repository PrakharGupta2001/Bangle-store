"use client";
import { useParams } from "next/navigation";
import { isLocale, routePath } from "@daya/catalogue/routes";
import { getStrings } from "@/lib/strings";
export default function StoreError({ reset }: { reset: () => void }) {
  const params = useParams();
  const locale =
    typeof params.locale === "string" && isLocale(params.locale)
      ? params.locale
      : "en";
  const t = getStrings(locale);
  return (
    <main id="main" className="container section empty-state">
      <h1>{t.error.title}</h1>
      <p>{t.error.body}</p>
      <button className="button" onClick={reset}>
        {t.error.retry}
      </button>
      <p>
        <a
          className="text-link"
          href={routePath(locale, { kind: "collection" })}
        >
          {t.browse}
        </a>
      </p>
    </main>
  );
}
