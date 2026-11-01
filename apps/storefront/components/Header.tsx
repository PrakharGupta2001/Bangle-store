"use client";
import { bangleSlug } from "@/lib/site";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { getStrings } from "@/lib/strings";
import type { Locale } from "@daya/catalogue";
import { routePath } from "@daya/catalogue/routes";
import { LanguageSelector } from "./LanguageSelector";
export function Header({ locale }: { locale: Locale }) {
  const t = getStrings(locale);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className="header">
      <div className="demo-bar">
        {t.demo}
        <span className="demo-pill">{t.global.demo}</span>
      </div>
      <div className="container header-inner">
        <Link href={routePath(locale, { kind: "home" })} className="brand">
          <span className="brand-mark" aria-hidden="true">
            d<span>✧</span>
          </span>
          <span>
            {t.global.brandMain}{" "}
            <span className="brand-sub">{t.global.brandSub}</span>
          </span>
        </Link>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {t.global.menu} <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        <nav
          id="main-nav"
          aria-label={t.global.navigation}
          className={open ? "nav open" : "nav"}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              document
                .querySelector<HTMLButtonElement>(".menu-toggle")
                ?.focus();
            }
          }}
        >
          {[
            [routePath(locale, { kind: "collection" }), t.nav.collection],
            [
              routePath(locale, { kind: "category", slug: bangleSlug }),
              t.nav.bangles,
            ],
            [routePath(locale, { kind: "visit" }), t.nav.visit],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                path === href || path === href.slice(0, -1) ? "page" : undefined
              }
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="header-location">
          <span aria-hidden="true">⌖</span> {t.global.shortLocation}
        </span>
        <LanguageSelector locale={locale} />
      </div>
    </header>
  );
}
