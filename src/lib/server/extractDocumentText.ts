/**
 * Extract plain text from uploaded roster documents (server-side only).
 */
export async function extractTextFromDocumentBuffer(filename: string, buffer: Buffer): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const data = await parser.getText();
      return (data.text || '').trim();
    } finally {
      await parser.destroy();
    }
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
