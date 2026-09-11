'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyParentPortal } from '@/lib/parentPortal/parentPortalClient';
import { useTranslation } from '@/components/providers/LocaleProvider';

export function ParentPortalLogin({
  schoolId,
  onSignedIn,
}: {
  schoolId: string;
  onSignedIn: () => void;
}) {
  const [studentLookup, setStudentLookup] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  useEffect(() => { setChallengeId(''); setCode(''); setError(null); }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyParentPortal({
        schoolId, studentLookup: studentLookup.trim(), parentEmail: parentEmail.trim(),
        ...(challengeId ? { challengeId, code } : {}),
      });
      if (result.requiresCode && result.challengeId) {
        setChallengeId(result.challengeId);
        setCode('');
      } else if (result.ok) {
        onSignedIn();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-t-4 border-violet-500 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-black">{t('parent.portal.signInTitle')}</CardTitle>
        <CardDescription>
          {t('parent.portal.signInDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parent-student-id">{t('parent.portal.studentId')}</Label>
            <Input
              id="parent-student-id"
              value={studentLookup}
              onChange={(e) => setStudentLookup(e.target.value)}
              placeholder={t('parent.portal.studentIdPlaceholder')}
              autoComplete="off"
              disabled={loading || !!challengeId}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent-email">{t('parent.portal.parentEmail')}</Label>
            <Input
              id="parent-email"
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder={t('parent.portal.parentEmailPlaceholder')}
              autoComplete="email"
              disabled={loading || !!challengeId}
              required
            />
          </div>
          {challengeId && (
            <div className="space-y-2">
              <p role="status" className="text-sm text-muted-foreground">{t('parent.portal.codeSent')}</p>
              <Label htmlFor="parent-code">{t('parent.portal.codeLabel')}</Label>
              <Input id="parent-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={loading} autoFocus />
            </div>
          )}
          {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-xl font-bold" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="sr-only">{t('parent.portal.loading')}</span></> : t(challengeId ? 'parent.portal.viewMyChild' : 'parent.portal.sendCode')}
          </Button>
          {challengeId && <Button type="button" variant="ghost" className="w-full" disabled={loading}
            onClick={() => { setChallengeId(''); setCode(''); setError(null); }}>{t('parent.portal.requestNewCode')}</Button>}
        </form>
      </CardContent>
    </Card>
  );
}
