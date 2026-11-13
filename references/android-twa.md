# Android app on Google Play — Trusted Web Activity (TWA)

> Audit: Angatu Sistemas · written from the FastCurrículo app (package
> `fastcurriculo.angatusistemas.com.br`, versions 1.0 to 1.1.3), where every trap below was hit once in
> production. Read it whole before creating, changing or publishing an Android app that opens a site.

A TWA is a tiny Android app whose only job is to open the site in the user's Chrome **with no browser
interface**: no address bar, no tabs, the site full screen, Chrome's own cookies (so the `HttpOnly` session
of R23, Google sign-in through the CRM, Pix and downloads behave exactly as on the web). The app contains no
web code — the site is the product, the app is a door to it.

The whole difficulty is one sentence: **Chrome hides its interface only after it has proved that the app and
the site belong to the same owner**, through Digital Asset Links, and shows the address bar every time that
proof fails. Every "the URL is showing" bug is a failed proof. The sections below are the ways it fails.

---

## 1. When to build one, and what it is not

- Build a TWA when the product is a site that people would open from the home screen, and the owner wants a
  Play Store listing. The site must already be responsive, fast and installable-quality on a phone (R21 at
  mobile width is the gate).
- A TWA is **not** a WebView. Never ship a `WebView` app: it has its own cookie jar (the session breaks), no
  Google sign-in, and Play reviews it as a low-quality wrapper.
- Payments: the site charges through the CRM (R26). Google Play's billing policy applies to **digital goods
  sold inside the app**; physical goods and services consumed outside are exempt. A paid digital download
  bought inside the app is in Play's billing scope — decide this with the owner before publishing and
  record the decision in `CLAUDE.md`. Never hide a payment flow from the reviewer.
- iOS has no TWA. An App Store app is a different project; do not promise it from this procedure.

## 2. Project layout

Kept in the product's repository, folder `android/`, never a separate repository:

```
android/
  build.gradle.kts  settings.gradle.kts  gradle/  gradlew(.bat)
  app/build.gradle.kts            versions, host, launch URL, signing from a file outside the repo
  app/proguard-rules.pro          -keep for androidbrowserhelper
  app/src/main/AndroidManifest.xml
  app/src/main/java/<pkg>/LauncherActivity.java   the launcher of section 6
  app/src/main/res/values/{strings,colors,themes}.xml
  app/src/main/res/drawable-nodpi/splash.png      app/src/main/res/mipmap-*/ic_launcher*.png
  app/src/main/res/xml/filepaths.xml
  store/                          Play listing art (icon 512, feature graphic 1024x500, screenshots)
docs/android.md                   in the project: decisions, fingerprints, how it was verified
```

Library: `com.google.androidbrowserhelper:androidbrowserhelper` (newest), plus `androidx.browser:browser`
declared directly because the launcher uses the Custom Tabs API itself (R5: declare what you use), plus
`com.google.android.play:app-update` for section 8. Nothing else.

`app/build.gradle.kts` essentials:

```kotlin
val siteHost = "<domain>"                         // one place; the manifest reads the placeholders
android {
    compileSdk = 36
    defaultConfig {
        applicationId = "<package>"               // permanent: it is the Play listing's identity
        minSdk = 24                               // what androidbrowserhelper requires
        targetSdk = 36                            // Play's current floor moves every August — check it
        versionCode = N; versionName = "x.y.z"    // versionCode grows on EVERY upload
        manifestPlaceholders["hostName"] = siteHost
        manifestPlaceholders["launchUrl"] = "https://$siteHost/<start path>"
    }
    buildTypes { release { isMinifyEnabled = true; isShrinkResources = true; proguardFiles(...) } }
}
```

`proguard-rules.pro` must keep `-keep class com.google.androidbrowserhelper.** { *; }`: the library enables
its own components **by class name** at run time, and R8 renaming one crashed the launcher with
`Component class y.f does not exist`.

## 3. Manifest — every entry and why

