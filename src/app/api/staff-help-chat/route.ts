export const dynamic = 'force-dynamic';

import { readFileSync } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const MAX_MESSAGES = 18;
const MAX_CONTENT_LEN = 3200;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

const PRODUCT_KNOWLEDGE_REL = path.join('docs', 'staff-ai-product-knowledge.md');

function loadProductKnowledgeMarkdown(): string {
  const abs = path.join(process.cwd(), PRODUCT_KNOWLEDGE_REL);
  try {
    return readFileSync(abs, 'utf8').trim();
  } catch (e) {
    console.error('staff-help-chat: could not read', PRODUCT_KNOWLEDGE_REL, e);
    return `You are the in-app support assistant for **levelUp EDU** (school rewards web app).
Answer only about using the product. If unsure, suggest a school admin or in-app tips.
(Product knowledge file is missing: add ${PRODUCT_KNOWLEDGE_REL})`;
  }
}

function buildSystemPrompt(context: {
  schoolId: string;
  pathname?: string;
  loginState?: string;
}): string {
  const pathLine = context.pathname?.trim()
    ? `The staff member appears to be viewing this path (may be approximate): ${context.pathname.trim()}`
    : 'Screen/route context was not provided.';
  const roleLine = context.loginState?.trim()
    ? `Their sign-in role in the app is: ${context.loginState.trim()}.`
    : 'Their sign-in role was not provided.';

  const base = loadProductKnowledgeMarkdown();

  return `${base}

**Session**
- The opaque school id for this session is: ${context.schoolId}

**Context for this question**
- ${pathLine}
- ${roleLine}`;
}

function normalizeMessages(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChatTurn[] = [];
  for (const item of raw.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    const trimmed = content.replace(/\u0000/g, '').trim();
    if (!trimmed) continue;
    out.push({
      role,
      content: trimmed.slice(0, MAX_CONTENT_LEN),
    });
  }
  if (out.length === 0) return null;

  while (out.length > 0 && out[0]!.role === 'assistant') {
    out.shift();
  }

  if (out.length === 0) return null;
  const last = out[out.length - 1];
  if (last.role !== 'user') {
    return null;
  }
  return out;
}

function userFacingChatError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|rate limit|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return 'The AI service is busy or rate-limited. Please wait a moment and try again.';
  }
  if (/503|UNAVAILABLE|overloaded|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg)) {
    return 'The AI service is temporarily unavailable. Please try again shortly.';
  }
  if (/blocked|safety|SAFETY|blocked by/i.test(msg)) {
    return 'The request could not be completed (content filter). Try rephrasing your question.';
  }
  if (/404|not found|is not found|unsupported model|INVALID_ARGUMENT/i.test(msg)) {
    return 'The configured AI model could not be reached. Try again later or contact tech support.';
  }
  return 'Could not complete the chat request.';
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: true,
      maxRequests: 30,
      maxBodyBytes: 64 * 1024,
    });
    if (!guarded.ok) return guarded.response;

    const { body, schoolId } = guarded.value;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required.' }, { status: 400 });
    }

    const modelRaw = body.model;
    const selectedModel =
      typeof modelRaw === 'string' && modelRaw.trim() ? modelRaw.trim() : 'gemini-2.5-flash';

    const pathname = typeof body.pathname === 'string' ? body.pathname : undefined;
    const loginState = typeof body.loginState === 'string' ? body.loginState : undefined;

    const messages = normalizeMessages(body.messages);
    if (!messages) {
      return NextResponse.json(
        { error: 'messages must be a non-empty array ending with a user message.' },
        { status: 400 },
      );
    }

    const systemInstruction = buildSystemPrompt({ schoolId, pathname, loginState });

    let reply = '';

    if (selectedModel.startsWith('gpt')) {
      const effectiveKey = process.env.OPENAI_API_KEY;
      if (!effectiveKey) {
        return NextResponse.json(
          { error: 'OpenAI API key is not configured on the server.' },
          { status: 503 },
        );
      }

      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemInstruction },
        ...messages.map((m) =>
          m.role === 'user'
            ? ({ role: 'user' as const, content: m.content })
            : ({ role: 'assistant' as const, content: m.content }),
        ),
      ];

      const openai = new OpenAI({ apiKey: effectiveKey });
      const response = await openai.chat.completions.create({
        model: selectedModel as 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 900,
        temperature: 0.4,
      });
      reply = response.choices[0]?.message?.content?.trim() || '';
    } else {
      const effectiveKey = process.env.GEMINI_API_KEY;
      if (!effectiveKey) {
        return NextResponse.json(
          { error: 'Gemini API key is not configured on the server.' },
          { status: 503 },
        );
      }

      const activeModel = genAI.getGenerativeModel({
        model: selectedModel,
        systemInstruction,
      });

      if (messages.length === 1) {
        const result = await activeModel.generateContent(messages[0]!.content);
        reply = result.response.text().trim();
      } else {
        const history = messages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts: [{ text: m.content }],
        }));
        const lastUser = messages[messages.length - 1]!.content;
        const chat = activeModel.startChat({ history });
        const result = await chat.sendMessage(lastUser);
        reply = result.response.text().trim();
      }
    }

    if (!reply) {
      return NextResponse.json({ error: 'The model returned an empty reply.' }, { status: 500 });
    }

    return NextResponse.json({
      reply: reply.slice(0, 8000),
      model: selectedModel,
    });
  } catch (e) {
    console.error('staff-help-chat:', e);
    return NextResponse.json({ error: userFacingChatError(e) }, { status: 500 });
  }
}
