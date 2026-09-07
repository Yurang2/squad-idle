"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "www");
// DECISION: www is disposable; never copy dev tooling or rewrite the web entrypoint.
if (fs.existsSync(out) && fs.lstatSync(out).isSymbolicLink()) throw new Error("www must not be a symlink");
if (path.dirname(out) !== root || path.basename(out) !== "www") throw new Error("Unsafe output path");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const name of ["index.html", "style.css", "manifest.webmanifest", "sw.js", "sw-shell.js", "js", "assets"]) {
  fs.cpSync(path.join(root, name), path.join(out, name), {
    recursive: true,
    filter(source) {
      if (fs.lstatSync(source).isSymbolicLink()) throw new Error("Symlink in web inputs: " + source);
      return !["contact_sheet.html", "prompts.json", "generation_log.jsonl"].includes(path.basename(source)) && !source.endsWith(".py");
    }
  });
}
// DECISION: Package only the three character concepts used by M1, not the concept review/source files.
const characters = ["tamer_side.png", "tamer_capture.png", "fox_companion.png"];
fs.mkdirSync(path.join(out, "concepts/character"), { recursive: true });
for (const name of characters) {
  const source = path.join(root, "concepts/character", name);
  if (fs.lstatSync(source).isSymbolicLink()) throw new Error("Symlink in character assets");
  fs.copyFileSync(source, path.join(out, "concepts/character", name));
}
const stages = JSON.parse(fs.readFileSync(path.join(out, "assets/monsters/manifest.json"), "utf8"));
const bosses = JSON.parse(fs.readFileSync(path.join(out, "assets/bosses/manifest.json"), "utf8"));
const manifest = Object.assign({}, bosses);
for (const [id, arts] of Object.entries(stages)) {
  for (const [stage, value] of Object.entries(arts)) manifest[id + ':' + stage] = value;
}
for (const [key, value] of Object.entries(manifest)) {
  if (typeof value !== "string") throw new Error("Invalid manifest path: " + key);
  const file = path.resolve(out, value);
  if (!file.startsWith(out + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error("Missing packaged asset: " + key + " -> " + value);
  }
}
console.log("www ready; " + Object.keys(manifest).length + " manifest assets verified.");
