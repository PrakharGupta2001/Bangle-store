import { validateStoreSettings } from "@daya/catalogue/contact";
import settings from "../generated/settings.json";
export const store = validateStoreSettings(settings);
