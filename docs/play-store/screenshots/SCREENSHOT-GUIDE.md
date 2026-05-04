# Screenshot Guide

## Required screenshots (6 total)

| # | File | Screen | Caption |
|---|---|---|---|
| 1 | raw/screenshot-1.png | Property listings feed | "Browse verified rentals near you" |
| 2 | raw/screenshot-2.png | Property detail view | "Everything you need to decide" |
| 3 | raw/screenshot-3.png | Landlord dashboard | "Manage all your properties in one place" |
| 4 | raw/screenshot-4.png | Application / KYC flow | "Apply with confidence — fully digital" |
| 5 | raw/screenshot-5.png | Maintenance requests | "Log and track issues instantly" |
| 6 | raw/screenshot-6.png | Payments screen | "Pay rent and track payments in the app" |

## How to capture raw screenshots

1. Run: `npx cap run android` (launches app on emulator)
2. Navigate to the target screen with realistic demo data
3. Capture with Android Studio screenshot button, OR:
   ```bash
   adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png docs/play-store/screenshots/raw/screenshot-N.png
   ```
4. Save into `docs/play-store/screenshots/raw/`

## How to produce framed screenshots

For each screenshot:
1. Copy `../screenshot-frame.html` to `screenshot-frame-N.html`
2. Edit the caption text to match the table above
3. Replace the `<div class="placeholder">` with: `<img src="raw/screenshot-N.png" alt="App screenshot" />`
4. Open in Chrome DevTools, set width to 1080px
5. Use "Capture full size screenshot"
6. Save as `framed-N.png`

Upload all 6 `framed-N.png` files to Play Console → Store listing → Phone screenshots.
