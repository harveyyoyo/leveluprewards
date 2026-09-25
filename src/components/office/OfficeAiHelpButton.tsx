'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getArcadeAiModelFromStorage } from '@/lib/aiModelPreference';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { buildOfficeAiHelpContext } from '@/lib/office/officeHelpContext';
import {
  OFFICE_ASSISTANT_PAGE_LABEL,
  describeOfficeAssistantView,
  findClassByAskedName,
  findTeacherByAskedName,
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
import { subscribeOfficeAssistantAsk, useOfficeAnswerSpot } from '@/lib/office/officeAssistantAsk';
import { officePublicHref } from '@/lib/officePublicUrl';
import { officeGoHref } from '@/lib/office/officeNav';
import { officeLocalIsoDate } from '@/lib/office/officeUtils';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { OfficeAssistantListPreview, officeAssistantViewHasList } from '@/components/office/OfficeAssistantListPreview';
import { usePathname, useRouter } from 'next/navigation';

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
  /** Not opened in the app yet: the names come from the same rules the page uses, until "See in app". */
  notOpened?: boolean;
};
/** Set when Help read records to answer ("summarize…", "who has falling grades…"). */
type ChatReading = {
  studentIds: string[];
  read?: { students: number; topics: string[] };
};
/** `goHref`: the page (and option) a how-to answer is about, opened with "Take me there". */
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  list?: ChatList;
  reading?: ChatReading;
  goHref?: string;
};

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

/** Whether the header's ask box is on screen (it's hidden below the `sm` width, on phones). */
const HEADER_BOX_MEDIA = '(min-width: 640px)';
function useHeaderBoxShown(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(HEADER_BOX_MEDIA);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(HEADER_BOX_MEDIA).matches,
    () => true,
  );
}

/** The big button under an answer that opens something in the app. */
function AppButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
      >
        {children}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** Pulls the `[[go:KEY]]` line off a how-to answer. */
