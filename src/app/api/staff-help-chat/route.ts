export const dynamic = 'force-dynamic';

import { readFileSync } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { APP_NAME } from '@/lib/appBranding';
import { STAFF_HELP_AI_MODEL } from '@/lib/aiModelPreference';
import { buildStaffHelpCodeContextBlock } from '@/lib/staffHelpCodeContext';
import { canAccessStaffAiHelp } from '@/lib/staffAiHelpAccess';
import {
  formatOfficeAiHelpContextBlock,
  type OfficeAiHelpContext,
} from '@/lib/office/officeHelpContext';

const MAX_MESSAGES = 10;
const MAX_CONTENT_LEN = 2000;
const STAFF_HELP_MAX_OUTPUT_TOKENS = 480;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

const PRODUCT_KNOWLEDGE_REL = path.join('docs', 'staff-ai-product-knowledge.md');

function loadProductKnowledgeMarkdown(): string {
  const abs = path.join(process.cwd(), PRODUCT_KNOWLEDGE_REL);
  try {
    return readFileSync(abs, 'utf8').trim();
  } catch (e) {
    console.error('staff-help-chat: could not read', PRODUCT_KNOWLEDGE_REL, e);
    return `You are the in-app support assistant for **${APP_NAME}** (school rewards web app).
Answer only about using the product. If unsure, suggest a school admin or in-app tips.
(Product knowledge file is missing: add ${PRODUCT_KNOWLEDGE_REL})`;
  }
}

function buildSystemPrompt(context: {
  schoolId: string;
  pathname?: string;
  loginState?: string;
  product?: string;
  officeContext?: OfficeAiHelpContext;
  userMessage: string;
}): string {
  const pathLine = context.pathname?.trim()
    ? `The staff member appears to be viewing this path (may be approximate): ${context.pathname.trim()}`
    : 'Screen/route context was not provided.';
  const roleLine = context.loginState?.trim()
    ? `Their sign-in role in the app is: ${context.loginState.trim()}.`
    : 'Their sign-in role was not provided.';
  const productLine =
    context.product === 'office'
      ? 'They are using the **School Office** pillar (roster, billing, grades/marks, family profiles — not the rewards Admin portal).'
      : context.product?.trim()
        ? `Product context: ${context.product.trim()}.`
        : 'Product context was not provided (assume rewards Admin/Teacher unless the path includes /office/).';

  const base = loadProductKnowledgeMarkdown();
  const { block: codeBlock, files: codeFiles } = buildStaffHelpCodeContextBlock({
    pathname: context.pathname,
    userMessage: context.userMessage,
  });
  const codeLine =
    codeFiles.length > 0
      ? `Relevant UI source excerpts were loaded from ${codeFiles.length} file(s) in the deployed app.`
      : 'No matching UI source excerpts were loaded for this question.';

  const sections = [
    base,
    '',
    '**Session**',
    `- The opaque school id for this session is: ${context.schoolId}`,
    '',
    '**Context for this question**',
    `- ${pathLine}`,
    `- ${roleLine}`,
    `- ${productLine}`,
    `- ${codeLine}`,
    '',
    '**Response style**',
    '- Be brief: short paragraphs or bullets; avoid long preamble.',
  ];

  if (codeBlock) {
    sections.push('', codeBlock);
  }

  if (context.product === 'office' && context.officeContext) {
    sections.push('', formatOfficeAiHelpContextBlock(context.officeContext));
  }

  return sections.join('\n');
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
  if (
    /401|403|API key not valid|invalid api key|PERMISSION_DENIED|permission denied|billing|payment required|insufficient/i.test(
      msg,
    )
  ) {
    return 'The AI service is not correctly configured or authorized on the server. Ask your tech contact to check API keys and billing.';
  }
  if (/500|internal error|InternalServerError/i.test(msg)) {
    return 'The AI provider returned an error. Please try again in a few minutes.';
  }
  return 'Could not complete the chat request. If this keeps happening, ask your tech contact to check server logs for staff-help-chat.';
}

async function generateOpenAiReply(params: {
  systemInstruction: string;
  messages: ChatTurn[];
}): Promise<string> {
  const effectiveKey = process.env.OPENAI_API_KEY;
  if (!effectiveKey) {
    throw new Error('OpenAI API key is not configured on the server.');
  }

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: params.systemInstruction },
    ...params.messages.map((m) =>
      m.role === 'user'
        ? ({ role: 'user' as const, content: m.content })
        : ({ role: 'assistant' as const, content: m.content }),
    ),
  ];

  const openai = new OpenAI({ apiKey: effectiveKey });
  const response = await openai.chat.completions.create({
    model: STAFF_HELP_AI_MODEL,
    messages: openaiMessages,
    max_tokens: STAFF_HELP_MAX_OUTPUT_TOKENS,
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content?.trim() || '';
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

    const pathname = typeof body.pathname === 'string' ? body.pathname : undefined;
    const loginState = typeof body.loginState === 'string' ? body.loginState : undefined;
    const product = typeof body.product === 'string' ? body.product.trim() : undefined;
    const officeContext =
      product === 'office' && body.officeContext && typeof body.officeContext === 'object'
        ? (body.officeContext as OfficeAiHelpContext)
        : undefined;

    if (loginState && !canAccessStaffAiHelp(loginState)) {
      return NextResponse.json(
        { error: 'You do not have permission to use this chat.' },
        { status: 403 },
      );
    }

    const messages = normalizeMessages(body.messages);
    if (!messages) {
      return NextResponse.json(
        { error: 'messages must be a non-empty array ending with a user message.' },
        { status: 400 },
      );
    }

    const lastUserMessage = messages[messages.length - 1]!.content;
    const systemInstruction = buildSystemPrompt({
      schoolId,
      pathname,
      loginState,
      product,
      officeContext,
      userMessage: lastUserMessage,
    });

    const reply = await generateOpenAiReply({ systemInstruction, messages });

    if (!reply) {
      return NextResponse.json({ error: 'The model returned an empty reply.' }, { status: 500 });
    }

    return NextResponse.json({
      reply: reply.slice(0, 6000),
      model: STAFF_HELP_AI_MODEL,
    });
  } catch (e) {
    console.error('staff-help-chat:', e);
    return NextResponse.json({ error: userFacingChatError(e) }, { status: 500 });
  }
}
