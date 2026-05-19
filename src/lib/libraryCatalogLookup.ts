/** Best-effort metadata from Open Library (no API key). */
export type LibraryCatalogHit = {
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
};

function pickIsbn(identifiers: Record<string, string[]> | undefined): string | undefined {
  if (!identifiers) return undefined;
  const isbn13 = identifiers.isbn_13?.[0];
  const isbn10 = identifiers.isbn_10?.[0];
  return isbn13 || isbn10;
}

export async function lookupBookByIsbn(isbnRaw: string): Promise<LibraryCatalogHit | null> {
  const isbn = isbnRaw.replace(/\D/g, '');
  if (isbn.length < 10) return null;
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { title?: string; authors?: { name: string }[]; subjects?: { name: string }[]; identifiers?: Record<string, string[]> }>;
    const key = `ISBN:${isbn}`;
    const book = data[key];
    if (!book?.title) return null;
    const author = book.authors?.[0]?.name;
    const category = book.subjects?.[0]?.name;
    return {
      title: book.title.trim(),
      author: author?.trim(),
      isbn: pickIsbn(book.identifiers) || isbn,
      category: category?.trim(),
    };
  } catch {
    return null;
  }
}
