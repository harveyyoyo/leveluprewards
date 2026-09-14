# Multiple libraries per school

A school can have more than one library (for example a **School Library** and a **class library**).

## Data

- Library list: `schools/{schoolId}/libraries/{libraryLocationId}`
- Default library id is always `main`, but it is **not** auto-created with a hardcoded name anymore. The first time an admin opens **Admin → Library** with no libraries yet, they're asked to name it ("Name your library", defaulting to nothing — not silently "School Library"). Until that happens, the UI shows a synthesized fallback named "School Library" (see `defaultLibraryLocation()` in `src/lib/library/libraryLocations.ts`) without writing anything to Firestore. Existing catalog copies without `libraryLocationId` belong to `main` either way — that convention doesn't depend on the doc existing.
- Catalog copies stay in `schools/{schoolId}/library` and store `libraryLocationId`.
- Checkout limits are counted **per library**. Barcodes stay unique school-wide so a scan can say “this book belongs to the other library.”

## Staff UI

- Switch libraries at the top of `/{schoolId}/library`.
- Add / rename libraries under **Library → (gear icon) → Circulation & Shelves** or **Admin → Library → Your libraries**. Hidden (archived) libraries can be permanently deleted once empty (no catalog items left pointing at them) — only admin/developer accounts can do this (Firestore rules restrict `delete` on `libraries/{id}` to `isAdmin`/`isDeveloper`; librarians/teachers only get create/update).
- The school library (`main`) can be renamed but not hidden or deleted.
- Each library in the list has its own **Open** link straight into that library — there's no single generic "Open Library" button anymore.
- Kiosk / self-checkout: `/{schoolId}/library/kiosk?library={id}`. If a device has more than one library and no saved choice, staff pick the station first.
