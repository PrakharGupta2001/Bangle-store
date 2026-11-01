import { buildEnquiryMessage, type PublicProduct, type Locale } from "./index";
export type LocalizedSetting =
  | string
  | { en: string; hi?: string; gu?: string }
  | null;
// An empty translation is unknown, not a reason to hide the placeholder or publish English silently.
export function localizedSetting(
  value: LocalizedSetting,
  locale: Locale,
): string | null {
  const selected = typeof value === "string" ? value : value?.[locale];
  return selected?.trim() || null;
}
export interface StoreSettings {
  name: string;
  location: string;
  exactAddress: LocalizedSetting;
  openingHours: LocalizedSetting;
  phone: string | null;
  whatsapp: string | null;
  mapUrl: string | null;
  publicWebsiteUrl: string | null;
}
export function internationalPhone(
  value: string | null | undefined,
): string | null {
  return value && /^\+[1-9]\d{7,14}$/.test(value) && !/^\+(\d)\1+$/.test(value)
    ? value
    : null;
}
export function publicOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      u.search ||
      u.hash ||
      u.pathname !== "/" ||
      !h.includes(".") ||
      /^[\d.]+$/.test(h) ||
      h.includes(":") ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(h) ||
      h.endsWith(".localhost") ||
      h.endsWith(".local")
    )
      return null;
    return u.origin;
  } catch {
    return null;
  }
}
export function directionsLink(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    const h = u.hostname;
    const hasDestination = ["q", "query", "destination", "daddr"].some((k) =>
      Boolean(u.searchParams.get(k)?.trim()),
    );
    const google =
      ["google.com", "www.google.com", "maps.google.com"].includes(h) &&
      (u.pathname.startsWith("/maps") || h === "maps.google.com") &&
      (hasDestination || /^\/maps\/(place|dir)\/.+/.test(u.pathname));
    const short =
      h === "maps.app.goo.gl" && /^\/[A-Za-z0-9_-]+$/.test(u.pathname);
    const osm =
      ["www.openstreetmap.org", "openstreetmap.org"].includes(h) &&
      ((u.pathname === "/directions" && u.searchParams.has("route")) ||
        /^\/(node|way|relation)\/\d+$/.test(u.pathname) ||
        (u.searchParams.has("mlat") && u.searchParams.has("mlon")));
    return google || short || osm ? u.href : null;
  } catch {
    return null;
  }
}
// Pure generator: never opens a browser and never adds any website/product URL to the message.
export function buildWhatsAppLink(
  number: string | null,
  product: PublicProduct,
  variantId: string,
  locale: Locale,
): string | null {
  const phone = internationalPhone(number);
  if (!phone) return null;
  const message = buildEnquiryMessage(product, variantId, locale);
  for (const candidate of message.match(/https?:\/\/[^\s]+/gi) ?? []) {
    try {
      const host = new URL(candidate).hostname;
      if (
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host.endsWith(".local") ||
        host === "[::1]" ||
        /^(127\.|10\.|192\.168\.|0\.)/.test(host)
      )
        return null;
    } catch {
      return null;
    }
  }
  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`;
}
// Defence in depth: even a configured number cannot enable messaging for demonstration records.
export function enquiryLink(
  number: string | null,
  product: PublicProduct,
  variantId: string,
  locale: Locale,
): string | null {
  return product.isDemo
    ? null
    : buildWhatsAppLink(number, product, variantId, locale);
}
export function validateStoreSettings(settings: StoreSettings): StoreSettings {
  for (const key of ["phone", "whatsapp"] as const)
    if (settings[key] !== null && !internationalPhone(settings[key]))
      throw new Error(
        `Invalid ${key}: use +countrycode and digits (8–15 digits)`,
      );
  if (settings.mapUrl !== null && !directionsLink(settings.mapUrl))
    throw new Error(
      "Invalid directions link: use a destination-specific HTTPS Google Maps or OpenStreetMap URL",
    );
  if (
    settings.publicWebsiteUrl !== null &&
    !publicOrigin(settings.publicWebsiteUrl)
  ) {
    // Localhost configuration is a valid local state, but never a public SEO origin.
    let local = false;
    try {
      const u = new URL(settings.publicWebsiteUrl);
      local =
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) &&
        ["http:", "https:"].includes(u.protocol) &&
        !u.username &&
        !u.password;
    } catch {}
    if (!local)
      throw new Error(
        "Public website URL must be an HTTPS public origin (no path, query or credentials)",
      );
  }
  return settings;
}
