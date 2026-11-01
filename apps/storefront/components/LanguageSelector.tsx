"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@daya/catalogue";
import { equivalentPath, languageLabels } from "@daya/catalogue/routes";
import { getStrings } from "@/lib/strings";
export function LanguageSelector({ locale }: { locale: Locale }) {
  const path = usePathname();
  const [variant, setVariant] = useState<string | null>(null);
  useEffect(() => {
    const sync = () =>
      setVariant(new URLSearchParams(window.location.search).get("variant"));
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("daya:variant-change", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("daya:variant-change", sync);
    };
  }, [path]);
  return (
    <nav
      className="language-selector"
      aria-label={getStrings(locale).global.language}
    >
      {locales.map((l) => (
        <a
          key={l}
          href={equivalentPath(path, l, variant)}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? "page" : undefined}
        >
          {languageLabels[l]}
        </a>
      ))}
    </nav>
  );
}
