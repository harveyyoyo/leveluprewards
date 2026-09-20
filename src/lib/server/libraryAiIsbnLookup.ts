import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { type LibraryCatalogHit, isSuspiciousCatalogTitle } from '@/lib/library/libraryCatalogLookup';
import type { LibraryReadingLevelSystem } from '@/lib/library/libraryReadingLevel';
import { parseLooseJson } from '@/lib/server/looseJson';

/**
 * Last-resort book identification using an AI web search, for ISBNs that the
 * free catalogs (Open Library, Google Books, isbnsearch.org) do not index — e.g.
 * niche or specialty publishers. The model searches the live web for the ISBN
 * each time (so it isn't limited to training data) and returns its best match.
 * Results are tagged `source: 'ai'` so the UI requires the librarian to confirm
 * them before saving.
 */

/**
 * The reading-level instruction changes based on the school's chosen scale
 * (a settings choice) so the AI reports the number the school actually shelves
 * by, instead of whichever scale a random source happens to mention first.
 */
function readingLevelInstruction(preferredSystem: LibraryReadingLevelSystem = 'auto'): string {
  const scaleName: Record<Exclude<LibraryReadingLevelSystem, 'auto'>, string> = {
    lexile: 'a Lexile measure (e.g. "650L")',
    ar: 'an Accelerated Reader / ATOS level (e.g. "AR 4.2")',
    grade: 'a grade level or grade range (e.g. "Grade 3" or "Grades 3-5")',
    fountas_pinnell: 'a Fountas & Pinnell / Guided Reading letter (e.g. "Level M")',
  };
  if (preferredSystem === 'auto') {
    return 'For "readingLevel", report a reading-level metric only if search results state one — a Lexile score ("650L"), an Accelerated Reader level ("AR 4.2"), a Fountas & Pinnell/Guided Reading letter ("Level M"), or a grade range ("Grades 3-5"). Use the exact figure sources report. Leave "readingLevel" as an empty string if no source mentions one — never estimate or guess a number.';
  }
  return `For "readingLevel", report ${scaleName[preferredSystem]} if any source states one for this book. If sources only give a different kind of reading-level scale and never mention this one, leave "readingLevel" as an empty string — never convert or estimate one scale from another.`;
}

function buildIsbnSystemPrompt(preferredSystem: LibraryReadingLevelSystem = 'auto'): string {
  return `You identify books from their ISBN by searching the web.
Use web search to look up the given ISBN-13 (and ISBN-10 variant) on bookseller, publisher, and library sites, then report the real, published book it belongs to. Never invent a title — only report what the search results show.

Reply with ONLY a JSON object (no prose, no markdown) matching this schema:
{
  "found": boolean,
  "title": "string",
  "author": "string",
  "category": "string",
  "publisher": "string",
  "publishedYear": "string",
  "readingLevel": "string"
}

Set "found" to true when web search identifies a specific published book for this ISBN — even if minor details (subtitle wording, year) differ slightly across retailers. Use the title and author that most booksellers or the publisher agree on. Set "found" to false only when search returns nothing useful or conflicting titles with no clear match.

${readingLevelInstruction(preferredSystem)}`;
}

export type AiBookResult = {
  found?: boolean;
  title?: string;
  author?: string;
  category?: string;
  publisher?: string;
  publishedYear?: string;
  readingLevel?: string;
};

export type AiIsbnLookupStatus = 'not_configured' | 'matched' | 'no_match' | 'error';

export type AiIsbnLookupOutcome = {
  hit: LibraryCatalogHit | null;
  status: AiIsbnLookupStatus;
  /** Present when status is 'error'. */
  error?: string;
};

/** Map a parsed AI JSON payload to a catalog hit (exported for tests). */
export function hitFromAiResult(result: AiBookResult, fallbackIsbn: string): LibraryCatalogHit | null {
  const title = result.title?.trim();
  if (!result.found || !title || isSuspiciousCatalogTitle(title)) return null;
  return {
    title,
    author: result.author?.trim() || undefined,
    isbn: fallbackIsbn,
    category: result.category?.trim() || undefined,
    publisher: result.publisher?.trim() || undefined,
    publishedYear: result.publishedYear?.trim() || undefined,
    readingLevel: result.readingLevel?.trim() || undefined,
    source: 'ai',
  };
}

function buildUserPrompt(variants: string[]): string {
  return `Search the web and identify the book for ISBN ${variants[0]}${
    variants.length > 1 ? ` (also written as ${variants.slice(1).join(', ')})` : ''
  }. Return the JSON object described above.`;
}

function buildTitleSystemPrompt(preferredSystem: LibraryReadingLevelSystem = 'auto'): string {
  return `You identify books from a title a librarian typed.
Use web search to find the published book that matches that name. Never invent a title — only report what the search results show.

Reply with ONLY a JSON object (no prose, no markdown) matching this schema:
{
  "found": boolean,
  "title": "string",
  "author": "string",
  "category": "string",
  "publisher": "string",
  "publishedYear": "string",
  "readingLevel": "string"
}

Set "found" to true when search identifies a specific published book. Use the title and author that most booksellers or the publisher agree on. Set "found" to false only when search returns nothing useful.

${readingLevelInstruction(preferredSystem)}`;
}

function buildTitleUserPrompt(title: string): string {
  return `Search the web and identify the published book titled "${title}". Return the JSON object described above.`;
}

