import type { Metadata } from "next";
import { locales } from "@daya/catalogue";
import { getStrings } from "@/lib/strings";
import { routePath, languageLabels } from "@daya/catalogue/routes";
import "./styles.css";
export const metadata: Metadata = {
  title: "404 · Daya Variety Store",
  description: "Page not found. पृष्ठ नहीं मिला। પાનું મળ્યું નથી.",
  robots: { index: false, follow: false },
};
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className="container section empty-state">
          <p className="eyebrow">404 · Daya Variety Store</p>
          {locales.map((locale, i) => {
            const t = getStrings(locale);
            const Heading = i === 0 ? "h1" : "h2";
            return (
              <section
                lang={locale}
                key={locale}
                className="not-found-language"
              >
                <Heading>{t.notFound.title}</Heading>
                <p>{t.notFound.body}</p>
                <a
                  className="button"
                  href={routePath(locale, { kind: "collection" })}
                >
                  {languageLabels[locale]} · {t.browse} →
                </a>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
