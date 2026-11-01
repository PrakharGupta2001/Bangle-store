import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  open,
  rm,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { type Paths } from "./paths";
import { AdminError } from "./model";
export async function exists(file: string) {
  try {
    await lstat(file);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}
export async function atomicWrite(file: string, data: string | Uint8Array) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + ".tmp-" + randomUUID();
  try {
    const f = await open(temp, "wx", 0o600);
    try {
      await f.writeFile(data);
      await f.sync();
    } finally {
      await f.close();
    }
    await rename(temp, file);
  } finally {
    await unlink(temp).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
const queues = new Map<string, Promise<unknown>>();
export async function withLock<T>(
  paths: Paths,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = queues.get(paths.base) ?? Promise.resolve();
  const run = previous
    .catch(() => {})
    .then(async () => {
      await mkdir(paths.base, { recursive: true, mode: 0o700 });
      try {
        await mkdir(paths.lock, { mode: 0o700 });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "EEXIST")
          throw new AdminError(
            "Another admin/export/backup operation holds the local write lock. Retry shortly. If a process crashed, stop all admin commands before removing the stale .write-lock directory.",
            409,
          );
        throw e;
      }
      try {
        return await fn();
      } finally {
        await rm(paths.lock, { recursive: true });
      }
    });
  queues.set(paths.base, run);
  try {
    return await run;
  } finally {
    if (queues.get(paths.base) === run) queues.delete(paths.base);
  }
}
export async function readJson(file: string) {
  return JSON.parse(await readFile(file, "utf8"));
}
export async function regularFile(file: string) {
  const s = await lstat(file);
  if (!s.isFile() || s.isSymbolicLink())
    throw new AdminError("Expected a regular local file");
  return readFile(file);
}
