import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';

const MAX_PROMPT_LENGTH = 20000; // rosters can be long; keep generous but bounded

export async function POST(req: NextRequest) {
    const guard = await guardAiRoute(req, { maxBodyBytes: 64 * 1024, requireSchoolStaff: true });
    if (!guard.ok) return guard.response;

    try {
        const payload = guard.value.body as { prompt?: unknown; model?: unknown; classNames?: unknown };
        const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';
        const model = typeof payload.model === 'string' && payload.model
            ? payload.model
            : 'gemini-2.5-flash';
        const classNames = Array.isArray(payload.classNames)
            ? (payload.classNames.filter((c) => typeof c === 'string') as string[])
            : [];

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
            return NextResponse.json({ error: 'Roster text is too long.' }, { status: 413 });
        }

        const classContext = classNames.length > 0 
            ? `Available classes to map students to: ${classNames.join(', ')}.` 
            : 'No specific class list provided. Extract class names if they exist in the text context.';

        const systemInstruction = `You are an administrative assistant mapping raw text rosters into structured JSON arrays of student objects.
        
${classContext}

Extract the student's first name, last name, and optionally their class from the provided raw text. Handle various inputs like "Doe, John - Math" or "Jane Smith (Science)". If no class is discernible, omit the field.

You MUST reply with ONLY a JSON array containing objects matching this schema:
[
  {
    "firstName": "string (e.g. 'John')",
    "lastName": "string (e.g. 'Doe')",
    "className": "string (optional, e.g. 'Math 101')"
  }
]
`;

        let responseText = '';

        if (model.startsWith('gpt')) {
            const effectiveKey = process.env.OPENAI_API_KEY;
            if (!effectiveKey) {
                return NextResponse.json({ error: 'OpenAI API key is not configured on the server' }, { status: 503 });
            }

            const openai = new OpenAI({ apiKey: effectiveKey });
            const response = await openai.chat.completions.create({
                model: model as any,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemInstruction + '\nEnsure your output is wrapped in an object like { "students": [...] } so it is valid JSON.' },
                    { role: 'user', content: `Parse this student roster:\n\n${prompt}` }
                ]
            });
            responseText = response.choices[0].message.content || '{"students":[]}';
        } else {
            const effectiveKey = process.env.GEMINI_API_KEY;

            if (!effectiveKey) {
                return NextResponse.json({ error: 'Gemini API key is not configured on the server' }, { status: 503 });
            }

            const genAI = new GoogleGenerativeAI(effectiveKey);
            const activeModel = genAI.getGenerativeModel({
                model: model,
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                systemInstruction,
            });

            const result = await activeModel.generateContent(`Parse this student roster:\n\n${prompt}`);
            responseText = result.response.text();
        }

        try {
            let parsed = JSON.parse(responseText);
            // Handle different JSON structures returned by models
            if (parsed.students && Array.isArray(parsed.students)) {
                parsed = parsed.students;
            }
            if (!Array.isArray(parsed)) {
                throw new Error("Parsed result is not an array");
            }
            return NextResponse.json(parsed);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', responseText);
            return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in /api/parse-students:', error);
        return NextResponse.json({ error: 'Failed to process student roster' }, { status: 500 });
    }
}
