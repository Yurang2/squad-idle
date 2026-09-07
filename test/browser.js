"use strict";

// Optional integration smoke test. Node 22+ and an existing Chrome/Edge install; no packages.
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "m1-browser-"));
  const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), "m1-screenshots-"));
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
    await command("Page.enable");
    await command("Page.navigate", { url: "http://127.0.0.1:" + server.address().port });
    await command("Runtime.enable");
    await command("Page.enable");
    await command("Log.enable");
    await command("Emulation.setDeviceMetricsOverride", { width: 375, height: 844, deviceScaleFactor: 1, mobile: true });
    const url = "http://127.0.0.1:" + server.address().port;
    await command("Page.navigate", { url });
    for (let i = 0; i < 100; i++) {
      if (await evaluate("document.readyState === 'complete' && typeof UI !== 'undefined'")) break;
      await delay(100);
    }
    await evaluate("Game.pause();Game.reset();window.captureCount=0;window.captureTime=0;Game.on('capture',()=>{captureCount++;captureTime=performance.now();});window.poseTimes=[];new MutationObserver(()=>poseTimes.push({at:performance.now(),href:document.getElementById('tamer-image').getAttribute('href')})).observe(document.getElementById('tamer-image'),{attributes:true,attributeFilter:['href']});window.freshStarted=performance.now();Game.resume()");
    for(let i=0;i<1800;i++) {
      if(await evaluate("captureCount>0"))break;
      await delay(100);
    }
    assert.ok(await evaluate("captureCount>0 && captureTime-freshStarted<180000"));
    console.log("PASS real 100ms timer: first capture in " + await evaluate("((captureTime-freshStarted)/1000).toFixed(2)") + "s");
    await evaluate("Game.pause()");
    await screenshot("375-capture");
    await delay(450);
    assert.ok(await evaluate("poseTimes.length>=2 && poseTimes[0].href.includes('tamer_capture') && poseTimes[1].href.includes('tamer_side') && poseTimes[1].at-poseTimes[0].at>=110 && poseTimes[1].at-poseTimes[0].at<250"));
    assert.ok(await evaluate("getComputedStyle(document.querySelector('.capture-card')).opacity==='1'"));
    await screenshot("375-capture-card");
    await delay(1500);
    await screenshot("375-battle");
    const layout=await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,app:document.getElementById('app').getBoundingClientRect().width,
      panel:getComputedStyle(document.querySelector('.panel')).borderTopWidth,ink:getComputedStyle(document.body).color,
      party:document.querySelectorAll('#party-layer image').length,enemy:document.querySelectorAll('#enemy-layer image').length,
      flip:[...document.querySelectorAll('#party-layer .unit-body>g')].every(n=>n.getAttribute('transform')==='scale(-1 1)'),
      small:[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().height>0 && b.getBoundingClientRect().height<44).map(b=>b.id)})`);
    assert.equal(layout.width,375);assert.equal(layout.app,375);assert.equal(layout.scroll,375);
    assert.ok(await evaluate("document.querySelector('.save-line').getBoundingClientRect().bottom<=document.querySelector('.tabs').getBoundingClientRect().top"));
    assert.equal(layout.panel,'1px');assert.equal(layout.ink,'rgb(123, 108, 109)');assert.equal(layout.party,2);assert.ok(layout.enemy);assert.ok(layout.flip);assert.deepEqual(layout.small,[]);
    assert.ok(await evaluate(`Promise.all([...Object.values(DATA.species).map(s=>s.art),...Object.values(DATA.assets)].map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=src;}))).then(r=>r.every(Boolean))`));
    console.log("PASS 375px pastel panel, art decoding, facing, tap sizes and no overflow");
    await evaluate("document.querySelector('[data-tab=monsters]').click()");
    assert.equal(await evaluate("document.querySelectorAll('#sheet .monster-card').length"),3);
    await screenshot("375-monsters");
    await evaluate("document.querySelector('[data-monster=monster-2]').click()");
    assert.ok(await evaluate("document.querySelector('.monster-detail').textContent.includes('안개여우')"));
    await evaluate("document.getElementById('toggle-party').click()");
    assert.equal(await evaluate("Game.getState().roster.find(m=>m.uid==='monster-2').party"),null);
    await evaluate("document.getElementById('back-roster').click();document.querySelector('[data-monster=monster-3]').click();document.getElementById('toggle-party').click()");
    assert.notEqual(await evaluate("Game.getState().roster.find(m=>m.uid==='monster-3').party"),null);
    await screenshot("375-detail");
    assert.ok(await evaluate("document.getElementById('sheet').scrollWidth<=375"));
    await evaluate("document.getElementById('close-sheet').click();UI.openSheet('dex')");
    assert.equal(await evaluate("document.querySelectorAll('.dex-entry').length"),18);
    assert.ok(await evaluate("document.querySelectorAll('.dex-entry .silhouette').length>0"));
    assert.ok(await evaluate("getComputedStyle(document.querySelector('.silhouette')).filter!=='none'"));
    assert.ok(await evaluate("document.querySelector('[data-species=icewolf]').textContent.includes('미발견')"));
    await delay(500); await screenshot("375-dex");
    console.log("PASS roster detail, party toggles and all 18 dex states/silhouettes");
    await evaluate("document.getElementById('close-sheet').click();UI.openSheet('settings');document.getElementById('export-save').click()");
    assert.equal(await evaluate("JSON.parse(document.getElementById('save-json').value).schemaVersion"),6);
    await evaluate("document.getElementById('save-json').value='bad';document.getElementById('import-save').click()");
    assert.ok(await evaluate("document.getElementById('import-status').textContent.includes('유효한')"));
    await evaluate("document.getElementById('close-sheet').click();Game.catchUp(3600000)");
    await delay(2400);await screenshot("375-offline");
    assert.ok(await evaluate("document.getElementById('offline-report').open && document.getElementById('report-monsters').children.length>0"));
    assert.ok(await evaluate("document.getElementById('offline-report').scrollWidth<=375"));
    await evaluate("document.getElementById('harvest-report').click();document.getElementById('harvest-report').click();document.getElementById('harvest-report').click()");
    assert.equal(await evaluate("Game.getState().pendingReport"),null);
    await evaluate("UI.setActive(false);UI.setActive(false);UI.setActive(true);Game.pause()");
    assert.ok(await evaluate("Game.validateSave(Game.save())"));
    await evaluate("Game.save()");await command("Page.reload");await delay(300);await evaluate("Game.pause()");
    assert.ok(await evaluate("Game.getState().roster.length>3 && Game.validateSave(Game.save())"));
    console.log("PASS offline report/harvest, settings, lifecycle, reload and schema-6 persistence");
    await evaluate(`(()=>{const d=JSON.parse(Game.save());d.state.tamerXP=DATA.rankXP[9];d.state.roster.forEach((m,i)=>m.party=i<5?i:null);Game.load(JSON.stringify(d));Game.selectStage(0);})()`);
    assert.equal(await evaluate("document.querySelectorAll('#party-layer .unit').length"),5);
    await screenshot("375-five-party");
    await command("Emulation.setDeviceMetricsOverride",{width:375,height:667,deviceScaleFactor:1,mobile:true});
    assert.ok(await evaluate("document.documentElement.scrollWidth<=375"));await screenshot("375-short");
    await command("Emulation.setDeviceMetricsOverride",{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    assert.equal(await evaluate("document.getElementById('app').getBoundingClientRect().width"),480);
    await require("./browser-m2.js")({evaluate,command,screenshot,delay});
    await require("./browser-m3.js")({evaluate,command,screenshot,delay});
    const errors=events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error')||(e.method==='Log.entryAdded'&&e.params.entry.level==='error'));
    assert.deepEqual(errors,[]);console.log("PASS zero console/runtime/asset errors; desktop 480px maximum");
    console.log("Screenshots: "+artifacts);
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
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith("m1-browser-")) {
      fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
