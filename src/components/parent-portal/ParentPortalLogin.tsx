'use client';

import { useState } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyParentPortal({ schoolId, studentLookup: studentLookup.trim(), parentEmail: parentEmail.trim() });
      onSignedIn();
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
              required
            />
          </div>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-xl font-bold" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('parent.portal.viewMyChild')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