function splitGoLine(reply: string): { text: string; goKey: string | null } {
  const go = /\[\[go:([a-z:-]+)\]\]/i.exec(reply);
  return {
    text: reply.replace(/\s*\[\[go:[^\]]*\]\]\s*/gi, '\n').trim(),
    goKey: go ? go[1]!.toLowerCase() : null,
  };
}

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
  // Some pages (the Transportation map) aren't lists: the answer just offers to open them.
  const opensOnly = !officeAssistantViewHasList(list.view);
  return (
    <div className="mt-1.5 space-y-1.5">
      {opensOnly ? null : !r && !list.timedOut ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Finding them…
        </p>
      ) : !r ? (
        <p>{list.notOpened ? `See them on the ${list.page} page.` : `It’s open on the ${list.page} page.`}</p>
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
      <AppButton onClick={onShowAgain}>See in app</AppButton>
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

/**
 * The office assistant. Questions come from Home's ask box; the matching page opens and the
 * answer pops up on top of it, with a box for follow-ups. It lives in the page frame so a
 * conversation survives moving between pages.
 */
export function OfficeAssistant() {
  const { schoolId, loginState, userName } = useAppContext();
  const { features, settings } = useOfficePortalChrome();
  const portal = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const router = useRouter();
  const { term: workingTerm } = useOfficeTerm(schoolId);

  const officeContext = useMemo(
    () =>
      buildOfficeAiHelpContext({
        students: shared.students,
        families: shared.families,
        billingAccounts: portal.billingAccounts,
        invoices: portal.invoices,
        useMarksTerminology: settings?.useMarksTerminology,
        gradeEntries: portal.gradeEntries,
        termLabel: workingTerm,
        classes: shared.classes,
      }),
    [shared.students, shared.families, shared.classes, portal.billingAccounts, portal.invoices, settings?.useMarksTerminology, portal.gradeEntries, workingTerm],
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
  // The answer shows under the box the question was asked in: Home's big box, or the header's.
  const homeSpot = useOfficeAnswerSpot('home');
  const headerBoxShown = useHeaderBoxShown();
  const headerSpotRaw = useOfficeAnswerSpot('header');
  const headerSpot = headerBoxShown ? headerSpotRaw : null;
  const spot = homeSpot ?? headerSpot;

  // The answer follows "Take me there" to the next page, but
  // closes when you go somewhere else, so an old answer doesn't drop down over every page.
  const pathname = usePathname();
  const followNextPage = useRef(false);
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!followNextPage.current) setOpen(false);
    followNextPage.current = false;
  }, [pathname]);
  const goFromAnswer = useCallback(
    (href: string) => {
      // Staying on the same page (a new filter) isn't a page change to follow.
      followNextPage.current = new URL(href, window.location.origin).pathname !== window.location.pathname;
      router.push(href);
    },
    [router],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open, messages, sending]);

  useEffect(() => {
    setMessages([welcome]);
  }, [welcome]);

  const clearChat = useCallback(() => {
    setMessages([welcome]);
    setInput('');
    setOpen(false);
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

  /** A name in an answer: close the answer and open that student's or family's card on this page. */
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

  /** Shows the students an answer was about on the Students page. */
  const showStudentsInApp = useCallback(
    (studentIds: string[]) => {
      if (!schoolId || studentIds.length === 0) return;
      const params = new URLSearchParams({
        ask: `Students from Help's answer (${studentIds.length})`,
        ids: studentIds.join(','),
        askAt: String(Date.now()),
      });
      // The list is the answer now, so the answer box gets out of the way.
      setOpen(false);
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
        prev.map((m, i) =>
          i === index && m.list ? { ...m, list: { ...m.list, href, askAt, timedOut: false, notOpened: false } } : m,
        ),
      );
      stopWaitingLater(askAt);
      // "See in app": the list is on screen now, so the answer box closes.
      setOpen(false);
      router.push(href);
    },
    [messages, router, stopWaitingLater],
  );

  /** Answers a question from the Home page's ask box. */
  const send = useCallback(async (asked: string) => {
    const text = asked.replace(/\u0000/g, '').trim();
    if (!text || !schoolId || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextForApi = [...messages, userMsg];
    const lastList = [...messages].reverse().find((m) => m.list)?.list ?? null;
    const openStudentId = new URLSearchParams(window.location.search).get('student');
    setMessages(nextForApi);
    setSending(true);

    // First: is this a "show me …" question the app can answer as a filtered list? Only the
    // question and class names go to the AI; the app itself finds the matching records.
    try {
      const today = officeLocalIsoDate();
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
        // Same for a teacher: otherwise the list is just empty ("no students found").
        const askedTeacher = decision.view.page === 'students' ? decision.view.teacher : null;
        const missingTeacher = askedTeacher && !findTeacherByAskedName(shared.teacherNameById, askedTeacher);
        const cannot = turnedOff
          ? `${page} is turned off for this school. It can be turned back on in Settings.`
          : missingClass
            ? `I couldn't find a class called “${askedClass}”. Check the name on the Classes page and ask again.`
            : missingTeacher
              ? `I couldn't find a teacher called “${askedTeacher}”. Check the name on the Teachers page and ask again.`
              : null;
        if (cannot) {
          setMessages((prev) => [...prev, { role: 'assistant', content: cannot }]);
          setSending(false);
          return;
        }
        // Answer with the names first; "See in app" opens the list.
        const askAt = String(Date.now());
        const href = withAskAt(officeAssistantViewHref(schoolId, decision.view, today), askAt);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            // Describes the filters actually applied, so a mismatch with the question shows.
            content: describeOfficeAssistantView(decision.view, today),
            list: { href, askAt, page, view: decision.view, results: readOfficeAssistantResults(askAt), notOpened: true },
          },
        ]);
        setSending(false);
        stopWaitingLater(askAt);
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
      // A how-to answer offers "Take me there" to the place it's about.
      const { text: content, goKey } = splitGoLine(data.reply?.trim() || 'No response.');
      const goHref = goKey ? (officeGoHref(schoolId, goKey, settings) ?? undefined) : undefined;
      setMessages((prev) => [...prev, { role: 'assistant', content, goHref }]);
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
    loginState,
    messages,
    officeContext,
    schoolId,
    sending,
    toast,
    shared.classes,
    shared.teacherNameById,
    stopWaitingLater,
    features.aiRecords,
    userName,
    settings,
  ]);

  const showAsk = features.aiHelp;

  // A question from the Home page's ask box. One asked while another is being answered waits its turn.
  const [askedFromHome, setAskedFromHome] = useState<string | null>(null);
  useEffect(
    () =>
      subscribeOfficeAssistantAsk((question) => {
        setOpen(true);
        setAskedFromHome(question);
      }),
    [],
  );
  useEffect(() => {
    if (!askedFromHome || !showAsk || sending) return;
    void send(askedFromHome);
    setAskedFromHome(null);
  }, [askedFromHome, showAsk, sending, send]);

  // Lists not opened in the app yet get their names here.
  const previews = messages.map((m) =>
    m.list?.notOpened && !m.list.results && !m.list.timedOut && officeAssistantViewHasList(m.list.view) ? (
      <OfficeAssistantListPreview key={m.list.askAt} view={m.list.view} askAt={m.list.askAt} />
    ) : null,
  );

  if (!showAsk || !open || messages.length <= 1) return <>{previews}</>;
  const latestQuestion = Math.max(1, messages.map((m) => m.role).lastIndexOf('user'));

  const ask = () => {
    if (!input.trim()) return;
    setAskedFromHome(input);
    setInput('');
  };

  // Not a full-screen cover: the page with the results stays visible and usable around it.
  // With no ask box on screen (a phone, where the header box is hidden) it sits in the corner.
  const card = (
    <section
      aria-label="Answer"
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700',
        homeSpot
          ? 'w-full text-left shadow-md'
          : headerSpot
            ? 'max-h-[70vh] w-full text-left shadow-2xl'
            : 'fixed inset-x-3 bottom-3 z-40 max-h-[70vh] shadow-2xl',
      )}
    >
      <div className="flex items-center gap-2 border-b px-4 py-2.5 dark:border-slate-800">
        <Sparkles className="h-4 w-4 text-teal-600" aria-hidden />
        <p className="flex-1 text-sm font-semibold">Answer</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* Only the latest question and its answer; earlier ones are kept for follow-ups. */}
        {messages.slice(latestQuestion).map((m, i) => {
          const index = i + latestQuestion;
          return (
            <div
              key={`${m.role}-${index}`}
              className={cn(
                'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'ml-auto w-fit max-w-[85%] bg-teal-700 text-white'
                  : 'mr-4 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
              )}
            >
              <ChatText text={m.content} nameOf={nameOf} onOpenStudent={openStudentCard} />
              {m.list ? <ChatListAnswer list={m.list} onShowAgain={() => showAgain(index)} onOpen={openCard} /> : null}
              {/* Not when it would just reload the page you're on (no form to open). */}
              {m.goHref && (m.goHref.includes('?') || new URL(m.goHref, 'http://x').pathname !== pathname) ? (
                <AppButton onClick={() => goFromAnswer(m.goHref!)}>Take me there</AppButton>
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
                    <AppButton onClick={() => showStudentsInApp(m.reading!.studentIds)}>
                      See these {m.reading.studentIds.length} students in app
                    </AppButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        {sending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="space-y-1.5 border-t px-3 py-2.5 dark:border-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        {/* On Home, follow-ups go in the big box right above. */}
        <div className={cn('flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-4 pr-1 dark:bg-slate-800', homeSpot && 'hidden')}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up… e.g. only Grade 5"
            aria-label="Ask a follow-up"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Ask"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={clearChat}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Start over
          </button>
        </div>
      </form>
    </section>
  );

  return (
    <>
      {previews}
      {spot ? createPortal(card, spot) : card}
    </>
  );
}
