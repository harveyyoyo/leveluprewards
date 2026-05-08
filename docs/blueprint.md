# **App Name**: Student Reward System

## Core Features:

- Student Kiosk: Allow students to log in, scan coupons, and redeem points for rewards.
- Teacher Station: Enable teachers to generate coupon codes for various reasons and point values. The system produces a tool to track coupon usage.
- Admin Portal: Provide administrators with tools to manage teachers, categories, and system data.
- Barcode Scanning: Scan coupon codes using a barcode scanner.
- NFC Card Login: Allow students to log in using NFC cards.
- Cloud Data Sync: Automatically synchronize school data with Firebase Firestore to ensure data consistency across devices.
- Data Import/Export: Allow admin users to import/export CSV and JSON data. Teachers, categories, students data will be imported by uploading the corresponding files.

## Operational Notes:

- Firestore permission guardrails are documented in [firestore-permission-guardrails.md](./firestore-permission-guardrails.md). Any new frontend Firestore collection path needs matching `firestore.rules` coverage and should pass `npm run check:firestore-rules`.
- Agent scratch and handoff notes should stay UTF-8; see [agent-file-format-notes.md](./agent-file-format-notes.md).

## Style Guidelines:

- Primary color: Light indigo (#7986CB) for a scholastic feel.
- Background color: Very light indigo (#F0F2F7).
- Accent color: Muted violet (#9FA8DA) for CTAs and highlights.
- Body font: 'PT Sans' (sans-serif) for clear readability.
- Headline font: 'Playfair' (serif) for headlines and short amounts of text. If longer text is anticipated, use this for headlines and 'PT Sans' for body.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use consistent and clear icons from Lucide to represent different actions and categories.
- Use a clean, modern layout with rounded corners and subtle shadows for a user-friendly interface.
- Subtle animations and transitions for interactive elements, such as button hover effects and modal appearance.
