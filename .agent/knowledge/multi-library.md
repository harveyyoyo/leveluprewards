# Multiple libraries per school

A school can have more than one library (for example a **School Library** and a **class library**).

## Data

- Library list: `schools/{schoolId}/libraries/{libraryLocationId}`
- Default library id is `main`, named **School Library**. Existing catalog copies without `libraryLocationId` belong to `main`.
- Catalog copies stay in `schools/{schoolId}/library` and store `libraryLocationId`.
- Checkout limits are counted **per library**. Barcodes stay unique school-wide so a scan can say “this book belongs to the other library.”

## Staff UI

- Switch libraries at the top of `/{schoolId}/library`.
- Add / rename / hide extra libraries under **Library → Settings** or **Admin → Library → Add or manage libraries**.
- The school library (`main`) can be renamed but not hidden.
- Kiosk / self-checkout: `/{schoolId}/library/kiosk?library={id}`. If a device has more than one library and no saved choice, staff pick the station first.
