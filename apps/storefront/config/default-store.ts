import { validateStoreSettings } from "@daya/catalogue/contact";
export const store = validateStoreSettings({
  name: "Daya Variety Store",
  location: "Vadodara, Gujarat",
  exactAddress: null,
  openingHours: null,
  phone: null,
  whatsapp: null,
  mapUrl: null,
  publicWebsiteUrl: null,
});
