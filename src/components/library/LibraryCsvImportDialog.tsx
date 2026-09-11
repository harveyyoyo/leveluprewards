'use client';

import { useState, useTransition } from 'react';
import { Download, FileSpreadsheet, Loader2, Upload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useFunctions } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { callLibrary } from '@/lib/library/libraryOperations';
import { downloadLibraryCsv } from '@/lib/library/libraryWorkspace';
import type { LibraryItemInput } from '@/lib/types';

export interface ParsedCsvBook {
  title: string;
  author: string;
  isbn: string;
  upc: string;
  shelfLocation: string;
  category: string;
  copies: number;
  readingLevel?: string;
  pageCount?: number;
  publishedYear?: number;
  description?: string;
  valid: boolean;
  error?: string;
}

const SAMPLE_CSV = `Title,Author,ISBN,Barcode,Shelf,Category,Copies,ReadingLevel,PageCount,PublishedYear,Description
"The Lightning Thief","Rick Riordan","9780786838653","LIB-1001","Fiction R-RIO","Fiction",3,"5.2",377,2005,"Percy Jackson is about to be kicked out of boarding school... again."
"Charlotte's Web","E.B. White","9780064400558","LIB-1004","Classics W-WHI","Classics",2,"4.4",184,1952,"Some Pig. Humble. Radiant. These are the words in Charlotte's Web..."
"National Geographic Little Kids First Big Book of Space","Catherine D. Hughes","9781426310140","","Non-Fiction 520","Non-Fiction",1,"3.5",128,2012,"An introduction to the moon, stars, planets, and the solar system."`;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvText(rawText: string): ParsedCsvBook[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

  const titleIdx = getIndex(['title', 'name', 'book']);
  const authorIdx = getIndex(['author', 'writer']);
  const isbnIdx = getIndex(['isbn', 'isbn13', 'isbn10']);
  const upcIdx = getIndex(['barcode', 'upc', 'copybarcode']);
  const shelfIdx = getIndex(['shelf', 'location', 'callnumber']);
  const catIdx = getIndex(['category', 'genre', 'section']);
  const copiesIdx = getIndex(['copies', 'copycount', 'count', 'qty', 'quantity']);
  const levelIdx = getIndex(['readinglevel', 'lexile', 'grade', 'level']);
  const pageIdx = getIndex(['page', 'pages', 'pagecount']);
  const yearIdx = getIndex(['year', 'pubyear', 'published']);
  const descIdx = getIndex(['description', 'synopsis', 'summary']);

  const parsed: ParsedCsvBook[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = (titleIdx >= 0 ? cols[titleIdx] : cols[0]) || '';
    const author = (authorIdx >= 0 ? cols[authorIdx] : cols[1]) || '';
    const isbn = (isbnIdx >= 0 ? cols[isbnIdx] : '') || '';
    const upc = (upcIdx >= 0 ? cols[upcIdx] : '') || '';
    const shelfLocation = (shelfIdx >= 0 ? cols[shelfIdx] : '') || 'General';
    const category = (catIdx >= 0 ? cols[catIdx] : '') || 'General';
    const rawCopies = copiesIdx >= 0 ? parseInt(cols[copiesIdx], 10) : 1;
    const copies = isNaN(rawCopies) || rawCopies < 1 ? 1 : Math.min(50, rawCopies);
    const readingLevel = levelIdx >= 0 && cols[levelIdx] ? cols[levelIdx].slice(0, 30) : undefined;
    const rawPages = pageIdx >= 0 ? parseInt(cols[pageIdx], 10) : NaN;
    const pageCount = !isNaN(rawPages) && rawPages > 0 ? rawPages : undefined;
    const rawYear = yearIdx >= 0 ? parseInt(cols[yearIdx], 10) : NaN;
    const publishedYear = !isNaN(rawYear) && rawYear > 1000 && rawYear <= new Date().getFullYear() + 2 ? rawYear : undefined;
    const description = descIdx >= 0 && cols[descIdx] ? cols[descIdx].slice(0, 1000) : undefined;

    const valid = title.trim().length > 0;
    const error = !valid ? 'Missing title' : undefined;

    parsed.push({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim().replace(/[^0-9X]/gi, ''),
      upc: upc.trim(),
      shelfLocation: shelfLocation.trim(),
      category: category.trim(),
      copies,
      readingLevel,
      pageCount,
      publishedYear,
      description,
      valid,
      error,
    });
  }

  return parsed;
}

