'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, SendHorizonal, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I can help you use levelUp EDU—where to find Admin, Teacher, and student tools, printing coupons, the prize shop, and settings. What would you like to know?',
};

/** Admin, teacher, and other staff sign-in roles (not students). */
const STAFF_OR_ADMIN_LOGIN = new Set([
  'admin',
  'teacher',
  'secretary',
  'prizeClerk',
  'reports',
  'school',
]);

function isPublicRoute(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/developer' ||
    pathname.startsWith('/s/')
  );
}

export function StaffAiHelpButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { loginState, isInitialized, isUserLoading, schoolId } = useAppContext();
  const { settings } = useSettings();
  const authFetch = useAuthFetch();

  const show =
    isInitialized &&
    !isUserLoading &&
    !isPublicRoute(pathname) &&
    STAFF_OR_ADMIN_LOGIN.has(loginState);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages, sending, scrollToBottom]);

  const clearChat = useCallback(() => {
    setMessages([WELCOME]);
    setInput('');
  }, []);

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
          model: 'gemini-2.5-flash',
          messages: nextForApi,
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

      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply! }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'No response was returned. Please try again.' },
        ]);
      }
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
  }, [authFetch, input, loginState, messages, pathname, schoolId, sending]);

  if (!show) return null;

  const isApp = settings.displayMode === 'app';
  const canSend = Boolean(schoolId) && !sending;

  return (
    <>
      <div
        className={cn(
          'no-print fixed right-4 z-[105] flex flex-col items-end gap-2',
          isApp
            ? 'bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]'
            : 'bottom-6',
        )}
      >
        <Button
          type="button"
          size="lg"
          className="h-12 w-12 rounded-full shadow-lg border border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setOpen(true)}
          aria-label="Open AI help chat"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
        </Button>
      </div>

      <Sheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0 gap-0 h-[100dvh] max-h-[100dvh]"
        >
          <div className="p-6 pb-3 border-b border-border/60 shrink-0">
            <div className="flex items-start justify-between gap-2 pr-8">
              <SheetHeader className="text-left space-y-1 p-0">
                <SheetTitle>AI help</SheetTitle>
                <SheetDescription>
                  Chat about levelUp EDU. Do not paste student or staff personal data.
                </SheetDescription>
              </SheetHeader>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={clearChat}
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {!schoolId && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                School context is not loaded yet. Open this panel from a school page after sign-in.
              </p>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 px-4">
            <div className="py-4 space-y-3 pr-2">
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                  className={cn(
                    'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'ml-8 bg-primary text-primary-foreground'
                      : 'mr-4 bg-muted text-foreground border border-border/50',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mr-4">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/60 shrink-0 space-y-2 bg-background/95 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={schoolId ? 'Ask how to use the app…' : 'Waiting for school session…'}
              disabled={!canSend}
              rows={2}
              className="min-h-[72px] resize-none rounded-xl"
              maxLength={3200}
              aria-label="Message to AI assistant"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
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
        </SheetContent>
      </Sheet>
    </>
  );
}
