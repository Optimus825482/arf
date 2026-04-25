import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import type { RagInventoryDocument, RagSourceType } from "./types";

const SOURCE_TYPES = new Map<string, RagSourceType>([
  [".txt", "txt"],
  [".md", "md"],
  [".htm", "html"],
  [".html", "html"],
  [".pdf", "pdf"],
  [".docx", "docx"],
]);

export async function inventoryDocuments(rootDir: string): Promise<RagInventoryDocument[]> {
  const root = resolve(rootDir);
  const docs: RagInventoryDocument[] = [];

  async function visit(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const sourceType = SOURCE_TYPES.get(extname(entry.name).toLowerCase());
      if (!sourceType) continue;

      const info = await stat(fullPath);
      docs.push({
        sourcePath: fullPath,
        sourceType,
        title: basename(entry.name, extname(entry.name)),
        bytes: info.size,
        modifiedAt: info.mtime.toISOString(),
      });
    }
  }

  await visit(root);
  return docs.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
}

async function main() {
  const rootDir = process.argv[2] ?? "docs";
  const docs = await inventoryDocuments(rootDir);
  console.log(JSON.stringify({ rootDir: resolve(rootDir), documents: docs }, null, 2));
}

if (process.argv[1]?.endsWith("inventory.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
