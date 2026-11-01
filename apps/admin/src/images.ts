import sharp from "sharp";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { AdminError, type AdminState } from "./model";
import { projectRoot, type Paths } from "./paths";
import { regularFile } from "./storage";
export const imageLimits = {
  bytes: 8 * 1024 * 1024,
  pixels: 24000000,
  dimension: 6000,
  output: 1600,
};
export async function processImage(input: Buffer) {
  if (!input.length || input.length > imageLimits.bytes)
    throw new AdminError("Upload must be at most 8 MiB");
  try {
    const options = {
      limitInputPixels: imageLimits.pixels,
      failOn: "warning" as const,
      animated: false,
    };
    const meta = await sharp(input, options).metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
      !meta.width ||
      !meta.height ||
      meta.width > 6000 ||
      meta.height > 6000 ||
      (meta.pages ?? 1) !== 1
    )
      throw new Error("Unsupported format or dimensions");
    const publicBytes = await sharp(input, options)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    return {
      publicBytes,
      extension: meta.format as "jpeg" | "png" | "webp",
      width: meta.width,
      height: meta.height,
    };
  } catch {
    throw new AdminError(
      "Use a valid, single-frame JPEG, PNG or WebP, at most 6000px per side and 24 megapixels. SVG and executable uploads are not accepted.",
    );
  }
}
export async function saveUpload(
  paths: Paths,
  state: AdminState,
  input: Buffer,
) {
  const processed = await processImage(input);
  const id = randomUUID();
  const directory = path.join(paths.uploads, id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(
    path.join(directory, "original." + processed.extension),
    input,
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(path.join(directory, "public.webp"), processed.publicBytes, {
    flag: "wx",
    mode: 0o600,
  });
  state.assets.push({
    id,
    originalExtension: processed.extension,
    width: processed.width,
    height: processed.height,
    bytes: input.length,
  });
  return "/catalogue-images/" + id + ".webp";
}
export async function imageBytes(paths: Paths, state: AdminState, src: string) {
  if (/^\/images\/[a-z0-9-]+\.svg$/.test(src)) {
    // Only exact paths in the immutable demo fixture are trusted SVGs.
    const fixture = JSON.parse(
      (
        await regularFile(
          path.join(projectRoot, "data/fixtures/catalogue.json"),
        )
      ).toString(),
    );
    const trusted = new Set([
      ...fixture.categories.map((c: { image: string }) => c.image),
      ...fixture.products.flatMap((p: { images: { src: string }[] }) =>
        p.images.map((i) => i.src),
      ),
    ]);
    if (!trusted.has(src)) throw new AdminError("Unknown bundled illustration");
    return regularFile(path.join(projectRoot, "apps/storefront/public", src));
  }
  const id = src.match(/^\/catalogue-images\/([a-f0-9-]{36})\.webp$/)?.[1];
  if (!id || !state.assets.some((a) => a.id === id))
    throw new AdminError("Unknown image reference");
  return regularFile(path.join(paths.uploads, id, "public.webp"));
}