```xml
<uses-permission android:name="android.permission.INTERNET" />
<queries>   <!-- Android 11+: without this the app cannot see any browser -->
  <intent><action android:name="android.support.customtabs.action.CustomTabsService" /></intent>
  <intent><action android:name="android.intent.action.VIEW" />
          <category android:name="android.intent.category.BROWSABLE" /><data android:scheme="https" /></intent>
</queries>
<application android:allowBackup="false" ... android:theme="@style/Theme.App"
    android:manageSpaceActivity="com.google.androidbrowserhelper.trusted.ManageDataLauncherActivity">

  <meta-data android:name="asset_statements" android:resource="@string/asset_statements" />

  <activity android:name=".LauncherActivity" android:exported="true"
            android:theme="@style/Theme.App.Launcher">          <!-- translucent: nothing of ours flashes -->
    <meta-data android:name="android.support.customtabs.trusted.DEFAULT_URL" android:value="${launchUrl}" />
    <meta-data ...STATUS_BAR_COLOR / _DARK, NAVIGATION_BAR_COLOR / _DARK  → the brand's ink colour />
    <meta-data ...SPLASH_IMAGE_DRAWABLE → @drawable/splash, SPLASH_SCREEN_BACKGROUND_COLOR → page colour,
               SPLASH_SCREEN_FADE_OUT_DURATION → 300, FILE_PROVIDER_AUTHORITY → ${applicationId}.fileprovider />
    <meta-data ...SCREEN_ORIENTATION → portrait (only if the site is portrait-only) />
    <meta-data android:name="android.support.customtabs.trusted.FALLBACK_STRATEGY" android:value="customtabs" />
    <intent-filter><action MAIN /><category LAUNCHER /></intent-filter>
    <intent-filter android:autoVerify="true">                    <!-- App Links: site links open the app -->
      <action VIEW /><category DEFAULT /><category BROWSABLE />
      <data android:scheme="https" android:host="${hostName}" />
    </intent-filter>
  </activity>

  <activity android:name="com.google.androidbrowserhelper.trusted.ManageDataLauncherActivity" android:exported="false">
    <meta-data android:name="android.support.customtabs.trusted.MANAGE_SPACE_URL" android:value="${launchUrl}" />
  </activity>

  <service android:name="com.google.androidbrowserhelper.trusted.DelegationService"
           android:enabled="true" android:exported="true">
    <intent-filter><action android:name="android.support.customtabs.trusted.TRUSTED_WEB_ACTIVITY_SERVICE" />
                   <category android:name="android.intent.category.DEFAULT" /></intent-filter>
  </service>

  <provider android:name="androidx.core.content.FileProvider" android:authorities="${applicationId}.fileprovider"
            android:exported="false" android:grantUriPermissions="true">
    <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/filepaths" />
  </provider>
</application>
```

- **`DelegationService` is not optional.** Chrome binds to it on every navigation (permissions,
  notifications). Without it the log fills with `cr_TWAClient: No service exists for scope`.
- **Every host in an `autoVerify` filter must verify**, or Android marks the whole app unverified. Declare
  only hosts whose `assetlinks.json` you serve (a `www.` host counts as another host).
- `strings.xml` carries the app side of the link and the origin the launcher verifies:

```xml
<string name="site_origin" translatable="false">https://<domain></string>
<string name="asset_statements" translatable="false">[{\"relation\": [\"delegate_permission/common.handle_all_urls\"], \"target\": {\"namespace\": \"web\", \"site\": \"https://<domain>\"}}]</string>
```

## 4. Digital Asset Links — the site side

The site serves `GET /.well-known/assetlinks.json` as a `Route` (R10), `application/json`, `200`, **no
redirect, no auth, outside the rate limit and the input filter**, reachable on every host the manifest
declares:

```json
[{"relation":["delegate_permission/common.handle_all_urls"],
  "target":{"namespace":"android_app","package_name":"<package>",
            "sha256_cert_fingerprints":["<every fingerprint of section 5>"]}}]
```

The fingerprints that never change are constants in the route; a panel field may **add** more (after a key
rotation) but is never the only source — a field someone forgets to fill is how the bar comes back. Cover
the route with a test that asserts every constant is served.

## 5. Signing and the fingerprints — where the bar really comes from

With Play App Signing, **the key that signs what phones install is Google's, not yours**. The fingerprint
list must contain **every** certificate a device can report:

