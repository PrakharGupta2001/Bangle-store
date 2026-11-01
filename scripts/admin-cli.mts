import { readFile } from "node:fs/promises";
import path from "node:path";
import { dataPaths, projectRoot } from "../apps/admin/src/paths";
import { JsonRepository } from "../apps/admin/src/repository";
import { exportCatalogue, prepareStorefront } from "../apps/admin/src/export";
import { backupCatalogue, restoreCatalogue } from "../apps/admin/src/backup";
const paths = dataPaths();
const repo = new JsonRepository(paths);
try {
  const command = process.argv[2];
  if (command === "prepare") {
    await prepareStorefront(paths);
  } else if (command === "access") {
    console.log(
      (await readFile(path.join(paths.auth, "access-code.txt"), "utf8")).trim(),
    );
  } else if (command === "restore") {
    const file = process.argv[3];
    if (!file)
      throw new Error("Usage: npm run catalogue:restore -- <backup.zip>");
    const absolute = path.resolve(projectRoot, file),
      relative = path.relative(projectRoot, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("Copy the backup inside this project before restoring");
    console.log(await restoreCatalogue(repo, absolute));
    console.log(
      "Restore complete. Run catalogue:export and build:demo explicitly to update the public preview.",
    );
  } else {
    await repo.initialize();
    if (command === "export") console.log(await exportCatalogue(repo));
    else if (command === "backup") console.log(await backupCatalogue(repo));
    else throw new Error("Unknown command");
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
