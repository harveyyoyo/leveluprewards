import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const defaultOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

export async function POST(req: NextRequest) {
    try {
        const guarded = await guardAiRoute(req, { requireSchoolStaff: true, maxRequests: 8, maxBodyBytes: 48 * 1024 });
        if (!guarded.ok) return guarded.response;
        const { prompt, model = 'gemini-2.5-flash' } = guarded.value.body;

        if (typeof prompt !== 'string' || !prompt.trim()) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }
        const selectedModel = typeof model === 'string' ? model : 'gemini-2.5-flash';

        const systemInstruction = `You are a scheduling assistant. Your task is to parse a raw text schedule into a structured array of JSON class objects.
        
Extract or infer the class names and their start and end times. Formats may vary. If no end time is provided, assume a 45-minute duration.

You MUST reply with ONLY a JSON array containing objects matching this schema:
[
  {
    "className": "string (e.g. '1st Period English')",
    "startTime": "string (HH:mm in 24-hour format, e.g. '08:00')",
    "endTime": "string (HH:mm in 24-hour format, e.g. '08:45')"
  }
]
`;

        let responseText = '';

        if (selectedModel.startsWith('gpt')) {
            const effectiveKey = process.env.OPENAI_API_KEY;
            if (!effectiveKey) {
                return NextResponse.json({ error: 'OpenAI API key configuration error (Server)' }, { status: 500 });
            }

            const response = await defaultOpenAI.chat.completions.create({
                model: selectedModel as any,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemInstruction + '\nEnsure your output is wrapped in an object like { "classes": [...] } so it is valid JSON.' },
                    { role: 'user', content: `Parse this schedule:\n\n${prompt}` }
                ]
            });
            responseText = response.choices[0].message.content || '{"classes":[]}';
        } else {
            const effectiveKey = process.env.GEMINI_API_KEY;

            if (!effectiveKey) {
                console.error('GEMINI_API_KEY is missing from environment variables (Server)');
                return NextResponse.json({ error: 'API key configuration error' }, { status: 500 });
            }

            const activeModel = genAI.getGenerativeModel({
                model: selectedModel,
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                systemInstruction,
            });

            const result = await activeModel.generateContent(`Parse this schedule:\n\n${prompt}`);
            responseText = result.response.text();
        }

        try {
            let parsed = JSON.parse(responseText);
            // Handle different JSON structures returned by models
            if (parsed.classes && Array.isArray(parsed.classes)) {
                parsed = parsed.classes;
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
        console.error('Error in /api/parse-schedule:', error);
        return NextResponse.json({ error: 'Failed to process schedule' }, { status: 500 });
    }
}
