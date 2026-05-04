# Release Guide — MzanziHomes Android

## Keystore Setup (Required Before Release Builds)

The keystore file and properties are NOT committed to git. Set them up locally before building a signed release.

### Files needed
- `android/keystore.properties` — credentials file
- `android/app/rentlekker-release-key.jks` — signing keystore

Both files are stored securely in your secure backup (1Password / Google Drive).

### keystore.properties format

Create `android/keystore.properties` with this content:

```
storePassword=<password from secure storage>
keyAlias=rentlekker_key_alias
keyPassword=<password from secure storage>
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
4. Output: `android/app/build/outputs/bundle/release/app-release.aab`

## Version Bumping

Before every Play Store upload, update in `android/app/build.gradle`:
- `versionCode` — increment by 1 (Play Store rejects equal or lower values)
- `versionName` — update to match the user-facing release version

## Play Console

- App: MzanziHomes
- Package: com.MzanziHomes.app
