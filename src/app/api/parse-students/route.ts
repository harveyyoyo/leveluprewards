import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { parseLooseJson } from '@/lib/server/looseJson';

export async function POST(req: NextRequest) {
    try {
        const guarded = await guardAiRoute(req, { requireSchoolStaff: true, maxRequests: 8, maxBodyBytes: 48 * 1024 });
        if (!guarded.ok) return guarded.response;
        const { prompt, model = 'gpt-4o-mini', classNames = [] } = guarded.value.body;

        if (typeof prompt !== 'string' || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }
        const selectedModel = typeof model === 'string' ? model : 'gpt-4o-mini';
        const safeClassNames = Array.isArray(classNames)
            ? classNames.filter((name): name is string => typeof name === 'string').slice(0, 200)
            : [];

        const classContext = safeClassNames.length > 0
            ? `Available classes to map students to: ${safeClassNames.join(', ')}.`
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

        if (selectedModel.startsWith('gpt')) {
            const effectiveKey = process.env.OPENAI_API_KEY;
            if (!effectiveKey) {
                return NextResponse.json({ error: 'OpenAI API key is not configured on the server' }, { status: 503 });
            }

            const openai = new OpenAI({ apiKey: effectiveKey });
            const response = await openai.chat.completions.create({
                model: selectedModel as any,
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
                model: selectedModel,
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                systemInstruction,
            });

            const result = await activeModel.generateContent(`Parse this student roster:\n\n${prompt}`);
            responseText = result.response.text();
        }

        try {
            const parsedRes = parseLooseJson(responseText);
            if (!parsedRes.ok) {
                console.error('Failed to parse AI response as JSON:', parsedRes.error, parsedRes.cleaned.slice(0, 600));
                return NextResponse.json(
                    {
                        error: `Invalid response format from AI (JSON parse failed: ${parsedRes.error}).`,
                    },
                    { status: 500 }
                );
            }
            let parsed: unknown = parsedRes.value;
            // Handle different JSON structures returned by models
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const maybeStudents = (parsed as Record<string, unknown>).students;
                if (Array.isArray(maybeStudents)) parsed = maybeStudents;
            }
            if (!Array.isArray(parsed)) {
                throw new Error("Parsed result is not an array");
            }
            return NextResponse.json(parsed);
        } catch (parseError) {
            console.error('Failed to normalize AI response:', parseError);
            return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error in /api/parse-students:', error);
        return NextResponse.json({ error: 'Failed to process student roster' }, { status: 500 });
    }
}
