# MzanziHomes — Google Play Store Launch Design

**Date:** 2026-05-03
**Approach:** B — Polished assets, done right
**Target track:** Internal testing (then production after feedback)
**App ID:** `com.MzanziHomes.app`
**App name:** MzanziHomes

---

## 1. Code Fixes (Critical Blockers)

### 1.1 App ID / Name Alignment

The Capacitor config (`capacitor.config.ts`) correctly uses `com.MzanziHomes.app` / `MzanziHomes`. The native Android files are misaligned and must be updated:

| File | Change |
|---|---|
| `android/app/build.gradle` | `namespace` + `applicationId` → `com.MzanziHomes.app` |
| `android/app/src/main/res/values/strings.xml` | `app_name`, `title_activity_main`, `package_name`, `custom_url_scheme` → `MzanziHomes` / `com.MzanziHomes.app` |
| `android/app/src/main/AndroidManifest.xml` | No direct ID references, but re-sync after build.gradle change |

The existing keystore file (`rentlekker-release-key.jks`) and alias (`rentlekker_key_alias`) retain their filenames — only the app ID matters for Play Store identity.

After changing the app ID, run `npx cap sync android` to propagate the change.

### 1.2 Android Permissions

`AndroidManifest.xml` currently only declares `INTERNET`. Add the following:

```xml
<!-- Camera -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Photo library (Android 13+ uses READ_MEDIA_IMAGES, older uses READ_EXTERNAL_STORAGE) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />

<!-- Location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Push notifications (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Haptics -->
<uses-permission android:name="android.permission.VIBRATE" />
```

### 1.3 Release Build Hardening

In `android/app/build.gradle`, update the release build type:

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

### 1.4 Keystore Security

`android/keystore.properties` contains plaintext credentials and must not be committed to git. Both files are currently tracked by git, so two steps are needed — not just `.gitignore`:

```bash
# Untrack without deleting the local files
git rm --cached android/keystore.properties
git rm --cached android/app/rentlekker-release-key.jks
```

- Add `android/keystore.properties` to `.gitignore`
- Add `android/app/rentlekker-release-key.jks` to `.gitignore`
- Document the manual setup in a `RELEASE.md` at the repo root:
  - How to recreate `keystore.properties` locally
  - Where the `.jks` file is stored (e.g., 1Password, Google Drive)
- Back up both files to a secure location **before** running `git rm --cached`

---

## 2. Build & Signing

### 2.1 Release AAB

Build command (run from repo root):

