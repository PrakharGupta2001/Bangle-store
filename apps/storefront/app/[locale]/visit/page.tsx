import Link from "next/link";
import { store } from "@/config/store";
import {
  directionsLink,
  internationalPhone,
  localizedSetting,
} from "@daya/catalogue/contact";
import { resolveParams, pageMetadata, routePath } from "@/lib/page";
import { getStrings } from "@/lib/strings";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  const t = getStrings(locale);
  return pageMetadata(locale, { kind: "visit" }, t.visit.title, t.visit.meta);
}
export default async function Visit({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await resolveParams(params);
  const t = getStrings(locale);
  const map = directionsLink(store.mapUrl);
  const phone = internationalPhone(store.phone);
  const address = localizedSetting(store.exactAddress, locale);
  const hours = localizedSetting(store.openingHours, locale);
  return (
    <main id="main" className="container section">
      <div className="page-heading">
        <p className="eyebrow">{t.visit.eyebrow}</p>
        <h1>
          {t.visit.headline}
          <br />
          <em>{t.visit.accent}</em>
        </h1>
        <p>
          {t.visit.intro} {t.global.location}.
        </p>
      </div>
      <div className="visit-grid">
        <section className="location-card">
          <span className="location-symbol" aria-hidden="true">
            ⌖
          </span>
          <p className="eyebrow">{t.visit.find}</p>
          <h2>{t.global.location}</h2>
          <p>{address ?? t.visit.pending}</p>
          {!address && <span className="status-label">{t.visit.status}</span>}
        </section>
        <section className="contact-details">
          <h2>{t.visit.plan}</h2>
          <dl>
            <div>
              <dt>{t.visit.address}</dt>
              <dd>{address ?? t.visit.addressMissing}</dd>
            </div>
            <div>
              <dt>{t.visit.hours}</dt>
              <dd>{hours ?? t.visit.hoursMissing}</dd>
            </div>
            <div>
              <dt>{t.visit.phone}</dt>
              <dd>
                {phone ? (
                  <a className="text-link" href={`tel:${phone}`}>
                    {phone}
                  </a>
                ) : (
                  t.visit.contactMissing
                )}
              </dd>
            </div>
            <div>
              <dt>{t.visit.whatsapp}</dt>
              <dd>
                {store.whatsapp ?? t.visit.contactMissing}
                <br />
                {t.visit.whatsappDemo}
              </dd>
            </div>
            <div>
              <dt>{t.visit.directions}</dt>
              <dd>
                {map ? (
                  <>
                    <a
                      className="text-link"
                      href={map}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.visit.openMap} ↗
                    </a>
                    <p>{t.visit.external}</p>
                  </>
                ) : (
                  t.visit.mapMissing
                )}
              </dd>
            </div>
          </dl>
          <p>{t.visit.preview}</p>
          <Link
            className="button"
            href={routePath(locale, { kind: "collection" })}
          >
            {t.visit.browse} ↗
          </Link>
        </section>
      </div>
    </main>
  );
}
