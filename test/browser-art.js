"use strict";

// Standalone art checks. Node 22+ and an existing Chrome/Edge install; no packages.
// FONT_FALLBACK=1 explicitly substitutes empty remote font CSS to verify the system fallback.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const root = path.resolve(__dirname, "..");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const browserPath = [process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean).find(file => fs.existsSync(file));
if (!browserPath) throw new Error("Set CHROME_PATH to an existing Chrome or Edge executable.");

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "p1-browser-"));
  const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "p1-screenshots-"));
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" };
      res.setHeader("Content-Type", (types[path.extname(file)] || "application/octet-stream") + "; charset=utf-8");
      res.end(data);
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const browser = spawn(browserPath, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + profile,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--in-process-gpu",
    ...(process.env.BROWSER_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
    ...(process.env.BROWSER_SINGLE_PROCESS === "1" ? ["--single-process"] : []),
    "about:blank"], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  let browserLog = "";
  browser.stderr.on("data", data => { browserLog += data.toString(); });
  let socket;
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
    assert.ok(fs.existsSync(portFile), "Browser did not start its debugging endpoint");
    const endpoint = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
    socket = new WebSocket("ws://127.0.0.1:" + endpoint[0] + endpoint[1]);
    await Promise.race([once(socket, "open"), delay(10000).then(() => { if (socket.readyState !== WebSocket.OPEN) throw new Error("Browser WebSocket did not open"); })]);
    let id = 0;
    let sessionId;
    const pending = new Map();
    const events = [];
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const task = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) task.reject(new Error(JSON.stringify(message.error)));
        else task.resolve(message.result);
      } else events.push(message);
    });
    function command(method, params = {}) {
      return new Promise((resolve, reject) => {
        const key = ++id;
        const timeout = setTimeout(() => { pending.delete(key); reject(new Error("Timed out: " + method)); }, 10000);
        pending.set(key, { resolve: data => { clearTimeout(timeout); resolve(data); }, reject: error => { clearTimeout(timeout); reject(error); } });
        socket.send(JSON.stringify({ id: key, method, params, sessionId }));
      });
    }
    async function evaluate(expression) {
      const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function screenshot(name) {
      const result = await command("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(artifacts, name + ".png"), Buffer.from(result.data, "base64"));
    }
    const browserVersion = await command("Browser.getVersion");
    console.log("Browser: " + browserVersion.product);
    const target = await command("Target.createTarget", { url: "http://127.0.0.1:" + server.address().port });
    const session = await command("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    sessionId = session.sessionId;
    if (process.env.FONT_FALLBACK === "1") {
      await command("Fetch.enable", {patterns:[{urlPattern:"https://fonts.googleapis.com/*"},{urlPattern:"https://fonts.gstatic.com/*"}]});
      socket.addEventListener("message", async event => {
        const message=JSON.parse(event.data);
        if(message.method==="Fetch.requestPaused") await command("Fetch.fulfillRequest", {
          requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:"Content-Type",value:"text/css"}],body:""
        });
      });
      console.log("Simulated unavailable web fonts: empty stylesheet, system font fallback");
    }
    await command("Page.enable");
    await command("Page.navigate", { url: "http://127.0.0.1:" + server.address().port });
    await command("Runtime.enable");
    await command("Page.enable");
    await command("Log.enable");
    await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    const url = "http://127.0.0.1:" + server.address().port;
    await command("Page.navigate", { url });
    for (let i = 0; i < 100; i++) {
      if (await evaluate("document.readyState === 'complete' && typeof UI !== 'undefined'")) break;
      await delay(100);
    }
    await require("./polish-checks")({evaluate, command, screenshot, delay});
    await require("./art-checks")({evaluate, command, screenshot, delay});
    const errors = events.filter(e => e.method === "Runtime.exceptionThrown" ||
      (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") ||
      (e.method === "Log.entryAdded" && e.params.entry.level === "error"));
    assert.deepEqual(errors, []);
    console.log("PASS zero browser console/runtime/network errors");
    console.log("Screenshots: " + artifacts);
  } catch (error) {
    console.log("Screenshots: " + artifacts);
    console.error(browserLog.slice(-2500));
    throw error;
  } finally {
    if (socket) socket.close();
    browser.kill();
    server.close();
    await delay(500);
    const resolved = path.resolve(profile);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith("p1-browser-")) {
      fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
