# MzanziHomes — iOS Launch Checklist

Two apps ship separately:

| App | Bundle ID | Codemagic workflow |
|---|---|---|
| Tenant | `com.mzanzihomes.app` | `tenant-ios` |
| Landlord | `com.mzanzihomes.landlord` | `landlord-ios` |

Everything below is done **once per app** unless noted. You're on Windows — the
build itself runs on Codemagic (already configured in `codemagic.yaml`), so you
never need a Mac.

---

## 0. Accounts (do first)
- [ ] **Apple Developer Program** membership — $99/year (apple.com/developer).
- [ ] In **App Store Connect → Users and Access → Integrations → App Store Connect API**,
      create an **API key** (Admin or App Manager role). Download the `.p8`.
- [ ] In **Codemagic → Teams → Integrations → App Store Connect**, add that key and
      name it exactly **`Codemagic CI`** (that's the name `codemagic.yaml` references).
- [ ] In **Codemagic → Code signing (iOS)**, enable **automatic** signing (Codemagic
      manages certs/profiles) — matches the `xcode-project use-profiles` step.

## 1. Register the apps
- [ ] Apple Developer portal → **Identifiers** → register both bundle IDs, and tick
      the **Push Notifications** capability on each (the app uses push).
- [ ] App Store Connect → **My Apps → +** → create a record for each app (name,
      primary language, bundle ID, SKU).
- [ ] Create an **APNs Auth Key** (Keys → +, Apple Push Notifications service) and
      wire it into your push backend / Supabase edge function that sends pushes.

## 2. In-project settings (verify in `apps/<app>/ios/App`)
These live in the iOS project; confirm before the first build.
- [ ] **App icon** — 1024×1024 + the full set in `Assets.xcassets/AppIcon`.
- [ ] **Launch screen** — branded splash (you already configure SplashScreen in
      `capacitor.config.ts`).
- [ ] **`Info.plist` usage strings** (missing ones = instant rejection). You use
      Camera, Photos and Geolocation, so include:
  - `NSCameraUsageDescription` — "Used to photograph properties, documents and inspection items."
  - `NSPhotoLibraryUsageDescription` — "Used to attach photos to listings, applications and messages."
  - `NSPhotoLibraryAddUsageDescription` — "Used to save documents and receipts to your device."
  - `NSLocationWhenInUseUsageDescription` — "Used to find properties near you."
- [ ] **Push Notifications** capability enabled on the target.
- [ ] Consider setting the app to **iPhone only** (Deployment Info → iPhone) unless
      you've tested iPad — it removes the iPad screenshot requirement.

## 3. ⚠️ The subscription / payments decision (most likely rejection)
- The landlord **"Pro" plan** is a *digital* subscription that unlocks in-app
  features (messaging). Apple's guideline 3.1.1 usually requires this to be sold
  through **In-App Purchase**, not Paystack/CallPay.
- **Rent payments** and other real-world services are exempt (guideline 3.1.5) and
  can stay on Paystack/CallPay.
- **Decide one of:**
  1. Add StoreKit IAP for the Pro subscription (most compliant), **or**
  2. On iOS, don't sell/upsell Pro in-app — let users who already subscribed on the
     web keep access, and remove any in-app "Upgrade" buttons/links, **or**
  3. Make messaging free on iOS and only gate non-Apple-relevant features.
- Whatever you choose, **remove in-app links to the external upgrade/checkout page**
  on iOS or it will be rejected.

## 4. Required app behaviours (Apple checks these)
- [ ] **In-app account deletion** — a path in Settings to delete the account
      (guideline 5.1.1(v)). Mandatory because you have accounts.
- [ ] **Reviewer demo account** — create a working tenant + landlord login with
      sample data and put the credentials in App Store Connect → App Review
      Information → Sign-In. (Your DB is currently wiped — seed a demo tenancy so
      the reviewer sees real screens, not empty states.)
- [ ] **Sign in with Apple** — only required if you offer third-party social login.
      Email/OTP only ⇒ not required.

## 5. Store listing (per app)
- [ ] Name, subtitle (30 char), promotional text, description, keywords.
- [ ] **Support URL** and **Marketing URL** → https://mzanzihomes.com
- [ ] **Privacy Policy URL** → https://mzanzihomes.com/privacy-policy
- [ ] **App Privacy questionnaire** — you collect a lot: Contact Info, Financial
      Info, Identifiers, Photos, Location, plus KYC/ID documents. Fill this
      honestly or it gets rejected.
- [ ] **Category** (e.g. Business / Lifestyle), **age rating**.
- [ ] **Screenshots** — ✅ already done: `app-store/screenshots/{tenant,landlord}`
      are 1290×2796 (6.7") marketing shots, ready to upload. (Add 13" iPad shots
      only if you keep iPad support.)

## 6. Build & submit
1. Push to `main` → Codemagic runs `tenant-ios` and `landlord-ios`, uploads to
   **TestFlight** automatically.
2. Test the TestFlight build on a device.
3. In App Store Connect, attach the build to the version, complete the metadata,
   and **Submit for Review**.

## Quick "will it get rejected?" pre-flight
- [ ] Pro subscription handled per §3
- [ ] Account deletion present (§4)
- [ ] Reviewer demo login + seeded data (§4)
- [ ] All `Info.plist` usage strings present (§2)
- [ ] Privacy questionnaire complete (§5)
- [ ] Privacy policy + support URLs live (§5)