| Certificate | Where to read it |
|---|---|
| Upload key (yours) | `keytool -list -v -keystore <keystore>` — needed for sideloaded test builds |
| Play app signing key in use | Play Console → app → *Test and release → App integrity → App signing*, SHA-256 |
| **Previous** Play signing keys | same page, *Previous app signing keys*, ⋮ → "Copy SHA-256 · classic key". After a key upgrade Play keeps signing older Android versions with the old key |
| **The certificate Android actually reports** | the only reliable source — see below |

The Console page is **not** enough. On FastCurrículo the Console listed `0B:C4…` (current) and `EB:64…`
(previous), but Android 13+ reported the installed app as `DB:4E…`, a rotated certificate that appears
nowhere in the Console. The procedure that always gives the truth:

1. Download the universal APK Google generated for the version
   (Android Publisher API, `generatedapks.list` → `generatedapks.download` with `alt=media`, the Play
   service account; or Console → *App bundle explorer* → *Downloads*).
2. `apksigner verify --print-certs -v app.apk` (shows the v2/v3 signer).
3. Install it on an emulator **as if Play installed it**: `adb install -i com.android.vending app.apk`
   — without `-i`, Play's automatic protection opens the store instead of the app.
4. `adb shell pm get-app-links <package>` → the `Signatures:` line is what Chrome compares. Put **that**
   fingerprint in the route, plus every other one above.

Never commit the keystore or its passwords: keep them in `~/.android-keys/<project>/keystore.properties`,
read by Gradle, and record only the **public** fingerprints in `docs/android.md`.

## 6. The launcher — opening verified on the first launch

**The symptom this section exists for:** the address bar shows on the first launch after an install,
reinstall, data clear or Chrome update, and is gone on the next launch.

**Why:** Chrome caches a successful verification. While a verification is *pending* the bar stays hidden;
it appears when the verification *fails*. On a first launch nothing is cached, and with the stock launcher
the check is a network round trip made in parallel with the page load, on a cold Chrome, often on mobile
data. When it fails or times out, that whole session shows the bar; the next launch finds the cached
success.

**The fix (root cause, not a workaround):** the launcher asks the same browser to verify the relationship
**before** opening the site, and opens it only when the answer is in — so the result is cached by the time
the TWA starts. The splash covers the wait.

```java
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    @Override protected boolean shouldLaunchImmediately() { return false; }   // we call launchTwa()

    // onCreate: if (isFinishing()) return; then checkRelationship() and checkForUpdate() in parallel.
    // checkRelationship():
    //   TwaProviderPicker.Action a = TwaProviderPicker.pickProvider(getPackageManager());
    //   if a.launchMode != TRUSTED_WEB_ACTIVITY → done (fallback browser, nothing to verify)
    //   CustomTabsClient.bindCustomTabsService(this, a.provider, connection)
    //   onCustomTabsServiceConnected: client.warmup(0); session = client.newSession(callback);
    //     session.validateRelationship(CustomTabsService.RELATION_HANDLE_ALL_URLS, origin, null)
    //   callback.onRelationshipValidationResult(..., result, ...): result false → ask once more; then done
    //   every path that cannot ask (bind false, null session, disconnect) → done
    // A timeout (6 s) for the verification and another (2.5 s) for the update check; when both are done,
    // launchTwa(). onDestroy: remove callbacks and unbindService.
    // Log one line, e.g. "Digital Asset Links relationship verified=<result>", for diagnosis.
}
```

The full, reviewed implementation is FastCurrículo's
`android/app/src/main/java/br/com/angatusistemas/fastcurriculo/LauncherActivity.java` — copy it and change
the package. Rules it follows: nothing can hold the app (every failure opens the site), callbacks from the
binder thread are posted to the main thread, the activity recreated after launch does nothing, portrait is
locked except on Android 8.0 (it throws for translucent activities).

## 7. Splash, colours and identity

- `splash.png` is the logo on the brand's page colour, `drawable-nodpi`, the same mark as the site (R17
  covers pages and e-mails; the app icon is the product's own mark, never redrawn).
- The launcher theme is **translucent** so nothing of the app flashes between the system splash and
  Chrome; the base theme's `windowBackground` is the page colour.
- Status and navigation bar colours are the brand's ink colour, matching the site's `theme-color`.
- Adaptive icon in `mipmap-anydpi-v26` with a foreground PNG per density; Play's 512 px icon and the
  1024×500 feature graphic live in `android/store/`.
