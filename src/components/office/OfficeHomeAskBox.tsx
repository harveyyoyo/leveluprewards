'use client';

import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { askOfficeAssistant } from '@/lib/office/officeAssistantAsk';

const SUGGESTIONS = ['Who is absent today?', 'Families who owe more than $100', 'How do I add a student?'];

/**
 * The middle of the office Home page: one big box, ready to type into, like a search home page.
 * Pressing Enter opens Help on Ask with the answer.
 */
export function OfficeHomeAskBox() {
  const { userName } = useAppContext();
  const { features } = useOfficePortalChrome();
  const [question, setQuestion] = useState('');

  if (!features.aiHelp) return null;

  const ask = (text: string) => {
    if (!text.trim()) return;
    askOfficeAssistant(text);
    setQuestion('');
  };
  const firstName = userName?.split(/\s+/)[0];

  return (
    <section className="flex min-h-[42vh] flex-col items-center justify-center px-2 py-8" aria-label="Ask a question">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {firstName ? `Hi ${firstName}, what do you need?` : 'What do you need?'}
        </h2>
      </div>

      <form
        className="w-full max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5 shadow-md ring-1 ring-slate-200 transition-shadow focus-within:shadow-lg focus-within:ring-teal-400 dark:bg-slate-900 dark:ring-slate-700 dark:focus-within:ring-teal-600">
          <Sparkles className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Ask a question"
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-slate-900 outline-none placeholder:text-muted-foreground dark:text-white"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Ask"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="rounded-full bg-white px-3.5 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-teal-50 hover:text-teal-900 hover:ring-teal-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-teal-950/40"
          >
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
