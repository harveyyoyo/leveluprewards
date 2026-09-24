'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleHelp, Loader2, SendHorizonal, Trash2 } from 'lucide-react';
import { OfficeGuidePanel } from '@/components/office/OfficeGuideSection';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/components/AppProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getArcadeAiModelFromStorage } from '@/lib/aiModelPreference';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { buildOfficeAiHelpContext } from '@/lib/office/officeHelpContext';
import {
  OFFICE_ASSISTANT_PAGE_LABEL,
  describeOfficeAssistantView,
  findClassByAskedName,
  officeAssistantViewHref,
  parseOfficeAssistantDecision,
  type OfficeAssistantView,
} from '@/lib/office/officeAssistantView';
import {
  countLabel,
  readOfficeAssistantResults,
  subscribeOfficeAssistantResults,
  type OfficeAssistantOpenTarget,
  type OfficeAssistantResults,
} from '@/lib/office/officeAssistantResults';
import { officePublicHref } from '@/lib/officePublicUrl';
import { useRouter } from 'next/navigation';

/**
 * `list` is set when the assistant opened a filtered list in the app: the page reports what it
 * found (`results`), and the chat shows the same names. `href` opens it again.
 */
type ChatList = {
  href: string;
  askAt: string;
  page: string;
  /** The filters behind this list, so a follow-up ("only grade 8") can narrow it. */
  view: OfficeAssistantView;
  results: OfficeAssistantResults | null;
  timedOut?: boolean;
};
/** Set when Help read records to answer ("summarize…", "who has falling grades…"). */
type ChatReading = {
  studentIds: string[];
  read?: { students: number; topics: string[] };
};
type ChatMessage = { role: 'user' | 'assistant'; content: string; list?: ChatList; reading?: ChatReading };

const TOPIC_WORDS: Record<string, string> = {
  attendance: 'attendance',
  grades: 'grades',
  frontdesk: 'front desk entries',
  notes: 'notes',
  health: 'health details',
  transportation: 'transportation records',
};

function joinWords(words: string[]): string {
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** How long to wait for the page to report before just pointing at it. */
const RESULTS_WAIT_MS = 10_000;

function withAskAt(href: string, askAt: string): string {
  return /[?&]askAt=\d+/.test(href) ? href.replace(/askAt=\d+/, `askAt=${askAt}`) : `${href}&askAt=${askAt}`;
}

/** The answer under a "show me" question: how many, the first few names, and where the rest are. */
function ChatListAnswer({
  list,
  onShowAgain,
  onOpen,
}: {
  list: ChatList;
  onShowAgain: () => void;
  onOpen: (target: OfficeAssistantOpenTarget) => void;
}) {
  const r = list.results;
  return (
    <div className="mt-1.5 space-y-1.5">
      {!r && !list.timedOut ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Finding them…
        </p>
      ) : !r ? (
        <p>It&apos;s open on the {list.page} page.</p>
      ) : r.status === 'unavailable' ? (
        <p>{r.message}</p>
      ) : r.total === 0 ? (
        <p>None found.</p>
      ) : (
        <>
          <p className="font-semibold">{countLabel(r.total, r.noun)}</p>
          <ul className="space-y-0.5">
            {r.rows.map((row) => (
              <li key={row.id} className="flex flex-wrap gap-x-1.5">
                {row.open ? (
                  <button
                    type="button"
                    onClick={() => onOpen(row.open!)}
                    className="text-left font-medium text-teal-800 hover:underline dark:text-teal-300"
                    title={row.open.kind === 'family' ? 'Open family' : 'Open student'}
                  >
                    {row.name}
                  </button>
                ) : (
                  <span>{row.name}</span>
                )}
                {row.detail ? <span className="text-muted-foreground">· {row.detail}</span> : null}
              </li>
            ))}
          </ul>
          {r.total > r.rows.length ? (
            <p className="text-xs text-muted-foreground">
              …and {r.total - r.rows.length} more on the {list.page} page.
            </p>
          ) : null}
        </>
      )}
      <button
        type="button"
        onClick={onShowAgain}
        className="block text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
      >
        Show in the app again
      </button>
    </div>
  );
}

