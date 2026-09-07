# Android debug build · P4

## Current outcome (2026-09-07)

No APK was produced. `npm install` failed with `EACCES` fetching
`https://registry.npmjs.org/@capacitor%2fandroid` in this managed environment.
`npx cap add android` and `npx cap sync` were attempted, but could not run the
uninstalled Capacitor CLI; npx's registry lookup also failed with `EACCES`.
There is no generated `android/` project, Gradle wrapper, or lockfile yet.
`assembleDebug` could not start without that wrapper. `java -version` reports
command not found; `JAVA_HOME`/`ANDROID_HOME` are unset, and no SDK was found in
the usual Android Studio/LocalAppData locations. No SDK or JDK was installed.

The web copy and all 28 manifest paths are verified. The Node-only resource
generator was run in preview mode; generated PNGs were decoded and the launcher
icon was visually inspected. Android resource compilation and actual device
haptics/lifecycle/back behavior remain unverified.

## Prerequisites

1. Use Node 18+ and npm with access to the npm registry.
2. Install **JDK 17**. Set `JAVA_HOME` to its installation folder, with
   `%JAVA_HOME%\bin` on `PATH`. Confirm `java -version` reports 17.
3. Install Android Studio Hedgehog (2023.1.1) or newer. In SDK Manager install
   **Android SDK Platform 34**, **Android SDK Build-Tools 34.0.0**, and Android
   SDK Platform-Tools. Select **JDK 17** as the project's Gradle JDK.
4. Set `ANDROID_HOME` to the SDK folder displayed by SDK Manager. The usual
   Windows location is `%LOCALAPPDATA%\Android\Sdk`. Add
   `%ANDROID_HOME%\platform-tools` to `PATH`. Reopen the terminal after changing
   persistent environment variables. Gradle also needs access to its distribution
   service, Google Maven, and Maven Central on its first build.

Example PowerShell session (replace the JDK path with the installed location):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

DECISION: Capacitor is pinned to 6.x to match the requested JDK 17 / SDK 34
toolchain. This is a debug APK for friend testing; store release requirements
need a separate review. The SDK 34 configuration follows the
[official Capacitor 6 migration guide](https://capacitorjs.com/docs/v6/updating/6-0).

## One-time project creation

From the repository root, run these after npm registry access is available:

```powershell
npm install
npm run build:www
npx cap add android
npm run android:assets
npx cap sync
```

Keep the generated `package-lock.json` and native `android/` project in version
control, including `gradlew`, `gradlew.bat`, and `gradle/wrapper/gradle-wrapper.jar`.
Do not commit SDK paths (`android/local.properties`), caches, signing keys, or
build outputs. Subsequent checkouts use `npm ci` and do not repeat `cap add`.

`android:assets` writes five density variants of launcher icons/adaptive
foregrounds and centered splash logos into `android/app/src/main/res`, replaces
template splash PNGs, configures the launch theme, and adds
`android:screenOrientation="portrait"` to MainActivity in AndroidManifest.xml.
It preserves that setting on repeated runs. Android 12+ uses the system splash
theme; older Android uses the same sky background and centered weapon emblem.

## The two repeatable build commands

Run from the repository root:

```powershell
npm run android:sync
cd android; .\gradlew.bat assembleDebug
```

On macOS/Linux the second command is `cd android && ./gradlew assembleDebug`.
`android:sync` copies the static game, verifies the manifest, regenerates native
resources/portrait configuration, then runs Capacitor sync. After a successful
build, the APK is **`android/app/build/outputs/apk/debug/app-debug.apk`**.
This is an expected output path, not an artifact from the current environment.

## Verification

```powershell
node test/run.js
node scripts/check-native.js
node scripts/build-www.js
Get-ChildItem js/*.js,scripts/*.js | ForEach-Object { node --check $_.FullName }
```

Optional asset preview without Capacitor: `node scripts/android-assets.js --preview`
writes ignored `.android-preview/res/` files. It does not create a fake Android
project. Before distributing an APK, verify cold launch/splash, portrait lock,
drop/fusion haptics, home-and-return after 61 seconds (one report), process
restart/save recovery, report/fusion/sheet back dismissal, and root back minimize
on a real Android device. Browser tests cannot verify native plugins.

The root `index.html` still runs directly on a static server with no npm install
or build. The six packages are native development tooling only; Capacitor injects
its native bridge inside the APK. Plain browsers use the existing vibration
fallback and do not register app listeners. Remote Google Fonts keep their
existing system-font fallback; they are not required for offline play.
