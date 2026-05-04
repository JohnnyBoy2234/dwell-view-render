# MzanziHomes Play Store Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get MzanziHomes published to the Google Play Store internal testing track with polished assets, correct app ID, full Android permissions, a live privacy policy, and a complete Play Store listing.

**Architecture:** Fix native Android config to align with Capacitor (app ID `com.MzanziHomes.app`), build a signed release AAB, generate Play Store assets (privacy policy HTML, feature graphic, screenshot frames, store copy) as files in `docs/play-store/`, then manually upload through Play Console.

**Tech Stack:** Capacitor 7, Android Gradle (Groovy DSL), HTML/CSS for generated assets, Bash for build commands.

---

## File Map

### Files to Modify
- `android/app/build.gradle` — fix namespace + applicationId, enable minify/shrinkResources
- `android/app/src/main/res/values/strings.xml` — fix all string values to MzanziHomes
- `android/app/src/main/AndroidManifest.xml` — add 7 missing permissions
- `.gitignore` — add keystore files

### Files to Create
- `RELEASE.md` — keystore setup documentation for future builds
- `docs/play-store/privacy-policy.html` — full POPIA-compliant privacy policy (hosted at mzanzihomes.com/privacy)
- `docs/play-store/feature-graphic.html` — 1024×500px Play Store banner (screenshot to PNG)
- `docs/play-store/screenshot-frame.html` — device frame + caption template (duplicate and customise per screenshot)
- `docs/play-store/store-copy.md` — app name, short description, full description, tags

---

## Task 1: Fix App ID in build.gradle

**Files:**
- Modify: `android/app/build.gradle`

- [ ] **Step 1: Open build.gradle and locate the two ID fields**

  Open `android/app/build.gradle`. Find the `android { }` block. It currently reads:
  ```groovy
  namespace "com.RentLekker.app"
  ...
  applicationId "com.RentLekker.app"
  ```

- [ ] **Step 2: Update namespace and applicationId**

  Replace both values:
  ```groovy
  namespace "com.MzanziHomes.app"
  ...
  applicationId "com.MzanziHomes.app"
  ```

  The full `android { }` block after the change:
  ```groovy
  android {
      namespace "com.MzanziHomes.app"
      compileSdk rootProject.ext.compileSdkVersion

      signingConfigs {
          release {
              if (keystorePropertiesFile.exists()) {
                  storeFile file(keystoreProperties['storeFile'])
                  storePassword keystoreProperties['storePassword']
                  keyAlias keystoreProperties['keyAlias']
                  keyPassword keystoreProperties['keyPassword']
              }
          }
      }

      defaultConfig {
          applicationId "com.MzanziHomes.app"
          minSdkVersion rootProject.ext.minSdkVersion
          targetSdkVersion rootProject.ext.targetSdkVersion
          versionCode 1
          versionName "1.0"
          testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
          aaptOptions {
              ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
          }
      }
      buildTypes {
          release {
              minifyEnabled false
              proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
              signingConfig signingConfigs.release
          }
      }
  }
  ```

- [ ] **Step 3: Verify the file saved correctly**

  Run:
  ```bash
  grep -n "com.RentLekker" android/app/build.gradle
  ```
  Expected: no output (zero matches).

- [ ] **Step 4: Commit**

  ```bash
  git add android/app/build.gradle
  git commit -m "fix: update Android app ID to com.MzanziHomes.app"
  ```

---

## Task 2: Fix App Name in strings.xml

**Files:**
- Modify: `android/app/src/main/res/values/strings.xml`

- [ ] **Step 1: Replace the full file content**

  Replace `android/app/src/main/res/values/strings.xml` with:
  ```xml
  <?xml version='1.0' encoding='utf-8'?>
  <resources>
      <string name="app_name">MzanziHomes</string>
      <string name="title_activity_main">MzanziHomes</string>
      <string name="package_name">com.MzanziHomes.app</string>
      <string name="custom_url_scheme">com.MzanziHomes.app</string>
  </resources>
  ```

- [ ] **Step 2: Verify**

  ```bash
  grep -n "RentLekker" android/app/src/main/res/values/strings.xml
  ```
  Expected: no output.

- [ ] **Step 3: Commit**

  ```bash
  git add android/app/src/main/res/values/strings.xml
  git commit -m "fix: rename app to MzanziHomes in Android strings"
  ```

---

