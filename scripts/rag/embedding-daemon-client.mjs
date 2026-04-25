import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export function startEmbeddingDaemon({ command, args, env, cwd } = {}) {
  const cmd = command || process.env.RAG_EMBEDDING_DAEMON_CMD || "node";
  const cmdArgs = args || (process.env.RAG_EMBEDDING_DAEMON_ARGS
    ? process.env.RAG_EMBEDDING_DAEMON_ARGS.split(/\s+/)
    : ["scripts/rag/llama-embedding-daemon.mjs"]);

  const child = spawn(cmd, cmdArgs, {
    env: env ?? process.env,
    cwd: cwd ?? process.cwd(),
    stdio: ["pipe", "pipe", "inherit"],
  });

  const pending = new Map();
  let nextId = 0;
  let ready = false;
  let readyResolve;
  let readyReject;
  const readyPromise = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });

  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on("line", (line) => {
    if (!line) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (!ready && msg.ready) { ready = true; readyResolve(msg); return; }
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.error) entry.reject(new Error(msg.error));
    else entry.resolve(msg.embedding);
  });

  child.on("error", (err) => { if (!ready) readyReject(err); });
  child.on("exit", (code) => {
    for (const [, entry] of pending) entry.reject(new Error(`daemon exited code=${code}`));
    pending.clear();
  });

  async function embed(text) {
    if (!ready) await readyPromise;
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(JSON.stringify({ id, text }) + "\n");
    });
  }

  async function close() {
    child.stdin.end();
    await new Promise((res) => child.once("exit", res));
  }

  return { embed, close, ready: readyPromise };
}
