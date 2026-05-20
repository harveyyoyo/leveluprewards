'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, SendHorizonal, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/appBranding';
import { RemoteSupportSharePanel } from '@/components/RemoteSupportSharePanel';
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
  content: `Hi! I can help you use ${APP_NAME}: the Admin, Teacher, and student tools; printing coupons; the rewards shop; settings; and Admin → Notifications (email, SMS, and WhatsApp alerts). What would you like to know?`,
};

/** Admin, teacher, and other staff sign-in roles (not students). */
const STAFF_OR_ADMIN_LOGIN = new Set([
  'admin',
  'teacher',
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'office',
  'houseCoordinator',
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
  const [tab, setTab] = useState('ai');
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [supportText, setSupportText] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { loginState, isInitialized, isUserLoading, schoolId, userName } = useAppContext();
  const { settings } = useSettings();
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const show =
    isInitialized &&
    !isUserLoading &&
    !isPublicRoute(pathname) &&
    STAFF_OR_ADMIN_LOGIN.has(loginState);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open && tab === 'ai') scrollToBottom();
  }, [open, tab, messages, sending, scrollToBottom]);

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
      const model =
        (typeof window !== 'undefined' ? localStorage.getItem('arcade_ai_model') : null) ||
        'gpt-4o-mini';
      const res = await authFetch('/api/staff-help-chat', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          pathname,
          loginState,
          model,
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
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        configured?: boolean;
      };

      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Could not send',
          description:
            data.error ||
            (res.status === 429
              ? 'Too many requests. Please wait and try again.'
              : 'Something went wrong.'),
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

  const isApp = settings.displayMode === 'app';
  const canSend = Boolean(schoolId) && !sending;
  const canSendSupport = Boolean(schoolId) && !supportSending && supportText.trim().length > 0;

  // If a sponsor banner is active on bottom-positioned kiosk screens, lift the floating chat button
  // so it never competes with fixed banners (and stays reachable on touch devices).
  const localDate = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"
  const matchedSponsorSchedule = (settings.kioskSponsorSchedules || []).find((s) => s.date === localDate);
  const sponsorHasContent =
    !!matchedSponsorSchedule ||
    !!settings.kioskSponsorMessage?.trim() ||
    !!settings.kioskSponsorLogoUrl?.trim() ||
    !!settings.kioskSponsorLink?.trim();
  const sponsorBannerActive = settings.kioskSponsorEnabled && sponsorHasContent;
  const sponsorBannerBottom = (settings.kioskSponsorPosition || 'bottom') === 'bottom';
  const liftForSponsorBottom = sponsorBannerActive && sponsorBannerBottom;

  return (
    <>
      <div
        className={cn(
          'no-print fixed right-4 z-[260] flex flex-col items-end gap-2',
          isApp
            ? liftForSponsorBottom
              ? 'bottom-[calc(6rem+3.75rem+env(safe-area-inset-bottom,0px))]'
              : 'bottom-[calc(6rem+env(safe-area-inset-bottom,0px))]'
            : liftForSponsorBottom
              ? 'bottom-[calc(4.75rem+3.75rem+env(safe-area-inset-bottom,0px))]'
              : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]',
        )}
      >
        <Button
          type="button"
          size="lg"
          className="h-12 w-12 rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.35),0_8px_28px_hsl(222_47%_11%/0.18)] hover:bg-primary/90 hover:shadow-[0_6px_18px_hsl(var(--primary)/0.42),0_12px_32px_hsl(222_47%_11%/0.22)]"
          onClick={() => setOpen(true)}
          aria-label="Open help and support"
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
            <SheetHeader className="text-left space-y-1 p-0 pr-8">
              <SheetTitle>Help and support</SheetTitle>
              <SheetDescription>
                AI answers about the app, or send a note to tech support (WhatsApp).
              </SheetDescription>
            </SheetHeader>
            {!schoolId && (
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-3">
                School context is not loaded yet. Open this panel from a school page after sign-in.
              </p>
            )}
          </div>

          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex flex-col flex-1 min-h-0"
          >
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
              <div className="flex items-center justify-end px-4 pb-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-muted-foreground"
                  onClick={clearChat}
                  aria-label="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear chat
                </Button>
              </div>

              <ScrollArea className="flex-1 min-h-0 px-4">
                <div className="py-2 space-y-3 pr-2 pb-4">
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
                    The platform operator receives this on{' '}
                    <span className="font-medium text-foreground">WhatsApp</span> when the server is configured
                    (Twilio WhatsApp or CallMeBot).
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
                  onChange={(e) => setSupportText(e.target.value)}
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
