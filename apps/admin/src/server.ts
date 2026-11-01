import express from "express";
import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dataPaths, projectRoot, type Paths } from "./paths";
import { JsonRepository, createProduct, duplicateProduct } from "./repository";
import {
  AdminError,
  adminProductSchema,
  settingsSchema,
  homeSchema,
  stateSchema,
} from "./model";
import { atomicWrite, exists } from "./storage";
import { saveUpload, imageBytes, imageLimits } from "./images";
import { exportCatalogue } from "./export";
import { backupCatalogue } from "./backup";
const digest = (value: string) => createHash("sha256").update(value).digest();
export async function startAdmin(
  options: { paths?: Paths; port?: number; buildUi?: boolean } = {},
) {
  const paths = options.paths ?? dataPaths(),
    port = options.port ?? Number(process.env.ADMIN_PORT ?? 4310);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Invalid ADMIN_PORT");
  const repo = new JsonRepository(paths);
  await repo.initialize();
  await mkdir(paths.auth, { recursive: true, mode: 0o700 });
  const accessFile = path.join(paths.auth, "access-code.txt");
  if (!(await exists(accessFile))) {
    try {
      await writeFile(
        accessFile,
        randomBytes(24).toString("base64url") + "\n",
        { flag: "wx", mode: 0o600 },
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  const code = (await readFile(accessFile, "utf8")).trim();
  if (code.length < 24)
    throw new Error(
      "Access-code file is invalid; preserve it and follow access reset instructions.",
    );
  const uiDir = path.join(projectRoot, "apps/admin/.build");
  if (options.buildUi !== false) {
    await mkdir(uiDir, { recursive: true });
    await build({
      entryPoints: [path.join(projectRoot, "apps/admin/ui/main.tsx")],
      bundle: true,
      outfile: path.join(uiDir, "app.js"),
      platform: "browser",
      format: "esm",
      minify: true,
      define: { "process.env.NODE_ENV": '"production"' },
      jsx: "automatic",
    });
  }
  const sessions = new Map<string, { csrf: string; expires: number }>();
  let failures: number[] = [];
  let origin = "";
  let cookieName = "";
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    });
    if (req.headers.host !== new URL(origin).host)
      return res
        .status(403)
        .json({ error: "Unexpected Host. Use the printed 127.0.0.1 address." });
    if (req.headers.origin && req.headers.origin !== origin)
      return res.status(403).json({ error: "Cross-site request rejected" });
    if (req.headers["sec-fetch-site"] === "cross-site")
      return res.status(403).json({ error: "Cross-site request rejected" });
    if (
      !["GET", "HEAD"].includes(req.method) &&
      (req.headers.origin !== origin || req.headers["x-daya-request"] !== "1")
    )
      return res
        .status(403)
        .json({ error: "Expected same-origin admin request" });
    next();
  });
  app.use(express.json({ limit: "2mb", type: "application/json" }));
  const session = (req: express.Request) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    const result = token ? sessions.get(token) : undefined;
    if (result && result.expires > Date.now()) return result;
    if (token) sessions.delete(token);
    return undefined;
  };
  app.post("/api/login", (req, res) => {
    failures = failures.filter((t) => t > Date.now() - 60000);
    if (failures.length >= 8)
      return res
        .status(429)
        .json({ error: "Too many attempts. Wait one minute." });
    if (
      typeof req.body?.code !== "string" ||
      !timingSafeEqual(digest(req.body.code), digest(code))
    ) {
      failures.push(Date.now());
      return res.status(401).json({ error: "Access code is incorrect" });
    }
    const token = randomBytes(32).toString("hex"),
      csrf = randomBytes(32).toString("hex");
    sessions.set(token, { csrf, expires: Date.now() + 8 * 3600000 });
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
    );
    res.json({ csrf });
  });
  app.use("/api", (req, res, next) => {
    const found = session(req);
    if (!found)
      return res
        .status(401)
        .json({ error: "Sign in with this installation’s local access code" });
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.headers["x-csrf-token"] !== found.csrf
    )
      return res
        .status(403)
        .json({
          error: "Invalid session protection token. Reload and sign in again.",
        });
    next();
  });
  app.get("/api/session", (req, res) => res.json({ csrf: session(req)!.csrf }));
  app.post("/api/logout", (req, res) => {
    const found = session(req);
    for (const [key, value] of sessions)
      if (value === found) sessions.delete(key);
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
    );
    res.json({ ok: true });
  });
  app.get("/api/catalogue", async (req, res) => res.json(await repo.read()));
  app.post("/api/products", async (req, res) => {
    const state = await repo.update(req.body.revision, (s) => {
      const item = createProduct(
        req.body.categoryId ?? s.categories[0].id,
        req.body.isDemo !== false,
      );
      s.products.push(item);
    });
    res.json({ state, id: state.products.at(-1)!.id });
  });
  app.put("/api/products/:id", async (req, res) => {
    const item = adminProductSchema.parse(req.body.product);
    const state = await repo.update(req.body.revision, async (s) => {
      const index = s.products.findIndex((p) => p.id === req.params.id);
      if (index < 0) throw new AdminError("Product not found", 404);
      const old = s.products[index];
      if (item.id !== old.id || item.sku !== old.sku)
        throw new AdminError(
          "Existing product ID and reference/SKU are immutable",
        );
      if (old.isDemo && !item.isDemo)
        throw new AdminError(
          "Demo identity cannot be removed from an existing sample. Add a separate genuine draft later.",
        );
      for (const image of item.images) await imageBytes(paths, s, image.src);
      s.products[index] = item;
    });
    res.json({ state });
  });
  app.post("/api/products/:id/duplicate", async (req, res) => {
    const state = await repo.update(req.body.revision, (s) => {
      const original = s.products.find((p) => p.id === req.params.id);
      if (!original) throw new AdminError("Product not found", 404);
      s.products.push(duplicateProduct(original));
    });
    res.json({ state, id: state.products.at(-1)!.id });
  });
  app.post("/api/products/:id/status", async (req, res) => {
    if (!["archived", "draft"].includes(req.body.status))
      throw new AdminError("Use archive or restore to draft");
    const state = await repo.update(req.body.revision, (s) => {
      const p = s.products.find((p) => p.id === req.params.id);
      if (!p) throw new AdminError("Product not found", 404);
      p.publicationStatus = req.body.status;
    });
    res.json({ state });
  });
  app.put("/api/categories", async (req, res) => {
    const state = await repo.update(req.body.revision, async (s) => {
      const incoming = stateSchema.shape.categories.parse(req.body.categories);
      if (s.categories.some((c) => !incoming.some((n) => n.id === c.id)))
        throw new AdminError(
          "Category removal or identity changes are not available; edit names or add a category.",
        );
      for (const c of incoming) await imageBytes(paths, s, c.image);
      s.categories = incoming;
    });
    res.json({ state });
  });
  app.put("/api/settings", async (req, res) => {
    const state = await repo.update(req.body.revision, (s) => {
      s.settings = settingsSchema.parse(req.body.settings);
      s.home = homeSchema.parse(req.body.home);
    });
    res.json({ state });
  });
  app.post(
    "/api/images",
    express.raw({
      type: ["image/jpeg", "image/png", "image/webp"],
      limit: imageLimits.bytes,
    }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body))
        throw new AdminError("Expected raw JPEG, PNG or WebP bytes");
      const revision = Number(req.headers["x-catalogue-revision"]);
      let src = "";
      const state = await repo.update(revision, async (s) => {
        src = await saveUpload(paths, s, req.body);
      });
      res.json({ state, src });
    },
  );
  app.get("/api/image", async (req, res) => {
    if (typeof req.query.src !== "string")
      throw new AdminError("Expected an image reference");
    const bytes = await imageBytes(paths, await repo.read(), req.query.src);
    res
      .type(req.query.src.endsWith(".svg") ? "image/svg+xml" : "image/webp")
      .send(bytes);
  });
  app.post("/api/export", async (req, res) =>
    res.json(await exportCatalogue(repo, req.body.revision)),
  );
  app.post("/api/backup", async (req, res) => {
    const file = await backupCatalogue(repo);
    res.json({ file: path.relative(projectRoot, file) });
  });
  app.get("/", (req, res) =>
    res
      .type("html")
      .send(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Daya · Local catalogue admin</title><link rel="stylesheet" href="/admin.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
      ),
  );
  app.get("/app.js", (req, res) =>
    res.sendFile(path.join(uiDir, "app.js"), { dotfiles: "allow" }),
  );
  app.get("/admin.css", (req, res) =>
    res.sendFile(path.join(projectRoot, "apps/admin/ui/admin.css")),
  );
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const e = err as {
        status?: number;
        message?: string;
        issues?: { path: unknown[]; message: string }[];
      };
      const message =
        e.issues?.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") ??
        e.message ??
        "Local operation failed";
      res.status(e.status ?? 400).json({ error: message });
    },
  );
  const server = await new Promise<import("node:http").Server>(
    (resolve, reject) => {
      const s = app.listen(port, "127.0.0.1", () => resolve(s));
      s.once("error", reject);
    },
  );
  const address = server.address() as import("node:net").AddressInfo;
  origin = `http://127.0.0.1:${address.port}`;
  cookieName = "daya_admin_" + address.port;
  return {
    server,
    origin,
    repo,
    accessFile,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startAdmin()
    .then(({ origin, accessFile }) => {
      console.log(
        `Daya local admin: ${origin}\nAccess code is stored privately at ${path.relative(projectRoot, accessFile)}\nRun npm run admin:access in a second terminal to read it. Never share it.\nSaved ≠ exported ≠ rebuilt. Nothing is deployed.`,
      );
    })
    .catch((e) => {
      console.error((e as Error).message);
      process.exitCode = 1;
    });
}
