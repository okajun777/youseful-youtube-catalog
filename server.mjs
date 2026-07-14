import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncVideos } from "./scripts/sync.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3456;
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 5 * 60 * 1000; // 5分
const PUBLIC = path.join(__dirname, "public");
const DATA = path.join(__dirname, "data", "videos.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

let syncing = false;
let lastSyncError = null;

async function runSync(full = false) {
  if (syncing) return null;
  syncing = true;
  lastSyncError = null;
  try {
    const result = await syncVideos({ full });
    console.log(`[sync] ${result.videoCount}本 / 新規${result.newCount} @ ${result.syncedAt}`);
    return result;
  } catch (err) {
    lastSyncError = err.message;
    console.error("[sync] error:", err.message);
    return null;
  } finally {
    syncing = false;
  }
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/api/videos") {
    if (!fs.existsSync(DATA)) {
      return send(res, 503, JSON.stringify({ error: "データ未生成。同期中です。" }), "application/json");
    }
    const raw = fs.readFileSync(DATA, "utf8");
    return send(res, 200, raw, "application/json; charset=utf-8");
  }

  if (url.pathname === "/api/sync" && req.method === "POST") {
    const result = await runSync(url.searchParams.get("full") === "1");
    return send(
      res,
      result ? 200 : 500,
      JSON.stringify({
        ok: !!result,
        syncedAt: result?.syncedAt,
        videoCount: result?.videoCount,
        newCount: result?.newCount,
        error: lastSyncError,
      }),
      "application/json; charset=utf-8"
    );
  }

  if (url.pathname === "/api/status") {
    let meta = null;
    if (fs.existsSync(DATA)) {
      try {
        const d = JSON.parse(fs.readFileSync(DATA, "utf8"));
        meta = { syncedAt: d.syncedAt, videoCount: d.videoCount };
      } catch { /* ignore */ }
    }
    return send(
      res,
      200,
      JSON.stringify({ syncing, lastSyncError, intervalMs: SYNC_INTERVAL_MS, ...meta }),
      "application/json; charset=utf-8"
    );
  }

  let filePath = path.join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(PUBLIC)) {
    return send(res, 403, "Forbidden");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not Found");
  }
  const ext = path.extname(filePath);
  send(res, 200, fs.readFileSync(filePath), MIME[ext] || "application/octet-stream");
});

server.listen(PORT, async () => {
  console.log(`ユースフル動画一覧 http://localhost:${PORT}`);
  console.log(`自動同期: ${SYNC_INTERVAL_MS / 1000}秒ごと`);
  await runSync(true);
  setInterval(() => runSync(false), SYNC_INTERVAL_MS);
});
