import type { Locale } from "@daya/catalogue";
import { productCount } from "./site";
import home from "../generated/home.json";
import en from "./translations/en.json";
import hi from "./translations/hi.json";
import gu from "./translations/gu.json";
export type Dictionary = typeof en;
export const dictionaries: Record<Locale, Dictionary> = { en, hi, gu };
export const getStrings = (locale: Locale): Dictionary => ({
  ...dictionaries[locale],
  collection: {
    ...dictionaries[locale].collection,
    body: dictionaries[locale].collection.body.replaceAll(
      "{count}",
      String(productCount),
    ),
    meta: dictionaries[locale].collection.meta.replaceAll(
      "{count}",
      String(productCount),
    ),
  },
  home: home[locale].home as Dictionary["home"],
  hero: home[locale].hero as Dictionary["hero"],
});
