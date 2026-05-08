export type LooseJsonParseResult =
  | { ok: true; value: unknown; cleaned: string }
  | { ok: false; error: string; cleaned: string };

function stripCodeFences(s: string): string {
  let out = s.trim();
  // ```json ... ``` or ``` ... ```
  if (out.startsWith('```')) {
    out = out.replace(/^```[a-zA-Z0-9_-]*\s*/m, '');
    out = out.replace(/```$/m, '').trim();
  }
  return out.trim();
}

function extractJsonSubstring(s: string): string {
  const trimmed = s.trim();
  const firstObj = trimmed.indexOf('{');
  const firstArr = trimmed.indexOf('[');
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start === -1) return trimmed;

  const lastObj = trimmed.lastIndexOf('}');
  const lastArr = trimmed.lastIndexOf(']');
  const end = Math.max(lastObj, lastArr);
  if (end === -1 || end < start) return trimmed.slice(start);
  return trimmed.slice(start, end + 1);
}

/**
 * Attempts to parse JSON returned by an LLM.
 * Handles common issues: code fences, leading/trailing prose, and "JSON-like" wrappers.
 */
export function parseLooseJson(raw: string): LooseJsonParseResult {
  const cleaned = extractJsonSubstring(stripCodeFences(raw || ''));
  try {
    return { ok: true, value: JSON.parse(cleaned), cleaned };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, cleaned };
  }
}

