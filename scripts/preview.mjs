import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../apps/storefront/out/", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};
try {
  await stat(path.join(root, "en/index.html"));
} catch {
  console.error("Build the static demo first: npm run build:demo");
  process.exit(1);
}
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root) || pathname.includes("\0")) {
      res.writeHead(400);
      res.end("Invalid path");
      return;
    }
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    try {
      res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      });
      const locale = new URL(req.url, "http://localhost").pathname.match(
        /^\/(en|hi|gu)(?:\/|$)/,
      )?.[1];
      const page = await readFile(
        path.join(root, locale ? `${locale}/not-found/index.html` : "404.html"),
      );
      res.end(req.method === "HEAD" ? undefined : page);
    } catch {
      res.writeHead(500);
      res.end("Build output unavailable");
    }
  }
});
server.listen(Number(process.env.PORT ?? 4173), "127.0.0.1", () =>
  console.log(
    "Static demo: http://127.0.0.1:" +
      server.address().port +
      "/en/ (Ctrl+C to stop)",
  ),
);
