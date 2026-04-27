'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, GraduationCap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/components/AppProvider';

export default function StudentHomePage() {
    const params = useParams<{ schoolId: string }>();
    const { schoolId: activeSchoolId } = useAppContext();
    const schoolId = activeSchoolId || params.schoolId;
    const portalHref = schoolId ? `/${schoolId}/portal` : '/login';

    return (
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
            <Card className="w-full max-w-lg border-t-8 border-primary shadow-lg">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <GraduationCap className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-2xl font-black tracking-tight">Student Home Portal</CardTitle>
                        <CardDescription className="text-base">
                            Coming soon. This feature is not available yet.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5 text-center">
                    <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                        <Clock className="mx-auto mb-2 h-5 w-5 text-primary" aria-hidden="true" />
                        Students can still use the in-school kiosk and prize shop while the home portal is being prepared.
                    </div>
                    <Button asChild className="w-full h-12 rounded-xl font-bold">
                        <Link href={portalHref}>
                            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                            Back to Portal
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
