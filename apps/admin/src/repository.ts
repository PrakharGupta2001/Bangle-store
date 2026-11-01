import { readFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { projectRoot, type Paths } from "./paths";
import { atomicWrite, exists, readJson, withLock } from "./storage";
import {
  stateSchema,
  defaultHome,
  AdminError,
  type AdminState,
  type AdminProduct,
} from "./model";
import { store as initialStore } from "../../storefront/config/default-store";
export interface AdminRepository {
  read(): Promise<AdminState>;
  update(
    revision: number,
    change: (state: AdminState) => void | Promise<void>,
  ): Promise<AdminState>;
}
export class JsonRepository implements AdminRepository {
  constructor(public paths: Paths) {}
  async initialize() {
    await withLock(this.paths, async () => {
      if (await exists(this.paths.state)) {
        await this.read();
        return;
      }
      // A populated runtime directory with missing state is a recovery problem, never a reset signal.
      if (await exists(this.paths.runtime))
        throw new AdminError(
          "Runtime directory exists without state.json. Restore a backup; existing data was preserved.",
          500,
        );
      const fixture = await readJson(
        path.join(projectRoot, "data/fixtures/catalogue.json"),
      );
      const data = stateSchema.parse({
        ...fixture,
        revision: 0,
        products: fixture.products.map((p: object, i: number) => ({
          ...p,
          featuredOrder: i,
          private: { storageLocation: "", notes: "" },
        })),
        settings: initialStore,
        home: defaultHome,
        assets: [],
      });
      await atomicWrite(this.paths.state, JSON.stringify(data, null, 2) + "\n");
    });
  }
  async read() {
    try {
      return stateSchema.parse(await readJson(this.paths.state));
    } catch (e) {
      throw new AdminError(
        "Cannot read saved catalogue; file preserved. Restore a valid backup or repair it. " +
          (e as Error).message,
        500,
      );
    }
  }
  async update(
    revision: number,
    change: (s: AdminState) => void | Promise<void>,
  ) {
    return withLock(this.paths, async () => {
      const old = await this.read();
      if (revision !== old.revision)
        throw new AdminError(
          "This catalogue changed in another tab or process. Reload saved data and reapply your edits.",
          409,
        );
      const next = structuredClone(old);
      await change(next);
      next.revision = old.revision + 1;
      const checked = stateSchema.parse(next);
      await mkdir(path.join(this.paths.runtime, "history"), {
        recursive: true,
        mode: 0o700,
      });
      await atomicWrite(
        path.join(
          this.paths.runtime,
          "history",
          `${old.revision}-${randomUUID()}.json`,
        ),
        JSON.stringify(old),
      );
      await atomicWrite(
        this.paths.state,
        JSON.stringify(checked, null, 2) + "\n",
      );
      return checked;
    });
  }
}
export function createProduct(categoryId: string, isDemo = true): AdminProduct {
  const id = randomUUID();
  return {
    id: "product-" + id,
    sku: "DVS-" + id.slice(0, 8).toUpperCase(),
    slug: "new-product-" + id.slice(0, 8),
    categoryId,
    isDemo,
    publicationStatus: "draft",
    reviewStatus: "needs_identification",
    availability: "confirm_on_enquiry",
    content: {
      en: { name: "New demo product", description: "" },
      hi: { name: "", description: "" },
      gu: { name: "", description: "" },
    },
    pricePaise: null,
    images: [],
    variants: [
      {
        id: "variant-" + randomUUID(),
        content: {
          en: { label: "1 piece" },
          hi: { label: "" },
          gu: { label: "" },
        },
        size: null,
        quantity: "1 piece",
        stock: null,
      },
    ],
    featured: false,
    featuredOrder: 9999,
    private: { storageLocation: "", notes: "" },
  };
}
export function duplicateProduct(original: AdminProduct): AdminProduct {
  const id = randomUUID();
  return {
    ...structuredClone(original),
    id: "product-" + id,
    sku: "DVS-" + id.slice(0, 8).toUpperCase(),
    slug: original.slug.slice(0, 70) + "-copy-" + id.slice(0, 8),
    publicationStatus: "draft",
    featured: false,
    featuredOrder: 9999,
    variants: original.variants.map((v) => ({
      ...structuredClone(v),
      id: "variant-" + randomUUID(),
    })),
    private: { storageLocation: "", notes: "" },
  };
}
