import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerSchoolStaff } from '@/lib/apiAuth';
import { extractTextFromDocumentBuffer } from '@/lib/server/extractDocumentText';

export const runtime = 'nodejs';

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    let schoolId = '';
    try {
      const form = await req.formData();
      const sid = form.get('schoolId');
      schoolId = typeof sid === 'string' ? sid.trim() : '';
      const auth = await verifyBearerSchoolStaff(req, schoolId, { maxRequests: 12 });
      if (!auth.ok) return auth.response;

      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length === 0) {
        return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
      }
      if (buf.length > MAX_BYTES) {
        return NextResponse.json({ error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB).` }, { status: 413 });
      }

      const text = await extractTextFromDocumentBuffer(file.name, buf);
      if (!text.trim()) {
        return NextResponse.json({ error: 'No text could be extracted from this document.' }, { status: 422 });
      }

      return NextResponse.json({
        filename: file.name,
        text,
        length: text.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Unsupported file type')) {
        return NextResponse.json({ error: msg }, { status: 415 });
      }
      throw e;
    }
  } catch (error) {
    console.error('extract-document:', error);
    return NextResponse.json({ error: 'Failed to extract document text.' }, { status: 500 });
  }
}
