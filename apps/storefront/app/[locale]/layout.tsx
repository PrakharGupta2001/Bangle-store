import type { Metadata } from "next";
import { locales } from "@daya/catalogue";
import { resolveParams } from "@/lib/page";
import { SiteFrame } from "@/components/SiteFrame";
import "../styles.css";
export const dynamicParams = false;
export const metadata: Metadata = { robots: { index: false, follow: false } };
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  return (
    <html lang={locale}>
      <body>
        <SiteFrame locale={locale}>{children}</SiteFrame>
      </body>
    </html>
  );
}