## Task 3: Add Missing Android Permissions

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Replace the full manifest**

  Replace `android/app/src/main/AndroidManifest.xml` with:
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <manifest xmlns:android="http://schemas.android.com/apk/res/android">

      <application
          android:allowBackup="true"
          android:icon="@mipmap/ic_launcher"
          android:label="@string/app_name"
          android:roundIcon="@mipmap/ic_launcher_round"
          android:supportsRtl="true"
          android:theme="@style/AppTheme">

          <activity
              android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
              android:name=".MainActivity"
              android:label="@string/title_activity_main"
              android:theme="@style/AppTheme.NoActionBarLaunch"
              android:launchMode="singleTask"
              android:exported="true">

              <intent-filter>
                  <action android:name="android.intent.action.MAIN" />
                  <category android:name="android.intent.category.LAUNCHER" />
              </intent-filter>

          </activity>

          <provider
              android:name="androidx.core.content.FileProvider"
              android:authorities="${applicationId}.fileprovider"
              android:exported="false"
              android:grantUriPermissions="true">
              <meta-data
                  android:name="android.support.FILE_PROVIDER_PATHS"
                  android:resource="@xml/file_paths"></meta-data>
          </provider>
      </application>

      <!-- Core -->
      <uses-permission android:name="android.permission.INTERNET" />

      <!-- Camera -->
      <uses-permission android:name="android.permission.CAMERA" />

      <!-- Photo library: Android 13+ -->
      <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
      <!-- Photo library: Android 12 and below -->
      <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
          android:maxSdkVersion="32" />

      <!-- Location -->
      <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
      <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

      <!-- Push notifications: Android 13+ -->
      <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

      <!-- Haptic feedback -->
      <uses-permission android:name="android.permission.VIBRATE" />

  </manifest>
  ```

- [ ] **Step 2: Verify XML is valid**

  Run:
  ```bash
  cd android && ./gradlew :app:processDebugManifest 2>&1 | tail -5
  ```
  Expected: `BUILD SUCCESSFUL` (or no manifest-related errors).

- [ ] **Step 3: Commit**

  ```bash
  git add android/app/src/main/AndroidManifest.xml
  git commit -m "fix: add camera, location, storage, and notification permissions"
  ```

---

## Task 4: Harden Release Build Config

**Files:**
- Modify: `android/app/build.gradle`

- [ ] **Step 1: Enable minification and resource shrinking in the release build type**

  In `android/app/build.gradle`, update the `buildTypes` block:
  ```groovy
  buildTypes {
      release {
          minifyEnabled true
          shrinkResources true
          proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
          signingConfig signingConfigs.release
      }
  }
  ```

- [ ] **Step 2: Verify the change**

  ```bash
  grep -A4 "buildTypes" android/app/build.gradle
  ```
  Expected output includes `minifyEnabled true` and `shrinkResources true`.

- [ ] **Step 3: Commit**

  ```bash
  git add android/app/build.gradle
  git commit -m "fix: enable minify and shrinkResources for release builds"
  ```

---

## Task 5: Secure Keystore Files

**Files:**
- Modify: `.gitignore`

> ⚠️ **Before this step:** Back up `android/keystore.properties` and `android/app/rentlekker-release-key.jks` to a secure location (1Password, Google Drive, USB drive). Once removed from git you must have a copy elsewhere.

- [ ] **Step 1: Back up the files (manual)**

  Copy both files to a secure location. Confirm you have copies before continuing.

- [ ] **Step 2: Untrack the files from git**

  ```bash
  git rm --cached android/keystore.properties
  git rm --cached android/app/rentlekker-release-key.jks
  ```
  Expected output: `rm 'android/keystore.properties'` and `rm 'android/app/rentlekker-release-key.jks'`
  The files will still exist locally — only git tracking is removed.

- [ ] **Step 3: Add to .gitignore**

  Open `.gitignore` (create it at the repo root if it doesn't exist). Add these lines:
  ```
  # Keystore — do not commit, contains credentials
  android/keystore.properties
  android/app/*.jks
  ```

- [ ] **Step 4: Verify files are no longer tracked**

  ```bash
  git status
  ```
  Expected: `android/keystore.properties` and `android/app/rentlekker-release-key.jks` appear as `deleted` in the index but exist locally.

- [ ] **Step 5: Commit**

  ```bash
  git add .gitignore
  git commit -m "security: remove keystore credentials from git tracking"
  ```

---

## Task 6: Create RELEASE.md

**Files:**
- Create: `RELEASE.md`

- [ ] **Step 1: Create the file**

  Create `RELEASE.md` at the repo root:
  ```markdown
  # Release Guide — MzanziHomes Android

  ## Keystore Setup (Required Before Release Builds)

  The keystore file and properties are NOT committed to git. You must set them up locally before building a signed release.

  ### Files needed
  - `android/keystore.properties` — credentials file
  - `android/app/rentlekker-release-key.jks` — signing keystore

  Both files are stored securely in [your secure storage location, e.g. 1Password / Google Drive].

  ### keystore.properties format
  Create `android/keystore.properties` with this content (fill in actual values from secure storage):
  ```
  storePassword=<password>
  keyAlias=rentlekker_key_alias
  keyPassword=<password>
  storeFile=app/rentlekker-release-key.jks
  ```

  ### Steps to build a signed release AAB

  1. Ensure `android/keystore.properties` and `android/app/rentlekker-release-key.jks` are in place
  2. Build the web app and sync to Android:
     ```bash
     npm run build
     npx cap sync android
     ```
  3. Build the signed AAB:
     ```bash
     cd android
     ./gradlew bundleRelease
     ```
  4. The signed AAB is at:
     `android/app/build/outputs/bundle/release/app-release.aab`

  ## Version Bumping

  Before every Play Store upload, increment in `android/app/build.gradle`:
  - `versionCode` — must increase by at least 1 (Play Store rejects equal or lower)
  - `versionName` — update to match the user-facing release version

  ## Play Console

  - App: MzanziHomes
  - Package: com.MzanziHomes.app
  - Developer account: [your Play Console account email]
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add RELEASE.md
  git commit -m "docs: add release guide with keystore setup instructions"
  ```

---

## Task 7: Sync Capacitor and Verify Release AAB Builds

**Files:** none (build verification only)

- [ ] **Step 1: Build the web app**

  ```bash
  npm run build
  ```
  Expected: `dist/` folder updated, no TypeScript or build errors.

- [ ] **Step 2: Sync to Android**

  ```bash
  npx cap sync android
  ```
  Expected: `✔ Copying web assets` and `✔ Updating Android plugins` — no errors.

- [ ] **Step 3: Build the signed release AAB**

  ```bash
  cd android && ./gradlew bundleRelease
  ```
  Expected last lines: `BUILD SUCCESSFUL in Xs`

- [ ] **Step 4: Verify the AAB exists and is signed**

  ```bash
  ls -lh app/build/outputs/bundle/release/app-release.aab
  ```
  Expected: file exists, size > 5MB.

  ```bash
  cd .. && keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab 2>/dev/null | head -5
  ```
  Expected: certificate details printed (confirms the AAB is signed, not unsigned).

- [ ] **Step 5: Return to repo root**

  ```bash
  cd ..
  ```

---

## Task 8: Create Privacy Policy HTML Page

**Files:**
- Create: `docs/play-store/privacy-policy.html`

This file is to be copied to your web server at `mzanzihomes.com/privacy`.

- [ ] **Step 1: Create the directory**

  ```bash
  mkdir -p docs/play-store
  ```

- [ ] **Step 2: Create the file**

  Create `docs/play-store/privacy-policy.html` with the following content:

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Privacy Policy — MzanziHomes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --blue: hsl(214, 100%, 59%);
        --blue-dark: hsl(214, 100%, 45%);
        --text: #1a1a2e;
        --muted: #6b7280;
        --border: #e5e7eb;
        --bg-light: #f9fafb;
      }
      body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text); line-height: 1.75; font-size: 16px; }
      header { background: var(--blue); color: white; padding: 32px; }
      header .brand { font-size: 20px; font-weight: 700; opacity: 0.9; }
      header .subtitle { font-size: 30px; font-weight: 800; margin-top: 8px; letter-spacing: -0.5px; }
      header .meta { font-size: 14px; margin-top: 8px; opacity: 0.8; }
      .layout { display: flex; gap: 48px; padding: 48px 32px; max-width: 1100px; margin: 0 auto; }
      .toc { width: 240px; flex-shrink: 0; }
      .toc-inner { position: sticky; top: 24px; background: var(--bg-light); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
      .toc h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 12px; }
      .toc ol { padding-left: 18px; }
      .toc li { margin-bottom: 8px; font-size: 14px; }
      .toc a { color: var(--blue); text-decoration: none; }
      .toc a:hover { text-decoration: underline; }
      .content { flex: 1; min-width: 0; }
      section { margin-bottom: 48px; padding-bottom: 48px; border-bottom: 1px solid var(--border); }
      section:last-child { border-bottom: none; }
      h2 { font-size: 22px; font-weight: 700; margin-bottom: 16px; }
      h3 { font-size: 17px; font-weight: 600; margin-top: 24px; margin-bottom: 10px; }
      p { margin-bottom: 16px; }
      ul, ol { padding-left: 24px; margin-bottom: 16px; }
      li { margin-bottom: 6px; }
      .badge { display: inline-block; background: hsl(214,100%,95%); color: var(--blue-dark); font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; margin-bottom: 12px; }
      .info-box { background: var(--bg-light); border-left: 4px solid var(--blue); border-radius: 0 6px 6px 0; padding: 16px 20px; margin: 20px 0; font-size: 15px; }
      a { color: var(--blue); }
      footer { background: var(--bg-light); border-top: 1px solid var(--border); padding: 32px; text-align: center; font-size: 14px; color: var(--muted); }
      @media (max-width: 768px) {
        .layout { flex-direction: column; padding: 24px 16px; }
        .toc { width: 100%; }
        .toc-inner { position: static; }
        header { padding: 20px 16px; }
      }
    </style>
  </head>
  <body>

  <header>
    <div class="brand">MzanziHomes</div>
    <div class="subtitle">Privacy Policy</div>
    <div class="meta">Last updated: 3 May 2026 &nbsp;·&nbsp; Effective: 3 May 2026</div>
  </header>

  <div class="layout">
    <aside class="toc">
      <div class="toc-inner">
        <h2>Contents</h2>
        <ol>
          <li><a href="#s1">Introduction</a></li>
          <li><a href="#s2">Information We Collect</a></li>
          <li><a href="#s3">How We Use Your Information</a></li>
          <li><a href="#s4">Third-Party Services</a></li>
          <li><a href="#s5">Data Sharing</a></li>
          <li><a href="#s6">Data Retention</a></li>
          <li><a href="#s7">Your Rights under POPIA</a></li>
          <li><a href="#s8">Data Security</a></li>
          <li><a href="#s9">Children's Privacy</a></li>
          <li><a href="#s10">Changes to This Policy</a></li>
          <li><a href="#s11">Contact Us</a></li>
        </ol>
      </div>
    </aside>
    <main class="content">

      <section id="s1">
        <span class="badge">Section 1</span>
        <h2>1. Introduction</h2>
        <p>MzanziHomes (Pty) Ltd ("MzanziHomes", "we", "us", or "our") operates the MzanziHomes mobile application and related services (collectively, the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our Service.</p>
        <p>We are committed to protecting your privacy and complying with the Protection of Personal Information Act 4 of 2013 ("POPIA") of South Africa. By using the MzanziHomes app, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy.</p>
        <div class="info-box"><strong>Information Officer:</strong> The MzanziHomes Information Officer is responsible for ensuring compliance with POPIA. You may contact our Information Officer at <a href="mailto:privacy@mzanzihomes.com">privacy@mzanzihomes.com</a>.</div>
        <p>This Privacy Policy applies to all users of the MzanziHomes application, including landlords, property managers, and tenants.</p>
      </section>

      <section id="s2">
        <span class="badge">Section 2</span>
        <h2>2. Information We Collect</h2>
        <p>We collect information you provide directly, information generated through your use of the Service, and information from third-party services you connect to MzanziHomes.</p>
        <h3>2a. Account Information</h3>
        <p>When you create a MzanziHomes account, we collect:</p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Profile photograph (optional)</li>
          <li>Account type (landlord or tenant)</li>
          <li>Password (stored as a one-way cryptographic hash — never in plain text)</li>
        </ul>
        <h3>2b. Identity and KYC Documents</h3>
        <p>To comply with the Financial Intelligence Centre Act (FICA) and to verify user identity, we collect:</p>
        <ul>
          <li>South African ID document or passport (photograph or scan)</li>
          <li>Proof of address (utility bill, bank statement, or municipal account — dated within 3 months)</li>
          <li>Selfie photograph for identity verification</li>
          <li>Bank statements (for tenant income verification — shared only with landlords of properties you apply to)</li>
          <li>Payslips or proof of income (optional, for rental applications)</li>
        </ul>
        <p>KYC documents are encrypted at rest and in transit. They are shared with a specific landlord only upon your active application to their property, and only for the duration of the application process.</p>
        <h3>2c. Property Data</h3>
        <p>Landlords who list properties provide:</p>
        <ul>
          <li>Property address and geolocation coordinates</li>
          <li>Property photographs</li>
          <li>Rental amount, deposit amount, and lease terms</li>
          <li>Property description and features</li>
          <li>Availability dates</li>
        </ul>
        <h3>2d. Location Data</h3>
        <p>With your permission, we collect your precise GPS location when you use property search, to show rentals near you. We do not track or store your location continuously — it is used only in real-time during an active search session and is not retained after the session ends. You may disable location access at any time in your device settings.</p>
        <h3>2e. Financial and Payment Data</h3>
        <p>MzanziHomes processes payments through Paystack, a PCI DSS-compliant payment processor. We collect:</p>
        <ul>
          <li>Payment history (dates, amounts, status)</li>
          <li>Landlord bank account details for rental payouts (stored securely by Paystack)</li>
        </ul>
        <p>We do not store your card number, CVV, or full bank account number on our servers at any time. All sensitive payment credentials are handled exclusively by Paystack.</p>
        <h3>2f. Communications</h3>
        <p>In-app messages exchanged between landlords and tenants are stored on our servers. These messages may be reviewed by MzanziHomes support staff in the event of a dispute or reported violation of our Terms of Service.</p>
        <h3>2g. Device and Usage Data</h3>
        <p>We automatically collect:</p>
        <ul>
          <li>Device type, model, and operating system version</li>
          <li>App version</li>
          <li>Push notification token (for delivering notifications via Firebase Cloud Messaging)</li>
          <li>App usage patterns, screens viewed, and features used (via Firebase Analytics)</li>
          <li>Performance and crash data (via Firebase Crashlytics)</li>
          <li>General usage metrics (via Vercel Analytics)</li>
          <li>IP address and approximate location derived from IP (for analytics and fraud prevention)</li>
        </ul>
      </section>

      <section id="s3">
        <span class="badge">Section 3</span>
        <h2>3. How We Use Your Information</h2>
        <h3>3a. Service Delivery</h3>
        <ul>
          <li>Creating and managing your account</li>
          <li>Enabling property listings, searches, and applications</li>
          <li>Facilitating rental agreements between landlords and tenants</li>
          <li>Processing rent payments and payouts via Paystack</li>
          <li>Enabling in-app communication between landlords and tenants</li>
          <li>Managing maintenance requests and tracking resolution</li>
        </ul>
        <h3>3b. Identity Verification (KYC)</h3>
        <ul>
          <li>Verifying user identity in compliance with FICA requirements</li>
          <li>Sharing KYC documents with landlords during active rental applications (with your consent)</li>
          <li>Detecting and preventing fraudulent accounts and listings</li>
        </ul>
        <h3>3c. Communications</h3>
        <ul>
          <li>Sending push notifications about application updates, payment confirmations, maintenance status, and messages</li>
          <li>Sending transactional emails (account verification, password reset, receipts)</li>
        </ul>
        <p>You may opt out of non-essential push notifications in your device settings or within the app.</p>
        <h3>3d. Analytics and Improvement</h3>
        <ul>
          <li>Understanding how users interact with the app to improve features</li>
          <li>Diagnosing and fixing technical issues and crashes</li>
          <li>Measuring the effectiveness of new features</li>
        </ul>
        <h3>3e. Legal and Compliance</h3>
        <ul>
          <li>Complying with South African laws including POPIA and FICA</li>
          <li>Retaining financial records as required by tax legislation</li>
          <li>Responding to lawful requests from law enforcement or regulatory authorities</li>
          <li>Enforcing our Terms of Service and resolving disputes</li>
        </ul>
      </section>

      <section id="s4">
        <span class="badge">Section 4</span>
        <h2>4. Third-Party Services</h2>
        <p>MzanziHomes uses the following third-party services. Each is subject to its own privacy policy:</p>
        <h3>4a. Supabase</h3>
        <p><strong>Purpose:</strong> Database storage, user authentication, and file storage (KYC documents, property photos).</p>
        <p><strong>Data location:</strong> European Union (AWS eu-west-1). All data encrypted at rest.</p>
        <p><strong>Privacy policy:</strong> <a href="https://supabase.com/privacy" target="_blank">supabase.com/privacy</a></p>
        <h3>4b. Firebase (Google)</h3>
        <p><strong>Purpose:</strong> Push notifications (FCM), app analytics (Firebase Analytics), crash reporting (Crashlytics).</p>
        <p><strong>Privacy policy:</strong> <a href="https://firebase.google.com/support/privacy" target="_blank">firebase.google.com/support/privacy</a></p>
        <h3>4c. Paystack</h3>
        <p><strong>Purpose:</strong> Processing rent payments and landlord payouts. PCI DSS compliant, licensed in South Africa.</p>
        <p><strong>Data shared:</strong> Transaction amounts, payment references, and landlord bank account details for payouts.</p>
        <p><strong>Privacy policy:</strong> <a href="https://paystack.com/za/privacy" target="_blank">paystack.com/za/privacy</a></p>
        <h3>4d. Google Maps</h3>
        <p><strong>Purpose:</strong> Displaying property locations on a map. Your GPS coordinates are passed to Google Maps in real time when using location search.</p>
        <p><strong>Privacy policy:</strong> <a href="https://policies.google.com/privacy" target="_blank">policies.google.com/privacy</a></p>
        <h3>4e. Vercel</h3>
        <p><strong>Purpose:</strong> Hosting MzanziHomes web infrastructure and anonymous performance analytics.</p>
        <p><strong>Privacy policy:</strong> <a href="https://vercel.com/legal/privacy-policy" target="_blank">vercel.com/legal/privacy-policy</a></p>
      </section>

      <section id="s5">
        <span class="badge">Section 5</span>
        <h2>5. Data Sharing</h2>
        <p>We do not sell your personal information to any third party. We share your data only in the following circumstances:</p>
        <ul>
          <li><strong>With landlords you apply to:</strong> Your profile and KYC documents are shared with the relevant landlord for evaluation purposes only.</li>
          <li><strong>With tenants who apply to your listing:</strong> Landlords can see applicant profiles, KYC documents, and application details.</li>
          <li><strong>With service providers:</strong> We share data with Supabase, Firebase, Paystack, Google Maps, and Vercel solely to operate the Service.</li>
          <li><strong>For legal compliance:</strong> We may disclose information if required by law, court order, or to protect the safety of MzanziHomes users.</li>
          <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of MzanziHomes, your data may be transferred to the acquiring entity subject to equivalent privacy protections.</li>
        </ul>
      </section>

      <section id="s6">
        <span class="badge">Section 6</span>
        <h2>6. Data Retention</h2>
        <ul>
          <li><strong>Active account data</strong> — retained while your account is active</li>
          <li><strong>Account data after deletion</strong> — retained for 3 years after account closure to comply with legal obligations and resolve disputes</li>
          <li><strong>KYC documents</strong> — retained for 5 years from the date of the relevant transaction, as required by FICA</li>
          <li><strong>Payment records</strong> — retained for 7 years, as required by South African tax legislation (Income Tax Act)</li>
          <li><strong>Analytics data</strong> — aggregated and anonymised data may be retained indefinitely; identifiable data retained for 14 months by Firebase</li>
          <li><strong>Communications (messages)</strong> — retained for 3 years after the relevant tenancy ends</li>
        </ul>
        <p>When retention periods expire, data is securely deleted or anonymised.</p>
      </section>

      <section id="s7">
        <span class="badge">Section 7</span>
        <h2>7. Your Rights under POPIA</h2>
        <h3>7a. Right of Access</h3>
        <p>You may request a copy of the personal information we hold about you. We will provide this within 30 days of a verified request.</p>
        <h3>7b. Right to Correction</h3>
        <p>You may request that we correct inaccurate or incomplete personal information. Most account information can be updated directly within the MzanziHomes app.</p>
        <h3>7c. Right to Deletion</h3>
        <p>You may request that we delete your personal information. Some data must be retained for legal compliance (see Section 6) — we will inform you of anything we are unable to delete and explain why.</p>
        <h3>7d. Right to Object</h3>
        <p>You may object to the processing of your personal information for direct marketing purposes and opt out at any time.</p>
        <h3>7e. Right to Lodge a Complaint</h3>
        <p>If you believe we have violated your rights under POPIA, you may lodge a complaint with:</p>
        <div class="info-box">
          <strong>Information Regulator (South Africa)</strong><br>
          Website: <a href="https://inforegulator.org.za" target="_blank">inforegulator.org.za</a><br>
          Email: <a href="mailto:complaints.IR@justice.gov.za">complaints.IR@justice.gov.za</a><br>
          Phone: 012 406 4818
        </div>
        <p>To exercise any of the above rights, contact us at <a href="mailto:privacy@mzanzihomes.com">privacy@mzanzihomes.com</a>. We will verify your identity before processing any request.</p>
      </section>

      <section id="s8">
        <span class="badge">Section 8</span>
        <h2>8. Data Security</h2>
        <ul>
          <li><strong>Encryption in transit:</strong> All data transmitted between the app and our servers uses TLS 1.2 or higher</li>
          <li><strong>Encryption at rest:</strong> All data stored in Supabase is encrypted at rest using AES-256</li>
          <li><strong>Access controls:</strong> Row Level Security (RLS) is enforced at the database level — users can only access data they are authorised to see</li>
          <li><strong>Password security:</strong> Passwords are hashed using bcrypt via Supabase Auth — never stored in plain text</li>
          <li><strong>KYC document access:</strong> Identity documents are stored in a private Supabase Storage bucket with expiring signed URLs — never publicly accessible</li>
          <li><strong>Payment security:</strong> All payment credentials are handled by Paystack (PCI DSS Level 1 compliant) — we never receive or store card details</li>
        </ul>
        <p>Despite these measures, no system is completely secure. In the event of a data breach posing a risk to your rights and freedoms, we will notify you and the Information Regulator in accordance with POPIA requirements.</p>
      </section>

      <section id="s9">
        <span class="badge">Section 9</span>
        <h2>9. Children's Privacy</h2>
        <p>MzanziHomes is intended for users who are 18 years of age or older. We do not knowingly collect personal information from anyone under 18. If you believe we have inadvertently collected information from a minor, please contact us immediately at <a href="mailto:privacy@mzanzihomes.com">privacy@mzanzihomes.com</a> and we will delete the information promptly.</p>
      </section>

      <section id="s10">
        <span class="badge">Section 10</span>
        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. When we make material changes, we will:</p>
        <ul>
          <li>Update the "Last updated" date at the top of this page</li>
          <li>Send a push notification to all app users</li>
          <li>Display an in-app banner prompting you to review the updated policy</li>
        </ul>
        <p>Your continued use of MzanziHomes after a policy update constitutes your acceptance of the revised policy.</p>
      </section>

      <section id="s11">
        <span class="badge">Section 11</span>
        <h2>11. Contact Us</h2>
        <p>For any questions, concerns, or data requests relating to this Privacy Policy:</p>
        <div class="info-box">
          <strong>MzanziHomes Privacy Team</strong><br>
          Email: <a href="mailto:privacy@mzanzihomes.com">privacy@mzanzihomes.com</a><br>
          Website: <a href="https://mzanzihomes.com">mzanzihomes.com</a>
        </div>
        <p>We aim to respond to all privacy-related enquiries within 5 business days.</p>
      </section>

    </main>
  </div>

  <footer>
    <p>© 2026 MzanziHomes (Pty) Ltd · <a href="https://mzanzihomes.com">mzanzihomes.com</a> · <a href="mailto:privacy@mzanzihomes.com">privacy@mzanzihomes.com</a></p>
    <p style="margin-top:8px;">This policy is governed by the laws of the Republic of South Africa.</p>
  </footer>

  </body>
  </html>
  ```

- [ ] **Step 3: Preview in browser**

  Open `docs/play-store/privacy-policy.html` in your browser (double-click the file or drag it into Chrome). Verify:
  - Blue header renders with MzanziHomes branding
  - Table of contents is visible on the left (desktop) or stacked (mobile — resize window)
  - All 11 sections are present and readable
  - Links and email addresses are clickable

- [ ] **Step 4: Deploy to mzanzihomes.com/privacy (manual)**

  Upload `docs/play-store/privacy-policy.html` to your web hosting for `mzanzihomes.com` at the path `/privacy`. The exact upload method depends on your hosting provider (FTP, cPanel, Git deploy, etc.).

  Verify it is live: open `https://mzanzihomes.com/privacy` in a browser.

- [ ] **Step 5: Commit**

  ```bash
  git add docs/play-store/privacy-policy.html
  git commit -m "feat: add POPIA-compliant privacy policy page"
  ```

---

## Task 9: Create Feature Graphic

**Files:**
- Create: `docs/play-store/feature-graphic.html`

- [ ] **Step 1: Create the file**

  Create `docs/play-store/feature-graphic.html`:

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1024px;
        height: 500px;
        overflow: hidden;
        font-family: 'Inter', -apple-system, sans-serif;
        background: linear-gradient(135deg, hsl(214,100%,25%) 0%, hsl(214,100%,50%) 55%, hsl(196,80%,52%) 100%);
        color: white;
        position: relative;
      }
      .circles { position: absolute; inset: 0; overflow: hidden; }
      .circle { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.06); }
      .c1 { width: 420px; height: 420px; bottom: -140px; right: 60px; }
      .c2 { width: 260px; height: 260px; top: -80px; right: 320px; }
      .c3 { width: 140px; height: 140px; top: 50px; right: 100px; background: rgba(255,255,255,0.1); }
      .left {
        position: absolute;
        left: 64px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 2;
      }
      .logo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
      .logo-icon {
        width: 56px; height: 56px;
        background: white;
        border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        font-size: 30px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      }
      .app-name { font-size: 36px; font-weight: 800; letter-spacing: -1.5px; }
      .tagline { font-size: 20px; font-weight: 400; opacity: 0.88; max-width: 430px; line-height: 1.4; margin-bottom: 28px; }
      .pills { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
      .pill {
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 999px;
        padding: 7px 18px;
        font-size: 13px;
        font-weight: 500;
      }
      .trust { display: flex; gap: 20px; font-size: 13px; opacity: 0.8; }
      .trust span { display: flex; align-items: center; gap: 6px; }
    </style>
  </head>
  <body>
    <div class="circles">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
      <div class="circle c3"></div>
    </div>
    <div class="left">
      <div class="logo-row">
        <div class="logo-icon">🏠</div>
        <div class="app-name">MzanziHomes</div>
      </div>
      <div class="tagline">Your trusted rental platform for South Africa</div>
      <div class="pills">
        <div class="pill">🔑 For Landlords</div>
        <div class="pill">🏠 For Tenants</div>
        <div class="pill">💳 Paystack Payments</div>
        <div class="pill">✅ POPIA Compliant</div>
      </div>
      <div class="trust">
        <span>🔒 Secure KYC</span>
        <span>📍 Nationwide</span>
        <span>🏆 Verified Listings</span>
      </div>
    </div>
  </body>
  </html>
  ```

- [ ] **Step 2: Open and screenshot at exact dimensions**

  Open `docs/play-store/feature-graphic.html` in Chrome. Then:
  1. Open DevTools (F12)
  2. Click the "Toggle device toolbar" icon (Ctrl+Shift+M)
  3. Set custom dimensions: **width 1024, height 500**
  4. Right-click the page → "Capture screenshot" (or use the DevTools camera icon)
  5. Save the file as `docs/play-store/feature-graphic.png`

- [ ] **Step 3: Verify dimensions**

  Right-click `docs/play-store/feature-graphic.png` → Properties → Details. Confirm it is exactly **1024 × 500 pixels**.

- [ ] **Step 4: Commit**

  ```bash
  git add docs/play-store/feature-graphic.html docs/play-store/feature-graphic.png
  git commit -m "feat: add Play Store feature graphic (1024x500)"
  ```

---

## Task 10: Create Screenshot Frame Template and Capture 6 Screenshots

**Files:**
- Create: `docs/play-store/screenshot-frame.html`
- Create: `docs/play-store/screenshots/` (directory for final framed PNGs)

- [ ] **Step 1: Create the frame template**

  Create `docs/play-store/screenshot-frame.html`:

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1080px;
        background: linear-gradient(160deg, hsl(214,100%,18%) 0%, hsl(214,100%,35%) 100%);
        font-family: 'Inter', -apple-system, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 56px 40px 48px;
      }
      .caption {
        color: white;
        font-size: 44px;
        font-weight: 800;
        text-align: center;
        line-height: 1.2;
        margin-bottom: 44px;
        letter-spacing: -1.5px;
        max-width: 860px;
      }
      .phone {
        width: 380px;
        background: #111;
        border-radius: 52px;
        padding: 14px;
        box-shadow: 0 48px 120px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.07);
        position: relative;
      }
      .screen {
        background: #fff;
        border-radius: 40px;
        overflow: hidden;
        width: 100%;
        aspect-ratio: 9/19.5;
      }
      .screen img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .notch {
        position: absolute;
        top: 14px; left: 50%; transform: translateX(-50%);
        width: 110px; height: 28px;
        background: #111;
        border-radius: 0 0 18px 18px;
        z-index: 10;
      }
      .brand {
        color: rgba(255,255,255,0.45);
        font-size: 18px;
        font-weight: 700;
        margin-top: 36px;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <!-- EDIT THIS CAPTION FOR EACH SCREENSHOT -->
    <div class="caption">Browse verified rentals near you</div>
    <div class="phone">
      <div class="notch"></div>
      <div class="screen">
        <!-- REPLACE src WITH PATH TO RAW SCREENSHOT -->
        <img src="raw/screenshot-1.png" alt="App screenshot" />
      </div>
    </div>
    <div class="brand">MzanziHomes</div>
  </body>
  </html>
  ```

- [ ] **Step 2: Create directory structure**

  ```bash
  mkdir -p docs/play-store/screenshots/raw
  ```

- [ ] **Step 3: Run the app on emulator and capture 6 raw screenshots**

  ```bash
  npx cap run android
  ```

  Once the app is running in the emulator, navigate to each screen and capture using Android Studio's screenshot button (camera icon in the emulator toolbar) or:
  ```bash
  adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png docs/play-store/screenshots/raw/screenshot-1.png
  ```

  Repeat for each screen, saving as:
  | File | Screen to show | Suggested path through app |
  |---|---|---|
  | `raw/screenshot-1.png` | Property listings feed | Home tab |
  | `raw/screenshot-2.png` | Property detail view | Tap any listing |
  | `raw/screenshot-3.png` | Landlord dashboard | Landlord → Dashboard tab |
  | `raw/screenshot-4.png` | Application / KYC flow | Apply for a property |
  | `raw/screenshot-5.png` | Maintenance requests | Maintenance tab |
  | `raw/screenshot-6.png` | Payments screen | Payments tab |

  > Tip: populate the app with realistic demo data before capturing — real-looking data is much more compelling than empty states.

- [ ] **Step 4: For each of the 6 screenshots, produce a framed version**

  Duplicate `docs/play-store/screenshot-frame.html` six times, or edit the caption + image src inline. For each:
  1. Update the `.caption` text to match the table in the spec (e.g., `"Browse verified rentals near you"`)
  2. Update the `<img src="...">` to point to the correct raw screenshot
  3. Open in Chrome DevTools, set device width to **1080px** with no height restriction (let the page determine its own height, typically ~2400px)
  4. Use "Capture full size screenshot" in DevTools to export the framed image
  5. Save as `docs/play-store/screenshots/framed-1.png` through `framed-6.png`

  Captions per screenshot:
  - framed-1: `"Browse verified rentals near you"`
  - framed-2: `"Everything you need to decide"`
  - framed-3: `"Manage all your properties in one place"`
  - framed-4: `"Apply with confidence — fully digital"`
  - framed-5: `"Log and track issues instantly"`
  - framed-6: `"Pay rent and track payments in the app"`

- [ ] **Step 5: Verify final screenshots meet Play Store requirements**

  Each framed PNG must be:
  - At least 320px on the shortest side
  - At most 3840px on the longest side
  - 16:9 or 9:16 aspect ratio (the frame template produces approximately 9:19.5 — Play Store accepts this)
  - PNG or JPEG, under 8MB each

- [ ] **Step 6: Commit**

  ```bash
  git add docs/play-store/screenshot-frame.html docs/play-store/screenshots/
  git commit -m "feat: add screenshot frame template and 6 framed Play Store screenshots"
  ```

---

## Task 11: Write Store Copy

**Files:**
- Create: `docs/play-store/store-copy.md`

- [ ] **Step 1: Create the file**

  Create `docs/play-store/store-copy.md` with the following content. Copy-paste each section directly into Play Console:

  ```markdown
  # MzanziHomes — Play Store Copy

  ## App Name (30 chars max)
  MzanziHomes

  ## Short Description (80 chars max)
  The smarter way to rent, manage properties, and pay rent in South Africa.

  ## Full Description (copy-paste into Play Console)

  Managing rental properties in South Africa has never been simpler. MzanziHomes
  brings landlords and tenants together on one trusted, fully digital platform —
  handling everything from property listings to rent collection, right from your phone.

  **FOR LANDLORDS**

  Run your rental portfolio from anywhere:

  • List properties in minutes — upload photos, set your rental amount, and publish
    verified listings that tenants can trust.

  • Receive and review applications digitally — see applicant details, references,
    and income verification all in one place.

  • KYC verification built in — tenants upload their ID, proof of address, and bank
    statements directly in the app. You get verified applicants without chasing
    paperwork.

  • Generate and manage lease agreements digitally — no printing, scanning, or
    lost documents.

  • Collect rent via Paystack — get notified the moment payment lands. Full payment
    history always at your fingertips.

  • Log and track maintenance requests — tenants submit issues with photos. You
    assign, track, and close jobs without leaving the app.

  • Landlord dashboard — one view of all your properties, occupancy status,
    outstanding payments, and what needs your attention today.

  **FOR TENANTS**

  Find and manage your rental with zero friction:

  • Browse verified listings near you using GPS — filter by price, bedrooms,
    location, and pet-friendly status.

  • Apply directly in the app — upload your documents once and reuse them for
    multiple applications.

  • Complete digital KYC — verify your identity securely. Your documents are
    encrypted and shared only with landlords you've chosen to apply to.

  • Pay rent in the app via Paystack — fast, secure, and trackable. Your full
    payment history is always accessible.

  • Report maintenance issues the moment they happen — attach photos and track
    resolution status without needing to phone anyone.

  **BUILT FOR SOUTH AFRICA**

  MzanziHomes is designed from the ground up for the South African rental market.
  Payments are processed in Rands via Paystack. The platform is fully POPIA
  compliant, and our KYC process meets FICA requirements.

  **SECURITY AND TRUST**

  Your data is encrypted in transit and at rest. We comply with the Protection of
  Personal Information Act (POPIA) and never sell your data. Identity documents are
  shared only with landlords for specific applications, and you can request deletion
  of your data at any time.

  Download MzanziHomes and experience rental management the way it should be —
  clear, fast, and stress-free.

  ---

  ## Category
  House & Home

  ## Tags (Play Store keywords)
  rental, property, landlord, tenant, South Africa, rent, lease, KYC, Paystack, property management

  ## Contact Email (shown on Play Store listing)
  support@mzanzihomes.com

  ## Privacy Policy URL
  https://mzanzihomes.com/privacy
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/play-store/store-copy.md
  git commit -m "feat: add Play Store store copy (description, tags, category)"
  ```

---

## Task 12: Play Console Setup (Manual Checklist)

> All steps in this task are performed manually in [play.google.com/console](https://play.google.com/console). No code changes.

- [ ] **Step 1: Create the app in Play Console**
  - Go to Play Console → All apps → Create app
  - App name: `MzanziHomes`
  - Default language: `English (South Africa)`
  - App or game: `App`
  - Free or paid: `Free`
  - Declarations: check both (developer programme policies + US export laws)

- [ ] **Step 2: Fill in the Store Listing**
  - Short description: copy from `docs/play-store/store-copy.md`
  - Full description: copy from `docs/play-store/store-copy.md`
  - App icon: upload a 512×512px PNG (export your app icon at this size — it is at `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`, upscale to 512px)
  - Feature graphic: upload `docs/play-store/feature-graphic.png`
  - Phone screenshots: upload all 6 files from `docs/play-store/screenshots/framed-*.png`
  - Category: `House & Home`
  - Email: `support@mzanzihomes.com`
  - Privacy policy: `https://mzanzihomes.com/privacy`

- [ ] **Step 3: Complete the Content Rating questionnaire**
  - Go to Policy → App content → Content rating
  - Start questionnaire → select category: `Utilities`
  - Answer: no violence, no sexual content, no profanity, no controlled substances
  - User-generated content: Yes (landlord listings, messages) — select "content is moderated"
  - Financial transactions: Yes (Paystack payments)
  - Expected rating: **Everyone** or **Teen**

- [ ] **Step 4: Complete the Data Safety section**
  - Go to Policy → App content → Data safety
  - Declare each data type (use `docs/play-store/store-copy.md` and the privacy policy as reference):
    - Location: precise, optional, used for property search, not shared with third parties
    - Name, email, phone: required, used for account management
    - Photos: optional, user-uploaded, stored for property listings
    - Financial info (payment history): collected, not shared, not sold
    - Device identifiers: Firebase push token, used for notifications
    - App activity: Firebase Analytics, used for analytics
  - Confirm: data is not sold, users can request deletion

- [ ] **Step 5: Upload the AAB to Internal Testing**
  - Go to Testing → Internal testing → Create new release
  - Upload `android/app/build/outputs/bundle/release/app-release.aab`
  - When prompted, opt into **Google Play App Signing** (recommended)
  - Release name: `1.0 (internal)`
  - Release notes: `Internal testing release — MzanziHomes v1.0`
  - Save and review → Roll out to internal testing

- [ ] **Step 6: Add internal testers**
  - Go to Testing → Internal testing → Testers tab
  - Create a testers list and add email addresses (up to 100)
  - Copy the opt-in URL and share it with testers

- [ ] **Step 7: Verify the release is live**
  - Status should show `Published` on the internal testing track
  - Testers open the opt-in URL on their Android device, join the test, then find MzanziHomes on the Play Store and install

---

## Prerequisites Checklist

Complete these before starting Task 7 (build) or Task 12 (Play Console):

- [ ] `android/keystore.properties` and `android/app/rentlekker-release-key.jks` backed up securely
- [ ] `mzanzihomes.com/privacy` is live and publicly accessible (required before Play Console submission)
- [ ] `privacy@mzanzihomes.com` and `support@mzanzihomes.com` are active email addresses
- [ ] Android Studio installed with at least one Android emulator configured (Pixel 7 API 35 recommended)
- [ ] `adb` is in your PATH (`adb version` returns a version number)
- [ ] Demo data populated in the app for screenshot capture (realistic listings, a dashboard with properties, a payments screen with history)
