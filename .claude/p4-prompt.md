You are doing phase **P4**: package this finished HTML5 game as an Android app with Capacitor, without changing how the web build works. Read `AGENTS.md`, `GAME_DESIGN.md` section 12, and `CHANGELOG.md` first.

## Scope
1. Create `package.json` at the project root with ONLY Capacitor dev tooling (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/haptics`, `@capacitor/app`, `@capacitor/splash-screen`). The game itself must keep running from `index.html` with zero build step; Capacitor's `webDir` must point to a `www/` folder produced by a tiny copy script (`scripts/build-www.js`, Node only) that copies `index.html`, `style.css`, `js/`, `assets/` (excluding `assets/contact_sheet.html`, `prompts.json`, `generation_log.jsonl`, `*.py`) into `www/`.
2. `capacitor.config.json`: appId `com.dklee.squadidle`, appName `용병단`, webDir `www`, android `allowMixedContent: false`, splash background `#8FD3FF`, portrait-only orientation via AndroidManifest (`android:screenOrientation="portrait"`).
3. Run `npx cap add android` and `npx cap sync`. Generate app icon (from `assets/icon/weapon.png` centered on a `#8FD3FF` rounded background) and splash (logo centered) into the Android res folders — use a Node script with no extra packages, or `@capacitor/assets` if it installs cleanly.
4. In `js/ui.js` (or a small new `js/native.js`, the 6th allowed global `Native`), detect Capacitor (`window.Capacitor?.isNativePlatform()`) and: use `@capacitor/haptics` for the drop/fusion vibration instead of `navigator.vibrate` when native; hook `App` `appStateChange` to call the same pause/resume + offline report path as `visibilitychange`; handle the Android back button (close open sheet/overlay first, otherwise minimize app). Everything must no-op gracefully in a plain browser.
5. Try a debug build: `cd android && ./gradlew assembleDebug` (Windows: `gradlew.bat`). If the Android SDK / JDK is missing, do NOT install SDKs; instead write exact instructions into `BUILD_ANDROID.md` (JDK 17, Android Studio SDK 34, `ANDROID_HOME`, the two commands) and stop there. If it builds, report the APK path.
6. Add `www/`, `android/build`, `android/app/build`, `node_modules/` to `.gitignore`. Keep `android/` itself committed-ready.
7. Tests: `node test/run.js` must still pass. Add `scripts/build-www.js` check that all manifest asset paths exist in `www/`.
8. `CHANGELOG.md`: "0.4.0 · P4" section with DECISION: notes and the build outcome.

Do not ask questions; decide and record.
