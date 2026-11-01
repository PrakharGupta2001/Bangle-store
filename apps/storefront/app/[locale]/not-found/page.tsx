import Link from "next/link";
import { resolveParams, pageMetadata, routePath } from "@/lib/page";
import { getStrings } from "@/lib/strings";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  const t = getStrings(locale);
  return pageMetadata(
    locale,
    { kind: "not-found" },
    t.notFound.title,
    t.notFound.body,
  );
}
export default async function Missing({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  const t = getStrings(locale);
  return (
    <main id="main" className="container section empty-state">
      <p className="eyebrow">{t.notFound.eyebrow}</p>
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.body}</p>
      <Link className="button" href={routePath(locale, { kind: "collection" })}>
        {t.browse} →
      </Link>
    </main>
  );
}