/** Parse model text output into a catalog hit (exported for tests). */
export function parseAiHit(text: string, fallbackIsbn: string): LibraryCatalogHit | null {
  const parsed = parseLooseJson(text);
  if (!parsed.ok || typeof parsed.value !== 'object' || parsed.value === null) return null;
  return hitFromAiResult(parsed.value as AiBookResult, fallbackIsbn);
}

function extractOpenAiResponseText(response: OpenAI.Responses.Response): string {
  if (response.output_text?.trim()) return response.output_text;
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && part.text?.trim()) return part.text;
    }
  }
  return '';
}

/** OpenAI Responses API with the built-in web search tool. */
async function lookupWithOpenAIWebSearch(
  variants: string[],
  preferredSystem: LibraryReadingLevelSystem,
): Promise<LibraryCatalogHit | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_BOOK_LOOKUP_MODEL?.trim() || 'gpt-4o-mini',
    tools: [{ type: 'web_search' }],
    input: [
      { role: 'system', content: buildIsbnSystemPrompt(preferredSystem) },
      { role: 'user', content: buildUserPrompt(variants) },
    ],
  });
  return parseAiHit(extractOpenAiResponseText(response), variants[0]!);
}

/** Gemini with Google Search grounding (text output; JSON parsed loosely). */
async function lookupWithGeminiWebSearch(
  variants: string[],
  preferredSystem: LibraryReadingLevelSystem,
): Promise<LibraryCatalogHit | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_BOOK_LOOKUP_MODEL?.trim() || 'gemini-flash-latest';
  const model = genAI.getGenerativeModel({
    model: modelName,
    // Gemini 2.x+ uses googleSearch; googleSearchRetrieval is deprecated and 404s on newer models.
    tools: [{ googleSearch: {} } as never],
    systemInstruction: buildIsbnSystemPrompt(preferredSystem),
    generationConfig: { temperature: 0 },
  });
  const result = await model.generateContent(buildUserPrompt(variants));
  return parseAiHit(result.response.text(), variants[0]!);
}

/** True when at least one AI provider key is configured for ISBN fallback lookup. */
export function isAiIsbnLookupConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
}

/** Best-effort AI web-search identification of a book by ISBN. */
export async function lookupBookByIsbnAi(
  variants: string[],
  preferredSystem: LibraryReadingLevelSystem = 'auto',
): Promise<AiIsbnLookupOutcome> {
  if (!variants.length) {
    return { hit: null, status: 'not_configured' };
  }
  if (!isAiIsbnLookupConfigured()) {
    return { hit: null, status: 'not_configured' };
  }

  const errors: string[] = [];

  try {
    const openai = await lookupWithOpenAIWebSearch(variants, preferredSystem);
    if (openai) return { hit: openai, status: 'matched' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('AI ISBN web search (OpenAI) failed:', err);
    errors.push(`OpenAI: ${msg}`);
  }

  try {
    const gemini = await lookupWithGeminiWebSearch(variants, preferredSystem);
    if (gemini) return { hit: gemini, status: 'matched' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('AI ISBN web search (Gemini) failed:', err);
    errors.push(`Gemini: ${msg}`);
  }

  if (errors.length) {
    return { hit: null, status: 'error', error: errors.join('; ') };
  }
  return { hit: null, status: 'no_match' };
}

async function lookupTitleWithOpenAI(
  title: string,
  preferredSystem: LibraryReadingLevelSystem,
): Promise<LibraryCatalogHit | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_BOOK_LOOKUP_MODEL?.trim() || 'gpt-4o-mini',
    tools: [{ type: 'web_search' }],
    input: [
      { role: 'system', content: buildTitleSystemPrompt(preferredSystem) },
      { role: 'user', content: buildTitleUserPrompt(title) },
    ],
  });
  return parseAiHit(extractOpenAiResponseText(response), '');
}

async function lookupTitleWithGemini(
  title: string,
  preferredSystem: LibraryReadingLevelSystem,
): Promise<LibraryCatalogHit | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_BOOK_LOOKUP_MODEL?.trim() || 'gemini-flash-latest';
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ googleSearch: {} } as never],
    systemInstruction: buildTitleSystemPrompt(preferredSystem),
    generationConfig: { temperature: 0 },
  });
  const result = await model.generateContent(buildTitleUserPrompt(title));
  return parseAiHit(result.response.text(), '');
}

/** Best-effort AI web-search identification of a book by typed title. */
export async function lookupBookByTitleAi(
  title: string,
  preferredSystem: LibraryReadingLevelSystem = 'auto',
): Promise<AiIsbnLookupOutcome> {
  const trimmed = title.trim();
  if (!trimmed) return { hit: null, status: 'not_configured' };
  if (!isAiIsbnLookupConfigured()) return { hit: null, status: 'not_configured' };

  const errors: string[] = [];

  try {
    const openai = await lookupTitleWithOpenAI(trimmed, preferredSystem);
    if (openai) return { hit: openai, status: 'matched' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('AI title web search (OpenAI) failed:', err);
    errors.push(`OpenAI: ${msg}`);
  }

  try {
    const gemini = await lookupTitleWithGemini(trimmed, preferredSystem);
    if (gemini) return { hit: gemini, status: 'matched' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('AI title web search (Gemini) failed:', err);
    errors.push(`Gemini: ${msg}`);
  }

  if (errors.length) {
    return { hit: null, status: 'error', error: errors.join('; ') };
  }
  return { hit: null, status: 'no_match' };
}

