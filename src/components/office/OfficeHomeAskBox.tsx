'use client';

import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { askOfficeAssistant, setOfficeAnswerSpot } from '@/lib/office/officeAssistantAsk';

// Kept the same between renders, so the answer doesn't jump around while you type.
const homeAnswerSpot = (el: HTMLDivElement | null) => setOfficeAnswerSpot('home', el);
const headerAnswerSpot = (el: HTMLDivElement | null) => setOfficeAnswerSpot('header', el);

const SUGGESTIONS = ['Who is absent today?', 'Families who owe more than $100', 'How do I add a student?'];

/**
 * The middle of the office Home page: one big box, ready to type into, like a search home page.
 * Pressing Enter pops up the answer.
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
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {firstName ? `Hi ${firstName}, how can I help?` : 'How can I help?'}
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

      {/* The answer shows here, right under the question. */}
      <div ref={homeAnswerSpot} className="mt-6 w-full max-w-2xl empty:hidden" />
    </section>
  );
}

/** The same ask box, small, for the header on every page but Home. */
export function OfficeHeaderAskBox() {
  const { features } = useOfficePortalChrome();
  const [question, setQuestion] = useState('');

  if (!features.aiHelp) return null;

  return (
    <div className="relative hidden w-64 shrink-0 sm:block lg:w-80">
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!question.trim()) return;
        askOfficeAssistant(question);
        setQuestion('');
      }}
    >
      <div className="flex items-center gap-2 rounded-full bg-white py-1 pl-3.5 pr-1 ring-1 ring-slate-200 transition-shadow focus-within:shadow-md focus-within:ring-teal-400 dark:bg-slate-900 dark:ring-slate-700 dark:focus-within:ring-teal-600">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          aria-label="Ask a question"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm text-slate-900 outline-none placeholder:text-muted-foreground dark:text-white"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          aria-label="Ask"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
      {/* The answer drops down here, right under the question. */}
      <div
        ref={headerAnswerSpot}
        className="absolute right-0 top-full z-40 mt-2 w-[26rem] max-w-[calc(100vw-2rem)] empty:hidden"
      />
    </div>
  );
}
