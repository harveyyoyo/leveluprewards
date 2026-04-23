# Frontend Gotchas & Best Practices

## Printing and React Lifecycle

### The "Blank/Missing Data on Second Print" Bug
**Problem:** 
When triggering `window.print()` from a provider (e.g. `PrintProvider.tsx`), components that are conditionally mounted directly before the print call (e.g. `<StudentIdPrintSheet>`) might use hooks like `useDoc` to fetch data from cache. 
- On the very first print, downloading the font (e.g. `document.fonts.load`) takes enough time for the component to render and its `useDoc` hook to receive cached snapshot data.
- On the second print, the font is already loaded, `document.fonts.load` resolves instantly, and `window.print()` is called synchronously. The nested component has mounted but its `useDoc` hook is still returning `{ data: null, isLoading: false }` because it hasn't received the first snapshot from Firebase yet. The page prints with the fallback/missing data.

**Solution:**
Do not fetch dependent data inside the component that is conditionally rendered specifically for printing. Instead, fetch the required data in the persistent parent (e.g. `PrintProvider`), wait for it to load, and pass the data down as explicit props to the print component.

```tsx
// ❌ BAD: The print sheet fetches its own data on mount
function StudentIdPrintSheet({ schoolId }) {
  const { data: schoolData } = useDoc(doc(firestore, 'schools', schoolId));
  const schoolName = schoolData?.name || 'School'; // Prints 'School' on second print!
  return <div>{schoolName}</div>;
}

// ✅ GOOD: The parent fetches data and passes it down
function PrintProvider() {
  const { data: schoolData, isLoading } = useDoc(doc(firestore, 'schools', schoolId));

  useEffect(() => {
    if (triggerPrint && !isLoading) {
      window.print();
    }
  }, [triggerPrint, isLoading]);

  return <StudentIdPrintSheet schoolData={schoolData} />;
}
```

### The "Infinite Overflow / Blank Pages" Bug
**Problem:** 
When rendering a CSS grid that overflows across multiple pages (e.g. `<div id="print-container">` with a fixed `11in` height and `page-break-after: always`), CSS grids do not natively paginate well. The browser will often push overflowing content in unexpected ways, leading to blank pages (e.g., coupons printing on page 2, but pages 1 and 3 are blank).

**Solution:**
Explicitly chunk your printable data into groups that fit precisely on a single page, and map them to separate container `<div>`s that each have `page-break-after: always`.

```tsx
// ❌ BAD: Single giant container
<div id="print-container">
  {coupons.map(...)} 
</div>

// ✅ GOOD: Chunked into separate pages
<div id="print-wrapper">
  {chunkedCoupons(12).map(page => (
    <div className="print-page-container">
      {page.map(...)}
    </div>
  ))}
</div>
```