- Play shows "Running in Chrome" once per install; it is Chrome's disclosure and cannot be removed.

## 8. Updates — always the newest version

- Play updates apps automatically on most phones, but not all (auto-update off, metered network). The
  launcher therefore asks Play first (`AppUpdateManager.getAppUpdateInfo()`), and when an update is
  available and `IMMEDIATE` is allowed it runs `startUpdateFlowForResult(info, this,
  AppUpdateOptions.defaultOptions(IMMEDIATE), REQUEST)` before opening the site. Cancelled or failed → the
  site opens.
- Publish every release with `inAppUpdatePriority: 5` so the in-app update treats it as urgent.
- The site needs no app update for content changes — only Android-side changes need a new version.
- Every upload: `versionCode` + 1, `versionName` bumped, release notes in pt-BR describing what the user
  sees (R16), never internal jargon.

## 9. Build, test, publish

Build (Windows, Android Studio's JBR; the unix-socket override avoids a Gradle daemon error on long paths):

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:\fctmp'
./gradlew.bat bundleRelease assembleRelease
```

**Test matrix, in an emulator, before every release** — each case must open full screen, no address bar,
with the launcher's log line showing `verified=true` before the page:

| Case | How |
|---|---|
| Clean first launch | `adb uninstall <pkg>`; `adb shell pm clear com.android.chrome` (+ `--disable-fre` command line, `am set-debug-app --persistent com.android.chrome`); install; launch; screenshot every 2 s |
| Warm Chrome, first launch | same without clearing Chrome |
| App data cleared | `adb shell pm clear <pkg>`; launch |
| Reinstall | uninstall, install, launch |
| Update in place | `adb install -r` the new build over the old; launch |
| **The Play-signed build** | after uploading, download the universal APK (section 5), install with `-i com.android.vending`, repeat the clean first launch — this is the build users get, with Google's certificate |

Launch with `adb shell am start -n <pkg>/<LauncherActivity>`. Never `adb shell monkey` — it crashed the
emulator (SIGILL). `adb shell pm get-app-links <pkg>` must say `verified` for the host.

Publish through the Android Publisher API with the Play service account (`edits.insert` →
`edits.bundles.upload` → `edits.tracks.update` on `production` with `status: completed`,
`inAppUpdatePriority: 5`, pt-BR notes → `edits.commit`), or the Console. **Publishing is outward-facing:
only when the owner asked for that release.** The first release of a new app goes through the Console
(listing, content rating, data safety, target audience, app access for the reviewer).

## 10. Play requirements checklist

- `targetSdk` at or above Play's current floor; `compileSdk` the same or newer.
- Data safety form matches the site's real collection (account e-mail, payments through the CRM,
  analytics if any); privacy policy URL is the site's page, and it mentions the app.
- App access: the reviewer must be able to reach the paid flow without asking the owner for credentials
  (a reviewer coupon or test account recorded in the Console, never in the repository).
- No `WebView`, no hidden features, no payment flow the reviewer cannot see.
- `allowBackup="false"` (the session lives in Chrome, not in the app).
- No native libraries (16 KB page-size rule does not apply); if one is ever added, check it.
- Large screens: Android 16 ignores orientation locks on screens ≥ 600 dp — the site must also work in
  landscape and on tablets.

## 11. Diagnosing the bar in production

In order — stop at the first that explains it:

1. `curl -sI https://<domain>/.well-known/assetlinks.json` → `200`, `application/json`, no redirect.
2. Google's view of it:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<domain>&relation=delegate_permission/common.handle_all_urls`
   — every fingerprint of section 5 must be there.
3. The certificate devices report (section 5, steps 1–4). A missing one is the classic cause of "the bar
   shows on some phones and not on others".
4. The launch path: the bar only on the **first** launch → the launcher of section 6 is missing or skips
   verification.
5. The browser: the default browser without TWA support → Custom Tab with the bar, by design (fallback).
   Chrome outdated or disabled → same.
6. After fixing the site side, phones that already cached a **failure** recover on the next launch (Chrome
   re-verifies); nothing has to be reinstalled.

Record in the project's `docs/android.md`: the package, every fingerprint with where it was read, the
launch URL, how each release was verified, and the decisions (payments, reviewer access).
