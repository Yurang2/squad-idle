"use strict";
const fs = require("node:fs");
const path = require("node:path");
const png = require("./png");
const root = path.resolve(__dirname, "..");
const preview = process.argv.includes("--preview");
const main = path.join(root, "android/app/src/main");
const res = preview ? path.join(root, ".android-preview/res") : path.join(main, "res");
const manifest = path.join(main, "AndroidManifest.xml");
if (!preview && !fs.existsSync(manifest)) throw new Error("Run npm install, npm run build:www and npx cap add android first.");
const source = png.read(path.join(root, "assets/camp/campfire.png"));
// DECISION: The existing campfire is the app logo; no new art or fonts required.
function render(size, logoSize, rounded) {
  const data = Buffer.alloc(size * size * 4), left = (size - logoSize) / 2, radius = size * 0.22;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const dx = Math.max(radius - x - 0.5, x + 0.5 - (size - radius), 0);
    const dy = Math.max(radius - y - 0.5, y + 0.5 - (size - radius), 0);
    const background = rounded && dx * dx + dy * dy <= radius * radius;
    if (background) { data[i] = 254; data[i + 1] = 244; data[i + 2] = 231; data[i + 3] = 255; }
    if (x < left || y < left || x >= left + logoSize || y >= left + logoSize) continue;
    // Area averaging preserves the transparent edge at launcher-icon sizes.
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const px = Math.min(source.width - 1, Math.floor((x - left + (sx + 0.5) / 4) / logoSize * source.width));
      const py = Math.min(source.height - 1, Math.floor((y - left + (sy + 0.5) / 4) / logoSize * source.height));
      const j = (py * source.width + px) * 4, alpha = source.data[j + 3] / 255;
      r += source.data[j] * alpha; g += source.data[j + 1] * alpha; b += source.data[j + 2] * alpha; a += alpha;
    }
    if (!a) continue;
    const alpha = a / 16;
    data[i] = background ? r / 16 + 254 * (1 - alpha) : r / a;
    data[i + 1] = background ? g / 16 + 244 * (1 - alpha) : g / a;
    data[i + 2] = background ? b / 16 + 231 * (1 - alpha) : b / a;
    data[i + 3] = background ? 255 : alpha * 255;
  }
  return data;
}
function write(name, text) {
  const file = path.join(res, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text);
}
function bitmap(name, size, logoSize, rounded) {
  const file = path.join(res, name); fs.mkdirSync(path.dirname(file), { recursive: true });
  png.write(file, size, size, render(size, logoSize, rounded));
}
for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
  for (const name of ["ic_launcher", "ic_launcher_round"]) bitmap(`mipmap-${density}/${name}.png`, 48 * scale, 36 * scale, true);
  bitmap(`mipmap-${density}/ic_launcher_foreground.png`, 108 * scale, 60 * scale, false);
  bitmap(`drawable-${density}/splash_logo.png`, 288 * scale, 144 * scale, false);
}
write("values/native_colors.xml", '<resources><color name="native_sky">#FEF4E7</color></resources>\n');
const adaptive = '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/native_sky"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n';
write("mipmap-anydpi-v26/ic_launcher.xml", adaptive); write("mipmap-anydpi-v26/ic_launcher_round.xml", adaptive);
write("drawable/splash.xml", '<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/native_sky"/><item><bitmap android:src="@drawable/splash_logo" android:gravity="center"/></item></layer-list>\n');
if (!preview) {
  // Remove only generated template splash PNGs, otherwise density qualifiers override our XML.
  for (const dir of fs.readdirSync(res).filter(name => name.startsWith("drawable"))) {
    const file = path.resolve(res, dir, "splash.png");
    if (!file.startsWith(res + path.sep)) throw new Error("Unsafe resource path");
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  let xml = fs.readFileSync(manifest, "utf8");
  xml = xml.replace(/<activity\b[^>]*>/g, tag => {
    if (!/android:name="(?:\.MainActivity|com\.dklee\.squadidle\.MainActivity)"/.test(tag)) return tag;
    return tag.replace(/\s+android:screenOrientation="[^"]*"/, "").replace(/>$/, ' android:screenOrientation="portrait">');
  });
  if (!xml.includes('android:screenOrientation="portrait"')) throw new Error("MainActivity not found");
  fs.writeFileSync(manifest, xml);
  const styles = path.join(res, "values/styles.xml");
  const theme = '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n' +
    '        <item name="windowSplashScreenBackground">@color/native_sky</item>\n' +
    '        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_logo</item>\n' +
    '        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>\n' +
    '        <item name="android:windowBackground">@drawable/splash</item>\n    </style>';
  const before = fs.readFileSync(styles, "utf8");
  const after = before.replace(/<style\s+name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/, theme);
  if (!after.includes('name="windowSplashScreenAnimatedIcon"')) throw new Error("Launch theme not found");
  fs.writeFileSync(styles, after);
}
console.log("Android icon/splash resources ready: " + res + (preview ? " (preview only)" : "; portrait manifest configured"));
