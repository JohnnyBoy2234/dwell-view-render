# TestFlight readiness checklist — MzanziHomes iOS

Two separate iOS apps ship from this monorepo. Each needs its own App Store
Connect record, bundle ID, icons, and TestFlight setup.

| | Tenant app | Landlord app |
|---|---|---|
| Display name | **MzanziHomes** | **MzanziHomes Landlord** |
| Bundle ID | `com.mzanzihomes.app` | `com.mzanzihomes.landlord` |
| Project | `apps/tenant/ios` | `apps/landlord/ios` |
| Web build dir | `apps/tenant/dist` | `apps/landlord/dist` |

Legend: `[x]` already in place · `[ ]` to do · ⚠️ known gap

---

## 0. One-time account setup (covers both apps)
- [ ] Buy a Mac (Apple-silicon) with the latest **Xcode** installed.
- [ ] Enrol in the **Apple Developer Program** ($99/year). Prefer an **Organization** account (needs a D-U-N-S number) so the seller name is your business — start this early, org verification can take days.
- [ ] Sign in to Xcode with the Developer account (Xcode → Settings → Accounts) and confirm the **Team** appears.
- [ ] In the Apple Developer portal, create an **APNs Auth Key (.p8)** if you want push notifications (see §4). Keep the `.p8`, Key ID, and Team ID safe.

> Note: a `AuthKey_*.p8` file was seen in Downloads — if that's your APNs key, store it somewhere safe and **do not commit it** to the repo.

---

## 1. Build & sync each app (on the Mac)
Run per app (`apps/tenant`, then `apps/landlord`):
- [ ] `npm install`
- [ ] `npm run build`  (produces `dist`)
- [ ] `npx cap sync ios`
- [ ] `npx cap open ios`  (opens Xcode)

---

## 2. Xcode configuration (per app)
- [ ] **Signing & Capabilities** → select your **Team**, enable *Automatically manage signing*.
- [ ] Confirm **Bundle Identifier** matches the table above.
- [ ] Set **Version** (`MARKETING_VERSION`, e.g. `1.0.0`) and **Build** (`CURRENT_PROJECT_VERSION`, e.g. `1`). Both apps read `$(MARKETING_VERSION)` from build settings — set it there. Bump the **build number** on every upload.
- [ ] ⚠️ **App icon** — each app currently has a single icon image in `Assets.xcassets/AppIcon.appiconset`. Confirm it's a valid **1024×1024 PNG, no transparency, no rounded corners** (single-size is accepted by modern Xcode). Replace placeholder art with the real brand icon.
- [ ] **Splash screen** — verify the Capacitor splash looks right (`@capacitor/splash-screen` is installed).
- [ ] Test on a real device via cable (Product → Run) before archiving.

### Permissions (Info.plist) — already present, just verify wording
- [x] `NSCameraUsageDescription` (both apps)
- [x] `NSPhotoLibraryUsageDescription` (both apps)
- [x] `NSPhotoLibraryAddUsageDescription` (both apps)
- [x] `NSLocationWhenInUseUsageDescription` (both apps)
- [ ] Add **`ITSAppUsesNonExemptEncryption` = NO** to Info.plist (you only use standard HTTPS) — avoids the export-compliance prompt on every upload.

---

## 3. Capacitor plugins in use — sanity check
These are installed and need working native config: camera, geolocation, push-notifications, keyboard, status-bar, splash-screen, haptics, network.
- [ ] Camera + photo capture works (KYC / inventory / maintenance / condition photos).
- [ ] Geolocation prompt works (address verification / nearby search).
- [ ] App loads the **bundled** build (not a live website URL) — this is the case today; keep it, or Apple may reject as a web wrapper (Guideline 4.2).

---

## 4. Push notifications (⚠️ not configured yet)
`@capacitor/push-notifications` is installed but there is **no entitlements file / Push Notifications capability** in either iOS project. If you want push in the TestFlight build:
- [ ] Xcode → Signing & Capabilities → **+ Capability → Push Notifications** (creates the `.entitlements` with `aps-environment`).
- [ ] Add **Background Modes → Remote notifications** if you send background pushes.
- [ ] Upload the **APNs Auth Key (.p8)** to your push provider (Supabase edge function / whatever sends pushes) with Key ID + Team ID.
- [ ] Test a push to a real device from TestFlight.

> If push isn't ready for the first pilot, you can ship TestFlight without it and add it in a later build.

---

## 5. App Store Connect record (per app)
- [ ] Create the app in **App Store Connect → My Apps → +** with the matching bundle ID.
- [ ] Set primary language, category (Business / Lifestyle), and (for org accounts) the seller name.

---

## 6. Upload the build (per app)
- [ ] Xcode → **Product → Archive**.
- [ ] **Distribute App → App Store Connect → Upload**.
- [ ] Wait for it to finish **processing** in App Store Connect (minutes).

---

## 7. TestFlight (per app)
- [ ] **Internal testers** (up to 100, must be on your ASC team) — instant, no review. Use these for fast iteration.
- [ ] **External testers** (up to 10,000, email or public link) — first build needs a quick **Beta App Review** (~1 day); later builds usually faster.
- [ ] Fill the TestFlight **"What to Test"** notes and the beta app description.
- [ ] Provide a **beta contact email** and (for external) a **privacy policy URL** — required.
- [ ] Confirm testers can install via the **TestFlight app** and open the build.

> Each uploaded build **expires after 90 days**; upload a fresh build before then to keep testers running. No overall limit on how long you stay in TestFlight.

---

## 8. Data & privacy (important — this app handles sensitive data)
The apps collect IDs, income documents, and banking details, so review is stricter:
- [ ] **Privacy Policy URL** published and reachable.
- [ ] Complete the **App Privacy** questionnaire accurately (data types: contact info, financial info, identifiers, photos, location; how each is used; whether linked to identity).
- [ ] Ensure banking/ID data is transmitted over HTTPS and access-controlled (Supabase RLS already enforced).
- [ ] Age rating questionnaire completed.

---

## 9. When ready to go public (App Store, per app)
- [ ] Screenshots for required device sizes (6.7" and others).
- [ ] Description, keywords, support URL, marketing URL.
- [ ] Select the reviewed build → **Submit for Review** (full review ~1–3 days).
- [ ] Choose manual or automatic release on approval.

---

## Suggested order
1. Account + Mac + Xcode setup (§0).
2. Get the **tenant** app onto TestFlight with **internal** testers first (§1–7).
3. Pilot, fix, iterate (internal testers = minutes per build).
4. Add **external** testers for a wider pilot.
5. Repeat for the **landlord** app.
6. Submit each to the App Store when stable (§9).
