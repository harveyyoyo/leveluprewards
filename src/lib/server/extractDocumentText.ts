/**
 * Extract plain text from uploaded roster documents (server-side only).
 */
export async function extractTextFromDocumentBuffer(filename: string, buffer: Buffer): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text?: string }>;
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  }

  if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  if (lower.endsWith('.txt') || lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    return buffer.toString('utf8').trim();
  }

  throw new Error('Unsupported file type. Use PDF, DOCX, TXT, or CSV.');
}
