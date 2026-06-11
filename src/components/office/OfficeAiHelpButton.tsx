'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, SendHorizonal, Sparkles, Trash2 } from 'lucide-react';
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

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function OfficeAiHelpButton() {
  const { schoolId, loginState, userName } = useAppContext();
  const { features, marksLabels } = useOfficePortalChrome();
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const welcome = useMemo<ChatMessage>(
    () => ({
      role: 'assistant',
      content:
        `Hi${userName ? ` ${userName.split(/\s+/)[0]}` : ''}! I'm your School Office assistant. Ask about billing balances, overdue invoices, ${marksLabels.missing}, student rosters, family contacts, or how to use any Office screen.`,
    }),
    [marksLabels.missing, userName],
  );

  const [open, setOpen] = useState(false);
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
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          loginState,
          product: 'office',
          model: getArcadeAiModelFromStorage(),
          messages: nextForApi.slice(1).slice(-10),
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
  }, [authFetch, input, loginState, messages, schoolId, sending, toast]);

  if (!features.aiHelp) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-lg"
        onClick={() => setOpen(true)}
        aria-label="Office AI help"
        title="AI help"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              Office AI help
            </SheetTitle>
            <SheetDescription>
              Ask questions about billing, rosters, {marksLabels.plural}, and workflows.
            </SheetDescription>
          </SheetHeader>

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
                  {m.content}
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
                placeholder="e.g. Which families are overdue on billing?"
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
        </SheetContent>
      </Sheet>
    </>
  );
}
