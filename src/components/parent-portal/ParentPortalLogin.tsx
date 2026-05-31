'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyParentPortal } from '@/lib/parentPortal/parentPortalClient';

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
        <CardTitle className="text-xl font-black">Parent sign-in</CardTitle>
        <CardDescription>
          Use your child&apos;s student ID (from their card) and the parent email on file at school.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parent-student-id">Student ID</Label>
            <Input
              id="parent-student-id"
              value={studentLookup}
              onChange={(e) => setStudentLookup(e.target.value)}
              placeholder="From student ID card"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent-email">Parent email</Label>
            <Input
              id="parent-email"
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="Email on file with the school"
              autoComplete="email"
              required
            />
          </div>
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-xl font-bold" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'View my child'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