```bash
npm run build && npx cap sync android
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

The existing `keystore.properties` + `signingConfigs.release` block in `build.gradle` automatically signs the AAB during the Gradle build. No manual jarsigner step needed.

### 2.2 Google Play App Signing

When uploading the AAB to Play Console for the first time, opt into **Google Play App Signing**. This makes the upload key (`rentlekker-release-key.jks`) the authentication key only — Google manages the distribution signing key. Benefits:
- Google can reset the upload key if lost
- Smaller download size for users (Google optimizes the AAB per device)

### 2.3 Version Management

Current: `versionCode 1` / `versionName "1.0"` in `android/app/build.gradle`.

Rule for every future release:
- Increment `versionCode` by 1 (must always increase, Play Store rejects equal or lower)
- Update `versionName` to match the user-facing version (e.g. `"1.1"`, `"2.0"`)

---

## 3. Privacy Policy

### 3.1 Location

Hosted at `mzanzihomes.com/privacy`. The page is a standalone HTML file delivered by whatever CMS/host manages the domain.

### 3.2 Style

Modelled on Property24's privacy policy layout:
- Clean white background, MzanziHomes blue (`hsl(214 100% 59%)`) header bar
- Inter font, large readable body text, generous line-height
- Numbered top-level sections, lettered subsections
- Sticky table of contents on desktop, collapsed on mobile
- Last updated date in header

### 3.3 Content Sections

The policy must be the most detailed version covering all data the app handles:

1. **Introduction** — who we are, POPIA compliance, contact details
2. **Information We Collect**
   - Account information (name, email, phone, profile photo)
   - Identity & KYC documents (ID copies, proof of address, bank statements, selfies)
   - Property data (listing photos, addresses, rental amounts, lease terms)
   - Location data (precise GPS when browsing properties — not stored continuously)
   - Financial data (payment history, bank account details for landlord payouts — processed via Paystack, not stored by us)
   - Device & usage data (device type, OS version, push notification token, session logs via Firebase Analytics and Vercel Analytics)
   - Communications (in-app messages between landlords and tenants)
3. **How We Use Your Information** — service delivery, KYC verification, payment processing, push notifications, analytics, legal compliance
4. **Third-Party Services** — Supabase (EU-hosted database & auth), Firebase/Google (push notifications + analytics), Paystack (payment processing, South Africa), Google Maps (property map views), Vercel (hosting + analytics)
5. **Data Sharing** — we do not sell data; limited sharing only with listed third parties for service delivery
6. **Data Retention** — account data held while account is active + 3 years; KYC documents retained per FICA requirements (5 years); payment records retained 7 years for tax compliance
7. **Your Rights under POPIA** — access, correction, deletion, objection, lodge complaint with Information Regulator
8. **Data Security** — encryption in transit (TLS), encryption at rest (Supabase), access controls, incident response
9. **Children's Privacy** — service is for users 18+, no data knowingly collected from minors
10. **Changes to This Policy** — in-app notification + updated date on page
11. **Contact Us** — `privacy@mzanzihomes.com`

---

## 4. Play Store Listing Assets

### 4.1 Feature Graphic

- **Dimensions:** 1024×500px PNG
- **Design:** MzanziHomes blue gradient background, app logo + name centered, tagline *"Your trusted rental platform"* below, subtle property photo or UI mockup on the right
- **Deliverable:** HTML/CSS file rendered via browser screenshot at exact dimensions, or a Figma export

### 4.2 Screenshots

6 screenshots captured from Android emulator (Pixel 7 — 1080×2400px). Each gets:
- A device frame overlay
- A bold caption banner above the screen

| # | Screen | Caption |
|---|---|---|
| 1 | Property listings feed | "Browse verified rentals near you" |
| 2 | Property detail view | "Everything you need to decide" |
| 3 | Landlord dashboard | "Manage all your properties in one place" |
| 4 | Application / KYC flow | "Apply with confidence — fully digital" |
| 5 | Maintenance requests | "Log and track issues instantly" |
| 6 | Payments screen | "Pay rent and track payments in the app" |

Screenshots are produced by:
1. Building a debug APK and running on emulator (`npx cap run android`)
2. Navigating to each screen with realistic demo data
3. Capturing via Android Studio's screenshot tool or `adb shell screencap`
4. Applying device frame + caption overlay in HTML/CSS, exported at correct dimensions

### 4.3 Store Copy

**App name:** `MzanziHomes` (12 chars — well within 30 char limit)

**Short description (80 chars max):**
> The smarter way to rent, manage properties, and pay rent in South Africa.

**Full description (targeting ~800–1000 words, 4000 char max):**
Covers:
- Headline value proposition for both landlords and tenants
- Landlord features: listings, applications, KYC verification, lease management, maintenance, Paystack payments
- Tenant features: property search, applications, rent payments, maintenance logging
- Trust & security: POPIA compliant, encrypted data, verified listings
- Call to action

**Category:** House & Home
**Tags:** rental, property, landlord, tenant, South Africa, rent

---

## 5. Play Console Setup

### 5.1 App Creation

In [play.google.com/console](https://play.google.com/console):
- Create app → name `MzanziHomes`, language `English (South Africa)`, type `App`, free, not primarily for children
- Agree to Play Developer Distribution Agreement

### 5.2 Store Listing

Upload all Section 4 assets. Fill in:
- Short & full description
- Category: House & Home
- Email address for store listing: use a support email (e.g. `support@mzanzihomes.com`)
- Privacy policy URL: `https://mzanzihomes.com/privacy`

### 5.3 Content Rating

Complete the IARC questionnaire. Expected rating: **Everyone** (no violence, no gambling, adults only by terms but no mature content). Select:
- Category: **Utilities / Productivity** path
- No user-generated content visible to others publicly (landlord listings are public, note this)
- Financial transactions: yes (Paystack)

### 5.4 Data Safety Section

Map directly from the privacy policy. Key declarations:
- **Location** — collected, used for property search, not shared with third parties beyond Google Maps
- **Personal info** (name, email, phone) — collected, used for account, shared with Supabase
- **Financial info** — payment history collected, processed via Paystack
- **Photos** — user-uploaded, stored in Supabase Storage
- **Device identifiers** — Firebase token, used for push notifications
- **Data is not sold**
- **Users can request deletion** (via `privacy@mzanzihomes.com`)

### 5.5 Internal Testing Track

- Upload signed `app-release.aab`
- Add tester emails (up to 100)
- Publish to internal track — goes live immediately, no Google review
- Share the opt-in URL with testers

### 5.6 Prerequisites Checklist (Manual)

These cannot be automated and must be done by the developer:

- [ ] `keystore.properties` and `.jks` backed up securely (1Password / Google Drive)
- [ ] Google Play Developer account verified and in good standing
- [ ] `mzanzihomes.com/privacy` page live and publicly accessible before Play Console submission
- [ ] Support / privacy contact email (`privacy@mzanzihomes.com`) active and monitored
- [ ] Demo data populated in app for screenshot capture session
- [ ] At least one physical Android device or emulator available for screenshot capture

---

## Out of Scope

- iOS App Store submission (separate effort)
- CI/CD pipeline for automated AAB builds (can be added post-launch)
- Production track release (after internal testing feedback gathered)
- In-app purchase setup (app is free)
