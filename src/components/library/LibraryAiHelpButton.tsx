'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, RefreshCw, SendHorizonal, Sparkles, Trash2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/components/AppProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getArcadeAiModelFromStorage } from '@/lib/aiModelPreference';
import { canAccessStaffAiHelp } from '@/lib/staffAiHelpAccess';
import { RemoteSupportSharePanel } from '@/components/support/RemoteSupportSharePanel';
import type { LibraryTheme } from '@/lib/library/libraryThemes';
import type { LibraryAiHelpContext } from '@/lib/library/libraryHelpContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const LibraryAiHelpDataContext = createContext<LibraryAiHelpContext | null>(null);

export function LibraryAiHelpProvider({
  context,
  children,
}: {
  context: LibraryAiHelpContext;
  children: ReactNode;
}) {
  return <LibraryAiHelpDataContext.Provider value={context}>{children}</LibraryAiHelpDataContext.Provider>;
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I can help you use the school library: check books in and out, add titles, print labels, set loan rules, switch libraries, or run the student station. What would you like to know?',
};

const messageListMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const messageItemMotion = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 24 },
  },
};

export function LibraryAiHelpButton({
  theme,
  hideFloating = false,
  hideHeader = false,
}: {
  theme: LibraryTheme;
  hideFloating?: boolean;
  hideHeader?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('ai');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [supportText, setSupportText] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { loginState, isInitialized, isUserLoading, schoolId, userName } = useAppContext();
  const libraryContext = useContext(LibraryAiHelpDataContext);
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const show =
    isInitialized &&
    !isUserLoading &&
    canAccessStaffAiHelp(loginState);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open && tab === 'ai') scrollToBottom();
  }, [open, tab, messages, sending, scrollToBottom]);

  const welcome = useMemo<ChatMessage>(() => {
    const firstName = userName?.split(/\s+/)[0];
    const libraryName = libraryContext?.libraryName;
    return {
      role: 'assistant',
      content: `Hi${firstName ? ` ${firstName}` : ''}! I'm your library helper${libraryName ? ` for ${libraryName}` : ''}. Ask about checkouts, the catalog, labels, overdue books, or the student station.`,
    };
  }, [libraryContext?.libraryName, userName]);

  useEffect(() => {
    setMessages((prev) => (prev.length === 1 && prev[0]?.role === 'assistant' ? [welcome] : prev));
  }, [welcome]);

  const clearChat = useCallback(() => {
    setMessages([welcome]);
    setInput('');
  }, [welcome]);

  const [syncingKnowledge, setSyncingKnowledge] = useState(false);

  const handleSyncKnowledge = useCallback(async () => {
    if (syncingKnowledge || !schoolId) return;
    setSyncingKnowledge(true);
    try {
      const res = await authFetch('/api/staff-help-sync', {
        method: 'POST',
        body: JSON.stringify({ schoolId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        tabsCount?: number;
        routesCount?: number;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        toast({
          title: 'Could not update knowledge',
          description: data.error || 'Please check your connection and try again.',
          variant: 'destructive',
        });
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            data.message ||
            '✅ App knowledge updated! I have rescanned all screens, 17 Admin tabs, Office, Library, and Kiosk features.',
        },
      ]);
      toast({
        title: 'Internal guide updated',
        description: `Scanned ${data.routesCount || 27} screens, ${data.tabsCount || 17} Admin tabs, and Office modules.`,
      });
    } catch {
      toast({
        title: 'Could not update knowledge',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSyncingKnowledge(false);
    }
  }, [authFetch, schoolId, syncingKnowledge, toast]);

  const send = useCallback(async () => {
    const text = input.replace(/\u0000/g, '').trim();
    if (!text || !schoolId || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextForApi = [...messages, userMsg];
    setMessages(nextForApi);
    setInput('');
    setSending(true);

    try {
      const res = await authFetch('/api/staff-help-chat', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          pathname,
          loginState,
          product: 'library',
          libraryContext,
          model: getArcadeAiModelFromStorage(),
          messages: nextForApi.slice(1).slice(-10),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              data.error ||
              (res.status === 401
                ? 'Your session expired. Please refresh the page and sign in again.'
                : res.status === 403
                  ? 'You do not have permission to use this chat.'
                  : res.status === 429
                    ? 'Too many messages in a short time. Please wait a moment and try again.'
                    : 'Something went wrong. Please try again.'),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply?.trim() || 'No response was returned. Please try again.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Network error. Check your connection and try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [authFetch, input, libraryContext, loginState, messages, pathname, schoolId, sending]);

  const sendSupport = useCallback(async () => {
    const text = supportText.replace(/\u0000/g, '').trim();
    if (!text || !schoolId || supportSending) return;

    setSupportSending(true);
    try {
      const res = await authFetch('/api/tech-support-message', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          pathname,
          loginState,
          userLabel: userName || undefined,
          message: text,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Could not send',
          description:
            data.error ||
            (res.status === 429 ? 'Too many requests. Please wait and try again.' : 'Something went wrong.'),
        });
        return;
      }

      setSupportText('');
      toast({
        title: 'Message sent',
        description: 'Tech support was notified on WhatsApp.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Network error',
        description: 'Check your connection and try again.',
      });
    } finally {
      setSupportSending(false);
    }
  }, [authFetch, loginState, pathname, schoolId, supportSending, supportText, toast, userName]);

  if (!show) return null;

  const canSend = Boolean(schoolId) && !sending;
  const canSendSupport = Boolean(schoolId) && !supportSending && supportText.trim().length > 0;
  const showFloating = !hideFloating && !open;
  const showHeader = !hideHeader;

  if (!showFloating && !showHeader && !open) return null;

  return (
    <>
      {showHeader ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Ask the library helper"
          aria-label="Ask the library helper"
          className={cn(
            'h-9 px-3 rounded-full border-2 flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 text-xs font-bold shrink-0',
            theme.classes.card,
          )}
        >
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <span className="hidden sm:inline">Ask</span>
        </button>
      ) : null}

      <AnimatePresence>
        {showFloating ? (
          <motion.div
            key="library-ai-floating"
            initial={{ opacity: 0, scale: 0.86, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="no-print fixed right-4 z-[260] flex flex-col items-end gap-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
          >
            <Button
              type="button"
              size="lg"
              className="h-12 w-12 rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.35),0_8px_28px_hsl(222_47%_11%/0.18)] hover:bg-primary/90 hover:shadow-[0_6px_18px_hsl(var(--primary)/0.42),0_12px_32px_hsl(222_47%_11%/0.22)]"
              onClick={() => setOpen(true)}
              aria-label="Open library help"
              style={{ backgroundColor: theme.swatches.primary, borderColor: theme.swatches.primary }}
            >
              <motion.span layoutId="library-ai-sparkles" className="inline-flex">
                <Sparkles className="h-5 w-5" aria-hidden />
              </motion.span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0 gap-0 h-[100dvh] max-h-[100dvh]"
        >
          <div className="p-6 pb-3 border-b border-border/60 shrink-0">
            <SheetHeader className="text-left space-y-1 p-0 pr-8">
              <SheetTitle className="flex items-center gap-2">
                <motion.span layoutId="library-ai-sparkles" className="inline-flex text-primary">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </motion.span>
                Library help
              </SheetTitle>
              <SheetDescription>
                Ask how to use the library, or send a note to tech support.
              </SheetDescription>
            </SheetHeader>
            {!schoolId && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
                School context is not loaded yet. Open this panel after sign-in.
              </p>
            )}
          </div>

          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 pb-2 shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai">AI help</TabsTrigger>
                <TabsTrigger value="support">Tech support</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="ai"
              className="flex flex-col flex-1 min-h-0 mt-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <div className="flex items-center justify-between px-4 pb-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleSyncKnowledge}
                  disabled={syncingKnowledge}
                  aria-label="Update app knowledge"
                  title="Scan current screens and tabs so the assistant learns recent updates"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncingKnowledge && "animate-spin text-primary")} />
                  {syncingKnowledge ? 'Updating...' : 'Update app info'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearChat}
                  aria-label="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear chat
                </Button>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4">
                <motion.div
                  className="py-2 space-y-3 pr-2 pb-4"
                  variants={messageListMotion}
                  initial="hidden"
                  animate="show"
                >
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${index}-${message.role}-${message.content.slice(0, 24)}`}
                      variants={messageItemMotion}
                      className={cn(
                        'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'ml-8 bg-primary text-primary-foreground'
                          : 'mr-4 bg-muted text-foreground border border-border/50',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </motion.div>
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mr-4">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Thinking…
                    </div>
                  )}
                  <div ref={bottomRef} />
                </motion.div>
              </ScrollArea>

              <div className="p-4 border-t border-border/60 shrink-0 space-y-2 bg-background/95 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={schoolId ? 'Ask how to use the library…' : 'Waiting for school session…'}
                  disabled={!canSend}
                  rows={2}
                  className="min-h-[72px] resize-none rounded-xl"
                  maxLength={3200}
                  aria-label="Message to library helper"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void send()}
                    disabled={!canSend || !input.trim()}
                    className="rounded-full gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Sending
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="h-4 w-4" aria-hidden />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="support"
              className="flex flex-col flex-1 min-h-0 mt-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <ScrollArea className="flex-1 min-h-0 px-4">
                <div className="py-4 space-y-3 text-sm text-muted-foreground pr-2">
                  <RemoteSupportSharePanel pathname={pathname} />
                  <p>
                    Describe the issue or question. Your school ID and current page are included automatically.
                  </p>
                  <p className="text-xs">
                    Avoid sharing passwords or unnecessary personal data. Keep student details out unless your
                    policy requires it.
                  </p>
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border/60 shrink-0 space-y-2 bg-background/95 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Textarea
                  value={supportText}
                  onChange={(event) => setSupportText(event.target.value)}
                  placeholder={
                    schoolId ? 'Describe what you need from tech support…' : 'Waiting for school session…'
                  }
                  disabled={!schoolId || supportSending}
                  rows={5}
                  className="min-h-[120px] resize-none rounded-xl"
                  maxLength={2000}
                  aria-label="Tech support message"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void sendSupport()}
                    disabled={!canSendSupport}
                    className="rounded-full gap-2"
                  >
                    {supportSending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Sending
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="h-4 w-4" aria-hidden />
                        Send to WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
