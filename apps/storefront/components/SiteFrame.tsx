import { bangleSlug } from "@/lib/site";
import Link from "next/link";
import type { Locale } from "@daya/catalogue";
import { routePath } from "@daya/catalogue/routes";
import { getStrings } from "@/lib/strings";
import { Header } from "./Header";
export function SiteFrame({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = getStrings(locale);
  return (
    <>
      <a className="skip-link" href="#main">
        {t.global.skip}
      </a>
      <Header locale={locale} />
      {children}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Link
              className="footer-brand"
              href={routePath(locale, { kind: "home" })}
            >
              {t.global.brand}
              <span aria-hidden="true"> ✧</span>
            </Link>
            <p>
              {t.footer.tagline}
              <br />
              {t.global.location}.
            </p>
          </div>
          <div>
            <p className="eyebrow">{t.footer.explore}</p>
            <Link href={routePath(locale, { kind: "collection" })}>
              {t.nav.collection}
            </Link>
            <Link
              href={routePath(locale, { kind: "category", slug: bangleSlug })}
            >
              {t.footer.bangles}
            </Link>
            <Link href={routePath(locale, { kind: "visit" })}>
              {t.footer.visit}
            </Link>
          </div>
          <div>
            <p className="eyebrow">{t.footer.noteTitle}</p>
            <p>{t.footer.note}</p>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            {t.global.brand} · {t.footer.phase}
          </span>
          <span>{t.footer.made}</span>
        </div>
      </footer>
    </>
  );
}
