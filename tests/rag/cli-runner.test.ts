import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("rag cli runner", () => {
  it("builds and runs the inventory command without ts-node", async () => {
    const root = await mkdtemp(join(tmpdir(), "arf-rag-cli-"));
    await writeFile(join(root, "guide.txt"), "Toplama icin kisa rehber.");

    const result = spawnSync(process.execPath, ["scripts/rag/cli.mjs", "inventory", root], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 30_000,
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      command: "inventory",
      documents: 1,
      byType: { txt: 1 },
    });
  }, 30_000);

  it("keeps positional roots when boolean flags are present", async () => {
    const root = await mkdtemp(join(tmpdir(), "arf-rag-cli-"));
    await writeFile(join(root, "guide.md"), "# Toplama\n\nToplama icin kisa rehber.");

    const result = spawnSync(
      process.execPath,
      [
        "scripts/rag/cli.mjs",
        "ingest",
        "--dry-run",
        root,
        "--chunk-tokens",
        "8",
        "--batch-size",
        "1",
        "--max-retries",
        "2",
        "--progress",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 30_000,
      },
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      command: "ingest",
      totals: {
        documents: 1,
        extracted: 1,
        skipped: 0,
      },
    });
  }, 30_000);
});