/**
 * Keeps the model's line breaks, turns `**bold**` into bold instead of showing the stars, and
 * shows `[[student:ID]]` (from an answer that read records) as that student's name — looked up
 * here in the app, since the AI never had names.
 */
function ChatText({
  text,
  nameOf,
  onOpenStudent,
}: {
  text: string;
  nameOf?: (id: string) => string | null;
  onOpenStudent?: (id: string) => void;
}) {
  return (
    <span className="whitespace-pre-line">
      {text.split(/(\[\[student:[^\]]+\]\]|\*\*[^*]+\*\*)/g).map((part, i) => {
        const student = /^\[\[student:([^\]]+)\]\]$/.exec(part);
        if (student) {
          const id = student[1]!;
          const name = nameOf?.(id) ?? 'a student';
          return onOpenStudent ? (
            <button
              key={i}
              type="button"
              onClick={() => onOpenStudent(id)}
              className="font-medium text-teal-800 hover:underline dark:text-teal-300"
            >
              {name}
            </button>
          ) : (
            <span key={i}>{name}</span>
          );
        }
        return part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part.replace(/^#{1,6}\s+/gm, '')
        );
      })}
    </span>
  );
}

export function OfficeAiHelpButton() {
  const { schoolId, loginState, userName } = useAppContext();
  const { features, settings } = useOfficePortalChrome();
  const portal = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const router = useRouter();

  const officeContext = useMemo(
    () =>
      buildOfficeAiHelpContext({
        students: shared.students,
        families: shared.families,
        billingAccounts: portal.billingAccounts,
        invoices: portal.invoices,
        useMarksTerminology: settings?.useMarksTerminology,
      }),
    [shared.students, shared.families, portal.billingAccounts, portal.invoices, settings?.useMarksTerminology],
  );

  const welcome = useMemo<ChatMessage>(
    () => ({
      role: 'assistant',
      content:
        `Hi${userName ? ` ${userName.split(/\s+/)[0]}` : ''}! Ask me for a list — like “families who owe more than $100” or “who is absent today” — and I'll answer here and open it in the app. Then narrow it down, like “only Grade 5”. Click a name to open their card.${
          features.aiRecords
            ? ' I can also think it through — like “summarize Mason Hall’s attendance and grades” or “which of these students are having a harder time lately?”'
            : ''
        } You can also ask how to do anything in the office.`,
    }),
    [userName, features.aiRecords],
  );

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'guide' | 'ask'>('guide');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages, sending]);

  useEffect(() => {
    setMessages([welcome]);
  }, [welcome]);

  const clearChat = useCallback(() => {
    setMessages([welcome]);
    setInput('');
  }, [welcome]);

  // Fill in each "show me" answer when its page reports what it found.
  useEffect(
    () =>
      subscribeOfficeAssistantResults((results) =>
        setMessages((prev) =>
          prev.map((m) => (m.list?.askAt === results.askAt ? { ...m, list: { ...m.list, results } } : m)),
        ),
      ),
    [],
  );

  /** If the page never reports (e.g. it was left right away), just point at it. */
  const stopWaitingLater = useCallback((askAt: string) => {
    window.setTimeout(
      () =>
        setMessages((prev) =>
          prev.map((m) =>
            m.list?.askAt === askAt && !m.list.results ? { ...m, list: { ...m.list, timedOut: true } } : m,
          ),
        ),
      RESULTS_WAIT_MS,
    );
  }, []);

  /** A name in a list answer: close Help and open that student's or family's card on this page. */
  const openCard = useCallback(
    (target: OfficeAssistantOpenTarget) => {
      const params = new URLSearchParams(window.location.search);
      for (const key of ['student', 'teacher', 'classSheet', 'family']) params.delete(key);
      params.set(target.kind, target.id);
      setOpen(false);
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const studentNameById = useMemo(
    () => new Map(shared.students.map((s) => [s.id, [s.firstName, s.lastName].filter(Boolean).join(' ')])),
    [shared.students],
  );
  const nameOf = useCallback((id: string) => studentNameById.get(id) ?? null, [studentNameById]);
  const openStudentCard = useCallback((id: string) => openCard({ kind: 'student', id }), [openCard]);

  /** Shows the students an answer was about on the Students page, behind Help. */
  const showStudentsInApp = useCallback(
    (studentIds: string[]) => {
      if (!schoolId || studentIds.length === 0) return;
      const params = new URLSearchParams({
        ask: `Students from Help's answer (${studentIds.length})`,
        ids: studentIds.join(','),
        askAt: String(Date.now()),
      });
      router.push(`${officePublicHref(schoolId, 'students')}?${params.toString()}`);
    },
    [router, schoolId],
  );

  const showAgain = useCallback(
    (index: number) => {
      const list = messages[index]?.list;
      if (!list) return;
      const askAt = String(Date.now());
      const href = withAskAt(list.href, askAt);
      setMessages((prev) =>
        prev.map((m, i) => (i === index && m.list ? { ...m, list: { ...m.list, href, askAt, results: null, timedOut: false } } : m)),
      );
      stopWaitingLater(askAt);
      router.push(href);
    },
    [messages, router, stopWaitingLater],
  );

  const send = useCallback(async () => {
    const text = input.replace(/\u0000/g, '').trim();
    if (!text || !schoolId || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextForApi = [...messages, userMsg];
    const lastList = [...messages].reverse().find((m) => m.list)?.list ?? null;
    const openStudentId = new URLSearchParams(window.location.search).get('student');
    setMessages(nextForApi);
    setInput('');
    setSending(true);

    // First: is this a "show me …" question the app can answer as a filtered list? Only the
    // question and class names go to the AI; the app itself finds the matching records.
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const viewRes = await authFetch('/api/office/assistant-view', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          question: text,
          today,
          classNames: shared.classes.map((c) => c.name),
          // Only the filters of the last list (never its names), for follow-ups like "only grade 8".
          previous: lastList?.view ?? null,
          // Whether "thinking" questions may read records (re-checked on the server) and
          // whether "this student" means anyone.
          canReason: features.aiRecords,
          studentOpen: !!openStudentId,
        }),
      });
      // Re-check the reply here too: only known pages and filters are ever opened.
      const decision = viewRes.ok ? parseOfficeAssistantDecision(await viewRes.json().catch(() => null)) : null;

      if (decision?.type === 'reason' && features.aiRecords) {
        const { scope } = decision.reason;
        const listIds = lastList?.results?.status === 'ready' ? (lastList.results.studentIds ?? []) : [];
        const studentIds = scope === 'current-student' ? (openStudentId ? [openStudentId] : []) : scope === 'list-on-screen' ? listIds : [];
        const res = await authFetch('/api/office/assistant-reason', {
          method: 'POST',
          body: JSON.stringify({ schoolId, question: text, today, reason: decision.reason, studentIds, changedBy: userName ?? null }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          type?: string;
          answer?: string;
          message?: string;
          name?: string;
          studentIds?: string[];
          read?: { students: number; topics: string[] };
          error?: string;
        };
        const reply: ChatMessage =
          data.type === 'answer' && data.answer
            ? { role: 'assistant', content: data.answer, reading: { studentIds: data.studentIds ?? [], read: data.read } }
            : data.type === 'off'
              ? {
                  role: 'assistant',
                  content: 'Reading records is turned off for this school. It can be turned on in Settings → “Assistant can read records”.',
                }
              : data.type === 'clarify'
                ? {
                    role: 'assistant',
                    content: `I found more than one student named “${data.name}”: ${(data.studentIds ?? [])
                      .map((id) => `[[student:${id}]]`)
                      .join(', ')}. Ask again with the full name.`,
                  }
                : { role: 'assistant', content: data.message || data.error || 'I couldn’t work that out. Try asking another way.' };
        setMessages((prev) => [...prev, reply]);
        setSending(false);
        // Show the students the answer is about in the app too (one student: their name is a link).
        if (reply.reading && reply.reading.studentIds.length > 1) showStudentsInApp(reply.reading.studentIds);
        return;
      }
      if (decision?.type === 'view') {
        const page = OFFICE_ASSISTANT_PAGE_LABEL[decision.view.page];
        const turnedOff =
          (decision.view.page === 'attendance' && settings?.features?.attendance === false) ||
          (decision.view.page === 'frontdesk' && settings?.features?.frontDesk === false) ||
          (decision.view.page === 'transportation' && settings?.features?.busInfo === false);
        // A class the school doesn't have would otherwise be ignored and show every class.
        const askedClass =
          decision.view.page === 'students' || decision.view.page === 'attendance' ? decision.view.className : null;
        const missingClass = askedClass && !findClassByAskedName(shared.classes, askedClass);
        const cannot = turnedOff
          ? `${page} is turned off for this school. It can be turned back on in Settings.`
          : missingClass
            ? `I couldn't find a class called “${askedClass}”. Check the name on the Classes page and ask again.`
            : null;
        if (cannot) {
          setMessages((prev) => [...prev, { role: 'assistant', content: cannot }]);
          setSending(false);
          return;
        }
        // Open the list behind this panel; the page reports what it found and the answer fills in.
        const askAt = String(Date.now());
        const href = withAskAt(officeAssistantViewHref(schoolId, decision.view, today), askAt);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            // Describes the filters actually applied, so a mismatch with the question shows.
            content: describeOfficeAssistantView(decision.view, today),
            list: { href, askAt, page, view: decision.view, results: readOfficeAssistantResults(askAt) },
          },
        ]);
        setSending(false);
        stopWaitingLater(askAt);
        router.push(href);
        return;
      }
    } catch {
      // Fall through to a written answer.
    }

    try {
      const res = await authFetch('/api/staff-help-chat', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          loginState,
          product: 'office',
          officeContext,
          model: getArcadeAiModelFromStorage(),
          // Just the words — never the names a list answer showed.
          messages: nextForApi.slice(1).slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach the assistant.');
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply?.trim() || 'No response.' }]);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'AI help unavailable',
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [
    authFetch,
    input,
    loginState,
    messages,
    officeContext,
    schoolId,
    sending,
    toast,
    shared.classes,
    router,
    stopWaitingLater,
    settings?.features?.attendance,
    settings?.features?.frontDesk,
    settings?.features?.busInfo,
    features.aiRecords,
    userName,
    showStudentsInApp,
  ]);

  const showAsk = features.aiHelp;
  const activeTab = showAsk ? tab : 'guide';

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs"
        onClick={() => setOpen(true)}
        aria-label="Help"
        title="Guide to every page, and questions"
      >
        <CircleHelp className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Help</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        {/* Light overlay so a list opened from a question stays visible beside the answer. */}
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md" overlayClassName="bg-slate-950/20">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <CircleHelp className="h-4 w-4 text-teal-600" />
              Help
            </SheetTitle>
            <SheetDescription>What each page is for, and answers to your questions.</SheetDescription>
            {showAsk ? (
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
                {(
                  [
                    ['guide', 'Guide'],
                    ['ask', 'Ask a question'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setTab(id)}
                    className={cn(
                      'rounded-lg py-1.5 text-sm font-medium transition-colors',
                      activeTab === id ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </SheetHeader>

          {activeTab === 'guide' ? (
            <OfficeGuidePanel schoolId={schoolId} onNavigate={() => setOpen(false)} />
          ) : (
          <>
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3 pb-4">
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={cn(
                    'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'ml-8 bg-teal-700 text-white'
                      : 'mr-4 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
                  )}
                >
                  <ChatText text={m.content} nameOf={nameOf} onOpenStudent={openStudentCard} />
                  {m.list ? (
                    <ChatListAnswer list={m.list} onShowAgain={() => showAgain(i)} onOpen={openCard} />
                  ) : null}
                  {m.reading ? (
                    <div className="mt-1.5 space-y-1">
                      {m.reading.read ? (
                        <p className="text-xs text-muted-foreground">
                          Read {joinWords(m.reading.read.topics.map((t) => TOPIC_WORDS[t] ?? t))} for{' '}
                          {countLabel(m.reading.read.students, ['student', 'students'])}. Names and contact details
                          weren&apos;t shared with the AI.
                        </p>
                      ) : null}
                      {m.reading.studentIds.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => showStudentsInApp(m.reading!.studentIds)}
                          className="block text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
                        >
                          Show these {m.reading.studentIds.length} students in the app
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {sending ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4 space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Show families who owe more than $100"
                className="min-h-[72px] resize-none rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                <Button type="button" size="icon" className="rounded-xl" disabled={sending || !input.trim()} onClick={() => void send()}>
                  <SendHorizonal className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" className="rounded-xl" onClick={clearChat} aria-label="Clear chat">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