export function LibraryCsvImportDialog({
  isOpen,
  setIsOpen,
  schoolId,
  onImportComplete,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  schoolId: string;
  onImportComplete?: () => void;
}) {
  const functions = useFunctions();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const [csvText, setCsvText] = useState('');
  const [parsedBooks, setParsedBooks] = useState<ParsedCsvBook[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleParse = (text: string) => {
    setCsvText(text);
    startTransition(() => {
      const books = parseCsvText(text);
      setParsedBooks(books);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = String(evt.target?.result ?? '');
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const downloadSampleTemplate = () => {
    downloadLibraryCsv('library-sample-import.csv', [
      ['Title', 'Author', 'ISBN', 'Barcode', 'Shelf', 'Category', 'Copies', 'ReadingLevel', 'PageCount', 'PublishedYear', 'Description'],
      ['The Lightning Thief', 'Rick Riordan', '9780786838653', 'LIB-1001', 'Fiction R-RIO', 'Fiction', 3, '5.2', 377, 2005, 'Percy Jackson is about to be kicked out of boarding school... again.'],
      ["Charlotte's Web", 'E.B. White', '9780064400558', 'LIB-1004', 'Classics W-WHI', 'Classics', 2, '4.4', 184, 1952, "Some Pig. Humble. Radiant. These are the words in Charlotte's Web..."],
      ['National Geographic Little Kids First Big Book of Space', 'Catherine D. Hughes', '9781426310140', '', 'Non-Fiction 520', 'Non-Fiction', 1, '3.5', 128, 2012, 'An introduction to the moon, stars, planets, and the solar system.'],
    ]);
  };

  const validBooks = parsedBooks.filter(b => b.valid);
  const totalCopies = validBooks.reduce((acc, b) => acc + b.copies, 0);

  const handleImport = async () => {
    if (!validBooks.length || importing) return;
    setImporting(true);
    setProgress({ current: 0, total: validBooks.length });

    let successCount = 0;
    let failedCount = 0;

    // Process in sequential chunks of 5 books to avoid timeout or overload
    for (let i = 0; i < validBooks.length; i++) {
      const book = validBooks[i];
      try {
        const itemInput: LibraryItemInput = {
          name: book.title,
          author: book.author,
          isbn: book.isbn,
          upc: book.upc,
          shelfLocation: book.shelfLocation,
          category: book.category,
          copies: book.copies,
          readingLevel: book.readingLevel,
          pageCount: book.pageCount,
          publishedYear: book.publishedYear ? String(book.publishedYear) : undefined,
          description: book.description,
        };

        await callLibrary(functions, 'libraryCatalogSave', {
          schoolId,
          item: itemInput,
        });
        successCount++;
      } catch {
        failedCount++;
      }
      setProgress({ current: i + 1, total: validBooks.length });
    }

    setImporting(false);
    setProgress(null);
    toast({
      title: 'Import completed',
      description: `Successfully added ${successCount} titles (${failedCount > 0 ? `${failedCount} failed` : 'all successful'}).`,
    });
    setIsOpen(false);
    setCsvText('');
    setParsedBooks([]);
    onImportComplete?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <DialogTitle>Import Catalog from CSV</DialogTitle>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSampleTemplate} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Download Template
            </Button>
          </div>
          <DialogDescription>
            Add multiple books in bulk from a spreadsheet. Supports titles, authors, ISBNs, shelf locations, and copy counts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={tab} onValueChange={v => setTab(v as 'paste' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">Paste CSV Text</TabsTrigger>
              <TabsTrigger value="upload">Upload .CSV File</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-2 mt-3">
              <Textarea
                placeholder={`Paste your CSV here, for example:\n${SAMPLE_CSV}`}
                className="font-mono text-xs h-36"
                value={csvText}
                onChange={e => handleParse(e.target.value)}
                disabled={importing}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Comma or quote separated with header row.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleParse(SAMPLE_CSV)}
                  disabled={importing}
                >
                  Load Sample Data
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3 mt-3">
              <label
                htmlFor="library-csv-file-input"
                className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors bg-muted/20"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-semibold">Choose CSV File or drag and drop</span>
                <span className="text-xs text-muted-foreground">Accepts .csv UTF-8 text files</span>
                <input
                  id="library-csv-file-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={importing}
                />
              </label>
            </TabsContent>
          </Tabs>

          {parsedBooks.length > 0 && (
            <div className="space-y-3 rounded-2xl border p-4 bg-muted/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-bold">
                    {validBooks.length} titles ready
                  </Badge>
                  <Badge variant="secondary" className="font-medium">
                    {totalCopies} total copies
                  </Badge>
                  {parsedBooks.length - validBooks.length > 0 && (
                    <Badge variant="destructive" className="font-medium">
                      {parsedBooks.length - validBooks.length} invalid rows
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setCsvText('');
                    setParsedBooks([]);
                  }}
                  disabled={importing}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-xl border bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Author</th>
                      <th className="p-2.5">ISBN</th>
                      <th className="p-2.5">Shelf</th>
                      <th className="p-2.5">Copies</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedBooks.slice(0, 100).map((b, idx) => (
                      <tr key={idx} className={b.valid ? 'hover:bg-muted/40' : 'bg-destructive/5'}>
                        <td className="p-2.5 font-semibold truncate max-w-[180px]">{b.title || '(blank title)'}</td>
                        <td className="p-2.5 text-muted-foreground truncate max-w-[130px]">{b.author || '—'}</td>
                        <td className="p-2.5 font-mono text-[11px] text-muted-foreground">{b.isbn || '—'}</td>
                        <td className="p-2.5 text-muted-foreground">{b.shelfLocation}</td>
                        <td className="p-2.5 font-bold">{b.copies}</td>
                        <td className="p-2.5">
                          {b.valid ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive font-medium">
                              <AlertCircle className="h-3.5 w-3.5" /> {b.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedBooks.length > 100 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Showing first 100 of {parsedBooks.length} rows.
                </p>
              )}
            </div>
          )}

          {progress && (
            <div className="space-y-1.5 rounded-xl border bg-primary/5 p-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Importing books to catalog...
                </span>
                <span>
                  {progress.current} of {progress.total}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || validBooks.length === 0}
            className="gap-2 font-bold"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Import {validBooks.length} Titles ({totalCopies} Copies)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
