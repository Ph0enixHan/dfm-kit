/**
 * cdp-browser.mjs (v0.3 — Fast Cached Headless Chromium/Edge CDP Driver + Local Static Server)
 * Uses Node's built-in WebSocket, http, and child_process. No Playwright/Puppeteer required.
 * Improvements in v0.3:
 *   - Persistent HTTP disk cache (.cache/chrome-http-cache) so Google Fonts load once and stay instant
 *   - Fast downscaled JPEG/PNG screenshot support via CDP clip.scale
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".vtt": "text/vtt; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".gif": "image/gif",
  ".ico": "image/x-icon"
};

export function findBrowserExecutable() {
  if (process.env.DFM_BROWSER && fs.existsSync(process.env.DFM_BROWSER)) {
    return process.env.DFM_BROWSER;
  }
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe")
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium"
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/usr/bin/microsoft-edge"
          ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    "Chrome or Edge executable not found. Install Chrome/Edge or set the DFM_BROWSER environment variable."
  );
}

/**
 * Starts a local HTTP server that serves files from rootDir.
 */
export function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const absRoot = path.resolve(rootDir);
    const server = http.createServer((req, res) => {
      try {
        const urlObj = new URL(req.url || "/", "http://127.0.0.1");
        const cleanPath = decodeURIComponent(urlObj.pathname).replace(/^\/+/, "");
        const fullPath = path.resolve(absRoot, cleanPath);
        if (!fullPath.startsWith(absRoot)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        let targetPath = fullPath;
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
          const idx = path.join(targetPath, "index.html");
          if (fs.existsSync(idx)) targetPath = idx;
        }
        if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        const ext = path.extname(targetPath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Cache-Control": "no-store"
        });
        fs.createReadStream(targetPath).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r()))
      });
    });
  });
}

/**
 * Launches headless Chromium/Edge with persistent HTTP disk cache (for instant Google Fonts)
 * and exposes a clean CDP page session.
 */
export async function launchHeadlessBrowser() {
  const executable = findBrowserExecutable();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dfm-chrome-"));
  const diskCacheDir = path.join(REPO_ROOT, ".cache", "chrome-http-cache");
  try {
    fs.mkdirSync(diskCacheDir, { recursive: true });
  } catch {
    // fallback silently if cache dir is read-only
  }

  const args = [
    "--headless=new",
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-crash-reporter",
    "--disable-breakpad",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-extensions",
    "--mute-audio",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--allow-file-access-from-files",
    `--user-data-dir=${userDataDir}`
  ];
  if (process.env.DFM_NO_CACHE !== "1" && fs.existsSync(diskCacheDir)) {
    args.push(`--disk-cache-dir=${diskCacheDir}`);
  }
  args.push("about:blank");

  const proc = spawn(executable, args, { stdio: ["ignore", "pipe", "pipe"] });

  const wsUrl = await new Promise((resolve, reject) => {
    let stderrBuf = "";
    const timer = setTimeout(() => {
      reject(new Error(`Headless browser launch timed out. stderr:\n${stderrBuf}`));
    }, 15000);

    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderrBuf += text;
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });

    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Browser exited early (code=${code}). stderr:\n${stderrBuf}`));
    });
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", (e) => reject(new Error(`CDP WebSocket connection failed: ${e.message || e}`)), {
      once: true
    });
  });

  let nextId = 1;
  const pending = new Map();
  const eventListeners = new Map();

  ws.addEventListener("message", (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(new Error(`CDP Error (${msg.error.code}): ${msg.error.message}`));
      } else {
        resolve(msg.result);
      }
    } else if (msg.method) {
      const list = eventListeners.get(msg.method);
      if (list) {
        for (const fn of [...list]) fn(msg.params, msg.sessionId);
      }
    }
  });

  function send(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
      ws.send(JSON.stringify(payload));
    });
  }

  function onceEvent(method, sessionId, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for CDP event ${method}`));
      }, timeoutMs);

      function handler(params, sid) {
        if (!sessionId || sid === sessionId) {
          cleanup();
          resolve(params);
        }
      }

      function cleanup() {
        clearTimeout(timer);
        const list = eventListeners.get(method);
        if (list) list.delete(handler);
      }

      if (!eventListeners.has(method)) eventListeners.set(method, new Set());
      eventListeners.get(method).add(handler);
    });
  }

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);

  async function setViewport(width, height) {
    await send(
      "Emulation.setDeviceMetricsOverride",
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false
      },
      sessionId
    );
  }

  async function navigate(url) {
    const loadPromise = onceEvent("Page.loadEventFired", sessionId, 20000);
    await send("Page.navigate", { url }, sessionId);
    await loadPromise;
  }

  async function setHtml(html) {
    const loadPromise = onceEvent("Page.loadEventFired", sessionId, 20000);
    const { frameTree } = await send("Page.getFrameTree", {}, sessionId);
    await send("Page.setDocumentContent", { frameId: frameTree.frame.id, html }, sessionId);
    await loadPromise;
  }

  async function evalJS(expression) {
    const res = await send(
      "Runtime.evaluate",
      {
        expression,
        awaitPromise: true,
        returnByValue: true
      },
      sessionId
    );
    if (res.exceptionDetails) {
      throw new Error(
        `Page script error: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description || ""}`
      );
    }
    return res.result?.value;
  }

  async function screenshotPng({ width, height, scale = 1 } = {}) {
    const params = { format: "png", captureBeyondViewport: false };
    if (width && height) {
      params.clip = { x: 0, y: 0, width, height, scale };
    }
    const { data } = await send("Page.captureScreenshot", params, sessionId);
    return Buffer.from(data, "base64");
  }

  async function screenshotJpeg({ width, height, scale = 1, quality = 85 } = {}) {
    const params = { format: "jpeg", quality, captureBeyondViewport: false };
    if (width && height) {
      params.clip = { x: 0, y: 0, width, height, scale };
    }
    const { data } = await send("Page.captureScreenshot", params, sessionId);
    return Buffer.from(data, "base64");
  }

  async function close() {
    try {
      await send("Browser.close");
    } catch {
      // ignore
    }
    try {
      ws.close();
    } catch {
      // ignore
    }
    try {
      proc.kill();
    } catch {
      // ignore
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  return { setViewport, navigate, setHtml, evalJS, screenshotPng, screenshotJpeg, close };
}
