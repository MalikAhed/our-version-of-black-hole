import { createReadStream, existsSync, statSync, watch } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const host = process.env.BLACK_HOLE_HOST || "127.0.0.1";
const port = Number(process.env.BLACK_HOLE_PORT || 4180);
const root = resolve(import.meta.dirname);
const simulationPath = "/examples/webgl_postprocessing_unreal_bloom.html";
const liveReloadClients = new Set();
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);

  if (pathname === "/__live_reload") {
    response.writeHead(200, {
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    });
    response.write("retry: 1000\n\n");
    liveReloadClients.add(response);
    request.on("close", () => liveReloadClients.delete(response));
    return;
  }

  if (pathname === "/") {
    response.writeHead(302, { Location: simulationPath });
    response.end();
    return;
  }

  const filePath = resolve(root, `.${pathname}`);
  if (
    !filePath.startsWith(`${root}${sep}`) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`Our version of black hole: http://${host}:${port}${simulationPath}`);
});

let reloadTimer;
watch(root, { recursive: true }, (_eventType, filename) => {
  if (!filename || filename.startsWith(".git/") || filename.includes("node_modules/")) return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const client of liveReloadClients) {
      client.write("event: change\ndata: reload\n\n");
    }
  }, 100);
});
