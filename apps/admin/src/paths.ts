import path from "node:path";
import { fileURLToPath } from "node:url";
export const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
export function dataPaths(
  directory = process.env.DVS_DATA_DIR || "data/local",
) {
  const base = path.resolve(projectRoot, directory);
  const relative = path.relative(projectRoot, base);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(
      "DVS_DATA_DIR must be a dedicated directory inside this project",
    );
  return {
    base,
    runtime: path.join(base, "runtime"),
    state: path.join(base, "runtime/state.json"),
    uploads: path.join(base, "runtime/uploads"),
    auth: path.join(base, "auth"),
    exports: path.join(base, "exports"),
    backups: path.join(base, "backups"),
    lock: path.join(base, ".write-lock"),
  };
}
export type Paths = ReturnType<typeof dataPaths>;
