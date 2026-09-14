# Face sign-in is locked in some US states

Face login (saving a face map) is turned off for schools in Illinois, New York, Texas, and Washington.

Card, type, and card-scan sign-in stay available.

## How it is decided

1. The school’s **School state** setting (`appSettings.schoolState`).
2. If that is empty, a US ZIP on Smart Screen (`smartScreenLocationZip`) is used only as a backup.

The list lives in `src/lib/faceLoginPolicy.ts`. It is a product safety list, not legal advice.

## What the app does

- Settings: Face switch is locked; a short note explains why.
- Kiosk and kiosk profiles cannot turn Face back on.
- Face enrollment is hidden while locked.
